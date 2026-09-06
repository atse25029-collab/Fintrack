import {
  Transaction,
  MonthlyDue,
  TabItem,
  WalletBalances,
  DynamicSafeSpendConfig,
  DynamicSafeSpendState,
  DynamicUpcomingObligation,
  TabType,
} from '@/lib/types';
import { getLocalDateString } from '@/lib/utils';

export const DEFAULT_SAFE_SPEND_CONFIG: DynamicSafeSpendConfig = {
  expectedWagePerShift: 300,
  shiftsPerWeek: 5,
  additionalWeeklyIncome: 0,
  runwayHorizonDays: 14, // rolling 14-day lookahead runway
  defaultWallet: 'Cash',
  includeOwedToYouTabs: false, // conservative by default
  emergencyBufferPercent: 0, // 0% - 20%
  geminiApiKey: '',
  // legacy aliases
  plannedWorkShiftsThisWeek: 5,
  duesHorizonDays: 14,
  expectedDailyWage: 300,
  workFactor: 0.85,
};

export const DEFAULT_EARN_FIRST_CONFIG = DEFAULT_SAFE_SPEND_CONFIG;

const CONFIG_KEY = 'fintrack_weekly_safespend_config';
const LEGACY_CONFIG_KEY = 'fintrack_earn_first_config';

export function getSafeSpendConfig(): DynamicSafeSpendConfig {
  if (typeof window === 'undefined') return DEFAULT_SAFE_SPEND_CONFIG;
  try {
    const stored = localStorage.getItem(CONFIG_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        ...DEFAULT_SAFE_SPEND_CONFIG,
        ...parsed,
        shiftsPerWeek: parsed.shiftsPerWeek || parsed.plannedWorkShiftsThisWeek || 5,
        runwayHorizonDays: parsed.runwayHorizonDays || parsed.duesHorizonDays || 14,
      };
    }
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
export const getEarnFirstConfig = getSafeSpendConfig;

export function setSafeSpendConfig(config: Partial<DynamicSafeSpendConfig>): DynamicSafeSpendConfig {
  if (typeof window === 'undefined') return DEFAULT_SAFE_SPEND_CONFIG;
  const current = getSafeSpendConfig();
  const updated: DynamicSafeSpendConfig = {
    ...current,
    ...config,
    shiftsPerWeek: config.shiftsPerWeek ?? config.plannedWorkShiftsThisWeek ?? current.shiftsPerWeek,
    plannedWorkShiftsThisWeek: config.shiftsPerWeek ?? config.plannedWorkShiftsThisWeek ?? current.shiftsPerWeek,
    runwayHorizonDays: config.runwayHorizonDays ?? config.duesHorizonDays ?? current.runwayHorizonDays,
    duesHorizonDays: config.runwayHorizonDays ?? config.duesHorizonDays ?? current.runwayHorizonDays,
  };
  try {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event('fintrack_safespend_changed'));
    window.dispatchEvent(new Event('fintrack_earn_first_changed'));
  } catch (err) {
    console.warn('Error saving safe spend config:', err);
  }
  return updated;
}

export const setWeeklySafeSpendConfig = setSafeSpendConfig;
export const setEarnFirstConfig = setSafeSpendConfig;

/**
 * Calculates exact calendar days until the next occurrence of dueDayOfMonth from currentDate.
 * Returns 0 if due today.
 */
