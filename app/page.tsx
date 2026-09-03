'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Header, { AppSection } from '@/components/layout/Header';
import BottomNav from '@/components/layout/BottomNav';
import WalletOverview from '@/components/wallets/WalletOverview';
import WalletAdjustModal from '@/components/wallets/WalletAdjustModal';
import DailyOverview from '@/components/daily/DailyOverview';
import QuickAddBar from '@/components/daily/QuickAddBar';
import QuickPresetModal from '@/components/daily/QuickPresetModal';
import DailyTimeline from '@/components/daily/DailyTimeline';
import FinancialSummary from '@/components/dashboard/FinancialSummary';
import SpendingChart from '@/components/dashboard/SpendingChart';
import CategoryBreakdown from '@/components/dashboard/CategoryBreakdown';
import BudgetTargetModal from '@/components/dashboard/BudgetTargetModal';
import TransactionModal from '@/components/transactions/TransactionModal';
import TransactionList from '@/components/transactions/TransactionList';
import ExportImportModal from '@/components/transactions/ExportImportModal';
import PwaCriteriaBadge from '@/components/pwa/PwaCriteriaBadge';

import TabsManager from '@/components/tabs/TabsManager';
import TabModal from '@/components/tabs/TabModal';
import MonthlyDuesManager from '@/components/dues/MonthlyDuesManager';
import MonthlyDueModal from '@/components/dues/MonthlyDueModal';
import AnalyticsView from '@/components/analytics/AnalyticsView';

