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

export function getExactRealTime(): { date: string; time: string; timestamp: string } {
  const now = new Date();
  const date = now.toISOString().split('T')[0];
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

export function calculateDailySummary(transactions: Transaction[], budget: BudgetConfig): DailySummary {
  const today = new Date().toISOString().split('T')[0];
  const todayTxs = transactions.filter((t) => t.date === today);

  const spentToday = todayTxs
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const earnedToday = todayTxs
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const baseAllowance = budget.dailyAllowance;

  // Calculate accumulated unspent daily budget carried forward from previous days
  // (Applies strictly to daily budget, accumulating day-by-day unspent allowance)
  let carriedForward = 0;

  if (transactions.length > 0 && baseAllowance > 0) {
    const pastExpenseTxs = transactions.filter((t) => t.date < today);

    if (pastExpenseTxs.length > 0) {
      const sortedDates = pastExpenseTxs.map((t) => t.date).sort();
      const earliestDateStr = sortedDates[0];

      // Pre-compute daily expenses
      const dailyExpenses: Record<string, number> = {};
      pastExpenseTxs.forEach((tx) => {
        if (tx.type === 'expense') {
          dailyExpenses[tx.date] = (dailyExpenses[tx.date] || 0) + tx.amount;
        }
      });

      // Bounded lookback from earliest transaction up to yesterday (max 30 days)
      const cursor = new Date(earliestDateStr + 'T00:00:00');
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      thirtyDaysAgo.setHours(0, 0, 0, 0);
      if (cursor < thirtyDaysAgo) {
        cursor.setTime(thirtyDaysAgo.getTime());
      }

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);

      let accumulated = 0;
      while (cursor <= yesterday) {
        const dStr = cursor.toISOString().split('T')[0];
        const spentOnDay = dailyExpenses[dStr] || 0;
        const netDaily = baseAllowance - spentOnDay;
        // Unspent adds to accumulated savings; overspending draws from accumulated savings
        accumulated = Math.max(0, accumulated + netDaily);

        cursor.setDate(cursor.getDate() + 1);
      }

      carriedForward = accumulated;
    }
  }

  const effectiveDailyAllowance = baseAllowance + carriedForward;
  const remaining = Math.max(0, effectiveDailyAllowance - spentToday);
  const percentUsed =
    effectiveDailyAllowance > 0
      ? Math.min(100, Math.round((spentToday / effectiveDailyAllowance) * 100))
      : 0;

  return {
    date: today,
    spentToday,
    earnedToday,
    remainingAllowance: remaining,
    dailyAllowance: effectiveDailyAllowance,
    baseAllowance,
    carriedForward,
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

// Analytics: Weekly Breakdown (last 6 calendar weeks)
export function calculateWeeklyAnalytics(transactions: Transaction[], weeks = 6): { points: TimeframeSpendingPoint[]; average: number } {
  const points: TimeframeSpendingPoint[] = [];
  let totalExpense = 0;

  for (let w = weeks - 1; w >= 0; w--) {
    const end = new Date();
    end.setDate(end.getDate() - w * 7);
    const start = new Date(end);
    start.setDate(start.getDate() - 6);

    const startStr = start.toISOString().split('T')[0];
    const endStr = end.toISOString().split('T')[0];
    const label = w === 0 ? 'This Week' : `W-${w}`;

    const weekTxs = transactions.filter((t) => t.date >= startStr && t.date <= endStr);
    const expense = weekTxs.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const income = weekTxs.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);

    totalExpense += expense;
    points.push({
      label,
      period: `${start.getDate()} ${start.toLocaleDateString('en-IN', { month: 'short' })} - ${end.getDate()} ${end.toLocaleDateString('en-IN', { month: 'short' })}`,
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
