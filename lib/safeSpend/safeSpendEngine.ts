import {
  Transaction,
  MonthlyDue,
  EarnFirstConfig,
  EarnFirstState,
  EarnFirstIncomeItem,
} from '@/lib/types';
import { getLocalDateString } from '@/lib/utils';

export const DEFAULT_EARN_FIRST_CONFIG: EarnFirstConfig = {
  expectedDailyWage: 200,
  workFactor: 0.70, // ~5 days a week (70% attendance)
  defaultWallet: 'Cash',
  duesReserveCapPercent: 40, // At most 40% of a shift goes to dues
  geminiApiKey: '',
};

const CONFIG_KEY = 'fintrack_earn_first_config';
const REST_DAYS_KEY = 'fintrack_rest_days_log';

// ==========================================
// Configuration & Preferences Storage
// ==========================================

export function getEarnFirstConfig(): EarnFirstConfig {
  if (typeof window === 'undefined') return DEFAULT_EARN_FIRST_CONFIG;
  try {
    const stored = localStorage.getItem(CONFIG_KEY);
    if (stored) {
      return { ...DEFAULT_EARN_FIRST_CONFIG, ...JSON.parse(stored) };
    }
  } catch (err) {
    console.warn('Error reading earn-first config:', err);
  }
  return DEFAULT_EARN_FIRST_CONFIG;
}

export function setEarnFirstConfig(config: Partial<EarnFirstConfig>): EarnFirstConfig {
  if (typeof window === 'undefined') return DEFAULT_EARN_FIRST_CONFIG;
  const updated = { ...getEarnFirstConfig(), ...config };
  try {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event('fintrack_earn_first_changed'));
  } catch (err) {
    console.warn('Error saving earn-first config:', err);
  }
  return updated;
}

// ==========================================
// Rest Day Tracking
// ==========================================

export function getRestDaysLog(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(REST_DAYS_KEY);
    if (stored) return JSON.parse(stored);
  } catch {
    // ignore
  }
  return [];
}

export function toggleRestDay(date: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const log = getRestDaysLog();
    const exists = log.includes(date);
    const updated = exists ? log.filter((d) => d !== date) : [...log, date];
    localStorage.setItem(REST_DAYS_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event('fintrack_earn_first_changed'));
    return !exists;
  } catch {
    return false;
  }
}

// ==========================================
// Due Date Proximity & Urgency Calculation
// ==========================================

export interface DueUrgencySummary {
  totalDailyCut: number;
  nearestDue: {
    id: string;
    title: string;
    daysLeft: number;
    amount: number;
    dailyUrgencyCut: number;
  } | null;
}

export function calculateDueUrgency(
  dues: MonthlyDue[],
  now: Date = new Date(),
  workFactor: number = 0.70
): DueUrgencySummary {
  const currentDay = now.getDate();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  let totalDailyCut = 0;
  let nearestDue: DueUrgencySummary['nearestDue'] = null;
  let minDaysLeft = Infinity;

  for (const due of dues) {
    // Skip if already paid this month
    if (due.status === 'paid' && due.lastPaidDate?.startsWith(currentMonthStr)) {
      continue;
    }

    const dueDay = due.dueDayOfMonth;
    const daysLeft = dueDay >= currentDay ? dueDay - currentDay : 30 - (currentDay - dueDay);
    const safeDaysLeft = Math.max(1, daysLeft);

    // Expected shifts before this due date based on work probability factor
    const expectedShifts = Math.max(1, Math.round(safeDaysLeft * Math.max(0.2, workFactor)));
    const dailyUrgencyCut = Math.round(due.amount / expectedShifts);

    totalDailyCut += dailyUrgencyCut;

    if (daysLeft < minDaysLeft) {
      minDaysLeft = daysLeft;
      nearestDue = {
        id: due.id,
        title: due.title,
        daysLeft,
        amount: due.amount,
        dailyUrgencyCut,
      };
    }
  }

  return { totalDailyCut, nearestDue };
}

