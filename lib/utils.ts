import {
  Transaction,
  FinancialStats,
  CategoryBreakdownItem,
  CashflowPoint,
  DailySummary,
  BudgetConfig,
  MonthlyDue,
  MonthlyDueReminder,
  TimeframeSpendingPoint,
  PaymentMethodBreakdown,
  TimeOfDayBreakdown,
  PaymentMethod,
} from './types';

// Strictly locked to Indian Rupee (₹)
export const CURRENCY_SYMBOL = '₹';

export function formatCurrency(amount: number): string {
  const isNeg = amount < 0;
  const abs = Math.abs(amount);
  // Format to Indian numbering system (e.g. 1,00,000)
  const formatted = abs.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${isNeg ? '-' : ''}₹${formatted}`;
}

export function formatCompactCurrency(amount: number): string {
  const abs = Math.abs(amount);
  const isNeg = amount < 0;
  let formatted = '';

  if (abs >= 10000000) {
    formatted = `${(abs / 10000000).toFixed(2)} Cr`;
  } else if (abs >= 100000) {
    formatted = `${(abs / 100000).toFixed(1)} L`;
  } else if (abs >= 1000) {
    formatted = `${(abs / 1000).toFixed(1)}k`;
  } else {
    formatted = abs.toFixed(0);
  }

  return `${isNeg ? '-' : ''}₹${formatted}`;
}

export function getLocalDateString(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getExactRealTime(): { date: string; time: string; timestamp: string } {
  const now = new Date();
  const date = getLocalDateString(now);
  const time = now.toTimeString().split(' ')[0]; // HH:mm:ss
  const timestamp = now.toISOString();
  return { date, time, timestamp };
}

export function formatDateLabel(dateStr: string): string {
  const today = new Date().toISOString().split('T')[0];
  const yest = new Date();
  yest.setDate(yest.getDate() - 1);
  const yestStr = yest.toISOString().split('T')[0];

  if (dateStr === today) return 'Today';
  if (dateStr === yestStr) return 'Yesterday';

  const [y, m, d] = dateStr.split('-');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[parseInt(m, 10) - 1]} ${parseInt(d, 10)}, ${y}`;
}

// Monthly Dues Real-Time Reminder Calculator
export function calculateMonthlyDueReminders(dues: MonthlyDue[]): MonthlyDueReminder[] {
  const now = new Date();
  const currentDay = now.getDate();
  const currentMonthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  return dues.map((due) => {
    // Check if paid in current month
    const isPaidThisMonth = due.status === 'paid' && due.lastPaidDate?.startsWith(currentMonthYear) === true;

    if (isPaidThisMonth) {
      return {
        due,
        daysRemaining: 0,
        isOverdue: false,
        isDueToday: false,
        isPaidThisMonth: true,
        statusText: `Paid on ${due.lastPaidDate}`,
      };
    }

    const dayDiff = due.dueDayOfMonth - currentDay;

    if (dayDiff < 0) {
      // Past due date in current month and not paid
      return {
        due,
        daysRemaining: dayDiff,
        isOverdue: true,
        isDueToday: false,
        isPaidThisMonth: false,
        statusText: `Overdue by ${Math.abs(dayDiff)} day${Math.abs(dayDiff) > 1 ? 's' : ''}`,
      };
    } else if (dayDiff === 0) {
      return {
        due,
        daysRemaining: 0,
        isOverdue: false,
        isDueToday: true,
        isPaidThisMonth: false,
        statusText: 'Due Today!',
      };
    } else {
      return {
        due,
        daysRemaining: dayDiff,
        isOverdue: false,
        isDueToday: false,
        isPaidThisMonth: false,
        statusText: `Due in ${dayDiff} day${dayDiff > 1 ? 's' : ''} (${due.dueDayOfMonth}th)`,
      };
    }
  }).sort((a, b) => {
    // Sort: Overdue first, then Due Today, then upcoming, then Paid
    if (a.isOverdue && !b.isOverdue) return -1;
    if (!a.isOverdue && b.isOverdue) return 1;
    if (a.isDueToday && !b.isDueToday) return -1;
    if (!a.isDueToday && b.isDueToday) return 1;
    if (a.isPaidThisMonth && !b.isPaidThisMonth) return 1;
    if (!a.isPaidThisMonth && b.isPaidThisMonth) return -1;
    return a.daysRemaining - b.daysRemaining;
  });
}

