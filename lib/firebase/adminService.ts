import {
  collection,
  getDocs,
  onSnapshot,
  query,
  orderBy,
  doc,
  getDoc,
} from 'firebase/firestore';
import { getFirestoreDb } from './client';
import { UserProfile } from './authService';

export interface TesterLedgerSummary {
  uid: string;
  email: string | null;
  displayName: string | null;
  role: string;
  lastActive: number;
  transactionsCount: number;
  duesCount: number;
  tabsCount: number;
  walletBalances: {
    cashInHand: number;
    accountBalance: number;
    lastUpdated?: number;
  } | null;
}

/**
 * Fetches all registered testers and users from the top-level users collection.
 * Restricted to Super Admin.
 */
export async function fetchAllTesters(): Promise<UserProfile[]> {
  const db = getFirestoreDb();
  if (!db) return [];

  try {
    const usersCol = collection(db, 'users');
    const q = query(usersCol, orderBy('lastActive', 'desc'));
    const snap = await getDocs(q);
    const list: UserProfile[] = [];
    snap.forEach((d) => {
      list.push(d.data() as UserProfile);
    });
    return list;
  } catch (err) {
    console.warn('[Admin Service] fetchAllTesters error:', err);
    return [];
  }
}

/**
 * Subscribes to real-time updates for all registered testers.
 */
export function subscribeToTesters(
  callback: (testers: UserProfile[]) => void
): () => void {
  const db = getFirestoreDb();
  if (!db) {
    callback([]);
    return () => {};
  }

  try {
    const usersCol = collection(db, 'users');
    const q = query(usersCol, orderBy('lastActive', 'desc'));
    return onSnapshot(
      q,
      (snap) => {
        const list: UserProfile[] = [];
        snap.forEach((d) => {
          list.push(d.data() as UserProfile);
        });
        callback(list);
      },
      (err) => {
        console.warn('[Admin Service] subscribeToTesters error:', err);
      }
    );
  } catch (err) {
    console.warn('[Admin Service] listener setup error:', err);
    return () => {};
  }
}

/**
 * Fetches a diagnostic ledger summary for a specific tester.
 * Used by the Admin to diagnose user issues without interfering with their data.
 */
export async function fetchTesterLedgerSummary(
  tester: UserProfile
): Promise<TesterLedgerSummary> {
  const db = getFirestoreDb();
  if (!db) {
    return {
      uid: tester.uid,
      email: tester.email,
      displayName: tester.displayName,
      role: tester.role,
      lastActive: tester.lastActive,
      transactionsCount: 0,
      duesCount: 0,
      tabsCount: 0,
      walletBalances: null,
    };
  }

  try {
    const [txSnap, duesSnap, tabsSnap, walletSnap] = await Promise.all([
      getDocs(collection(db, `users/${tester.uid}/transactions`)),
      getDocs(collection(db, `users/${tester.uid}/monthly_dues`)),
      getDocs(collection(db, `users/${tester.uid}/tabs`)),
      getDoc(doc(db, `users/${tester.uid}/wallets`, 'balances')),
    ]);

    let walletBalances = null;
    if (walletSnap.exists()) {
      const wData = walletSnap.data();
      walletBalances = {
        cashInHand: Number(wData.cashInHand) || 0,
        accountBalance: Number(wData.accountBalance) || 0,
        lastUpdated: wData.updatedAt,
      };
    }

    return {
      uid: tester.uid,
      email: tester.email,
      displayName: tester.displayName,
      role: tester.role,
      lastActive: tester.lastActive,
      transactionsCount: txSnap.size,
      duesCount: duesSnap.size,
      tabsCount: tabsSnap.size,
      walletBalances,
    };
  } catch (err) {
    console.warn('[Admin Service] fetchTesterLedgerSummary error:', err);
    return {
      uid: tester.uid,
      email: tester.email,
      displayName: tester.displayName,
      role: tester.role,
      lastActive: tester.lastActive,
      transactionsCount: 0,
      duesCount: 0,
      tabsCount: 0,
      walletBalances: null,
    };
  }
}
