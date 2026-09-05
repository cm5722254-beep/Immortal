import { create } from 'zustand';
import api from '../services/api';

export interface PromoCountdownData {
  promo_enabled: boolean;
  start_time: string;
  end_time: string;
  now: string;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  total_seconds_left: number;
  is_expired: boolean;
  force_vip_lock: boolean;
  is_vip_locked: boolean;
}

interface PromoStore {
  promoData: PromoCountdownData | null;
  isLoading: boolean;
  fetchPromoCountdown: () => Promise<void>;
  updatePromoCountdown: (data: {
    reset_15_days?: boolean;
    custom_days?: number;
    force_vip_lock?: boolean;
    promo_enabled?: boolean;
  }) => Promise<void>;
  tickCountdown: () => void;
}

export const usePromoStore = create<PromoStore>((set, get) => ({
  promoData: null,
  isLoading: false,

  fetchPromoCountdown: async () => {
    try {
      set({ isLoading: true });
      let localEnd = localStorage.getItem('nint_promo_7d_end');
      const now = Date.now();
      
      // If no local 7-day end time or invalid/past, set 7 days from now
      if (!localEnd || isNaN(new Date(localEnd).getTime())) {
        localEnd = new Date(now + 7 * 86400000).toISOString();
        localStorage.setItem('nint_promo_7d_end', localEnd);
      }
      
      let endMs = new Date(localEnd).getTime();
      let total_seconds = Math.max(0, Math.floor((endMs - now) / 1000));
      
      // If expired, reset or handle expiry
      if (total_seconds <= 0) {
        total_seconds = 0;
      }

      // Check API for admin overrides (force_vip_lock)
      let isForceLock = false;
      let isPromoEnabled = true;
      try {
        const res = await api.get('/site-settings/promo-countdown');
        if (res.data) {
          isForceLock = !!res.data.force_vip_lock;
          if (typeof res.data.promo_enabled === 'boolean') {
            isPromoEnabled = res.data.promo_enabled;
          }
        }
      } catch {
        // use local
      }

      const is_expired = total_seconds <= 0;
      const is_vip_locked = is_expired || isForceLock || !isPromoEnabled;
      const days = Math.floor(total_seconds / 86400);
      const hours = Math.floor((total_seconds % 86400) / 3600);
      const minutes = Math.floor((total_seconds % 3600) / 60);
      const seconds = total_seconds % 60;

      set({
        promoData: {
          promo_enabled: isPromoEnabled,
          start_time: new Date(now).toISOString(),
          end_time: new Date(endMs).toISOString(),
          now: new Date(now).toISOString(),
          days,
          hours,
          minutes,
          seconds,
          total_seconds_left: total_seconds,
          is_expired,
          force_vip_lock: isForceLock,
          is_vip_locked,
        },
        isLoading: false,
      });
    } catch (err) {
      console.warn('Failed to fetch promo countdown:', err);
      set({ isLoading: false });
    }
  },

  updatePromoCountdown: async (payload) => {
    try {
      const res = await api.put('/admin/site-settings/promo-countdown', payload);
      set({ promoData: res.data });
    } catch (err) {
      console.error('Failed to update promo settings:', err);
      throw err;
    }
  },

  tickCountdown: () => {
    const current = get().promoData;
    if (!current || current.is_vip_locked || current.is_expired) return;

    const newTotalSeconds = Math.max(0, current.total_seconds_left - 1);
    const is_expired = newTotalSeconds <= 0;
    const is_vip_locked = is_expired || current.force_vip_lock || !current.promo_enabled;

    const days = Math.floor(newTotalSeconds / 86400);
    const hours = Math.floor((newTotalSeconds % 86400) / 3600);
    const minutes = Math.floor((newTotalSeconds % 3600) / 60);
    const seconds = newTotalSeconds % 60;

    set({
      promoData: {
        ...current,
        days,
        hours,
        minutes,
        seconds,
        total_seconds_left: newTotalSeconds,
        is_expired,
        is_vip_locked,
      },
    });
  },
}));
