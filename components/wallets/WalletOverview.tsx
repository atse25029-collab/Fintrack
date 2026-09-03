'use client';

import React from 'react';
import { WalletBalances } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { Banknote, Building2, SlidersHorizontal, ShieldCheck } from 'lucide-react';

interface WalletOverviewProps {
  wallets: WalletBalances;
  onOpenAdjustModal: () => void;
}

export default function WalletOverview({
  wallets,
  onOpenAdjustModal,
}: WalletOverviewProps) {
  const totalLiquid = wallets.cashInHand + wallets.accountBalance;

  return (
    <div className="bg-white rounded-2xl p-4 sm:p-5 border border-zinc-200 shadow-sm w-full max-w-full overflow-hidden space-y-3.5">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-2 h-2 rounded-full bg-black shrink-0" />
          <h2 className="text-[11px] sm:text-xs font-mono font-bold uppercase tracking-wider text-zinc-500 truncate">
            Liquid Funds &amp; Balances
          </h2>
        </div>

        <button
          onClick={onOpenAdjustModal}
          className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] sm:text-xs font-medium text-zinc-700 hover:text-black bg-zinc-100 hover:bg-zinc-200 rounded-lg transition-colors shrink-0"
        >
          <SlidersHorizontal className="w-3 h-3 text-black" />
          <span>Adjust Balances</span>
        </button>
      </div>

      {/* 3-Column Wallet Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3.5">
        {/* Money in Hand (Cash) */}
        <div
          onClick={onOpenAdjustModal}
          className="p-3.5 sm:p-4 rounded-xl bg-zinc-50 hover:bg-zinc-100/80 border border-zinc-200 transition-all cursor-pointer group space-y-1"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-medium text-zinc-500">
              Money in Hand (Cash)
            </span>
            <div className="p-1.5 rounded-lg bg-white border border-zinc-200 text-zinc-900 group-hover:border-black transition-colors shrink-0">
              <Banknote className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-mono font-bold text-black truncate">
            {formatCurrency(wallets.cashInHand)}
          </div>
          <p className="text-[10px] text-zinc-400 truncate">
            Physical wallet &amp; cash in hand
          </p>
        </div>

        {/* Money in Account (UPI / Card / Bank) */}
        <div
          onClick={onOpenAdjustModal}
          className="p-3.5 sm:p-4 rounded-xl bg-zinc-50 hover:bg-zinc-100/80 border border-zinc-200 transition-all cursor-pointer group space-y-1"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-medium text-zinc-500">
              Money in Account
            </span>
            <div className="p-1.5 rounded-lg bg-white border border-zinc-200 text-zinc-900 group-hover:border-black transition-colors shrink-0">
              <Building2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-mono font-bold text-black truncate">
            {formatCurrency(wallets.accountBalance)}
          </div>
          <p className="text-[10px] text-zinc-400 truncate">
            Bank, UPI &amp; Cards linked
          </p>
        </div>

        {/* Total Liquid Money */}
        <div className="p-3.5 sm:p-4 rounded-xl bg-zinc-900 text-white border border-zinc-900 space-y-1 sm:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-mono text-zinc-400 font-medium">
              Total Available Liquidity
            </span>
            <div className="p-1.5 rounded-lg bg-zinc-800 text-white shrink-0">
              <ShieldCheck className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-mono font-bold text-white truncate">
            {formatCurrency(totalLiquid)}
          </div>
          <p className="text-[10px] text-zinc-400 truncate">
            Cash + Account total
          </p>
        </div>
      </div>
    </div>
  );
}
