'use client';

import React, { useState, useEffect } from 'react';
import { TabItem, TabType } from '@/lib/types';
import { X, Users, ArrowDownLeft, ArrowUpRight, Check, User } from 'lucide-react';

interface TabModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (tab: Partial<TabItem>) => void;
  initialData?: TabItem | null;
}

export default function TabModal({ isOpen, onClose, onSave, initialData }: TabModalProps) {
  const [personName, setPersonName] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<TabType>('owed_to_you');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (initialData) {
      setPersonName(initialData.personName);
      setAmount(initialData.amount.toString());
      setType(initialData.type);
      setDescription(initialData.description);
      setDate(initialData.date);
      setNotes(initialData.notes || '');
    } else {
      setPersonName('');
      setAmount('');
      setType('owed_to_you');
      setDescription('');
      setDate(new Date().toISOString().split('T')[0]);
      setNotes('');
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0 || !personName.trim()) return;

    onSave({
      ...(initialData?.id ? { id: initialData.id } : {}),
      personName: personName.trim(),
      amount: parsedAmount,
      type,
      description: description.trim() || 'Tab',
      date,
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
              <Users className="w-5 h-5 text-black" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-950">
                {initialData ? 'Edit Tab' : 'Record Tab (Lent / Borrowed)'}
              </h3>
              <p className="text-xs text-zinc-500">Track money between friends &amp; colleagues</p>
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

        {/* Tab Type Switcher */}
        <div className="flex p-1 bg-zinc-100 rounded-xl border border-zinc-200">
          <button
            type="button"
            onClick={() => setType('owed_to_you')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all ${
              type === 'owed_to_you'
                ? 'bg-black text-white shadow-sm'
                : 'text-zinc-600 hover:text-black'
            }`}
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>Someone Owes Me</span>
          </button>
          <button
            type="button"
            onClick={() => setType('you_owe')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all ${
              type === 'you_owe'
                ? 'bg-black text-white shadow-sm'
                : 'text-zinc-600 hover:text-black'
            }`}
          >
            <ArrowDownLeft className="w-3.5 h-3.5" />
            <span>I Have to Give Back</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Person Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-700">Person&apos;s Name</label>
            <div className="relative">
              <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                required
                autoFocus
                value={personName}
                onChange={(e) => setPersonName(e.target.value)}
                placeholder="e.g. Rohan Sharma, Priya, Amit"
                className="w-full pl-9 pr-3.5 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-medium text-zinc-900 focus:outline-none focus:ring-2 focus:ring-black focus:bg-white transition-all"
              />
            </div>
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

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-700">Reason / Description</label>
            <input
              type="text"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Dinner bill split, Cab fare, Concert ticket"
              className="w-full px-3.5 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-black focus:bg-white"
            />
          </div>

          {/* Date */}
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

          {/* Optional notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-700">Notes (Optional)</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Split with 3 people, to pay via GPay"
              className="w-full px-3.5 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-black focus:bg-white"
            />
          </div>

          {/* Actions */}
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
              <span>{initialData ? 'Update Tab' : 'Record Tab'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
