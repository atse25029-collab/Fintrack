'use client';

import React, { useState, useEffect } from 'react';
import { MonthlyDue, PaymentMethod, DEFAULT_CATEGORIES } from '@/lib/types';
import { X, Calendar, Check } from 'lucide-react';

interface MonthlyDueModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (due: Partial<MonthlyDue>) => void;
  initialData?: MonthlyDue | null;
}

export default function MonthlyDueModal({
  isOpen,
  onClose,
  onSave,
  initialData,
}: MonthlyDueModalProps) {
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Bills & Utilities');
  const [dueDayOfMonth, setDueDayOfMonth] = useState('5');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('UPI / Bank');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title);
      setAmount(initialData.amount.toString());
      setCategory(initialData.category);
      setDueDayOfMonth(initialData.dueDayOfMonth.toString());
      setPaymentMethod(initialData.paymentMethod);
      setNotes(initialData.notes || '');
    } else {
      setTitle('');
      setAmount('');
      setCategory('Bills & Utilities');
      setDueDayOfMonth('5');
      setPaymentMethod('UPI / Bank');
      setNotes('');
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    const day = parseInt(dueDayOfMonth, 10);
    if (!parsedAmount || parsedAmount <= 0 || !title.trim() || !day || day < 1 || day > 31) return;

    onSave({
      ...(initialData?.id ? { id: initialData.id } : {}),
      title: title.trim(),
      amount: parsedAmount,
      category,
      dueDayOfMonth: day,
      paymentMethod,
      notes: notes.trim(),
      status: initialData?.status || 'pending',
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-zinc-200 space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-zinc-100 rounded-xl">
              <Calendar className="w-5 h-5 text-black" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-950">
                {initialData ? 'Edit Monthly Due' : 'Add Monthly Recurring Due'}
              </h3>
              <p className="text-xs text-zinc-500">Bills, rent, EMIs, and monthly commitments</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="p-1 text-zinc-400 hover:text-black rounded-lg hover:bg-zinc-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-700">Due Title</label>
            <input
              type="text"
              required
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Fiber Broadband, Flat Rent, Gym Fee"
              className="w-full px-3.5 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-medium text-zinc-900 focus:outline-none focus:ring-2 focus:ring-black focus:bg-white"
            />
          </div>

          {/* Amount (₹) */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-700">Amount (₹)</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 font-mono font-bold text-lg">
                ₹
              </span>
              <input
                type="number"
                step="any"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full pl-8 pr-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-lg font-mono font-bold text-zinc-950 focus:outline-none focus:ring-2 focus:ring-black focus:bg-white"
              />
            </div>
          </div>

          {/* Due Day of Month & Category */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-700">Due Day (1-31)</label>
              <input
                type="number"
                min="1"
                max="31"
                required
                value={dueDayOfMonth}
                onChange={(e) => setDueDayOfMonth(e.target.value)}
                placeholder="5"
                className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-mono text-zinc-900 focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-700">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-black"
              >
                {DEFAULT_CATEGORIES.expense.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Payment Method */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-700">Usual Payment Mode</label>
            <div className="grid grid-cols-3 gap-2">
              {(['UPI / Bank', 'Card', 'Cash'] as PaymentMethod[]).map((method) => (
                <button
                  type="button"
                  key={method}
                  onClick={() => setPaymentMethod(method)}
                  className={`py-2 px-1 text-xs font-medium rounded-lg border transition-all ${
                    paymentMethod === method
                      ? 'bg-black text-white border-black shadow-sm font-semibold'
                      : 'bg-zinc-50 text-zinc-700 border-zinc-200 hover:bg-zinc-100'
                  }`}
                >
                  {method}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-700">Notes / Auto-debit Info</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Paid via GPay UPI Auto-pay on 5th"
              className="w-full px-3.5 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 pt-3 border-t border-zinc-100">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 bg-zinc-100 text-zinc-700 text-xs font-semibold rounded-xl hover:bg-zinc-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-4 bg-black text-white text-xs font-semibold rounded-xl hover:bg-zinc-800 transition-colors shadow-sm"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{initialData ? 'Update Due' : 'Save Recurring Due'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
