import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.namianime.app',
  appName: 'NAMI ANIME',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    cleartext: true,
    allowNavigation: [
      'immortal-s7ui.onrender.com',
      'animekh.duckdns.org',
      'namianime.vercel.app',
      '*.vercel.app',
      '*.netlify.app',
      '*.onrender.com',
      '*.vercel.app',
      '*.googleapis.com',
      '*.googleusercontent.com',
      '*.cloudfront.net',
      '*.m3u8',
    ],
  },
  plugins: {
    FirebaseAuthentication: {
      skipNativeAuth: false,
      providers: ['google.com'],
    },
  },
};

export default config;
