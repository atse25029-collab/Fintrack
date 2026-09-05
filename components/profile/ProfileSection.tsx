'use client';

import React, { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import {
  getCurrentUser,
  signInWithEmail,
  signUpWithEmail,
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
  HardDrive,
  Bell,
  BellRing,
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

interface ProfileSectionProps {
  transactions: Transaction[];
  wallets: WalletBalances;
  tabs: TabItem[];
  dues: MonthlyDue[];
  presets: QuickPreset[];
  budget: BudgetConfig;
  onCloudSyncSuccess: (data: {
    transactions?: Transaction[];
    wallets?: WalletBalances;
    tabs?: TabItem[];
    dues?: MonthlyDue[];
    presets?: QuickPreset[];
    budget?: BudgetConfig;
  }) => void;
  onClearAllData: () => void;
}

export default function ProfileSection({
  transactions,
  wallets,
  tabs,
  dues,
  presets,
  budget,
  onCloudSyncSuccess,
  onClearAllData,
}: ProfileSectionProps) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [lastSyncedTime, setLastSyncedTime] = useState<string | null>(null);

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

  useEffect(() => {
    setNotifPermission(getNotificationPermission());
    setNotifPrefs(getNotificationPreferences());
  }, []);

  const handleRequestPermission = async () => {
    const granted = await requestNotificationPermission();
    setNotifPermission(getNotificationPermission());
    if (granted) {
      setNotifFeedback('Notifications enabled successfully!');
    } else {
      setNotifFeedback('Permission was not granted.');
    }
    setTimeout(() => setNotifFeedback(null), 4000);
  };

  const handleTogglePref = (key: keyof NotificationPreferences, value: boolean) => {
    const updated = setNotificationPreferences({ [key]: value });
    setNotifPrefs(updated);
  };

  const handleSendTest = async () => {
    setTestingNotif(true);
    setNotifFeedback(null);
    try {
      const success = await sendTestNotification();
      setNotifPermission(getNotificationPermission());
      if (success) {
        setNotifFeedback('Test alert dispatched! Check your phone notification tray.');
      } else {
        setNotifFeedback('Unable to send alert. Check notification permissions in browser settings.');
      }
    } catch (err: any) {
      setNotifFeedback(`Failed: ${err.message || 'Error triggering alert'}`);
    } finally {
      setTestingNotif(false);
      setTimeout(() => setNotifFeedback(null), 5000);
    }
  };

  useEffect(() => {
    if (isSupabaseConfigured) {
      getCurrentUser().then(setCurrentUser);
      const subscription = subscribeToAuthChanges((user) => {
        setCurrentUser(user);
      });
      return () => {
        subscription?.unsubscribe();
      };
    }
  }, []);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setLoading(true);
    setMessage(null);

    try {
      if (authMode === 'signin') {
        const { error } = await signInWithEmail(email, password);
        if (error) throw error;
        setMessage({ type: 'success', text: 'Signed in successfully! Multi-device sync active.' });
      } else {
        const { error } = await signUpWithEmail(email, password);
        if (error) throw error;
        setMessage({
          type: 'success',
          text: 'Account created! Please check your email inbox to confirm your address.',
        });
      }
      setEmail('');
      setPassword('');
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Authentication failed' });
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    setLoading(true);
    await signOutUser();
    setCurrentUser(null);
    setLoading(false);
    setMessage({ type: 'success', text: 'Signed out. Operating in local offline mode.' });
  };

  const handleUploadToCloud = async () => {
    setSyncing(true);
    setMessage(null);
    try {
      const result = await uploadLocalDataToCloud({
        transactions,
        wallets,
        tabs,
        dues,
        presets,
        budget,
      });

      if (result.success) {
        setLastSyncedTime(new Date().toLocaleTimeString());
        setMessage({
          type: 'success',
          text: `Backup complete! ${dues.length} dues, ${transactions.length} transactions, and ${tabs.length} tabs backed up to Supabase.`,
        });
      } else {
        setMessage({
          type: 'error',
          text: result.error || 'Cloud backup failed. Check your Supabase tables in SQL Editor.',
        });
      }
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: err.message || 'Cloud backup encountered an error.',
      });
    } finally {
      setSyncing(false);
    }
  };

  const handleDownloadFromCloud = async () => {
    setSyncing(true);
    setMessage(null);
    try {
      const cloudData = await fetchAllCloudData();
      if (cloudData) {
        onCloudSyncSuccess(cloudData);
        setLastSyncedTime(new Date().toLocaleTimeString());
        const duesCount = cloudData.dues ? cloudData.dues.length : 0;
        const txCount = cloudData.transactions ? cloudData.transactions.length : 0;
        const tabCount = cloudData.tabs ? cloudData.tabs.length : 0;
        setMessage({
          type: 'success',
          text: `Restore complete! Successfully retrieved ${duesCount} monthly dues, ${txCount} transactions, and ${tabCount} tabs from Supabase.`,
        });
      } else {
        setMessage({
          type: 'error',
          text: 'No cloud data found. Ensure tables are created using schema.sql in Supabase.',
        });
      }
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: `Download failed: ${err.message || 'Check database connection'}.`,
      });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 w-full max-w-full overflow-hidden">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <UserIcon className="w-5 h-5 text-black" />
          <h2 className="text-base sm:text-lg font-bold text-zinc-950 tracking-tight">
            Profile &amp; Cloud Database Sync
          </h2>
        </div>
        <p className="text-xs text-zinc-500">
          Manage your account, multi-device PostgreSQL backup, and sync preferences
        </p>
      </div>

      {message && (
        <div
          className={`p-3 rounded-xl border flex items-start gap-2 text-xs animate-in fade-in ${
            message.type === 'success'
              ? 'bg-zinc-100 text-zinc-900 border-zinc-300'
              : 'bg-red-50 text-red-700 border-red-200'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-black mt-0.5" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Cloud Database Status Card */}
      <div className="p-4 sm:p-5 bg-white rounded-2xl border border-zinc-200 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-zinc-100 rounded-xl">
              <Database className="w-4 h-4 text-black" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-zinc-950">
                Supabase PostgreSQL Database
              </h3>
              <p className="text-[10px] sm:text-xs text-zinc-500">
                {isSupabaseConfigured
                  ? 'Connected to serverless cloud database'
                  : 'Operating in local offline-first storage mode'}
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
                isSupabaseConfigured ? 'bg-black animate-pulse' : 'bg-zinc-400'
              }`}
            />
            <span>{isSupabaseConfigured ? 'Connected' : 'Local Mode'}</span>
          </span>
        </div>

        {!isSupabaseConfigured && (
          <div className="p-3 bg-zinc-50 rounded-xl border border-dashed border-zinc-300 text-xs text-zinc-600 space-y-1.5">
            <p className="font-semibold text-zinc-900">
              How to connect your free Supabase database:
            </p>
            <ol className="list-decimal list-inside space-y-1 text-[11px] text-zinc-600">
              <li>
                Create a 100% free project at{' '}
                <a
                  href="https://supabase.com"
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium underline text-black inline-flex items-center gap-0.5"
                >
                  supabase.com <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </li>
              <li>
                In Supabase <strong>SQL Editor</strong>, run the script from{' '}
                <code className="bg-zinc-200 px-1 rounded font-mono">supabase/schema.sql</code>
              </li>
              <li>
                Add <code className="bg-zinc-200 px-1 rounded font-mono">NEXT_PUBLIC_SUPABASE_URL</code>{' '}
                and <code className="bg-zinc-200 px-1 rounded font-mono">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>{' '}
                to your Vercel project settings or <code className="bg-zinc-200 px-1 rounded font-mono">.env.local</code>
              </li>
            </ol>
          </div>
        )}
      </div>

      {/* User Account / Login Card */}
      <div className="p-4 sm:p-5 bg-white rounded-2xl border border-zinc-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-zinc-100 rounded-xl text-black">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-zinc-950">User Account</h3>
              <p className="text-[10px] sm:text-xs text-zinc-500">
                {currentUser
                  ? 'Private cloud account authenticated'
                  : 'Sign in to isolate and secure your personal ledger'}
              </p>
            </div>
          </div>
        </div>

        {currentUser ? (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-zinc-50 rounded-xl border border-zinc-200">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-zinc-950">{currentUser.email}</span>
                <span className="text-[9px] font-mono px-1.5 py-0.5 bg-black text-white rounded font-medium">
                  Active
                </span>
              </div>
              <p className="text-[10px] font-mono text-zinc-500 truncate max-w-xs">
                UID: {currentUser.id}
              </p>
            </div>

            <button
              onClick={handleSignOut}
              disabled={loading}
              className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-zinc-200 hover:bg-zinc-300 text-zinc-800 text-xs font-semibold rounded-lg transition-colors active:scale-95"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Tab switch */}
            <div className="grid grid-cols-2 p-1 bg-zinc-100 rounded-xl text-xs font-semibold gap-1">
              <button
                type="button"
                onClick={() => setAuthMode('signin')}
                className={`py-1.5 rounded-lg transition-all ${
                  authMode === 'signin'
                    ? 'bg-black text-white shadow-xs'
                    : 'text-zinc-600 hover:text-black'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => setAuthMode('signup')}
                className={`py-1.5 rounded-lg transition-all ${
                  authMode === 'signup'
                    ? 'bg-black text-white shadow-xs'
                    : 'text-zinc-600 hover:text-black'
                }`}
              >
                Create Account
              </button>
            </div>

            <form onSubmit={handleAuthSubmit} className="space-y-2.5">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-zinc-700">Email Address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full px-3 py-1.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-black focus:bg-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-zinc-700">Password</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full px-3 py-1.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-black focus:bg-white"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2 bg-black text-white text-xs font-semibold rounded-xl hover:bg-zinc-800 transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-95 disabled:opacity-50"
              >
                {authMode === 'signin' ? (
                  <>
                    <LogIn className="w-3.5 h-3.5" />
                    <span>Sign In</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Create Free Account</span>
                  </>
                )}
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Phone Notifications & Alerts Card */}
      <div className="p-4 sm:p-5 bg-white rounded-2xl border border-zinc-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-zinc-100 rounded-xl text-black">
              <BellRing className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-zinc-950">Phone Notifications &amp; Alerts</h3>
              <p className="text-[10px] sm:text-xs text-zinc-500">
                Native device alerts for upcoming dues &amp; unsettled tabs (2–3 / day)
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

        {/* Preferences & Test Controls (when supported and permitted) */}
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

      {/* Cloud Two-Way Sync Actions */}
      <div className="p-4 sm:p-5 bg-white rounded-2xl border border-zinc-200 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-zinc-100 rounded-xl text-black">
              <Cloud className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-zinc-950">
                Two-Way Cloud Synchronization
              </h3>
              <p className="text-[10px] sm:text-xs text-zinc-500">
                {lastSyncedTime ? `Last synced at ${lastSyncedTime}` : 'Sync local device with PostgreSQL'}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
          {/* Push Local Data to Cloud */}
          <button
            onClick={handleUploadToCloud}
            disabled={syncing || !isSupabaseConfigured}
            className="flex items-center justify-center gap-2 p-3 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 rounded-xl text-xs font-semibold text-zinc-900 transition-all active:scale-98 disabled:opacity-50"
          >
            <UploadCloud className="w-4 h-4 text-black" />
            <span>Upload Local Ledger to Cloud</span>
          </button>

          {/* Pull Cloud Data to Device */}
          <button
            onClick={handleDownloadFromCloud}
            disabled={syncing || !isSupabaseConfigured}
            className="flex items-center justify-center gap-2 p-3 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 rounded-xl text-xs font-semibold text-zinc-900 transition-all active:scale-98 disabled:opacity-50"
          >
            <DownloadCloud className="w-4 h-4 text-black" />
            <span>Download Cloud Data to Device</span>
          </button>
        </div>
      </div>

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
