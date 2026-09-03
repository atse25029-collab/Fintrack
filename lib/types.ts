export type TransactionType = 'income' | 'expense';

export type PaymentMethod = 'UPI / Bank' | 'Card' | 'Cash' | 'Other';

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  category: string;
  description: string;
  date: string; // YYYY-MM-DD
  time?: string; // HH:mm:ss
  timestamp?: string; // ISO string with exact real-time seconds
  paymentMethod: PaymentMethod;
  notes?: string;
  createdAt: number;
  synced?: boolean;
}

export interface BudgetConfig {
  monthlyLimit: number;
  dailyAllowance: number;
  currency: 'INR';
  currencySymbol: '₹';
}

export interface DailySummary {
  date: string;
  spentToday: number;
  earnedToday: number;
  remainingAllowance: number;
  dailyAllowance: number; // Effective total allowance for today (base + carriedForward)
  baseAllowance: number;  // Configured base daily allowance
  carriedForward: number; // Accumulated unspent budget carried forward from previous days
  percentUsed: number;
  isOverBudget: boolean;
}

export interface FinancialStats {
  totalBalance: number;
  totalIncome: number;
  totalExpense: number;
  savingsRate: number; // percentage
  monthIncome: number;
  monthExpense: number;
  monthSavings: number;
}

export interface CategoryBreakdownItem {
  category: string;
  amount: number;
  percentage: number;
  count: number;
  type: TransactionType;
}

export interface CashflowPoint {
  date: string;
  label: string;
  income: number;
  expense: number;
  net: number;
}

// Tabs: Informal peer-to-peer Lent & Borrowed IOUs
export type TabType = 'you_owe' | 'owed_to_you';

export interface TabItem {
  id: string;
  personName: string;
  amount: number;
  type: TabType;
  description: string;
  date: string;
  status: 'pending' | 'settled';
  settledAt?: number;
  createdAt: number;
  notes?: string;
}

// Monthly Dues: Fixed recurring monthly bills & obligations
export interface MonthlyDue {
  id: string;
  title: string;
  amount: number;
  category: string;
  dueDayOfMonth: number; // 1 - 31
  paymentMethod: PaymentMethod;
  status: 'pending' | 'paid';
  lastPaidDate?: string; // YYYY-MM-DD
  notes?: string;
}

export interface MonthlyDueReminder {
  due: MonthlyDue;
  daysRemaining: number;
  isOverdue: boolean;
  isDueToday: boolean;
  isPaidThisMonth: boolean;
  statusText: string;
}

// Analytics types
export interface TimeframeSpendingPoint {
  label: string;
  period: string;
  expense: number;
  income: number;
  net: number;
}

export interface PaymentMethodBreakdown {
  method: PaymentMethod;
  amount: number;
  count: number;
  percentage: number;
}

export interface TimeOfDayBreakdown {
  period: 'Morning (6am-12pm)' | 'Afternoon (12pm-5pm)' | 'Evening (5pm-9pm)' | 'Night (9pm-6am)';
  amount: number;
  count: number;
  percentage: number;
}

export const DEFAULT_CATEGORIES = {
  expense: [
    'Chai & Snacks',
    'Food & Dining',
    'Groceries & Kirana',
    'Transport & Metro',
    'Bills & Utilities',
    'Shopping',
    'Entertainment & OTT',
    'Health & Medical',
    'Rent & Maintenance',
    'Education',
    'Miscellaneous',
  ],
  income: [
    'Salary',
    'Freelance / Consulting',
    'Business / Sales',
    'Investments & Interest',
    'Gifts & Cashback',
    'Other Inflows',
  ],
};

export const QUICK_ADD_PRESETS = [
  { label: 'Chai & Snack', amount: 50, category: 'Chai & Snacks', type: 'expense' as const, method: 'UPI / Bank' as const },
  { label: 'Lunch / Thali', amount: 150, category: 'Food & Dining', type: 'expense' as const, method: 'UPI / Bank' as const },
  { label: 'Groceries / Kirana', amount: 450, category: 'Groceries & Kirana', type: 'expense' as const, method: 'UPI / Bank' as const },
  { label: 'Auto / Metro', amount: 60, category: 'Transport & Metro', type: 'expense' as const, method: 'UPI / Bank' as const },
  { label: 'Dinner / Swiggy', amount: 280, category: 'Food & Dining', type: 'expense' as const, method: 'UPI / Bank' as const },
];

// Liquid Wallets
export interface WalletBalances {
  cashInHand: number;      // Cash in physical wallet / pocket
  accountBalance: number;  // Bank accounts, UPI, Cards
  lastUpdated?: number;
}

// User-Customizable Quick Presets
export interface QuickPreset {
  id: string;
  label: string;
  amount: number;
  category: string;
  type?: 'expense' | 'income'; // default: 'expense'
  paymentMethod: PaymentMethod;
  iconName?:
    | 'coffee'
    | 'utensils'
    | 'shopping-cart'
    | 'bus'
    | 'fuel'
    | 'zap'
    | 'smartphone'
    | 'gift'
    | 'heart'
    | 'tag'
    | 'wallet'
    | 'trending-up';
}


