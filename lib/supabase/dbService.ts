import { getSupabaseClient, isSupabaseConfigured } from './client';
import { Capacitor } from '@capacitor/core';
import {
  Transaction,
  WalletBalances,
  TabItem,
  MonthlyDue,
  QuickPreset,
  BudgetConfig,
  FinancialStats,
  DailySummary,
  CashflowPoint,
  CategoryBreakdownItem,
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
      data: { session },
    } = await client.auth.getSession();
    if (session?.user) return session.user;

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

export async function signInWithGoogle() {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase is not configured yet');

  const redirectTo =
    typeof window !== 'undefined'
      ? Capacitor.isNativePlatform()
        ? 'com.fintrack.app://auth-callback'
        : `${window.location.origin}`
      : undefined;

  return await client.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
    },
  });
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
// Real-Time Granular Cloud Sync Operations
// ==========================================

export async function syncTransactionToCloud(tx: Transaction) {
  const client = getSupabaseClient();
  if (!client) return;
  try {
    const user = await getCurrentUser();
    const userId = user?.id || 'default';

    await client.from('transactions').upsert(
      {
        id: tx.id,
        user_id: userId,
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
      },
      { onConflict: 'id' }
    );
  } catch (err) {
    console.warn('Background transaction cloud sync warning:', err);
  }
}

export async function deleteTransactionFromCloud(id: string) {
  const client = getSupabaseClient();
  if (!client) return;
  try {
    await client.from('transactions').delete().eq('id', id);
  } catch (err) {
    console.warn('Background transaction delete warning:', err);
  }
}

export async function syncDueToCloud(due: MonthlyDue) {
  const client = getSupabaseClient();
  if (!client) return;
  try {
    const user = await getCurrentUser();
    const userId = user?.id || 'default';

    await client.from('monthly_dues').upsert(
      {
        id: due.id,
        user_id: userId,
        title: due.title,
        amount: due.amount,
        category: due.category,
        payment_method: due.paymentMethod,
        due_day_of_month: due.dueDayOfMonth,
        notes: due.notes || null,
        status: due.status,
        last_paid_date: due.lastPaidDate || null,
        created_at: due.createdAt || Date.now(),
      },
      { onConflict: 'id' }
    );
  } catch (err) {
    console.warn('Background monthly due cloud sync warning:', err);
  }
}

export async function deleteDueFromCloud(id: string) {
  const client = getSupabaseClient();
  if (!client) return;
  try {
    await client.from('monthly_dues').delete().eq('id', id);
  } catch (err) {
    console.warn('Background monthly due delete warning:', err);
  }
}

export async function syncTabToCloud(tab: TabItem) {
  const client = getSupabaseClient();
  if (!client) return;
  try {
    const user = await getCurrentUser();
    const userId = user?.id || 'default';

    await client.from('tabs').upsert(
      {
        id: tab.id,
        user_id: userId,
        person_name: tab.personName,
        amount: tab.amount,
        type: tab.type,
        description: tab.description,
        date: tab.date,
        status: tab.status,
        settled_at: tab.settledAt || null,
        notes: tab.notes || null,
        created_at: tab.createdAt || Date.now(),
      },
      { onConflict: 'id' }
    );
  } catch (err) {
    console.warn('Background tab cloud sync warning:', err);
  }
}

export async function deleteTabFromCloud(id: string) {
  const client = getSupabaseClient();
  if (!client) return;
  try {
    await client.from('tabs').delete().eq('id', id);
  } catch (err) {
    console.warn('Background tab delete warning:', err);
  }
}

export async function syncWalletsToCloud(wallets: WalletBalances) {
  const client = getSupabaseClient();
  if (!client) return;
  try {
    const user = await getCurrentUser();
    const userId = user?.id || 'default';

    await client.from('wallets').upsert(
      {
        user_id: userId,
        cash_in_hand: Number(wallets.cashInHand) || 0,
        account_balance: Number(wallets.accountBalance) || 0,
        last_updated: wallets.lastUpdated || Date.now(),
      },
      { onConflict: 'user_id' }
    );
  } catch (err) {
    console.warn('Background wallets cloud sync warning:', err);
  }
}

export async function syncBudgetToCloud(budget: BudgetConfig) {
  const client = getSupabaseClient();
  if (!client) return;
  try {
    const user = await getCurrentUser();
    const userId = user?.id || 'default';

    await client.from('budget_config').upsert(
      {
        user_id: userId,
        monthly_limit: budget.monthlyLimit,
        daily_allowance: budget.dailyAllowance,
        currency: budget.currency,
        currency_symbol: budget.currencySymbol,
      },
      { onConflict: 'user_id' }
    );
  } catch (err) {
    console.warn('Background budget cloud sync warning:', err);
  }
}

