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
  if (Capacitor.isNativePlatform() || Capacitor.getPlatform() === 'android' || Capacitor.getPlatform() === 'ios') {
    return 'mobile';
  }
  if (isTelegramWebApp()) {
    return 'telegram';
  }
  return 'web';
}

export const usePlatformStore = create<PlatformState>((set) => {
  const initialPlatform = detectPlatform();

  return {
    currentPlatform: initialPlatform,
    overrideMode: 'auto',
    isNativeApp: initialPlatform === 'mobile',
    isTelegram: initialPlatform === 'telegram',
    isWeb: initialPlatform === 'web',

    setOverrideMode: (mode: PlatformMode) => {
      const activePlatform = mode === 'auto' ? detectPlatform() : mode;
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
