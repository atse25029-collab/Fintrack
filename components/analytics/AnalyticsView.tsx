'use client';

import React, { useState, useMemo } from 'react';
import { Transaction, BudgetConfig } from '@/lib/types';
import {
  formatCurrency,
  calculateDailyAnalytics,
  calculateWeeklyAnalytics,
  calculateMonthlyAnalytics,
  calculateCategoryBreakdown,
  calculatePaymentMethodStats,
  calculateTimeOfDayStats,
} from '@/lib/utils';
import {
  BarChart3,
  PieChart,
  CreditCard,
  Clock,
  Sparkles,
} from 'lucide-react';

interface AnalyticsViewProps {
  transactions: Transaction[];
  budget: BudgetConfig;
}

export default function AnalyticsView({ transactions, budget }: AnalyticsViewProps) {
  const [timeframe, setTimeframe] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  const dailyData = useMemo(() => calculateDailyAnalytics(transactions, 14), [transactions]);
  const weeklyData = useMemo(() => calculateWeeklyAnalytics(transactions, 6), [transactions]);
  const monthlyData = useMemo(() => calculateMonthlyAnalytics(transactions, 6), [transactions]);

  const categories = useMemo(() => calculateCategoryBreakdown(transactions, 'expense'), [transactions]);
  const paymentStats = useMemo(() => calculatePaymentMethodStats(transactions), [transactions]);
  const timeOfDayStats = useMemo(() => calculateTimeOfDayStats(transactions), [transactions]);

  const currentChartData = useMemo(() => {
    if (timeframe === 'daily') return dailyData.points;
    if (timeframe === 'weekly') return weeklyData.points;
    return monthlyData.points;
  }, [timeframe, dailyData, weeklyData, monthlyData]);

  const maxExpense = Math.max(...currentChartData.map((p) => p.expense), 500);

  const totalExpense = useMemo(() => {
    return transactions
      .filter((t) => t.type === 'expense')
      .reduce((s, t) => s + t.amount, 0);
  }, [transactions]);

  const insights = useMemo(() => {
    const list: string[] = [];
    if (dailyData.average > 0) {
      if (dailyData.average <= budget.dailyAllowance) {
        list.push(
          `14-day average daily spend: ${formatCurrency(
            dailyData.average
          )} (within ${formatCurrency(budget.dailyAllowance)} allowance).`
        );
      } else {
        list.push(
          `14-day average spend (${formatCurrency(
            dailyData.average
          )}) exceeds your ${formatCurrency(budget.dailyAllowance)} daily target.`
        );
      }
    }

    if (categories.length > 0) {
      const top = categories[0];
      list.push(
        `"${top.category}" is your top expense: ${top.percentage}% (${formatCurrency(
          top.amount
        )}) of total.`
      );
    }

    const upi = paymentStats.find((p) => p.method === 'UPI / Bank');
    if (upi && upi.percentage > 0) {
      list.push(
        `${upi.percentage}% of expenses (${formatCurrency(
          upi.amount
        )}) paid via UPI.`
      );
    }

    return list;
  }, [dailyData, budget, categories, paymentStats]);

  return (
    <div className="space-y-4 sm:space-y-6 w-full max-w-full overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 text-black shrink-0" />
            <h2 className="text-sm sm:text-base font-bold text-zinc-950 tracking-tight">
              Spending Analytics
            </h2>
          </div>
          <p className="text-[11px] sm:text-xs text-zinc-500">
            Expenditure patterns across daily, weekly, and monthly timelines
          </p>
        </div>

        {/* Timeframe Selector */}
        <div className="grid grid-cols-3 gap-1 p-1 bg-zinc-100 rounded-xl border border-zinc-200 text-xs font-semibold w-full sm:w-auto">
          <button
            onClick={() => setTimeframe('daily')}
            className={`py-1.5 px-2 rounded-lg text-center transition-all ${
              timeframe === 'daily'
                ? 'bg-black text-white shadow-sm'
                : 'text-zinc-600 hover:text-black'
            }`}
          >
            Daily
          </button>
          <button
            onClick={() => setTimeframe('weekly')}
            className={`py-1.5 px-2 rounded-lg text-center transition-all ${
              timeframe === 'weekly'
                ? 'bg-black text-white shadow-sm'
                : 'text-zinc-600 hover:text-black'
            }`}
          >
            Weekly
          </button>
          <button
            onClick={() => setTimeframe('monthly')}
            className={`py-1.5 px-2 rounded-lg text-center transition-all ${
              timeframe === 'monthly'
                ? 'bg-black text-white shadow-sm'
                : 'text-zinc-600 hover:text-black'
            }`}
          >
            Monthly
          </button>
        </div>
      </div>

      {/* Smart Insights */}
      {insights.length > 0 && (
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-zinc-200 shadow-sm space-y-2.5 w-full max-w-full overflow-hidden">
          <div className="flex items-center gap-1.5 text-[11px] sm:text-xs font-mono font-bold uppercase tracking-wider text-black">
            <Sparkles className="w-3.5 h-3.5 text-black shrink-0" />
            <span>Smart Observations</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {insights.map((insight, idx) => (
              <div
                key={idx}
                className="p-2.5 sm:p-3 bg-zinc-50 rounded-xl border border-zinc-200 text-xs text-zinc-800 flex items-start gap-2"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-black mt-1.5 shrink-0" />
                <span className="leading-relaxed">{insight}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Expenditure Chart */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 border border-zinc-200 shadow-sm space-y-3.5 w-full max-w-full overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 pb-2.5 border-b border-zinc-100">
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-zinc-950 capitalize">
              {timeframe} Expenditure Breakdown
            </h3>
          </div>

          <div className="text-xs font-mono text-zinc-600">
            {timeframe === 'daily' && (
              <span>Avg: <strong className="text-black">{formatCurrency(dailyData.average)}/day</strong></span>
            )}
            {timeframe === 'weekly' && (
              <span>Avg: <strong className="text-black">{formatCurrency(weeklyData.average)}/week</strong></span>
            )}
            {timeframe === 'monthly' && (
              <span>Avg: <strong className="text-black">{formatCurrency(monthlyData.average)}/month</strong></span>
            )}
          </div>
        </div>

        {/* Responsive Bar Visualization */}
        <div className="pt-4 pb-1">
          <div className="h-44 sm:h-52 flex items-end justify-between gap-1 sm:gap-2.5 border-b border-zinc-200 px-0.5">
            {currentChartData.map((pt) => {
              const expPct = Math.min(100, Math.round((pt.expense / maxExpense) * 100));
              const incPct = Math.min(100, Math.round((pt.income / maxExpense) * 100));

              return (
                <div
                  key={pt.label}
                  className="flex-1 flex flex-col items-center gap-1 h-full justify-end group min-w-0"
                >
                  <div className="w-full flex items-end justify-center gap-0.5 h-36">
                    {pt.income > 0 && (
                      <div
                        className="w-1/2 max-w-[10px] bg-zinc-300 rounded-t-sm"
                        style={{ height: `${Math.max(incPct, 6)}%` }}
                        title={`Income: ${formatCurrency(pt.income)}`}
                      />
                    )}
                    <div
                      className="w-1/2 max-w-[10px] bg-black rounded-t-sm"
                      style={{ height: `${Math.max(expPct, pt.expense > 0 ? 6 : 0)}%` }}
                      title={`Expense: ${formatCurrency(pt.expense)}`}
                    />
                  </div>

                  <span className="text-[9px] sm:text-[10px] font-mono text-zinc-500 truncate w-full text-center">
                    {pt.label.split(' ')[0]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-between text-[10px] sm:text-xs font-mono text-zinc-500 pt-0.5">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 bg-black rounded-sm" />
              <span>Expenditure</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 bg-zinc-300 rounded-sm" />
              <span>Income</span>
            </div>
          </div>
          <span>Values in ₹</span>
        </div>
      </div>

      {/* Grid: Categories + Payment Mode */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Category Breakdown */}
        <div className="bg-white rounded-2xl p-4 sm:p-6 border border-zinc-200 shadow-sm space-y-3.5 w-full max-w-full overflow-hidden">
          <div className="flex items-center gap-2">
            <PieChart className="w-4 h-4 text-black shrink-0" />
            <h3 className="text-xs sm:text-sm font-bold text-zinc-950">What I Have Spent On</h3>
          </div>
          <p className="text-[11px] sm:text-xs text-zinc-500">
            Total outflows: {formatCurrency(totalExpense)}
          </p>

          <div className="space-y-3 pt-1">
            {categories.slice(0, 8).map((item) => (
              <div key={item.category} className="space-y-1">
                <div className="flex items-center justify-between text-xs gap-2">
                  <span className="font-semibold text-zinc-900 truncate">{item.category}</span>
                  <div className="flex items-center gap-2 font-mono shrink-0">
                    <span className="text-zinc-500">{item.percentage}%</span>
                    <span className="font-bold text-black">{formatCurrency(item.amount)}</span>
                  </div>
                </div>

                <div className="w-full h-2 bg-zinc-100 rounded-full overflow-hidden border border-zinc-200">
                  <div
                    className="h-full bg-black rounded-full transition-all duration-500"
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Payment Mode & Time of Day */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-4 sm:p-6 border border-zinc-200 shadow-sm space-y-3.5 w-full max-w-full overflow-hidden">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-black shrink-0" />
              <h3 className="text-xs sm:text-sm font-bold text-zinc-950">Payment Mode Intelligence</h3>
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

          <div className="bg-white rounded-2xl p-4 sm:p-6 border border-zinc-200 shadow-sm space-y-3 w-full max-w-full overflow-hidden">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-black shrink-0" />
              <h3 className="text-xs sm:text-sm font-bold text-zinc-950">Peak Spending Time</h3>
            </div>

            <div className="space-y-2 pt-1">
              {timeOfDayStats.map((slot) => (
                <div
                  key={slot.period}
                  className="flex items-center justify-between p-2 rounded-xl bg-zinc-50 border border-zinc-200 text-xs gap-2"
                >
                  <span className="font-medium text-zinc-800 truncate">{slot.period}</span>
                  <div className="flex items-center gap-2 font-mono shrink-0">
                    <span className="text-zinc-500">{slot.percentage}%</span>
                    <span className="font-bold text-black">{formatCurrency(slot.amount)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
