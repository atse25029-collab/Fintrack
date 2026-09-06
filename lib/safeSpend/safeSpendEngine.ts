import {
  Transaction,
  MonthlyDue,
  TabItem,
  WalletBalances,
  WeeklySafeSpendConfig,
  WeeklySafeSpendState,
} from '@/lib/types';
import { getLocalDateString } from '@/lib/utils';

export const DEFAULT_SAFE_SPEND_CONFIG: WeeklySafeSpendConfig = {
  expectedWagePerShift: 300,
  plannedWorkShiftsThisWeek: 5,
  additionalWeeklyIncome: 0,
  defaultWallet: 'Cash',
  duesHorizonDays: 7, // look ahead 7 days (this week)
  includeOwedToYouTabs: false, // conservative by default
  emergencyBufferPercent: 0, // 0% - 20%
  geminiApiKey: '',
  expectedDailyWage: 300,
  workFactor: 0.85,
};

// Backward-compat export
export const DEFAULT_EARN_FIRST_CONFIG = DEFAULT_SAFE_SPEND_CONFIG;

const CONFIG_KEY = 'fintrack_weekly_safespend_config';
const LEGACY_CONFIG_KEY = 'fintrack_earn_first_config';

// ==========================================
// Configuration & Preferences Storage
// ==========================================

export function getSafeSpendConfig(): WeeklySafeSpendConfig {
  if (typeof window === 'undefined') return DEFAULT_SAFE_SPEND_CONFIG;
  try {
    const stored = localStorage.getItem(CONFIG_KEY);
    if (stored) {
      return { ...DEFAULT_SAFE_SPEND_CONFIG, ...JSON.parse(stored) };
    }
    // Fall back to reading legacy config if present
    const legacy = localStorage.getItem(LEGACY_CONFIG_KEY);
    if (legacy) {
      const parsed = JSON.parse(legacy);
      return {
        ...DEFAULT_SAFE_SPEND_CONFIG,
        expectedWagePerShift: parsed.expectedDailyWage || 300,
        defaultWallet: parsed.defaultWallet || 'Cash',
        geminiApiKey: parsed.geminiApiKey || '',
      };
    }
  } catch (err) {
    console.warn('Error reading safe spend config:', err);
  }
  return DEFAULT_SAFE_SPEND_CONFIG;
}

export const getWeeklySafeSpendConfig = getSafeSpendConfig;
export const getEarnFirstConfig = getSafeSpendConfig; // backward-compat alias

export function setSafeSpendConfig(config: Partial<WeeklySafeSpendConfig>): WeeklySafeSpendConfig {
  if (typeof window === 'undefined') return DEFAULT_SAFE_SPEND_CONFIG;
  const updated = { ...getSafeSpendConfig(), ...config };
  try {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event('fintrack_safespend_changed'));
    window.dispatchEvent(new Event('fintrack_earn_first_changed')); // backward-compat event
  } catch (err) {
    console.warn('Error saving safe spend config:', err);
  }
  return updated;
}

export const setWeeklySafeSpendConfig = setSafeSpendConfig;
export const setEarnFirstConfig = setSafeSpendConfig; // backward-compat alias

// ==========================================
// Weekly Horizon Safe Spend Computation Engine
// ==========================================

