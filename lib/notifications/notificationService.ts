import { MonthlyDue, TabItem } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';

export interface NotificationPreferences {
  enabled: boolean;
  notifyDues: boolean;
  notifyTabs: boolean;
  frequencyHours: number; // Cooldown between reminders (default 5 hours -> 2 to 3 times/day)
}

const DEFAULT_PREFS: NotificationPreferences = {
  enabled: true,
  notifyDues: true,
  notifyTabs: true,
  frequencyHours: 5, // ~2 to 3 times a day
};

const PREFS_KEY = 'fintrack_notification_prefs';
const HISTORY_KEY = 'fintrack_notification_history';

// ==========================================
// Browser & Permission Utilities
// ==========================================

export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!isNotificationSupported()) return 'unsupported';
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!isNotificationSupported()) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;

  try {
    const result = Notification.requestPermission();
    let perm: NotificationPermission;
    if (result && typeof (result as any).then === 'function') {
      perm = await result;
    } else {
      perm = await new Promise<NotificationPermission>((resolve) => {
        Notification.requestPermission(resolve);
      });
    }
    return perm === 'granted';
  } catch (err) {
    console.error('Error requesting notification permission:', err);
    return false;
  }
}

// ==========================================
// User Preferences Management
// ==========================================

export function getNotificationPreferences(): NotificationPreferences {
  if (typeof window === 'undefined') return DEFAULT_PREFS;
  try {
    const stored = localStorage.getItem(PREFS_KEY);
    if (stored) {
      return { ...DEFAULT_PREFS, ...JSON.parse(stored) };
    }
  } catch (err) {
    console.warn('Error reading notification preferences:', err);
  }
  return DEFAULT_PREFS;
}

export function setNotificationPreferences(prefs: Partial<NotificationPreferences>): NotificationPreferences {
  if (typeof window === 'undefined') return DEFAULT_PREFS;
  const updated = { ...getNotificationPreferences(), ...prefs };
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn('Error saving notification preferences:', err);
  }
  return updated;
}

// ==========================================
// Anti-Spam History Tracking
// Allows reminders up to 2-3 times a day (every ~5 hours)
// ==========================================

function getNotificationHistory(): Record<string, number> {
  if (typeof window === 'undefined') return {};
  try {
    const stored = localStorage.getItem(HISTORY_KEY);
    if (stored) return JSON.parse(stored);
  } catch {
    // fallback
  }
  return {};
}

function recordNotificationSent(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    const history = getNotificationHistory();
    history[key] = Date.now();
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch {
    // fallback
  }
}

function shouldNotify(key: string, cooldownHours: number = 5): boolean {
  const history = getNotificationHistory();
  const lastSent = history[key];
  if (!lastSent) return true;
  const elapsedMs = Date.now() - lastSent;
  const cooldownMs = cooldownHours * 60 * 60 * 1000;
  return elapsedMs >= cooldownMs;
}

// ==========================================
// Safe Service Worker Registration Helper
// ==========================================

async function getSwRegistration(timeoutMs = 1200): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return null;

  try {
    // 1. Check if already active/registered
    const existing = await navigator.serviceWorker.getRegistration();
    if (existing) {
      return existing;
    }
  } catch {}

  try {
    // 2. Proactively trigger registration if missing
    const registered = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    if (registered) {
      return registered;
    }
  } catch {}

  // 3. Race navigator.serviceWorker.ready against a fast timeout
  try {
    const readyPromise = navigator.serviceWorker.ready;
    const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs));
    return await Promise.race([readyPromise, timeoutPromise]);
  } catch {
    return null;
  }
}

// ==========================================
// Native Notification Dispatcher
// ==========================================

export async function sendNativeNotification(
  title: string,
  options?: NotificationOptions & { section?: string }
): Promise<boolean> {
  if (!isNotificationSupported() || Notification.permission !== 'granted') {
    return false;
  }

  const defaultOptions: NotificationOptions = {
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    data: { section: options?.section || 'dues' },
    ...options,
  };

  // 1. Try Service Worker Registration (Required on mobile / Android Chrome)
  try {
    const reg = await getSwRegistration(1200);
    if (reg && typeof reg.showNotification === 'function') {
      await reg.showNotification(title, defaultOptions);
      return true;
    }
  } catch (err) {
    console.warn('ServiceWorker showNotification failed, trying fallback:', err);
  }

  // 2. Direct Window Notification Fallback (Desktop / browsers supporting new Notification)
  try {
    const notif = new Notification(title, defaultOptions);
    notif.onclick = () => {
      window.focus();
      notif.close();
    };
    return true;
  } catch (err) {
    console.warn('Window Notification fallback failed:', err);
    return false;
  }
}

// ==========================================
// Test Notification
// ==========================================

