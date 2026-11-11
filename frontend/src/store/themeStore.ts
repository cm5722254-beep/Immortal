import { create } from 'zustand';
import { SITE_THEMES, type SiteTheme } from '../types/theme';
import api from '../services/api';

interface ThemeState {
  activeThemeId: string;
  activeTheme: SiteTheme;
  availableThemes: SiteTheme[];
  isLoading: boolean;
  isSaving: boolean;
  setTheme: (themeId: string, isUserChoice?: boolean) => void;
  toggleWhiteGrey: () => void;
  saveAdminTheme: (themeId: string) => Promise<void>;
  fetchSiteTheme: () => Promise<void>;
}

const STORAGE_KEY = 'mer_donghua_theme_id';
const USER_OVERRIDE_KEY = 'mer_donghua_theme_user_override';

function isLightHex(hex: string): boolean {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return false;
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) > 155;
}

function applyThemeToDOM(theme: SiteTheme) {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  const isLight = isLightHex(theme.bg_base);
  const isGrey = theme.id === 'cosmic-grey';
  const textPrimary = theme.text_primary || (isLight ? '#0F172A' : '#F8FAFC');
  const textSecondary = theme.text_secondary || (isLight ? '#475569' : '#CBD5E1');

  root.style.setProperty('--bg-base', theme.bg_base);
  root.style.setProperty('--bg-card', theme.bg_card);
  root.style.setProperty('--bg-card-subtle', theme.bg_card_subtle);
  root.style.setProperty('--border-subtle', theme.border);
  root.style.setProperty('--accent-primary', theme.accent);
  root.style.setProperty('--text-primary', textPrimary);
  root.style.setProperty('--text-secondary', textSecondary);

  // ANIMEKH variables
  root.style.setProperty('--animekh-bg-base', theme.bg_base);
  root.style.setProperty('--animekh-bg-card', theme.bg_card);
  root.style.setProperty('--animekh-bg-card-subtle', theme.bg_card_subtle);
  root.style.setProperty('--animekh-accent-primary', theme.accent);
  root.style.setProperty('--animekh-border-subtle', theme.border);
  root.style.setProperty('--animekh-text-primary', textPrimary);
  root.style.setProperty('--animekh-text-secondary', textSecondary);

  // MD variables
  root.style.setProperty('--md-bg', theme.bg_base);
  root.style.setProperty('--md-bg-raised', theme.bg_card);
  root.style.setProperty('--md-surface', theme.bg_card_subtle);
  root.style.setProperty('--md-border', theme.border);
  root.style.setProperty('--md-text', textPrimary);
  root.style.setProperty('--md-text-secondary', textSecondary);

  root.setAttribute('data-theme', theme.id);
  root.setAttribute('data-theme-mode', isLight ? 'light' : isGrey ? 'grey' : 'dark');
  root.style.colorScheme = isLight ? 'light' : 'dark';

  if (document.body) {
    document.body.style.backgroundColor = theme.bg_base;
    document.body.style.color = textPrimary;
  }
}

// Default to 'pure-white', but respect saved user choice ('pure-white' <-> 'cosmic-grey' or admin theme)
const initialSavedId = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
const initialTheme = (initialSavedId ? SITE_THEMES.find((t) => t.id === initialSavedId) : null) || SITE_THEMES[0];

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

  setTheme: (themeId: string, isUserChoice = true) => {
    const matched = SITE_THEMES.find((t) => t.id === themeId) || SITE_THEMES[0];
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, matched.id);
      if (isUserChoice) {
        localStorage.setItem(USER_OVERRIDE_KEY, 'true');
      }
    }
    applyThemeToDOM(matched);
    set({
      activeThemeId: matched.id,
      activeTheme: matched,
    });
  },

  toggleWhiteGrey: () => {
    const currentId = get().activeThemeId;
    const nextId = currentId === 'cosmic-grey' ? 'pure-white' : 'cosmic-grey';
    get().setTheme(nextId, true);
  },

  saveAdminTheme: async (themeId: string) => {
    set({ isSaving: true });
    try {
      await api.put('/admin/theme', { theme_id: themeId });
      get().setTheme(themeId, true);
    } finally {
      set({ isSaving: false });
    }
  },

  fetchSiteTheme: async () => {
    set({ isLoading: true });
    try {
      const hasUserOverride =
        typeof window !== 'undefined' &&
        localStorage.getItem(USER_OVERRIDE_KEY) === 'true' &&
        Boolean(localStorage.getItem(STORAGE_KEY));
      if (hasUserOverride) {
        const savedId = localStorage.getItem(STORAGE_KEY)!;
        get().setTheme(savedId, false);
        return;
      }
      const res = await api.get('/site-settings/theme');
      const backendThemeId = res.data?.active_theme_id || 'pure-white';
      get().setTheme(backendThemeId, false);
    } catch {
      const savedId = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
      get().setTheme(savedId || 'pure-white', false);
    } finally {
      set({ isLoading: false });
    }
  },
}));
