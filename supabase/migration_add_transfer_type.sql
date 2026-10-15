-- =========================================================================
-- FINTRACK SUPABASE DATABASE MIGRATION
-- Fix: Allow 'transfer' type in transactions table (Cash ⇄ Account transfers)
-- =========================================================================
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard/project/_/sql)
-- to allow 'transfer' transaction types and resolve check constraint errors.

-- 1. Update the check constraint on transactions table to include 'transfer'
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_type_check;
ALTER TABLE public.transactions ADD CONSTRAINT transactions_type_check CHECK (type IN ('income', 'expense', 'transfer'));

-- 2. Add optional transfer_direction column (if not already present)
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS transfer_direction TEXT CHECK (transfer_direction IN ('cash_to_account', 'account_to_cash'));

-- 3. Notify PostgREST to reload schema cache immediately
NOTIFY pgrst, 'reload schema';
