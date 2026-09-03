import { getSupabaseClient, isSupabaseConfigured } from './client';
import {
  Transaction,
  WalletBalances,
  TabItem,
  MonthlyDue,
  QuickPreset,
  BudgetConfig,
} from '@/lib/types';
import { User } from '@supabase/supabase-js';

// ==========================================
// Authentication Services
// ==========================================

export async function getCurrentUser(): Promise<User | null> {
  const client = getSupabaseClient();
  if (!client) return null;
  try {
    const {
      data: { user },
    } = await client.auth.getUser();
    return user;
  } catch {
    return null;
  }
}

export async function signUpWithEmail(email: string, password: string) {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase is not configured yet');
  return await client.auth.signUp({ email, password });
}

export async function signInWithEmail(email: string, password: string) {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase is not configured yet');
  return await client.auth.signInWithPassword({ email, password });
}

export async function signOutUser() {
  const client = getSupabaseClient();
  if (!client) return;
  return await client.auth.signOut();
}

export function subscribeToAuthChanges(callback: (user: User | null) => void) {
  const client = getSupabaseClient();
  if (!client) return { unsubscribe: () => {} };

  const {
    data: { subscription },
  } = client.auth.onAuthStateChange((_event, session) => {
    callback(session?.user ?? null);
  });

  return subscription;
}

// ==========================================
// Cloud Database CRUD & Sync
// ==========================================

export async function fetchAllCloudData(): Promise<{
  transactions?: Transaction[];
  wallets?: WalletBalances;
  tabs?: TabItem[];
  dues?: MonthlyDue[];
  presets?: QuickPreset[];
  budget?: BudgetConfig;
} | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const [txRes, walletRes, tabsRes, duesRes, presetsRes, budgetRes] = await Promise.all([
      client.from('transactions').select('*').order('date', { ascending: false }),
      client.from('wallets').select('*').limit(1).maybeSingle(),
      client.from('tabs').select('*').order('created_at', { ascending: false }),
      client.from('monthly_dues').select('*').order('due_day_of_month', { ascending: true }),
      client.from('quick_presets').select('*').order('created_at', { ascending: true }),
      client.from('budget_config').select('*').limit(1).maybeSingle(),
    ]);

    const result: any = {};

    if (txRes.data) {
      result.transactions = txRes.data.map((row) => ({
        id: row.id,
        type: row.type,
        amount: Number(row.amount),
        category: row.category,
        description: row.description,
        date: row.date,
        time: row.time,
        timestamp: row.timestamp,
        paymentMethod: row.payment_method,
        notes: row.notes || '',
        createdAt: Number(row.created_at),
        synced: true,
      }));
    }

    if (walletRes.data) {
      result.wallets = {
        cashInHand: Number(walletRes.data.cash_in_hand),
        accountBalance: Number(walletRes.data.account_balance),
        lastUpdated: Number(walletRes.data.last_updated),
      };
    }

    if (tabsRes.data) {
      result.tabs = tabsRes.data.map((row) => ({
        id: row.id,
        personName: row.person_name,
        amount: Number(row.amount),
        type: row.type,
        description: row.description,
        date: row.date,
        status: row.status,
        settledAt: row.settled_at ? Number(row.settled_at) : undefined,
        notes: row.notes || undefined,
        createdAt: Number(row.created_at),
      }));
    }

    if (duesRes.data) {
      result.dues = duesRes.data.map((row) => ({
        id: row.id,
        title: row.title,
        amount: Number(row.amount),
        category: row.category,
        paymentMethod: row.payment_method,
        dueDayOfMonth: Number(row.due_day_of_month),
        notes: row.notes || undefined,
        status: row.status,
        lastPaidDate: row.last_paid_date || undefined,
        createdAt: Number(row.created_at),
      }));
    }

    if (presetsRes.data && presetsRes.data.length > 0) {
      result.presets = presetsRes.data.map((row) => ({
        id: row.id,
        label: row.label,
        amount: Number(row.amount),
        category: row.category,
        type: row.type || 'expense',
        paymentMethod: row.payment_method,
        iconName: row.icon_name || 'tag',
      }));
    }

    if (budgetRes.data) {
      result.budget = {
        monthlyLimit: Number(budgetRes.data.monthly_limit),
        dailyAllowance: Number(budgetRes.data.daily_allowance),
        currency: budgetRes.data.currency || 'INR',
        currencySymbol: budgetRes.data.currency_symbol || '₹',
      };
    }

    return result;
  } catch (err) {
    console.error('Error fetching data from Supabase:', err);
    return null;
  }
}

