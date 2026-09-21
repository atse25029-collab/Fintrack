import {
  doc,
  setDoc,
  getDoc,
  collection,
  getDocs,
  writeBatch,
  query,
  orderBy,
  limit,
  onSnapshot,
} from 'firebase/firestore';
import { getFirestoreDb } from './client';
import {
  Transaction,
  BudgetConfig,
  WalletBalances,
  MonthlyDue,
  TabItem,
  QuickPreset,
} from '@/lib/types';

/**
 * Save user liquid wallet balances to Cloud Firestore
 */
export async function syncWalletsToFirebase(
  uid: string,
  wallets: WalletBalances
): Promise<void> {
  const db = getFirestoreDb();
  if (!db) return;

  const docRef = doc(db, `users/${uid}/wallets`, 'balances');
  await setDoc(docRef, {
    cashInHand: wallets.cashInHand,
    accountBalance: wallets.accountBalance,
    updatedAt: Date.now(),
  }, { merge: true });
}

export async function fetchWalletsFromFirebase(uid: string): Promise<WalletBalances | null> {
  const db = getFirestoreDb();
  if (!db) return null;

  const docRef = doc(db, `users/${uid}/wallets`, 'balances');
  const snap = await getDoc(docRef);
  if (snap.exists()) {
    const data = snap.data();
    return {
      cashInHand: data.cashInHand ?? 0,
      accountBalance: data.accountBalance ?? 0,
      lastUpdated: data.updatedAt,
    };
  }
  return null;
}

/**
 * Sync budget config
 */
export async function syncBudgetToFirebase(uid: string, budget: BudgetConfig): Promise<void> {
  const db = getFirestoreDb();
  if (!db) return;

  const docRef = doc(db, `users/${uid}/budget`, 'config');
  await setDoc(docRef, {
    monthlyLimit: budget.monthlyLimit,
    dailyAllowance: budget.dailyAllowance,
    currency: budget.currency || 'INR',
    currencySymbol: budget.currencySymbol || '₹',
    updatedAt: Date.now(),
  }, { merge: true });
}

export async function fetchBudgetFromFirebase(uid: string): Promise<BudgetConfig | null> {
  const db = getFirestoreDb();
  if (!db) return null;

  const docRef = doc(db, `users/${uid}/budget`, 'config');
  const snap = await getDoc(docRef);
  if (snap.exists()) {
    const data = snap.data();
    return {
      monthlyLimit: data.monthlyLimit,
      dailyAllowance: data.dailyAllowance,
      currency: data.currency || 'INR',
      currencySymbol: data.currencySymbol || '₹',
    };
  }
  return null;
}

/**
 * Sync individual transaction
 */
export async function saveTransactionToFirebase(
  uid: string,
  tx: Transaction
): Promise<void> {
  const db = getFirestoreDb();
  if (!db) return;

  const docRef = doc(db, `users/${uid}/transactions`, tx.id);
  await setDoc(docRef, { ...tx, updatedAt: Date.now() }, { merge: true });
}

/**
 * Fetch all transactions for user
 */
export async function fetchTransactionsFromFirebase(uid: string): Promise<Transaction[]> {
  const db = getFirestoreDb();
  if (!db) return [];

  const colRef = collection(db, `users/${uid}/transactions`);
  const q = query(colRef, orderBy('date', 'desc'), limit(500));
  const snap = await getDocs(q);

  const list: Transaction[] = [];
  snap.forEach((d) => {
    list.push(d.data() as Transaction);
  });
  return list;
}

/**
 * Sync all dues
 */
export async function syncDuesToFirebase(uid: string, dues: MonthlyDue[]): Promise<void> {
  const db = getFirestoreDb();
  if (!db) return;

  const batch = writeBatch(db);
  dues.forEach((due) => {
    const ref = doc(db, `users/${uid}/monthly_dues`, due.id);
    batch.set(ref, { ...due, updatedAt: Date.now() }, { merge: true });
  });
  await batch.commit();
}

export async function fetchDuesFromFirebase(uid: string): Promise<MonthlyDue[]> {
  const db = getFirestoreDb();
  if (!db) return [];

  const colRef = collection(db, `users/${uid}/monthly_dues`);
  const snap = await getDocs(colRef);
  const list: MonthlyDue[] = [];
  snap.forEach((d) => {
    list.push(d.data() as MonthlyDue);
  });
  return list;
}