// Helper: identifies whether a transaction counts as day-to-day spending (excluding monthly dues)
export function isDailyExpense(tx: Transaction): boolean {
  if (tx.type !== 'expense') return false;
  if (tx.isMonthlyDue) return false;
  if (tx.description && tx.description.toLowerCase().startsWith('monthly due:')) return false;
  return true;
}

export function calculateDailySummary(transactions: Transaction[], budget: BudgetConfig): DailySummary {
  const today = new Date().toISOString().split('T')[0];
  const todayTxs = transactions.filter((t) => t.date === today);

  // 1. Today's daily spending (excluding fixed monthly dues)
  const spentToday = todayTxs
    .filter(isDailyExpense)
    .reduce((sum, t) => sum + t.amount, 0);

  const earnedToday = todayTxs
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const baseAllowance = budget.dailyAllowance;

  // 2. Pre-compute past daily expenses (excluding monthly dues)
  const pastDailyExpenses: Record<string, number> = {};
  transactions
    .filter((t) => isDailyExpense(t) && t.date < today)
    .forEach((tx) => {
      pastDailyExpenses[tx.date] = (pastDailyExpenses[tx.date] || 0) + tx.amount;
    });

  // 3. Net Accumulated Rollover:
  // Tracks net savings (surplus) or net overspend (deficit) across past days.
  // Overspending on any day creates a deficit that deducts from subsequent days.
  // Underspending compensates and pays off the deficit!
  let netRollover = 0;
  if (transactions.length > 0 && baseAllowance > 0) {
    const pastExpenseDates = Object.keys(pastDailyExpenses).sort();
    if (pastExpenseDates.length > 0) {
      const earliestDateStr = pastExpenseDates[0];
      const cursor = new Date(earliestDateStr + 'T00:00:00');

      // Bounded lookback (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      thirtyDaysAgo.setHours(0, 0, 0, 0);
      if (cursor < thirtyDaysAgo) {
        cursor.setTime(thirtyDaysAgo.getTime());
      }

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);

      while (cursor <= yesterday) {
        const dStr = cursor.toISOString().split('T')[0];
        const spentOnDay = pastDailyExpenses[dStr] || 0;
        const netDaily = baseAllowance - spentOnDay;
        // Cumulative net rollover: adds savings, subtracts overspends
        netRollover += netDaily;
        cursor.setDate(cursor.getDate() + 1);
      }
    }
  }

  // Today's Compensated Allowance:
  // Base daily allowance + net rollover (which compensates for any overspent debt)
  const effectiveDailyAllowance = Math.max(0, baseAllowance + netRollover);
  const remaining = Math.max(0, effectiveDailyAllowance - spentToday);
  const percentUsed =
    effectiveDailyAllowance > 0
      ? Math.min(100, Math.round((spentToday / effectiveDailyAllowance) * 100))
      : spentToday > 0
      ? 100
      : 0;

  // 4. Weekly Metrics (Strict Monday to Sunday cycle)
  const now = new Date();
  const rawDay = now.getDay();
  const dayOfWeekIndex = rawDay === 0 ? 7 : rawDay; // Mon=1, Sun=7
  const monday = new Date(now);
  monday.setDate(now.getDate() - (dayOfWeekIndex - 1));
  monday.setHours(0, 0, 0, 0);
  const mondayStr = getLocalDateString(monday);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const sundayStr = getLocalDateString(sunday);

  const thisWeekTxs = transactions.filter(
    (t) => isDailyExpense(t) && t.date >= mondayStr && t.date <= sundayStr
  );
  const weeklySpent = thisWeekTxs.reduce((sum, t) => sum + t.amount, 0);
  const daysInWeekSoFar = dayOfWeekIndex; // 1 on Monday through 7 on Sunday
  const weeklyTarget = daysInWeekSoFar * baseAllowance;
  const weeklyVariance = weeklyTarget - weeklySpent;

  // 5. Monthly Daily Metrics (Day 1 of current month to Today)
  const currentDayOfMonth = now.getDate();
  const firstOfMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const thisMonthDailyTxs = transactions.filter(
    (t) => isDailyExpense(t) && t.date >= firstOfMonthStr && t.date <= today
  );
  const monthlyDailySpent = thisMonthDailyTxs.reduce((sum, t) => sum + t.amount, 0);
  const monthlyDailyTarget = currentDayOfMonth * baseAllowance;
  const monthlyDailyVariance = monthlyDailyTarget - monthlyDailySpent;

  return {
    date: today,
    spentToday,
    earnedToday,
    remainingAllowance: remaining,
    dailyAllowance: effectiveDailyAllowance,
    baseAllowance,
    carriedForward: netRollover,
    isDeficit: netRollover < 0,
    deficitAmount: Math.abs(Math.min(0, netRollover)),
    weeklySpent,
    weeklyTarget,
    weeklyVariance,
    monthlyDailySpent,
    monthlyDailyTarget,
    monthlyDailyVariance,
    percentUsed,
    isOverBudget: spentToday > effectiveDailyAllowance,
  };
}

