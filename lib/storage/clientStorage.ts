import { Transaction, BudgetConfig, TabItem, MonthlyDue, WalletBalances, QuickPreset } from '../types';
import {
  INITIAL_TRANSACTIONS,
  DEFAULT_BUDGET,
  INITIAL_TABS,
  INITIAL_MONTHLY_DUES,
  DEFAULT_WALLETS,
  DEFAULT_QUICK_PRESETS,
} from '../sampleData';

const LOCAL_TX_KEY = 'fintrack_local_transactions';
const LOCAL_BUDGET_KEY = 'fintrack_local_budget';
const LOCAL_TABS_KEY = 'fintrack_local_tabs';
const LOCAL_DUES_KEY = 'fintrack_local_dues';
const LOCAL_WALLETS_KEY = 'fintrack_local_wallets';
const LOCAL_PRESETS_KEY = 'fintrack_local_presets';

// Transactions
export function getLocalTransactions(): Transaction[] {
  if (typeof window === 'undefined') return INITIAL_TRANSACTIONS;
  try {
    const raw = localStorage.getItem(LOCAL_TX_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.error('Error reading localStorage transactions:', e);
  }
  setLocalTransactions(INITIAL_TRANSACTIONS);
  return INITIAL_TRANSACTIONS;
}

export function setLocalTransactions(txs: Transaction[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_TX_KEY, JSON.stringify(txs));
    window.dispatchEvent(new CustomEvent('fintrack_data_changed'));
  } catch (e) {
    console.error('Error saving transactions:', e);
  }
}

// Budget
export function getLocalBudget(): BudgetConfig {
  if (typeof window === 'undefined') return DEFAULT_BUDGET;
  try {
    const raw = localStorage.getItem(LOCAL_BUDGET_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.dailyAllowance === 'number' && parsed.dailyAllowance > 0) {
        return {
          monthlyLimit: typeof parsed.monthlyLimit === 'number' ? parsed.monthlyLimit : DEFAULT_BUDGET.monthlyLimit,
          dailyAllowance: parsed.dailyAllowance,
          currency: 'INR',
          currencySymbol: '₹',
        };
      }
    }
  } catch (e) {
    console.error('Error reading budget:', e);
  }
  return DEFAULT_BUDGET;
}

export function setLocalBudget(budget: BudgetConfig): void {
  if (typeof window === 'undefined') return;
  try {
    const locked: BudgetConfig = {
      ...budget,
      currency: 'INR',
      currencySymbol: '₹',
    };
    localStorage.setItem(LOCAL_BUDGET_KEY, JSON.stringify(locked));
    window.dispatchEvent(new CustomEvent('fintrack_budget_changed'));
  } catch (e) {
    console.error('Error saving budget:', e);
  }
}

// Tabs (Lent & Borrowed)
export function getLocalTabs(): TabItem[] {
  if (typeof window === 'undefined') return INITIAL_TABS;
  try {
    const raw = localStorage.getItem(LOCAL_TABS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.error('Error reading tabs:', e);
  }
  setLocalTabs(INITIAL_TABS);
  return INITIAL_TABS;
}

export function setLocalTabs(tabs: TabItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_TABS_KEY, JSON.stringify(tabs));
    window.dispatchEvent(new CustomEvent('fintrack_tabs_changed'));
  } catch (e) {
    console.error('Error saving tabs:', e);
  }
}

// Monthly Dues
export function getLocalDues(): MonthlyDue[] {
  if (typeof window === 'undefined') return INITIAL_MONTHLY_DUES;
  try {
    const raw = localStorage.getItem(LOCAL_DUES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.error('Error reading dues:', e);
  }
  setLocalDues(INITIAL_MONTHLY_DUES);
  return INITIAL_MONTHLY_DUES;
}

export function setLocalDues(dues: MonthlyDue[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_DUES_KEY, JSON.stringify(dues));
    window.dispatchEvent(new CustomEvent('fintrack_dues_changed'));
  } catch (e) {
    console.error('Error saving dues:', e);
  }
}

// Liquid Wallets (Money in Hand & Money in Account)
export function getLocalWallets(): WalletBalances {
  if (typeof window === 'undefined') return DEFAULT_WALLETS;
  try {
    const raw = localStorage.getItem(LOCAL_WALLETS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (typeof parsed.cashInHand === 'number' && typeof parsed.accountBalance === 'number') {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Error reading wallets:', e);
  }
  setLocalWallets(DEFAULT_WALLETS);
  return DEFAULT_WALLETS;
}

export function setLocalWallets(wallets: WalletBalances): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_WALLETS_KEY, JSON.stringify(wallets));
    window.dispatchEvent(new CustomEvent('fintrack_wallets_changed'));
  } catch (e) {
    console.error('Error saving wallets:', e);
  }
}

// Customizable Quick 1-Tap Presets
export function getLocalQuickPresets(): QuickPreset[] {
  if (typeof window === 'undefined') return DEFAULT_QUICK_PRESETS;
  try {
    const raw = localStorage.getItem(LOCAL_PRESETS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.error('Error reading quick presets:', e);
  }
  setLocalQuickPresets(DEFAULT_QUICK_PRESETS);
  return DEFAULT_QUICK_PRESETS;
}

export function setLocalQuickPresets(presets: QuickPreset[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_PRESETS_KEY, JSON.stringify(presets));
    window.dispatchEvent(new CustomEvent('fintrack_presets_changed'));
  } catch (e) {
    console.error('Error saving quick presets:', e);
  }
}


// Sync with Vercel API
export async function syncWithVercelServer(
  onStatusChange?: (status: 'idle' | 'syncing' | 'synced' | 'offline' | 'error') => void
): Promise<{ transactions: Transaction[]; tabs: TabItem[]; dues: MonthlyDue[]; budget?: BudgetConfig }> {
  const fallback = {
    transactions: getLocalTransactions(),
    tabs: getLocalTabs(),
    dues: getLocalDues(),
    budget: getLocalBudget(),
  };

  if (typeof window === 'undefined' || !navigator.onLine) {
    onStatusChange?.('offline');
    return fallback;
  }

  onStatusChange?.('syncing');

  try {
    // 1. Sync transactions
    const txRes = await fetch('/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientTransactions: fallback.transactions }),
    });
    if (txRes.ok) {
      const txData = await txRes.json();
      if (txData.data && Array.isArray(txData.data)) {
        setLocalTransactions(txData.data);
        fallback.transactions = txData.data;
      }
    }

    // 2. Fetch tabs
    const tabsRes = await fetch('/api/tabs');
    if (tabsRes.ok) {
      const tabsData = await tabsRes.json();
      if (tabsData.data && Array.isArray(tabsData.data)) {
        setLocalTabs(tabsData.data);
        fallback.tabs = tabsData.data;
      }
    }

    // 3. Fetch dues
    const duesRes = await fetch('/api/dues');
    if (duesRes.ok) {
      const duesData = await duesRes.json();
      if (duesData.data && Array.isArray(duesData.data)) {
        setLocalDues(duesData.data);
        fallback.dues = duesData.data;
      }
    }

    // 4. Fetch budget
    const budgetRes = await fetch('/api/budget');
    if (budgetRes.ok) {
      const budgetData = await budgetRes.json();
      if (budgetData.data && typeof budgetData.data.dailyAllowance === 'number') {
        setLocalBudget(budgetData.data);
        fallback.budget = budgetData.data;
      }
    }

    onStatusChange?.('synced');
    return fallback;
  } catch (err) {
    console.warn('Vercel sync fallback:', err);
    onStatusChange?.('offline');
    return fallback;
  }
}
