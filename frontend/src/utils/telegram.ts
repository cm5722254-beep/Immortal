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
        onEvent: (eventType: string, eventHandler: () => void) => void;
        offEvent: (eventType: string, eventHandler: () => void) => void;
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

export function setTelegramMainButton(text: string, onClick: () => void): () => void {
  const button = typeof window !== 'undefined' ? window.Telegram?.WebApp?.MainButton : undefined;
  if (!button) return () => {};

  const handleClick = () => onClick();
  button.setText(text);
  button.enable();
  button.onClick(handleClick);
  button.show();

  return () => {
    try {
      button.offClick(handleClick);
      button.hide();
    } catch {}
  };
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

let activeTelegramBackHandler: (() => void) | null = null;

export function setTelegramBackButton(visible: boolean, onClick?: () => void) {
  try {
    if (typeof window === 'undefined' || !window.Telegram?.WebApp?.BackButton) return;
    const bb = window.Telegram.WebApp.BackButton;
    if (activeTelegramBackHandler) bb.offClick(activeTelegramBackHandler);
    activeTelegramBackHandler = null;
    if (visible && onClick) {
      activeTelegramBackHandler = onClick;
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

  const syncTheme = () => {
    const root = document.documentElement;
    const params = tg.themeParams || {};
    root.dataset.telegramColorScheme = tg.colorScheme || 'dark';
    const mappings: Record<string, string | undefined> = {
      '--tg-theme-bg-color': params.bg_color,
      '--tg-theme-text-color': params.text_color,
      '--tg-theme-hint-color': params.hint_color,
      '--tg-theme-link-color': params.link_color,
      '--tg-theme-button-color': params.button_color,
      '--tg-theme-button-text-color': params.button_text_color,
      '--tg-theme-secondary-bg-color': params.secondary_bg_color,
      '--tg-theme-header-bg-color': params.header_bg_color,
    };
    for (const [property, value] of Object.entries(mappings)) {
      if (value) root.style.setProperty(property, value);
      else root.style.removeProperty(property);
    }

    const insets = tg.safeAreaInset;
    if (insets) {
      root.style.setProperty('--tg-safe-area-top', `${insets.top}px`);
      root.style.setProperty('--tg-safe-area-bottom', `${insets.bottom}px`);
      root.style.setProperty('--tg-safe-area-left', `${insets.left}px`);
      root.style.setProperty('--tg-safe-area-right', `${insets.right}px`);
    }
    tg.setHeaderColor(params.header_bg_color || params.bg_color || '#0b0d10');
    tg.setBackgroundColor(params.bg_color || '#0b0d10');
  };

  try {
    // Notify Telegram that WebApp is ready
    tg.ready();

    // Expand to maximum viewport height for mobile full immersion
    tg.expand();

    // Disable vertical pull-to-close gestures so users can freely scroll and rotate without closing
    tg.disableVerticalSwipes?.();

    syncTheme();
    tg.onEvent('themeChanged', syncTheme);
    tg.onEvent('safeAreaChanged', syncTheme);

    // Prevent accidental swipe down closure
    tg.enableClosingConfirmation();
  } catch (e) {
    console.warn('Telegram WebApp initialization error:', e);
  }

  return () => {
    try {
      tg.offEvent('themeChanged', syncTheme);
      tg.offEvent('safeAreaChanged', syncTheme);
      delete document.documentElement.dataset.telegramColorScheme;
    } catch {}
  };
}
