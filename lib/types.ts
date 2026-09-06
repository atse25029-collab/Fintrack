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

// Weekly Horizon Safe Spend Engine Configuration & Live State
export interface WeeklySafeSpendConfig {
  expectedWagePerShift: number;       // default 300
  plannedWorkShiftsThisWeek: number;  // default 5 (e.g. 5 days/shifts per week)
  additionalWeeklyIncome?: number;    // default 0 (freelance/side-gig expected)
  defaultWallet: 'Cash' | 'UPI / Bank'; // default 'Cash'
  duesHorizonDays: number;            // default 7 (this week)
  includeOwedToYouTabs: boolean;      // default false (conservative)
  emergencyBufferPercent: number;     // default 0% (0 - 20%)
  geminiApiKey?: string;              // dedicated Google AI Studio free tier key
  // Legacy fields
  expectedDailyWage: number;
  workFactor: number;
}

// Backward-compat aliases
export type SafeSpendConfig = WeeklySafeSpendConfig;
export type EarnFirstConfig = WeeklySafeSpendConfig;

export interface WeeklySafeSpendState {
  date: string;
  totalLiquidFunds: number;           // cashInHand + accountBalance
  expectedWagePerShift: number;
  plannedWorkShiftsThisWeek: number;
  shiftsCompletedThisWeek: number;
  shiftsRemainingThisWeek: number;
  earnedThisWeek: number;
  remainingExpectedIncome: number;
  totalObligationsLocked: number;     // total pending dues + you_owe tabs
  pendingDuesCount: number;
  pendingDuesTotal: number;
  pendingDuesList: Array<{ id: string; title: string; amount: number; dueDayOfMonth: number; category: string }>;
  pendingTabsCount: number;
  pendingTabsTotal: number;
  pendingTabsList: Array<{ id: string; personName: string; amount: number; description: string; type: TabType }>;
  netWeeklySafePool: number;          // liquid + remainingExpected - obligations
  daysRemainingInWeek: number;        // 1 to 7
  dailyTargetToday: number;           // netWeeklySafePool / daysRemaining
  spentToday: number;
  remainingSafeToday: number;         // dailyTargetToday - spentToday
  safeLeftToday?: number;             // alias for remainingSafeToday
  isOverspentToday: boolean;
  overspentAmount: number;
  percentUsedToday: number;
  // Legacy compatibility fields
  remainingToday: number;
  totalAllowanceToday: number;
  totalIncomeToday: number;
  percentUsed: number;
  isRestDay: boolean;
  incomeCountToday: number;
  workFactor: number;
  carriedRollover: number;
  dailyDueHoldback: number;
  effectiveIncomeToday: number;
  nextDue?: any;
  incomeList?: any[];
}

export type SafeSpendState = WeeklySafeSpendState;
export type EarnFirstState = WeeklySafeSpendState;

// AI Copilot Chat Types
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

export interface WeeklySafeSpendChatContext {
  date: string;
  dayOfWeek: string;
  remainingSafeToday: number;
  dailyTargetToday: number;
  spentToday: number;
  isOverspentToday: boolean;
  overspentAmount: number;
  netWeeklySafePool: number;
  daysRemainingInWeek: number;
  totalLiquidFunds: number;
  wallets: {
    cashInHand: number;
    accountBalance: number;
  };
  workSchedule: {
    expectedWagePerShift: number;
    plannedWorkShiftsThisWeek: number;
    shiftsCompletedThisWeek: number;
    shiftsRemainingThisWeek: number;
    earnedThisWeek: number;
    remainingExpectedIncome: number;
  };
  obligations: {
    totalLocked: number;
    pendingDuesCount: number;
    pendingDuesTotal: number;
    pendingDues: Array<{ title: string; amount: number; dueDayOfMonth: number; category: string }>;
    pendingTabsCount: number;
    pendingTabsTotal: number;
    tabsYouOwe: Array<{ personName: string; amount: number; description: string }>;
    tabsOwedToYou: Array<{ personName: string; amount: number; description: string }>;
  };
}

export type EarnFirstChatContext = WeeklySafeSpendChatContext;