export function calculateFinancialStats(transactions: Transaction[]): FinancialStats {
  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  let totalIncome = 0;
  let totalExpense = 0;
  let monthIncome = 0;
  let monthExpense = 0;

  transactions.forEach((tx) => {
    if (tx.type === 'income') {
      totalIncome += tx.amount;
      if (tx.date.startsWith(currentMonthStr)) {
        monthIncome += tx.amount;
      }
    } else {
      totalExpense += tx.amount;
      if (tx.date.startsWith(currentMonthStr)) {
        monthExpense += tx.amount;
      }
    }
  });

  const totalBalance = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? Math.max(0, Math.round(((totalIncome - totalExpense) / totalIncome) * 100)) : 0;
  const monthSavings = monthIncome - monthExpense;

  return {
    totalBalance,
    totalIncome,
    totalExpense,
    savingsRate,
    monthIncome,
    monthExpense,
    monthSavings,
  };
}

export function calculateCategoryBreakdown(transactions: Transaction[], type: 'expense' | 'income' = 'expense'): CategoryBreakdownItem[] {
  const filtered = transactions.filter((t) => t.type === type);
  const total = filtered.reduce((sum, t) => sum + t.amount, 0);

  const map = new Map<string, { amount: number; count: number }>();
  filtered.forEach((tx) => {
    const existing = map.get(tx.category) || { amount: 0, count: 0 };
    map.set(tx.category, {
      amount: existing.amount + tx.amount,
      count: existing.count + 1,
    });
  });

  const list: CategoryBreakdownItem[] = [];
  map.forEach((value, key) => {
    list.push({
      category: key,
      amount: value.amount,
      count: value.count,
      percentage: total > 0 ? Math.round((value.amount / total) * 100) : 0,
      type,
    });
  });

  return list.sort((a, b) => b.amount - a.amount);
}

