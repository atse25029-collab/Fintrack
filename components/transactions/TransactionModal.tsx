'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Transaction, TransactionType, PaymentMethod, DEFAULT_CATEGORIES } from '@/lib/types';
import { getExactRealTime } from '@/lib/utils';
import { X, ArrowDownLeft, ArrowUpRight, ArrowRightLeft, Check } from 'lucide-react';

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      alert('Please enter a valid amount greater than 0');
      return;
    }

    const realTime = getExactRealTime();
    const resolvedType = type;

    onSave({
      ...(initialData?.id ? { id: initialData.id } : {}),
      type: resolvedType,
      amount: parsedAmount,
      category: category || (resolvedType === 'expense' ? 'Miscellaneous' : resolvedType === 'income' ? 'Other Inflows' : 'Internal Wallet Transfer'),
      description: description.trim() || category,
      date: date || realTime.date,
      time: time || realTime.time,
      timestamp: `${date || realTime.date}T${time || realTime.time}`,
      paymentMethod,
      transferDirection: initialData?.transferDirection || (resolvedType === 'transfer' ? (paymentMethod === 'Cash' ? 'account_to_cash' : 'cash_to_account') : undefined),
      notes: notes.trim(),
    });

    onClose();
  };

  const categories = DEFAULT_CATEGORIES[type] || DEFAULT_CATEGORIES.expense;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-xs"
            onClick={onClose}
          />

          {/* Dialog Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 14 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 14 }}
            transition={{ type: 'spring', stiffness: 450, damping: 30 }}
            className="relative z-10 bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-zinc-200 space-y-5 max-h-[90vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <div>
                <h3 className="text-base font-bold text-zinc-950">
                  {initialData
                    ? type === 'transfer'
                      ? 'Edit Transfer'
                      : 'Edit Transaction'
                    : type === 'expense'
                    ? 'Log Expense'
                    : type === 'income'
                    ? 'Log Income'
                    : 'Log Transfer'}
                </h3>
                <p className="text-xs text-zinc-500">Synced with live date &amp; time</p>
              </div>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                aria-label="Close modal"
                className="p-1 text-zinc-400 hover:text-black rounded-lg hover:bg-zinc-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </motion.button>
            </div>

            {/* Type Toggle Tabs with Animated Sliding Pill */}
            <div className="relative flex p-1 bg-zinc-100 rounded-xl border border-zinc-200">
              <button
                type="button"
                onClick={() => handleTypeChange('expense')}
                className={`relative z-10 flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  type === 'expense' ? 'text-white' : 'text-zinc-600 hover:text-black'
                }`}
              >
                {type === 'expense' && (
                  <motion.div
                    layoutId="txModalTypePill"
                    className="absolute inset-0 bg-black rounded-lg shadow-xs"
                    transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                  />
                )}
                <ArrowDownLeft className="w-3.5 h-3.5 relative z-10" />
                <span className="relative z-10">Expense</span>
              </button>
              <button
                type="button"
                onClick={() => handleTypeChange('income')}
                className={`relative z-10 flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  type === 'income' ? 'text-white' : 'text-zinc-600 hover:text-black'
                }`}
              >
                {type === 'income' && (
                  <motion.div
                    layoutId="txModalTypePill"
                    className="absolute inset-0 bg-black rounded-lg shadow-xs"
                    transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                  />
                )}
                <ArrowUpRight className="w-3.5 h-3.5 relative z-10" />
                <span className="relative z-10">Income</span>
              </button>
              <button
                type="button"
                onClick={() => handleTypeChange('transfer')}
                className={`relative z-10 flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  type === 'transfer' ? 'text-white' : 'text-zinc-600 hover:text-black'
                }`}
              >
                {type === 'transfer' && (
                  <motion.div
                    layoutId="txModalTypePill"
                    className="absolute inset-0 bg-black rounded-lg shadow-xs"
                    transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                  />
                )}
                <ArrowRightLeft className="w-3.5 h-3.5 relative z-10" />
                <span className="relative z-10">Transfer</span>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Amount input (₹) */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-700">Amount (₹)</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-mono font-bold text-zinc-400">
                    ₹
                  </span>
                  <input
                    type="number"
                    step="any"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    required
                    autoFocus
                    className="w-full pl-8 pr-3.5 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-base font-mono font-bold text-zinc-950 focus:outline-none focus:ring-2 focus:ring-black focus:bg-white"
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-700">Description / Item</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Swiggy order, Metro recharge, Freelance client"
                  required
                  className="w-full px-3.5 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-black focus:bg-white"
                />
              </div>

              {/* Category selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-700">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3.5 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-black focus:bg-white"
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Payment Method */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-700">Payment Mode / Wallet</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="w-full px-3.5 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-black focus:bg-white"
                >
                  <option value="UPI / Bank">UPI / Bank Account (Deducts/Adds to Account)</option>
                  <option value="Cash">Cash in Hand (Deducts/Adds to Hand)</option>
                  <option value="Card">Credit/Debit Card (Account)</option>
                  <option value="Other">Other Mode</option>
                </select>
              </div>

              {/* Date & Time */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-700">Date</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-black focus:bg-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-700">Time</label>
                  <input
                    type="time"
                    step="1"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-black focus:bg-white"
                  />
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
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.96 }}
                  onClick={onClose}
                  className="flex-1 py-2.5 px-4 bg-zinc-100 text-zinc-700 text-xs font-semibold rounded-xl hover:bg-zinc-200 transition-colors cursor-pointer"
                >
                  Cancel
                </motion.button>
                <motion.button
                  type="submit"
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.96 }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-4 bg-black text-white text-xs font-semibold rounded-xl hover:bg-zinc-800 transition-colors shadow-xs cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{initialData ? 'Update Transaction' : 'Save Transaction'}</span>
                </motion.button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
