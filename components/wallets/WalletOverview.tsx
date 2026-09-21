'use client';

import React from 'react';
import { motion } from 'motion/react';
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
            Liquid Funds & Balances
          </h2>
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.95 }}
          onClick={onOpenAdjustModal}
          className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] sm:text-xs font-medium text-zinc-700 hover:text-black bg-zinc-100 hover:bg-zinc-200 rounded-lg transition-colors shrink-0 cursor-pointer"
        >
          <SlidersHorizontal className="w-3 h-3 text-black" />
          <span>Adjust Balances</span>
        </motion.button>
      </div>

      {/* 3-Column Wallet Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3.5">
        {/* Money in Hand (Cash) */}
        <motion.div
          whileHover={{ y: -3 }}
          whileTap={{ scale: 0.98 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          onClick={onOpenAdjustModal}
          className="p-3.5 sm:p-4 rounded-xl bg-zinc-50 hover:bg-zinc-100/80 border border-zinc-200 transition-colors cursor-pointer group space-y-1"
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
            Physical wallet & cash in hand
          </p>
        </motion.div>

        {/* Money in Account (UPI / Card / Bank) */}
        <motion.div
          whileHover={{ y: -3 }}
          whileTap={{ scale: 0.98 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          onClick={onOpenAdjustModal}
          className="p-3.5 sm:p-4 rounded-xl bg-zinc-50 hover:bg-zinc-100/80 border border-zinc-200 transition-colors cursor-pointer group space-y-1"
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
            Bank, UPI & Cards linked
          </p>
        </motion.div>

        {/* Total Liquid Money */}
        <motion.div
          whileHover={{ y: -3 }}
          whileTap={{ scale: 0.98 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          className="p-3.5 sm:p-4 rounded-xl bg-zinc-900 text-white border border-zinc-900 space-y-1 sm:col-span-1 cursor-default"
        >
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
        </motion.div>
      </div>
    </div>
  );
}

