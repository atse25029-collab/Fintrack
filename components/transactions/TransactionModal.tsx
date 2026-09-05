'use client';

import React, { useState, useEffect } from 'react';
import { Transaction, TransactionType, PaymentMethod, DEFAULT_CATEGORIES } from '@/lib/types';
import { getExactRealTime } from '@/lib/utils';
import { X, ArrowDownLeft, ArrowUpRight, Check } from 'lucide-react';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (tx: Partial<Transaction>) => void;
  initialData?: Transaction | null;
  defaultType?: TransactionType;
}

export default function TransactionModal({
  isOpen,
  onClose,
  onSave,
  initialData,
  defaultType = 'expense',
}: TransactionModalProps) {
  const [type, setType] = useState<TransactionType>(defaultType);
  const [amount, setAmount] = useState<string>('');
  const [category, setCategory] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('UPI / Bank');
  const [notes, setNotes] = useState<string>('');

  useEffect(() => {
    if (initialData) {
      setType(initialData.type);
      setAmount(initialData.amount.toString());
      setCategory(initialData.category);
      setDescription(initialData.description);
      setDate(initialData.date);
      setTime(initialData.time || '12:00:00');
      setPaymentMethod(initialData.paymentMethod);
      setNotes(initialData.notes || '');
    } else {
      const realTime = getExactRealTime();
      setType(defaultType);
      setAmount('');
      const defaultCats = DEFAULT_CATEGORIES[defaultType];
      setCategory(defaultCats[0] || 'Chai & Snacks');
      setDescription('');
      setDate(realTime.date);
      setTime(realTime.time);
      setPaymentMethod('UPI / Bank');
      setNotes('');
    }
  }, [initialData, defaultType, isOpen]);

  const handleTypeChange = (newType: TransactionType) => {
    setType(newType);
    if (!initialData) {
      setCategory(DEFAULT_CATEGORIES[newType][0] || 'Miscellaneous');
      setPaymentMethod('UPI / Bank');
    }
  };

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0) return;

    const realTime = getExactRealTime();
    const catLower = (category || '').toLowerCase();
    const isExplicitInflow =
      type === 'income' ||
      catLower.includes('inflow') ||
      catLower.includes('salary') ||
      catLower.includes('wage');

    const resolvedType: TransactionType = isExplicitInflow ? 'income' : type;

    onSave({
      ...(initialData?.id ? { id: initialData.id } : {}),
      type: resolvedType,
      amount: parsedAmount,
      category: category || (resolvedType === 'expense' ? 'Miscellaneous' : 'Other Inflows'),
      description: description.trim() || category,
      date: date || realTime.date,
      time: time || realTime.time,
      timestamp: `${date || realTime.date}T${time || realTime.time}`,
      paymentMethod,
      notes: notes.trim(),
    });

    onClose();
  };

  const categories = DEFAULT_CATEGORIES[type];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-zinc-200 space-y-5 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
          <div>
            <h3 className="text-base font-bold text-zinc-950">
              {initialData ? 'Edit Transaction' : type === 'expense' ? 'Log Expense' : 'Log Income'}
            </h3>
            <p className="text-xs text-zinc-500">Synced with live date &amp; time</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="p-1 text-zinc-400 hover:text-black rounded-lg hover:bg-zinc-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Type Toggle Tabs */}
        <div className="flex p-1 bg-zinc-100 rounded-xl border border-zinc-200">
          <button
            type="button"
            onClick={() => handleTypeChange('expense')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all ${
              type === 'expense'
                ? 'bg-black text-white shadow-sm'
                : 'text-zinc-600 hover:text-black'
            }`}
          >
            <ArrowDownLeft className="w-3.5 h-3.5" />
            <span>Expense</span>
          </button>
          <button
            type="button"
            onClick={() => handleTypeChange('income')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all ${
              type === 'income'
                ? 'bg-black text-white shadow-sm'
                : 'text-zinc-600 hover:text-black'
            }`}
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>Income</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Amount input (₹) */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-700">Amount (₹)</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 font-mono font-bold text-xl">
                ₹
              </span>
              <input
                type="number"
                step="any"
                required
                autoFocus
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full pl-9 pr-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-xl font-mono font-bold text-zinc-950 focus:outline-none focus:ring-2 focus:ring-black focus:bg-white transition-all"
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-700">Description / Merchant</label>
            <input
              type="text"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={type === 'expense' ? 'e.g. Swiggy lunch, Chai with team, Metro pass' : 'e.g. Salary, Consulting fee'}
              className="w-full px-3.5 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-medium text-zinc-900 focus:outline-none focus:ring-2 focus:ring-black focus:bg-white transition-all"
            />
          </div>

          {/* Category Select */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-700">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-medium text-zinc-900 focus:outline-none focus:ring-2 focus:ring-black focus:bg-white transition-all"
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Real-Time Date & Time Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-700">Date</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3.5 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-mono text-zinc-900 focus:outline-none focus:ring-2 focus:ring-black focus:bg-white"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-700">Time (Real-Time)</label>
              <input
                type="text"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                placeholder="HH:mm:ss"
                className="w-full px-3.5 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-mono text-zinc-900 focus:outline-none focus:ring-2 focus:ring-black focus:bg-white"
              />
            </div>
          </div>

          {/* Payment Method */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-700">Payment Mode</label>
            <div className="grid grid-cols-4 gap-2">
              {(['UPI / Bank', 'Card', 'Cash', 'Other'] as PaymentMethod[]).map((method) => (
                <button
                  type="button"
                  key={method}
                  onClick={() => setPaymentMethod(method)}
                  className={`py-2 px-1 rounded-lg text-xs font-medium border text-center transition-all ${
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

          {/* Optional Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-700">Notes (Optional)</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Paid via PhonePe, split with friend"
              className="w-full px-3.5 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-black focus:bg-white"
            />
          </div>

          {/* Submit Actions */}
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
              <span>{initialData ? 'Update Transaction' : 'Save Transaction'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