export function calculateRecentCashflow(transactions: Transaction[], days = 7): CashflowPoint[] {
  const points: CashflowPoint[] = [];

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const dayName = d.toLocaleDateString('en-IN', { weekday: 'short' });

    const dayTxs = transactions.filter((t) => t.date === dateStr);
    const income = dayTxs.filter((t) => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const expense = dayTxs.filter((t) => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

    points.push({
      date: dateStr,
      label: i === 0 ? 'Today' : dayName,
      income,
      expense,
      net: income - expense,
    });
  }

  return points;
}

// Analytics: Daily Breakdown (last 14 days)
export function calculateDailyAnalytics(transactions: Transaction[], days = 14): { points: TimeframeSpendingPoint[]; average: number; maxDay: string; maxAmount: number } {
  const points: TimeframeSpendingPoint[] = [];
  let totalExpense = 0;
  let maxAmount = 0;
  let maxDay = '';

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const label = `${d.getDate()} ${d.toLocaleDateString('en-IN', { month: 'short' })}`;

    const dayTxs = transactions.filter((t) => t.date === dateStr);
    const expense = dayTxs.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const income = dayTxs.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);

    totalExpense += expense;
    if (expense > maxAmount) {
      maxAmount = expense;
      maxDay = label;
    }

    points.push({
      label,
      period: dateStr,
      expense,
      income,
      net: income - expense,
    });
  }

  const average = days > 0 ? Math.round(totalExpense / days) : 0;
  return { points, average, maxDay, maxAmount };
}

// Analytics: Weekly Breakdown (last 6 Monday-to-Sunday calendar weeks)
export function calculateWeeklyAnalytics(transactions: Transaction[], weeks = 6): { points: TimeframeSpendingPoint[]; average: number } {
  const points: TimeframeSpendingPoint[] = [];
  let totalExpense = 0;

  const now = new Date();
  const rawDay = now.getDay();
  const dayOfWeekIndex = rawDay === 0 ? 7 : rawDay;
  const thisMonday = new Date(now);
  thisMonday.setDate(now.getDate() - (dayOfWeekIndex - 1));
  thisMonday.setHours(0, 0, 0, 0);

  for (let w = weeks - 1; w >= 0; w--) {
    const start = new Date(thisMonday);
    start.setDate(thisMonday.getDate() - w * 7);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);

    const startStr = getLocalDateString(start);
    const endStr = getLocalDateString(end);
    const label = w === 0 ? 'This Week (Mon–Sun)' : `W-${w}`;

    const weekTxs = transactions.filter((t) => t.date >= startStr && t.date <= endStr);
    const expense = weekTxs.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const income = weekTxs.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);

    totalExpense += expense;
    points.push({
      label,
      period: `${start.getDate()} ${start.toLocaleDateString('en-IN', { month: 'short' })} (Mon) - ${end.getDate()} ${end.toLocaleDateString('en-IN', { month: 'short' })} (Sun)`,
      expense,
      income,
      net: income - expense,
    });
  }

  const average = weeks > 0 ? Math.round(totalExpense / weeks) : 0;
  return { points, average };
}

// Analytics: Monthly Breakdown (last 6 months)
export function calculateMonthlyAnalytics(transactions: Transaction[], months = 6): { points: TimeframeSpendingPoint[]; average: number } {
  const points: TimeframeSpendingPoint[] = [];
  let totalExpense = 0;

  for (let m = months - 1; m >= 0; m--) {
    const d = new Date();
    d.setMonth(d.getMonth() - m);
    const yearMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });

    const monthTxs = transactions.filter((t) => t.date.startsWith(yearMonth));
    const expense = monthTxs.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const income = monthTxs.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);

    totalExpense += expense;
    points.push({
      label,
      period: yearMonth,
      expense,
      income,
      net: income - expense,
    });
  }

  const average = months > 0 ? Math.round(totalExpense / months) : 0;
  return { points, average };
}

