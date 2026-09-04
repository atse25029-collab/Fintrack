-- =========================================================
-- FINTRACK POSTGRESQL SCHEMA FOR SUPABASE
-- Run this in the Supabase SQL Editor (supabase.com -> SQL Editor)
-- =========================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Transactions Table
CREATE TABLE IF NOT EXISTS public.transactions (
    id TEXT PRIMARY KEY,
    user_id TEXT DEFAULT 'default',
    type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
    amount NUMERIC NOT NULL CHECK (amount >= 0),
    category TEXT NOT NULL,
    description TEXT NOT NULL,
    date DATE NOT NULL,
    time TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    payment_method TEXT NOT NULL,
    is_monthly_due BOOLEAN DEFAULT false,
    notes TEXT,
    created_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
    synced BOOLEAN DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON public.transactions(user_id, date DESC);

-- 3. Wallets Table (Physical Cash in Hand vs Bank/UPI in Account)
CREATE TABLE IF NOT EXISTS public.wallets (
    user_id TEXT PRIMARY KEY DEFAULT 'default',
    cash_in_hand NUMERIC NOT NULL DEFAULT 0,
    account_balance NUMERIC NOT NULL DEFAULT 0,
    last_updated BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
);

-- 4. Tabs Table (Lent & Borrowed / Informal Debts)
CREATE TABLE IF NOT EXISTS public.tabs (
    id TEXT PRIMARY KEY,
    user_id TEXT DEFAULT 'default',
    person_name TEXT NOT NULL,
    amount NUMERIC NOT NULL CHECK (amount >= 0),
    type TEXT NOT NULL CHECK (type IN ('owed_to_you', 'you_owe')),
    description TEXT NOT NULL,
    date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'settled')),
    settled_at BIGINT,
    notes TEXT,
    created_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
);

CREATE INDEX IF NOT EXISTS idx_tabs_user_status ON public.tabs(user_id, status);

-- 5. Monthly Dues Table (Supports both 'pending' and 'paid')
CREATE TABLE IF NOT EXISTS public.monthly_dues (
    id TEXT PRIMARY KEY,
    user_id TEXT DEFAULT 'default',
    title TEXT NOT NULL,
    amount NUMERIC NOT NULL CHECK (amount >= 0),
    category TEXT NOT NULL,
    payment_method TEXT NOT NULL,
    due_day_of_month INTEGER NOT NULL CHECK (due_day_of_month BETWEEN 1 AND 31),
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'unpaid', 'paid')),
    last_paid_date TEXT,
    created_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
);

CREATE INDEX IF NOT EXISTS idx_dues_user_status ON public.monthly_dues(user_id, status);

-- 6. Quick 1-Tap Presets Table
CREATE TABLE IF NOT EXISTS public.quick_presets (
    id TEXT PRIMARY KEY,
    user_id TEXT DEFAULT 'default',
    label TEXT NOT NULL,
    amount NUMERIC NOT NULL CHECK (amount >= 0),
    category TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'expense' CHECK (type IN ('income', 'expense')),
    payment_method TEXT NOT NULL,
    icon_name TEXT DEFAULT 'tag',
    created_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
);

-- 7. Budget Config Table
CREATE TABLE IF NOT EXISTS public.budget_config (
    user_id TEXT PRIMARY KEY DEFAULT 'default',
    monthly_limit NUMERIC NOT NULL DEFAULT 25000,
    daily_allowance NUMERIC NOT NULL DEFAULT 600,
    currency TEXT NOT NULL DEFAULT 'INR',
    currency_symbol TEXT NOT NULL DEFAULT '₹'
);

-- 8. Analytics Snapshots Table (Dedicated storage for financial health, reports & charts)
CREATE TABLE IF NOT EXISTS public.analytics_snapshots (
    id TEXT PRIMARY KEY,
    user_id TEXT DEFAULT 'default',
    snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
    total_income NUMERIC NOT NULL DEFAULT 0,
    total_expense NUMERIC NOT NULL DEFAULT 0,
    month_income NUMERIC NOT NULL DEFAULT 0,
    month_expense NUMERIC NOT NULL DEFAULT 0,
    savings_rate NUMERIC NOT NULL DEFAULT 0,
    daily_spent NUMERIC NOT NULL DEFAULT 0,
    daily_remaining NUMERIC NOT NULL DEFAULT 0,
    weekly_spent NUMERIC NOT NULL DEFAULT 0,
    weekly_variance NUMERIC NOT NULL DEFAULT 0,
    monthly_daily_spent NUMERIC NOT NULL DEFAULT 0,
    monthly_daily_variance NUMERIC NOT NULL DEFAULT 0,
    overspend_deficit NUMERIC NOT NULL DEFAULT 0,
    category_expenses JSONB,
    category_incomes JSONB,
    cashflow_trends JSONB,
    updated_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
);

CREATE INDEX IF NOT EXISTS idx_analytics_user_date ON public.analytics_snapshots(user_id, snapshot_date DESC);

-- =========================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Permissive policies allowing seamless operations for both
-- authenticated user accounts and anonymous local sync.
-- =========================================================

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tabs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_dues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quick_presets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_snapshots ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if updating
DROP POLICY IF EXISTS "Allow all for transactions" ON public.transactions;
DROP POLICY IF EXISTS "Allow all for wallets" ON public.wallets;
DROP POLICY IF EXISTS "Allow all for tabs" ON public.tabs;
DROP POLICY IF EXISTS "Allow all for monthly dues" ON public.monthly_dues;
DROP POLICY IF EXISTS "Allow all for quick presets" ON public.quick_presets;
DROP POLICY IF EXISTS "Allow all for budget config" ON public.budget_config;
DROP POLICY IF EXISTS "Allow all for analytics snapshots" ON public.analytics_snapshots;

CREATE POLICY "Allow all for transactions" ON public.transactions FOR ALL TO public, anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for wallets" ON public.wallets FOR ALL TO public, anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for tabs" ON public.tabs FOR ALL TO public, anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for monthly dues" ON public.monthly_dues FOR ALL TO public, anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for quick presets" ON public.quick_presets FOR ALL TO public, anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for budget config" ON public.budget_config FOR ALL TO public, anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for analytics snapshots" ON public.analytics_snapshots FOR ALL TO public, anon, authenticated USING (true) WITH CHECK (true);