export async function syncPresetsToCloud(presets: QuickPreset[]) {
  const client = getSupabaseClient();
  if (!client || presets.length === 0) return;
  try {
    const user = await getCurrentUser();
    const userId = user?.id || 'default';

    const rows = presets.map((p) => ({
      id: p.id,
      user_id: userId,
      label: p.label,
      amount: p.amount,
      category: p.category,
      type: p.type || 'expense',
      payment_method: p.paymentMethod,
      icon_name: p.iconName || 'tag',
      created_at: Date.now(),
    }));

    await client.from('quick_presets').upsert(rows, { onConflict: 'id' });
  } catch (err) {
    console.warn('Background presets cloud sync warning:', err);
  }
}

// Dedicated Analytics Cloud Snapshot Sync
export async function syncAnalyticsSnapshotToCloud(
  stats: FinancialStats,
  dailySummary: DailySummary,
  cashflow: CashflowPoint[],
  categoryExpenses: CategoryBreakdownItem[],
  categoryIncomes: CategoryBreakdownItem[]
) {
  const client = getSupabaseClient();
  if (!client) return;
  try {
    const user = await getCurrentUser();
    const userId = user?.id || 'default';
    const today = new Date().toISOString().split('T')[0];
    const snapshotId = `snapshot-${userId}-${today}`;

    await client.from('analytics_snapshots').upsert(
      {
        id: snapshotId,
        user_id: userId,
        snapshot_date: today,
        total_income: stats.totalIncome,
        total_expense: stats.totalExpense,
        month_income: stats.monthIncome,
        month_expense: stats.monthExpense,
        savings_rate: stats.savingsRate,
        daily_spent: dailySummary.spentToday,
        daily_remaining: dailySummary.remainingAllowance,
        weekly_spent: dailySummary.weeklySpent,
        weekly_variance: dailySummary.weeklyVariance,
        monthly_daily_spent: dailySummary.monthlyDailySpent,
        monthly_daily_variance: dailySummary.monthlyDailyVariance,
        overspend_deficit: dailySummary.deficitAmount,
        category_expenses: categoryExpenses,
        category_incomes: categoryIncomes,
        cashflow_trends: cashflow,
        updated_at: Date.now(),
      },
      { onConflict: 'id' }
    );
  } catch (err) {
    console.warn('Background analytics cloud snapshot warning:', err);
  }
}

