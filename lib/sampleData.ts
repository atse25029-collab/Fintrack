import { Transaction, BudgetConfig, TabItem, MonthlyDue, WalletBalances, QuickPreset } from './types';

export function getRelativeDate(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split('T')[0];
}

export const DEFAULT_BUDGET: BudgetConfig = {
  monthlyLimit: 25000,
  dailyAllowance: 600,
  currency: 'INR',
  currencySymbol: '₹',
};

// Fresh empty transaction ledger
export const INITIAL_TRANSACTIONS: Transaction[] = [];

// Fresh empty tabs ledger
export const INITIAL_TABS: TabItem[] = [];

// Fresh empty monthly dues ledger
export const INITIAL_MONTHLY_DUES: MonthlyDue[] = [];

// Fresh initial liquid wallet balances (Ready for user to set or start from 0)
export const DEFAULT_WALLETS: WalletBalances = {
  cashInHand: 0,
  accountBalance: 0,
  lastUpdated: Date.now(),
};

// Default Customizable Quick 1-Tap Presets (Ready for user customization)
export const DEFAULT_QUICK_PRESETS: QuickPreset[] = [
  {
    id: 'preset-wage',
    label: 'Daily Wage',
    amount: 200,
    category: 'Salary',
    type: 'income',
    paymentMethod: 'Cash',
    iconName: 'wallet',
  },
  {
    id: 'preset-1',
    label: 'Chai & Snack',
    amount: 50,
    category: 'Chai & Snacks',
    type: 'expense',
    paymentMethod: 'UPI / Bank',
    iconName: 'coffee',
  },
  {
    id: 'preset-2',
    label: 'Lunch / Thali',
    amount: 150,
    category: 'Food & Dining',
    type: 'expense',
    paymentMethod: 'UPI / Bank',
    iconName: 'utensils',
  },
  {
    id: 'preset-3',
    label: 'Groceries / Kirana',
    amount: 450,
    category: 'Groceries & Kirana',
    type: 'expense',
    paymentMethod: 'UPI / Bank',
    iconName: 'shopping-cart',
  },
  {
    id: 'preset-4',
    label: 'Auto / Metro',
    amount: 60,
    category: 'Transport & Metro',
    type: 'expense',
    paymentMethod: 'Cash',
    iconName: 'bus',
  },
];
