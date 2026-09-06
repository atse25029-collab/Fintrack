import { getSupabaseClient, isSupabaseConfigured } from './client';
import {
  fetchAllCloudData,
  uploadLocalDataToCloud,
} from './dbService';
import {
  Transaction,
  WalletBalances,
  TabItem,
  MonthlyDue,
  QuickPreset,
  BudgetConfig,
} from '@/lib/types';

export type SyncStatus = 'synced' | 'syncing' | 'offline' | 'error';

export interface FullAppData {
  transactions: Transaction[];
  wallets: WalletBalances;
  tabs: TabItem[];
  dues: MonthlyDue[];
  presets: QuickPreset[];
  budget: BudgetConfig;
}

let lastKnownChecksum = '';
let currentSyncStatus: SyncStatus = 'synced';
const statusListeners = new Set<(status: SyncStatus) => void>();

export function getSyncStatus(): SyncStatus {
  return currentSyncStatus;
}

export function subscribeToSyncStatus(listener: (status: SyncStatus) => void): () => void {
  statusListeners.add(listener);
  listener(currentSyncStatus);
  return () => {
    statusListeners.delete(listener);
  };
}

function setSyncStatus(status: SyncStatus) {
  if (currentSyncStatus !== status) {
    currentSyncStatus = status;
    statusListeners.forEach((fn) => fn(status));
  }
}

/**
 * Fast, lightweight fingerprint hash of the entire dataset.
 * Prevents unnecessary React re-renders when data in cloud is identical to local state.
 */
export function computeDataChecksum(data: Partial<FullAppData>): string {
  try {
    const txLen = data.transactions?.length ?? 0;
    const txSample = (data.transactions || [])
      .slice(0, 5)
      .map((t) => `${t.id}:${t.amount}:${t.date}:${t.type}`)
      .join('|');

    const walletSig = data.wallets
      ? `${data.wallets.cashInHand}:${data.wallets.accountBalance}:${data.wallets.lastUpdated}`
      : 'w-none';

    const duesSig = (data.dues || [])
      .map((d) => `${d.id}:${d.status}:${d.lastPaidDate || ''}`)
      .join('|');

    const tabsSig = (data.tabs || [])
      .map((t) => `${t.id}:${t.status}:${t.settledAt || ''}`)
      .join('|');

    const budgetSig = data.budget
      ? `${data.budget.monthlyLimit}:${data.budget.dailyAllowance}`
      : 'b-none';

    const presetsLen = data.presets?.length ?? 0;

    return `tx(${txLen}:${txSample})_w(${walletSig})_d(${duesSig})_t(${tabsSig})_b(${budgetSig})_p(${presetsLen})`;
  } catch {
    return String(Date.now());
  }
}

export function updateLocalChecksum(data: Partial<FullAppData>) {
  lastKnownChecksum = computeDataChecksum(data);
}

/**
 * Triggers an immediate upload of full state to cloud after ANY user interaction.
 * Provides complete resilience against cold starts and tab closures.
 */
let uploadDebounceTimer: NodeJS.Timeout | null = null;

export async function triggerImmediateCloudUpload(
  data: FullAppData
): Promise<void> {
  if (!isSupabaseConfigured) return;

  // Update local checksum so incoming poll doesn't echo our own write
  updateLocalChecksum(data);
  setSyncStatus('syncing');

  try {
    const result = await uploadLocalDataToCloud(data);
    if (result.success) {
      setSyncStatus('synced');
    } else {
      setSyncStatus('error');
    }
  } catch (err) {
    console.warn('Immediate cloud upload error:', err);
    setSyncStatus('error');
  }
}

/**
 * Schedules debounced upload if multiple interactions occur in rapid succession
 */
export function scheduleDebouncedCloudUpload(
  getData: () => FullAppData,
  delayMs = 300
) {
  if (uploadDebounceTimer) clearTimeout(uploadDebounceTimer);
  uploadDebounceTimer = setTimeout(() => {
    const data = getData();
    triggerImmediateCloudUpload(data);
  }, delayMs);
}

/**
 * High-frequency background cloud retrieval loop (every 2.5s)
 * Compares checksums before triggering any state update to avoid UI flickering.
 */
export function startContinuousCloudSync(options: {
  onCloudUpdate: (cloudData: Partial<FullAppData>) => void;
  intervalMs?: number; // default 2500ms (2.5 sec)
}): () => void {
  if (typeof window === 'undefined') return () => {};

  const interval = options.intervalMs || 2500;
  let isPolling = false;
  let isSubscribed = true;

  const performFetch = async () => {
    if (!isSupabaseConfigured || isPolling || !isSubscribed) return;
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setSyncStatus('offline');
      return;
    }

    try {
      isPolling = true;
      const cloudData = await fetchAllCloudData();

      if (cloudData && isSubscribed) {
        const newChecksum = computeDataChecksum(cloudData);

        // ONLY trigger update if data has actually changed remotely!
        if (newChecksum !== lastKnownChecksum) {
          lastKnownChecksum = newChecksum;
          setSyncStatus('syncing');
          options.onCloudUpdate(cloudData);
          setSyncStatus('synced');
        } else {
          setSyncStatus('synced');
        }
      }
    } catch (err) {
      console.warn('Continuous cloud retrieval loop notice:', err);
      // Keep running, don't crash
    } finally {
      isPolling = false;
    }
  };

  // 1. Initial fetch
  performFetch();

  // 2. Periodic poll every 2.5 seconds
  const timer = setInterval(performFetch, interval);

  // 3. Supabase Realtime channel subscription (instant push on Postgres changes)
  const client = getSupabaseClient();
  let channel: any = null;

  if (client) {
    try {
      channel = client
        .channel('public:fintrack-live-sync')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'transactions' },
          () => performFetch()
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'wallets' },
          () => performFetch()
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'monthly_dues' },
          () => performFetch()
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'tabs' },
          () => performFetch()
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'budget_config' },
          () => performFetch()
        )
        .subscribe();
    } catch (err) {
      console.warn('Supabase Realtime subscription error:', err);
    }
  }

  // 4. Tab visibility and online event listeners
  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      performFetch();
    }
  };

  const handleOnline = () => {
    setSyncStatus('syncing');
    performFetch();
  };

  const handleOffline = () => {
    setSyncStatus('offline');
  };

  window.addEventListener('visibilitychange', handleVisibilityChange);
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  // Return cleanup function
  return () => {
    isSubscribed = false;
    clearInterval(timer);
    if (channel && client) {
      client.removeChannel(channel);
    }
    window.removeEventListener('visibilitychange', handleVisibilityChange);
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}
