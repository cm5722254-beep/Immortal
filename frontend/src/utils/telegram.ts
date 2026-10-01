declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initData: string;
        initDataUnsafe?: {
          query_id?: string;
          user?: {
            id: number;
            first_name: string;
            last_name?: string;
            username?: string;
            language_code?: string;
            photo_url?: string;
          };
          auth_date?: string;
          hash?: string;
        };
        version: string;
        platform: string;
        colorScheme: 'light' | 'dark';
        themeParams: Record<string, string>;
        isExpanded: boolean;
        viewportHeight: number;
        viewportStableHeight: number;
        headerColor: string;
        backgroundColor: string;
        isClosingConfirmationEnabled: boolean;
        BackButton: {
          isVisible: boolean;
          show: () => void;
          hide: () => void;
          onClick: (callback: () => void) => void;
          offClick: (callback: () => void) => void;
        };
        MainButton: {
          text: string;
          color: string;
          textColor: string;
          isVisible: boolean;
          isActive: boolean;
          isProgressVisible: boolean;
          setText: (text: string) => void;
          onClick: (callback: () => void) => void;
          offClick: (callback: () => void) => void;
          show: () => void;
          hide: () => void;
          enable: () => void;
          disable: () => void;
          showProgress: (leaveActive?: boolean) => void;
          hideProgress: () => void;
        };
        HapticFeedback: {
          impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
          notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
          selectionChanged: () => void;
        };
        ready: () => void;
        expand: () => void;
        close: () => void;
        requestFullscreen?: () => void;
        exitFullscreen?: () => void;
        isFullscreen?: boolean;
        disableVerticalSwipes?: () => void;
        enableVerticalSwipes?: () => void;
        isVerticalSwipesEnabled?: boolean;
        lockOrientation?: () => void;
        unlockOrientation?: () => void;
        enableClosingConfirmation: () => void;
        setHeaderColor: (color: string) => void;
        setBackgroundColor: (color: string) => void;
        openLink: (url: string, options?: { try_instant_view?: boolean }) => void;
        openTelegramLink: (url: string) => void;
        safeAreaInset?: {
          top: number;
          bottom: number;
          left: number;
          right: number;
        };
        contentSafeAreaInset?: {
          top: number;
          bottom: number;
          left: number;
          right: number;
        };
      };
    };
  }
}

export function isTelegramWebApp(): boolean {
  return (
    typeof window !== 'undefined' &&
    Boolean(window.Telegram?.WebApp?.initData || window.Telegram?.WebApp?.initDataUnsafe?.user)
  );
}

export function getTelegramUser() {
  return window.Telegram?.WebApp?.initDataUnsafe?.user;
}

export function getTelegramInitData() {
  return window.Telegram?.WebApp?.initData;
}

export function triggerHaptic(style: 'light' | 'medium' | 'heavy' = 'light') {
  try {
    window.Telegram?.WebApp?.HapticFeedback?.impactOccurred(style);
  } catch {}
}

export function requestTelegramFullscreen() {
  try {
    if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
      window.Telegram.WebApp.expand?.();
      window.Telegram.WebApp.disableVerticalSwipes?.();
      window.Telegram.WebApp.requestFullscreen?.();
    }
  } catch {}
}

export function setTelegramBackButton(visible: boolean, onClick?: () => void) {
  try {
    if (typeof window === 'undefined' || !window.Telegram?.WebApp?.BackButton) return;
    const bb = window.Telegram.WebApp.BackButton;
    if (visible && onClick) {
      bb.show();
      bb.onClick(onClick);
    } else {
      bb.hide();
    }
  } catch {}
}

export function initTelegramWebApp() {
  if (typeof window === 'undefined' || !window.Telegram?.WebApp) {
    return;
  }

  const tg = window.Telegram.WebApp;

  try {
    // Notify Telegram that WebApp is ready
    tg.ready();

    // Expand to maximum viewport height for mobile full immersion
    tg.expand();

    // Disable vertical pull-to-close gestures so users can freely scroll and rotate without closing
    tg.disableVerticalSwipes?.();

    // Configure Anime App Obsidian cinema dark theme colors
    tg.setHeaderColor('#0A0E17');
    tg.setBackgroundColor('#0A0E17');

    // Prevent accidental swipe down closure
    tg.enableClosingConfirmation();
  } catch (e) {
    console.warn('Telegram WebApp initialization error:', e);
  }
}
