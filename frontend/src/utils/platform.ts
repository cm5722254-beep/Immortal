import { create } from 'zustand';
import { Capacitor } from '@capacitor/core';
import { isTelegramWebApp } from './telegram';

export type PlatformMode = 'auto' | 'web' | 'telegram' | 'mobile';

interface PlatformState {
  currentPlatform: 'web' | 'telegram' | 'mobile';
  overrideMode: PlatformMode;
  isNativeApp: boolean;
  isTelegram: boolean;
  isWeb: boolean;
  setOverrideMode: (mode: PlatformMode) => void;
}

function detectPlatform(): 'web' | 'telegram' | 'mobile' {
  if (typeof window !== 'undefined') {
    // Telegram Mini Apps always keep their native compact UI. Ignore preview
    // query parameters and saved platform overrides inside the Telegram shell.
    if (isTelegramWebApp()) return 'telegram';

    // 1. URL Query Parameter Override (?platform=web | ?platform=telegram | ?platform=mobile | ?mode=...)
    try {
      const params = new URLSearchParams(window.location.search);
      const paramMode = params.get('platform') || params.get('mode');
      if (paramMode === 'telegram' || paramMode === 'tg') return 'telegram';
      if (paramMode === 'mobile' || paramMode === 'apk' || paramMode === 'android') return 'mobile';
      if (paramMode === 'web' || paramMode === 'desktop') return 'web';
    } catch {}

    // 2. Saved user preference from Platform Switcher
    try {
      const saved = localStorage.getItem('nami_platform_override');
      if (saved === 'telegram' || saved === 'mobile' || saved === 'web') {
        return saved;
      }
    } catch {}

    // 3. User Agent check for Android WebView / APK wrapper
    const ua = navigator.userAgent || '';
    if (ua.includes('NamiAnimeAPK') || ua.includes('HuangAnime') || ua.includes('CapacitorAndroid')) {
      return 'mobile';
    }
  }

  // 4. Capacitor native platform
  if (Capacitor.isNativePlatform() || Capacitor.getPlatform() === 'android' || Capacitor.getPlatform() === 'ios') {
    return 'mobile';
  }

  // 6. Default to Web
  return 'web';
}

export const usePlatformStore = create<PlatformState>((set) => {
  const initialPlatform = detectPlatform();
  const initialOverride = (typeof window !== 'undefined' && localStorage.getItem('nami_platform_override') as PlatformMode) || 'auto';

  return {
    currentPlatform: initialPlatform,
    overrideMode: initialOverride,
    isNativeApp: initialPlatform === 'mobile',
    isTelegram: initialPlatform === 'telegram',
    isWeb: initialPlatform === 'web',

    setOverrideMode: (mode: PlatformMode) => {
      let activePlatform: 'web' | 'telegram' | 'mobile';
      if (mode === 'auto') {
        localStorage.removeItem('nami_platform_override');
        activePlatform = detectPlatform();
      } else {
        localStorage.setItem('nami_platform_override', mode);
        activePlatform = mode;
      }

      set({
        overrideMode: mode,
        currentPlatform: activePlatform,
        isNativeApp: activePlatform === 'mobile',
        isTelegram: activePlatform === 'telegram',
        isWeb: activePlatform === 'web',
      });
    },
  };
});

/**
 * Universal platform hook for conditional rendering
 */
export function usePlatform() {
  const { currentPlatform, isNativeApp, isTelegram, isWeb, overrideMode, setOverrideMode } = usePlatformStore();
  return {
    platform: currentPlatform,
    isMobileApp: isNativeApp,
    isTelegram,
    isWeb,
    overrideMode,
    setOverrideMode,
  };
}
