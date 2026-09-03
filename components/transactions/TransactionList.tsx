'use client';

import React, { useState, useMemo } from 'react';
import { Transaction, TransactionType } from '@/lib/types';
import { formatCurrency, formatDateLabel } from '@/lib/utils';
import { Search, ArrowDownLeft, ArrowUpRight, Trash2, Edit2 } from 'lucide-react';

interface TransactionListProps {
  transactions: Transaction[];
  onDelete: (id: string) => void;
  onEdit: (tx: Transaction) => void;
  onAddNew: () => void;
}

export default function TransactionList({
  transactions,
  onDelete,
  onEdit,
  onAddNew,
}: TransactionListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | TransactionType>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date-desc' | 'amount-desc' | 'amount-asc'>('date-desc');

  const categories = useMemo(() => {
    const set = new Set<string>();
    transactions.forEach((t) => set.add(t.category));
    return Array.from(set).sort();
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    return transactions
      .filter((t) => {
        if (typeFilter !== 'all' && t.type !== typeFilter) return false;
        if (categoryFilter !== 'all' && t.category !== categoryFilter) return false;
        if (searchTerm.trim()) {
          const term = searchTerm.toLowerCase();
          const matchDesc = t.description?.toLowerCase().includes(term);
          const matchCat = t.category?.toLowerCase().includes(term);
          const matchNotes = t.notes?.toLowerCase().includes(term);
          const matchMethod = t.paymentMethod?.toLowerCase().includes(term);
          if (!matchDesc && !matchCat && !matchNotes && !matchMethod) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'amount-desc') return b.amount - a.amount;
        if (sortBy === 'amount-asc') return a.amount - b.amount;
        if (a.date !== b.date) return b.date.localeCompare(a.date);
        return (b.createdAt || 0) - (a.createdAt || 0);
      });
  }, [transactions, typeFilter, categoryFilter, searchTerm, sortBy]);

  const groupedByDate = useMemo(() => {
    const groups: { [date: string]: Transaction[] } = {};
    filteredTransactions.forEach((tx) => {
      if (!groups[tx.date]) groups[tx.date] = [];
      groups[tx.date].push(tx);
    });
    return groups;
  }, [filteredTransactions]);

  const dates = Object.keys(groupedByDate);

  return (
    <div className="bg-white rounded-2xl p-4 sm:p-6 border border-zinc-200 shadow-sm space-y-4 w-full max-w-full overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 pb-2.5 border-b border-zinc-100">
        <div>
          <h3 className="text-xs sm:text-sm font-bold text-black tracking-tight">Transactions History</h3>
          <p className="text-[11px] sm:text-xs text-zinc-500">Filter, search, and manage your records</p>
        </div>

        {/* Type Switcher */}
        <div className="flex p-0.5 bg-zinc-100 rounded-lg border border-zinc-200 text-xs font-medium w-full sm:w-auto">
          <button
            onClick={() => setTypeFilter('all')}
            className={`flex-1 sm:flex-initial px-2.5 py-1 rounded-md transition-all ${
              typeFilter === 'all'
                ? 'bg-black text-white shadow-sm font-semibold'
                : 'text-zinc-600 hover:text-black'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setTypeFilter('expense')}
            className={`flex-1 sm:flex-initial px-2.5 py-1 rounded-md transition-all ${
              typeFilter === 'expense'
                ? 'bg-black text-white shadow-sm font-semibold'
                : 'text-zinc-600 hover:text-black'
            }`}
          >
            Expenses
          </button>
          <button
            onClick={() => setTypeFilter('income')}
            className={`flex-1 sm:flex-initial px-2.5 py-1 rounded-md transition-all ${
              typeFilter === 'income'
                ? 'bg-black text-white shadow-sm font-semibold'
                : 'text-zinc-600 hover:text-black'
            }`}
          >
            Income
          </button>
        </div>
      </div>

      {/* Search and filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search transactions..."
            className="w-full pl-8 pr-3 py-1.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-black"
          />
        </div>

        <div className="grid grid-cols-2 sm:flex gap-2">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-800 focus:outline-none focus:ring-2 focus:ring-black truncate"
          >
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-2.5 py-1.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-800 focus:outline-none focus:ring-2 focus:ring-black"
          >
            <option value="date-desc">Newest First</option>
            <option value="amount-desc">Highest (₹)</option>
            <option value="amount-asc">Lowest (₹)</option>
          </select>
        </div>
      </div>

      {/* Transaction List */}
      {filteredTransactions.length === 0 ? (
        <div className="py-8 text-center space-y-2.5 bg-zinc-50 rounded-xl border border-dashed border-zinc-200 p-4">
          <p className="text-xs text-zinc-500">No transactions match your search criteria.</p>
          <button
            onClick={onAddNew}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-black text-white text-xs font-semibold rounded-lg hover:bg-zinc-800"
          >
            <span>Add Transaction</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {dates.map((dateKey) => {
            const dayTxs = groupedByDate[dateKey];
            return (
              <div key={dateKey} className="space-y-1.5">
                <div className="flex items-center justify-between px-1 text-[11px] font-mono text-zinc-500 border-b border-zinc-100 pb-1">
                  <span className="font-semibold text-zinc-800">
                    {formatDateLabel(dateKey)}
                  </span>
                  <span>{dayTxs.length} records</span>
                </div>

                <div className="divide-y divide-zinc-100">
                  {dayTxs.map((tx) => {
                    const isIncome = tx.type === 'income';
                    return (
                      <div
                        key={tx.id}
                        className="py-2.5 flex items-center justify-between gap-2 -mx-1 px-1.5 rounded-lg hover:bg-zinc-50/80 transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <div
                            className={`p-1.5 sm:p-2 rounded-xl border shrink-0 ${
                              isIncome
                                ? 'bg-zinc-100 border-zinc-300 text-black'
                                : 'bg-black border-zinc-950 text-white'
                            }`}
                          >
                            {isIncome ? (
                              <ArrowUpRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5]" />
                            ) : (
                              <ArrowDownLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5]" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="text-xs font-semibold text-zinc-950 truncate">
                                {tx.description}
                              </span>
                              <span className="text-[9px] font-mono px-1 py-0.2 bg-zinc-100 text-zinc-600 rounded border border-zinc-200 shrink-0">
                                {tx.paymentMethod.split(' ')[0]}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] text-zinc-500 truncate mt-0.5">
                              <span className="truncate">{tx.category}</span>
                              {tx.time && (
                                <>
                                  <span className="shrink-0">&bull;</span>
                                  <span className="font-mono shrink-0">{tx.time}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            className={`text-xs sm:text-sm font-mono font-bold ${
                              isIncome ? 'text-black font-extrabold' : 'text-zinc-950'
                            }`}
                          >
                            {isIncome ? '+' : '-'}
                            {formatCurrency(tx.amount)}
                          </span>

                          <div className="flex items-center gap-0.5">
                            <button
                              onClick={() => onEdit(tx)}
                              aria-label="Edit transaction"
                              className="p-1 text-zinc-400 hover:text-black rounded hover:bg-zinc-200 transition-colors"
                            >
                              <Edit2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                            </button>
                            <button
                              onClick={() => onDelete(tx.id)}
                              aria-label="Delete transaction"
                              className="p-1 text-zinc-400 hover:text-red-600 rounded hover:bg-zinc-200 transition-colors"
                            >
                              <Trash2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
