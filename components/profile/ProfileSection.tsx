'use client';

import React, { useState, useEffect } from 'react';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { isSupabaseConfigured, getSupabaseSqlEditorUrl } from '@/lib/supabase/client';
import {
  getCurrentUser,
  signInWithGoogle,
  signOutUser,
  subscribeToAuthChanges,
  uploadLocalDataToCloud,
  fetchAllCloudData,
} from '@/lib/supabase/dbService';
import {
  Transaction,
  WalletBalances,
  TabItem,
  MonthlyDue,
  QuickPreset,
  BudgetConfig,
} from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import {
  User as UserIcon,
  Cloud,
  CloudOff,
  RefreshCw,
  UploadCloud,
  DownloadCloud,
  CheckCircle2,
  AlertCircle,
  LogIn,
  UserPlus,
  LogOut,
  ShieldCheck,
  Database,
  ExternalLink,
  Smartphone,
  Bell,
  FileText,
  HardDrive,
  Copy,
} from 'lucide-react';
import {
  isNotificationSupported,
  getNotificationPermission,
  requestNotificationPermission,
  getNotificationPreferences,
  setNotificationPreferences,
  sendTestNotification,
  NotificationPreferences,
} from '@/lib/notifications/notificationService';
import FeedbackCard from './FeedbackCard';

interface ProfileSectionProps {
  currentUser?: SupabaseUser | null;
  onAuthChange?: (user: SupabaseUser | null) => void;
  transactions: Transaction[];
  wallets: WalletBalances;
  tabs: TabItem[];
  dues: MonthlyDue[];
  presets: QuickPreset[];
  budget?: BudgetConfig;
  onCloudSyncSuccess: (data: {
    transactions?: Transaction[];
    wallets?: WalletBalances;
    tabs?: TabItem[];
    dues?: MonthlyDue[];
    presets?: QuickPreset[];
    budget?: BudgetConfig;
  }) => void;
  onClearAllData: () => void;
  onOpenStatement?: () => void;
  onSignOut?: () => void;
}