// Payment Mode Intelligence: UPI vs Card vs Cash
export function calculatePaymentMethodStats(transactions: Transaction[]): PaymentMethodBreakdown[] {
  const expenses = transactions.filter((t) => t.type === 'expense');
  const total = expenses.reduce((s, t) => s + t.amount, 0);

  const methods: PaymentMethod[] = ['UPI / Bank', 'Card', 'Cash', 'Other'];
  return methods.map((method) => {
    const matching = expenses.filter((t) => t.paymentMethod === method);
    const amount = matching.reduce((s, t) => s + t.amount, 0);
    return {
      method,
      amount,
      count: matching.length,
      percentage: total > 0 ? Math.round((amount / total) * 100) : 0,
    };
  }).filter((m) => m.count > 0 || m.method === 'UPI / Bank');
}

// Time-of-Day Insights based on exact transaction timestamps
export function calculateTimeOfDayStats(transactions: Transaction[]): TimeOfDayBreakdown[] {
  const expenses = transactions.filter((t) => t.type === 'expense');
  const total = expenses.reduce((s, t) => s + t.amount, 0);

  const groups: { [key in TimeOfDayBreakdown['period']]: { amount: number; count: number } } = {
    'Morning (6am-12pm)': { amount: 0, count: 0 },
    'Afternoon (12pm-5pm)': { amount: 0, count: 0 },
    'Evening (5pm-9pm)': { amount: 0, count: 0 },
    'Night (9pm-6am)': { amount: 0, count: 0 },
  };

  expenses.forEach((tx) => {
    const hour = tx.time ? parseInt(tx.time.split(':')[0], 10) : 12;

    if (hour >= 6 && hour < 12) {
      groups['Morning (6am-12pm)'].amount += tx.amount;
      groups['Morning (6am-12pm)'].count += 1;
    } else if (hour >= 12 && hour < 17) {
      groups['Afternoon (12pm-5pm)'].amount += tx.amount;
      groups['Afternoon (12pm-5pm)'].count += 1;
    } else if (hour >= 17 && hour < 21) {
      groups['Evening (5pm-9pm)'].amount += tx.amount;
      groups['Evening (5pm-9pm)'].count += 1;
    } else {
      groups['Night (9pm-6am)'].amount += tx.amount;
      groups['Night (9pm-6am)'].count += 1;
    }
  });

  return (Object.keys(groups) as TimeOfDayBreakdown['period'][]).map((period) => ({
    period,
    amount: groups[period].amount,
    count: groups[period].count,
    percentage: total > 0 ? Math.round((groups[period].amount / total) * 100) : 0,
  }));
}

export function exportTransactionsToCSV(transactions: Transaction[]): string {
  const headers = ['ID', 'Date', 'Time', 'Type', 'Category', 'Description', 'Amount (INR)', 'Payment Method', 'Notes'];
  const rows = transactions.map((t) => [
    t.id,
    t.date,
    t.time || '',
    t.type,
    `"${(t.category || '').replace(/"/g, '""')}"`,
    `"${(t.description || '').replace(/"/g, '""')}"`,
    t.amount.toFixed(2),
    t.paymentMethod,
    `"${(t.notes || '').replace(/"/g, '""')}"`,
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

export function parseCSVToTransactions(csvText: string): Partial<Transaction>[] {
  const lines = csvText.trim().split('\n');
  if (lines.length <= 1) return [];

  const results: Partial<Transaction>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const parts = line.split(',').map((p) => p.replace(/^"|"$/g, '').trim());
    if (parts.length >= 7) {
      const type = parts[3]?.toLowerCase() === 'income' ? 'income' : 'expense';
      const amount = parseFloat(parts[6]) || 0;
      if (amount > 0) {
        results.push({
          id: parts[0] || `tx-imp-${Date.now()}-${i}`,
          date: parts[1] || new Date().toISOString().split('T')[0],
          time: parts[2] || '12:00:00',
          type,
          category: parts[4] || 'Miscellaneous',
          description: parts[5] || 'Imported Transaction',
          amount,
          paymentMethod: (parts[7] as any) || 'UPI / Bank',
          notes: parts[8] || '',
          createdAt: Date.now(),
        });
      }
    }
  }

  return results;
}
