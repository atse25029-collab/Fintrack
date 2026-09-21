'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Transaction, BudgetConfig, TimeframeSpendingPoint } from '@/lib/types';
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
  Percent,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Flame,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

interface AnalyticsViewProps {
  transactions: Transaction[];
  budget: BudgetConfig;
  onOpenStatement?: () => void;
}

export default function AnalyticsView({ transactions, budget, onOpenStatement }: AnalyticsViewProps) {
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

  // Spending velocity calculation
  const dailyBurnAverage = dailyData.average;
  const burnRatio = budget.dailyAllowance > 0 ? (dailyBurnAverage / budget.dailyAllowance) * 100 : 0;
  const isSafeVelocity = dailyBurnAverage <= budget.dailyAllowance;

  // Smart insights
  const insights = useMemo(() => {
    const list: string[] = [];
    if (dailyData.average > 0) {
      if (dailyData.average <= budget.dailyAllowance) {
        list.push(
          `14-day average daily spend of ${formatCurrency(dailyData.average)} is within your ${formatCurrency(
            budget.dailyAllowance
          )} allowance.`
        );
      } else {
        list.push(
          `14-day average spend (${formatCurrency(
            dailyData.average
          )}) exceeds your ${formatCurrency(budget.dailyAllowance)} daily target.`
        );
      }
    }

    const expenseCategories = calculateCategoryBreakdown(transactions, 'expense');
    if (expenseCategories.length > 0) {
      const top = expenseCategories[0];
      list.push(
        `"${top.category}" is your highest expense area: ${top.percentage}% (${formatCurrency(
          top.amount
        )}) of all spending.`
      );
    }

    const upi = paymentStats.find((p) => p.method === 'UPI / Bank');
    if (upi && upi.percentage > 0) {
      list.push(
        `${upi.percentage}% of all expenses (${formatCurrency(upi.amount)}) were completed via UPI.`
      );
    }

    if (financialStats.savingsRate >= 20) {
      list.push(
        `Strong savings rate of ${financialStats.savingsRate}%. You are retaining a solid portion of income.`
      );
    }

    return list;
  }, [dailyData, budget, transactions, paymentStats, financialStats]);

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
            Real-time cashflow trajectory, burn rate & expenditure breakdown
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

      {/* 4 Interactive KPI Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {/* Total Inflows */}
        <motion.div
          whileHover={{ y: -3 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          className="bg-white rounded-2xl p-3.5 sm:p-4 border border-zinc-200 shadow-xs space-y-1"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-medium text-zinc-500 uppercase tracking-wider">
              Total Inflows
            </span>
            <div className="w-6 h-6 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
              <ArrowDownRight className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-bold font-mono text-zinc-950 truncate">
            {formatCurrency(financialStats.totalIncome)}
          </div>
          <div className="text-[11px] text-zinc-500 flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-emerald-600" />
            <span>Cumulative earnings</span>
          </div>
        </motion.div>

        {/* Total Outflows */}
        <motion.div
          whileHover={{ y: -3 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          className="bg-white rounded-2xl p-3.5 sm:p-4 border border-zinc-200 shadow-xs space-y-1"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-medium text-zinc-500 uppercase tracking-wider">
              Total Outflows
            </span>
            <div className="w-6 h-6 rounded-lg bg-zinc-100 border border-zinc-200 flex items-center justify-center text-zinc-800">
              <ArrowUpRight className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-bold font-mono text-zinc-950 truncate">
            {formatCurrency(financialStats.totalExpense)}
          </div>
          <div className="text-[11px] text-zinc-500 flex items-center gap-1">
            <TrendingDown className="w-3 h-3 text-zinc-600" />
            <span>Total expenditures</span>
          </div>
        </motion.div>

        {/* Net Cashflow */}
        <motion.div
          whileHover={{ y: -3 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          className="bg-white rounded-2xl p-3.5 sm:p-4 border border-zinc-200 shadow-xs space-y-1"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-medium text-zinc-500 uppercase tracking-wider">
              Net Surplus
            </span>
            <div className="w-6 h-6 rounded-lg bg-zinc-100 border border-zinc-200 flex items-center justify-center text-zinc-800">
              <Wallet className="w-3.5 h-3.5" />
            </div>
          </div>
          <div
            className={`text-lg sm:text-xl font-bold font-mono truncate ${
              financialStats.totalBalance >= 0 ? 'text-zinc-950' : 'text-red-600'
            }`}
          >
            {formatCurrency(financialStats.totalBalance)}
          </div>
          <div className="text-[11px] text-zinc-500">
            {financialStats.totalBalance >= 0 ? 'Surplus retained' : 'Deficit spent'}
          </div>
        </motion.div>

        {/* Savings Rate */}
        <motion.div
          whileHover={{ y: -3 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          className="bg-white rounded-2xl p-3.5 sm:p-4 border border-zinc-200 shadow-xs space-y-1"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-medium text-zinc-500 uppercase tracking-wider">
              Savings Rate
            </span>
            <div className="w-6 h-6 rounded-lg bg-zinc-100 border border-zinc-200 flex items-center justify-center text-zinc-800">
              <Percent className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-bold font-mono text-zinc-950">
            {financialStats.savingsRate}%
          </div>
          <div className="text-[11px] text-zinc-500">
            {financialStats.savingsRate >= 20 ? 'Optimal rate' : 'Target: ≥ 20%'}
          </div>
        </motion.div>
      </div>

      {/* Main Expenditure Chart with Interactive Spring Bars & Hover Tooltip */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 border border-zinc-200 shadow-sm space-y-4 w-full max-w-full overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-zinc-100">
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-zinc-950 capitalize">
              {timeframe} Trajectory & Cashflow
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

      {/* Spending Velocity & Burn Rate Indicator */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-zinc-200 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-black shrink-0" />
            <h3 className="text-xs sm:text-sm font-bold text-zinc-950">
              Spending Velocity & Burn Rate
            </h3>
          </div>
          <div
            className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full border ${
              isSafeVelocity
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-amber-50 border-amber-200 text-amber-800'
            }`}
          >
            {isSafeVelocity ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Safe Velocity</span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Paced Above Target</span>
              </>
            )}
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-between text-xs font-mono">
            <span className="text-zinc-500">
              Daily Burn ({formatCurrency(dailyBurnAverage)}/day)
            </span>
            <span className="text-zinc-900 font-bold">
              Allowance: {formatCurrency(budget.dailyAllowance)}/day
            </span>
          </div>
          <div className="w-full h-2.5 bg-zinc-100 rounded-full overflow-hidden border border-zinc-200">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(burnRatio, 100)}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className={`h-full rounded-full ${
                isSafeVelocity ? 'bg-black' : 'bg-amber-500'
              }`}
            />
          </div>
          <p className="text-[11px] text-zinc-500">
            {isSafeVelocity
              ? `You are spending at ${Math.round(burnRatio)}% of your permitted daily budget ceiling.`
              : `Your daily average is running ${Math.round(burnRatio - 100)}% above your configured daily ceiling.`}
          </p>
        </div>
      </div>

      {/* Grid: Category Breakdown + Payment Mode & Peak Times */}
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

        {/* Payment Modes & Peak Times */}
        <div className="space-y-4">
          {/* Payment Mode Intelligence with Proportional Stacked Bar */}
          <div className="bg-white rounded-2xl p-4 sm:p-6 border border-zinc-200 shadow-sm space-y-3.5 w-full max-w-full overflow-hidden">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-black shrink-0" />
              <h3 className="text-xs sm:text-sm font-bold text-zinc-950">
                Payment Method Intelligence
              </h3>
            </div>

            {/* Proportional Stacked Bar */}
            <div className="w-full h-3 bg-zinc-100 rounded-full overflow-hidden flex border border-zinc-200">
              {paymentStats.map((item, idx) => {
                const colors = ['bg-black', 'bg-zinc-500', 'bg-zinc-300', 'bg-zinc-200'];
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

            {/* Method Cards */}
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

          {/* Peak Spending Time Distribution */}
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
      </div>

      {/* Smart Observations */}
      {insights.length > 0 && (
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-zinc-200 shadow-sm space-y-3 w-full max-w-full overflow-hidden">
          <div className="flex items-center gap-1.5 text-[11px] sm:text-xs font-mono font-bold uppercase tracking-wider text-black">
            <Sparkles className="w-3.5 h-3.5 text-black shrink-0" />
            <span>Smart Financial Insights</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {insights.map((insight, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="p-2.5 sm:p-3 bg-zinc-50 rounded-xl border border-zinc-200 text-xs text-zinc-800 flex items-start gap-2"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-black mt-1.5 shrink-0" />
                <span className="leading-relaxed">{insight}</span>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
