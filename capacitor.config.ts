import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.fintrack.app',
  appName: 'FinTrack',
  webDir: 'out',
  backgroundColor: '#f4f4f5',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      launchAutoHide: true,
      backgroundColor: '#ffffff',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#ffffff',
    },
    LocalNotifications: {
      smallIcon: 'ic_launcher_foreground',
      iconColor: '#000000',
    },
  },
};

export default config;
