'use client';

import React, { useState } from 'react';
import { QuickPreset, PaymentMethod, DEFAULT_CATEGORIES } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import {
  X,
  Plus,
  Trash2,
  Edit2,
  Check,
  Coffee,
  Utensils,
  ShoppingCart,
  Bus,
  Fuel,
  Zap,
  Smartphone,
  Gift,
  Heart,
  Tag,
  RotateCcw,
} from 'lucide-react';

interface QuickPresetModalProps {
  isOpen: boolean;
  onClose: () => void;
  presets: QuickPreset[];
  onSavePresets: (presets: QuickPreset[]) => void;
  onResetDefaults: () => void;
}

const AVAILABLE_ICONS = [
  { name: 'coffee' as const, icon: Coffee, label: 'Chai / Coffee' },
  { name: 'utensils' as const, icon: Utensils, label: 'Food / Meal' },
  { name: 'shopping-cart' as const, icon: ShoppingCart, label: 'Groceries' },
  { name: 'bus' as const, icon: Bus, label: 'Metro / Auto' },
  { name: 'fuel' as const, icon: Fuel, label: 'Petrol' },
  { name: 'zap' as const, icon: Zap, label: 'Bills' },
  { name: 'smartphone' as const, icon: Smartphone, label: 'Recharge' },
  { name: 'gift' as const, icon: Gift, label: 'Gift' },
  { name: 'heart' as const, icon: Heart, label: 'Health' },
  { name: 'tag' as const, icon: Tag, label: 'Other' },
];

export function getPresetIcon(iconName?: string) {
  const found = AVAILABLE_ICONS.find((i) => i.name === iconName);
  return found ? found.icon : Tag;
}

