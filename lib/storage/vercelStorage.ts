import {
  Transaction,
  BudgetConfig,
  TabItem,
  MonthlyDue,
  WalletBalances,
  QuickPreset,
} from '../types';
import {
  INITIAL_TRANSACTIONS,
  DEFAULT_BUDGET,
  INITIAL_TABS,
  INITIAL_MONTHLY_DUES,
  DEFAULT_WALLETS,
  DEFAULT_QUICK_PRESETS,
} from '../sampleData';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Environment variable detection for Supabase Cloud Database
const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL;

const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl.startsWith('https://') &&
    supabaseAnonKey.length > 15
);

// Fallback: Optional Vercel KV / Upstash Redis
const KV_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
export const isVercelKvConfigured = Boolean(KV_URL && KV_TOKEN);

// Server Supabase Singleton
let serverClient: SupabaseClient | null = null;
function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;
  if (!serverClient) {
    serverClient = createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: { persistSession: false },
    });
  }
  return serverClient;
}

// In-memory local fallbacks for non-configured offline development
let memoryTransactions: Transaction[] = [...INITIAL_TRANSACTIONS];
let memoryBudget: BudgetConfig = { ...DEFAULT_BUDGET };
let memoryTabs: TabItem[] = [...INITIAL_TABS];
let memoryDues: MonthlyDue[] = [...INITIAL_MONTHLY_DUES];
let memoryWallets: WalletBalances = { ...DEFAULT_WALLETS };
let memoryPresets: QuickPreset[] = [...DEFAULT_QUICK_PRESETS];

// ==========================================
// 1. Transactions (Supabase-First)
// ==========================================
export async function getStoredTransactions(): Promise<Transaction[]> {
  const sb = getSupabase();
  if (sb) {
    try {
      const { data, error } = await sb
        .from('transactions')
        .select('*')
        .order('date', { ascending: false });

      if (!error && Array.isArray(data)) {
        return data.map((row) => ({
          id: row.id,
          type: row.type,
          amount: Number(row.amount),
          category: row.category,
          description: row.description,
          date: row.date,
          time: row.time || '00:00:00',
          timestamp: row.timestamp || new Date().toISOString(),
          paymentMethod: row.payment_method,
          isMonthlyDue: Boolean(row.is_monthly_due),
          notes: row.notes || '',
          createdAt: Number(row.created_at || Date.now()),
          synced: true,
        }));
      }
    } catch (err) {
      console.warn('Supabase getStoredTransactions error:', err);
    }
  }
  return memoryTransactions;
}

export async function saveTransactions(transactions: Transaction[]): Promise<boolean> {
  memoryTransactions = transactions;
  const sb = getSupabase();
  if (sb) {
    try {
      if (transactions.length === 0) {
        await sb.from('transactions').delete().neq('id', '');
        return true;
      }
      const rows = transactions.map((tx) => ({
        id: tx.id,
        user_id: 'default',
        type: tx.type,
        amount: tx.amount,
        category: tx.category,
        description: tx.description,
        date: tx.date,
        time: tx.time || '00:00:00',
        timestamp: tx.timestamp || new Date().toISOString(),
        payment_method: tx.paymentMethod,
        is_monthly_due: Boolean(tx.isMonthlyDue),
        notes: tx.notes || null,
        created_at: tx.createdAt || Date.now(),
        synced: true,
      }));
      const { error } = await sb.from('transactions').upsert(rows, { onConflict: 'id' });
      return !error;
    } catch (err) {
      console.error('Supabase saveTransactions error:', err);
      return false;
    }
  }
  return true;
}

// ==========================================
// 2. Monthly Dues (Supabase-First)
// ==========================================
export async function getStoredDues(): Promise<MonthlyDue[]> {
  const sb = getSupabase();
  if (sb) {
    try {
      const { data, error } = await sb
        .from('monthly_dues')
        .select('*')
        .order('due_day_of_month', { ascending: true });

      if (!error && Array.isArray(data)) {
        return data.map((row) => ({
          id: row.id,
          title: row.title,
          amount: Number(row.amount),
          category: row.category,
          paymentMethod: row.payment_method,
          dueDayOfMonth: Number(row.due_day_of_month),
          notes: row.notes || undefined,
          status: row.status === 'paid' ? 'paid' : 'pending',
          lastPaidDate: row.last_paid_date || undefined,
          createdAt: Number(row.created_at || Date.now()),
        }));
      }
    } catch (err) {
      console.warn('Supabase getStoredDues error:', err);
    }
  }
  return memoryDues;
}

export async function saveDues(dues: MonthlyDue[]): Promise<boolean> {
  memoryDues = dues;
  const sb = getSupabase();
  if (sb) {
    try {
      if (dues.length === 0) {
        await sb.from('monthly_dues').delete().neq('id', '');
        return true;
      }
      const rows = dues.map((d) => ({
        id: d.id,
        user_id: 'default',
        title: d.title,
        amount: d.amount,
        category: d.category,
        payment_method: d.paymentMethod,
        due_day_of_month: d.dueDayOfMonth,
        notes: d.notes || null,
        status: d.status === 'paid' ? 'paid' : 'pending',
        last_paid_date: d.lastPaidDate || null,
        created_at: d.createdAt || Date.now(),
      }));
      const { error } = await sb.from('monthly_dues').upsert(rows, { onConflict: 'id' });
      return !error;
    } catch (err) {
      console.error('Supabase saveDues error:', err);
      return false;
    }
  }
  return true;
}

