export type ThemeMode = 'light' | 'amoled' | 'system';

const THEME_KEY = 'fintrack_theme_mode';

export function getStoredTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'light';
  try {
    const stored = localStorage.getItem(THEME_KEY) as ThemeMode;
    if (stored && ['light', 'amoled', 'system'].includes(stored)) {
      return stored;
    }
  } catch {
    // ignore
  }
  return 'light';
}

export function applyTheme(mode: ThemeMode): void {
  if (typeof window === 'undefined') return;

  const isAmoled =
    mode === 'amoled' ||
    (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  if (isAmoled) {
    document.documentElement.classList.add('amoled');
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('amoled');
    document.documentElement.classList.remove('dark');
  }

  try {
    localStorage.setItem(THEME_KEY, mode);
  } catch {
    // ignore
  }
}

export function cycleTheme(current: ThemeMode): ThemeMode {
  const next: ThemeMode = current === 'light' ? 'amoled' : current === 'amoled' ? 'system' : 'light';
  applyTheme(next);
  return next;
}
