'use client';

import React from 'react';
import { FinancialStats } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { Wallet, TrendingUp, TrendingDown, Percent } from 'lucide-react';

interface FinancialSummaryProps {
  stats: FinancialStats;
}

export default function FinancialSummary({ stats }: FinancialSummaryProps) {
  const cards = [
    {
      title: 'Net Balance',
      amount: stats.totalBalance,
      subtitle: 'All-time cumulative',
      icon: Wallet,
      highlight: true,
    },
    {
      title: 'Inflows',
      amount: stats.monthIncome,
      subtitle: 'Month income',
      icon: TrendingUp,
      prefix: '+',
    },
    {
      title: 'Outflows',
      amount: stats.monthExpense,
      subtitle: 'Month expenses',
      icon: TrendingDown,
      prefix: '-',
    },
    {
      title: 'Savings Rate',
      raw: `${stats.savingsRate}%`,
      subtitle: `${formatCurrency(stats.monthSavings)} saved`,
      icon: Percent,
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 w-full max-w-full overflow-hidden">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.title}
            className={`p-3.5 sm:p-5 rounded-2xl border transition-all min-w-0 ${
              card.highlight
                ? 'bg-zinc-900 text-white border-zinc-900 shadow-sm'
                : 'bg-white text-zinc-900 border-zinc-200'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span
                className={`text-[10px] sm:text-xs font-mono font-medium truncate ${
                  card.highlight ? 'text-zinc-400' : 'text-zinc-500'
                }`}
              >
                {card.title}
              </span>
              <div
                className={`p-1.5 rounded-lg shrink-0 ${
                  card.highlight ? 'bg-zinc-800 text-white' : 'bg-zinc-100 text-black'
                }`}
              >
                <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2]" />
              </div>
            </div>

            <div className="space-y-0.5">
              <div
                className={`text-base sm:text-xl md:text-2xl font-bold font-mono tracking-tight truncate ${
                  card.highlight ? 'text-white' : 'text-zinc-950'
                }`}
              >
                {card.raw ||
                  `${card.prefix || ''}${formatCurrency(card.amount || 0)}`}
              </div>
              <p
                className={`text-[10px] sm:text-[11px] truncate ${
                  card.highlight ? 'text-zinc-400' : 'text-zinc-500'
                }`}
              >
                {card.subtitle}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
