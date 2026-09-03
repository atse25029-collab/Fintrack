import { Transaction, BudgetConfig, TabItem, MonthlyDue } from '../types';
import { INITIAL_TRANSACTIONS, DEFAULT_BUDGET, INITIAL_TABS, INITIAL_MONTHLY_DUES } from '../sampleData';

const KV_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

// In-memory fallbacks
let memoryTransactions: Transaction[] = [...INITIAL_TRANSACTIONS];
let memoryBudget: BudgetConfig = { ...DEFAULT_BUDGET };
let memoryTabs: TabItem[] = [...INITIAL_TABS];
let memoryDues: MonthlyDue[] = [...INITIAL_MONTHLY_DUES];

export const isVercelKvConfigured = Boolean(KV_URL && KV_TOKEN);

async function kvCommand<T>(command: string, ...args: (string | number)[]): Promise<T | null> {
  if (!KV_URL || !KV_TOKEN) return null;

  try {
    const res = await fetch(`${KV_URL}/${command}/${args.map(encodeURIComponent).join('/')}`, {
      headers: {
        Authorization: `Bearer ${KV_TOKEN}`,
      },
      cache: 'no-store',
    });

    if (!res.ok) return null;
    const data = await res.json();
    return data.result as T;
  } catch (err) {
    console.warn('Vercel KV error:', err);
    return null;
  }
}

// Transactions
export async function getStoredTransactions(): Promise<Transaction[]> {
  if (isVercelKvConfigured) {
    const data = await kvCommand<string>('get', 'fintrack_transactions');
    if (data) {
      try {
        const parsed = typeof data === 'string' ? JSON.parse(data) : data;
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {
        console.error('Error parsing Vercel KV transactions:', e);
      }
    }
  }
  return memoryTransactions;
}

export async function saveTransactions(transactions: Transaction[]): Promise<boolean> {
  memoryTransactions = transactions;

  if (isVercelKvConfigured) {
    try {
      const res = await fetch(`${KV_URL}/set/fintrack_transactions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${KV_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(JSON.stringify(transactions)),
        cache: 'no-store',
      });
      return res.ok;
    } catch (e) {
      console.error('Failed to write to Vercel KV:', e);
      return false;
    }
  }
  return true;
}

// Budget
export async function getStoredBudget(): Promise<BudgetConfig> {
  if (isVercelKvConfigured) {
    const data = await kvCommand<string>('get', 'fintrack_budget');
    if (data) {
      try {
        const parsed = typeof data === 'string' ? JSON.parse(data) : data;
        if (parsed && parsed.dailyAllowance) return parsed;
      } catch (e) {
        console.error('Error parsing Vercel KV budget:', e);
      }
    }
  }
  return memoryBudget;
}

export async function saveBudget(budget: BudgetConfig): Promise<boolean> {
  memoryBudget = budget;
  if (isVercelKvConfigured) {
    try {
      const res = await fetch(`${KV_URL}/set/fintrack_budget`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${KV_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(JSON.stringify(budget)),
        cache: 'no-store',
      });
      return res.ok;
    } catch (e) {
      return false;
    }
  }
  return true;
}

// Tabs (Lent & Borrowed)
export async function getStoredTabs(): Promise<TabItem[]> {
  if (isVercelKvConfigured) {
    const data = await kvCommand<string>('get', 'fintrack_tabs');
    if (data) {
      try {
        const parsed = typeof data === 'string' ? JSON.parse(data) : data;
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {
        console.error('Error parsing Vercel KV tabs:', e);
      }
    }
  }
  return memoryTabs;
}

export async function saveTabs(tabs: TabItem[]): Promise<boolean> {
  memoryTabs = tabs;
  if (isVercelKvConfigured) {
    try {
      const res = await fetch(`${KV_URL}/set/fintrack_tabs`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${KV_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(JSON.stringify(tabs)),
        cache: 'no-store',
      });
      return res.ok;
    } catch (e) {
      return false;
    }
  }
  return true;
}

// Monthly Dues
export async function getStoredDues(): Promise<MonthlyDue[]> {
  if (isVercelKvConfigured) {
    const data = await kvCommand<string>('get', 'fintrack_dues');
    if (data) {
      try {
        const parsed = typeof data === 'string' ? JSON.parse(data) : data;
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {
        console.error('Error parsing Vercel KV dues:', e);
      }
    }
  }
  return memoryDues;
}

export async function saveDues(dues: MonthlyDue[]): Promise<boolean> {
  memoryDues = dues;
  if (isVercelKvConfigured) {
    try {
      const res = await fetch(`${KV_URL}/set/fintrack_dues`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${KV_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(JSON.stringify(dues)),
        cache: 'no-store',
      });
      return res.ok;
    } catch (e) {
      return false;
    }
  }
  return true;
}
