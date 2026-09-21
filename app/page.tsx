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
import BudgetTargetModal from '@/components/dashboard/BudgetTargetModal';
import TransactionModal from '@/components/transactions/TransactionModal';
import TransactionList from '@/components/transactions/TransactionList';
import ExportImportModal from '@/components/transactions/ExportImportModal';
import PwaCriteriaBadge from '@/components/pwa/PwaCriteriaBadge';

import TabsManager from '@/components/tabs/TabsManager';
import TabModal from '@/components/tabs/TabModal';
import MonthlyDuesManager from '@/components/dues/MonthlyDuesManager';
import MonthlyDueModal from '@/components/dues/MonthlyDueModal';
import AssistantView from '@/components/assistant/AssistantView';
import AnalyticsView from '@/components/analytics/AnalyticsView';
import ProfileSection from '@/components/profile/ProfileSection';
import PasteSmsModal from '@/components/daily/PasteSmsModal';
import ReceiptScanModal from '@/components/daily/ReceiptScanModal';
import MonthlyStatementModal from '@/components/analytics/MonthlyStatementModal';
import AdminDashboardModal from '@/components/admin/AdminDashboardModal';
import AuthModal from '@/components/auth/AuthModal';
import { User as FirebaseUser } from 'firebase/auth';
import { getStoredTheme, applyTheme } from '@/lib/theme/themeService';
import { ParsedSmsTransaction } from '@/lib/parser/smsParser';
import { checkAndNotifyUpcomingDuesAndTabs } from '@/lib/notifications/notificationService';
import { isFirebaseConfigured } from '@/lib/firebase/config';
import {
  getOrInitFirebaseUser,
  getActiveFirebaseUid,
  subscribeToAuth,
  isUserAdmin,
  getCurrentFirebaseUser,
} from '@/lib/firebase/authService';
import {
  startFirebaseRealtimeSync,
  triggerImmediateFirebaseUpload,
  FullAppData,
} from '@/lib/firebase/realtimeSync';
import {
  fetchAllFirebaseUserData,
  saveTransactionToFirebase,
  deleteTransactionFromFirebase,
  saveDueToFirebase,
  deleteDueFromFirebase,
  saveTabToFirebase,
  deleteTabFromFirebase,
  syncWalletsToFirebase,
  syncBudgetToFirebase,
  syncPresetsToFirebase,
  syncAnalyticsSnapshotToFirebase,
  clearAllFirebaseUserData,
} from '@/lib/firebase/dbService';

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
  getLocalDateString,
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
  const [firebaseUid, setFirebaseUid] = useState<string>(() => getActiveFirebaseUid());

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

  // Modals State
  const [isPasteSmsOpen, setIsPasteSmsOpen] = useState(false);
  const [isReceiptScanOpen, setIsReceiptScanOpen] = useState(false);
  const [isStatementOpen, setIsStatementOpen] = useState(false);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(() => getCurrentFirebaseUser());
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Keep firebaseUser and active UID synchronized with auth state changes
  useEffect(() => {
    if (isFirebaseConfigured()) {
      const unsub = subscribeToAuth((u) => {
        setFirebaseUser(u);
        if (u?.uid) {
          setFirebaseUid(u.uid);
        }
      });
      return () => unsub();
    }
  }, []);

  const isAdmin = isUserAdmin(firebaseUser);

  // Initial load from storage and background Firebase sync
  useEffect(() => {
    // 0. Initialize theme
    applyTheme(getStoredTheme());

    // 1. Initial load from local device storage
    const initialTxs = getLocalTransactions();
    const initialBudget = getLocalBudget();
    const initialTabs = getLocalTabs();
    const initialDues = getLocalDues();
    const initialWallets = getLocalWallets();
    const initialPresets = getLocalQuickPresets();

    setTransactions(initialTxs);
    setBudget(initialBudget);
    setTabs(initialTabs);
    setDues(initialDues);
    setWallets(initialWallets);
    setPresets(initialPresets);

    let stopRealtimeSync: (() => void) | null = null;

    // 2. Initialize Firebase user & fetch latest cloud data
    if (isFirebaseConfigured()) {
      getOrInitFirebaseUser().then((user) => {
        const uid = user?.uid || getActiveFirebaseUid();
        setFirebaseUid(uid);

        // Initial fetch of Firestore data
        fetchAllFirebaseUserData(uid)
          .then((cloudData) => {
            if (cloudData) {
              if (cloudData.transactions && cloudData.transactions.length > 0) {
                setTransactions(cloudData.transactions);
                setLocalTransactions(cloudData.transactions);
              }
              if (cloudData.dues && cloudData.dues.length > 0) {
                setDues(cloudData.dues);
                setLocalDues(cloudData.dues);
              }
              if (cloudData.tabs && cloudData.tabs.length > 0) {
                setTabs(cloudData.tabs);
                setLocalTabs(cloudData.tabs);
              }
              if (cloudData.wallets) {
                const localW = getLocalWallets();
                if ((cloudData.wallets.lastUpdated || 0) >= (localW.lastUpdated || 0)) {
                  setWallets(cloudData.wallets);
                  setLocalWallets(cloudData.wallets);
                }
              }
              if (cloudData.presets && cloudData.presets.length > 0) {
                setPresets(cloudData.presets);
                setLocalQuickPresets(cloudData.presets);
              }
              if (cloudData.budget) {
                setBudget(cloudData.budget);
                setLocalBudget(cloudData.budget);
              }
            }
          })
          .catch((err) => {
            console.warn('[Firebase] Initial cloud fetch error:', err);
          });

        // 3. Start Firestore real-time onSnapshot listeners
        stopRealtimeSync = startFirebaseRealtimeSync({
          uid,
          onUpdate: (cloudData) => {
            if (cloudData.transactions && cloudData.transactions.length > 0) {
              setTransactions(cloudData.transactions);
              setLocalTransactions(cloudData.transactions);
            }
            if (cloudData.dues && cloudData.dues.length > 0) {
              setDues(cloudData.dues);
              setLocalDues(cloudData.dues);
            }
            if (cloudData.tabs && cloudData.tabs.length > 0) {
              setTabs(cloudData.tabs);
              setLocalTabs(cloudData.tabs);
            }
            if (cloudData.wallets) {
              const localW = getLocalWallets();
              if ((cloudData.wallets.lastUpdated || 0) >= (localW.lastUpdated || 0)) {
                setWallets(cloudData.wallets);
                setLocalWallets(cloudData.wallets);
              }
            }
            if (cloudData.presets && cloudData.presets.length > 0) {
              setPresets(cloudData.presets);
              setLocalQuickPresets(cloudData.presets);
            }
            if (cloudData.budget) {
              setBudget(cloudData.budget);
              setLocalBudget(cloudData.budget);
            }
          },
        });
      });
    }

    // 4. Background serverless fallback sync
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
      if (stopRealtimeSync) stopRealtimeSync();
      window.removeEventListener('fintrack_data_changed', handleStorageChange);
      window.removeEventListener('fintrack_budget_changed', handleStorageChange);
      window.removeEventListener('fintrack_tabs_changed', handleStorageChange);
      window.removeEventListener('fintrack_dues_changed', handleStorageChange);
      window.removeEventListener('fintrack_wallets_changed', handleStorageChange);
      window.removeEventListener('fintrack_presets_changed', handleStorageChange);
    };
  }, []);

  // Handle Notification Deep-Linking & Service Worker Navigation Messages
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 1. Deep-link from fresh window launch (e.g., /?section=dues or /?section=tabs)
    const params = new URLSearchParams(window.location.search);
    const sectionParam = params.get('section');
    if (
      sectionParam &&
      ['daily', 'dashboard', 'tabs', 'dues', 'analytics', 'profile'].includes(sectionParam)
    ) {
      setCurrentSection(sectionParam as AppSection);
    }

    // 2. Service Worker Message (e.g. user tapped notification with app already open)
    if ('serviceWorker' in navigator) {
      const handleSwMessage = (event: MessageEvent) => {
        if (event.data && event.data.type === 'NAVIGATE_SECTION' && event.data.section) {
          setCurrentSection(event.data.section as AppSection);
        }
      };

      navigator.serviceWorker.addEventListener('message', handleSwMessage);
      return () => {
        navigator.serviceWorker.removeEventListener('message', handleSwMessage);
      };
    }
  }, []);

  // Background Dues & Tabs Phone Notification Scanner
  useEffect(() => {
    if (dues.length > 0 || tabs.length > 0) {
      checkAndNotifyUpcomingDuesAndTabs(dues, tabs);
    }
  }, [dues, tabs]);

  // --- Automatic Wallet Adjustments on Transaction Events ---
  const applyWalletImpact = useCallback(
    (
      prevWallets: WalletBalances,
      amount: number,
      type: 'expense' | 'income',
      method: PaymentMethod,
      direction: 'apply' | 'revert'
    ): WalletBalances => {
      const isCash =
        method === 'Cash' ||
        (typeof method === 'string' && method.trim().toLowerCase().includes('cash'));
      const numAmount = Math.max(
        0,
        typeof amount === 'number' && !isNaN(amount) ? amount : parseFloat(String(amount)) || 0
      );

      // If applying expense: subtract; if reverting expense: add
      // If applying income: add; if reverting income: subtract
      let multiplier = 0;
      if (type === 'expense') {
        multiplier = direction === 'apply' ? -1 : 1;
      } else {
        multiplier = direction === 'apply' ? 1 : -1;
      }

      const delta = numAmount * multiplier;

      const safeCash =
        typeof prevWallets?.cashInHand === 'number' && !isNaN(prevWallets.cashInHand)
          ? prevWallets.cashInHand
          : Number(prevWallets?.cashInHand) || 0;
      const safeAccount =
        typeof prevWallets?.accountBalance === 'number' && !isNaN(prevWallets.accountBalance)
          ? prevWallets.accountBalance
          : Number(prevWallets?.accountBalance) || 0;

      const nextWallets = {
        cashInHand: isCash
          ? Math.max(0, Math.round((safeCash + delta) * 100) / 100)
          : safeCash,
        accountBalance: !isCash
          ? Math.max(0, Math.round((safeAccount + delta) * 100) / 100)
          : safeAccount,
        lastUpdated: Date.now(),
      };

      setLocalWallets(nextWallets);
      syncWalletsToFirebase(firebaseUid, nextWallets);
      fetch('/api/wallets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nextWallets),
      }).catch(() => {});

      return nextWallets;
    },
    [firebaseUid]
  );

  // Instant full-state upload helper ensuring multi-device and cold-start synchronization
  const syncFullStateToCloud = useCallback(
    (overrides?: Partial<FullAppData>) => {
      triggerImmediateFirebaseUpload(firebaseUid, {
        transactions: overrides?.transactions ?? getLocalTransactions(),
        wallets: overrides?.wallets ?? getLocalWallets(),
        tabs: overrides?.tabs ?? getLocalTabs(),
        dues: overrides?.dues ?? getLocalDues(),
        presets: overrides?.presets ?? getLocalQuickPresets(),
        budget: overrides?.budget ?? getLocalBudget(),
      });
    },
    [firebaseUid]
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
              // Apply new impact
              const newAmount = typeof data.amount === 'number' ? data.amount : existing.amount;
              const catLower = (data.category || existing.category || '').toLowerCase();
              const descLower = (data.description || existing.description || '').toLowerCase();
              const isExplicitInflow =
                data.type === 'income' ||
                catLower.includes('inflow') ||
                catLower.includes('salary') ||
                catLower.includes('wage') ||
                descLower.includes('inflow') ||
                descLower.includes('shift wage');

              const newType: TransactionType = isExplicitInflow ? 'income' : (data.type || existing.type);
              const newMethod = data.paymentMethod || existing.paymentMethod;
              updatedWallets = applyWalletImpact(reverted, newAmount, newType, newMethod, 'apply');
              return updatedWallets;
            });
          }

          const catLower = (data.category || '').toLowerCase();
          const descLower = (data.description || '').toLowerCase();
          const isExplicitInflow =
            data.type === 'income' ||
            catLower.includes('inflow') ||
            catLower.includes('salary') ||
            catLower.includes('wage') ||
            descLower.includes('inflow') ||
            descLower.includes('shift wage');

          const resolvedType: TransactionType = isExplicitInflow ? 'income' : (data.type || 'expense');

          updated = prev.map((t) =>
            t.id === data.id
              ? ({
                  ...t,
                  ...data,
                  type: resolvedType,
                  amount: typeof data.amount === 'number' ? data.amount : t.amount,
                  createdAt: t.createdAt || now,
                  synced: false,
                } as Transaction)
              : t
          );
        } else {
          // Adding new transaction (with guaranteed inflow auto-detection)
          const catLower = (data.category || '').toLowerCase();
          const descLower = (data.description || '').toLowerCase();
          const isExplicitInflow =
            data.type === 'income' ||
            catLower.includes('inflow') ||
            catLower.includes('salary') ||
            catLower.includes('wage') ||
            descLower.includes('inflow') ||
            descLower.includes('shift wage');

          const resolvedType: TransactionType = isExplicitInflow ? 'income' : (data.type || 'expense');

          const newTx: Transaction = {
            id: `tx-${now}-${Math.random().toString(36).substring(2, 7)}`,
            type: resolvedType,
            amount: typeof data.amount === 'number' ? data.amount : parseFloat(String(data.amount)) || 0,
            category: data.category || (resolvedType === 'income' ? 'Other Inflows' : 'Chai & Snacks'),
            description: data.description || (resolvedType === 'income' ? 'Inflow' : ''),
            date: data.date || realTime.date,
            time: data.time || realTime.time,
            timestamp: data.timestamp || realTime.timestamp,
            paymentMethod: data.paymentMethod || 'UPI / Bank',
            notes: data.notes || '',
            createdAt: now,
            synced: false,
          };

          // Apply wallet impact
          setWallets((w) => {
            const currentW = w || getLocalWallets();
            updatedWallets = applyWalletImpact(currentW, newTx.amount, newTx.type, newTx.paymentMethod, 'apply');
            return updatedWallets;
          });

          updated = [newTx, ...prev];
        }

        const savedTx = data.id ? updated.find((t) => t.id === data.id)! : updated[0];
        setLocalTransactions(updated);
        saveTransactionToFirebase(firebaseUid, savedTx);

        fetch('/api/transactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(savedTx),
        }).catch(() => {});

        // Instant cloud upload on user interaction
        const freshWallets = updatedWallets || getLocalWallets();
        setTimeout(() => {
          syncFullStateToCloud({ transactions: updated, wallets: freshWallets });
        }, 50);

        return updated;
      });
    },
    [applyWalletImpact, syncFullStateToCloud, firebaseUid]
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



  // Bank SMS Transaction Confirmation
  const handleConfirmSmsTx = useCallback(
    (parsed: ParsedSmsTransaction) => {
      const realTime = getExactRealTime();
      handleSaveTransaction({
        description: parsed.description,
        amount: parsed.amount,
        category: parsed.category,
        type: parsed.type,
        paymentMethod: parsed.paymentMethod,
        date: realTime.date,
        time: realTime.time,
        timestamp: realTime.timestamp,
        notes: `SMS Log: "${parsed.rawText.substring(0, 45)}..."`,
      });
    },
    [handleSaveTransaction]
  );

  // AI Scanned Bill / UPI Screenshot Confirmation
  const handleConfirmScannedTx = useCallback(
    (scanned: {
      amount: number;
      description: string;
      category: string;
      type: TransactionType;
      paymentMethod: PaymentMethod;
      date: string;
    }) => {
      const realTime = getExactRealTime();
      handleSaveTransaction({
        description: scanned.description,
        amount: scanned.amount,
        category: scanned.category,
        type: scanned.type,
        paymentMethod: scanned.paymentMethod,
        date: scanned.date || realTime.date,
        time: realTime.time,
        timestamp: realTime.timestamp,
        notes: 'AI Scanned Bill / UPI Screenshot',
      });
    },
    [handleSaveTransaction]
  );

  const handleDeleteTransaction = useCallback(
    (id: string) => {
      setTransactions((prev) => {
        const toDelete = prev.find((t) => t.id === id);
        let updatedWallets = getLocalWallets();
        if (toDelete) {
          // Revert impact on wallet
          setWallets((w) => {
            const currentW = w || getLocalWallets();
            updatedWallets = applyWalletImpact(
              currentW,
              toDelete.amount,
              toDelete.type,
              toDelete.paymentMethod,
              'revert'
            );
            return updatedWallets;
          });
        }

        const filtered = prev.filter((t) => t.id !== id);
        setLocalTransactions(filtered);
        deleteTransactionFromFirebase(firebaseUid, id);
        fetch('/api/transactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'delete', id }),
        }).catch(() => {});

        setTimeout(() => {
          syncFullStateToCloud({ transactions: filtered, wallets: updatedWallets });
        }, 50);

        return filtered;
      });
    },
    [applyWalletImpact, syncFullStateToCloud, firebaseUid]
  );

  const handleSaveBudget = useCallback(
    (updated: BudgetConfig) => {
      setBudget(updated);
      setLocalBudget(updated);
      syncBudgetToFirebase(firebaseUid, updated);
      fetch('/api/budget', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      }).catch(() => {});
      syncFullStateToCloud({ budget: updated });
    },
    [syncFullStateToCloud, firebaseUid]
  );

  // --- Wallets Handlers ---
  const handleSaveWallets = useCallback(
    (updated: WalletBalances) => {
      setWallets(updated);
      setLocalWallets(updated);
      syncWalletsToFirebase(firebaseUid, updated);
      fetch('/api/wallets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      }).catch(() => {});
      syncFullStateToCloud({ wallets: updated });
    },
    [syncFullStateToCloud, firebaseUid]
  );

  // --- Presets Handlers ---
  const handleSavePresets = useCallback(
    (updated: QuickPreset[]) => {
      setPresets(updated);
      setLocalQuickPresets(updated);
      syncPresetsToFirebase(firebaseUid, updated);
      fetch('/api/presets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      }).catch(() => {});
      syncFullStateToCloud({ presets: updated });
    },
    [syncFullStateToCloud, firebaseUid]
  );

  const handleResetPresets = useCallback(() => {
    setPresets(DEFAULT_QUICK_PRESETS);
    setLocalQuickPresets(DEFAULT_QUICK_PRESETS);
    syncPresetsToFirebase(firebaseUid, DEFAULT_QUICK_PRESETS);
    fetch('/api/presets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reset' }),
    }).catch(() => {});
    syncFullStateToCloud({ presets: DEFAULT_QUICK_PRESETS });
  }, [syncFullStateToCloud, firebaseUid]);

  // --- Tabs Handlers ---
  const handleSaveTab = useCallback(
    (tabData: Partial<TabItem>) => {
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

        const savedTab = tabData.id ? updated.find((t) => t.id === tabData.id)! : updated[0];
        setLocalTabs(updated);
        saveTabToFirebase(firebaseUid, savedTab);
        fetch('/api/tabs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(tabData.id ? { ...tabData } : updated[0]),
        }).catch(() => {});

        setTimeout(() => {
          syncFullStateToCloud({ tabs: updated });
        }, 50);

        return updated;
      });
    },
    [syncFullStateToCloud, firebaseUid]
  );

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
        const settledTab = updated.find((t) => t.id === tab.id)!;
        setLocalTabs(updated);
        saveTabToFirebase(firebaseUid, settledTab);
        fetch('/api/tabs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'settle', id: tab.id }),
        }).catch(() => {});

        setTimeout(() => {
          syncFullStateToCloud({ tabs: updated });
        }, 50);

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
          const currentW = w || getLocalWallets();
          const updatedWallets = applyWalletImpact(
            currentW,
            tab.amount,
            isIncome ? 'income' : 'expense',
            paymentMethod,
            'apply'
          );
          setTimeout(() => {
            syncFullStateToCloud({ wallets: updatedWallets });
          }, 50);
          return updatedWallets;
        });
      }
    },
    [handleSaveTransaction, applyWalletImpact, syncFullStateToCloud, firebaseUid]
  );

  const handleAssistantSettleTab = useCallback(
    (personName: string, amount?: number) => {
      const match = tabs.find(
        (t) =>
          t.status === 'pending' &&
          t.personName.toLowerCase().includes(personName.toLowerCase().trim())
      );
      if (match) {
        handleSettleTab(match, 'UPI / Bank', true);
      }
    },
    [tabs, handleSettleTab]
  );

  const handleDeleteTab = useCallback(
    (id: string) => {
      setTabs((prev) => {
        const filtered = prev.filter((t) => t.id !== id);
        setLocalTabs(filtered);
        deleteTabFromFirebase(firebaseUid, id);
        fetch('/api/tabs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'delete', id }),
        }).catch(() => {});

        setTimeout(() => {
          syncFullStateToCloud({ tabs: filtered });
        }, 50);

        return filtered;
      });
    },
    [syncFullStateToCloud, firebaseUid]
  );

  // --- Monthly Dues Handlers ---
  const handleSaveDue = useCallback(
    (dueData: Partial<MonthlyDue>) => {
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
            createdAt: now,
          };
          updated = [newDue, ...prev];
        }

        const savedDue = dueData.id ? updated.find((d) => d.id === dueData.id)! : updated[0];
        setLocalDues(updated);
        saveDueToFirebase(firebaseUid, savedDue);
        fetch('/api/dues', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dueData.id ? { ...dueData } : updated[0]),
        }).catch(() => {});

        setTimeout(() => {
          syncFullStateToCloud({ dues: updated });
        }, 50);

        return updated;
      });
    },
    [syncFullStateToCloud, firebaseUid]
  );

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
        const paidDue = updated.find((d) => d.id === due.id)!;
        setLocalDues(updated);
        saveDueToFirebase(firebaseUid, paidDue);
        fetch('/api/dues', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'mark_paid', id: due.id }),
        }).catch(() => {});

        setTimeout(() => {
          syncFullStateToCloud({ dues: updated });
        }, 50);

        return updated;
      });

      // Automatically records expense and deducts from Cash or Account wallet!
      handleSaveTransaction({
        type: 'expense',
        amount: due.amount,
        category: due.category,
        description: `Monthly Due: ${due.title}`,
        paymentMethod: due.paymentMethod,
        isMonthlyDue: true,
        date: realTime.date,
        time: realTime.time,
        timestamp: realTime.timestamp,
        notes: `Paid on ${realTime.date} at ${realTime.time}`,
      });
    },
    [handleSaveTransaction, syncFullStateToCloud, firebaseUid]
  );

  const handleDeleteDue = useCallback(
    (id: string) => {
      setDues((prev) => {
        const filtered = prev.filter((d) => d.id !== id);
        setLocalDues(filtered);
        deleteDueFromFirebase(firebaseUid, id);
        fetch('/api/dues', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'delete', id }),
        }).catch(() => {});

        setTimeout(() => {
          syncFullStateToCloud({ dues: filtered });
        }, 50);

        return filtered;
      });
    },
    [syncFullStateToCloud, firebaseUid]
  );

  // Bulk Import / Reset
  const handleImportTransactions = useCallback(
    (imported: Partial<Transaction>[]) => {
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

        setTimeout(() => {
          syncFullStateToCloud({ transactions: merged });
        }, 50);

        return merged;
      });
    },
    [syncFullStateToCloud]
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
      body: JSON.stringify({ action: 'reset' }),
    }).catch(() => {});
    syncFullStateToCloud({
      transactions: INITIAL_TRANSACTIONS,
      tabs: INITIAL_TABS,
      dues: INITIAL_MONTHLY_DUES,
      wallets: DEFAULT_WALLETS,
      presets: DEFAULT_QUICK_PRESETS,
      budget: DEFAULT_BUDGET,
    });
  }, [syncFullStateToCloud]);

  const handleClearAll = useCallback(() => {
    setTransactions([]);
    setLocalTransactions([]);
    setTabs([]);
    setLocalTabs([]);
    setDues([]);
    setLocalDues([]);
    setWallets({ cashInHand: 0, accountBalance: 0, lastUpdated: Date.now() });
    setLocalWallets({ cashInHand: 0, accountBalance: 0, lastUpdated: Date.now() });
    clearAllFirebaseUserData(firebaseUid);
    fetch('/api/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'clear' }),
    }).catch(() => {});
    syncFullStateToCloud({
      transactions: [],
      tabs: [],
      dues: [],
      wallets: { cashInHand: 0, accountBalance: 0, lastUpdated: Date.now() },
    });
  }, [syncFullStateToCloud, firebaseUid]);

  const handleCloudSyncSuccess = useCallback(
    (cloudData: {
      transactions?: Transaction[];
      wallets?: WalletBalances;
      tabs?: TabItem[];
      dues?: MonthlyDue[];
      presets?: QuickPreset[];
      budget?: BudgetConfig;
    }) => {
      if (cloudData.transactions) {
        setTransactions(cloudData.transactions);
        setLocalTransactions(cloudData.transactions);
      }
      if (cloudData.wallets) {
        const localW = getLocalWallets();
        if ((cloudData.wallets.lastUpdated || 0) >= (localW.lastUpdated || 0)) {
          setWallets(cloudData.wallets);
          setLocalWallets(cloudData.wallets);
        }
      }
      if (cloudData.tabs) {
        setTabs(cloudData.tabs);
        setLocalTabs(cloudData.tabs);
      }
      if (cloudData.dues && cloudData.dues.length > 0) {
        setDues(cloudData.dues);
        setLocalDues(cloudData.dues);
        cloudData.dues.forEach((d) => {
          fetch('/api/dues', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(d),
          }).catch(() => {});
        });
      }
      if (cloudData.presets) {
        setPresets(cloudData.presets);
        setLocalQuickPresets(cloudData.presets);
      }
      if (cloudData.budget) {
        setBudget(cloudData.budget);
        setLocalBudget(cloudData.budget);
      }
    },
    []
  );

  const dailySummary = useMemo(() => calculateDailySummary(transactions, budget), [transactions, budget]);
  const financialStats = useMemo(() => calculateFinancialStats(transactions), [transactions]);
  const categoryExpenses = useMemo(() => calculateCategoryBreakdown(transactions, 'expense'), [transactions]);
  const categoryIncomes = useMemo(() => calculateCategoryBreakdown(transactions, 'income'), [transactions]);
  const cashflowData = useMemo(() => calculateRecentCashflow(transactions, 7), [transactions]);

  const dueAlertCount = useMemo(() => {
    const reminders = calculateMonthlyDueReminders(dues);
    return reminders.filter((r) => !r.isPaidThisMonth && (r.isOverdue || r.isDueToday)).length;
  }, [dues]);

  // Automatically sync full analytics snapshots to Firebase Cloud whenever data updates
  useEffect(() => {
    if (isFirebaseConfigured()) {
      const timer = setTimeout(() => {
        syncAnalyticsSnapshotToFirebase(
          firebaseUid,
          financialStats,
          dailySummary,
          cashflowData,
          categoryExpenses,
          categoryIncomes
        );
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [firebaseUid, financialStats, dailySummary, cashflowData, categoryExpenses, categoryIncomes]);

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
        onForceSync={() => syncFullStateToCloud()}
        isAdmin={isAdmin}
        onOpenAdminModal={() => setIsAdminModalOpen(true)}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        userEmail={firebaseUser?.email}
        isLoggedIn={Boolean(firebaseUser && !firebaseUser.isAnonymous)}
      />

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-3.5 sm:px-6 lg:px-8 py-3.5 sm:py-6 pb-28 md:pb-8 space-y-4 sm:space-y-6">
        <AnimatePresence mode="wait">
          {/* VIEW 1: HOME DASHBOARD */}
          {currentSection === 'daily' && (
            <motion.div
              key="daily"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="space-y-4 sm:space-y-6 w-full max-w-full overflow-hidden"
            >
              {/* Top Liquid Funds & Wallet Balances */}
              <WalletOverview
                wallets={wallets}
                onOpenAdjustModal={() => setIsWalletModalOpen(true)}
              />

              {/* Today's Activity Stream & Quick 1-Tap Actions (Directly After Liquid Funds) */}
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
                  onOpenReceiptScan={() => setIsReceiptScanOpen(true)}
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

          {/* VIEW 2: AI COPILOT & KNOWLEDGE GRAPH */}
          {currentSection === 'assistant' && (
            <motion.div
              key="assistant"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="w-full max-w-full overflow-hidden"
            >
              <AssistantView
                transactions={transactions}
                wallets={wallets}
                dues={dues}
                tabs={tabs}
                budget={budget}
                onAddTransaction={(tx) => handleSaveTransaction(tx)}
                onSettleTab={handleAssistantSettleTab}
                onUpdateWallets={handleSaveWallets}
              />
            </motion.div>
          )}

          {/* VIEW 3: TABS (LENT & BORROWED / SPLITS) */}
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

          {/* VIEW 4: MONTHLY DUES (RECURRING BILLS & REMINDERS) */}
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

          {/* VIEW 5: DEDICATED ANALYTICS */}
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
                budget={budget}
                wallets={wallets}
                dues={dues}
                tabs={tabs}
                onOpenStatement={() => setIsStatementOpen(true)}
                onNavigateToAssistant={() => setCurrentSection('assistant')}
                onNavigateToTabs={() => setCurrentSection('tabs')}
              />
            </motion.div>
          )}

          {/* VIEW 5: PROFILE & CLOUD DATABASE SYNC */}
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
                budget={budget}
                onCloudSyncSuccess={handleCloudSyncSuccess}
                onClearAllData={handleClearAll}
                onOpenStatement={() => setIsStatementOpen(true)}
                onOpenAdminModal={() => setIsAdminModalOpen(true)}
                onOpenAuthModal={() => setIsAuthModalOpen(true)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Native Mobile Android Bottom Navigation Bar */}
      <BottomNav
        currentSection={currentSection}
        onSelectSection={setCurrentSection}
        dueAlertCount={dueAlertCount}
      />

      {/* Mobile Floating Action Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.9 }}
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

      {/* Bank SMS Clipboard Parser Modal */}
      <PasteSmsModal
        isOpen={isPasteSmsOpen}
        onClose={() => setIsPasteSmsOpen(false)}
        onConfirmTransaction={handleConfirmSmsTx}
      />

      {/* AI Receipt & UPI Screenshot Scan Modal */}
      <ReceiptScanModal
        isOpen={isReceiptScanOpen}
        onClose={() => setIsReceiptScanOpen(false)}
        onConfirm={handleConfirmScannedTx}
      />

      {/* Monthly Financial Statement PDF / CSV Modal */}
      <MonthlyStatementModal
        isOpen={isStatementOpen}
        onClose={() => setIsStatementOpen(false)}
        transactions={transactions}
        wallets={wallets}
      />

      {/* Super Admin Monitoring Console Modal */}
      <AdminDashboardModal
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
        currentAdminEmail={firebaseUser?.email || 'smohamedfarook2024@gmail.com'}
      />

      {/* Authentication & Sign-In Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        currentUser={firebaseUser}
        onAuthSuccess={() => {
          syncFullStateToCloud();
        }}
      />
    </div>
  );
}

