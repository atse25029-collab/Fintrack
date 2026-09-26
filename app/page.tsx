'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Header, { AppSection } from '@/components/layout/Header';
import BottomNav from '@/components/layout/BottomNav';
import WalletOverview from '@/components/wallets/WalletOverview';
import WalletAdjustModal from '@/components/wallets/WalletAdjustModal';
import QuickAddBar from '@/components/daily/QuickAddBar';
import QuickPresetModal from '@/components/daily/QuickPresetModal';
import DailyTimeline from '@/components/daily/DailyTimeline';
import TransactionModal from '@/components/transactions/TransactionModal';
import TransactionList from '@/components/transactions/TransactionList';
import ExportImportModal from '@/components/transactions/ExportImportModal';
import PwaCriteriaBadge from '@/components/pwa/PwaCriteriaBadge';

import TabsManager from '@/components/tabs/TabsManager';
import TabModal from '@/components/tabs/TabModal';
import MonthlyDuesManager from '@/components/dues/MonthlyDuesManager';
import MonthlyDueModal from '@/components/dues/MonthlyDueModal';
import AnalyticsView from '@/components/analytics/AnalyticsView';
import ProfileSection from '@/components/profile/ProfileSection';
import PasteSmsModal from '@/components/daily/PasteSmsModal';
import MonthlyStatementModal from '@/components/analytics/MonthlyStatementModal';
import { ParsedSmsTransaction } from '@/lib/parser/smsParser';
import { checkAndNotifyUpcomingDuesAndTabs } from '@/lib/notifications/notificationService';

import {
  Transaction,
  TabItem,
  MonthlyDue,
  PaymentMethod,
  TransactionType,
  WalletBalances,
  QuickPreset,
} from '@/lib/types';

import {
  INITIAL_TRANSACTIONS,
  INITIAL_TABS,
  INITIAL_MONTHLY_DUES,
  DEFAULT_WALLETS,
  DEFAULT_QUICK_PRESETS,
} from '@/lib/sampleData';
import {
  calculateFinancialStats,
  calculateCategoryBreakdown,
  calculateRecentCashflow,
  calculateMonthlyDueReminders,
  getExactRealTime,
  getLocalDateString,
} from '@/lib/utils';
import {
  getLocalTransactions,
  setLocalTransactions,
  getLocalTabs,
  setLocalTabs,
  getLocalDues,
  setLocalDues,
  getLocalWallets,
  setLocalWallets,
  getLocalQuickPresets,
  setLocalQuickPresets,
  syncWithVercelServer,
} from '@/lib/storage/clientStorage';
import { Plus } from 'lucide-react';

