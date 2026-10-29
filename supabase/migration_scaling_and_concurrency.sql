-- =========================================================
-- FINTRACK SCALING, CONCURRENCY & MULTI-USER SQL MIGRATION
-- Run this script in the Supabase SQL Editor:
-- https://supabase.com/dashboard/project/_/sql/new
-- =========================================================

-- 0. Clean up legacy RLS policies to prevent column alteration locks
DO $$
BEGIN
    DROP POLICY IF EXISTS "Users can manage their own transactions" ON public.transactions;
    DROP POLICY IF EXISTS "Users can manage their own wallets" ON public.wallets;
    DROP POLICY IF EXISTS "Users can manage their own tabs" ON public.tabs;
    DROP POLICY IF EXISTS "Users can manage their own monthly dues" ON public.monthly_dues;
    DROP POLICY IF EXISTS "Users can manage their own quick presets" ON public.quick_presets;
    DROP POLICY IF EXISTS "Users can manage their own budget config" ON public.budget_config;
    DROP POLICY IF EXISTS "Allow all for transactions" ON public.transactions;
    DROP POLICY IF EXISTS "Allow all for wallets" ON public.wallets;
    DROP POLICY IF EXISTS "Allow all for tabs" ON public.tabs;
    DROP POLICY IF EXISTS "Allow all for monthly_dues" ON public.monthly_dues;
    DROP POLICY IF EXISTS "Allow all for quick_presets" ON public.quick_presets;
    DROP POLICY IF EXISTS "Allow all for budget_config" ON public.budget_config;
    DROP POLICY IF EXISTS "Allow all for analytics_snapshots" ON public.analytics_snapshots;
    DROP POLICY IF EXISTS "Allow all for feedbacks" ON public.feedbacks;
    DROP POLICY IF EXISTS "User isolate transactions" ON public.transactions;
    DROP POLICY IF EXISTS "User isolate wallets" ON public.wallets;
    DROP POLICY IF EXISTS "User isolate tabs" ON public.tabs;
    DROP POLICY IF EXISTS "User isolate monthly dues" ON public.monthly_dues;
    DROP POLICY IF EXISTS "User isolate presets" ON public.quick_presets;
    DROP POLICY IF EXISTS "User isolate budget" ON public.budget_config;
    DROP POLICY IF EXISTS "User isolate feedbacks" ON public.feedbacks;
    DROP POLICY IF EXISTS "Admin view feedbacks" ON public.feedbacks;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

-- Ensure user_id column is TEXT across all tables (supporting both auth.uid() and fallback defaults)
DO $$
BEGIN
    ALTER TABLE public.transactions ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TABLE public.wallets ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TABLE public.tabs ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TABLE public.monthly_dues ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TABLE public.quick_presets ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TABLE public.budget_config ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Ensure budget_config has all expected columns
DO $$
BEGIN
    ALTER TABLE public.budget_config ADD COLUMN IF NOT EXISTS expected_daily_wage NUMERIC DEFAULT 200;
    ALTER TABLE public.budget_config ADD COLUMN IF NOT EXISTS work_factor NUMERIC DEFAULT 0.70;
    ALTER TABLE public.budget_config ADD COLUMN IF NOT EXISTS default_wallet TEXT DEFAULT 'Cash';
    ALTER TABLE public.budget_config ADD COLUMN IF NOT EXISTS theme_preference TEXT DEFAULT 'light';
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 1. Fix Transactions Type Check & Ensure transfer_direction Column
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_type_check;
ALTER TABLE public.transactions ADD CONSTRAINT transactions_type_check 
    CHECK (type IN ('income', 'expense', 'transfer'));

ALTER TABLE public.transactions 
    ADD COLUMN IF NOT EXISTS transfer_direction TEXT 
    CHECK (transfer_direction IN ('cash_to_account', 'account_to_cash'));

-- 2. Create User Feedback Table
CREATE TABLE IF NOT EXISTS public.feedbacks (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL DEFAULT 'default',
    user_email TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('feature_request', 'bug_report', 'general')),
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    message TEXT NOT NULL,
    platform TEXT NOT NULL DEFAULT 'web',
    status TEXT NOT NULL DEFAULT 'unread' CHECK (status IN ('unread', 'reviewed')),
    created_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
);

