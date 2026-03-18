import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.tchostel.connect',
  appName: 'TC Hostel Connect',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    cleartext: ['localhost', '127.0.0.1'],
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
      autoHide: true,
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
    },
  },
};

export default config;
