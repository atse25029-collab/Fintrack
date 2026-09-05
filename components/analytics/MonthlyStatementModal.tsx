'use client';

import React, { useState, useMemo } from 'react';
import { Transaction, WalletBalances } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { X, Printer, Download, FileText, Calendar, TrendingUp } from 'lucide-react';

interface MonthlyStatementModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: Transaction[];
  wallets: WalletBalances;
}

export default function MonthlyStatementModal({
  isOpen,
  onClose,
  transactions,
  wallets,
}: MonthlyStatementModalProps) {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  // Extract distinct available months from transactions
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    const d = new Date();
    months.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    for (const tx of transactions) {
      if (tx.date && tx.date.length >= 7) {
        months.add(tx.date.substring(0, 7));
      }
    }
    return Array.from(months).sort().reverse();
  }, [transactions]);

  // Filter transactions for selected month
  const monthTransactions = useMemo(() => {
    return transactions.filter((tx) => tx.date.startsWith(selectedMonth));
  }, [transactions, selectedMonth]);

  // Metrics
  const summary = useMemo(() => {
    let income = 0;
    let expense = 0;
    const catMap: Record<string, number> = {};

    for (const tx of monthTransactions) {
      if (tx.type === 'income') {
        income += tx.amount;
      } else {
        expense += tx.amount;
        catMap[tx.category] = (catMap[tx.category] || 0) + tx.amount;
      }
    }

    const netSavings = income - expense;
    const savingsRate = income > 0 ? Math.round((netSavings / income) * 100) : 0;

    const categories = Object.entries(catMap)
      .map(([name, amount]) => ({
        name,
        amount,
        percent: expense > 0 ? Math.round((amount / expense) * 100) : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    return { income, expense, netSavings, savingsRate, categories };
  }, [monthTransactions]);

  if (!isOpen) return null;

  // Print Statement (Trigger browser print / save as PDF)
  const handlePrint = () => {
    window.print();
  };

  // Download CSV
  const handleDownloadCsv = () => {
    const headers = ['Date', 'Time', 'Type', 'Category', 'Description', 'Amount (INR)', 'Payment Method'];
    const rows = monthTransactions.map((tx) => [
      tx.date,
      tx.time || '',
      tx.type,
      `"${tx.category}"`,
      `"${tx.description.replace(/"/g, '""')}"`,
      tx.amount,
      tx.paymentMethod,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `FinTrack-Statement-${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const monthLabel = new Date(selectedMonth + '-01').toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto">
      <div className="bg-white border border-zinc-200 rounded-3xl w-full max-w-2xl p-5 sm:p-7 shadow-2xl space-y-5 my-auto max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-black text-white rounded-xl">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-zinc-950">
                Monthly Financial Statement
              </h3>
              <p className="text-[10px] sm:text-xs text-zinc-500">
                Official statement &amp; expense breakdown for {monthLabel}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-2.5 py-1.5 bg-zinc-100 rounded-xl text-xs font-semibold text-zinc-900 border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-black"
            >
              {availableMonths.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>

            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Statement Body */}
        <div id="statement-printable" className="space-y-4 text-xs text-zinc-800">
          {/* Executive Overview Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
            <div className="p-3 bg-zinc-50 rounded-2xl border border-zinc-200">
              <span className="text-[10px] uppercase font-mono text-zinc-500 block">Total Income</span>
              <span className="text-sm sm:text-base font-mono font-bold text-emerald-600 block">
                {formatCurrency(summary.income)}
              </span>
            </div>
            <div className="p-3 bg-zinc-50 rounded-2xl border border-zinc-200">
              <span className="text-[10px] uppercase font-mono text-zinc-500 block">Total Expenses</span>
              <span className="text-sm sm:text-base font-mono font-bold text-red-600 block">
                {formatCurrency(summary.expense)}
              </span>
            </div>
            <div className="p-3 bg-zinc-50 rounded-2xl border border-zinc-200">
              <span className="text-[10px] uppercase font-mono text-zinc-500 block">Net Savings</span>
              <span
                className={`text-sm sm:text-base font-mono font-bold block ${
                  summary.netSavings >= 0 ? 'text-zinc-900' : 'text-red-600'
                }`}
              >
                {formatCurrency(summary.netSavings)}
              </span>
            </div>
            <div className="p-3 bg-zinc-50 rounded-2xl border border-zinc-200">
              <span className="text-[10px] uppercase font-mono text-zinc-500 block">Savings Rate</span>
              <span className="text-sm sm:text-base font-mono font-bold text-black block">
                {summary.savingsRate}%
              </span>
            </div>
          </div>

          {/* Category Breakdown Table */}
          <div className="space-y-2">
            <h4 className="font-bold text-zinc-900 text-xs uppercase font-mono tracking-wider">
              Category Spending Distribution
            </h4>
            {summary.categories.length === 0 ? (
              <p className="text-xs text-zinc-400 py-2">No expenses logged for this month.</p>
            ) : (
              <div className="border border-zinc-200 rounded-2xl overflow-hidden divide-y divide-zinc-100">
                {summary.categories.map((cat) => (
                  <div key={cat.name} className="p-2.5 flex items-center justify-between text-xs">
                    <span className="font-semibold text-zinc-900">{cat.name}</span>
                    <div className="flex items-center gap-3 font-mono">
                      <span className="text-zinc-500">{cat.percent}%</span>
                      <span className="font-bold text-zinc-900">{formatCurrency(cat.amount)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Transactions Itemized Ledger */}
          <div className="space-y-2">
            <h4 className="font-bold text-zinc-900 text-xs uppercase font-mono tracking-wider">
              Itemized Ledger ({monthTransactions.length} entries)
            </h4>
            <div className="border border-zinc-200 rounded-2xl overflow-hidden max-h-56 overflow-y-auto divide-y divide-zinc-100">
              {monthTransactions.map((tx) => (
                <div key={tx.id} className="p-2.5 flex items-center justify-between text-xs">
                  <div className="space-y-0.5 max-w-[65%]">
                    <span className="font-semibold text-zinc-900 truncate block">
                      {tx.description}
                    </span>
                    <span className="text-[10px] text-zinc-500 block">
                      {tx.date} • {tx.category} • {tx.paymentMethod}
                    </span>
                  </div>
                  <span
                    className={`font-mono font-bold ${
                      tx.type === 'income' ? 'text-emerald-600' : 'text-zinc-950'
                    }`}
                  >
                    {tx.type === 'income' ? '+' : '-'}
                    {formatCurrency(tx.amount)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-3 border-t border-zinc-100">
          <span className="text-[10px] text-zinc-500 font-mono">
            Liquid Balance: {formatCurrency(wallets.cashInHand + wallets.accountBalance)}
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadCsv}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-xl text-xs font-semibold transition-all active:scale-95"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download CSV</span>
            </button>

            <button
              onClick={handlePrint}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 bg-black hover:bg-zinc-800 text-white rounded-xl text-xs font-semibold shadow-sm transition-all active:scale-95"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / PDF</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
