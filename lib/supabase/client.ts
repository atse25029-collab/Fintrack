import { createClient, SupabaseClient } from '@supabase/supabase-js';

const STORAGE_URL_KEY = 'fintrack_supabase_url';
const STORAGE_ANON_KEY = 'fintrack_supabase_anon_key';
const DEFAULT_SUPABASE_URL = 'https://etojohnmcqrpkuqvmkpv.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV0b2pvaG5tY3FycGt1cXZta3B2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0NDI4MDMsImV4cCI6MjEwNDAxODgwM30.EYLA2pRoDP9sD17GqgXbCJ-FE7sOtLud7k63jDoPG0k';

export function getSupabaseUrl(): string {
  const envUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL;
  if (envUrl && envUrl.startsWith('https://')) return envUrl;

  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(STORAGE_URL_KEY);
      if (stored && stored.startsWith('https://')) return stored;
    } catch {
      // ignore
    }
  }

  return DEFAULT_SUPABASE_URL;
}

export function getSupabaseAnonKey(): string {
  const envKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY;
  if (envKey && envKey.length > 15) return envKey;

  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(STORAGE_ANON_KEY);
      if (stored && stored.length > 15) return stored;
    } catch {
      // ignore
    }
  }

  return DEFAULT_SUPABASE_ANON_KEY;
}

export function checkIsSupabaseConfigured(): boolean {
  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey();
  return Boolean(url && key && url.startsWith('https://') && key.length > 15);
}

export const isSupabaseConfigured = checkIsSupabaseConfigured();

let cachedClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey();

  if (!url || !key || key.length <= 15) {
    return null;
  }

  if (!cachedClient) {
    cachedClient = createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }
  return cachedClient;
}

export function setSupabaseCredentials(url: string, anonKey: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const cleanUrl = url.trim().replace(/\/+$/, '');
    const cleanKey = anonKey.trim();
    if (!cleanUrl.startsWith('https://') || cleanKey.length <= 15) {
      return false;
    }
    localStorage.setItem(STORAGE_URL_KEY, cleanUrl);
    localStorage.setItem(STORAGE_ANON_KEY, cleanKey);
    // Reset cached client with new credentials
    cachedClient = createClient(cleanUrl, cleanKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
    return true;
  } catch (err) {
    console.error('Failed to store Supabase credentials:', err);
    return false;
  }
}

export function clearSupabaseCredentials(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_URL_KEY);
    localStorage.removeItem(STORAGE_ANON_KEY);
    cachedClient = null;
  } catch {
    // ignore
  }
}

export function getSupabaseSqlEditorUrl(): string {
  const url = getSupabaseUrl();
  if (url) {
    const match = url.match(/https:\/\/([^.]+)\.supabase\.co/);
    if (match && match[1]) {
      return `https://supabase.com/dashboard/project/${match[1]}/sql/new`;
    }
  }
  return 'https://supabase.com/dashboard/project/_/sql/new';
}