export default function ProfileSection({
  currentUser: propUser,
  onAuthChange,
  transactions,
  wallets,
  tabs,
  dues,
  presets,
  budget,
  onCloudSyncSuccess,
  onClearAllData,
  onOpenStatement,
  onSignOut,
}: ProfileSectionProps) {
  const [currentUser, setCurrentUser] = useState<SupabaseUser | null>(propUser || null);

  // Sync internal state when parent propUser changes
  useEffect(() => {
    if (propUser !== undefined) {
      setCurrentUser(propUser);
    }
  }, [propUser]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [lastSyncedTime, setLastSyncedTime] = useState<string | null>(null);
  const [schemaFixNeeded, setSchemaFixNeeded] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);

  // Phone Notifications State
  const [notifPermission, setNotifPermission] = useState<NotificationPermission | 'unsupported'>('default');
  const [notifPrefs, setNotifPrefs] = useState<NotificationPreferences>({
    enabled: true,
    notifyDues: true,
    notifyTabs: true,
    frequencyHours: 5,
  });
  const [testingNotif, setTestingNotif] = useState(false);
  const [notifFeedback, setNotifFeedback] = useState<string | null>(null);

  // Check Supabase Auth
  useEffect(() => {
    let mounted = true;
    getCurrentUser().then((user) => {
      if (mounted) setCurrentUser(user);
    });

    const sub = subscribeToAuthChanges((user) => {
      if (mounted) {
        setCurrentUser(user);
        onAuthChange?.(user);
      }
    });

    return () => {
      mounted = false;
      sub?.unsubscribe?.();
    };
  }, []);

  // Notifications init
  useEffect(() => {
    let mounted = true;
    const checkPerm = async () => {
      const supported = isNotificationSupported();
      if (supported) {
        const perm = await getNotificationPermission();
        if (mounted) {
          setNotifPermission(perm);
          setNotifPrefs(getNotificationPreferences());
        }
      } else {
        // Retry shortly in case native bridge was initializing
        setTimeout(async () => {
          if (!mounted) return;
          if (isNotificationSupported()) {
            const perm = await getNotificationPermission();
            setNotifPermission(perm);
            setNotifPrefs(getNotificationPreferences());
          } else {
            setNotifPermission('unsupported');
          }
        }, 600);
      }
    };
    checkPerm();
    return () => {
      mounted = false;
    };
  }, []);

  const handleRequestPermission = async () => {
    const granted = await requestNotificationPermission();
    const perm = await getNotificationPermission();
    setNotifPermission(perm);
    if (granted) {
      setNotifFeedback('Notifications enabled! You will receive timely alerts for upcoming dues & tabs.');
      setTimeout(() => setNotifFeedback(null), 4000);
    }
  };

  const handleTogglePref = (key: keyof NotificationPreferences, val: boolean) => {
    const updated = { ...notifPrefs, [key]: val };
    setNotifPrefs(updated);
    setNotificationPreferences(updated);
  };

  const handleSendTest = async () => {
    setTestingNotif(true);
    setNotifFeedback(null);
    try {
      const ok = await sendTestNotification();
      if (ok) {
        setNotifFeedback('Test alert dispatched to this device!');
      } else {
        setNotifFeedback('Could not display alert. Check system notification settings.');
      }
    } catch {
      setNotifFeedback('Failed to trigger alert.');
    } finally {
      setTestingNotif(false);
      setTimeout(() => setNotifFeedback(null), 4000);
    }
  };

  const handleSignOut = async () => {
    setLoading(true);
    try {
      await signOutUser();
      setCurrentUser(null);
      onSignOut?.();
      setMessage({ type: 'success', text: 'Signed out successfully' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Sign out failed' });
    } finally {
      setLoading(false);
    }
  };

  const handleUploadToCloud = async () => {
    if (!currentUser) {
      setMessage({ type: 'error', text: 'Sign in to sync your data to the cloud.' });
      return;
    }
    setSyncing(true);
    setMessage(null);
    try {
      const res = await uploadLocalDataToCloud({
        transactions,
        wallets,
        tabs,
        dues,
        presets,
        budget,
      });
      if (res.success) {
        setLastSyncedTime(new Date().toLocaleTimeString());
        setMessage({ type: 'success', text: 'Local ledger pushed to Cloud successfully!' });
        setSchemaFixNeeded(false);
      } else {
        if (res.needsSchemaMigration || res.error?.includes('transactions_type_check')) {
          setSchemaFixNeeded(true);
        }
        throw new Error(res.error || 'Failed to upload data');
      }
    } catch (err: any) {
      if (err.message?.includes('transactions_type_check')) {
        setSchemaFixNeeded(true);
      }
      setMessage({ type: 'error', text: err.message || 'Error uploading to cloud' });
    } finally {
      setSyncing(false);
    }
  };

  const handleDownloadFromCloud = async () => {
    if (!currentUser) {
      setMessage({ type: 'error', text: 'Sign in to fetch your cloud backup.' });
      return;
    }
    setSyncing(true);
    setMessage(null);
    try {
      const cloudData = await fetchAllCloudData();
      if (cloudData) {
        onCloudSyncSuccess({
          transactions: cloudData.transactions,
          wallets: cloudData.wallets,
          tabs: cloudData.tabs,
          dues: cloudData.dues,
          presets: cloudData.presets,
          budget: cloudData.budget,
        });
        setLastSyncedTime(new Date().toLocaleTimeString());
        setMessage({
          type: 'success',
          text: `Downloaded ${cloudData.transactions?.length || 0} transactions, ${cloudData.dues?.length || 0} dues & ${cloudData.tabs?.length || 0} tabs from cloud!`,
        });
      } else {
        throw new Error('Failed to retrieve cloud data (Supabase client not initialized)');
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Error pulling from cloud' });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="space-y-4 max-w-2xl mx-auto w-full px-2 sm:px-0">
      {/* User Header Card */}
      <div className="bg-white rounded-2xl p-5 border border-zinc-200 shadow-sm flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-black flex items-center justify-center text-white shadow-xs shrink-0">
            <UserIcon className="w-6 h-6 stroke-[2]" />
          </div>
          <div>
            <h2 className="text-base font-bold text-zinc-950">
              {currentUser?.email?.split('@')[0] || 'Local User'}
            </h2>
            <p className="text-xs text-zinc-500 font-mono">
              {currentUser?.email || 'Offline Local Storage Profile'}
            </p>
          </div>
        </div>

        <span
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-semibold border ${
            currentUser
              ? 'bg-zinc-100 text-black border-zinc-300'
              : 'bg-zinc-50 text-zinc-600 border-zinc-200'
          }`}
        >
          <span
            className={`w-2 h-2 rounded-full ${
              currentUser ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-400'
            }`}
          />
          <span>{currentUser ? 'Cloud Synced' : 'Device Storage'}</span>
        </span>
      </div>

      {/* Global Status Message */}
      {message && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center gap-2.5 transition-all ${
            message.type === 'success'
              ? 'bg-zinc-100 border-zinc-300 text-zinc-950'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-black shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Supabase Schema Fix Banner for Transfers */}
      {(schemaFixNeeded || message?.text?.includes('transactions_type_check')) && (
        <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 shadow-sm space-y-3">
          <div className="flex items-start gap-2.5">
            <div className="p-2 bg-amber-100 rounded-xl text-amber-900 shrink-0 mt-0.5">
              <Database className="w-4 h-4" />
            </div>
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-amber-950">
                1-Time Database Update Required for Transfers
              </h4>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                Your Supabase PostgreSQL table has a constraint restricting transactions to <code className="bg-amber-100 px-1 py-0.5 rounded text-[10px] font-mono font-semibold">(&apos;income&apos;, &apos;expense&apos;)</code>.
                To sync your <strong>Cash ⇄ Account Transfers</strong>, run this 2-line SQL command in your Supabase SQL Editor:
              </p>
            </div>
          </div>

          <div className="relative bg-zinc-900 text-zinc-100 p-3 rounded-xl font-mono text-[11px] leading-relaxed overflow-x-auto select-all">
            <p>ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_type_check;</p>
            <p>ALTER TABLE public.transactions ADD CONSTRAINT transactions_type_check CHECK (type IN (&apos;income&apos;, &apos;expense&apos;, &apos;transfer&apos;));</p>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                const sql = `ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_type_check;\nALTER TABLE public.transactions ADD CONSTRAINT transactions_type_check CHECK (type IN ('income', 'expense', 'transfer'));\nALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS transfer_direction TEXT CHECK (transfer_direction IN ('cash_to_account', 'account_to_cash'));\nNOTIFY pgrst, 'reload schema';`;
                navigator.clipboard.writeText(sql);
                setCopyFeedback(true);
                setTimeout(() => setCopyFeedback(false), 3000);
              }}
              className="flex-1 py-2 px-3 bg-black text-white text-xs font-semibold rounded-xl hover:bg-zinc-800 transition-all flex items-center justify-center gap-1.5"
            >
              {copyFeedback ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Copied to Clipboard!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy SQL Fix</span>
                </>
              )}
            </button>
            <a
              href={getSupabaseSqlEditorUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="py-2 px-3 bg-white text-black border border-zinc-300 text-xs font-semibold rounded-xl hover:bg-zinc-50 transition-all flex items-center gap-1.5"
            >
              <span>Open SQL Editor</span>
              <ExternalLink className="w-3 h-3 text-zinc-500" />
            </a>
          </div>
        </div>
      )}

      {/* Cloud Sync Database Card: Supabase */}
      <div className="p-4 sm:p-5 bg-white rounded-2xl border border-zinc-200 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-zinc-100 rounded-xl">
              <Database className="w-4 h-4 text-black" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs sm:text-sm font-bold text-zinc-900">
                  Supabase Cloud Database
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-black text-white">
                  PostgreSQL
                </span>
              </div>
              <p className="text-[10px] sm:text-xs text-zinc-500">
                Secure cloud backup and multi-device sync
              </p>
            </div>
          </div>

          <span
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-semibold border ${
              isSupabaseConfigured
                ? 'bg-zinc-100 text-black border-zinc-300'
                : 'bg-zinc-50 text-zinc-600 border-zinc-200'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isSupabaseConfigured ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-400'
              }`}
            />
            <span>{isSupabaseConfigured ? 'Connected' : 'Offline / Demo'}</span>
          </span>
        </div>

        {/* Google Auth or Session display */}
        {!currentUser ? (
          <div className="pt-2">
            <button
              type="button"
              onClick={async () => {
                setLoading(true);
                try {
                  await signInWithGoogle();
                } catch (err: any) {
                  setMessage({ type: 'error', text: err.message || 'Google sign-in failed' });
                  setLoading(false);
                }
              }}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 bg-white border border-zinc-300 rounded-xl text-xs font-semibold text-zinc-800 hover:bg-zinc-50 hover:text-black transition-all shadow-xs cursor-pointer disabled:opacity-60"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>{loading ? 'Connecting with Google...' : 'Continue with Google'}</span>
            </button>
          </div>
        ) : (
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between p-3 bg-zinc-50 rounded-xl border border-zinc-200 text-xs">
              <div className="space-y-0.5">
                <span className="text-[10px] text-zinc-500 font-mono block">Logged In As</span>
                <span className="font-semibold text-zinc-900">{currentUser.email}</span>
                {lastSyncedTime && (
                  <span className="text-[10px] text-zinc-500 block">
                    Last sync: {lastSyncedTime}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={handleSignOut}
                disabled={loading}
                className="flex items-center gap-1 px-3 py-1.5 bg-zinc-200 hover:bg-zinc-300 text-zinc-800 rounded-lg text-xs font-semibold transition-colors"
              >
                <LogOut className="w-3 h-3" />
                <span>Sign Out</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleUploadToCloud}
                disabled={syncing}
                className="flex items-center justify-center gap-2 p-2.5 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 rounded-xl text-xs font-semibold text-zinc-900 transition-all disabled:opacity-50"
              >
                <UploadCloud className="w-4 h-4 text-black" />
                <span>Upload to Cloud</span>
              </button>
              <button
                onClick={handleDownloadFromCloud}
                disabled={syncing}
                className="flex items-center justify-center gap-2 p-2.5 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 rounded-xl text-xs font-semibold text-zinc-900 transition-all disabled:opacity-50"
              >
                <DownloadCloud className="w-4 h-4 text-black" />
                <span>Download from Cloud</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Phone Notifications & Alerts Card */}
      <div className="p-4 sm:p-5 bg-white rounded-2xl border border-zinc-200 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-zinc-100 rounded-xl text-black">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-zinc-950">Phone Notifications &amp; Alerts</h3>
              <p className="text-[10px] sm:text-xs text-zinc-500">
                Native device alerts for upcoming dues &amp; unsettled tabs
              </p>
            </div>
          </div>

          <span
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-semibold border ${
              notifPermission === 'granted'
                ? 'bg-zinc-900 text-white border-zinc-800'
                : notifPermission === 'denied'
                ? 'bg-red-50 text-red-700 border-red-200'
                : 'bg-zinc-100 text-zinc-700 border-zinc-300'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                notifPermission === 'granted'
                  ? 'bg-emerald-400 animate-pulse'
                  : notifPermission === 'denied'
                  ? 'bg-red-500'
                  : 'bg-amber-400'
              }`}
            />
            <span>
              {notifPermission === 'granted'
                ? 'Active'
                : notifPermission === 'denied'
                ? 'Blocked'
                : notifPermission === 'unsupported'
                ? 'Unsupported'
                : 'Action Needed'}
            </span>
          </span>
        </div>

        {notifFeedback && (
          <div className="p-2.5 bg-zinc-100 rounded-xl border border-zinc-200 text-xs text-zinc-900 flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-3.5 h-3.5 text-black shrink-0" />
            <span>{notifFeedback}</span>
          </div>
        )}

        {notifPermission === 'denied' && (
          <div className="p-3 bg-red-50 rounded-xl border border-red-200 text-xs text-red-700 space-y-1">
            <p className="font-semibold">Notifications are blocked on this device</p>
            <p className="text-[11px] text-red-600">
              To enable alerts, tap the site settings / lock icon in your browser address bar and set Notifications to &quot;Allow&quot;.
            </p>
          </div>
        )}

        {notifPermission === 'default' && (
          <div className="p-3 bg-zinc-50 rounded-xl border border-dashed border-zinc-300 space-y-2">
            <p className="text-xs font-semibold text-zinc-900">
              Never miss a monthly due or pending debt
            </p>
            <p className="text-[11px] text-zinc-500">
              Allow notifications to receive quiet, timely alerts on this phone when a payment is due today, tomorrow, or overdue.
            </p>
            <button
              type="button"
              onClick={handleRequestPermission}
              className="w-full sm:w-auto px-4 py-2 bg-black hover:bg-zinc-800 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 shadow-sm"
            >
              <Bell className="w-3.5 h-3.5" />
              <span>Enable Phone Alerts</span>
            </button>
          </div>
        )}

        {notifPermission === 'granted' && (
          <div className="space-y-3 pt-1">
            <div className="space-y-2">
              <label className="flex items-center justify-between p-2.5 bg-zinc-50 hover:bg-zinc-100 rounded-xl border border-zinc-200 cursor-pointer transition-colors">
                <div className="space-y-0.5">
                  <span className="text-xs font-semibold text-zinc-900 block">Master Notification Switch</span>
                  <span className="text-[10px] text-zinc-500 block">
                    Receive native notifications on this phone
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={notifPrefs.enabled}
                  onChange={(e) => handleTogglePref('enabled', e.target.checked)}
                  className="w-4 h-4 rounded border-zinc-300 text-black focus:ring-black accent-black cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between p-2.5 bg-zinc-50 hover:bg-zinc-100 rounded-xl border border-zinc-200 cursor-pointer transition-colors">
                <div className="space-y-0.5">
                  <span className="text-xs font-semibold text-zinc-900 block">Monthly Dues &amp; Bills</span>
                  <span className="text-[10px] text-zinc-500 block">
                    Alerts 2 days before, 1 day before, day of due date, and overdue
                  </span>
                </div>
                <input
                  type="checkbox"
                  disabled={!notifPrefs.enabled}
                  checked={notifPrefs.notifyDues}
                  onChange={(e) => handleTogglePref('notifyDues', e.target.checked)}
                  className="w-4 h-4 rounded border-zinc-300 text-black focus:ring-black accent-black cursor-pointer disabled:opacity-40"
                />
              </label>

              <label className="flex items-center justify-between p-2.5 bg-zinc-50 hover:bg-zinc-100 rounded-xl border border-zinc-200 cursor-pointer transition-colors">
                <div className="space-y-0.5">
                  <span className="text-xs font-semibold text-zinc-900 block">Pending Tabs &amp; Splits</span>
                  <span className="text-[10px] text-zinc-500 block">
                    Reminders for unsettled debts or receivables older than 2 days
                  </span>
                </div>
                <input
                  type="checkbox"
                  disabled={!notifPrefs.enabled}
                  checked={notifPrefs.notifyTabs}
                  onChange={(e) => handleTogglePref('notifyTabs', e.target.checked)}
                  className="w-4 h-4 rounded border-zinc-300 text-black focus:ring-black accent-black cursor-pointer disabled:opacity-40"
                />
              </label>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-2 border-t border-zinc-100">
              <span className="text-[10px] text-zinc-500 font-mono">
                Cooldown: ~5 hours (max 2–3 alerts/day)
              </span>

              <button
                type="button"
                onClick={handleSendTest}
                disabled={testingNotif}
                className="flex items-center justify-center gap-2 px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-900 text-xs font-semibold rounded-xl border border-zinc-300 transition-all active:scale-95 disabled:opacity-50"
              >
                <Smartphone className="w-3.5 h-3.5 text-black" />
                <span>{testingNotif ? 'Sending Alert...' : 'Send Test Notification'}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Monthly Financial Statement Card */}
      {onOpenStatement && (
        <div className="p-4 sm:p-5 bg-white rounded-2xl border border-zinc-200 shadow-sm flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-zinc-100 rounded-xl text-black">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-zinc-950">
                Monthly Financial Statement
              </h3>
              <p className="text-[10px] sm:text-xs text-zinc-500">
                Generate printable PDF reports &amp; download CSV spreadsheets
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenStatement}
            className="flex items-center gap-1.5 px-3 py-2 bg-black hover:bg-zinc-800 text-white text-xs font-semibold rounded-xl shadow-xs transition-all active:scale-95 shrink-0"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Open Statement</span>
          </button>
        </div>
      )}

      {/* User Feedback & Suggestions */}
      <FeedbackCard />

      {/* Local Device Diagnostics & Stats */}
      <div className="p-4 sm:p-5 bg-white rounded-2xl border border-zinc-200 shadow-sm space-y-3">
        <div className="flex items-center gap-2">
          <HardDrive className="w-4 h-4 text-black" />
          <h3 className="text-xs sm:text-sm font-bold text-zinc-950">Local Storage Diagnostics</h3>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
          <div className="p-2.5 bg-zinc-50 rounded-xl border border-zinc-100">
            <span className="text-[10px] text-zinc-500 block">Transactions</span>
            <span className="text-sm font-mono font-bold text-zinc-900">{transactions.length}</span>
          </div>
          <div className="p-2.5 bg-zinc-50 rounded-xl border border-zinc-100">
            <span className="text-[10px] text-zinc-500 block">Tabs / Splits</span>
            <span className="text-sm font-mono font-bold text-zinc-900">{tabs.length}</span>
          </div>
          <div className="p-2.5 bg-zinc-50 rounded-xl border border-zinc-100">
            <span className="text-[10px] text-zinc-500 block">Monthly Dues</span>
            <span className="text-sm font-mono font-bold text-zinc-900">{dues.length}</span>
          </div>
          <div className="p-2.5 bg-zinc-50 rounded-xl border border-zinc-100">
            <span className="text-[10px] text-zinc-500 block">Total Liquid</span>
            <span className="text-sm font-mono font-bold text-zinc-900">
              {formatCurrency(wallets.cashInHand + wallets.accountBalance)}
            </span>
          </div>
        </div>

        {/* Clear All Data */}
        <div className="pt-2 border-t border-zinc-100 flex items-center justify-between">
          <span className="text-[11px] text-zinc-500">Need to start fresh on this device?</span>
          <button
            onClick={() => {
              if (confirm('Are you sure you want to clear all local data on this device?')) {
                onClearAllData();
              }
            }}
            className="px-3 py-1.5 text-xs text-red-600 hover:text-white hover:bg-red-600 rounded-lg border border-red-200 transition-colors"
          >
            Clear Local Data
          </button>
        </div>
      </div>
    </div>
  );
}