// ==========================================
// Full Two-Way Fetch & Bulk Upload
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
    const user = await getCurrentUser();
    const userId = user?.id || 'default';

    const isDefault = userId === 'default';

    // High-concurrency optimized query: single-key index seek on (user_id)
    // Eliminates in-memory sorting, BitmapOr scans, and work_mem swap thrashing
    let [txRes, walletRes, tabsRes, duesRes, presetsRes, budgetRes] = await Promise.all([
      client
        .from('transactions')
        .select('id, type, amount, category, description, date, time, timestamp, payment_method, is_monthly_due, notes, created_at, user_id')
        .eq('user_id', userId)
        .order('date', { ascending: false })
        .limit(250),
      client
        .from('wallets')
        .select('user_id, cash_in_hand, account_balance, last_updated')
        .eq('user_id', userId),
      client
        .from('tabs')
        .select('id, person_name, amount, type, description, date, status, settled_at, notes, created_at, user_id')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(100),
      client
        .from('monthly_dues')
        .select('id, title, amount, category, payment_method, due_day_of_month, notes, status, last_paid_date, created_at, user_id')
        .eq('user_id', userId)
        .order('due_day_of_month', { ascending: true }),
      client
        .from('quick_presets')
        .select('id, label, amount, category, type, payment_method, icon_name, user_id')
        .eq('user_id', userId)
        .order('created_at', { ascending: true }),
      client
        .from('budget_config')
        .select('user_id, monthly_limit, daily_allowance, currency, currency_symbol')
        .eq('user_id', userId),
    ]);

    if (duesRes.error) {
      console.error('Error fetching dues from Supabase:', duesRes.error);
      throw new Error(`Failed to fetch monthly dues: ${duesRes.error.message}`);
    }
    if (txRes.error) {
      console.error('Error fetching transactions from Supabase:', txRes.error);
      throw new Error(`Failed to fetch transactions: ${txRes.error.message}`);
    }

    const result: any = {};

    if (txRes.data && Array.isArray(txRes.data)) {
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
        isMonthlyDue: Boolean(row.is_monthly_due),
        notes: row.notes || '',
        createdAt: Number(row.created_at),
        synced: true,
      }));
    }

    // Strict multi-tenant isolation: only parse the current authenticated user's wallet
    if (walletRes.data && Array.isArray(walletRes.data) && walletRes.data.length > 0) {
      const userWallet = walletRes.data[0];
      result.wallets = {
        cashInHand: isNaN(Number(userWallet.cash_in_hand)) ? 0 : Number(userWallet.cash_in_hand),
        accountBalance: isNaN(Number(userWallet.account_balance)) ? 0 : Number(userWallet.account_balance),
        lastUpdated: Number(userWallet.last_updated) || Date.now(),
      };
    } else if (walletRes.data && !Array.isArray(walletRes.data)) {
      const singleWallet = walletRes.data as any;
      result.wallets = {
        cashInHand: isNaN(Number(singleWallet.cash_in_hand)) ? 0 : Number(singleWallet.cash_in_hand),
        accountBalance: isNaN(Number(singleWallet.account_balance)) ? 0 : Number(singleWallet.account_balance),
        lastUpdated: Number(singleWallet.last_updated) || Date.now(),
      };
    } else {
      result.wallets = {
        cashInHand: 0,
        accountBalance: 0,
        lastUpdated: Date.now(),
      };
    }

    if (tabsRes.data && Array.isArray(tabsRes.data)) {
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

    if (duesRes.data && Array.isArray(duesRes.data)) {
      result.dues = duesRes.data.map((row) => ({
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

    if (presetsRes.data && Array.isArray(presetsRes.data) && presetsRes.data.length > 0) {
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
      const budgetRow = Array.isArray(budgetRes.data)
        ? budgetRes.data.find((b) => b.user_id === userId) || budgetRes.data[0]
        : budgetRes.data;
      if (budgetRow) {
        result.budget = {
          monthlyLimit: Number(budgetRow.monthly_limit),
          dailyAllowance: Number(budgetRow.daily_allowance),
          currency: budgetRow.currency || 'INR',
          currencySymbol: budgetRow.currency_symbol || '₹',
        };
      }
    }

    return result;
  } catch (err) {
    console.error('Error fetching data from Supabase:', err);
    throw err;
  }
}

export async function uploadLocalDataToCloud(data: {
  transactions: Transaction[];
  wallets: WalletBalances;
  tabs: TabItem[];
  dues: MonthlyDue[];
  presets: QuickPreset[];
  budget?: BudgetConfig;
}): Promise<{ success: boolean; error?: string; needsSchemaMigration?: boolean }> {
  const client = getSupabaseClient();
  if (!client) return { success: false, error: 'Supabase client is not configured' };

  try {
    const user = await getCurrentUser();
    const userId = user?.id || 'default';

    let schemaMigrationRequired = false;

    // 1. Transactions upsert (batched in chunks of 100 to prevent payload memory spikes)
    if (data.transactions.length > 0) {
      const rows = data.transactions.map((tx) => ({
        id: tx.id,
        user_id: userId,
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

      for (let i = 0; i < rows.length; i += 100) {
        const batch = rows.slice(i, i + 100);
        const { error } = await client.from('transactions').upsert(batch, { onConflict: 'id' });
        if (error) {
          if (error.message.includes('transactions_type_check')) {
            schemaMigrationRequired = true;
            const nonTransfers = batch.filter((r) => r.type !== 'transfer');
            if (nonTransfers.length > 0) {
              await client.from('transactions').upsert(nonTransfers, { onConflict: 'id' });
            }
          } else {
            throw new Error(`Transactions error: ${error.message}`);
          }
        }
      }
    }

    // 2. Wallets upsert
    const { error: walletErr } = await client.from('wallets').upsert(
      {
        user_id: userId,
        cash_in_hand: Number(data.wallets?.cashInHand) || 0,
        account_balance: Number(data.wallets?.accountBalance) || 0,
        last_updated: data.wallets?.lastUpdated || Date.now(),
      },
      { onConflict: 'user_id' }
    );
    if (walletErr) throw new Error(`Wallets error: ${walletErr.message}`);

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
        created_at: t.createdAt || Date.now(),
      }));
      const { error } = await client.from('tabs').upsert(tabRows, { onConflict: 'id' });
      if (error) throw new Error(`Tabs error: ${error.message}`);
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
        status: d.status === 'paid' ? 'paid' : 'pending',
        last_paid_date: d.lastPaidDate || null,
        created_at: d.createdAt || Date.now(),
      }));
      const { error } = await client.from('monthly_dues').upsert(dueRows, { onConflict: 'id' });
      if (error) throw new Error(`Monthly dues error: ${error.message}`);
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
        created_at: Date.now(),
      }));
      const { error } = await client.from('quick_presets').upsert(presetRows, { onConflict: 'id' });
      if (error) throw new Error(`Presets error: ${error.message}`);
    }

    // 6. Budget config upsert
    if (data.budget) {
      const { error: budgetErr } = await client.from('budget_config').upsert(
        {
          user_id: userId,
          monthly_limit: data.budget.monthlyLimit,
          daily_allowance: data.budget.dailyAllowance,
          currency: data.budget.currency,
          currency_symbol: data.budget.currencySymbol,
        },
        { onConflict: 'user_id' }
      );
      if (budgetErr) throw new Error(`Budget error: ${budgetErr.message}`);
    }

    if (schemaMigrationRequired) {
      return {
        success: false,
        needsSchemaMigration: true,
        error: 'Transactions error: new row for relation "transactions" violates check constraint "transactions_type_check"',
      };
    }

    return { success: true };
  } catch (err: any) {
    console.error('Failed to upload data to Supabase:', err);
    return { success: false, error: err.message || 'Upload failed' };
  }
}

