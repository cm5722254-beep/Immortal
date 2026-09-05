import { create } from 'zustand';
import api from '../services/api';

export interface SystemUpdateConfig {
  enabled: boolean;
  title: string;
  message: string;
  version: string;
  eta: string;
  allow_dismiss: boolean;
  telegram_link: string;
  updated_at?: string;
}

interface SystemUpdateState {
  config: SystemUpdateConfig;
  isLoading: boolean;
  isDismissed: boolean;
  fetchStatus: () => Promise<void>;
  updateStatus: (data: Partial<SystemUpdateConfig>) => Promise<boolean>;
  dismissModal: () => void;
  previewModal: () => void;
  isPreviewing: boolean;
  closePreview: () => void;
}

const DEFAULT_CONFIG: SystemUpdateConfig = {
  enabled: false,
  title: '🚀 Website កំពុង Update ជំនាន់ថ្មី',
  message: 'យើងខ្ញុំកំពុងធ្វើការអាប់ដេតប្រព័ន្ធ និងបន្ថែមមុខងារថ្មីៗ ដើម្បីផ្ដល់នូវបទពិសោធន៍ទស្សនាកាន់តែរលូន និងល្អបំផុតជូនប្រិយមិត្តទាំងអស់គ្នា! សូមអភ័យទោសចំពោះការរំខាន។',
  version: 'v2.5.0 Update',
  eta: 'នឹងរួចរាល់ក្នុងពេលឆាប់ៗនេះ',
  allow_dismiss: true,
  telegram_link: 'https://t.me/namianime_channel',
};

const STORAGE_KEY = 'nint_system_update_config';
const DISMISSED_SESSION_KEY = 'nint_system_update_dismissed';

export const useSystemUpdateStore = create<SystemUpdateState>((set, get) => ({
  config: (() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return { ...DEFAULT_CONFIG, ...JSON.parse(saved) };
    } catch {
      // fallback
    }
    return DEFAULT_CONFIG;
  })(),
  isLoading: false,
  isDismissed: sessionStorage.getItem(DISMISSED_SESSION_KEY) === 'true',
  isPreviewing: false,

  fetchStatus: async () => {
    try {
      set({ isLoading: true });
      const res = await api.get('/site-settings/system-update');
      if (res.data && typeof res.data.enabled === 'boolean') {
        const newConfig: SystemUpdateConfig = {
          enabled: res.data.enabled,
          title: res.data.title || DEFAULT_CONFIG.title,
          message: res.data.message || DEFAULT_CONFIG.message,
          version: res.data.version || DEFAULT_CONFIG.version,
          eta: res.data.eta || DEFAULT_CONFIG.eta,
          allow_dismiss: res.data.allow_dismiss ?? DEFAULT_CONFIG.allow_dismiss,
          telegram_link: res.data.telegram_link || DEFAULT_CONFIG.telegram_link,
          updated_at: res.data.updated_at,
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newConfig));
        set({ config: newConfig, isLoading: false });
        return;
      }
    } catch {
      // Offline / network fallback to localStorage
    } finally {
      set({ isLoading: false });
    }
  },

  updateStatus: async (data: Partial<SystemUpdateConfig>) => {
    try {
      set({ isLoading: true });
      const updatedConfig = { ...get().config, ...data };

      // Save locally immediately for fast feedback
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedConfig));
      set({ config: updatedConfig });

      // Save to backend server
      const res = await api.put('/admin/site-settings/system-update', data);
      if (res.data?.system_update) {
        set({ config: { ...updatedConfig, ...res.data.system_update }, isLoading: false });
      } else {
        set({ isLoading: false });
      }
      return true;
    } catch (err) {
      console.warn('Backend system update config save notice (saved locally):', err);
      set({ isLoading: false });
      return true;
    }
  },

  dismissModal: () => {
    sessionStorage.setItem(DISMISSED_SESSION_KEY, 'true');
    set({ isDismissed: true });
  },

  previewModal: () => {
    set({ isPreviewing: true });
  },

  closePreview: () => {
    set({ isPreviewing: false });
  },
}));