import {
  Transaction,
  BudgetConfig,
  TabItem,
  MonthlyDue,
  PaymentMethod,
  TransactionType,
  WalletBalances,
  QuickPreset,
} from '@/lib/types';
import {
  INITIAL_TRANSACTIONS,
  DEFAULT_BUDGET,
  INITIAL_TABS,
  INITIAL_MONTHLY_DUES,
  DEFAULT_WALLETS,
  DEFAULT_QUICK_PRESETS,
} from '@/lib/sampleData';
import {
  calculateDailySummary,
  calculateFinancialStats,
  calculateCategoryBreakdown,
  calculateRecentCashflow,
  calculateMonthlyDueReminders,
  getExactRealTime,
} from '@/lib/utils';
import {
  getLocalTransactions,
  setLocalTransactions,
  getLocalBudget,
  setLocalBudget,
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
  const [budget, setBudget] = useState<BudgetConfig>(DEFAULT_BUDGET);
  const [tabs, setTabs] = useState<TabItem[]>(INITIAL_TABS);
  const [dues, setDues] = useState<MonthlyDue[]>(INITIAL_MONTHLY_DUES);
  const [wallets, setWallets] = useState<WalletBalances>(DEFAULT_WALLETS);
  const [presets, setPresets] = useState<QuickPreset[]>(DEFAULT_QUICK_PRESETS);

  // Modals state
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [txModalDefaultType, setTxModalDefaultType] = useState<TransactionType>('expense');

  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [isPresetModalOpen, setIsPresetModalOpen] = useState(false);

  const [isTabModalOpen, setIsTabModalOpen] = useState(false);
  const [editingTab, setEditingTab] = useState<TabItem | null>(null);

  const [isDueModalOpen, setIsDueModalOpen] = useState(false);
  const [editingDue, setEditingDue] = useState<MonthlyDue | null>(null);

  // Initial load from storage and background sync with Vercel API
  useEffect(() => {
    setTransactions(getLocalTransactions());
    setBudget(getLocalBudget());
    setTabs(getLocalTabs());
    setDues(getLocalDues());
    setWallets(getLocalWallets());
    setPresets(getLocalQuickPresets());

    syncWithVercelServer().then((synced) => {
      if (synced) {
        if (synced.transactions?.length) setTransactions(synced.transactions);
        if (synced.tabs?.length) setTabs(synced.tabs);
        if (synced.dues?.length) setDues(synced.dues);
        if (synced.budget) setBudget(synced.budget);
      }
    });

    const handleStorageChange = () => {
      setTransactions(getLocalTransactions());
      setBudget(getLocalBudget());
      setTabs(getLocalTabs());
      setDues(getLocalDues());
      setWallets(getLocalWallets());
      setPresets(getLocalQuickPresets());
    };

    window.addEventListener('fintrack_data_changed', handleStorageChange);
    window.addEventListener('fintrack_budget_changed', handleStorageChange);
    window.addEventListener('fintrack_tabs_changed', handleStorageChange);
    window.addEventListener('fintrack_dues_changed', handleStorageChange);
    window.addEventListener('fintrack_wallets_changed', handleStorageChange);
    window.addEventListener('fintrack_presets_changed', handleStorageChange);

    return () => {
      window.removeEventListener('fintrack_data_changed', handleStorageChange);
      window.removeEventListener('fintrack_budget_changed', handleStorageChange);
      window.removeEventListener('fintrack_tabs_changed', handleStorageChange);
      window.removeEventListener('fintrack_dues_changed', handleStorageChange);
      window.removeEventListener('fintrack_wallets_changed', handleStorageChange);
      window.removeEventListener('fintrack_presets_changed', handleStorageChange);
    };
  }, []);

  // --- Automatic Wallet Adjustments on Transaction Events ---
  const applyWalletImpact = useCallback(
    (
      prevWallets: WalletBalances,
      amount: number,
      type: 'expense' | 'income',
      method: PaymentMethod,
      direction: 'apply' | 'revert'
    ): WalletBalances => {
      const isCash = method === 'Cash';
      // If applying expense: subtract; if reverting expense: add
      // If applying income: add; if reverting income: subtract
      let multiplier = 0;
      if (type === 'expense') {
        multiplier = direction === 'apply' ? -1 : 1;
      } else {
        multiplier = direction === 'apply' ? 1 : -1;
      }

      const delta = amount * multiplier;

      const nextWallets = {
        cashInHand: isCash
          ? Math.max(0, Math.round((prevWallets.cashInHand + delta) * 100) / 100)
          : prevWallets.cashInHand,
        accountBalance: !isCash
          ? Math.max(0, Math.round((prevWallets.accountBalance + delta) * 100) / 100)
          : prevWallets.accountBalance,
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

      setTransactions((prev) => {
        let updated: Transaction[];

        if (data.id) {
          // Editing existing transaction
          const existing = prev.find((t) => t.id === data.id);
          if (existing) {
            // Revert old impact on wallet
            setWallets((w) => {
              const reverted = applyWalletImpact(
                w,
                existing.amount,
                existing.type,
                existing.paymentMethod,
                'revert'
              );
              // Apply new impact
              const newAmount = typeof data.amount === 'number' ? data.amount : existing.amount;
              const newType = data.type || existing.type;
              const newMethod = data.paymentMethod || existing.paymentMethod;
              return applyWalletImpact(reverted, newAmount, newType, newMethod, 'apply');
            });
          }

          updated = prev.map((t) =>
            t.id === data.id
              ? ({
                  ...t,
                  ...data,
                  amount: typeof data.amount === 'number' ? data.amount : t.amount,
                  createdAt: t.createdAt || now,
                  synced: false,
                } as Transaction)
              : t
          );
        } else {
          // Adding new transaction
          const newTx: Transaction = {
            id: `tx-${now}-${Math.random().toString(36).substring(2, 7)}`,
            type: data.type || 'expense',
            amount: data.amount || 0,
            category: data.category || 'Chai & Snacks',
            description: data.description || '',
            date: data.date || realTime.date,
            time: data.time || realTime.time,
            timestamp: data.timestamp || realTime.timestamp,
            paymentMethod: data.paymentMethod || 'UPI / Bank',
            notes: data.notes || '',
            createdAt: now,
            synced: false,
          };

          // Apply wallet impact
          setWallets((w) =>
            applyWalletImpact(w, newTx.amount, newTx.type, newTx.paymentMethod, 'apply')
          );

          updated = [newTx, ...prev];
        }

        setLocalTransactions(updated);

        fetch('/api/transactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data.id ? { ...data } : updated[0]),
        }).catch(() => {});

        return updated;
      });
    },
    [applyWalletImpact]
  );

  const handleQuickAdd = useCallback(
    (item: {
      description: string;
      amount: number;
      category: string;
      type: 'expense' | 'income';
      paymentMethod: PaymentMethod;
    }) => {
      const realTime = getExactRealTime();
      handleSaveTransaction({
        description: item.description,
        amount: item.amount,
        category: item.category,
        type: item.type,
        paymentMethod: item.paymentMethod,
        date: realTime.date,
        time: realTime.time,
        timestamp: realTime.timestamp,
      });
    },
    [handleSaveTransaction]
  );

  const handleDeleteTransaction = useCallback(
    (id: string) => {
      setTransactions((prev) => {
        const toDelete = prev.find((t) => t.id === id);
        if (toDelete) {
          // Revert impact on wallet
          setWallets((w) =>
            applyWalletImpact(
              w,
              toDelete.amount,
              toDelete.type,
              toDelete.paymentMethod,
              'revert'
            )
          );
        }

        const filtered = prev.filter((t) => t.id !== id);
        setLocalTransactions(filtered);
        fetch('/api/transactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'delete', id }),
        }).catch(() => {});
        return filtered;
      });
    },
    [applyWalletImpact]
  );

  const handleSaveBudget = useCallback((updated: BudgetConfig) => {
    setBudget(updated);
    setLocalBudget(updated);
    fetch('/api/budget', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    }).catch(() => {});
  }, []);

  // --- Wallets Handlers ---
  const handleSaveWallets = useCallback((updated: WalletBalances) => {
    setWallets(updated);
    setLocalWallets(updated);
    fetch('/api/wallets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    }).catch(() => {});
  }, []);

  // --- Presets Handlers ---
  const handleSavePresets = useCallback((updated: QuickPreset[]) => {
    setPresets(updated);
    setLocalQuickPresets(updated);
    fetch('/api/presets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    }).catch(() => {});
  }, []);

  const handleResetPresets = useCallback(() => {
    setPresets(DEFAULT_QUICK_PRESETS);
    setLocalQuickPresets(DEFAULT_QUICK_PRESETS);
    fetch('/api/presets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reset' }),
    }).catch(() => {});
  }, []);

  // --- Tabs Handlers ---
  const handleSaveTab = useCallback((tabData: Partial<TabItem>) => {
    setTabs((prev) => {
      const now = Date.now();
      let updated: TabItem[];

      if (tabData.id) {
        updated = prev.map((t) =>
          t.id === tabData.id ? ({ ...t, ...tabData } as TabItem) : t
        );
      } else {
        const newTab: TabItem = {
          id: `tab-${now}-${Math.random().toString(36).substring(2, 6)}`,
          personName: tabData.personName || 'Friend',
          amount: tabData.amount || 0,
          type: tabData.type || 'owed_to_you',
          description: tabData.description || 'Tab',
          date: tabData.date || new Date().toISOString().split('T')[0],
          status: 'pending',
          createdAt: now,
          notes: tabData.notes || '',
        };
        updated = [newTab, ...prev];
      }

      setLocalTabs(updated);
      fetch('/api/tabs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tabData.id ? { ...tabData } : updated[0]),
      }).catch(() => {});

      return updated;
    });
  }, []);

  const handleSettleTab = useCallback(
    (
      tab: TabItem,
      paymentMethod: 'Cash' | 'UPI / Bank',
      recordTransaction: boolean
    ) => {
      const realTime = getExactRealTime();

      // 1. Mark tab as settled
      setTabs((prev) => {
        const updated = prev.map((t) =>
          t.id === tab.id
            ? { ...t, status: 'settled' as const, settledAt: Date.now() }
            : t
        );
        setLocalTabs(updated);
        fetch('/api/tabs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'settle', id: tab.id }),
        }).catch(() => {});
        return updated;
      });

      // 2. Adjust wallet & optionally record transaction
      if (recordTransaction) {
        if (tab.type === 'owed_to_you') {
          // Friend paying you back -> Inflow! (Adds to Cash in Hand or Account)
          handleSaveTransaction({
            type: 'income',
            amount: tab.amount,
            category: 'Other Inflows',
            description: `Tab Settled: ${tab.personName} paid back`,
            paymentMethod,
            date: realTime.date,
            time: realTime.time,
            timestamp: realTime.timestamp,
            notes: `Settled via ${paymentMethod} (${tab.description})`,
          });
        } else {
          // You paying back friend -> Outflow! (Deducts from Cash in Hand or Account)
          handleSaveTransaction({
            type: 'expense',
            amount: tab.amount,
            category: 'Miscellaneous',
            description: `Tab Settled: Paid back ${tab.personName}`,
            paymentMethod,
            date: realTime.date,
            time: realTime.time,
            timestamp: realTime.timestamp,
            notes: `Settled via ${paymentMethod} (${tab.description})`,
          });
        }
      } else {
        // Adjust wallet balance directly without logging a transaction entry
        setWallets((w) => {
          const isIncome = tab.type === 'owed_to_you';
          return applyWalletImpact(
            w,
            tab.amount,
            isIncome ? 'income' : 'expense',
            paymentMethod,
            'apply'
          );
        });
      }
    },
    [handleSaveTransaction, applyWalletImpact]
  );

  const handleDeleteTab = useCallback((id: string) => {
    setTabs((prev) => {
      const filtered = prev.filter((t) => t.id !== id);
      setLocalTabs(filtered);
      fetch('/api/tabs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', id }),
      }).catch(() => {});
      return filtered;
    });
  }, []);

  // --- Monthly Dues Handlers ---
  const handleSaveDue = useCallback((dueData: Partial<MonthlyDue>) => {
    setDues((prev) => {
      const now = Date.now();
      let updated: MonthlyDue[];

      if (dueData.id) {
        updated = prev.map((d) =>
          d.id === dueData.id ? ({ ...d, ...dueData } as MonthlyDue) : d
        );
      } else {
        const newDue: MonthlyDue = {
          id: `due-${now}-${Math.random().toString(36).substring(2, 6)}`,
          title: dueData.title || 'Monthly Due',
          amount: dueData.amount || 0,
          category: dueData.category || 'Bills & Utilities',
          dueDayOfMonth: dueData.dueDayOfMonth || 1,
          paymentMethod: dueData.paymentMethod || 'UPI / Bank',
          status: 'pending',
          notes: dueData.notes || '',
        };
        updated = [newDue, ...prev];
      }

      setLocalDues(updated);
      fetch('/api/dues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dueData.id ? { ...dueData } : updated[0]),
      }).catch(() => {});

      return updated;
    });
  }, []);

  const handlePayAndRecordDue = useCallback(
    (due: MonthlyDue) => {
      const realTime = getExactRealTime();

      setDues((prev) => {
        const updated = prev.map((d) =>
          d.id === due.id
            ? {
                ...d,
                status: 'paid' as const,
                lastPaidDate: realTime.date,
              }
            : d
        );
        setLocalDues(updated);
        fetch('/api/dues', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'mark_paid', id: due.id }),
        }).catch(() => {});
        return updated;
      });

      // Automatically records expense and deducts from Cash or Account wallet!
      handleSaveTransaction({
        type: 'expense',
        amount: due.amount,
        category: due.category,
        description: `Monthly Due: ${due.title}`,
        paymentMethod: due.paymentMethod,
        date: realTime.date,
        time: realTime.time,
        timestamp: realTime.timestamp,
        notes: `Paid on ${realTime.date} at ${realTime.time}`,
      });
    },
    [handleSaveTransaction]
  );

  const handleDeleteDue = useCallback((id: string) => {
    setDues((prev) => {
      const filtered = prev.filter((d) => d.id !== id);
      setLocalDues(filtered);
      fetch('/api/dues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', id }),
      }).catch(() => {});
      return filtered;
    });
  }, []);

  // Bulk Import / Reset
  const handleImportTransactions = useCallback((imported: Partial<Transaction>[]) => {
    const realTime = getExactRealTime();
    setTransactions((prev) => {
      const now = Date.now();
      const valid: Transaction[] = imported.map((imp, idx) => ({
        id: imp.id || `tx-imp-${now}-${idx}`,
        type: imp.type || 'expense',
        amount: imp.amount || 0,
        category: imp.category || 'Miscellaneous',
        description: imp.description || 'Imported Entry',
        date: imp.date || realTime.date,
        time: imp.time || realTime.time,
        timestamp: imp.timestamp || realTime.timestamp,
        paymentMethod: imp.paymentMethod || 'UPI / Bank',
        notes: imp.notes || '',
        createdAt: now,
        synced: false,
      }));

      const merged = [...valid, ...prev];
      setLocalTransactions(merged);
      fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientTransactions: merged }),
      }).catch(() => {});

      return merged;
    });
  }, []);

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
      body: JSON.stringify({ action: 'reset' }),
    }).catch(() => {});
  }, []);

  const handleClearAll = useCallback(() => {
    setTransactions([]);
    setLocalTransactions([]);
    setTabs([]);
    setLocalTabs([]);
    setDues([]);
    setLocalDues([]);
    setWallets({ cashInHand: 0, accountBalance: 0, lastUpdated: Date.now() });
    setLocalWallets({ cashInHand: 0, accountBalance: 0, lastUpdated: Date.now() });
    fetch('/api/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'clear' }),
    }).catch(() => {});
  }, []);

  const dailySummary = useMemo(() => calculateDailySummary(transactions, budget), [transactions, budget]);
  const financialStats = useMemo(() => calculateFinancialStats(transactions), [transactions]);
  const categoryExpenses = useMemo(() => calculateCategoryBreakdown(transactions, 'expense'), [transactions]);
  const categoryIncomes = useMemo(() => calculateCategoryBreakdown(transactions, 'income'), [transactions]);
  const cashflowData = useMemo(() => calculateRecentCashflow(transactions, 7), [transactions]);

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
        onOpenBudgetModal={() => setIsBudgetModalOpen(true)}
        onOpenExportModal={() => setIsExportModalOpen(true)}
        dueAlertCount={dueAlertCount}
      />

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-3.5 sm:px-6 lg:px-8 py-3.5 sm:py-6 pb-28 md:pb-8 space-y-4 sm:space-y-6">
        {/* VIEW 1: DAILY FINANCE & DASHBOARD */}
        {currentSection === 'daily' && (
          <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-150 w-full max-w-full overflow-hidden">
            {/* Top Liquid Funds & Wallet Balances */}
            <WalletOverview
              wallets={wallets}
              onOpenAdjustModal={() => setIsWalletModalOpen(true)}
            />

            {/* Daily Focus Section */}
            <section className="space-y-3.5 sm:space-y-4">
              <DailyOverview
                summary={dailySummary}
                budget={budget}
                onOpenBudgetModal={() => setIsBudgetModalOpen(true)}
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
              />

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
            </section>

            {/* Financial Summary & Charts */}
            <section className="space-y-4 sm:space-y-6 pt-2 border-t border-zinc-200">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-xs sm:text-sm font-extrabold uppercase font-mono tracking-wider text-black truncate">
                  Monthly Overview (INR)
                </h2>
                <PwaCriteriaBadge />
              </div>

              <FinancialSummary stats={financialStats} />

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                <SpendingChart data={cashflowData} />
                <CategoryBreakdown
                  expenses={categoryExpenses}
                  incomes={categoryIncomes}
                />
              </div>
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
          </div>
        )}

        {/* VIEW 2: TABS (LENT & BORROWED / SPLITS) */}
        {currentSection === 'tabs' && (
          <div className="animate-in fade-in duration-150 w-full max-w-full overflow-hidden">
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
          </div>
        )}

        {/* VIEW 3: MONTHLY DUES (RECURRING BILLS & REMINDERS) */}
        {currentSection === 'dues' && (
          <div className="animate-in fade-in duration-150 w-full max-w-full overflow-hidden">
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
          </div>
        )}

        {/* VIEW 4: DEDICATED ANALYTICS */}
        {currentSection === 'analytics' && (
          <div className="animate-in fade-in duration-150 w-full max-w-full overflow-hidden">
            <AnalyticsView transactions={transactions} budget={budget} />
          </div>
        )}
      </main>

      {/* Native Mobile Android Bottom Navigation Bar */}
      <BottomNav
        currentSection={currentSection}
        onSelectSection={setCurrentSection}
        dueAlertCount={dueAlertCount}
      />

      {/* Mobile Floating Action Button */}
      <button
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
        className="md:hidden fixed bottom-20 right-3.5 z-40 p-3 bg-black text-white rounded-full shadow-2xl hover:bg-zinc-800 active:scale-90 transition-transform border border-zinc-800"
      >
        <Plus className="w-5 h-5 stroke-[2.5]" />
      </button>

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
          <span>&bull;</span>
          <button onClick={() => setIsBudgetModalOpen(true)} className="hover:text-black transition-colors underline">
            Adjust Budget
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

      <BudgetTargetModal
        isOpen={isBudgetModalOpen}
        onClose={() => setIsBudgetModalOpen(false)}
        currentBudget={budget}
        onSaveBudget={handleSaveBudget}
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
    </div>
  );
}
