'use client';

import React, { useState, useMemo } from 'react';
import { TabItem } from '@/lib/types';
import { formatCurrency, formatDateLabel } from '@/lib/utils';
import SettleTabModal from './SettleTabModal';
import {
  Users,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  CheckCircle2,
  Trash2,
  Edit2,
  Search,
} from 'lucide-react';

interface TabsManagerProps {
  tabs: TabItem[];
  onSaveTab: (tab: Partial<TabItem>) => void;
  onSettleTab: (
    tab: TabItem,
    paymentMethod: 'Cash' | 'UPI / Bank',
    recordTransaction: boolean
  ) => void;
  onDeleteTab: (id: string) => void;
  onOpenAddModal: () => void;
  onEditTab: (tab: TabItem) => void;
}

export default function TabsManager({
  tabs,
  onSaveTab,
  onSettleTab,
  onDeleteTab,
  onOpenAddModal,
  onEditTab,
}: TabsManagerProps) {
  const [filter, setFilter] = useState<'pending' | 'owed_to_you' | 'you_owe' | 'settled'>('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [tabToSettle, setTabToSettle] = useState<TabItem | null>(null);

  const summary = useMemo(() => {
    let toCollect = 0;
    let toPay = 0;
    let pendingCount = 0;

    tabs.forEach((tab) => {
      if (tab.status === 'pending') {
        pendingCount++;
        if (tab.type === 'owed_to_you') {
          toCollect += tab.amount;
        } else {
          toPay += tab.amount;
        }
      }
    });

    const net = toCollect - toPay;
    return { toCollect, toPay, net, pendingCount };
  }, [tabs]);

  const filteredTabs = useMemo(() => {
    return tabs.filter((tab) => {
      if (filter === 'pending' && tab.status !== 'pending') return false;
      if (filter === 'owed_to_you' && (tab.status !== 'pending' || tab.type !== 'owed_to_you')) return false;
      if (filter === 'you_owe' && (tab.status !== 'pending' || tab.type !== 'you_owe')) return false;
      if (filter === 'settled' && tab.status !== 'settled') return false;

      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchName = tab.personName.toLowerCase().includes(term);
        const matchDesc = tab.description.toLowerCase().includes(term);
        const matchNotes = tab.notes?.toLowerCase().includes(term);
        if (!matchName && !matchDesc && !matchNotes) return false;
      }

      return true;
    }).sort((a, b) => {
      if (a.status !== b.status) return a.status === 'pending' ? -1 : 1;
      return b.createdAt - a.createdAt;
    });
  }, [tabs, filter, searchTerm]);

  return (
    <div className="space-y-4 sm:space-y-6 w-full max-w-full overflow-hidden">
      {/* Header & Primary Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 sm:w-5 sm:h-5 text-black shrink-0" />
            <h2 className="text-sm sm:text-base font-bold text-zinc-950 tracking-tight">
              Tabs &amp; Splits (Lent &amp; Borrowed)
            </h2>
          </div>
          <p className="text-[11px] sm:text-xs text-zinc-500">
            Keep track of who owes you and who you need to give back to
          </p>
        </div>

        <button
          onClick={onOpenAddModal}
          className="flex items-center justify-center gap-1.5 px-3.5 py-2 bg-black text-white text-xs font-semibold rounded-xl hover:bg-zinc-800 transition-all shadow-sm active:scale-95 self-stretch sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>New Tab / IOU</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-4">
        {/* Net Due Balance */}
        <div className="p-4 sm:p-5 bg-zinc-900 text-white rounded-2xl border border-zinc-900 shadow-sm space-y-0.5">
          <span className="text-[11px] sm:text-xs font-mono text-zinc-400 font-medium block">
            Net Due Balance
          </span>
          <div className="text-xl sm:text-2xl font-mono font-bold">
            {formatCurrency(summary.net)}
          </div>
          <p className="text-[10px] sm:text-[11px] text-zinc-400">
            {summary.net >= 0 ? 'Net positive to collect' : 'Net dues to pay back'}
          </p>
        </div>

        {/* To Collect */}
        <div className="p-4 sm:p-5 bg-white text-zinc-900 rounded-2xl border border-zinc-200 shadow-sm space-y-0.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-mono text-zinc-500 font-medium">
              Someone Owes You
            </span>
            <div className="p-1 bg-zinc-100 rounded-lg text-black">
              <ArrowUpRight className="w-3.5 h-3.5 stroke-[2.5]" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-mono font-bold text-black">
            +{formatCurrency(summary.toCollect)}
          </div>
          <p className="text-[10px] sm:text-[11px] text-zinc-500">Receivable from others</p>
        </div>

        {/* To Pay */}
        <div className="p-4 sm:p-5 bg-white text-zinc-900 rounded-2xl border border-zinc-200 shadow-sm space-y-0.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-mono text-zinc-500 font-medium">
              You Owe Back
            </span>
            <div className="p-1 bg-black rounded-lg text-white">
              <ArrowDownLeft className="w-3.5 h-3.5 stroke-[2.5]" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-mono font-bold text-zinc-950">
            -{formatCurrency(summary.toPay)}
          </div>
          <p className="text-[10px] sm:text-[11px] text-zinc-500">Payable to friends</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-zinc-200 shadow-sm space-y-3.5 w-full max-w-full overflow-hidden">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          <div className="grid grid-cols-2 sm:flex p-1 bg-zinc-100 rounded-xl border border-zinc-200 text-xs font-medium gap-0.5">
            <button
              onClick={() => setFilter('pending')}
              className={`px-2.5 py-1 rounded-lg text-center transition-all ${
                filter === 'pending'
                  ? 'bg-black text-white shadow-sm font-semibold'
                  : 'text-zinc-600 hover:text-black'
              }`}
            >
              Pending ({summary.pendingCount})
            </button>
            <button
              onClick={() => setFilter('owed_to_you')}
              className={`px-2.5 py-1 rounded-lg text-center transition-all ${
                filter === 'owed_to_you'
                  ? 'bg-black text-white shadow-sm font-semibold'
                  : 'text-zinc-600 hover:text-black'
              }`}
            >
              Owed to You
            </button>
            <button
              onClick={() => setFilter('you_owe')}
              className={`px-2.5 py-1 rounded-lg text-center transition-all ${
                filter === 'you_owe'
                  ? 'bg-black text-white shadow-sm font-semibold'
                  : 'text-zinc-600 hover:text-black'
              }`}
            >
              You Owe
            </button>
            <button
              onClick={() => setFilter('settled')}
              className={`px-2.5 py-1 rounded-lg text-center transition-all ${
                filter === 'settled'
                  ? 'bg-black text-white shadow-sm font-semibold'
                  : 'text-zinc-600 hover:text-black'
              }`}
            >
              Settled
            </button>
          </div>

          <div className="relative flex-1 sm:max-w-xs">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search person or reason..."
              className="w-full pl-8 pr-3 py-1.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>
        </div>

        {/* List of Tab Items */}
        {filteredTabs.length === 0 ? (
          <div className="py-8 text-center space-y-2 bg-zinc-50 rounded-xl border border-dashed border-zinc-200 p-4">
            <p className="text-xs text-zinc-500">No tabs found under this filter.</p>
            <button
              onClick={onOpenAddModal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-black text-white text-xs font-semibold rounded-lg hover:bg-zinc-800"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Record a Tab</span>
            </button>
          </div>
        ) : (
          <div className="divide-y divide-zinc-100">
            {filteredTabs.map((tab) => {
              const isOwedToMe = tab.type === 'owed_to_you';
              const isSettled = tab.status === 'settled';

              return (
                <div
                  key={tab.id}
                  className={`py-3 flex items-center justify-between gap-2 -mx-1 px-1.5 rounded-xl transition-colors ${
                    isSettled ? 'opacity-60 bg-zinc-50/40' : 'hover:bg-zinc-50'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div
                      className={`p-2 rounded-xl border shrink-0 ${
                        isSettled
                          ? 'bg-zinc-200 text-zinc-600 border-zinc-300'
                          : isOwedToMe
                          ? 'bg-zinc-100 border-zinc-300 text-black'
                          : 'bg-black border-zinc-950 text-white'
                      }`}
                    >
                      {isSettled ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : isOwedToMe ? (
                        <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
                      ) : (
                        <ArrowDownLeft className="w-4 h-4 stroke-[2.5]" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-xs font-bold text-zinc-950 truncate">
                          {tab.personName}
                        </span>
                        <span
                          className={`text-[9px] font-mono px-1 py-0.2 rounded border shrink-0 ${
                            isSettled
                              ? 'bg-zinc-100 text-zinc-600 border-zinc-200'
                              : isOwedToMe
                              ? 'bg-zinc-100 text-zinc-900 border-zinc-300 font-semibold'
                              : 'bg-zinc-900 text-white border-zinc-950 font-semibold'
                          }`}
                        >
                          {isSettled ? 'Settled' : isOwedToMe ? 'Owes You' : 'You Owe'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] text-zinc-500 truncate mt-0.5">
                        <span className="truncate">{tab.description}</span>
                        <span>&bull;</span>
                        <span className="font-mono shrink-0">{formatDateLabel(tab.date)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Amount & Settle Trigger */}
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-right">
                      <div
                        className={`text-xs sm:text-sm font-mono font-bold ${
                          isSettled
                            ? 'text-zinc-400 line-through'
                            : isOwedToMe
                            ? 'text-black font-extrabold'
                            : 'text-zinc-950'
                        }`}
                      >
                        {formatCurrency(tab.amount)}
                      </div>
                    </div>

                    {!isSettled ? (
                      <button
                        onClick={() => setTabToSettle(tab)}
                        className="flex items-center gap-1 px-2.5 py-1 bg-black text-white text-[11px] font-semibold rounded-lg hover:bg-zinc-800 active:scale-95 transition-all shadow-xs"
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Settle</span>
                      </button>
                    ) : (
                      <span className="text-[10px] font-mono text-zinc-400">Done</span>
                    )}

                    <div className="flex items-center gap-0.5">
                      <button
                        onClick={() => onEditTab(tab)}
                        aria-label="Edit tab"
                        className="p-1 text-zinc-400 hover:text-black rounded hover:bg-zinc-200 transition-colors"
                      >
                        <Edit2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                      </button>
                      <button
                        onClick={() => onDeleteTab(tab.id)}
                        aria-label="Delete tab"
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
        )}
      </div>

      {/* Settle Tab Modal */}
      <SettleTabModal
        isOpen={Boolean(tabToSettle)}
        onClose={() => setTabToSettle(null)}
        tab={tabToSettle}
        onConfirmSettle={onSettleTab}
      />
    </div>
  );
}