export default function QuickPresetModal({
  isOpen,
  onClose,
  presets,
  onSavePresets,
  onResetDefaults,
}: QuickPresetModalProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [label, setLabel] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(DEFAULT_CATEGORIES.expense[0]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('UPI / Bank');
  const [iconName, setIconName] = useState<QuickPreset['iconName']>('coffee');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleStartEdit = (preset: QuickPreset) => {
    setEditingId(preset.id);
    setLabel(preset.label);
    setAmount(preset.amount.toString());
    setCategory(preset.category);
    setPaymentMethod(preset.paymentMethod);
    setIconName(preset.iconName || 'tag');
    setError(null);
  };

  const handleCancelForm = () => {
    setEditingId(null);
    setLabel('');
    setAmount('');
    setError(null);
  };

  const handleSavePresetForm = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (!label.trim()) {
      setError('Please enter a preset name / label');
      return;
    }
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Please enter a valid amount greater than ₹0');
      return;
    }

    if (editingId) {
      // Update existing
      const updated = presets.map((p) =>
        p.id === editingId
          ? {
              ...p,
              label: label.trim(),
              amount: parsedAmount,
              category,
              paymentMethod,
              iconName,
            }
          : p
      );
      onSavePresets(updated);
    } else {
      // Add new
      const newPreset: QuickPreset = {
        id: `preset-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
        label: label.trim(),
        amount: parsedAmount,
        category,
        paymentMethod,
        iconName,
      };
      onSavePresets([...presets, newPreset]);
    }

    handleCancelForm();
  };

  const handleDeletePreset = (id: string) => {
    if (presets.length <= 1) {
      setError('You must keep at least 1 quick-tap preset');
      return;
    }
    onSavePresets(presets.filter((p) => p.id !== id));
    if (editingId === id) handleCancelForm();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3.5 sm:p-4 bg-black/40 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-5 sm:p-6 shadow-2xl border border-zinc-200 animate-in zoom-in-95 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-zinc-950">
              Customise Quick 1-Tap Logs
            </h3>
            <p className="text-[11px] sm:text-xs text-zinc-500">
              Add, edit, or remove your frequent 1-tap expense buttons
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-black rounded-lg hover:bg-zinc-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="p-2.5 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200">
            {error}
          </div>
        )}

        {/* Existing Presets List */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-zinc-700">
            <span>Your Quick Presets ({presets.length})</span>
            <button
              type="button"
              onClick={onResetDefaults}
              className="flex items-center gap-1 text-[11px] text-zinc-500 hover:text-black transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Defaults</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {presets.map((preset) => {
              const Icon = getPresetIcon(preset.iconName);
              const isEditing = editingId === preset.id;

              return (
                <div
                  key={preset.id}
                  className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                    isEditing
                      ? 'bg-zinc-100 border-black ring-1 ring-black'
                      : 'bg-zinc-50 border-zinc-200 hover:border-zinc-300'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <div className="p-1.5 rounded-lg bg-white border border-zinc-200 shrink-0">
                      <Icon className="w-3.5 h-3.5 text-black" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold text-black truncate">
                        {preset.label}
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-zinc-500">
                        <span>{formatCurrency(preset.amount)}</span>
                        <span>&bull;</span>
                        <span className="truncate">{preset.paymentMethod.split(' ')[0]}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0 ml-2">
                    <button
                      type="button"
                      onClick={() => handleStartEdit(preset)}
                      className="p-1 text-zinc-400 hover:text-black rounded hover:bg-zinc-200"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeletePreset(preset.id)}
                      className="p-1 text-zinc-400 hover:text-red-600 rounded hover:bg-zinc-200"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Form: Add or Edit Preset */}
        <form
          onSubmit={handleSavePresetForm}
          className="p-4 bg-zinc-50 rounded-2xl border border-zinc-200 space-y-3 pt-3.5"
        >
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-zinc-900">
              {editingId ? 'Edit Preset' : 'Add New Preset'}
            </h4>
            {editingId && (
              <button
                type="button"
                onClick={handleCancelForm}
                className="text-[11px] text-zinc-500 hover:text-black"
              >
                Cancel Edit
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* Label */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-zinc-700">Preset Name</label>
              <input
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g. Masala Chai"
                className="w-full px-3 py-1.5 bg-white border border-zinc-200 rounded-xl text-xs text-black focus:outline-none focus:ring-2 focus:ring-black"
                required
              />
            </div>

            {/* Amount */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-zinc-700">Amount (₹)</label>
              <input
                type="number"
                step="any"
                min="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g. 30"
                className="w-full px-3 py-1.5 bg-white border border-zinc-200 rounded-xl text-xs font-mono font-bold text-black focus:outline-none focus:ring-2 focus:ring-black"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* Category */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-zinc-700">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white border border-zinc-200 rounded-xl text-xs text-black focus:outline-none focus:ring-2 focus:ring-black"
              >
                {DEFAULT_CATEGORIES.expense.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Payment Method */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-zinc-700">Payment Wallet</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full px-2.5 py-1.5 bg-white border border-zinc-200 rounded-xl text-xs text-black focus:outline-none focus:ring-2 focus:ring-black"
              >
                <option value="UPI / Bank">UPI / Bank (Money in Account)</option>
                <option value="Cash">Cash (Money in Hand)</option>
                <option value="Card">Card (Money in Account)</option>
              </select>
            </div>
          </div>

          {/* Icon Selector */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-zinc-700">Choose Icon</label>
            <div className="flex flex-wrap gap-1.5">
              {AVAILABLE_ICONS.map((item) => {
                const IconComp = item.icon;
                const isSelected = iconName === item.name;
                return (
                  <button
                    key={item.name}
                    type="button"
                    onClick={() => setIconName(item.name)}
                    className={`p-2 rounded-xl border transition-all flex items-center gap-1 text-[11px] ${
                      isSelected
                        ? 'bg-black text-white border-black shadow-xs font-semibold'
                        : 'bg-white text-zinc-700 border-zinc-200 hover:border-zinc-400'
                    }`}
                  >
                    <IconComp className="w-3.5 h-3.5" />
                  </button>
                );
              })}
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-2 bg-black text-white text-xs font-semibold rounded-xl hover:bg-zinc-800 transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
          >
            {editingId ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
            <span>{editingId ? 'Update Preset' : 'Add Preset'}</span>
          </button>
        </form>

        <div className="pt-2 border-t border-zinc-100 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-zinc-900 text-white text-xs font-semibold rounded-xl hover:bg-zinc-800 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