// ==========================================
// 3. Tabs (Lent & Borrowed) (Supabase-First)
// ==========================================
export async function getStoredTabs(): Promise<TabItem[]> {
  const sb = getSupabase();
  if (sb) {
    try {
      const { data, error } = await sb
        .from('tabs')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(data)) {
        return data.map((row) => ({
          id: row.id,
          personName: row.person_name,
          amount: Number(row.amount),
          type: row.type,
          description: row.description,
          date: row.date,
          status: row.status,
          settledAt: row.settled_at ? Number(row.settled_at) : undefined,
          notes: row.notes || undefined,
          createdAt: Number(row.created_at || Date.now()),
        }));
      }
    } catch (err) {
      console.warn('Supabase getStoredTabs error:', err);
    }
  }
  return memoryTabs;
}

export async function saveTabs(tabs: TabItem[]): Promise<boolean> {
  memoryTabs = tabs;
  const sb = getSupabase();
  if (sb) {
    try {
      if (tabs.length === 0) {
        await sb.from('tabs').delete().neq('id', '');
        return true;
      }
      const rows = tabs.map((t) => ({
        id: t.id,
        user_id: 'default',
        person_name: t.personName,
        amount: t.amount,
        type: t.type,
        description: t.description,
        date: t.date,
        status: t.status,
        settled_at: t.settledAt || null,
        notes: t.notes || null,
        created_at: t.createdAt || Date.now(),
      }));
      const { error } = await sb.from('tabs').upsert(rows, { onConflict: 'id' });
      return !error;
    } catch (err) {
      console.error('Supabase saveTabs error:', err);
      return false;
    }
  }
  return true;
}

// ==========================================
// 4. Wallets (Cash & Account) (Supabase-First)
// ==========================================
export async function getStoredWallets(): Promise<WalletBalances> {
  const sb = getSupabase();
  if (sb) {
    try {
      const { data, error } = await sb.from('wallets').select('*').limit(1).maybeSingle();
      if (!error && data) {
        return {
          cashInHand: Number(data.cash_in_hand),
          accountBalance: Number(data.account_balance),
          lastUpdated: Number(data.last_updated),
        };
      }
    } catch (err) {
      console.warn('Supabase getStoredWallets error:', err);
    }
  }
  return memoryWallets;
}

export async function saveWallets(wallets: WalletBalances): Promise<boolean> {
  memoryWallets = wallets;
  const sb = getSupabase();
  if (sb) {
    try {
      const { error } = await sb.from('wallets').upsert(
        {
          user_id: 'default',
          cash_in_hand: wallets.cashInHand,
          account_balance: wallets.accountBalance,
          last_updated: Date.now(),
        },
        { onConflict: 'user_id' }
      );
      return !error;
    } catch (err) {
      console.error('Supabase saveWallets error:', err);
      return false;
    }
  }
  return true;
}

// ==========================================
// 5. Budget Config (Supabase-First)
// ==========================================
export async function getStoredBudget(): Promise<BudgetConfig> {
  const sb = getSupabase();
  if (sb) {
    try {
      const { data, error } = await sb.from('budget_config').select('*').limit(1).maybeSingle();
      if (!error && data) {
        return {
          monthlyLimit: Number(data.monthly_limit),
          dailyAllowance: Number(data.daily_allowance),
          currency: data.currency || 'INR',
          currencySymbol: data.currency_symbol || '₹',
        };
      }
    } catch (err) {
      console.warn('Supabase getStoredBudget error:', err);
    }
  }
  return memoryBudget;
}

export async function saveBudget(budget: BudgetConfig): Promise<boolean> {
  memoryBudget = budget;
  const sb = getSupabase();
  if (sb) {
    try {
      const { error } = await sb.from('budget_config').upsert(
        {
          user_id: 'default',
          monthly_limit: budget.monthlyLimit,
          daily_allowance: budget.dailyAllowance,
          currency: budget.currency,
          currency_symbol: budget.currencySymbol,
        },
        { onConflict: 'user_id' }
      );
      return !error;
    } catch (err) {
      console.error('Supabase saveBudget error:', err);
      return false;
    }
  }
  return true;
}

// ==========================================
// 6. Quick Presets (Supabase-First)
// ==========================================
export async function getStoredPresets(): Promise<QuickPreset[]> {
  const sb = getSupabase();
  if (sb) {
    try {
      const { data, error } = await sb
        .from('quick_presets')
        .select('*')
        .order('created_at', { ascending: true });

      if (!error && Array.isArray(data) && data.length > 0) {
        return data.map((row) => ({
          id: row.id,
          label: row.label,
          amount: Number(row.amount),
          category: row.category,
          type: row.type || 'expense',
          paymentMethod: row.payment_method,
          iconName: row.icon_name || 'tag',
        }));
      }
    } catch (err) {
      console.warn('Supabase getStoredPresets error:', err);
    }
  }
  return memoryPresets;
}

export async function savePresets(presets: QuickPreset[]): Promise<boolean> {
  memoryPresets = presets;
  const sb = getSupabase();
  if (sb) {
    try {
      const rows = presets.map((p) => ({
        id: p.id,
        user_id: 'default',
        label: p.label,
        amount: p.amount,
        category: p.category,
        type: p.type || 'expense',
        payment_method: p.paymentMethod,
        icon_name: p.iconName || 'tag',
        created_at: Date.now(),
      }));
      const { error } = await sb.from('quick_presets').upsert(rows, { onConflict: 'id' });
      return !error;
    } catch (err) {
      console.error('Supabase savePresets error:', err);
      return false;
    }
  }
  return true;
}
