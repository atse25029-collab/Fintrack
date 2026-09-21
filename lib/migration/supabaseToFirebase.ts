import {
  getLocalTransactions,
  getLocalBudget,
  getLocalDues,
  getLocalTabs,
  getLocalWallets,
  getLocalQuickPresets,
} from '@/lib/storage/clientStorage';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import { fetchAllCloudData } from '@/lib/supabase/dbService';
import { batchMigrateAllUserData } from '@/lib/firebase/dbService';
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
    let uid: string;

    if (user) {
      uid = user.uid;
    } else {
      onProgress?.('Initializing secure Firebase Spark session...');
      try {
        const anonUser = await loginAnonymously();
        if (!anonUser) throw new Error('Unable to create or acquire Firebase user session.');
        uid = anonUser.uid;
      } catch (authErr: any) {
        if (
          authErr?.code === 'auth/configuration-not-found' ||
          authErr?.message?.includes('configuration-not-found')
        ) {
          throw new Error(
            'Firebase Authentication is not enabled yet in your Firebase Console! Please go to Firebase Console > Build > Authentication > Click "Get started" > Under "Sign-in method" tab, enable "Anonymous" and click Save.'
          );
        }
        // Fallback to stable device identifier if test mode rules allow
        let deviceUid = typeof window !== 'undefined' ? localStorage.getItem('fintrack_device_uid') : null;
        if (!deviceUid && typeof window !== 'undefined') {
          deviceUid = 'device_' + Math.random().toString(36).substring(2, 10);
          localStorage.setItem('fintrack_device_uid', deviceUid);
        }
        uid = deviceUid || 'default_user';
      }
    }

    let source: 'supabase' | 'local_storage' = 'local_storage';

    let transactions: Transaction[] = [];
    let dues: MonthlyDue[] = [];
    let tabs: TabItem[] = [];
    let wallets: WalletBalances = getLocalWallets();
    let budget: BudgetConfig = getLocalBudget();
    let presets: QuickPreset[] = getLocalQuickPresets();

    // 2. Try fetching from Supabase using fetchAllCloudData (with automatic snake_case mapping)
    if (isSupabaseConfigured) {
      onProgress?.('Fetching and normalizing Supabase cloud records...');
      try {
        const cloudData = await fetchAllCloudData();
        if (cloudData) {
          if (cloudData.transactions && cloudData.transactions.length > 0) {
            transactions = cloudData.transactions;
            source = 'supabase';
          }
          if (cloudData.dues && cloudData.dues.length > 0) {
            dues = cloudData.dues;
          }
          if (cloudData.tabs && cloudData.tabs.length > 0) {
            tabs = cloudData.tabs;
          }
          if (cloudData.presets && cloudData.presets.length > 0) {
            presets = cloudData.presets;
          }
          if (cloudData.wallets) {
            wallets = cloudData.wallets;
          }
          if (cloudData.budget) {
            budget = cloudData.budget;
          }
        }
      } catch (err) {
        console.warn('Supabase fetch failed, falling back to local storage:', err);
      }
    }

    // Fallback to local storage if transactions are empty
    if (transactions.length === 0) {
      onProgress?.('Harvesting live FinTrack records from LocalStorage...');
      transactions = getLocalTransactions();
      dues = getLocalDues();
      tabs = getLocalTabs();
      wallets = getLocalWallets();
      budget = getLocalBudget();
      presets = getLocalQuickPresets();
      source = 'local_storage';
    }

    // 3. Strict Normalization to guarantee NO field is undefined
    const safeWallets: WalletBalances = {
      cashInHand: Number(wallets?.cashInHand ?? (wallets as any)?.cash_in_hand) || 0,
      accountBalance: Number(wallets?.accountBalance ?? (wallets as any)?.account_balance) || 0,
      lastUpdated: Date.now(),
    };

    const safeBudget: BudgetConfig = {
      monthlyLimit: Number(budget?.monthlyLimit ?? (budget as any)?.monthly_limit) || 20000,
      dailyAllowance: Number(budget?.dailyAllowance ?? (budget as any)?.daily_allowance) || 600,
      currency: budget?.currency || 'INR',
      currencySymbol: budget?.currencySymbol || '₹',
    };

    onProgress?.(`Migrating ${transactions.length} transactions to Cloud Firestore...`);

    // 4. Batch migrate into Firestore
    await batchMigrateAllUserData(
      uid,
      {
        transactions,
        wallets: safeWallets,
        dues,
        tabs,
        budget: safeBudget,
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
    let errMsg = err?.message || 'Unknown error occurred during migration';
    if (errMsg.includes('configuration-not-found')) {
      errMsg =
        'Firebase Authentication is not enabled in your Firebase Console yet! Please go to Firebase Console > Build > Authentication > Click "Get started" > Under "Sign-in method" tab, enable "Anonymous" and click Save.';
    } else if (
      errMsg.includes('permission') ||
      errMsg.includes('insufficient permissions') ||
      err?.code === 'permission-denied'
    ) {
      errMsg =
        'Firestore Security Rules are blocking writes! Please go to Firebase Console > Build > Firestore Database > "Rules" tab, paste the rules below, and click Publish: \n\nallow read, write: if request.auth != null;';
    }
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
      error: errMsg,
    };
  }
}
