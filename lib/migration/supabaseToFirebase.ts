import {
  getLocalTransactions,
  getLocalBudget,
  getLocalDues,
  getLocalTabs,
  getLocalWallets,
  getLocalQuickPresets,
} from '@/lib/storage/clientStorage';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';
import {
  batchMigrateAllUserData,
  syncWalletsToFirebase,
  syncBudgetToFirebase,
  syncDuesToFirebase,
  syncTabsToFirebase,
  syncPresetsToFirebase,
} from '@/lib/firebase/dbService';
import { getCurrentFirebaseUser, loginAnonymously } from '@/lib/firebase/authService';
import {
  Transaction,
  BudgetConfig,
  MonthlyDue,
  TabItem,
  WalletBalances,
  QuickPreset,
} from '@/lib/types';

export interface MigrationReport {
  success: boolean;
  message: string;
  source: 'supabase' | 'local_storage';
  counts: {
    transactions: number;
    dues: number;
    tabs: number;
    presets: number;
    wallets: boolean;
    budget: boolean;
  };
  error?: string;
}

export async function runSupabaseToFirebaseMigration(
  onProgress?: (status: string) => void
): Promise<MigrationReport> {
  try {
    onProgress?.('Preparing data sources...');

    // 1. Ensure Firebase Auth session (sign in anonymously if not signed in)
    let user = getCurrentFirebaseUser();
    if (!user) {
      onProgress?.('Initializing secure Firebase Spark session...');
      user = await loginAnonymously();
      if (!user) {
        throw new Error('Unable to create or acquire Firebase user session.');
      }
    }

    const uid = user.uid;
    let source: 'supabase' | 'local_storage' = 'local_storage';

    let transactions: Transaction[] = [];
    let dues: MonthlyDue[] = [];
    let tabs: TabItem[] = [];
    let wallets: WalletBalances = getLocalWallets();
    let budget: BudgetConfig = getLocalBudget();
    let presets: QuickPreset[] = getLocalQuickPresets();

    // 2. Try fetching from Supabase if configured
    if (isSupabaseConfigured) {
      onProgress?.('Checking Supabase cloud records...');
      const supabase = getSupabaseClient();
      if (supabase) {
        try {
          const [txRes, duesRes, tabsRes, walletsRes, budgetRes] = await Promise.allSettled([
            supabase.from('transactions').select('*'),
            supabase.from('monthly_dues').select('*'),
            supabase.from('tabs').select('*'),
            supabase.from('wallets').select('*').limit(1).maybeSingle(),
            supabase.from('budget').select('*').limit(1).maybeSingle(),
          ]);

          if (txRes.status === 'fulfilled' && txRes.value.data && txRes.value.data.length > 0) {
            transactions = txRes.value.data as Transaction[];
            source = 'supabase';
          }
          if (duesRes.status === 'fulfilled' && duesRes.value.data && duesRes.value.data.length > 0) {
            dues = duesRes.value.data as MonthlyDue[];
          }
          if (tabsRes.status === 'fulfilled' && tabsRes.value.data && tabsRes.value.data.length > 0) {
            tabs = tabsRes.value.data as TabItem[];
          }
          if (walletsRes.status === 'fulfilled' && walletsRes.value.data) {
            wallets = walletsRes.value.data as WalletBalances;
          }
          if (budgetRes.status === 'fulfilled' && budgetRes.value.data) {
            budget = budgetRes.value.data as BudgetConfig;
          }
        } catch (err) {
          console.warn('Supabase fetch failed, falling back to local storage:', err);
        }
      }
    }

    // Fallback to local storage if transactions are empty
    if (transactions.length === 0) {
      onProgress?.('Harvesting live FinTrack transactions from LocalStorage...');
      transactions = getLocalTransactions();
      dues = getLocalDues();
      tabs = getLocalTabs();
      wallets = getLocalWallets();
      budget = getLocalBudget();
      presets = getLocalQuickPresets();
      source = 'local_storage';
    }

    onProgress?.(`Migrating ${transactions.length} transactions to Cloud Firestore...`);

    // 3. Batch migrate into Firestore
    await batchMigrateAllUserData(
      uid,
      {
        transactions,
        wallets,
        dues,
        tabs,
        budget,
        presets,
      },
      onProgress
    );

    return {
      success: true,
      message: `Successfully migrated all financial data (${transactions.length} transactions, ${dues.length} dues, ${tabs.length} tabs) to Cloud Firestore!`,
      source,
      counts: {
        transactions: transactions.length,
        dues: dues.length,
        tabs: tabs.length,
        presets: presets.length,
        wallets: true,
        budget: true,
      },
    };
  } catch (err: any) {
    return {
      success: false,
      message: 'Migration failed to complete.',
      source: 'local_storage',
      counts: {
        transactions: 0,
        dues: 0,
        tabs: 0,
        presets: 0,
        wallets: false,
        budget: false,
      },
      error: err?.message || 'Unknown error occurred during migration',
    };
  }
}