// ==========================================
// User Feedback & Super Admin Services
// ==========================================

export interface UserFeedback {
  id: string;
  userId: string;
  userEmail: string;
  category: 'feature_request' | 'bug_report' | 'general';
  rating: number; // 1 to 5
  message: string;
  platform: string;
  status: 'unread' | 'reviewed';
  createdAt: number;
}

export async function submitUserFeedback(data: {
  category: 'feature_request' | 'bug_report' | 'general';
  rating: number;
  message: string;
}): Promise<{ success: boolean; error?: string }> {
  const client = getSupabaseClient();
  if (!client) return { success: false, error: 'Database not connected' };

  try {
    const user = await getCurrentUser();
    const feedbackId = `fb-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const platform = typeof window !== 'undefined' && Capacitor.isNativePlatform() ? 'android_apk' : 'web';

    const { error } = await client.from('feedbacks').insert({
      id: feedbackId,
      user_id: user?.id || 'default',
      user_email: user?.email || 'anonymous',
      category: data.category,
      rating: data.rating,
      message: data.message,
      platform,
      status: 'unread',
      created_at: Date.now(),
    });

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    console.error('Error submitting feedback:', err);
    return { success: false, error: err.message || 'Failed to submit feedback' };
  }
}

export async function fetchAllFeedbacksForAdmin(): Promise<UserFeedback[]> {
  const client = getSupabaseClient();
  if (!client) return [];

  try {
    const { data, error } = await client
      .from('feedbacks')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !Array.isArray(data)) return [];
    return data.map((row) => ({
      id: row.id,
      userId: row.user_id,
      userEmail: row.user_email,
      category: row.category,
      rating: row.rating,
      message: row.message,
      platform: row.platform,
      status: row.status,
      createdAt: Number(row.created_at),
    }));
  } catch (err) {
    console.warn('Error fetching feedbacks for admin:', err);
    return [];
  }
}

export async function updateFeedbackStatus(id: string, status: 'unread' | 'reviewed'): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const { error } = await client.from('feedbacks').update({ status }).eq('id', id);
    return !error;
  } catch {
    return false;
  }
}

export async function fetchSuperAdminPlatformStats(): Promise<{
  totalUsers: number;
  totalTransactions: number;
  grossTransactionVolume: number;
  totalFeedbacks: number;
  pendingDuesAcrossSystem: number;
  timestamp: number;
} | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const { data, error } = await client.rpc('get_super_admin_analytics');
    if (error || !data) {
      // Graceful fallback to client queries if RPC function has not yet been executed in Supabase SQL editor
      const [txCountRes, fbCountRes, usersRes] = await Promise.all([
        client.from('transactions').select('id, amount', { count: 'exact' }).limit(100),
        client.from('feedbacks').select('id', { count: 'exact', head: true }),
        client.from('wallets').select('user_id', { count: 'exact', head: true }),
      ]);

      const gross = (txCountRes.data || []).reduce((sum: number, r: any) => sum + (Number(r.amount) || 0), 0);

      return {
        totalUsers: usersRes.count || 1,
        totalTransactions: txCountRes.count || 0,
        grossTransactionVolume: gross,
        totalFeedbacks: fbCountRes.count || 0,
        pendingDuesAcrossSystem: 0,
        timestamp: Date.now(),
      };
    }
    return data;
  } catch (err) {
    console.warn('Error in fetchSuperAdminPlatformStats:', err);
    return null;
  }
}