// ==========================================
// Full Backward-Compatible State Hydration
// Hydrates from existing transactions, dues, and wallets
// ==========================================

export function computeEarnFirstState(
  transactions: Transaction[],
  dues: MonthlyDue[],
  config: EarnFirstConfig = getEarnFirstConfig(),
  customDate?: string
): EarnFirstState {
  const now = new Date();
  const today = customDate || getLocalDateString(now);

// 1. Inspect Today's Transactions for ALL types of income (including any tagged inflow)
  const todayTransactions = transactions.filter((tx) => tx.date === today);
  const todayIncomeTransactions = todayTransactions.filter(
    (tx) =>
      tx.type === 'income' ||
      tx.category.toLowerCase().includes('inflow') ||
      tx.description.toLowerCase().includes('inflow')
  );

  const totalIncomeToday = todayIncomeTransactions.reduce((sum, tx) => sum + tx.amount, 0);
  const incomeLoggedToday = totalIncomeToday > 0;
  const incomeCountToday = todayIncomeTransactions.length;

  const incomeItemsToday: EarnFirstIncomeItem[] = todayIncomeTransactions.map((tx) => ({
    id: tx.id,
    description: tx.description,
    amount: tx.amount,
    category: tx.category,
    paymentMethod: tx.paymentMethod,
    time: tx.time,
  }));

  // Itemize breakdown between daily shift/wage vs other inflows (cash in, cashback, tab repayment)
  let shiftWageToday = 0;
  let otherIncomeToday = 0;

  for (const tx of todayIncomeTransactions) {
    const desc = tx.description.toLowerCase();
    const cat = tx.category.toLowerCase();
    if (
      desc.includes('wage') ||
      desc.includes('shift') ||
      desc.includes('part time') ||
      desc.includes('daily') ||
      cat.includes('shift') ||
      cat.includes('daily wage') ||
      tx.amount === config.expectedDailyWage
    ) {
      shiftWageToday += tx.amount;
    } else {
      otherIncomeToday += tx.amount;
    }
  }

  // Backward-compatibility aliases
  const shiftLoggedToday = incomeLoggedToday;
  const wageEarnedToday = totalIncomeToday;

  // 2. Inspect Today's Non-Due Expenses (exclude any inflow)
  const spentToday = todayTransactions
    .filter(
      (tx) =>
        tx.type === 'expense' &&
        !tx.isMonthlyDue &&
        !tx.category.toLowerCase().includes('inflow') &&
        !tx.description.toLowerCase().includes('inflow')
    )
    .reduce((sum, tx) => sum + tx.amount, 0);

  // 3. Due Date Urgency & Shield Calculation (applies to total income)
  const urgency = calculateDueUrgency(dues, now, config.workFactor);
  let duesShieldToday = 0;

  if (totalIncomeToday > 0) {
    const maxReserveCap = Math.round(
      totalIncomeToday * ((config.duesReserveCapPercent || 40) / 100)
    );
    duesShieldToday = Math.min(urgency.totalDailyCut, maxReserveCap);
  }

  const basePocketAllowance = totalIncomeToday > 0
    ? Math.max(0, totalIncomeToday - duesShieldToday)
    : 0;

  // 4. Derive Historical Rollover and Cushion from Past 7 Days
  // This guarantees existing user data is immediately honored
  let carriedRollover = 0;
  let restDayCushion = 0;
  let weeklyNetRollover = 0;
  let monthlyNetRollover = 0;

  const currentMonthPrefix = today.substring(0, 7);

  // Group past transactions by date
  const pastDaysMap = new Map<string, { income: number; expense: number }>();

  for (const tx of transactions) {
    if (tx.date >= today) continue; // Only historical days
    if (!pastDaysMap.has(tx.date)) {
      pastDaysMap.set(tx.date, { income: 0, expense: 0 });
    }
    const dayData = pastDaysMap.get(tx.date)!;
    if (
      tx.type === 'income' ||
      tx.category.toLowerCase().includes('inflow') ||
      tx.description.toLowerCase().includes('inflow')
    ) {
      dayData.income += tx.amount;
    } else if (
      tx.type === 'expense' &&
      !tx.isMonthlyDue &&
      !tx.category.toLowerCase().includes('inflow') &&
      !tx.description.toLowerCase().includes('inflow')
    ) {
      dayData.expense += tx.amount;
    }
  }

  // Calculate net variances across past 7 days
  const sortedPastDates = Array.from(pastDaysMap.keys()).sort().reverse();
  const past7Days = sortedPastDates.slice(0, 7);

  for (const date of past7Days) {
    const day = pastDaysMap.get(date)!;
    const estimatedAllowance =
      day.income > 0 ? Math.round(day.income * 0.75) : Math.round(config.expectedDailyWage * 0.5);
    const variance = estimatedAllowance - day.expense;

    if (variance > 0) {
      restDayCushion += Math.round(variance * 0.5); // 50% goes to cushion
      carriedRollover += Math.round(variance * 0.5); // 50% rolls over
    } else {
      carriedRollover += variance; // Negative deficit carries over
    }

    weeklyNetRollover += variance;
  }

  // Monthly net calculation
  for (const [date, day] of pastDaysMap.entries()) {
    if (date.startsWith(currentMonthPrefix)) {
      const estimatedAllowance =
        day.income > 0 ? Math.round(day.income * 0.75) : Math.round(config.expectedDailyWage * 0.5);
      monthlyNetRollover += estimatedAllowance - day.expense;
    }
  }

  // Smooth rollover limits: cap positive rollover at 1.5x expected wage so user doesn't overspend recklessly,
  // and cap deficit compensation at -50% of expected wage so user isn't starved.
  carriedRollover = Math.max(
    -Math.round(config.expectedDailyWage * 0.5),
    Math.min(Math.round(config.expectedDailyWage * 1.5), carriedRollover)
  );

  // Ensure rest-day cushion has at least a healthy baseline if user has liquid funds
  restDayCushion = Math.max(50, restDayCushion);

  // 5. Rest Day Status
  const restDaysLog = getRestDaysLog();
  const isRestDay = !shiftLoggedToday && restDaysLog.includes(today);

  // 6. Total Safe Spend Today Calculation
  let totalAllowanceToday = 0;

  if (shiftLoggedToday) {
    // Working day: base pocket allowance + carried rollover from yesterday
    totalAllowanceToday = Math.max(40, basePocketAllowance + carriedRollover);
  } else if (isRestDay) {
    // Rest day: draw pocket money from Rest-Day Cushion Fund!
    totalAllowanceToday = Math.min(restDayCushion, 120);
  } else {
    // Pending shift or baseline day
    const baseline = Math.round(config.expectedDailyWage * 0.35); // e.g. ₹70 for basics
    totalAllowanceToday = Math.max(0, baseline + carriedRollover);
  }

  const remainingToday = totalAllowanceToday - spentToday;
  const percentUsed =
    totalAllowanceToday > 0
      ? Math.min(100, Math.round((spentToday / totalAllowanceToday) * 100))
      : spentToday > 0
      ? 100
      : 0;

  return {
    date: today,
    shiftLoggedToday,
    incomeLoggedToday,
    wageEarnedToday,
    totalIncomeToday,
    incomeCountToday,
    incomeItemsToday,
    shiftWageToday,
    otherIncomeToday,
    basePocketAllowance,
    carriedRollover,
    totalAllowanceToday,
    spentToday,
    remainingToday,
    duesShieldToday,
    restDayCushion,
    weeklyNetRollover,
    monthlyNetRollover,
    isRestDay,
    percentUsed,
    nextUrgentDue: urgency.nearestDue,
  };
}
