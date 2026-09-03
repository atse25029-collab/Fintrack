'use client';

import React, { useState } from 'react';
import { Transaction } from '@/lib/types';
import { exportTransactionsToCSV, parseCSVToTransactions } from '@/lib/utils';
import { X, Download, Upload, RotateCcw, Trash2, Check, AlertTriangle } from 'lucide-react';

interface ExportImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: Transaction[];
  onImportTransactions: (imported: Partial<Transaction>[]) => void;
  onResetSampleData: () => void;
  onClearAll: () => void;
}

export default function ExportImportModal({
  isOpen,
  onClose,
  transactions,
  onImportTransactions,
  onResetSampleData,
  onClearAll,
}: ExportImportModalProps) {
  const [csvInput, setCsvInput] = useState('');
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  // Handle Export
  const handleExport = () => {
    const csvContent = exportTransactionsToCSV(transactions);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `fintrack-export-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setMessage('Transactions exported to CSV!');
  };

  // Handle File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        const parsed = parseCSVToTransactions(text);
        if (parsed.length > 0) {
          onImportTransactions(parsed);
          setMessage(`Successfully imported ${parsed.length} transactions!`);
        } else {
          setMessage('No valid transactions found in CSV file.');
        }
      }
    };
    reader.readAsText(file);
  };

  // Handle Manual Paste
  const handlePasteImport = () => {
    if (!csvInput.trim()) return;
    const parsed = parseCSVToTransactions(csvInput);
    if (parsed.length > 0) {
      onImportTransactions(parsed);
      setMessage(`Successfully imported ${parsed.length} transactions!`);
      setCsvInput('');
    } else {
      setMessage('Invalid CSV format. Please include headers or check rows.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-zinc-200 space-y-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
          <div>
            <h3 className="text-base font-bold text-zinc-950">Data Management & Backup</h3>
            <p className="text-xs text-zinc-500">Export CSV, import records, or restore sample data</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="p-1 text-zinc-400 hover:text-black rounded-lg hover:bg-zinc-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {message && (
          <div className="p-3 bg-zinc-100 text-zinc-900 rounded-xl text-xs flex items-center gap-2 border border-zinc-200 font-medium">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>{message}</span>
          </div>
        )}

        {/* Section 1: Export */}
        <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200 space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-xs font-bold text-zinc-900">Export to CSV</h4>
              <p className="text-[11px] text-zinc-500">
                Download a clean spreadsheet of all {transactions.length} transactions
              </p>
            </div>
            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-black text-white text-xs font-semibold rounded-lg hover:bg-zinc-800 transition-colors shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Section 2: Import */}
        <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200 space-y-3">
          <h4 className="text-xs font-bold text-zinc-900">Import Transactions (CSV)</h4>

          <div className="flex items-center gap-2">
            <label className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-white text-zinc-800 text-xs font-semibold rounded-lg border border-zinc-300 hover:bg-zinc-100 cursor-pointer transition-colors">
              <Upload className="w-3.5 h-3.5" />
              <span>Select CSV File</span>
              <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>

          <div className="space-y-1.5">
            <textarea
              rows={2}
              value={csvInput}
              onChange={(e) => setCsvInput(e.target.value)}
              placeholder="Or paste CSV text directly here..."
              className="w-full p-2.5 bg-white border border-zinc-200 rounded-lg text-xs font-mono focus:outline-none focus:ring-1 focus:ring-black"
            />
            {csvInput.trim() && (
              <button
                onClick={handlePasteImport}
                className="w-full py-1.5 bg-black text-white text-xs font-semibold rounded-lg hover:bg-zinc-800 transition-colors"
              >
                Import Pasted CSV
              </button>
            )}
          </div>
        </div>

        {/* Section 3: Reset or Clear */}
        <div className="pt-2 border-t border-zinc-100 flex flex-col sm:flex-row gap-2">
          <button
            onClick={() => {
              onResetSampleData();
              setMessage('Reset to initial sample data.');
            }}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-zinc-100 text-zinc-800 text-xs font-semibold rounded-xl hover:bg-zinc-200 transition-colors border border-zinc-200"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restore Sample Data</span>
          </button>

          {!showClearConfirm ? (
            <button
              onClick={() => setShowClearConfirm(true)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-zinc-100 text-zinc-600 hover:text-red-600 text-xs font-semibold rounded-xl hover:bg-red-50 transition-colors border border-zinc-200"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear All Data</span>
            </button>
          ) : (
            <button
              onClick={() => {
                onClearAll();
                setShowClearConfirm(false);
                setMessage('All transactions cleared.');
              }}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-red-600 text-white text-xs font-semibold rounded-xl hover:bg-red-700 transition-colors"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Confirm Clear Everything</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
