import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';

export const isNativePlatform = (): boolean => {
  return Capacitor.isNativePlatform();
};

export const initNativeApp = async (options?: {
  onHardwareBack?: () => boolean; // return true if handled (e.g. closed a modal)
}) => {
  if (!isNativePlatform()) return;

  try {
    // 1. Hide splash screen smoothly after app initialization
    await SplashScreen.hide();

    // 2. Configure light-mode status bar
    await StatusBar.setStyle({ style: Style.Light });
    await StatusBar.setBackgroundColor({ color: '#FFFFFF' });

    // 3. Hardware Back Button Listener
    App.addListener('backButton', ({ canGoBack }) => {
      if (options?.onHardwareBack && options.onHardwareBack()) {
        // Handled by active modal / sheet dismissal
        return;
      }
      if (canGoBack) {
        window.history.back();
      } else {
        App.exitApp();
      }
    });
  } catch (err) {
    console.warn('Native Capacitor initialization error:', err);
  }
};

export const triggerHaptic = async (style: 'light' | 'medium' | 'heavy' = 'light') => {
  if (!isNativePlatform()) return;
  try {
    const impact =
      style === 'heavy'
        ? ImpactStyle.Heavy
        : style === 'medium'
        ? ImpactStyle.Medium
        : ImpactStyle.Light;
    await Haptics.impact({ style: impact });
  } catch {
    // Haptics unavailable
  }
};
