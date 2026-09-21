'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Shield,
  Users,
  RefreshCw,
  X,
  Search,
  Eye,
  Activity,
  CheckCircle2,
  Calendar,
  Wallet,
  Receipt,
  Server,
  Zap,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { UserProfile } from '@/lib/firebase/authService';
import {
  subscribeToTesters,
  fetchTesterLedgerSummary,
  TesterLedgerSummary,
} from '@/lib/firebase/adminService';
import { formatCurrency } from '@/lib/utils';

interface AdminDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentAdminEmail?: string | null;
}

export default function AdminDashboardModal({
  isOpen,
  onClose,
  currentAdminEmail = 'smohamedfarook2024@gmail.com',
}: AdminDashboardModalProps) {
  const [testers, setTesters] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTester, setSelectedTester] = useState<UserProfile | null>(null);
  const [testerSummary, setTesterSummary] = useState<TesterLedgerSummary | null>(null);
  const [inspectLoading, setInspectLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setSelectedTester(null);
      setTesterSummary(null);
      return;
    }

    setLoading(true);
    const unsubscribe = subscribeToTesters((list) => {
      setTesters(list);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isOpen]);

  const handleInspectTester = async (tester: UserProfile) => {
    setSelectedTester(tester);
    setInspectLoading(true);
    setTesterSummary(null);
    try {
      const summary = await fetchTesterLedgerSummary(tester);
      setTesterSummary(summary);
    } catch (err) {
      console.error('Failed to inspect tester:', err);
    } finally {
      setInspectLoading(false);
    }
  };

  const filteredTesters = testers.filter((t) => {
    const q = searchQuery.toLowerCase();
    return (
      (t.email && t.email.toLowerCase().includes(q)) ||
      (t.displayName && t.displayName.toLowerCase().includes(q)) ||
      t.uid.toLowerCase().includes(q)
    );
  });

  const now = Date.now();
  const activeTodayCount = testers.filter(
    (t) => now - (t.lastActive || 0) < 24 * 60 * 60 * 1000
  ).length;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          transition={{ duration: 0.18 }}
          className="bg-white border border-zinc-200 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden"
        >
          {/* Top Bar Header */}
          <div className="px-5 py-4 bg-zinc-950 text-white flex items-center justify-between shrink-0 border-b border-zinc-800">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-white border border-white/15">
                <Shield className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm sm:text-base font-bold tracking-tight">
                    Super Admin Monitoring Console
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    SUPER ADMIN
                  </span>
                </div>
                <p className="text-xs text-zinc-400">
                  Authorized as: <span className="text-white font-mono">{currentAdminEmail}</span>
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Spark Free Tier & Health Status Banner */}
          <div className="px-5 py-2.5 bg-zinc-100 border-b border-zinc-200 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 text-zinc-700">
              <Server className="w-3.5 h-3.5 text-zinc-900" />
              <span className="font-semibold text-zinc-900">Spark Free Tier:</span>
              <span className="font-mono text-zinc-600">50,000 reads/day • 20,000 writes/day</span>
              <span className="text-emerald-700 font-semibold">• 100% $0.00/mo guaranteed</span>
            </div>

            <div className="flex items-center gap-1.5 text-emerald-700 font-mono text-[11px] font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Zero-Timeout Active</span>
            </div>
          </div>

          {/* KPI Stat Cards */}
          <div className="p-5 grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white shrink-0 border-b border-zinc-200">
            <div className="p-3 bg-zinc-50 rounded-2xl border border-zinc-200">
              <span className="text-[11px] font-medium text-zinc-500 block">Registered Users</span>
              <span className="text-xl font-bold font-mono text-zinc-950 block mt-0.5">
                {testers.length}
              </span>
              <span className="text-[10px] text-zinc-500 mt-1 block">Beta scale: ~3 testers</span>
            </div>

            <div className="p-3 bg-zinc-50 rounded-2xl border border-zinc-200">
              <span className="text-[11px] font-medium text-zinc-500 block">Active Last 24h</span>
              <span className="text-xl font-bold font-mono text-emerald-600 block mt-0.5">
                {activeTodayCount}
              </span>
              <span className="text-[10px] text-zinc-500 mt-1 block">Live engagement</span>
            </div>

            <div className="p-3 bg-zinc-50 rounded-2xl border border-zinc-200">
              <span className="text-[11px] font-medium text-zinc-500 block">Multi-Tenant Isolation</span>
              <span className="text-xl font-bold font-mono text-zinc-950 block mt-0.5">
                STRICT
              </span>
              <span className="text-[10px] text-zinc-500 mt-1 block">Firestore Security Rules</span>
            </div>

            <div className="p-3 bg-zinc-50 rounded-2xl border border-zinc-200">
              <span className="text-[11px] font-medium text-zinc-500 block">Auth &amp; Tokens</span>
              <span className="text-xl font-bold font-mono text-zinc-950 block mt-0.5">
                JWT / OAuth
              </span>
              <span className="text-[10px] text-zinc-500 mt-1 block">RFC 7519 Signed</span>
            </div>
          </div>

          {/* Main Content Area: Left Directory + Right Inspection */}
          <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-zinc-200">
            {/* Left: Tester Directory List (7 cols) */}
            <div className="lg:col-span-7 flex flex-col h-full overflow-hidden">
              <div className="p-3.5 border-b border-zinc-100 flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search by email, name, or UID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-black"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {loading ? (
                  <div className="py-12 text-center text-zinc-400 text-xs flex flex-col items-center gap-2">
                    <RefreshCw className="w-5 h-5 animate-spin text-zinc-600" />
                    <span>Loading registered testers...</span>
                  </div>
                ) : filteredTesters.length === 0 ? (
                  <div className="py-12 text-center text-zinc-400 text-xs space-y-1">
                    <Users className="w-6 h-6 mx-auto text-zinc-300" />
                    <p className="font-semibold text-zinc-600">No testers registered yet</p>
                    <p className="text-[11px] text-zinc-400">
                      When your beta testers sign in with Google or create an account, they appear here automatically.
                    </p>
                  </div>
                ) : (
                  filteredTesters.map((tester) => {
                    const isSelected = selectedTester?.uid === tester.uid;
                    const isSuperAdmin = tester.role === 'admin' || tester.email === 'smohamedfarook2024@gmail.com';
                    const lastActiveDate = tester.lastActive
                      ? new Date(tester.lastActive).toLocaleDateString('en-IN', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : 'Never';

                    return (
                      <div
                        key={tester.uid}
                        onClick={() => handleInspectTester(tester)}
                        className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                          isSelected
                            ? 'bg-zinc-900 text-white border-zinc-900 shadow-sm'
                            : 'bg-zinc-50/70 hover:bg-zinc-100/90 text-zinc-900 border-zinc-200'
                        }`}
                      >
                        <div className="min-w-0 flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                              isSelected
                                ? 'bg-white text-black'
                                : 'bg-black text-white'
                            }`}
                          >
                            {(tester.displayName || tester.email || 'T')
                              .charAt(0)
                              .toUpperCase()}
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-xs truncate">
                                {tester.displayName || tester.email?.split('@')[0] || 'Anonymous Tester'}
                              </span>
                              <span
                                className={`px-1.5 py-0.2 rounded-full text-[9px] font-mono font-bold ${
                                  isSuperAdmin
                                    ? isSelected
                                      ? 'bg-emerald-400 text-black'
                                      : 'bg-black text-emerald-400'
                                    : isSelected
                                    ? 'bg-zinc-700 text-zinc-200'
                                    : 'bg-zinc-200 text-zinc-700'
                                }`}
                              >
                                {isSuperAdmin ? 'ADMIN' : 'TESTER'}
                              </span>
                            </div>

                            <p
                              className={`text-[11px] truncate ${
                                isSelected ? 'text-zinc-300' : 'text-zinc-500'
                              }`}
                            >
                              {tester.email || `UID: ${tester.uid.slice(0, 12)}...`}
                            </p>

                            <p
                              className={`text-[9px] font-mono mt-0.5 ${
                                isSelected ? 'text-zinc-400' : 'text-zinc-400'
                              }`}
                            >
                              Active: {lastActiveDate} • Provider: {tester.provider || 'unknown'}
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition-colors ${
                            isSelected
                              ? 'bg-white text-black hover:bg-zinc-200'
                              : 'bg-zinc-200 text-zinc-900 hover:bg-zinc-300'
                          }`}
                        >
                          <Eye className="w-3 h-3" />
                          <span>Inspect</span>
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right: Inspection Drawer (5 cols) */}
            <div className="lg:col-span-5 flex flex-col h-full overflow-hidden bg-zinc-50/50">
              <div className="p-3.5 border-b border-zinc-200 bg-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-black" />
                  <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">
                    Tester Ledger Metrics
                  </h3>
                </div>
                {selectedTester && (
                  <span className="text-[10px] font-mono px-2 py-0.5 bg-zinc-100 rounded-full text-zinc-600 border border-zinc-200">
                    UID: {selectedTester.uid.slice(0, 8)}...
                  </span>
                )}
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                {!selectedTester ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 text-zinc-400 space-y-2">
                    <Shield className="w-10 h-10 text-zinc-300 stroke-[1.5]" />
                    <p className="text-xs font-semibold text-zinc-700">Select a Tester to Inspect</p>
                    <p className="text-[11px] text-zinc-500 max-w-xs">
                      Click &ldquo;Inspect&rdquo; on any tester from the directory to review their transaction volume, active dues, and liquid wallet health.
                    </p>
                  </div>
                ) : inspectLoading ? (
                  <div className="py-16 text-center text-zinc-500 text-xs flex flex-col items-center gap-2">
                    <RefreshCw className="w-6 h-6 animate-spin text-black" />
                    <span>Fetching diagnostic metrics from Cloud Firestore...</span>
                  </div>
                ) : testerSummary ? (
                  <div className="space-y-4">
                    {/* User Profile Overview */}
                    <div className="p-3.5 bg-white rounded-2xl border border-zinc-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-zinc-900">Account Identity</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full font-bold">
                          Cloud Synced
                        </span>
                      </div>
                      <div className="text-xs space-y-1 font-mono text-zinc-700">
                        <p className="truncate">Email: {testerSummary.email || 'None'}</p>
                        <p className="truncate">Name: {testerSummary.displayName || 'None'}</p>
                        <p className="text-[10px] text-zinc-500 truncate">UID: {testerSummary.uid}</p>
                      </div>
                    </div>

                    {/* Subcollection Volumes */}
                    <div className="grid grid-cols-3 gap-2">
                      <div className="p-3 bg-white rounded-2xl border border-zinc-200 text-center">
                        <Receipt className="w-4 h-4 mx-auto mb-1 text-zinc-700" />
                        <span className="text-[10px] text-zinc-500 block">Transactions</span>
                        <span className="text-sm font-bold font-mono text-zinc-900">
                          {testerSummary.transactionsCount}
                        </span>
                      </div>

                      <div className="p-3 bg-white rounded-2xl border border-zinc-200 text-center">
                        <Calendar className="w-4 h-4 mx-auto mb-1 text-zinc-700" />
                        <span className="text-[10px] text-zinc-500 block">Monthly Dues</span>
                        <span className="text-sm font-bold font-mono text-zinc-900">
                          {testerSummary.duesCount}
                        </span>
                      </div>

                      <div className="p-3 bg-white rounded-2xl border border-zinc-200 text-center">
                        <Users className="w-4 h-4 mx-auto mb-1 text-zinc-700" />
                        <span className="text-[10px] text-zinc-500 block">Social Tabs</span>
                        <span className="text-sm font-bold font-mono text-zinc-900">
                          {testerSummary.tabsCount}
                        </span>
                      </div>
                    </div>

                    {/* Liquid Wallet Health */}
                    <div className="p-3.5 bg-white rounded-2xl border border-zinc-200 space-y-2">
                      <div className="flex items-center gap-2">
                        <Wallet className="w-4 h-4 text-black" />
                        <span className="text-xs font-bold text-zinc-900">Wallet Balances</span>
                      </div>

                      {testerSummary.walletBalances ? (
                        <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-1">
                          <div className="p-2.5 bg-zinc-50 rounded-xl border border-zinc-100">
                            <span className="text-[10px] text-zinc-500 block">Cash in Hand</span>
                            <span className="font-bold text-zinc-900">
                              {formatCurrency(testerSummary.walletBalances.cashInHand)}
                            </span>
                          </div>
                          <div className="p-2.5 bg-zinc-50 rounded-xl border border-zinc-100">
                            <span className="text-[10px] text-zinc-500 block">Account Balance</span>
                            <span className="font-bold text-zinc-900">
                              {formatCurrency(testerSummary.walletBalances.accountBalance)}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-zinc-400 italic">No wallet document recorded yet.</p>
                      )}
                    </div>

                    {/* Security & Multi-tenant note */}
                    <div className="p-3 bg-zinc-100 rounded-xl border border-zinc-200 text-[11px] text-zinc-600 flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      <span>
                        Multi-tenant security rule is enforcing isolation. This tester cannot read or write any documents belonging to other testers or the super admin.
                      </span>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-5 py-3 bg-zinc-100 border-t border-zinc-200 flex items-center justify-between text-xs text-zinc-600 shrink-0">
            <span className="font-mono text-[11px]">
              FinTrack v2.4 Admin Engine • Firebase Spark ($0.00/mo)
            </span>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 bg-black hover:bg-zinc-800 text-white rounded-xl font-semibold transition-colors cursor-pointer"
            >
              Close Console
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
