'use client';

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Camera,
  Upload,
  Sparkles,
  AlertCircle,
  ArrowRight,
  RefreshCw,
  Edit3,
  CheckCircle2,
} from 'lucide-react';
import { DEFAULT_CATEGORIES, PaymentMethod, TransactionType } from '@/lib/types';

export interface ScannedTransactionResult {
  amount: number;
  description: string;
  category: string;
  type: TransactionType;
  paymentMethod: PaymentMethod;
  date: string;
  needsApiKey?: boolean;
}

interface ReceiptScanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (result: ScannedTransactionResult) => void;
}

export default function ReceiptScanModal({
  isOpen,
  onClose,
  onConfirm,
}: ReceiptScanModalProps) {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ScannedTransactionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelected = (file: File) => {
    setError(null);
    setResult(null);

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setImagePreview(base64);
      triggerScan(base64, file.type || 'image/jpeg');
    };
    reader.readAsDataURL(file);
  };

  const triggerScan = async (base64Image: string, mimeType: string) => {
    setScanning(true);
    setError(null);

    try {
      const res = await fetch('/api/ai/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64Image, mimeType }),
      });

      const json = await res.json();
      if (json.success && json.data) {
        setResult({
          amount: json.data.amount || 0,
          description: json.data.description || 'Receipt Purchase',
          category: json.data.category || 'Food & Dining',
          type: json.data.type || 'expense',
          paymentMethod: json.data.paymentMethod || 'UPI / Bank',
          date: json.data.date || new Date().toISOString().split('T')[0],
          needsApiKey: json.data.needsApiKey,
        });
      } else {
        throw new Error(json.error || 'Failed to extract bill data');
      }
    } catch (err: any) {
      setError(err.message || 'Error processing image');
    } finally {
      setScanning(false);
    }
  };

  const handleUpdateField = <K extends keyof ScannedTransactionResult>(
    field: K,
    val: ScannedTransactionResult[K]
  ) => {
    if (!result) return;
    setResult({
      ...result,
      [field]: val,
    });
  };

  const handleApply = () => {
    if (result) {
      onConfirm(result);
      handleReset();
      onClose();
    }
  };

  const handleReset = () => {
    setImagePreview(null);
    setResult(null);
    setError(null);
    setScanning(false);
  };

  const categoryOptions = result?.type === 'income'
    ? DEFAULT_CATEGORIES.income
    : DEFAULT_CATEGORIES.expense;

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
            className="relative z-10 bg-white border border-zinc-200 rounded-3xl w-full max-w-md p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-zinc-100 rounded-xl text-black">
                  <Camera className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-950">AI Receipt &amp; UPI Scanner</h3>
                  <p className="text-[11px] text-zinc-500">Scan bill or screenshot with editable fields</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-full hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Hidden File Inputs */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileSelected(file);
              }}
            />
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileSelected(file);
              }}
            />

            {/* Upload / Capture Buttons */}
            {!imagePreview && (
              <div className="grid grid-cols-2 gap-3 py-4">
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="flex flex-col items-center justify-center p-5 bg-zinc-50 hover:bg-zinc-100 border-2 border-dashed border-zinc-300 rounded-2xl gap-2 transition-all active:scale-95 group cursor-pointer"
                >
                  <div className="p-3 bg-black text-white rounded-full group-hover:scale-105 transition-transform">
                    <Camera className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold text-zinc-900">Take Photo</span>
                  <span className="text-[10px] text-zinc-500">Camera</span>
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center justify-center p-5 bg-zinc-50 hover:bg-zinc-100 border-2 border-dashed border-zinc-300 rounded-2xl gap-2 transition-all active:scale-95 group cursor-pointer"
                >
                  <div className="p-3 bg-zinc-200 text-zinc-800 rounded-full group-hover:scale-105 transition-transform">
                    <Upload className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold text-zinc-900">Upload Image</span>
                  <span className="text-[10px] text-zinc-500">Screenshot / Gallery</span>
                </button>
              </div>
            )}

            {/* Image Preview & Processing State */}
            {imagePreview && (
              <div className="space-y-3">
                <div className="relative rounded-2xl overflow-hidden border border-zinc-200 bg-zinc-900 max-h-48 flex items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imagePreview}
                    alt="Receipt Preview"
                    className="max-h-48 w-auto object-contain"
                  />
                  <button
                    type="button"
                    onClick={handleReset}
                    className="absolute top-2 right-2 p-1.5 bg-black/70 hover:bg-black text-white rounded-full text-xs cursor-pointer"
                    title="Retake"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {scanning && (
                  <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-2xl flex items-center justify-center gap-2 text-xs font-semibold text-zinc-800">
                    <RefreshCw className="w-4 h-4 animate-spin text-black" />
                    <span>Gemini AI is analyzing receipt &amp; UPI fields...</span>
                  </div>
                )}
              </div>
            )}

            {/* Parsed & Inline Editable Result Preview */}
            {result && (
              <div className="p-3.5 bg-zinc-50 rounded-2xl border border-zinc-200 space-y-3 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-500 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-black" />
                    AI Extracted &amp; Editable Fields
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      handleUpdateField('type', result.type === 'expense' ? 'income' : 'expense')
                    }
                    className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-md cursor-pointer transition-colors ${
                      result.type === 'expense'
                        ? 'bg-red-100 text-red-700 hover:bg-red-200'
                        : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                    }`}
                  >
                    {result.type.toUpperCase()} (Toggle)
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2.5 text-xs">
                  {/* Amount */}
                  <div className="space-y-1">
                    <label className="text-[10px] text-zinc-500 flex items-center gap-1 font-semibold">
                      <Edit3 className="w-2.5 h-2.5" /> Total Amount (₹)
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={result.amount === 0 ? '' : result.amount}
                      onChange={(e) =>
                        handleUpdateField('amount', parseFloat(e.target.value) || 0)
                      }
                      className="w-full p-2 bg-white border border-zinc-300 rounded-xl font-mono font-bold text-sm text-zinc-950 focus:outline-none focus:ring-2 focus:ring-black"
                    />
                  </div>

                  {/* Category */}
                  <div className="space-y-1">
                    <label className="text-[10px] text-zinc-500 flex items-center gap-1 font-semibold">
                      <Edit3 className="w-2.5 h-2.5" /> Category
                    </label>
                    <select
                      value={result.category}
                      onChange={(e) => handleUpdateField('category', e.target.value)}
                      className="w-full p-2 bg-white border border-zinc-300 rounded-xl text-xs font-semibold text-zinc-900 focus:outline-none focus:ring-2 focus:ring-black"
                    >
                      {categoryOptions.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                      {!categoryOptions.includes(result.category) && (
                        <option value={result.category}>{result.category}</option>
                      )}
                    </select>
                  </div>

                  {/* Merchant / Payee */}
                  <div className="col-span-2 space-y-1">
                    <label className="text-[10px] text-zinc-500 flex items-center gap-1 font-semibold">
                      <Edit3 className="w-2.5 h-2.5" /> Merchant / Description
                    </label>
                    <input
                      type="text"
                      value={result.description}
                      onChange={(e) => handleUpdateField('description', e.target.value)}
                      className="w-full p-2 bg-white border border-zinc-300 rounded-xl text-xs font-medium text-zinc-900 focus:outline-none focus:ring-2 focus:ring-black"
                    />
                  </div>

                  {/* Payment Method */}
                  <div className="col-span-2 space-y-1">
                    <label className="text-[10px] text-zinc-500 block font-semibold">
                      Payment Method
                    </label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {(['UPI / Bank', 'Cash', 'Card'] as PaymentMethod[]).map((method) => {
                        const isSelected = result.paymentMethod === method;
                        return (
                          <button
                            key={method}
                            type="button"
                            onClick={() => handleUpdateField('paymentMethod', method)}
                            className={`py-1.5 px-2 rounded-xl text-xs font-medium border text-center transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-black text-white border-black font-semibold'
                                : 'bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-100'
                            }`}
                          >
                            {method}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Date */}
                  <div className="col-span-2 space-y-1">
                    <label className="text-[10px] text-zinc-500 block font-semibold">
                      Transaction Date
                    </label>
                    <input
                      type="date"
                      value={result.date}
                      onChange={(e) => handleUpdateField('date', e.target.value)}
                      className="w-full p-2 bg-white border border-zinc-300 rounded-xl text-xs font-mono text-zinc-900 focus:outline-none focus:ring-2 focus:ring-black"
                    />
                  </div>
                </div>

                {result.needsApiKey && (
                  <p className="text-[10px] text-zinc-500 border-t border-zinc-200 pt-1.5">
                    💡 Tip: Add <code className="font-mono bg-zinc-200 px-1 rounded">GEMINI_API_KEY</code> to your environment for live OCR extraction.
                  </p>
                )}
              </div>
            )}

            {error && (
              <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 text-red-600" />
                <span>{error}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100">
              <motion.button
                whileTap={{ scale: 0.96 }}
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-zinc-600 hover:text-zinc-900 rounded-xl hover:bg-zinc-100 cursor-pointer"
              >
                Cancel
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.96 }}
                type="button"
                disabled={!result || scanning || result.amount <= 0}
                onClick={handleApply}
                className="px-5 py-2 bg-black hover:bg-zinc-800 disabled:opacity-40 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
              >
                <span>Confirm &amp; Log</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </motion.button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
