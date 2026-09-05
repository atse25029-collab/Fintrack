'use client';

import React, { useState } from 'react';
import { parseBankSms, ParsedSmsTransaction } from '@/lib/parser/smsParser';
import { formatCurrency } from '@/lib/utils';
import { X, MessageSquare, Clipboard, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';

interface PasteSmsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmTransaction: (parsed: ParsedSmsTransaction) => void;
}

export default function PasteSmsModal({
  isOpen,
  onClose,
  onConfirmTransaction,
}: PasteSmsModalProps) {
  const [smsText, setSmsText] = useState('');
  const [parsed, setParsed] = useState<ParsedSmsTransaction | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handlePasteFromClipboard = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text) {
          setSmsText(text);
          processText(text);
          return;
        }
      }
    } catch {
      // clipboard access denied or unsupported, fallback to manual paste
    }
  };

  const processText = (text: string) => {
    setError(null);
    if (!text.trim()) {
      setParsed(null);
      return;
    }
    const result = parseBankSms(text);
    if (result) {
      setParsed(result);
    } else {
      setParsed(null);
      setError('Could not detect amount or transaction details. Try editing or entering manually.');
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setSmsText(val);
    processText(val);
  };

  const handleApply = () => {
    if (parsed) {
      onConfirmTransaction(parsed);
      setSmsText('');
      setParsed(null);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white border border-zinc-200 rounded-3xl w-full max-w-md p-5 sm:p-6 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-zinc-100 rounded-xl text-black">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-950">Paste Bank / UPI SMS</h3>
              <p className="text-[11px] text-zinc-500">1-Tap instant transaction extraction</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Input Area */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-zinc-700">Paste bank alert message:</label>
            <button
              type="button"
              onClick={handlePasteFromClipboard}
              className="flex items-center gap-1 text-[11px] text-black font-semibold hover:underline"
            >
              <Clipboard className="w-3 h-3" />
              <span>Paste Clipboard</span>
            </button>
          </div>

          <textarea
            rows={3}
            value={smsText}
            onChange={handleTextChange}
            placeholder="e.g. Rs 180.00 debited from A/c XX1234 on 05-Sep-26 to ZOMATO. UPI Ref 382910..."
            className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-2xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-black"
          />
        </div>

        {/* Parsed Result Preview */}
        {parsed && (
          <div className="p-3.5 bg-zinc-100/70 rounded-2xl border border-zinc-300/80 space-y-2.5 animate-in fade-in">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-500 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-black" />
                Detected Transaction
              </span>
              <span
                className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-md ${
                  parsed.type === 'expense'
                    ? 'bg-red-100 text-red-700'
                    : 'bg-emerald-100 text-emerald-700'
                }`}
              >
                {parsed.type.toUpperCase()}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-[10px] text-zinc-500 block">Amount</span>
                <span className="text-base font-mono font-black text-zinc-950">
                  {formatCurrency(parsed.amount)}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-zinc-500 block">Category</span>
                <span className="font-semibold text-zinc-900 truncate block">
                  {parsed.category}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-zinc-500 block">Description / Payee</span>
                <span className="font-semibold text-zinc-900 truncate block">
                  {parsed.description}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-zinc-500 block">Payment Method</span>
                <span className="font-semibold text-zinc-900 block">
                  {parsed.paymentMethod}
                </span>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700 flex items-center gap-2">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-zinc-600 hover:text-zinc-900 rounded-xl hover:bg-zinc-100"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!parsed}
            onClick={handleApply}
            className="px-5 py-2 bg-black hover:bg-zinc-800 disabled:opacity-40 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-sm transition-all active:scale-95"
          >
            <span>Log Transaction</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
