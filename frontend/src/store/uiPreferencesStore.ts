import { create } from 'zustand';

interface UiPreferencesState {
  cleanMode: boolean; // របៀបទស្សនាសាមញ្ញ (Clean & Minimalist Mode)
  reduceMotion: boolean; // កាត់បន្ថយចលនា & ពន្លឺ (Reduce Animations & Glow)
  hidePromos: boolean; // លាក់ផ្ទាំងផ្សាយពាណិជ្ជកម្ម និងកង់បង្វិល
  toggleCleanMode: () => void;
  toggleReduceMotion: () => void;
  toggleHidePromos: () => void;
  setCleanMode: (value: boolean) => void;
  setReduceMotion: (value: boolean) => void;
  setHidePromos: (value: boolean) => void;
}

const STORAGE_KEY = 'watchflix_ui_preferences';

function getInitialState() {
  if (typeof window === 'undefined') {
    return { cleanMode: true, reduceMotion: false, hidePromos: false };
  }
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        cleanMode: parsed.cleanMode ?? true,
        reduceMotion: parsed.reduceMotion ?? false,
        hidePromos: parsed.hidePromos ?? false,
      };
    }
  } catch {}
  return { cleanMode: true, reduceMotion: false, hidePromos: false };
}

function applyDomClasses(cleanMode: boolean, reduceMotion: boolean) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (cleanMode) {
    root.classList.add('clean-ui-mode');
  } else {
    root.classList.remove('clean-ui-mode');
  }

  if (reduceMotion) {
    root.classList.add('reduce-motion-mode');
  } else {
    root.classList.remove('reduce-motion-mode');
  }
}

const initial = getInitialState();
if (typeof window !== 'undefined') {
  applyDomClasses(initial.cleanMode, initial.reduceMotion);
}

export const useUiPreferencesStore = create<UiPreferencesState>((set, get) => ({
  cleanMode: initial.cleanMode,
  reduceMotion: initial.reduceMotion,
  hidePromos: initial.hidePromos,

  toggleCleanMode: () => {
    const next = !get().cleanMode;
    get().setCleanMode(next);
  },

  toggleReduceMotion: () => {
    const next = !get().reduceMotion;
    get().setReduceMotion(next);
  },

  toggleHidePromos: () => {
    const next = !get().hidePromos;
    get().setHidePromos(next);
  },

  setCleanMode: (value: boolean) => {
    set({ cleanMode: value });
    applyDomClasses(value, get().reduceMotion);
    saveState({ ...get(), cleanMode: value });
  },

  setReduceMotion: (value: boolean) => {
    set({ reduceMotion: value });
    applyDomClasses(get().cleanMode, value);
    saveState({ ...get(), reduceMotion: value });
  },

  setHidePromos: (value: boolean) => {
    set({ hidePromos: value });
    saveState({ ...get(), hidePromos: value });
  },
}));

function saveState(state: { cleanMode: boolean; reduceMotion: boolean; hidePromos: boolean }) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      cleanMode: state.cleanMode,
      reduceMotion: state.reduceMotion,
      hidePromos: state.hidePromos,
    }));
  } catch {}
}
