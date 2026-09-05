import { create } from 'zustand';
import { SITE_THEMES, type SiteTheme } from '../types/theme';
import api from '../services/api';

interface ThemeState {
  activeThemeId: string;
  activeTheme: SiteTheme;
  availableThemes: SiteTheme[];
  isLoading: boolean;
  isSaving: boolean;
  setTheme: (themeId: string) => void;
  saveAdminTheme: (themeId: string) => Promise<void>;
  fetchSiteTheme: () => Promise<void>;
}

const STORAGE_KEY = 'mer_donghua_theme_id';

function applyThemeToDOM(theme: SiteTheme) {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  root.style.setProperty('--bg-base', theme.bg_base);
  root.style.setProperty('--bg-card', theme.bg_card);
  root.style.setProperty('--bg-card-subtle', theme.bg_card_subtle);
  root.style.setProperty('--border-subtle', theme.border);
  root.style.setProperty('--accent-primary', theme.accent);
  root.setAttribute('data-theme', theme.id);

  if (document.body) {
    document.body.style.backgroundColor = theme.bg_base;
  }
}

const initialSavedId = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
const initialTheme = SITE_THEMES.find((t) => t.id === initialSavedId) || SITE_THEMES[0];

// Apply immediately on script load
if (typeof window !== 'undefined') {
  applyThemeToDOM(initialTheme);
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  activeThemeId: initialTheme.id,
  activeTheme: initialTheme,
  availableThemes: SITE_THEMES,
  isLoading: false,
  isSaving: false,

  setTheme: (themeId: string) => {
    const matched = SITE_THEMES.find((t) => t.id === themeId) || SITE_THEMES[0];
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, matched.id);
    }
    applyThemeToDOM(matched);
    set({
      activeThemeId: matched.id,
      activeTheme: matched,
    });
  },

  saveAdminTheme: async (themeId: string) => {
    set({ isSaving: true });
    try {
      await api.put('/admin/theme', { theme_id: themeId });
      get().setTheme(themeId);
    } finally {
      set({ isSaving: false });
    }
  },

  fetchSiteTheme: async () => {
    set({ isLoading: true });
    try {
      const res = await api.get('/site-settings/theme');
      const backendThemeId = res.data?.active_theme_id;
      if (backendThemeId && (!localStorage.getItem(STORAGE_KEY) || localStorage.getItem(STORAGE_KEY) === 'default')) {
        get().setTheme(backendThemeId);
      } else if (backendThemeId && !SITE_THEMES.some((t) => t.id === localStorage.getItem(STORAGE_KEY))) {
        get().setTheme(backendThemeId);
      }
    } catch {
      // Offline fallback: keep cached local theme
    } finally {
      set({ isLoading: false });
    }
  },
}));
