import {
  doc,
  collection,
  onSnapshot,
  query,
  orderBy,
  limit,
} from 'firebase/firestore';
import { getFirestoreDb, isFirebaseConfigured } from './client';
import {
  Transaction,
  WalletBalances,
  TabItem,
  MonthlyDue,
  QuickPreset,
  BudgetConfig,
} from '@/lib/types';
import { batchMigrateAllUserData } from './dbService';

export type FirebaseSyncStatus = 'synced' | 'syncing' | 'offline' | 'error';

export interface FullAppData {
  transactions: Transaction[];
  wallets: WalletBalances;
  tabs: TabItem[];
  dues: MonthlyDue[];
  presets: QuickPreset[];
  budget: BudgetConfig;
}

let currentSyncStatus: FirebaseSyncStatus = 'synced';
const statusListeners = new Set<(status: FirebaseSyncStatus) => void>();

export function getFirebaseSyncStatus(): FirebaseSyncStatus {
  return currentSyncStatus;
}

export function subscribeToFirebaseSyncStatus(
  listener: (status: FirebaseSyncStatus) => void
): () => void {
  statusListeners.add(listener);
  listener(currentSyncStatus);
  return () => {
    statusListeners.delete(listener);
  };
}

export function setFirebaseSyncStatus(status: FirebaseSyncStatus) {
  if (currentSyncStatus !== status) {
    currentSyncStatus = status;
    statusListeners.forEach((fn) => fn(status));
  }
}

/**
 * Attaches real-time Firestore listeners to the user's subcollections.
 * Provides instant multi-tab, multi-device sync without polling.
 */
export function startFirebaseRealtimeSync({
  uid,
  onUpdate,
}: {
  uid: string;
  onUpdate: (data: Partial<FullAppData>) => void;
}): () => void {
  const db = getFirestoreDb();
  if (!db || !isFirebaseConfigured()) {
    setFirebaseSyncStatus('offline');
    return () => {};
  }

  setFirebaseSyncStatus('syncing');
  const unsubs: (() => void)[] = [];

  try {
    // 1. Wallets doc listener
    const walletRef = doc(db, `users/${uid}/wallets`, 'balances');
    unsubs.push(
      onSnapshot(
        walletRef,
        (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            onUpdate({
              wallets: {
                cashInHand: Number(data.cashInHand) || 0,
                accountBalance: Number(data.accountBalance) || 0,
                lastUpdated: data.updatedAt || Date.now(),
              },
            });
          }
          setFirebaseSyncStatus('synced');
        },
        (err) => {
          console.warn('[Firebase Sync] Wallets listener error:', err);
          setFirebaseSyncStatus('error');
        }
      )
    );

    // 2. Budget doc listener
    const budgetRef = doc(db, `users/${uid}/budget`, 'config');
    unsubs.push(
      onSnapshot(
        budgetRef,
        (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            onUpdate({
              budget: {
                monthlyLimit: Number(data.monthlyLimit) || 20000,
                dailyAllowance: Number(data.dailyAllowance) || 600,
                currency: data.currency || 'INR',
                currencySymbol: data.currencySymbol || '₹',
              },
            });
          }
          setFirebaseSyncStatus('synced');
        },
        (err) => {
          console.warn('[Firebase Sync] Budget listener error:', err);
        }
      )
    );

    // 3. Transactions collection listener
    const txCol = collection(db, `users/${uid}/transactions`);
    const txQ = query(txCol, orderBy('date', 'desc'), limit(500));
    unsubs.push(
      onSnapshot(
        txQ,
        (snap) => {
          const list: Transaction[] = [];
          snap.forEach((d) => list.push(d.data() as Transaction));
          if (list.length > 0) {
            onUpdate({ transactions: list });
          }
          setFirebaseSyncStatus('synced');
        },
        (err) => {
          console.warn('[Firebase Sync] Transactions listener error:', err);
          setFirebaseSyncStatus('error');
        }
      )
    );

    // 4. Dues collection listener
    const duesCol = collection(db, `users/${uid}/monthly_dues`);
    unsubs.push(
      onSnapshot(
        duesCol,
        (snap) => {
          const list: MonthlyDue[] = [];
          snap.forEach((d) => list.push(d.data() as MonthlyDue));
          if (list.length > 0) {
            onUpdate({ dues: list });
          }
          setFirebaseSyncStatus('synced');
        },
        (err) => {
          console.warn('[Firebase Sync] Dues listener error:', err);
        }
      )
    );

    // 5. Tabs collection listener
    const tabsCol = collection(db, `users/${uid}/tabs`);
    unsubs.push(
      onSnapshot(
        tabsCol,
        (snap) => {
          const list: TabItem[] = [];
          snap.forEach((d) => list.push(d.data() as TabItem));
          if (list.length > 0) {
            onUpdate({ tabs: list });
          }
          setFirebaseSyncStatus('synced');
        },
        (err) => {
          console.warn('[Firebase Sync] Tabs listener error:', err);
        }
      )
    );

    // 6. Presets collection listener
    const presetsCol = collection(db, `users/${uid}/presets`);
    unsubs.push(
      onSnapshot(
        presetsCol,
        (snap) => {
          const list: QuickPreset[] = [];
          snap.forEach((d) => list.push(d.data() as QuickPreset));
          if (list.length > 0) {
            onUpdate({ presets: list });
          }
          setFirebaseSyncStatus('synced');
        },
        (err) => {
          console.warn('[Firebase Sync] Presets listener error:', err);
        }
      )
    );
  } catch (e) {
    console.warn('[Firebase Sync] Setup error:', e);
    setFirebaseSyncStatus('error');
  }

  return () => {
    unsubs.forEach((unsub) => {
      try {
        unsub();
      } catch {}
    });
  };
}

/**
 * Atomically writes full application state to Firebase Cloud Firestore.
 */
export async function triggerImmediateFirebaseUpload(
  uid: string,
  data: FullAppData
): Promise<void> {
  if (!isFirebaseConfigured()) return;
  setFirebaseSyncStatus('syncing');
  try {
    await batchMigrateAllUserData(uid, data);
    setFirebaseSyncStatus('synced');
  } catch (err) {
    console.warn('[Firebase Sync] Immediate upload error:', err);
    setFirebaseSyncStatus('error');
  }
}