export function getDaysUntilNextDue(dueDayOfMonth: number, fromDate: Date = new Date()): number {
  const currentYear = fromDate.getFullYear();
  const currentMonth = fromDate.getMonth();
  const currentDay = fromDate.getDate();

  const daysInCurrentMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const clampedDayThisMonth = Math.min(dueDayOfMonth, daysInCurrentMonth);

  const todayMidnight = new Date(currentYear, currentMonth, currentDay, 0, 0, 0, 0);

  if (clampedDayThisMonth >= currentDay) {
    const thisMonthDue = new Date(currentYear, currentMonth, clampedDayThisMonth, 0, 0, 0, 0);
    const diffMs = thisMonthDue.getTime() - todayMidnight.getTime();
    return Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)));
  } else {
    // Due occurs next month
    const nextMonthYear = currentMonth === 11 ? currentYear + 1 : currentYear;
    const nextMonth = (currentMonth + 1) % 12;
    const daysInNextMonth = new Date(nextMonthYear, nextMonth + 1, 0).getDate();
    const clampedDayNextMonth = Math.min(dueDayOfMonth, daysInNextMonth);

    const nextMonthDue = new Date(nextMonthYear, nextMonth, clampedDayNextMonth, 0, 0, 0, 0);
    const diffMs = nextMonthDue.getTime() - todayMidnight.getTime();
    return Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)));
  }
}

/**
 * Continuous Dynamic Runway & Bottleneck Safe Spend Computation Engine
 * Factors in:
 * 1. What you HAVE (real liquid funds in hand & bank)
 * 2. What you EARNED (recent logged income & completed shifts)
 * 3. What you WILL EARN (planned shifts remaining before each checkpoint)
 * 4. Exact day offsets to all upcoming dues & obligations (zero calendar week reset)
 */
