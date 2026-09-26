'use client';

import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import {
  Transaction,
  TimeframeSpendingPoint,
  WalletBalances,
  MonthlyDue,
  TabItem,
} from '@/lib/types';
import {
  formatCurrency,
  calculateDailyAnalytics,
  calculateWeeklyAnalytics,
  calculateMonthlyAnalytics,
  calculateCategoryBreakdown,
  calculatePaymentMethodStats,
  calculateTimeOfDayStats,
  calculateFinancialStats,
} from '@/lib/utils';
import {
  BarChart3,
  PieChart,
  CreditCard,
  Clock,
  Sparkles,
  FileText,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  AlertCircle,
  Coins,
  Users,
  Calendar,
  Layers,
  ArrowRight,
} from 'lucide-react';

interface AnalyticsViewProps {
  transactions: Transaction[];
  wallets?: WalletBalances;
  dues?: MonthlyDue[];
  tabs?: TabItem[];
  onOpenStatement?: () => void;
  onNavigateToTabs?: () => void;
}

export default function AnalyticsView({
  transactions,
  wallets,
  dues = [],
  tabs = [],
  onOpenStatement,
  onNavigateToTabs,
}: AnalyticsViewProps) {
  const [timeframe, setTimeframe] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [categoryType, setCategoryType] = useState<'expense' | 'income'>('expense');
  const [hoveredPoint, setHoveredPoint] = useState<TimeframeSpendingPoint | null>(null);

  // Financial overview stats
  const financialStats = useMemo(() => calculateFinancialStats(transactions), [transactions]);

  // Timeframe-specific data
  const dailyData = useMemo(() => calculateDailyAnalytics(transactions, 14), [transactions]);
  const weeklyData = useMemo(() => calculateWeeklyAnalytics(transactions, 6), [transactions]);
  const monthlyData = useMemo(() => calculateMonthlyAnalytics(transactions, 6), [transactions]);

  // Category and payment distributions
  const categories = useMemo(
    () => calculateCategoryBreakdown(transactions, categoryType),
    [transactions, categoryType]
  );
  const paymentStats = useMemo(() => calculatePaymentMethodStats(transactions), [transactions]);
  const timeOfDayStats = useMemo(() => calculateTimeOfDayStats(transactions), [transactions]);

  const currentChartData = useMemo(() => {
    if (timeframe === 'daily') return dailyData.points;
    if (timeframe === 'weekly') return weeklyData.points;
    return monthlyData.points;
  }, [timeframe, dailyData, weeklyData, monthlyData]);

  const maxExpense = Math.max(
    ...currentChartData.map((p) => Math.max(p.expense, p.income)),
    500
  );

  const activePoint = hoveredPoint || currentChartData[currentChartData.length - 1];

  // =========================================================================
  // MODULE 1: Forward-Looking Runway Radar (7, 14, 30 Days Forecast)
  // =========================================================================
  const runwayRadar = useMemo(() => {
    const currentLiquid = (wallets?.cashInHand || 0) + (wallets?.accountBalance || 0);
    const today = new Date();
    const currentDay = today.getDate();

    // Helper to calculate dues within N days
    const calculateDuesInDays = (days: number) => {
      let total = 0;
      dues.forEach((due) => {
        if (due.status !== 'paid') {
          // Calculate distance to dueDayOfMonth
          let diff = due.dueDayOfMonth - currentDay;
          if (diff < 0) diff += 30; // wraps around to next month
          if (diff <= days) {
            total += due.amount;
          }
        }
      });
      return total;
    };

    // Pending tabs owed to you
    const pendingOwedToYou = tabs
      .filter((t) => t.status === 'pending' && t.type === 'owed_to_you')
      .reduce((sum, t) => sum + t.amount, 0);

    // Pending tabs you owe
    const pendingYouOwe = tabs
      .filter((t) => t.status === 'pending' && t.type === 'you_owe')
      .reduce((sum, t) => sum + t.amount, 0);

    const dues7 = calculateDuesInDays(7);
    const dues14 = calculateDuesInDays(14);
    const dues30 = calculateDuesInDays(30);

    const projected7 = currentLiquid - dues7 - pendingYouOwe + pendingOwedToYou;
    const projected14 = currentLiquid - dues14 - pendingYouOwe + pendingOwedToYou;
    const projected30 = currentLiquid - dues30 - pendingYouOwe + pendingOwedToYou;

    const isSafe7 = projected7 > 0;
    const isSafe14 = projected14 > 0;
    const isSafe30 = projected30 > 0;

    return {
      currentLiquid,
      dues7,
      dues14,
      dues30,
      projected7,
      projected14,
      projected30,
      isSafe7,
      isSafe14,
      isSafe30,
    };
  }, [wallets, dues, tabs]);

  // =========================================================================
  // MODULE 2: Micro-Spends vs. Major Outflows ("The Micro-Leak Factor")
  // =========================================================================
  const spendTiers = useMemo(() => {
    let microTotal = 0;
    let microCount = 0;
    let mediumTotal = 0;
    let mediumCount = 0;
    let majorTotal = 0;
    let majorCount = 0;

    transactions.forEach((tx) => {
      if (tx.type === 'expense') {
        if (tx.amount < 100) {
          microTotal += tx.amount;
          microCount += 1;
        } else if (tx.amount <= 1500) {
          mediumTotal += tx.amount;
          mediumCount += 1;
        } else {
          majorTotal += tx.amount;
          majorCount += 1;
        }
      }
    });

    const totalExp = microTotal + mediumTotal + majorTotal || 1;
    return {
      micro: {
        total: microTotal,
        count: microCount,
        pct: Math.round((microTotal / totalExp) * 100),
      },
      medium: {
        total: mediumTotal,
        count: mediumCount,
        pct: Math.round((mediumTotal / totalExp) * 100),
      },
      major: {
        total: majorTotal,
        count: majorCount,
        pct: Math.round((majorTotal / totalExp) * 100),
      },
    };
  }, [transactions]);

  // =========================================================================
  // MODULE 3: Counterparty & Tab Debt Network (Social Finance Matrix)
  // =========================================================================
  const counterpartyMatrix = useMemo(() => {
    const peopleMap = new Map<string, { owedToYou: number; youOwe: number }>();

    tabs.forEach((tab) => {
      if (tab.status === 'pending') {
        const current = peopleMap.get(tab.personName) || { owedToYou: 0, youOwe: 0 };
        if (tab.type === 'owed_to_you') {
          current.owedToYou += tab.amount;
        } else {
          current.youOwe += tab.amount;
        }
        peopleMap.set(tab.personName, current);
      }
    });

    const list = Array.from(peopleMap.entries()).map(([person, data]) => ({
      person,
      owedToYou: data.owedToYou,
      youOwe: data.youOwe,
      net: data.owedToYou - data.youOwe,
    }));

    const totalReceivable = list.reduce((acc, p) => acc + p.owedToYou, 0);
    const totalPayable = list.reduce((acc, p) => acc + p.youOwe, 0);

    return {
      list: list.sort((a, b) => Math.abs(b.net) - Math.abs(a.net)).slice(0, 4),
      totalReceivable,
      totalPayable,
      netSocial: totalReceivable - totalPayable,
    };
  }, [tabs]);

  // =========================================================================
  // MODULE 4: Weekday vs. Weekend Spending Divergence
  // =========================================================================
  const weekdayWeekendDivergence = useMemo(() => {
    let weekdayTotal = 0;
    let weekdayCount = 0;
    let weekendTotal = 0;
    let weekendCount = 0;

    transactions.forEach((tx) => {
      if (tx.type === 'expense' && tx.date) {
        const dateObj = new Date(tx.date);
        const day = dateObj.getDay(); // 0 = Sun, 6 = Sat
        if (day === 0 || day === 6) {
          weekendTotal += tx.amount;
          weekendCount += 1;
        } else {
          weekdayTotal += tx.amount;
          weekdayCount += 1;
        }
      }
    });

    const weekdayAvg = weekdayCount > 0 ? Math.round(weekdayTotal / Math.max(weekdayCount, 1)) : 0;
    const weekendAvg = weekendCount > 0 ? Math.round(weekendTotal / Math.max(weekendCount, 1)) : 0;
    const diffPct =
      weekdayAvg > 0 ? Math.round(((weekendAvg - weekdayAvg) / weekdayAvg) * 100) : 0;

    return {
      weekdayTotal,
      weekdayAvg,
      weekendTotal,
      weekendAvg,
      diffPct,
      isWeekendHeavier: weekendAvg > weekdayAvg,
    };
  }, [transactions]);

  // =========================================================================
  // MODULE 5: AI Executive Financial Brief (Knowledge Graph Grounded)
  // =========================================================================
  const executiveBrief = useMemo(() => {
    const points: string[] = [];

    // Point 1: Inflow vs Outflow health
    if (financialStats.totalIncome > 0 || financialStats.totalExpense > 0) {
      if (financialStats.totalIncome >= financialStats.totalExpense) {
        points.push(
          `Healthy positive cashflow: Total inflows (${formatCurrency(
            financialStats.totalIncome
          )}) comfortably exceed outflows (${formatCurrency(financialStats.totalExpense)}).`
        );
      } else {
        points.push(
          `Cash deficit alert: Outflows (${formatCurrency(
            financialStats.totalExpense
          )}) outpace total recognized inflows (${formatCurrency(financialStats.totalIncome)}).`
        );
      }
    }

    // Point 2: Top expense concentration
    const expenseCategories = calculateCategoryBreakdown(transactions, 'expense');
    if (expenseCategories.length > 0) {
      const top = expenseCategories[0];
      points.push(
        `Major capital allocation in "${top.category}", absorbing ${top.percentage}% (${formatCurrency(
          top.amount
        )}) of lifetime recorded spend.`
      );
    }

    // Point 3: Liquidity runway status
    if (runwayRadar.currentLiquid > 0) {
      points.push(
        `30-day projected liquid runway stands at ${formatCurrency(
          runwayRadar.projected30
        )} factoring upcoming recurring dues (${formatCurrency(runwayRadar.dues30)}).`
      );
    } else {
      points.push(
        `Record and balance your liquid wallets to unlock precision forward cashflow simulations.`
      );
    }

    return points;
  }, [financialStats, transactions, runwayRadar]);

  return (
    <div className="space-y-5 sm:space-y-6 w-full max-w-full overflow-hidden">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-black shrink-0" />
            <h2 className="text-base sm:text-lg font-bold text-zinc-950 tracking-tight">
              Financial Intelligence
            </h2>
          </div>
          <p className="text-xs text-zinc-500 mt-0.5">
            Forward runway radar, micro-leak breakdown &amp; structural cashflow
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onOpenStatement && (
            <motion.button
              type="button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.96 }}
              onClick={onOpenStatement}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-black hover:bg-zinc-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors shrink-0 cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Statement PDF</span>
            </motion.button>
          )}

          {/* Timeframe Selector with Animated Sliding Pill */}
          <div className="relative flex p-1 bg-zinc-100 rounded-xl border border-zinc-200 text-xs font-semibold w-full sm:w-auto">
            {(['daily', 'weekly', 'monthly'] as const).map((tf) => {
              const isActive = timeframe === tf;
              return (
                <button
                  key={tf}
                  onClick={() => {
                    setTimeframe(tf);
                    setHoveredPoint(null);
                  }}
                  className={`relative z-10 flex-1 sm:flex-initial py-1.5 px-3 text-center capitalize transition-colors cursor-pointer ${
                    isActive ? 'text-white' : 'text-zinc-600 hover:text-black'
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="analyticsTimeframePill"
                      className="absolute inset-0 bg-black rounded-lg shadow-sm"
                      transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                    />
                  )}
                  <span className="relative z-10">{tf}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 2 Clean Hero Cards: Total Inflows & Total Outflows */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        {/* Total Inflows */}
        <motion.div
          whileHover={{ y: -2 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          className="bg-white rounded-2xl p-4 sm:p-5 border border-zinc-200 shadow-xs space-y-2"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-bold text-zinc-500 uppercase tracking-wider">
              Total Inflows
            </span>
            <div className="w-7 h-7 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
              <ArrowDownRight className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-zinc-950 truncate">
            {formatCurrency(financialStats.totalIncome)}
          </div>
          <div className="text-[11px] text-zinc-500 flex items-center gap-1.5 pt-1 border-t border-zinc-100">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>Cumulative income, earnings &amp; credit repayments</span>
          </div>
        </motion.div>

        {/* Total Outflows */}
        <motion.div
          whileHover={{ y: -2 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          className="bg-white rounded-2xl p-4 sm:p-5 border border-zinc-200 shadow-xs space-y-2"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-bold text-zinc-500 uppercase tracking-wider">
              Total Outflows
            </span>
            <div className="w-7 h-7 rounded-xl bg-zinc-100 border border-zinc-200 flex items-center justify-center text-zinc-800">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-zinc-950 truncate">
            {formatCurrency(financialStats.totalExpense)}
          </div>
          <div className="text-[11px] text-zinc-500 flex items-center gap-1.5 pt-1 border-t border-zinc-100">
            <TrendingDown className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
            <span>Cumulative expenditures across cash &amp; accounts</span>
          </div>
        </motion.div>
      </div>

      {/* MODULE 1: Forward-Looking Dynamic Runway Radar */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 border border-zinc-200 shadow-sm space-y-4 w-full max-w-full overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-zinc-100">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-black shrink-0" />
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-zinc-950">
                Forward Liquidity &amp; Due Runway Radar
              </h3>
              <p className="text-[11px] text-zinc-500">
                Projected cash buffers after scheduled dues &amp; loan repayments
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-zinc-500">Current Liquid:</span>
            <span className="text-xs font-mono font-bold text-black bg-zinc-100 px-2.5 py-1 rounded-lg border border-zinc-200">
              {formatCurrency(runwayRadar.currentLiquid)}
            </span>
          </div>
        </div>

        {/* 3 Forward Horizons: 7d, 14d, 30d */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* 7-Day Horizon */}
          <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-zinc-700">7-Day Horizon</span>
              <span
                className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                  runwayRadar.isSafe7
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {runwayRadar.isSafe7 ? 'Safe' : 'Tight'}
              </span>
            </div>
            <div className="text-base font-mono font-bold text-zinc-950">
              {formatCurrency(runwayRadar.projected7)}
            </div>
            <div className="text-[10px] text-zinc-500 flex justify-between font-mono">
              <span>Dues due:</span>
              <span>{formatCurrency(runwayRadar.dues7)}</span>
            </div>
          </div>

          {/* 14-Day Horizon */}
          <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-zinc-700">14-Day Horizon</span>
              <span
                className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                  runwayRadar.isSafe14
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {runwayRadar.isSafe14 ? 'Safe' : 'Tight'}
              </span>
            </div>
            <div className="text-base font-mono font-bold text-zinc-950">
              {formatCurrency(runwayRadar.projected14)}
            </div>
            <div className="text-[10px] text-zinc-500 flex justify-between font-mono">
              <span>Dues due:</span>
              <span>{formatCurrency(runwayRadar.dues14)}</span>
            </div>
          </div>

          {/* 30-Day Horizon */}
          <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-zinc-700">30-Day Horizon</span>
              <span
                className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                  runwayRadar.isSafe30
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {runwayRadar.isSafe30 ? 'Safe' : 'Tight'}
              </span>
            </div>
            <div className="text-base font-mono font-bold text-zinc-950">
              {formatCurrency(runwayRadar.projected30)}
            </div>
            <div className="text-[10px] text-zinc-500 flex justify-between font-mono">
              <span>Dues due:</span>
              <span>{formatCurrency(runwayRadar.dues30)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Expenditure Chart with Interactive Spring Bars & Hover Tooltip */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 border border-zinc-200 shadow-sm space-y-4 w-full max-w-full overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-zinc-100">
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-zinc-950 capitalize">
              {timeframe} Trajectory &amp; Cashflow
            </h3>
            <p className="text-[11px] text-zinc-500">
              Side-by-side comparison of expenses and inflows over time
            </p>
          </div>

          {/* Interactive Inspection Badge */}
          {activePoint && (
            <motion.div
              key={activePoint.label}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3 bg-zinc-50 px-3 py-1.5 rounded-xl border border-zinc-200 text-xs font-mono"
            >
              <span className="text-zinc-500 font-sans font-medium">{activePoint.label}:</span>
              <span className="text-zinc-950 font-bold">
                Exp: {formatCurrency(activePoint.expense)}
              </span>
              {activePoint.income > 0 && (
                <span className="text-emerald-700 font-bold">
                  Inc: +{formatCurrency(activePoint.income)}
                </span>
              )}
            </motion.div>
          )}
        </div>

        {/* Spring-Animated Bar Chart */}
        <div className="pt-4 pb-2">
          <div className="h-44 sm:h-56 flex items-end justify-between gap-1 sm:gap-2.5 border-b border-zinc-200 px-1">
            {currentChartData.map((pt, idx) => {
              const expPct = Math.min(100, Math.round((pt.expense / maxExpense) * 100));
              const incPct = Math.min(100, Math.round((pt.income / maxExpense) * 100));
              const isHovered = hoveredPoint?.label === pt.label;

              return (
                <div
                  key={pt.label}
                  onMouseEnter={() => setHoveredPoint(pt)}
                  onMouseLeave={() => setHoveredPoint(null)}
                  className={`flex-1 flex flex-col items-center gap-1.5 h-full justify-end group min-w-0 cursor-pointer transition-opacity ${
                    hoveredPoint && !isHovered ? 'opacity-40' : 'opacity-100'
                  }`}
                >
                  <div className="w-full flex items-end justify-center gap-1 h-36 sm:h-44">
                    {/* Income Bar */}
                    {pt.income > 0 && (
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: `${Math.max(incPct, 6)}%` }}
                        transition={{
                          type: 'spring',
                          stiffness: 280,
                          damping: 24,
                          delay: idx * 0.02,
                        }}
                        className="w-1/2 max-w-[12px] bg-zinc-300 group-hover:bg-zinc-400 rounded-t-sm transition-colors"
                      />
                    )}

                    {/* Expense Bar */}
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${Math.max(expPct, pt.expense > 0 ? 6 : 0)}%` }}
                      transition={{
                        type: 'spring',
                        stiffness: 280,
                        damping: 24,
                        delay: idx * 0.02,
                      }}
                      className={`w-1/2 max-w-[12px] rounded-t-sm transition-colors ${
                        isHovered ? 'bg-zinc-800' : 'bg-black'
                      }`}
                    />
                  </div>

                  <span
                    className={`text-[9px] sm:text-[10px] font-mono truncate w-full text-center ${
                      isHovered ? 'text-black font-bold' : 'text-zinc-500'
                    }`}
                  >
                    {pt.label.split(' ')[0]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Legend and Averages */}
        <div className="flex flex-wrap items-center justify-between text-[11px] font-mono text-zinc-500 pt-1 gap-2">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 bg-black rounded-xs" />
              <span className="text-zinc-700">Expense</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 bg-zinc-300 rounded-xs" />
              <span className="text-zinc-700">Income</span>
            </div>
          </div>

          <div className="text-right">
            {timeframe === 'daily' && (
              <span>
                14-Day Daily Avg:{' '}
                <strong className="text-black">{formatCurrency(dailyData.average)}</strong>
              </span>
            )}
            {timeframe === 'weekly' && (
              <span>
                6-Week Avg:{' '}
                <strong className="text-black">{formatCurrency(weeklyData.average)}</strong>
              </span>
            )}
            {timeframe === 'monthly' && (
              <span>
                6-Month Avg:{' '}
                <strong className="text-black">{formatCurrency(monthlyData.average)}</strong>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* MODULE 2 & 4: Micro-Leak Factor + Weekend Divergence */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* MODULE 2: The Micro-Leak Factor */}
        <div className="bg-white rounded-2xl p-4 sm:p-6 border border-zinc-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Coins className="w-4 h-4 text-black shrink-0" />
              <h3 className="text-xs sm:text-sm font-bold text-zinc-950">
                The Micro-Leak Factor
              </h3>
            </div>
            <span className="text-[10px] font-mono bg-zinc-100 px-2 py-0.5 rounded-md text-zinc-600">
              Expenditure Tiers
            </span>
          </div>

          <div className="space-y-3 pt-1">
            {/* Micro */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-zinc-800">
                  Micro Spends (&lt; ₹100)
                </span>
                <span className="font-mono text-zinc-900 font-bold">
                  {formatCurrency(spendTiers.micro.total)}{' '}
                  <span className="text-[10px] text-zinc-500 font-normal">
                    ({spendTiers.micro.count}x • {spendTiers.micro.pct}%)
                  </span>
                </span>
              </div>
              <div className="w-full h-2 bg-zinc-100 rounded-full overflow-hidden border border-zinc-200">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${spendTiers.micro.pct}%` }}
                  transition={{ duration: 0.6 }}
                  className="h-full bg-zinc-600 rounded-full"
                />
              </div>
              <span className="text-[10px] text-zinc-400">Chai, quick snacks, bus fares</span>
            </div>

            {/* Medium */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-zinc-800">
                  Routine Essentials (₹100–₹1,500)
                </span>
                <span className="font-mono text-zinc-900 font-bold">
                  {formatCurrency(spendTiers.medium.total)}{' '}
                  <span className="text-[10px] text-zinc-500 font-normal">
                    ({spendTiers.medium.count}x • {spendTiers.medium.pct}%)
                  </span>
                </span>
              </div>
              <div className="w-full h-2 bg-zinc-100 rounded-full overflow-hidden border border-zinc-200">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${spendTiers.medium.pct}%` }}
                  transition={{ duration: 0.6, delay: 0.1 }}
                  className="h-full bg-black rounded-full"
                />
              </div>
              <span className="text-[10px] text-zinc-400">Groceries, dining, fuel, medicine</span>
            </div>

            {/* Major */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-zinc-800">
                  Major Outflows (&gt; ₹1,500)
                </span>
                <span className="font-mono text-zinc-900 font-bold">
                  {formatCurrency(spendTiers.major.total)}{' '}
                  <span className="text-[10px] text-zinc-500 font-normal">
                    ({spendTiers.major.count}x • {spendTiers.major.pct}%)
                  </span>
                </span>
              </div>
              <div className="w-full h-2 bg-zinc-100 rounded-full overflow-hidden border border-zinc-200">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${spendTiers.major.pct}%` }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                  className="h-full bg-zinc-800 rounded-full"
                />
              </div>
              <span className="text-[10px] text-zinc-400">Rent, electronics, bulk purchases</span>
            </div>
          </div>
        </div>

        {/* MODULE 4: Weekday vs Weekend Spending Divergence */}
        <div className="bg-white rounded-2xl p-4 sm:p-6 border border-zinc-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-black shrink-0" />
              <h3 className="text-xs sm:text-sm font-bold text-zinc-950">
                Weekday vs. Weekend Divergence
              </h3>
            </div>
            <span
              className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                weekdayWeekendDivergence.isWeekendHeavier
                  ? 'bg-zinc-900 text-white'
                  : 'bg-zinc-100 text-zinc-800'
              }`}
            >
              {weekdayWeekendDivergence.diffPct > 0
                ? `+${weekdayWeekendDivergence.diffPct}% Weekend`
                : 'Balanced Pace'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 space-y-1">
              <span className="text-[11px] font-semibold text-zinc-600 block">Mon – Fri (Daily Avg)</span>
              <div className="text-base font-mono font-bold text-zinc-950">
                {formatCurrency(weekdayWeekendDivergence.weekdayAvg)}
              </div>
              <span className="text-[10px] text-zinc-400 block font-mono">
                Total: {formatCurrency(weekdayWeekendDivergence.weekdayTotal)}
              </span>
            </div>

            <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 space-y-1">
              <span className="text-[11px] font-semibold text-zinc-600 block">Sat – Sun (Daily Avg)</span>
              <div className="text-base font-mono font-bold text-zinc-950">
                {formatCurrency(weekdayWeekendDivergence.weekendAvg)}
              </div>
              <span className="text-[10px] text-zinc-400 block font-mono">
                Total: {formatCurrency(weekdayWeekendDivergence.weekendTotal)}
              </span>
            </div>
          </div>

          <p className="text-[11px] text-zinc-500 pt-1">
            {weekdayWeekendDivergence.isWeekendHeavier
              ? `You tend to spend ${weekdayWeekendDivergence.diffPct}% more per day on weekends due to leisure & dining.`
              : `Your weekend spending remains well-aligned with your weekday operational baseline.`}
          </p>
        </div>
      </div>

      {/* Grid: Category Distribution + Social Counterparty Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Category Breakdown (Expenses vs Inflows Toggle) */}
        <div className="bg-white rounded-2xl p-4 sm:p-6 border border-zinc-200 shadow-sm space-y-4 w-full max-w-full overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <PieChart className="w-4 h-4 text-black shrink-0" />
              <h3 className="text-xs sm:text-sm font-bold text-zinc-950">Category Distribution</h3>
            </div>

            {/* Expenses vs Inflow Toggle */}
            <div className="relative flex p-0.5 bg-zinc-100 rounded-lg border border-zinc-200 text-xs font-semibold">
              <button
                onClick={() => setCategoryType('expense')}
                className={`relative z-10 px-2.5 py-1 text-center transition-colors cursor-pointer ${
                  categoryType === 'expense' ? 'text-white' : 'text-zinc-600 hover:text-black'
                }`}
              >
                {categoryType === 'expense' && (
                  <motion.div
                    layoutId="categoryTypePill"
                    className="absolute inset-0 bg-black rounded-md shadow-xs"
                    transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                  />
                )}
                <span className="relative z-10">Outflows</span>
              </button>
              <button
                onClick={() => setCategoryType('income')}
                className={`relative z-10 px-2.5 py-1 text-center transition-colors cursor-pointer ${
                  categoryType === 'income' ? 'text-white' : 'text-zinc-600 hover:text-black'
                }`}
              >
                {categoryType === 'income' && (
                  <motion.div
                    layoutId="categoryTypePill"
                    className="absolute inset-0 bg-black rounded-md shadow-xs"
                    transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                  />
                )}
                <span className="relative z-10">Inflows</span>
              </button>
            </div>
          </div>

          <div className="space-y-3 pt-1">
            {categories.length === 0 ? (
              <p className="text-xs text-zinc-400 py-6 text-center">
                No transactions recorded for this category type yet.
              </p>
            ) : (
              categories.slice(0, 7).map((item, index) => (
                <div key={item.category} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs gap-2">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="w-5 h-5 rounded-md bg-zinc-100 border border-zinc-200 text-[10px] font-mono font-bold flex items-center justify-center shrink-0">
                        #{index + 1}
                      </span>
                      <span className="font-semibold text-zinc-900 truncate">{item.category}</span>
                      <span className="text-[10px] text-zinc-400">({item.count}x)</span>
                    </div>

                    <div className="flex items-center gap-2 font-mono shrink-0">
                      <span className="text-zinc-500">{item.percentage}%</span>
                      <span className="font-bold text-black">{formatCurrency(item.amount)}</span>
                    </div>
                  </div>

                  <div className="w-full h-2 bg-zinc-100 rounded-full overflow-hidden border border-zinc-200">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${item.percentage}%` }}
                      transition={{ duration: 0.6, ease: 'easeOut', delay: index * 0.04 }}
                      className="h-full bg-black rounded-full"
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* MODULE 3: Counterparty & Tab Debt Network */}
        <div className="bg-white rounded-2xl p-4 sm:p-6 border border-zinc-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-black shrink-0" />
              <h3 className="text-xs sm:text-sm font-bold text-zinc-950">
                Counterparty &amp; Tab Network
              </h3>
            </div>
            {onNavigateToTabs && (
              <button
                type="button"
                onClick={onNavigateToTabs}
                className="text-xs font-semibold text-zinc-600 hover:text-black flex items-center gap-1 cursor-pointer"
              >
                <span>View Tabs</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200">
              <span className="text-[10px] text-zinc-500 block uppercase font-mono">Receivables</span>
              <span className="text-sm font-mono font-bold text-emerald-700">
                +{formatCurrency(counterpartyMatrix.totalReceivable)}
              </span>
            </div>
            <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200">
              <span className="text-[10px] text-zinc-500 block uppercase font-mono">Payables</span>
              <span className="text-sm font-mono font-bold text-zinc-800">
                -{formatCurrency(counterpartyMatrix.totalPayable)}
              </span>
            </div>
          </div>

          <div className="space-y-2 pt-1">
            {counterpartyMatrix.list.length === 0 ? (
              <p className="text-xs text-zinc-400 py-4 text-center">
                All social tabs &amp; IOUs are settled. No pending counterparty debt.
              </p>
            ) : (
              counterpartyMatrix.list.map((c) => (
                <div
                  key={c.person}
                  className="flex items-center justify-between p-2.5 bg-zinc-50 rounded-xl border border-zinc-200 text-xs"
                >
                  <span className="font-semibold text-zinc-900">{c.person}</span>
                  <div className="text-right font-mono">
                    <span
                      className={`font-bold ${
                        c.net > 0 ? 'text-emerald-700' : c.net < 0 ? 'text-red-600' : 'text-zinc-600'
                      }`}
                    >
                      {c.net > 0 ? `+${formatCurrency(c.net)}` : formatCurrency(c.net)}
                    </span>
                    <span className="text-[10px] text-zinc-400 block">
                      {c.net > 0 ? 'owes you' : c.net < 0 ? 'you owe' : 'even'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Payment Modes & Peak Times */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Payment Mode Intelligence */}
        <div className="bg-white rounded-2xl p-4 sm:p-6 border border-zinc-200 shadow-sm space-y-3.5 w-full max-w-full overflow-hidden">
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-black shrink-0" />
            <h3 className="text-xs sm:text-sm font-bold text-zinc-950">
              Payment Method Intelligence
            </h3>
          </div>

          <div className="w-full h-3 bg-zinc-100 rounded-full overflow-hidden flex border border-zinc-200">
            {paymentStats.map((item, idx) => {
              const colors = ['bg-black', 'bg-zinc-600', 'bg-zinc-400', 'bg-zinc-300'];
              return (
                <motion.div
                  key={item.method}
                  initial={{ width: 0 }}
                  animate={{ width: `${item.percentage}%` }}
                  transition={{ duration: 0.7, ease: 'easeOut', delay: idx * 0.05 }}
                  className={`h-full ${colors[idx % colors.length]}`}
                  title={`${item.method}: ${item.percentage}%`}
                />
              );
            })}
          </div>

          <div className="grid grid-cols-3 gap-2 pt-1">
            {paymentStats.map((item) => (
              <div
                key={item.method}
                className="p-2.5 sm:p-3 bg-zinc-50 rounded-xl border border-zinc-200 space-y-0.5 text-center sm:text-left min-w-0"
              >
                <span className="text-[10px] sm:text-[11px] font-medium text-zinc-500 block truncate">
                  {item.method.split(' ')[0]}
                </span>
                <div className="text-xs sm:text-sm font-mono font-bold text-black truncate">
                  {formatCurrency(item.amount)}
                </div>
                <span className="text-[10px] font-mono text-zinc-400 block truncate">
                  {item.percentage}%
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Peak Spending Time */}
        <div className="bg-white rounded-2xl p-4 sm:p-6 border border-zinc-200 shadow-sm space-y-3 w-full max-w-full overflow-hidden">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-black shrink-0" />
            <h3 className="text-xs sm:text-sm font-bold text-zinc-950">Peak Spending Time</h3>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            {timeOfDayStats.map((slot) => (
              <div
                key={slot.period}
                className="p-2.5 rounded-xl bg-zinc-50 border border-zinc-200 space-y-1"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-zinc-800">{slot.period}</span>
                  <span className="font-mono text-[10px] text-zinc-500">{slot.percentage}%</span>
                </div>
                <div className="font-mono font-bold text-xs text-black">
                  {formatCurrency(slot.amount)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* MODULE 5: Executive Financial Insights */}
      {executiveBrief.length > 0 && (
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-zinc-200 shadow-sm space-y-3 w-full max-w-full overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[11px] sm:text-xs font-mono font-bold uppercase tracking-wider text-black">
              <Sparkles className="w-3.5 h-3.5 text-black shrink-0" />
              <span>Executive Financial Insights</span>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {executiveBrief.map((brief, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 text-xs text-zinc-800 flex items-start gap-2.5"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-black mt-1.5 shrink-0" />
                <span className="leading-relaxed">{brief}</span>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