export default function HomePage() {
  const [currentSection, setCurrentSection] = useState<AppSection>('daily');

  // Core Data
  const [transactions, setTransactions] = useState<Transaction[]>(INITIAL_TRANSACTIONS);
  const [tabs, setTabs] = useState<TabItem[]>(INITIAL_TABS);
  const [dues, setDues] = useState<MonthlyDue[]>(INITIAL_MONTHLY_DUES);
  const [wallets, setWallets] = useState<WalletBalances>(DEFAULT_WALLETS);
  const [presets, setPresets] = useState<QuickPreset[]>(DEFAULT_QUICK_PRESETS);

  // Modals state
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [txModalDefaultType, setTxModalDefaultType] = useState<TransactionType>('expense');

  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [isPresetModalOpen, setIsPresetModalOpen] = useState(false);

  const [isTabModalOpen, setIsTabModalOpen] = useState(false);
  const [editingTab, setEditingTab] = useState<TabItem | null>(null);

  const [isDueModalOpen, setIsDueModalOpen] = useState(false);
  const [editingDue, setEditingDue] = useState<MonthlyDue | null>(null);

  const [isPasteSmsOpen, setIsPasteSmsOpen] = useState(false);
  const [isStatementOpen, setIsStatementOpen] = useState(false);

  // Initial load from storage (purges any transactions before Sep 4, 2026)
  useEffect(() => {
    const rawTxs = getLocalTransactions();
    const validTxs = rawTxs.filter((tx) => !tx.date || tx.date >= '2026-09-04');
    if (validTxs.length !== rawTxs.length) {
      setLocalTransactions(validTxs);
    }
    setTransactions(validTxs);

    setTabs(getLocalTabs());
    setDues(getLocalDues());
    setWallets(getLocalWallets());
    setPresets(getLocalQuickPresets());

    // Background serverless fallback sync
    syncWithVercelServer().then((synced) => {
      if (synced) {
        if (synced.transactions?.length) {
          const filtered = synced.transactions.filter(
            (tx: Transaction) => !tx.date || tx.date >= '2026-09-04'
          );
          setTransactions(filtered);
          setLocalTransactions(filtered);
        }
        if (synced.tabs?.length) setTabs(synced.tabs);
        if (synced.dues?.length) setDues(synced.dues);
      }
    });

    const handleStorageChange = () => {
      const updatedTxs = getLocalTransactions().filter(
        (tx) => !tx.date || tx.date >= '2026-09-04'
      );
      setTransactions(updatedTxs);
      setTabs(getLocalTabs());
      setDues(getLocalDues());
      setWallets(getLocalWallets());
      setPresets(getLocalQuickPresets());
    };

    window.addEventListener('fintrack_data_changed', handleStorageChange);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('fintrack_data_changed', handleStorageChange);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Check URL params or broadcast channel for direct section navigation
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const sectionParam = urlParams.get('section');
      if (
        sectionParam &&
        ['daily', 'tabs', 'dues', 'analytics', 'profile'].includes(sectionParam)
      ) {
        setCurrentSection(sectionParam as AppSection);
      }

      if ('BroadcastChannel' in window) {
        const channel = new BroadcastChannel('fintrack_navigation');
        channel.onmessage = (event) => {
          if (
            event.data?.section &&
            ['daily', 'tabs', 'dues', 'analytics', 'profile'].includes(event.data.section)
          ) {
            setCurrentSection(event.data.section as AppSection);
          }
        };
        return () => channel.close();
      }
    }
  }, []);

  // Periodic device notifications for upcoming monthly dues and unsettled peer tabs
  useEffect(() => {
    const runCheck = () => {
      checkAndNotifyUpcomingDuesAndTabs(dues, tabs);
    };

    const initialTimer = setTimeout(runCheck, 5000);
    const intervalTimer = setInterval(runCheck, 1000 * 60 * 60 * 4);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(intervalTimer);
    };
  }, [dues, tabs]);

  // Wallet balance impact calculator
  const applyWalletImpact = (
    currentWallets: WalletBalances,
    amount: number,
    type: TransactionType,
    paymentMethod: PaymentMethod,
    direction: 'apply' | 'revert'
  ): WalletBalances => {
    const isCash = paymentMethod === 'Cash';
    const sign = direction === 'apply' ? (type === 'income' ? 1 : -1) : (type === 'income' ? -1 : 1);
    const delta = amount * sign;

    const safeCash = Math.max(0, currentWallets.cashInHand || 0);
    const safeAccount = Math.max(0, currentWallets.accountBalance || 0);

    return {
      cashInHand: isCash
        ? Math.max(0, Math.round((safeCash + delta) * 100) / 100)
        : safeCash,
      accountBalance: !isCash
        ? Math.max(0, Math.round((safeAccount + delta) * 100) / 100)
        : safeAccount,
      lastUpdated: Date.now(),
    };
  };

  const updateWalletsForTransaction = useCallback(
    (amount: number, type: TransactionType, paymentMethod: PaymentMethod) => {
      const isCash = paymentMethod === 'Cash';
      const delta = type === 'income' ? amount : -amount;

      const current = getLocalWallets();
      const safeCash = Math.max(0, current.cashInHand || 0);
      const safeAccount = Math.max(0, current.accountBalance || 0);

      const nextWallets: WalletBalances = {
        cashInHand: isCash
          ? Math.max(0, Math.round((safeCash + delta) * 100) / 100)
          : safeCash,
        accountBalance: !isCash
          ? Math.max(0, Math.round((safeAccount + delta) * 100) / 100)
          : safeAccount,
        lastUpdated: Date.now(),
      };

      setLocalWallets(nextWallets);
      fetch('/api/wallets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nextWallets),
      }).catch(() => {});

      return nextWallets;
    },
    []
  );

  // --- Transactions Handlers ---
  const handleSaveTransaction = useCallback(
    (data: Partial<Transaction>) => {
      const realTime = getExactRealTime();
      const now = Date.now();
      let updatedWallets: WalletBalances = getLocalWallets();

      setTransactions((prev) => {
        let updated: Transaction[];

        if (data.id) {
          // Editing existing transaction
          const existing = prev.find((t) => t.id === data.id);
          if (existing) {
            // Revert old impact on wallet
            setWallets((w) => {
              const currentW = w || getLocalWallets();
              const reverted = applyWalletImpact(
                currentW,
                existing.amount,
                existing.type,
                existing.paymentMethod,
                'revert'
              );
              const newAmount = typeof data.amount === 'number' ? data.amount : existing.amount;
              const newType = data.type || existing.type;
              const newMethod = data.paymentMethod || existing.paymentMethod;
              const finalWallets = applyWalletImpact(reverted, newAmount, newType, newMethod, 'apply');
              setLocalWallets(finalWallets);
              updatedWallets = finalWallets;
              return finalWallets;
            });
          }

          updated = prev.map((t) =>
            t.id === data.id
              ? ({
                  ...t,
                  ...data,
                  date: data.date || t.date || realTime.date,
                  time: data.time || t.time || realTime.time,
                  timestamp: data.timestamp || t.timestamp || realTime.timestamp,
                  synced: false,
                } as Transaction)
              : t
          );
        } else {
          // New transaction
          const newTx: Transaction = {
            id: `tx-${now}-${Math.random().toString(36).substring(2, 7)}`,
            type: data.type || 'expense',
            amount: data.amount || 0,
            category: data.category || 'Miscellaneous',
            description: data.description || 'Quick Expense',
            date: data.date || realTime.date,
            time: data.time || realTime.time,
            timestamp: realTime.timestamp,
            paymentMethod: data.paymentMethod || 'UPI / Bank',
            notes: data.notes || '',
            isMonthlyDue: data.isMonthlyDue || false,
            createdAt: now,
            synced: false,
          };

          // Update wallet balances
          setWallets((w) => {
            const currentW = w || getLocalWallets();
            const next = applyWalletImpact(currentW, newTx.amount, newTx.type, newTx.paymentMethod, 'apply');
            setLocalWallets(next);
            updatedWallets = next;
            return next;
          });

          updated = [newTx, ...prev];
        }

        // Enforce no pre-Sep 4 2026 transactions
        const filtered = updated.filter((tx) => !tx.date || tx.date >= '2026-09-04');
        setLocalTransactions(filtered);

        // Async server backup
        fetch('/api/transactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data.id ? data : updated[0]),
        }).catch(() => {});

        return filtered;
      });

      setIsTxModalOpen(false);
      setEditingTx(null);
    },
    []
  );

  const handleDeleteTransaction = useCallback(
    (id: string) => {
      setTransactions((prev) => {
        const existing = prev.find((t) => t.id === id);
        if (existing) {
          setWallets((w) => {
            const currentW = w || getLocalWallets();
            const reverted = applyWalletImpact(
              currentW,
              existing.amount,
              existing.type,
              existing.paymentMethod,
              'revert'
            );
            setLocalWallets(reverted);
            return reverted;
          });
        }
        const updated = prev.filter((t) => t.id !== id);
        setLocalTransactions(updated);
        return updated;
      });

      fetch(`/api/transactions?id=${id}`, { method: 'DELETE' }).catch(() => {});
    },
    []
  );

  // Quick 1-Tap Add handler
  const handleQuickAdd = useCallback(
    (item: {
      description: string;
      amount: number;
      category: string;
      type: 'expense' | 'income';
      paymentMethod: PaymentMethod;
    }) => {
      const realTime = getExactRealTime();
      const now = Date.now();

      const newTx: Transaction = {
        id: `tx-${now}-${Math.random().toString(36).substring(2, 7)}`,
        type: item.type,
        amount: item.amount,
        category: item.category,
        description: item.description,
        date: realTime.date,
        time: realTime.time,
        timestamp: realTime.timestamp,
        paymentMethod: item.paymentMethod,
        notes: '1-Tap Quick Log',
        createdAt: now,
        synced: false,
      };

      setWallets((w) => {
        const currentW = w || getLocalWallets();
        const next = applyWalletImpact(currentW, newTx.amount, newTx.type, newTx.paymentMethod, 'apply');
        setLocalWallets(next);
        return next;
      });

      setTransactions((prev) => {
        const updated = [newTx, ...prev].filter((t) => !t.date || t.date >= '2026-09-04');
        setLocalTransactions(updated);
        return updated;
      });

      fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTx),
      }).catch(() => {});
    },
    []
  );

  // --- Monthly Dues Handlers ---
  const handleSaveDue = useCallback(
    (dueData: Partial<MonthlyDue>) => {
      setDues((prev) => {
        let updated: MonthlyDue[];
        if (dueData.id) {
          updated = prev.map((d) => (d.id === dueData.id ? ({ ...d, ...dueData } as MonthlyDue) : d));
        } else {
          const newDue: MonthlyDue = {
            id: `due-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            title: dueData.title || 'Untitled Bill',
            amount: dueData.amount || 0,
            category: dueData.category || 'Bills & Utilities',
            dueDayOfMonth: dueData.dueDayOfMonth || 1,
            paymentMethod: dueData.paymentMethod || 'UPI / Bank',
            status: dueData.status || 'pending',
            notes: dueData.notes || '',
            createdAt: Date.now(),
          };
          updated = [newDue, ...prev];
        }

        setLocalDues(updated);
        fetch('/api/dues', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dueData.id ? dueData : updated[0]),
        }).catch(() => {});

        return updated;
      });

      setIsDueModalOpen(false);
      setEditingDue(null);
    },
    []
  );

  const handlePayAndRecordDue = useCallback(
    (due: MonthlyDue) => {
      const today = getLocalDateString(new Date());
      const realTime = getExactRealTime();

      setDues((prev) => {
        const updated = prev.map((d) =>
          d.id === due.id
            ? { ...d, status: 'paid' as const, lastPaidDate: today }
            : d
        );
        setLocalDues(updated);
        fetch('/api/dues', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...due, status: 'paid', lastPaidDate: today }),
        }).catch(() => {});
        return updated;
      });

      handleSaveTransaction({
        type: 'expense',
        amount: due.amount,
        category: due.category,
        description: `Monthly Due: ${due.title}`,
        paymentMethod: due.paymentMethod,
        isMonthlyDue: true,
        notes: `Paid & auto-recorded on ${today} at ${realTime.time}`,
      });
    },
    [handleSaveTransaction]
  );

  const handleDeleteDue = useCallback(
    (id: string) => {
      setDues((prev) => {
        const updated = prev.filter((d) => d.id !== id);
        setLocalDues(updated);
        return updated;
      });

      fetch(`/api/dues?id=${id}`, { method: 'DELETE' }).catch(() => {});
    },
    []
  );

  // --- Tabs Handlers ---
  const handleSaveTab = useCallback(
    (tabData: Partial<TabItem>) => {
      setTabs((prev) => {
        let updated: TabItem[];
        if (tabData.id) {
          updated = prev.map((t) => (t.id === tabData.id ? ({ ...t, ...tabData } as TabItem) : t));
        } else {
          const newTab: TabItem = {
            id: `tab-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            personName: tabData.personName || 'Unnamed Person',
            amount: tabData.amount || 0,
            type: tabData.type || 'owed_to_you',
            description: tabData.description || 'Split',
            date: tabData.date || getLocalDateString(new Date()),
            status: tabData.status || 'pending',
            notes: tabData.notes || '',
            createdAt: Date.now(),
          };
          updated = [newTab, ...prev];
        }

        setLocalTabs(updated);
        fetch('/api/tabs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(tabData.id ? tabData : updated[0]),
        }).catch(() => {});

        return updated;
      });

      setIsTabModalOpen(false);
      setEditingTab(null);
    },
    []
  );

  const handleSettleTab = useCallback(
    (
      tab: TabItem,
      paymentMethod: 'Cash' | 'UPI / Bank' = 'UPI / Bank',
      recordTransaction: boolean = true
    ) => {
      const now = Date.now();
      const realTime = getExactRealTime();

      setTabs((prev) => {
        const updated = prev.map((t) =>
          t.id === tab.id
            ? { ...t, status: 'settled' as const, settledAt: now }
            : t
        );
        setLocalTabs(updated);
        fetch('/api/tabs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...tab, status: 'settled', settledAt: now }),
        }).catch(() => {});
        return updated;
      });

      if (recordTransaction) {
        if (tab.type === 'owed_to_you') {
          handleSaveTransaction({
            type: 'income',
            amount: tab.amount,
            category: 'Tab Settlement / Repayment',
            description: `Repayment received: ${tab.personName} settled tab (${tab.description})`,
            paymentMethod: paymentMethod,
            notes: `Auto-recorded upon settling tab on ${realTime.date}`,
          });
        } else {
          handleSaveTransaction({
            type: 'expense',
            amount: tab.amount,
            category: 'Miscellaneous',
            description: `Debt paid: Repaid ${tab.personName} for ${tab.description}`,
            paymentMethod: paymentMethod,
            notes: `Auto-recorded upon debt repayment on ${realTime.date}`,
          });
        }
      }
    },
    [handleSaveTransaction]
  );

  const handleDeleteTab = useCallback(
    (id: string) => {
      setTabs((prev) => {
        const updated = prev.filter((t) => t.id !== id);
        setLocalTabs(updated);
        return updated;
      });

      fetch(`/api/tabs?id=${id}`, { method: 'DELETE' }).catch(() => {});
    },
    []
  );

  // --- Wallets Handlers ---
  const handleSaveWallets = useCallback(
    (updated: WalletBalances) => {
      const safeWallets = {
        cashInHand: Math.max(0, updated.cashInHand || 0),
        accountBalance: Math.max(0, updated.accountBalance || 0),
        lastUpdated: Date.now(),
      };
      setWallets(safeWallets);
      setLocalWallets(safeWallets);
      fetch('/api/wallets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(safeWallets),
      }).catch(() => {});
      setIsWalletModalOpen(false);
    },
    []
  );

  // --- Quick Presets Handlers ---
  const handleSavePresets = useCallback(
    (updated: QuickPreset[]) => {
      setPresets(updated);
      setLocalQuickPresets(updated);
      fetch('/api/presets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      }).catch(() => {});
    },
    []
  );

  const handleResetPresets = useCallback(() => {
    setPresets(DEFAULT_QUICK_PRESETS);
    setLocalQuickPresets(DEFAULT_QUICK_PRESETS);
    fetch('/api/presets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(DEFAULT_QUICK_PRESETS),
    }).catch(() => {});
  }, []);

  // --- Bank SMS Parsed Confirmation ---
  const handleConfirmSmsTx = useCallback(
    (parsed: ParsedSmsTransaction) => {
      handleSaveTransaction({
        type: parsed.type,
        amount: parsed.amount,
        description: parsed.description,
        category: parsed.category,
        paymentMethod: parsed.paymentMethod,
        notes: `Extracted via SMS Parser (${parsed.description})`,
      });
      setIsPasteSmsOpen(false);
    },
    [handleSaveTransaction]
  );

  // --- Import / Reset / Clear ---
  const handleImportTransactions = useCallback(
    (importedTxs: Partial<Transaction>[]) => {
      const now = Date.now();
      const realTime = getExactRealTime();

      const newTxs: Transaction[] = importedTxs
        .filter((imp) => !imp.date || imp.date >= '2026-09-04')
        .map((imp, idx) => ({
          id: imp.id || `tx-imp-${now}-${idx}`,
          type: imp.type || 'expense',
          amount: imp.amount || 0,
          category: imp.category || 'Miscellaneous',
          description: imp.description || 'Imported Transaction',
          date: imp.date || realTime.date,
          time: imp.time || realTime.time,
          timestamp: imp.timestamp || realTime.timestamp,
          paymentMethod: imp.paymentMethod || 'UPI / Bank',
          notes: imp.notes || 'CSV Import',
          createdAt: imp.createdAt || now,
          synced: false,
        }));

      setTransactions((prev) => {
        const combined = [...newTxs, ...prev].filter((t) => !t.date || t.date >= '2026-09-04');
        setLocalTransactions(combined);
        return combined;
      });

      fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batch: newTxs }),
      }).catch(() => {});

      setIsExportModalOpen(false);
    },
    []
  );

  const handleResetSampleData = useCallback(() => {
    setTransactions(INITIAL_TRANSACTIONS);
    setLocalTransactions(INITIAL_TRANSACTIONS);

    setTabs(INITIAL_TABS);
    setLocalTabs(INITIAL_TABS);

    setDues(INITIAL_MONTHLY_DUES);
    setLocalDues(INITIAL_MONTHLY_DUES);

    setWallets(DEFAULT_WALLETS);
    setLocalWallets(DEFAULT_WALLETS);

    setPresets(DEFAULT_QUICK_PRESETS);
    setLocalQuickPresets(DEFAULT_QUICK_PRESETS);

    fetch('/api/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reset: true }),
    }).catch(() => {});

    setIsExportModalOpen(false);
  }, []);

  const handleClearAll = useCallback(() => {
    setTransactions([]);
    setLocalTransactions([]);

    setTabs([]);
    setLocalTabs([]);

    setDues([]);
    setLocalDues([]);

    const emptyWallets: WalletBalances = {
      cashInHand: 0,
      accountBalance: 0,
      lastUpdated: Date.now(),
    };
    setWallets(emptyWallets);
    setLocalWallets(emptyWallets);

    fetch('/api/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clearAll: true }),
    }).catch(() => {});

    setIsExportModalOpen(false);
  }, []);

  const handleCloudSyncSuccess = useCallback(
    (cloudData: {
      transactions?: Transaction[];
      wallets?: WalletBalances;
      tabs?: TabItem[];
      dues?: MonthlyDue[];
      presets?: QuickPreset[];
    }) => {
      if (cloudData.transactions) {
        const filtered = cloudData.transactions.filter(
          (t) => !t.date || t.date >= '2026-09-04'
        );
        setTransactions(filtered);
        setLocalTransactions(filtered);
      }
      if (cloudData.wallets) {
        setWallets(cloudData.wallets);
        setLocalWallets(cloudData.wallets);
      }
      if (cloudData.tabs) {
        setTabs(cloudData.tabs);
        setLocalTabs(cloudData.tabs);
      }
      if (cloudData.dues) {
        setDues(cloudData.dues);
        setLocalDues(cloudData.dues);
      }
      if (cloudData.presets) {
        setPresets(cloudData.presets);
        setLocalQuickPresets(cloudData.presets);
      }
    },
    []
  );

  const dueAlertCount = useMemo(() => {
    const reminders = calculateMonthlyDueReminders(dues);
    return reminders.filter((r) => !r.isPaidThisMonth && (r.isOverdue || r.isDueToday)).length;
  }, [dues]);

  return (
    <div className="min-h-screen w-full bg-[#f4f4f5] flex flex-col selection:bg-black selection:text-white">
      {/* Top Navbar */}
      <Header
        currentSection={currentSection}
        onSelectSection={setCurrentSection}
        onOpenAddModal={() => {
          setEditingTx(null);
          setTxModalDefaultType('expense');
          setIsTxModalOpen(true);
        }}
        onOpenExportModal={() => setIsExportModalOpen(true)}
        dueAlertCount={dueAlertCount}
      />

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-3.5 sm:px-6 lg:px-8 py-3.5 sm:py-6 pb-28 md:pb-8 space-y-4 sm:space-y-6">
        <AnimatePresence mode="wait">
          {/* VIEW 1: HOME (LIQUID FUNDS & TODAY'S ACTIVITY) */}
          {currentSection === 'daily' && (
            <motion.div
              key="daily"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="space-y-4 sm:space-y-5 w-full max-w-full overflow-hidden"
            >
              {/* Top Liquid Funds & Wallet Balances */}
              <WalletOverview
                wallets={wallets}
                onOpenAdjustModal={() => setIsWalletModalOpen(true)}
              />

              {/* Today's Activity Stream & Quick 1-Tap Actions */}
              <section className="space-y-3.5 sm:space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-xs sm:text-sm font-extrabold uppercase font-mono tracking-wider text-black">
                    Today&apos;s Activity
                  </h2>
                  <PwaCriteriaBadge />
                </div>

                <DailyTimeline
                  transactions={transactions}
                  onDelete={handleDeleteTransaction}
                  onEdit={(tx) => {
                    setEditingTx(tx);
                    setIsTxModalOpen(true);
                  }}
                  onLogFirst={() => {
                    setEditingTx(null);
                    setTxModalDefaultType('expense');
                    setIsTxModalOpen(true);
                  }}
                />

                <QuickAddBar
                  presets={presets}
                  onOpenPresetManager={() => setIsPresetModalOpen(true)}
                  onQuickAdd={handleQuickAdd}
                  onOpenCustomModal={(type) => {
                    setEditingTx(null);
                    setTxModalDefaultType(type);
                    setIsTxModalOpen(true);
                  }}
                  onOpenPasteSms={() => setIsPasteSmsOpen(true)}
                />
              </section>

              {/* Transaction History */}
              <section className="pt-2 border-t border-zinc-200">
                <TransactionList
                  transactions={transactions}
                  onDelete={handleDeleteTransaction}
                  onEdit={(tx) => {
                    setEditingTx(tx);
                    setIsTxModalOpen(true);
                  }}
                  onAddNew={() => {
                    setEditingTx(null);
                    setTxModalDefaultType('expense');
                    setIsTxModalOpen(true);
                  }}
                />
              </section>
            </motion.div>
          )}

          {/* VIEW 2: TABS (LENT & BORROWED / SPLITS) */}
          {currentSection === 'tabs' && (
            <motion.div
              key="tabs"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="w-full max-w-full overflow-hidden"
            >
              <TabsManager
                tabs={tabs}
                onSaveTab={handleSaveTab}
                onSettleTab={handleSettleTab}
                onDeleteTab={handleDeleteTab}
                onOpenAddModal={() => {
                  setEditingTab(null);
                  setIsTabModalOpen(true);
                }}
                onEditTab={(tab) => {
                  setEditingTab(tab);
                  setIsTabModalOpen(true);
                }}
              />
            </motion.div>
          )}

          {/* VIEW 3: MONTHLY DUES (RECURRING BILLS & REMINDERS) */}
          {currentSection === 'dues' && (
            <motion.div
              key="dues"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="w-full max-w-full overflow-hidden"
            >
              <MonthlyDuesManager
                dues={dues}
                onSaveDue={handleSaveDue}
                onPayAndRecord={handlePayAndRecordDue}
                onDeleteDue={handleDeleteDue}
                onOpenAddModal={() => {
                  setEditingDue(null);
                  setIsDueModalOpen(true);
                }}
                onEditDue={(due) => {
                  setEditingDue(due);
                  setIsDueModalOpen(true);
                }}
              />
            </motion.div>
          )}

          {/* VIEW 4: DEDICATED ANALYTICS */}
          {currentSection === 'analytics' && (
            <motion.div
              key="analytics"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="w-full max-w-full overflow-hidden"
            >
              <AnalyticsView
                transactions={transactions}
                wallets={wallets}
                dues={dues}
                tabs={tabs}
                onOpenStatement={() => setIsStatementOpen(true)}
                onNavigateToTabs={() => setCurrentSection('tabs')}
              />
            </motion.div>
          )}

          {/* VIEW 5: USER PROFILE & SETTINGS */}
          {currentSection === 'profile' && (
            <motion.div
              key="profile"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="w-full max-w-full overflow-hidden"
            >
              <ProfileSection
                transactions={transactions}
                wallets={wallets}
                tabs={tabs}
                dues={dues}
                presets={presets}
                onCloudSyncSuccess={handleCloudSyncSuccess}
                onClearAllData={handleClearAll}
                onOpenStatement={() => setIsStatementOpen(true)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Mobile Floating Log Button */}
      <motion.button
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.92 }}
        onClick={() => {
          if (currentSection === 'tabs') {
            setEditingTab(null);
            setIsTabModalOpen(true);
          } else if (currentSection === 'dues') {
            setEditingDue(null);
            setIsDueModalOpen(true);
          } else {
            setEditingTx(null);
            setTxModalDefaultType('expense');
            setIsTxModalOpen(true);
          }
        }}
        aria-label="Add new item"
        className="md:hidden fixed bottom-20 right-3.5 z-40 p-3 bg-black text-white rounded-full shadow-2xl hover:bg-zinc-800 transition-colors border border-zinc-800 cursor-pointer"
      >
        <Plus className="w-5 h-5 stroke-[2.5]" />
      </motion.button>

      {/* Footer */}
      <footer className="mt-8 md:mt-12 py-6 md:py-8 pb-24 md:pb-8 border-t border-zinc-200 bg-white/50 text-center text-xs text-zinc-500 font-mono space-y-2 px-3">
        <p>FinTrack &bull; Indian Rupee (₹) &bull; Progressive Web App &bull; Vercel Ready</p>
        <div className="flex flex-wrap justify-center items-center gap-2.5 text-[11px] text-zinc-400">
          <button onClick={handleResetSampleData} className="hover:text-black transition-colors underline">
            Reset Sample Data
          </button>
          <span>&bull;</span>
          <button onClick={() => setIsExportModalOpen(true)} className="hover:text-black transition-colors underline">
            Export / Backup
          </button>
        </div>
      </footer>

      {/* Modals */}
      <TransactionModal
        isOpen={isTxModalOpen}
        onClose={() => {
          setIsTxModalOpen(false);
          setEditingTx(null);
        }}
        onSave={handleSaveTransaction}
        initialData={editingTx}
        defaultType={txModalDefaultType}
      />

      <ExportImportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        transactions={transactions}
        onImportTransactions={handleImportTransactions}
        onResetSampleData={handleResetSampleData}
        onClearAll={handleClearAll}
      />

      <WalletAdjustModal
        isOpen={isWalletModalOpen}
        onClose={() => setIsWalletModalOpen(false)}
        currentWallets={wallets}
        onSave={handleSaveWallets}
      />

      <QuickPresetModal
        isOpen={isPresetModalOpen}
        onClose={() => setIsPresetModalOpen(false)}
        presets={presets}
        onSavePresets={handleSavePresets}
        onResetDefaults={handleResetPresets}
      />

      <TabModal
        isOpen={isTabModalOpen}
        onClose={() => {
          setIsTabModalOpen(false);
          setEditingTab(null);
        }}
        onSave={handleSaveTab}
        initialData={editingTab}
      />

      <MonthlyDueModal
        isOpen={isDueModalOpen}
        onClose={() => {
          setIsDueModalOpen(false);
          setEditingDue(null);
        }}
        onSave={handleSaveDue}
        initialData={editingDue}
      />

      {/* Bank SMS Clipboard Parser Modal */}
      <PasteSmsModal
        isOpen={isPasteSmsOpen}
        onClose={() => setIsPasteSmsOpen(false)}
        onConfirmTransaction={handleConfirmSmsTx}
      />

      {/* Monthly Financial Statement PDF / CSV Modal */}
      <MonthlyStatementModal
        isOpen={isStatementOpen}
        onClose={() => setIsStatementOpen(false)}
        transactions={transactions}
        wallets={wallets}
      />

      {/* Mobile Bottom Navigation */}
      <BottomNav
        currentSection={currentSection}
        onSelectSection={setCurrentSection}
        dueAlertCount={dueAlertCount}
      />
    </div>
  );
}