export function computeDynamicSafeSpendState(
  wallets: WalletBalances,
  dues: MonthlyDue[] = [],
  tabs: TabItem[] = [],
  transactions: Transaction[] = [],
  config: DynamicSafeSpendConfig = getSafeSpendConfig(),
  currentDate: Date = new Date()
): DynamicSafeSpendState {
  const todayStr = getLocalDateString(currentDate);

  // 1. WHAT YOU HAVE: Real-time liquid cash + bank account balances
  const cashInHand = Math.max(0, wallets?.cashInHand ?? 0);
  const accountBalance = Math.max(0, wallets?.accountBalance ?? 0);
  const totalLiquidFunds = Math.round((cashInHand + accountBalance) * 100) / 100;

  // 2. WHAT YOU EARNED: Logged incomes in recent rolling 7-day period
  const sevenDaysAgo = new Date(currentDate);
  sevenDaysAgo.setDate(currentDate.getDate() - 6);
  const sevenDaysAgoStr = getLocalDateString(sevenDaysAgo);

  const recentIncomes = transactions.filter(
    (tx) => tx.type === 'income' && tx.date >= sevenDaysAgoStr && tx.date <= todayStr
  );
  const earnedRecent = recentIncomes.reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);

  // Identify completed shifts in recent window
  const shiftIncomes = recentIncomes.filter((tx) => {
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

  const wagePerShift = Math.max(1, config.expectedWagePerShift || 300);
  const shiftsPerWeek = config.shiftsPerWeek || config.plannedWorkShiftsThisWeek || 5;

  const shiftsCompleted = Math.min(
    shiftsPerWeek,
    shiftIncomes.length > 0
      ? shiftIncomes.length
      : Math.floor(earnedRecent / wagePerShift)
  );

  // 3. WHAT YOU WILL EARN: Planned shift income remaining in active runway
  const runwayHorizonDays = Math.max(3, config.runwayHorizonDays || config.duesHorizonDays || 14);

  // Total shifts planned across the lookahead horizon
  const totalPlannedRunwayShifts = Math.round((runwayHorizonDays / 7) * shiftsPerWeek);
  const shiftsRemaining = Math.max(0, totalPlannedRunwayShifts - shiftsCompleted);
  const projectedRemainingIncome =
    shiftsRemaining * wagePerShift +
    Math.round(((config.additionalWeeklyIncome || 0) * (runwayHorizonDays / 7)) * 100) / 100;

  // 4. UPCOMING OBLIGATIONS & CHRONOLOGICAL TIMELINE
  const rawDay = currentDate.getDay();
  const dayOfWeekIndex = rawDay === 0 ? 7 : rawDay;
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayOfWeekName = dayNames[rawDay];
  const isSunday = dayOfWeekIndex === 7;
  const isMonday = dayOfWeekIndex === 1;
  const daysRemainingInWeek = Math.max(1, 8 - dayOfWeekIndex);

  // Monday – Sunday cycle dates for backward-compat
  const mondayDate = new Date(currentDate);
  mondayDate.setDate(currentDate.getDate() - (dayOfWeekIndex - 1));
  const mondayStr = getLocalDateString(mondayDate);
  const sundayDate = new Date(mondayDate);
  sundayDate.setDate(mondayDate.getDate() + 6);
  const sundayStr = getLocalDateString(sundayDate);
  const mondayShort = mondayDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  const sundayShort = sundayDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  const weekCycleLabel = `Mon, ${mondayShort} – Sun, ${sundayShort}`;

  // Map unpaid dues
  const pendingDuesList = dues
    .filter((due) => due.status !== 'paid')
    .map((due) => {
      const daysUntilDue = getDaysUntilNextDue(due.dueDayOfMonth, currentDate);
      const targetDate = new Date(currentDate);
      targetDate.setDate(currentDate.getDate() + daysUntilDue);
      const dueDateFormatted =
        daysUntilDue === 0
          ? 'Due Today'
          : daysUntilDue === 1
          ? 'Tomorrow'
          : targetDate.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });

      return {
        id: due.id,
        title: due.title,
        amount: Number(due.amount) || 0,
        dueDayOfMonth: due.dueDayOfMonth,
        category: due.category || 'Bills & Utilities',
        daysUntilDue,
        dueDateFormatted,
        isDueThisWeek: daysUntilDue < daysRemainingInWeek,
      };
    })
    .sort((a, b) => a.daysUntilDue - b.daysUntilDue);

  const pendingDuesTotal = pendingDuesList.reduce((sum, d) => sum + d.amount, 0);
  const pendingDuesCount = pendingDuesList.length;

  const duesDueThisWeekList = pendingDuesList.filter((d) => d.isDueThisWeek);
  const duesDueThisWeekCount = duesDueThisWeekList.length;
  const duesDueThisWeekTotal = duesDueThisWeekList.reduce((sum, d) => sum + d.amount, 0);

  // Tabs
  const pendingYouOweTabs = tabs.filter(
    (t) => t.status !== 'settled' && t.type === 'you_owe'
  );
  const pendingOwedToYouTabs = tabs.filter(
    (t) => t.status !== 'settled' && t.type === 'owed_to_you'
  );

  const youOweTotal = pendingYouOweTabs.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  const owedToYouTotal = pendingOwedToYouTabs.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

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
      daysUntilDue: 1, // Treat debts you owe as near-term (due within 1-2 days)
    })),
    ...(config.includeOwedToYouTabs
      ? pendingOwedToYouTabs.map((t) => ({
          id: t.id,
          personName: t.personName,
          amount: Number(t.amount) || 0,
          description: t.description,
          type: 'owed_to_you' as const,
          daysUntilDue: 7,
        }))
      : []),
  ];

  const pendingTabsCount = pendingYouOweTabs.length;
  const pendingTabsTotal = youOweTotal;

  // Filter dues and tabs that land within the active runway
  const duesInRunway = pendingDuesList.filter((d) => d.daysUntilDue <= runwayHorizonDays);
  const totalObligationsInRunway = Math.round(
    (duesInRunway.reduce((s, d) => s + d.amount, 0) + effectiveTabsDebt) * 100
  ) / 100;
  const totalObligationsLocked = totalObligationsInRunway;

  // Build Chronological Upcoming Timeline
  const upcomingTimeline: DynamicUpcomingObligation[] = [
    ...duesInRunway.map((d) => ({
      id: d.id,
      title: d.title,
      amount: d.amount,
      daysUntilDue: d.daysUntilDue,
      dateStr: d.dueDateFormatted,
      dueDayOfMonth: d.dueDayOfMonth,
      type: 'due' as const,
      category: d.category,
    })),
    ...pendingYouOweTabs.map((t) => ({
      id: t.id,
      title: `Owe ${t.personName}`,
      amount: Number(t.amount) || 0,
      daysUntilDue: 1,
      dateStr: 'Immediate Debt',
      dueDayOfMonth: 0,
      type: 'tab' as const,
      category: 'Friend Debt',
    })),
  ].sort((a, b) => a.daysUntilDue - b.daysUntilDue);

  // 5. BOTTLENECK CONSTRAINT & SAFE SPEND CALCULATION (Zero-Deficit Theorem)
  // Immediate due today ring-fence
  const immediateObligations = upcomingTimeline
    .filter((o) => o.daysUntilDue <= 0)
    .reduce((sum, o) => sum + o.amount, 0);

  // Find the bottleneck across upcoming checkpoints
  let activeBottleneck: DynamicSafeSpendState['activeBottleneck'] = null;
  let minSafeDailyRate = Infinity;

  // Track cumulative obligations as we step forward through checkpoints
  let cumulativeObligations = immediateObligations;

  // Group obligations by checkpoint day offset (T_k >= 1)
  const checkpoints = upcomingTimeline.filter((o) => o.daysUntilDue >= 1);

  if (checkpoints.length > 0) {
    for (let i = 0; i < checkpoints.length; i++) {
      const item = checkpoints[i];
      cumulativeObligations += item.amount;
      const Tk = item.daysUntilDue;

      // Inflow user can expect to earn by Day Tk ("Will Earn" up to Day Tk)
      const shiftsByTk = Math.min(
        shiftsRemaining,
        Math.max(0, Math.floor(Tk * (shiftsPerWeek / 7)))
      );
      const inflowByTk =
        shiftsByTk * wagePerShift +
        ((config.additionalWeeklyIncome || 0) * (Tk / 7));


      const totalAvailableByTk = totalLiquidFunds + inflowByTk;
      const netCushionByTk = totalAvailableByTk - cumulativeObligations;

      // Allowable daily burn rate to arrive at Day Tk with sufficient cash to clear all dues
      const safeRateForCheckpoint = netCushionByTk / Tk;

      if (safeRateForCheckpoint < minSafeDailyRate) {
        minSafeDailyRate = safeRateForCheckpoint;
        activeBottleneck = {
          title: item.title,
          amount: item.amount,
          daysUntilDue: Tk,
          criticalRate: Math.max(0, Math.round(safeRateForCheckpoint * 100) / 100),
          dueDateFormatted: item.dateStr,
        };
      }
    }
  }

  // Also check the end of the full runway horizon as a checkpoint
  const fullRunwayCushion = totalLiquidFunds + projectedRemainingIncome - totalObligationsInRunway;
  const runwayDefaultRate = fullRunwayCushion / runwayHorizonDays;

  if (runwayDefaultRate < minSafeDailyRate) {
    minSafeDailyRate = runwayDefaultRate;
    if (!activeBottleneck && totalObligationsInRunway > 0) {
      const highestDue = duesInRunway[0];
      if (highestDue) {
        activeBottleneck = {
          title: highestDue.title,
          amount: highestDue.amount,
          daysUntilDue: highestDue.daysUntilDue,
          criticalRate: Math.max(0, Math.round(runwayDefaultRate * 100) / 100),
          dueDateFormatted: highestDue.dueDateFormatted,
        };
      }
    }
  }

  // Mark the bottleneck item in timeline
  if (activeBottleneck) {
    const match = upcomingTimeline.find(
      (o) => o.title === activeBottleneck?.title && o.daysUntilDue === activeBottleneck?.daysUntilDue
    );
    if (match) match.isBottleneck = true;
  }

  // Safe daily spend target
  let dailyTargetToday = Math.max(0, minSafeDailyRate);
  if (config.emergencyBufferPercent > 0 && dailyTargetToday > 0) {
    dailyTargetToday = dailyTargetToday * (1 - config.emergencyBufferPercent / 100);
  }
  dailyTargetToday = Math.round(dailyTargetToday * 100) / 100;

  // Non-due spending logged today
  const spentToday = transactions
    .filter((tx) => tx.date === todayStr && tx.type === 'expense' && !tx.isMonthlyDue)
    .reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);

  const remainingSafeToday = Math.round((dailyTargetToday - spentToday) * 100) / 100;
  const isOverspentToday = remainingSafeToday < 0;
  const overspentAmount = isOverspentToday ? Math.abs(remainingSafeToday) : 0;
  const safeLeftToday = Math.max(0, remainingSafeToday);

  const percentUsedToday =
    dailyTargetToday > 0
      ? Math.min(100, Math.round((spentToday / dailyTargetToday) * 100))
      : spentToday > 0
      ? 100
      : 0;

  const netRunwayPool = Math.max(0, Math.round(fullRunwayCushion * 100) / 100);

  return {
    date: todayStr,
    runwayDays: runwayHorizonDays,

    // Triad: Have, Earned, Will Earn
    totalLiquidFunds,
    wallets: {
      cashInHand,
      accountBalance,
    },
    earnedRecent,
    shiftsCompleted,
    projectedRemainingIncome,
    shiftsRemaining,
    expectedWagePerShift: wagePerShift,
    shiftsPerWeek,

    // Dynamic Runway & Bottleneck
    upcomingTimeline,
    activeBottleneck,

    // Daily Targets
    dailyTargetToday,
    safeSpendToday: dailyTargetToday,
    spentToday,
    remainingSafeToday,
    safeLeftToday,
    isOverspentToday,
    overspentAmount,
    percentUsedToday,

    // Obligations
    totalObligationsInRunway,
    totalObligationsLocked,
    pendingDuesCount,
    pendingDuesTotal,
    pendingDuesList,
    pendingTabsCount,
    pendingTabsTotal,
    pendingTabsList,
    netRunwayPool,
    netWeeklySafePool: netRunwayPool,

    // Backward-compatibility properties
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
    earnedThisWeek: earnedRecent,
    remainingExpectedIncome: projectedRemainingIncome,
    shiftsCompletedThisWeek: shiftsCompleted,
    shiftsRemainingThisWeek: shiftsRemaining,
    plannedWorkShiftsThisWeek: shiftsPerWeek,
    remainingToday: safeLeftToday,
    totalAllowanceToday: dailyTargetToday,
    totalIncomeToday: earnedRecent,
    percentUsed: percentUsedToday,
    isRestDay: false,
    incomeCountToday: 0,
    workFactor: config.workFactor || 0.85,
    carriedRollover: 0,
    dailyDueHoldback: 0,
    effectiveIncomeToday: earnedRecent,
    nextDue: pendingDuesList[0] || null,
    incomeList: [],
  };
}

export function computeWeeklySafeSpendState(
  wallets: WalletBalances,
  dues: MonthlyDue[] = [],
  tabs: TabItem[] = [],
  transactions: Transaction[] = [],
  config: DynamicSafeSpendConfig = getSafeSpendConfig(),
  currentDate: Date = new Date()
): DynamicSafeSpendState {
  return computeDynamicSafeSpendState(wallets, dues, tabs, transactions, config, currentDate);
}

export function computeEarnFirstState(
  transactions: Transaction[] = [],
  dues: MonthlyDue[] = [],
  config: any = getSafeSpendConfig(),
  wallets?: WalletBalances,
  tabs?: TabItem[]
): DynamicSafeSpendState {
  const fallbackWallets: WalletBalances = wallets || {
    cashInHand: 0,
    accountBalance: 0,
    lastUpdated: Date.now(),
  };
  return computeDynamicSafeSpendState(fallbackWallets, dues, tabs || [], transactions, config);
}

export function toggleRestDay(date: string): boolean {
  return false;
}
