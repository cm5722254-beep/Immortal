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
  const textPrimary = theme.text_primary || (theme.id === 'pure-white' ? '#0F172A' : '#F8FAFC');
  const textSecondary = theme.text_secondary || (theme.id === 'pure-white' ? '#475569' : '#9CA3AF');

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

  if (document.body) {
    document.body.style.backgroundColor = theme.bg_base;
    document.body.style.color = textPrimary;
  }
}

// Default to 'pure-white'
const initialSavedId = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
const initialTheme = (initialSavedId && initialSavedId === 'pure-white' ? SITE_THEMES.find((t) => t.id === initialSavedId) : null) || SITE_THEMES[0];

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
      const backendThemeId = res.data?.active_theme_id || 'pure-white';
      get().setTheme(backendThemeId);
    } catch {
      get().setTheme('pure-white');
    } finally {
      set({ isLoading: false });
    }
  },
}));