CREATE INDEX IF NOT EXISTS idx_feedbacks_status ON public.feedbacks(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedbacks_user ON public.feedbacks(user_id);

-- 3. High-Performance Composite Indexes for Concurrent Users
CREATE INDEX IF NOT EXISTS idx_tx_user_date ON public.transactions(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_tx_user_created ON public.transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tabs_user_created ON public.tabs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tabs_user_status ON public.tabs(user_id, status);
CREATE INDEX IF NOT EXISTS idx_dues_user_day ON public.monthly_dues(user_id, due_day_of_month ASC);
CREATE INDEX IF NOT EXISTS idx_dues_user_status ON public.monthly_dues(user_id, status);
CREATE INDEX IF NOT EXISTS idx_presets_user_created ON public.quick_presets(user_id, created_at ASC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_wallets_user_id ON public.wallets(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_budget_user_id ON public.budget_config(user_id);

-- 4. Atomic Stored Procedure for High-Concurrency Wallet Updates
-- Prevents lost updates / race conditions during rapid concurrent transactions via row-level locking (FOR UPDATE)
CREATE OR REPLACE FUNCTION public.adjust_wallet_balance(
    p_user_id TEXT,
    p_cash_delta NUMERIC,
    p_account_delta NUMERIC
) RETURNS public.wallets AS $$
DECLARE
    w public.wallets;
BEGIN
    SELECT * INTO w FROM public.wallets WHERE user_id = p_user_id FOR UPDATE;
    IF NOT FOUND THEN
        INSERT INTO public.wallets (user_id, cash_in_hand, account_balance, last_updated)
        VALUES (
            p_user_id,
            GREATEST(0, p_cash_delta),
            GREATEST(0, p_account_delta),
            (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
        )
        RETURNING * INTO w;
    ELSE
        UPDATE public.wallets
        SET cash_in_hand = GREATEST(0, cash_in_hand + p_cash_delta),
            account_balance = GREATEST(0, account_balance + p_account_delta),
            last_updated = (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
        WHERE user_id = p_user_id
        RETURNING * INTO w;
    END IF;
    RETURN w;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Automated User Provisioning Trigger (Fail-Safe)
-- Automatically provisions default wallet (₹0 Cash, ₹0 Account) and default quick presets on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    -- 1. Initialize user wallet safely
    BEGIN
        INSERT INTO public.wallets (user_id, cash_in_hand, account_balance, last_updated)
        VALUES (NEW.id::text, 0, 0, (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT)
        ON CONFLICT (user_id) DO NOTHING;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    -- 2. Initialize default quick presets safely
    BEGIN
        INSERT INTO public.quick_presets (id, user_id, label, amount, category, type, payment_method, icon_name)
        VALUES
            ('qp-chai-' || NEW.id::text, NEW.id::text, 'Chai & Snacks', 50, 'Food & Drinks', 'expense', 'UPI / Bank', 'coffee'),
            ('qp-lunch-' || NEW.id::text, NEW.id::text, 'Lunch / Meals', 150, 'Food & Drinks', 'expense', 'UPI / Bank', 'utensils'),
            ('qp-groceries-' || NEW.id::text, NEW.id::text, 'Groceries', 450, 'Groceries & Home', 'expense', 'UPI / Bank', 'shopping-cart'),
            ('qp-wage-' || NEW.id::text, NEW.id::text, 'Daily Wage / Shift', 200, 'Salary & Wages', 'income', 'Cash', 'banknote')
        ON CONFLICT (id) DO NOTHING;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    -- 3. Initialize default budget config safely
    BEGIN
        INSERT INTO public.budget_config (user_id, monthly_limit, daily_allowance, expected_daily_wage, work_factor, default_wallet, theme_preference, currency, currency_symbol)
        VALUES (NEW.id::text, 25000, 600, 200, 0.70, 'Cash', 'light', 'INR', '₹')
        ON CONFLICT (user_id) DO NOTHING;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. Super Admin Platform Analytics RPC
-- Restricted exclusively to the designated super admin email
CREATE OR REPLACE FUNCTION public.get_super_admin_analytics()
RETURNS JSONB AS $$
DECLARE
    current_user_email TEXT;
    total_users_count BIGINT;
    total_tx_count BIGINT;
    total_gross_volume NUMERIC;
    total_feedbacks_count BIGINT;
    pending_dues_count BIGINT;
BEGIN
    current_user_email := auth.jwt() ->> 'email';
    IF current_user_email IS DISTINCT FROM 'smohamedfarook2024@gmail.com' THEN
        RAISE EXCEPTION 'Access denied. You are not authorized to view super admin diagnostics.';
    END IF;

    SELECT count(*) INTO total_users_count FROM auth.users;
    SELECT count(*) INTO total_tx_count FROM public.transactions;
    SELECT COALESCE(sum(amount), 0) INTO total_gross_volume FROM public.transactions;
    SELECT count(*) INTO total_feedbacks_count FROM public.feedbacks;
    SELECT count(*) INTO pending_dues_count FROM public.monthly_dues WHERE status = 'pending';

    RETURN jsonb_build_object(
        'totalUsers', total_users_count,
        'totalTransactions', total_tx_count,
        'grossTransactionVolume', total_gross_volume,
        'totalFeedbacks', total_feedbacks_count,
        'pendingDuesAcrossSystem', pending_dues_count,
        'timestamp', (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Row Level Security Policies
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tabs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_dues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quick_presets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedbacks ENABLE ROW LEVEL SECURITY;

-- Clean slate policies
DROP POLICY IF EXISTS "User isolate transactions" ON public.transactions;
DROP POLICY IF EXISTS "User isolate wallets" ON public.wallets;
DROP POLICY IF EXISTS "User isolate tabs" ON public.tabs;
DROP POLICY IF EXISTS "User isolate monthly dues" ON public.monthly_dues;
DROP POLICY IF EXISTS "User isolate presets" ON public.quick_presets;
DROP POLICY IF EXISTS "User isolate budget" ON public.budget_config;
DROP POLICY IF EXISTS "User isolate feedbacks" ON public.feedbacks;
DROP POLICY IF EXISTS "Admin view feedbacks" ON public.feedbacks;
DROP POLICY IF EXISTS "Allow all for feedbacks" ON public.feedbacks;

-- User-scoped policies with (select auth.uid())::text subquery optimization
-- Wrapping auth.uid() in a subquery causes PostgreSQL to evaluate it ONCE per query (InitPlan)
-- rather than once per row, preventing severe CPU and RAM exhaustion under high concurrent load.
CREATE POLICY "User isolate transactions" ON public.transactions
    FOR ALL TO authenticated
    USING ((select auth.uid())::text = user_id OR user_id = 'default')
    WITH CHECK ((select auth.uid())::text = user_id OR user_id = 'default');

CREATE POLICY "User isolate wallets" ON public.wallets
    FOR ALL TO authenticated
    USING ((select auth.uid())::text = user_id OR user_id = 'default')
    WITH CHECK ((select auth.uid())::text = user_id OR user_id = 'default');

CREATE POLICY "User isolate tabs" ON public.tabs
    FOR ALL TO authenticated
    USING ((select auth.uid())::text = user_id OR user_id = 'default')
    WITH CHECK ((select auth.uid())::text = user_id OR user_id = 'default');

CREATE POLICY "User isolate monthly dues" ON public.monthly_dues
    FOR ALL TO authenticated
    USING ((select auth.uid())::text = user_id OR user_id = 'default')
    WITH CHECK ((select auth.uid())::text = user_id OR user_id = 'default');

CREATE POLICY "User isolate presets" ON public.quick_presets
    FOR ALL TO authenticated
    USING ((select auth.uid())::text = user_id OR user_id = 'default')
    WITH CHECK ((select auth.uid())::text = user_id OR user_id = 'default');

CREATE POLICY "User isolate budget" ON public.budget_config
    FOR ALL TO authenticated
    USING ((select auth.uid())::text = user_id OR user_id = 'default')
    WITH CHECK ((select auth.uid())::text = user_id OR user_id = 'default');

-- Feedback policies: Users insert & read their own, Admin reads all
CREATE POLICY "User isolate feedbacks" ON public.feedbacks
    FOR ALL TO authenticated
    USING (
        (select auth.uid())::text = user_id 
        OR ((select auth.jwt()) ->> 'email') = 'smohamedfarook2024@gmail.com'
    )
    WITH CHECK ((select auth.uid())::text = user_id);

-- 8. Safe Resource Controls & Memory Protection
-- Restricts runaway queries and hanging transactions from exhausting micro-instance RAM (431MB limit)
ALTER ROLE authenticator SET statement_timeout = '8s';
ALTER ROLE authenticator SET idle_in_transaction_session_timeout = '10s';

-- 9. Update Query Planner Statistics for Instant Index Lookup
ANALYZE public.transactions;
ANALYZE public.wallets;
ANALYZE public.tabs;
ANALYZE public.monthly_dues;
ANALYZE public.quick_presets;
ANALYZE public.budget_config;
ANALYZE public.feedbacks;