export async function sendTestNotification(): Promise<boolean> {
  if (!isNotificationSupported()) return false;

  const currentPerm = Notification.permission;
  if (currentPerm !== 'granted') {
    const granted = await requestNotificationPermission();
    if (!granted) return false;
  }

  // Enforce a hard timeout so UI never hangs
  try {
    const dispatchPromise = sendNativeNotification('🎉 FinTrack Notifications Active!', {
      body: 'You will receive alerts on this device 2–3 times a day when a monthly due or tab is near.',
      tag: 'test-notification',
      section: 'dues',
    });

    const timeoutPromise = new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 2500));
    return await Promise.race([dispatchPromise, timeoutPromise]);
  } catch (err) {
    console.error('sendTestNotification error:', err);
    return false;
  }
}

// ==========================================
// Automated Dues & Tabs Scanner
// ==========================================

export async function checkAndNotifyUpcomingDuesAndTabs(
  dues: MonthlyDue[],
  tabs: TabItem[]
): Promise<void> {
  if (!isNotificationSupported() || Notification.permission !== 'granted') {
    return;
  }

  const prefs = getNotificationPreferences();
  if (!prefs.enabled) return;

  const now = new Date();
  const currentDay = now.getDate();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  // 1. Check Monthly Dues
  if (prefs.notifyDues && dues.length > 0) {
    for (const due of dues) {
      // Skip if paid this month
      if (due.status === 'paid' && due.lastPaidDate?.startsWith(currentMonthStr)) {
        continue;
      }

      const dueDay = due.dueDayOfMonth;
      const daysUntilDue = dueDay - currentDay;

      // Notify if due today, tomorrow, or in 2 days, or overdue
      let title = '';
      let body = '';
      let notifKey = '';

      if (daysUntilDue === 0) {
        title = `⚠️ Due Today: ${due.title}`;
        body = `${formatCurrency(due.amount)} via ${due.paymentMethod} is due today! Tap to view or mark paid.`;
        notifKey = `due-${due.id}-today-${currentMonthStr}-${currentDay}`;
      } else if (daysUntilDue === 1) {
        title = `🔔 Due Tomorrow: ${due.title}`;
        body = `${formatCurrency(due.amount)} via ${due.paymentMethod} is due tomorrow.`;
        notifKey = `due-${due.id}-tomorrow-${currentMonthStr}-${currentDay}`;
      } else if (daysUntilDue === 2) {
        title = `📅 Due in 2 Days: ${due.title}`;
        body = `${formatCurrency(due.amount)} via ${due.paymentMethod} is approaching.`;
        notifKey = `due-${due.id}-2days-${currentMonthStr}-${currentDay}`;
      } else if (daysUntilDue < 0 && due.status !== 'paid') {
        title = `🚨 Overdue: ${due.title}`;
        body = `${formatCurrency(due.amount)} was due on the ${dueDay}th. Tap to settle.`;
        notifKey = `due-${due.id}-overdue-${currentMonthStr}-${currentDay}`;
      }

      if (title && shouldNotify(notifKey, prefs.frequencyHours)) {
        const sent = await sendNativeNotification(title, {
          body,
          tag: `due-${due.id}`,
          section: 'dues',
        });
        if (sent) {
          recordNotificationSent(notifKey);
        }
      }
    }
  }

  // 2. Check Unsettled Tabs
  if (prefs.notifyTabs && tabs.length > 0) {
    for (const tab of tabs) {
      if (tab.status === 'settled') continue;

      // Check age of tab
      const createdDate = new Date(tab.date + 'T00:00:00').getTime();
      const ageDays = Math.floor((Date.now() - createdDate) / (1000 * 60 * 60 * 24));

      // Remind if pending for 2 or more days
      if (ageDays >= 2) {
        const isOwedToYou = tab.type === 'owed_to_you';
        const title = isOwedToYou
          ? `🤝 Tab Reminder: ${tab.personName}`
          : `🤝 Tab Reminder: Pay back ${tab.personName}`;

        const body = isOwedToYou
          ? `${tab.personName} owes you ${formatCurrency(tab.amount)} (${tab.description || 'Pending tab'}). Tap to settle.`
          : `You owe ${tab.personName} ${formatCurrency(tab.amount)} (${tab.description || 'Pending tab'}). Tap to settle.`;

        const notifKey = `tab-${tab.id}-${currentMonthStr}-${currentDay}`;

        if (shouldNotify(notifKey, prefs.frequencyHours)) {
          const sent = await sendNativeNotification(title, {
            body,
            tag: `tab-${tab.id}`,
            section: 'tabs',
          });
          if (sent) {
            recordNotificationSent(notifKey);
          }
        }
      }
    }
  }
}
