'use client';

import React, { useMemo } from 'react';
import { MonthlyDue } from '@/lib/types';
import { formatCurrency, calculateMonthlyDueReminders } from '@/lib/utils';
import {
  Calendar,
  Plus,
  CheckCircle2,
  Trash2,
  Edit2,
  ArrowDownLeft,
} from 'lucide-react';

interface MonthlyDuesManagerProps {
  dues: MonthlyDue[];
  onSaveDue: (due: Partial<MonthlyDue>) => void;
  onPayAndRecord: (due: MonthlyDue) => void;
  onDeleteDue: (id: string) => void;
  onOpenAddModal: () => void;
  onEditDue: (due: MonthlyDue) => void;
}

export default function MonthlyDuesManager({
  dues,
  onSaveDue,
  onPayAndRecord,
  onDeleteDue,
  onOpenAddModal,
  onEditDue,
}: MonthlyDuesManagerProps) {
  const reminders = useMemo(() => calculateMonthlyDueReminders(dues), [dues]);

  const summary = useMemo(() => {
    let totalCommitment = 0;
    let totalPaid = 0;
    let totalPending = 0;
    let overdueCount = 0;
    let dueTodayCount = 0;

    reminders.forEach((r) => {
      totalCommitment += r.due.amount;
      if (r.isPaidThisMonth) {
        totalPaid += r.due.amount;
      } else {
        totalPending += r.due.amount;
        if (r.isOverdue) overdueCount++;
        if (r.isDueToday) dueTodayCount++;
      }
    });

    return { totalCommitment, totalPaid, totalPending, overdueCount, dueTodayCount };
  }, [reminders]);

  return (
    <div className="space-y-4 sm:space-y-6 w-full max-w-full overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-black shrink-0" />
            <h2 className="text-sm sm:text-base font-bold text-zinc-950 tracking-tight">
              Monthly Dues &amp; Recurring Bills
            </h2>
          </div>
          <p className="text-[11px] sm:text-xs text-zinc-500">
            Real-time reminders for rent, Wi-Fi, EMIs, and monthly obligations
          </p>
        </div>

        <button
          onClick={onOpenAddModal}
          className="flex items-center justify-center gap-1.5 px-3.5 py-2 bg-black text-white text-xs font-semibold rounded-xl hover:bg-zinc-800 transition-all shadow-sm active:scale-95 self-stretch sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>Add Monthly Due</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-4">
        {/* Total Monthly Commitment */}
        <div className="p-4 sm:p-5 bg-zinc-900 text-white rounded-2xl border border-zinc-900 shadow-sm space-y-0.5">
          <span className="text-[11px] sm:text-xs font-mono text-zinc-400 font-medium block">
            Monthly Commitment
          </span>
          <div className="text-xl sm:text-2xl font-mono font-bold">
            {formatCurrency(summary.totalCommitment)}
          </div>
          <p className="text-[10px] sm:text-[11px] text-zinc-400">Total recurring monthly commitments</p>
        </div>

        {/* Pending this Month */}
        <div className="p-4 sm:p-5 bg-white text-zinc-900 rounded-2xl border border-zinc-200 shadow-sm space-y-0.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-mono text-zinc-500 font-medium">
              Remaining to Pay
            </span>
            {summary.overdueCount > 0 && (
              <span className="text-[9px] sm:text-[10px] font-mono font-bold px-1.5 py-0.2 bg-zinc-900 text-white rounded">
                {summary.overdueCount} Overdue
              </span>
            )}
          </div>
          <div className="text-xl sm:text-2xl font-mono font-bold text-zinc-950">
            {formatCurrency(summary.totalPending)}
          </div>
          <p className="text-[10px] sm:text-[11px] text-zinc-500">
            {summary.dueTodayCount > 0 ? `${summary.dueTodayCount} due today` : 'Pending this month'}
          </p>
        </div>

        {/* Paid this Month */}
        <div className="p-4 sm:p-5 bg-white text-zinc-900 rounded-2xl border border-zinc-200 shadow-sm space-y-0.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-mono text-zinc-500 font-medium">
              Paid this Month
            </span>
            <div className="p-1 bg-zinc-100 rounded-lg text-black">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-mono font-bold text-black">
            {formatCurrency(summary.totalPaid)}
          </div>
          <p className="text-[10px] sm:text-[11px] text-zinc-500">Cleared commitments</p>
        </div>
      </div>

      {/* Dues List */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 border border-zinc-200 shadow-sm space-y-3.5 w-full max-w-full overflow-hidden">
        <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
          <h3 className="text-[10px] sm:text-xs font-mono font-bold uppercase tracking-wider text-zinc-500">
            Recurring Dues &amp; Live Status
          </h3>
          <span className="text-[10px] sm:text-xs font-mono text-zinc-400">
            Today: {new Date().getDate()}th of month
          </span>
        </div>

        {reminders.length === 0 ? (
          <div className="py-8 text-center space-y-2 bg-zinc-50 rounded-xl border border-dashed border-zinc-200 p-4">
            <p className="text-xs text-zinc-500">No monthly dues added yet.</p>
            <button
              onClick={onOpenAddModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-black text-white text-xs font-semibold rounded-lg hover:bg-zinc-800"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add First Due</span>
            </button>
          </div>
        ) : (
          <div className="divide-y divide-zinc-100">
            {reminders.map(({ due, isOverdue, isDueToday, isPaidThisMonth, statusText }) => (
              <div
                key={due.id}
                className={`py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 -mx-1 px-1.5 rounded-xl transition-colors ${
                  isPaidThisMonth
                    ? 'opacity-60 bg-zinc-50/40'
                    : isOverdue
                    ? 'bg-zinc-100/50'
                    : 'hover:bg-zinc-50'
                }`}
              >
                {/* Left: Info */}
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div
                    className={`p-2 rounded-xl border shrink-0 ${
                      isPaidThisMonth
                        ? 'bg-zinc-200 text-zinc-600 border-zinc-300'
                        : isOverdue
                        ? 'bg-black text-white border-zinc-950'
                        : isDueToday
                        ? 'bg-zinc-900 text-white border-black'
                        : 'bg-zinc-100 text-black border-zinc-300'
                    }`}
                  >
                    <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5]" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-xs font-bold text-zinc-950 truncate">{due.title}</span>
                      <span
                        className={`text-[9px] font-mono px-1.5 py-0.2 rounded border font-semibold shrink-0 ${
                          isPaidThisMonth
                            ? 'bg-zinc-100 text-zinc-600 border-zinc-200'
                            : isOverdue
                            ? 'bg-black text-white border-black'
                            : isDueToday
                            ? 'bg-zinc-900 text-white border-zinc-900'
                            : 'bg-zinc-100 text-zinc-800 border-zinc-300'
                        }`}
                      >
                        {statusText}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 text-[10px] sm:text-[11px] text-zinc-500 truncate mt-0.5">
                      <span>Due on {due.dueDayOfMonth}th</span>
                      <span>&bull;</span>
                      <span className="truncate">{due.category}</span>
                    </div>
                  </div>
                </div>

                {/* Right: Amount & Action */}
                <div className="flex items-center justify-between sm:justify-end gap-2.5 pt-1.5 sm:pt-0 border-t sm:border-t-0 border-zinc-100">
                  <div className="text-left sm:text-right">
                    <div
                      className={`text-xs sm:text-sm font-mono font-bold ${
                        isPaidThisMonth ? 'text-zinc-400 line-through' : 'text-zinc-950'
                      }`}
                    >
                      {formatCurrency(due.amount)}
                    </div>
                  </div>

                  {!isPaidThisMonth ? (
                    <button
                      onClick={() => onPayAndRecord(due)}
                      className="flex items-center gap-1 px-2.5 py-1 bg-black text-white text-[11px] font-semibold rounded-lg hover:bg-zinc-800 active:scale-95 transition-all shadow-xs"
                    >
                      <ArrowDownLeft className="w-3 h-3" />
                      <span>Pay &amp; Record</span>
                    </button>
                  ) : (
                    <span className="text-[10px] font-mono text-zinc-400 px-1.5 py-0.5 bg-zinc-100 rounded">
                      Cleared
                    </span>
                  )}

                  <div className="flex items-center gap-0.5">
                    <button
                      onClick={() => onEditDue(due)}
                      aria-label="Edit due"
                      className="p-1 text-zinc-400 hover:text-black rounded hover:bg-zinc-200 transition-colors"
                    >
                      <Edit2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                    </button>
                    <button
                      onClick={() => onDeleteDue(due.id)}
                      aria-label="Delete due"
                      className="p-1 text-zinc-400 hover:text-red-600 rounded hover:bg-zinc-200 transition-colors"
                    >
                      <Trash2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