// Bulk Upload Local Ledger to Supabase Cloud
export async function uploadLocalDataToCloud(data: {
  transactions: Transaction[];
  wallets: WalletBalances;
  tabs: TabItem[];
  dues: MonthlyDue[];
  presets: QuickPreset[];
  budget: BudgetConfig;
}): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const user = await getCurrentUser();
    const userId = user?.id;

    // 1. Transactions upsert
    if (data.transactions.length > 0) {
      const rows = data.transactions.map((tx) => ({
        id: tx.id,
        user_id: userId,
        type: tx.type,
        amount: tx.amount,
        category: tx.category,
        description: tx.description,
        date: tx.date,
        time: tx.time,
        timestamp: tx.timestamp,
        payment_method: tx.paymentMethod,
        notes: tx.notes || null,
        created_at: tx.createdAt,
        synced: true,
      }));
      await client.from('transactions').upsert(rows, { onConflict: 'id' });
    }

    // 2. Wallets upsert
    if (userId) {
      await client.from('wallets').upsert({
        user_id: userId,
        cash_in_hand: data.wallets.cashInHand,
        account_balance: data.wallets.accountBalance,
        last_updated: data.wallets.lastUpdated || Date.now(),
      });
    }

    // 3. Tabs upsert
    if (data.tabs.length > 0) {
      const tabRows = data.tabs.map((t) => ({
        id: t.id,
        user_id: userId,
        person_name: t.personName,
        amount: t.amount,
        type: t.type,
        description: t.description,
        date: t.date,
        status: t.status,
        settled_at: t.settledAt || null,
        notes: t.notes || null,
        created_at: t.createdAt,
      }));
      await client.from('tabs').upsert(tabRows, { onConflict: 'id' });
    }

    // 4. Monthly Dues upsert
    if (data.dues.length > 0) {
      const dueRows = data.dues.map((d) => ({
        id: d.id,
        user_id: userId,
        title: d.title,
        amount: d.amount,
        category: d.category,
        payment_method: d.paymentMethod,
        due_day_of_month: d.dueDayOfMonth,
        notes: d.notes || null,
        status: d.status,
        last_paid_date: d.lastPaidDate || null,
        created_at: d.createdAt || Date.now(),
      }));
      await client.from('monthly_dues').upsert(dueRows, { onConflict: 'id' });
    }

    // 5. Presets upsert
    if (data.presets.length > 0) {
      const presetRows = data.presets.map((p) => ({
        id: p.id,
        user_id: userId,
        label: p.label,
        amount: p.amount,
        category: p.category,
        type: p.type || 'expense',
        payment_method: p.paymentMethod,
        icon_name: p.iconName || 'tag',
      }));
      await client.from('quick_presets').upsert(presetRows, { onConflict: 'id' });
    }

    // 6. Budget config upsert
    if (userId) {
      await client.from('budget_config').upsert({
        user_id: userId,
        monthly_limit: data.budget.monthlyLimit,
        daily_allowance: data.budget.dailyAllowance,
        currency: data.budget.currency,
        currency_symbol: data.budget.currencySymbol,
      });
    }

    return true;
  } catch (err) {
    console.error('Failed to upload data to Supabase:', err);
    return false;
  }
}
