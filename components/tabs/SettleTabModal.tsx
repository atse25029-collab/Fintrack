'use client';

import React, { useState } from 'react';
import { TabItem, PaymentMethod } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { X, Banknote, Building2, Check, ArrowDownLeft, ArrowUpRight } from 'lucide-react';

interface SettleTabModalProps {
  isOpen: boolean;
  onClose: () => void;
  tab: TabItem | null;
  onConfirmSettle: (
    tab: TabItem,
    paymentMethod: 'Cash' | 'UPI / Bank',
    recordTransaction: boolean
  ) => void;
}

export default function SettleTabModal({
  isOpen,
  onClose,
  tab,
  onConfirmSettle,
}: SettleTabModalProps) {
  const [selectedMethod, setSelectedMethod] = useState<'Cash' | 'UPI / Bank'>('UPI / Bank');
  const [recordTransaction, setRecordTransaction] = useState(true);

  if (!isOpen || !tab) return null;

  const isOwedToMe = tab.type === 'owed_to_you';

  const handleConfirm = () => {
    onConfirmSettle(tab, selectedMethod, recordTransaction);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3.5 sm:p-4 bg-black/40 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-zinc-200 animate-in zoom-in-95 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
          <div className="flex items-center gap-2">
            <div
              className={`p-1.5 rounded-lg ${
                isOwedToMe ? 'bg-zinc-100 text-black' : 'bg-black text-white'
              }`}
            >
              {isOwedToMe ? (
                <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
              ) : (
                <ArrowDownLeft className="w-4 h-4 stroke-[2.5]" />
              )}
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-zinc-950">
                Settle Tab &bull; {tab.personName}
              </h3>
              <p className="text-[11px] sm:text-xs text-zinc-500 truncate max-w-[240px]">
                {tab.description}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-black rounded-lg hover:bg-zinc-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Amount Badge */}
        <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-200 text-center space-y-1">
          <span className="text-[11px] font-mono text-zinc-500 uppercase tracking-wider block">
            {isOwedToMe ? 'Receiving Amount' : 'Paying Amount'}
          </span>
          <div className="text-2xl sm:text-3xl font-mono font-black text-black">
            {formatCurrency(tab.amount)}
          </div>
          <p className="text-xs text-zinc-600">
            {isOwedToMe
              ? `${tab.personName} is returning money to you`
              : `You are returning money to ${tab.personName}`}
          </p>
        </div>

        {/* Payment Method Selector */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-zinc-900 block">
            {isOwedToMe
              ? 'Where did you receive this money?'
              : 'Which wallet are you paying from?'}
          </label>

          <div className="grid grid-cols-2 gap-2.5">
            {/* Cash in Hand Option */}
            <button
              type="button"
              onClick={() => setSelectedMethod('Cash')}
              className={`p-3 rounded-xl border text-left transition-all ${
                selectedMethod === 'Cash'
                  ? 'bg-zinc-100 border-black ring-2 ring-black'
                  : 'bg-white border-zinc-200 hover:border-zinc-300'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <Banknote className="w-4 h-4 text-black" />
                {selectedMethod === 'Cash' && (
                  <span className="w-2 h-2 rounded-full bg-black" />
                )}
              </div>
              <div className="text-xs font-bold text-black">Cash (Hand)</div>
              <p className="text-[10px] text-zinc-500 mt-0.5">
                {isOwedToMe
                  ? `+${formatCurrency(tab.amount)} into Hand`
                  : `-${formatCurrency(tab.amount)} from Hand`}
              </p>
            </button>

            {/* UPI / Bank Account Option */}
            <button
              type="button"
              onClick={() => setSelectedMethod('UPI / Bank')}
              className={`p-3 rounded-xl border text-left transition-all ${
                selectedMethod === 'UPI / Bank'
                  ? 'bg-zinc-100 border-black ring-2 ring-black'
                  : 'bg-white border-zinc-200 hover:border-zinc-300'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <Building2 className="w-4 h-4 text-black" />
                {selectedMethod === 'UPI / Bank' && (
                  <span className="w-2 h-2 rounded-full bg-black" />
                )}
              </div>
              <div className="text-xs font-bold text-black">UPI / Account</div>
              <p className="text-[10px] text-zinc-500 mt-0.5">
                {isOwedToMe
                  ? `+${formatCurrency(tab.amount)} into Account`
                  : `-${formatCurrency(tab.amount)} from Account`}
              </p>
            </button>
          </div>
        </div>

        {/* Record in Ledger Toggle */}
        <label className="flex items-center gap-2 p-2.5 bg-zinc-50 rounded-xl border border-zinc-200 cursor-pointer">
          <input
            type="checkbox"
            checked={recordTransaction}
            onChange={(e) => setRecordTransaction(e.target.checked)}
            className="w-4 h-4 accent-black rounded"
          />
          <div className="text-xs text-zinc-800">
            <span className="font-semibold">Log in Transactions</span>
            <p className="text-[10px] text-zinc-500">
              Record as {isOwedToMe ? 'income' : 'expense'} with live real-time timestamp
            </p>
          </div>
        </label>

        {/* Action Buttons */}
        <div className="flex gap-2.5 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2 text-xs font-medium text-zinc-600 hover:text-black bg-zinc-100 hover:bg-zinc-200 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="flex-1 py-2 bg-black text-white text-xs font-semibold rounded-xl hover:bg-zinc-800 transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Confirm Settlement</span>
          </button>
        </div>
      </div>
    </div>
  );
}