export function computeWeeklySafeSpendState(
  wallets: WalletBalances,
  dues: MonthlyDue[] = [],
  tabs: TabItem[] = [],
  transactions: Transaction[] = [],
  config: WeeklySafeSpendConfig = getSafeSpendConfig(),
  currentDate: Date = new Date()
): WeeklySafeSpendState {
  const todayStr = getLocalDateString(currentDate);

  // 1. Determine Current Week Span (Strictly Monday to Sunday)
  // JavaScript getDay(): 0 is Sunday, 1 is Monday ... 6 is Saturday
  const rawDay = currentDate.getDay();
  // Map to 1 = Monday, 2 = Tuesday, 3 = Wednesday, 4 = Thursday, 5 = Friday, 6 = Saturday, 7 = Sunday
  const dayOfWeekIndex = rawDay === 0 ? 7 : rawDay;
  const daysRemainingInWeek = Math.max(1, 8 - dayOfWeekIndex); // Mon=7 days, Tue=6, Wed=5, Thu=4, Fri=3, Sat=2, Sun=1

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayOfWeekName = dayNames[rawDay];
  const isSunday = dayOfWeekIndex === 7;
  const isMonday = dayOfWeekIndex === 1;

  // Monday (Week Start)
  const mondayDate = new Date(currentDate);
  mondayDate.setDate(currentDate.getDate() - (dayOfWeekIndex - 1));
  const mondayStr = getLocalDateString(mondayDate);

  // Sunday (Week End)
  const sundayDate = new Date(mondayDate);
  sundayDate.setDate(mondayDate.getDate() + 6);
  const sundayStr = getLocalDateString(sundayDate);

  // Formatted Monday – Sunday cycle label (e.g. "Mon, 31 Aug – Sun, 6 Sep")
  const mondayShort = mondayDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  const sundayShort = sundayDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  const weekCycleLabel = `Mon, ${mondayShort} – Sun, ${sundayShort}`;

  // Build calendar map of this Monday-to-Sunday week's days of month
  const weekDayMap = new Map<number, string>();
  for (let i = 0; i < 7; i++) {
    const d = new Date(mondayDate);
    d.setDate(mondayDate.getDate() + i);
    const label = `${d.toLocaleDateString('en-IN', { weekday: 'short' })}, ${d.getDate()} ${d.toLocaleDateString('en-IN', { month: 'short' })}`;
    weekDayMap.set(d.getDate(), label);
  }

  // 2. Liquid Funds (Real money in hand + bank)
  const cashInHand = Math.max(0, wallets?.cashInHand ?? 0);
  const accountBalance = Math.max(0, wallets?.accountBalance ?? 0);
  const totalLiquidFunds = Math.round((cashInHand + accountBalance) * 100) / 100;

  // 3. Work & Earnings This Week (Monday to Sunday)
  // Filter all income transactions logged within the current Monday–Sunday cycle
  const weeklyIncomes = transactions.filter(
    (tx) => tx.type === 'income' && tx.date >= mondayStr && tx.date <= sundayStr
  );

  const earnedThisWeek = weeklyIncomes.reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);

  // Identify completed shifts (income categorized as shift/wage or matching shift expectation)
  const shiftIncomes = weeklyIncomes.filter((tx) => {
    const desc = (tx.description || '').toLowerCase();
    const cat = (tx.category || '').toLowerCase();
    return (
      desc.includes('shift') ||
      desc.includes('wage') ||
      desc.includes('daily') ||
      cat.includes('shift') ||
      cat.includes('wage')
    );
  });

  const shiftsCompletedThisWeek = Math.min(
    config.plannedWorkShiftsThisWeek,
    shiftIncomes.length > 0
      ? shiftIncomes.length
      : Math.floor(earnedThisWeek / (config.expectedWagePerShift || 300))
  );

  const shiftsRemainingThisWeek = Math.max(
    0,
    config.plannedWorkShiftsThisWeek - shiftsCompletedThisWeek
  );

  // Remaining expected work earnings yet to be earned this week
  const remainingWorkIncome = shiftsRemainingThisWeek * config.expectedWagePerShift;
  const remainingExpectedIncome =
    remainingWorkIncome + Math.max(0, config.additionalWeeklyIncome || 0);

  // 4. All Remaining Dues (Protected against liquid funds)
  const currentDayOfMonth = currentDate.getDate();
  const horizonDays = config.duesHorizonDays || 7;

  const pendingDuesList = dues
    .filter((due) => due.status !== 'paid')
    .filter((due) => {
      // Check if due lands strictly in this Monday-to-Sunday week
      if (weekDayMap.has(due.dueDayOfMonth)) return true;

      // Or lands within horizon days from current day
      let diff = due.dueDayOfMonth - currentDayOfMonth;
      if (diff < 0) {
        diff += 30;
      }
      return diff <= horizonDays;
    })
    .map((due) => ({
      id: due.id,
      title: due.title,
      amount: Number(due.amount) || 0,
      dueDayOfMonth: due.dueDayOfMonth,
      category: due.category || 'Bills & Utilities',
      isDueThisWeek: weekDayMap.has(due.dueDayOfMonth),
      dueDateFormatted: weekDayMap.get(due.dueDayOfMonth) || `Day ${due.dueDayOfMonth}`,
    }));

  const pendingDuesTotal = pendingDuesList.reduce((sum, d) => sum + d.amount, 0);
  const pendingDuesCount = pendingDuesList.length;

  const duesDueThisWeekList = pendingDuesList.filter((d) => d.isDueThisWeek);
  const duesDueThisWeekCount = duesDueThisWeekList.length;
  const duesDueThisWeekTotal = duesDueThisWeekList.reduce((sum, d) => sum + d.amount, 0);

  // 5. All Remaining Tabs (Ring-fence what you owe)
  const pendingYouOweTabs = tabs.filter(
    (t) => t.status !== 'settled' && t.type === 'you_owe'
  );

  const pendingOwedToYouTabs = tabs.filter(
    (t) => t.status !== 'settled' && t.type === 'owed_to_you'
  );

  const youOweTotal = pendingYouOweTabs.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  const owedToYouTotal = pendingOwedToYouTabs.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  // If user opted to include money friends owe them, subtract conservatively
  const effectiveTabsDebt = config.includeOwedToYouTabs
    ? Math.max(0, youOweTotal - owedToYouTotal)
    : youOweTotal;

  const pendingTabsList = [
    ...pendingYouOweTabs.map((t) => ({
      id: t.id,
      personName: t.personName,
      amount: Number(t.amount) || 0,
      description: t.description,
      type: 'you_owe' as const,
    })),
    ...(config.includeOwedToYouTabs
      ? pendingOwedToYouTabs.map((t) => ({
          id: t.id,
          personName: t.personName,
          amount: Number(t.amount) || 0,
          description: t.description,
          type: 'owed_to_you' as const,
        }))
      : []),
  ];

  const pendingTabsCount = pendingYouOweTabs.length;
  const pendingTabsTotal = youOweTotal;

  // 6. Total Committed Obligations Ring-Fenced
  const totalObligationsLocked = Math.round((pendingDuesTotal + effectiveTabsDebt) * 100) / 100;

  // 7. Net Weekly Safe Discretionary Pool
  let rawPool = totalLiquidFunds + remainingExpectedIncome - totalObligationsLocked;

  // Apply emergency safety buffer if configured
  if (config.emergencyBufferPercent > 0 && rawPool > 0) {
    const buffer = (rawPool * config.emergencyBufferPercent) / 100;
    rawPool -= buffer;
  }

  const netWeeklySafePool = Math.max(0, Math.round(rawPool * 100) / 100);

  // 8. Today's Safe Spend Target
  const dailyTargetToday = Math.max(
    0,
    Math.round(netWeeklySafePool / daysRemainingInWeek)
  );

  // Non-due spending logged today
  const spentToday = transactions
    .filter((tx) => tx.date === todayStr && tx.type === 'expense' && !tx.isMonthlyDue)
    .reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);

  const remainingSafeToday = Math.round((dailyTargetToday - spentToday) * 100) / 100;
  const isOverspentToday = remainingSafeToday < 0;
  const overspentAmount = isOverspentToday ? Math.abs(remainingSafeToday) : 0;

  const percentUsedToday =
    dailyTargetToday > 0
      ? Math.min(100, Math.round((spentToday / dailyTargetToday) * 100))
      : spentToday > 0
      ? 100
      : 0;

  return {
    date: todayStr,
    totalLiquidFunds,
    expectedWagePerShift: config.expectedWagePerShift,
    plannedWorkShiftsThisWeek: config.plannedWorkShiftsThisWeek,
    shiftsCompletedThisWeek,
    shiftsRemainingThisWeek,
    earnedThisWeek,
    remainingExpectedIncome,
    totalObligationsLocked,
    pendingDuesCount,
    pendingDuesTotal,
    pendingDuesList,
    pendingTabsCount,
    pendingTabsTotal,
    pendingTabsList,
    netWeeklySafePool,
    weekStartDate: mondayStr,
    weekEndDate: sundayStr,
    weekCycleLabel,
    dayOfWeekName,
    dayOfWeekIndex,
    isSunday,
    isMonday,
    daysRemainingInWeek,
    duesDueThisWeekCount,
    duesDueThisWeekTotal,
    dailyTargetToday,
    spentToday,
    remainingSafeToday,
    safeLeftToday: Math.max(0, remainingSafeToday),
    isOverspentToday,
    overspentAmount,
    percentUsedToday,
    // Legacy compatibility fields
    remainingToday: Math.max(0, remainingSafeToday),
    totalAllowanceToday: dailyTargetToday,
    totalIncomeToday: earnedThisWeek,
    percentUsed: percentUsedToday,
    isRestDay: false,
    incomeCountToday: 0,
    workFactor: config.workFactor || 0.85,
    carriedRollover: 0,
    dailyDueHoldback: 0,
    effectiveIncomeToday: earnedThisWeek,
    nextDue: null,
    incomeList: [],
  };
}

// Backward-compat bridge
export function computeEarnFirstState(
  transactions: Transaction[] = [],
  dues: MonthlyDue[] = [],
  config: any = getSafeSpendConfig(),
  wallets?: WalletBalances,
  tabs?: TabItem[]
): WeeklySafeSpendState {
  const fallbackWallets: WalletBalances = wallets || {
    cashInHand: 0,
    accountBalance: 0,
    lastUpdated: Date.now(),
  };
  return computeWeeklySafeSpendState(fallbackWallets, dues, tabs || [], transactions, config);
}

// Legacy toggle rest day stub
export function toggleRestDay(date: string): boolean {
  return false;
}
