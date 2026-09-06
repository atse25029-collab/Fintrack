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

// ==========================================
// Dynamic Runway & Financial Triad Types
// ==========================================

export interface DynamicUpcomingObligation {
  id: string;
  title: string;
  amount: number;
  daysUntilDue: number; // 0 = due today, 1 = tomorrow, 2 = in 2 days, etc.
  dateStr: string;      // Formatted date string e.g. "Tue, 8 Sep"
  dueDayOfMonth: number;
  type: 'due' | 'tab';
  category: string;
  isBottleneck?: boolean;
}

export interface DynamicSafeSpendConfig {
  expectedWagePerShift: number;       // ₹ wage per shift / day (default 300)
  shiftsPerWeek: number;              // planned shifts per 7-day period (default 5)
  additionalWeeklyIncome?: number;    // expected side/freelance inflow (default 0)
  runwayHorizonDays: number;          // continuous rolling runway lookahead in days (e.g. 14, default 14)
  defaultWallet: 'Cash' | 'UPI / Bank';
  includeOwedToYouTabs: boolean;      // conservative by default (false)
  emergencyBufferPercent: number;     // 0% - 20%
  geminiApiKey?: string;
  // Legacy / compatibility fields
  plannedWorkShiftsThisWeek: number;
  duesHorizonDays: number;
  expectedDailyWage: number;
  workFactor: number;
}

// Backward-compat aliases
export type WeeklySafeSpendConfig = DynamicSafeSpendConfig;
export type SafeSpendConfig = DynamicSafeSpendConfig;
export type EarnFirstConfig = DynamicSafeSpendConfig;

export interface DynamicSafeSpendState {
  date: string;
  runwayDays: number;                 // e.g. 14 days lookahead

  // --- Financial Triad: Have, Earned, Will Earn ---
  totalLiquidFunds: number;           // 1. WHAT YOU HAVE: Cash + Bank
  wallets: {
    cashInHand: number;
    accountBalance: number;
  };
  earnedRecent: number;               // 2. WHAT YOU EARNED: Logged income in rolling window
  shiftsCompleted: number;            // Completed shifts derived from logged shift wages
  projectedRemainingIncome: number;   // 3. WHAT YOU WILL EARN: Remaining shift earnings in runway
  shiftsRemaining: number;            // Planned shifts remaining to work
  expectedWagePerShift: number;
  shiftsPerWeek: number;

  // --- Dynamic Runway & Bottleneck Constraint ---
  upcomingTimeline: DynamicUpcomingObligation[]; // Chronological upcoming dues/tabs
  activeBottleneck: {
    title: string;
    amount: number;
    daysUntilDue: number;
    criticalRate: number;             // Maximum burn rate allowed before this due
    dueDateFormatted: string;
  } | null;

  // --- Daily Safe Spend Target ---
  dailyTargetToday: number;           // Max safe spend per day (bottleneck rate)
  safeSpendToday: number;             // Alias for dailyTargetToday
  spentToday: number;
  remainingSafeToday: number;         // dailyTargetToday - spentToday
  safeLeftToday: number;              // Alias for remainingSafeToday
  isOverspentToday: boolean;
  overspentAmount: number;
  percentUsedToday: number;

  // --- Obligations & Cushion ---
  totalObligationsInRunway: number;   // Sum of dues & debts in active runway
  totalObligationsLocked: number;     // Alias for totalObligationsInRunway
  pendingDuesCount: number;
  pendingDuesTotal: number;
  pendingDuesList: Array<{
    id: string;
    title: string;
    amount: number;
    dueDayOfMonth: number;
    category: string;
    daysUntilDue: number;
    dueDateFormatted: string;
    isDueThisWeek?: boolean;
  }>;
  pendingTabsCount: number;
  pendingTabsTotal: number;
  pendingTabsList: Array<{
    id: string;
    personName: string;
    amount: number;
    description: string;
    type: TabType;
    daysUntilDue?: number;
  }>;
  netRunwayPool: number;              // Have + Will Earn - Obligations
  netWeeklySafePool: number;          // Backward-compat alias

  // Backward-compatibility fields for week/calendar modules
  weekStartDate: string;
  weekEndDate: string;
  weekCycleLabel: string;
  dayOfWeekName: string;
  dayOfWeekIndex: number;
  isSunday: boolean;
  isMonday: boolean;
  daysRemainingInWeek: number;
  duesDueThisWeekCount: number;
  duesDueThisWeekTotal: number;
  earnedThisWeek: number;             // Alias to earnedRecent
  remainingExpectedIncome: number;    // Alias to projectedRemainingIncome
  shiftsCompletedThisWeek: number;    // Alias to shiftsCompleted
  shiftsRemainingThisWeek: number;    // Alias to shiftsRemaining
  plannedWorkShiftsThisWeek: number;  // Alias to shiftsPerWeek
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

// Backward-compat aliases
export type WeeklySafeSpendState = DynamicSafeSpendState;
export type SafeSpendState = DynamicSafeSpendState;
export type EarnFirstState = DynamicSafeSpendState;

// AI Copilot Chat Types
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

export interface DynamicSafeSpendChatContext {
  date: string;
  dayOfWeek: string;
  runwayDays: number;

  // Triad: Have, Earned, Will Earn
  totalLiquidFunds: number;
  wallets: {
    cashInHand: number;
    accountBalance: number;
  };
  earnedRecent: number;
  shiftsCompleted: number;
  projectedRemainingIncome: number;
  shiftsRemaining: number;
  expectedWagePerShift: number;
  shiftsPerWeek: number;

  // Bottleneck & Daily Target
  activeBottleneck: {
    title: string;
    amount: number;
    daysUntilDue: number;
    criticalRate: number;
    dueDateFormatted: string;
  } | null;
  dailyTargetToday: number;
  spentToday: number;
  remainingSafeToday: number;
  isOverspentToday: boolean;
  overspentAmount: number;

  // Timeline & Obligations
  upcomingTimeline: Array<{
    title: string;
    amount: number;
    daysUntilDue: number;
    dateStr: string;
    type: string;
  }>;
  totalObligationsInRunway: number;
  pendingDues: Array<{
    title: string;
    amount: number;
    dueDayOfMonth: number;
    daysUntilDue: number;
    dueDateFormatted: string;
    category: string;
  }>;
  tabsYouOwe: Array<{ personName: string; amount: number; description: string }>;
  tabsOwedToYou: Array<{ personName: string; amount: number; description: string }>;

  // Legacy compatibility fields
  weekCycle?: string;
  weekCycleLabel?: string;
  isSunday?: boolean;
  netWeeklySafePool?: number;
  daysRemainingInWeek?: number;
  duesDueThisWeekCount?: number;
  duesDueThisWeekTotal?: number;
  workSchedule?: any;
  obligations?: any;
}

export type WeeklySafeSpendChatContext = DynamicSafeSpendChatContext;
export type EarnFirstChatContext = DynamicSafeSpendChatContext;

