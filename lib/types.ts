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
  isMonthlyDue?: boolean; // When true, excluded from daily spending allowance calculation
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
  dailyAllowance: number; // Effective allowance today (base + carriedForward, min 0)
  baseAllowance: number;  // Configured base daily allowance (e.g. 600)
  carriedForward: number; // Net accumulated rollover (positive = savings surplus, negative = overspent deficit)
  isDeficit: boolean;     // True when user has accumulated an overspend from past days
  deficitAmount: number;  // Absolute overspent amount being compensated
  weeklySpent: number;    // This week's total daily spending (excluding monthly dues)
  weeklyTarget: number;   // This week's expected budget
  weeklyVariance: number; // Positive = under budget, Negative = overspent
  monthlyDailySpent: number; // Total daily spending this month so far
  monthlyDailyTarget: number; // Cumulative daily budget target so far this month
  monthlyDailyVariance: number; // Positive = net saved, Negative = net overspent
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
  createdAt?: number;
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
    'Daily Wage / Shift',
    'Salary',
    'Freelance / Consulting',
    'Business / Sales',
    'Investments & Interest',
    'Gifts & Cashback',
    'Tab Settlement / Repayment',
    'Side Hustle / Gig',
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

// Itemized Income for Earn-First Engine
export interface EarnFirstIncomeItem {
  id: string;
  description: string;
  amount: number;
  category: string;
  paymentMethod: PaymentMethod;
  time?: string;
}

// Earn-First Safe Spend Engine Configuration & Live State
export interface EarnFirstConfig {
  expectedDailyWage: number;       // default 200
  workFactor: number;              // default 0.70 (e.g. 5 days a week)
  defaultWallet: 'Cash' | 'UPI / Bank'; // default 'Cash'
  duesReserveCapPercent?: number;  // max % of a single shift that can be reserved (default 40%)
}

export interface EarnFirstState {
  date: string;
  shiftLoggedToday: boolean;        // Backward-compat: true if any income was logged today
  incomeLoggedToday: boolean;       // True if any income was logged today
  wageEarnedToday: number;          // Backward-compat: total income earned today
  totalIncomeToday: number;         // Total income from all sources earned today
  incomeCountToday: number;         // Count of income transactions today
  incomeItemsToday: EarnFirstIncomeItem[]; // Itemized list of all incomes earned today
  shiftWageToday: number;           // Subtotal of shift / wage earnings
  otherIncomeToday: number;         // Subtotal of freelance, gig, gift, tab settlement, etc.
  basePocketAllowance: number;
  carriedRollover: number;         // surplus (+) or deficit (-) from previous days
  totalAllowanceToday: number;     // base + carriedRollover
  spentToday: number;              // non-due expenses today
  remainingToday: number;          // totalAllowanceToday - spentToday
  duesShieldToday: number;         // amount locked away for upcoming dues today
  restDayCushion: number;          // accumulated surplus buffer for off-days
  weeklyNetRollover: number;       // net surplus/deficit this week
  monthlyNetRollover: number;      // net surplus/deficit this month
  isRestDay: boolean;
  percentUsed: number;
  nextUrgentDue: {
    id: string;
    title: string;
    daysLeft: number;
    amount: number;
    dailyUrgencyCut: number;
  } | null;
}