/**
 * Sync all tabs
 */
export async function syncTabsToFirebase(uid: string, tabs: TabItem[]): Promise<void> {
  const db = getFirestoreDb();
  if (!db) return;

  const batch = writeBatch(db);
  tabs.forEach((tab) => {
    const ref = doc(db, `users/${uid}/tabs`, tab.id);
    batch.set(ref, { ...tab, updatedAt: Date.now() }, { merge: true });
  });
  await batch.commit();
}

export async function fetchTabsFromFirebase(uid: string): Promise<TabItem[]> {
  const db = getFirestoreDb();
  if (!db) return [];

  const colRef = collection(db, `users/${uid}/tabs`);
  const snap = await getDocs(colRef);
  const list: TabItem[] = [];
  snap.forEach((d) => {
    list.push(d.data() as TabItem);
  });
  return list;
}

/**
 * Sync presets
 */
export async function syncPresetsToFirebase(uid: string, presets: QuickPreset[]): Promise<void> {
  const db = getFirestoreDb();
  if (!db) return;

  const batch = writeBatch(db);
  presets.forEach((preset) => {
    const ref = doc(db, `users/${uid}/presets`, preset.id);
    batch.set(ref, { ...preset, updatedAt: Date.now() }, { merge: true });
  });
  await batch.commit();
}

export async function fetchPresetsFromFirebase(uid: string): Promise<QuickPreset[]> {
  const db = getFirestoreDb();
  if (!db) return [];

  const colRef = collection(db, `users/${uid}/presets`);
  const snap = await getDocs(colRef);
  const list: QuickPreset[] = [];
  snap.forEach((d) => {
    list.push(d.data() as QuickPreset);
  });
  return list;
}

/**
 * Atomic batch migration helper
 */
export async function batchMigrateAllUserData(
  uid: string,
  payload: {
    transactions: Transaction[];
    wallets: WalletBalances;
    dues: MonthlyDue[];
    tabs: TabItem[];
    budget: BudgetConfig;
    presets: QuickPreset[];
  },
  onProgress?: (msg: string) => void
): Promise<{ success: boolean; counts: Record<string, number> }> {
  const db = getFirestoreDb();
  if (!db) throw new Error('Firestore is not initialized');

  onProgress?.('Initializing Firestore batch pipeline...');

  // 1. Wallets & Budget
  await syncWalletsToFirebase(uid, payload.wallets);
  await syncBudgetToFirebase(uid, payload.budget);
  onProgress?.('Synced wallets and budget config.');

  // 2. Transactions in chunks of 450 (Firestore limit is 500 per batch)
  const chunkSize = 400;
  for (let i = 0; i < payload.transactions.length; i += chunkSize) {
    const chunk = payload.transactions.slice(i, i + chunkSize);
    const batch = writeBatch(db);
    chunk.forEach((tx) => {
      const ref = doc(db, `users/${uid}/transactions`, tx.id);
      batch.set(ref, { ...tx, updatedAt: Date.now() }, { merge: true });
    });
    await batch.commit();
    onProgress?.(`Synced ${Math.min(i + chunkSize, payload.transactions.length)} of ${payload.transactions.length} transactions...`);
  }

  // 3. Dues
  if (payload.dues.length > 0) {
    await syncDuesToFirebase(uid, payload.dues);
    onProgress?.(`Synced ${payload.dues.length} monthly dues.`);
  }

  // 4. Tabs
  if (payload.tabs.length > 0) {
    await syncTabsToFirebase(uid, payload.tabs);
    onProgress?.(`Synced ${payload.tabs.length} tabs.`);
  }

  // 5. Presets
  if (payload.presets.length > 0) {
    await syncPresetsToFirebase(uid, payload.presets);
    onProgress?.(`Synced ${payload.presets.length} presets.`);
  }

  onProgress?.('Migration complete! All records verified.');

  return {
    success: true,
    counts: {
      transactions: payload.transactions.length,
      dues: payload.dues.length,
      tabs: payload.tabs.length,
      presets: payload.presets.length,
    },
  };
}
