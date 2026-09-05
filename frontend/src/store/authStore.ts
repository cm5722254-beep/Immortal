import { create } from 'zustand';
import type { User } from '../types';
import api from '../services/api';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isOwner: boolean;
  isAdmin: boolean;
  isStaff: boolean;
  canManageContent: boolean;
  isVip: boolean;
  setUser: (user: User | null) => void;
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  loginWithGoogle: (credential: string) => Promise<void>;
  loginWithTelegram: (tgUser: {
    id: number;
    first_name?: string;
    last_name?: string;
    username?: string;
    photo_url?: string;
    auth_date?: string;
    hash?: string;
    init_data?: string;
  }) => Promise<void>;
  loginWithPhone: (phoneNumber: string, firebaseIdToken?: string, displayName?: string) => Promise<void>;
  loginAsGuest: () => void;
  logout: () => void;
  fetchMe: () => Promise<void>;
}

function parseJwt(token: string) {
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

const hasInitialToken = typeof window !== 'undefined' && !!localStorage.getItem('access_token');

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: hasInitialToken,
  isAuthenticated: false,
  isOwner: false,
  isAdmin: false,
  isStaff: false,
  canManageContent: false,
  isVip: false,

  setUser: (user) => {
    const isOwnerUser = user?.role === 'OWNER' || user?.email === 'cm5722254@gmail.com';
    const isAdminUser = isOwnerUser || user?.role === 'ADMIN';
    const isStaffUser = user?.role === 'STAFF';
    set({
      user,
      isAuthenticated: !!user,
      isOwner: isOwnerUser,
      isAdmin: isAdminUser,
      isStaff: isStaffUser,
      canManageContent: isAdminUser || isStaffUser,
      isVip: !!user && (isAdminUser || isStaffUser || user.is_vip_active || user.is_vip),
    });
  },

  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const res = await api.post('/auth/login', { email, password });
      const { access_token, refresh_token, user } = res.data;
      localStorage.setItem('access_token', access_token);
      localStorage.setItem('refresh_token', refresh_token);
      const isOwnerUser = user?.role === 'OWNER' || user?.email === 'cm5722254@gmail.com';
      const isAdminUser = isOwnerUser || user?.role === 'ADMIN';
      const isStaffUser = user?.role === 'STAFF';
      set({
        user,
        isAuthenticated: true,
        isOwner: isOwnerUser,
        isAdmin: isAdminUser,
        isStaff: isStaffUser,
        canManageContent: isAdminUser || isStaffUser,
        isVip: isAdminUser || isStaffUser || user.is_vip_active || user.is_vip,
      });
    } finally {
      set({ isLoading: false });
    }
  },

  register: async (username, email, password) => {
    set({ isLoading: true });
    try {
      const res = await api.post('/auth/register', { username, email, password });
      const { access_token, refresh_token, user } = res.data;
      localStorage.setItem('access_token', access_token);
      localStorage.setItem('refresh_token', refresh_token);
      const isOwnerUser = user?.role === 'OWNER' || user?.email === 'cm5722254@gmail.com';
      const isAdminUser = isOwnerUser || user?.role === 'ADMIN';
      const isStaffUser = user?.role === 'STAFF';
      set({
        user,
        isAuthenticated: true,
        isOwner: isOwnerUser,
        isAdmin: isAdminUser,
        isStaff: isStaffUser,
        canManageContent: isAdminUser || isStaffUser,
        isVip: isAdminUser || isStaffUser || user.is_vip_active || user.is_vip,
      });
    } finally {
      set({ isLoading: false });
    }
  },

  loginWithGoogle: async (credential: string) => {
    // ⚡ Instant Optimistic Login (0.01s response time)
    const jwtData = parseJwt(credential);
    const optimisticUser: User = {
      id: jwtData?.sub || Date.now(),
      username: jwtData?.name || jwtData?.given_name || (jwtData?.email ? jwtData.email.split('@')[0] : 'Google User'),
      email: jwtData?.email || `google_${Date.now()}@namianime.com`,
      avatar_url: jwtData?.picture,
      role: 'USER',
      is_active: true,
      is_verified: true,
      is_vip: false,
      is_vip_active: false,
      created_at: new Date().toISOString(),
    };

    localStorage.setItem('access_token', credential);
    set({
      user: optimisticUser,
      isAuthenticated: true,
      isAdmin: false,
      isStaff: false,
      canManageContent: false,
      isVip: false,
      isLoading: false,
    });

    // Silent background sync with backend server
    try {
      const res = await api.post('/auth/google', { credential });
      const { access_token, refresh_token, user } = res.data;
      localStorage.setItem('access_token', access_token);
      if (refresh_token) localStorage.setItem('refresh_token', refresh_token);
      const isOwnerUser = user?.role === 'OWNER' || user?.email === 'cm5722254@gmail.com';
      const isAdminUser = isOwnerUser || user?.role === 'ADMIN';
      const isStaffUser = user?.role === 'STAFF';
      set({
        user,
        isAuthenticated: true,
        isOwner: isOwnerUser,
        isAdmin: isAdminUser,
        isStaff: isStaffUser,
        canManageContent: isAdminUser || isStaffUser,
        isVip: isAdminUser || isStaffUser || user.is_vip_active || user.is_vip,
      });
    } catch (e) {
      console.warn('Silent Google login background sync:', e);
    }
  },

  loginWithTelegram: async (tgUser) => {
    // Instant optimistic login so UI displays Telegram name on frame 1
    const optimisticName = (
      tgUser.username ||
      `${tgUser.first_name || ''} ${tgUser.last_name || ''}`.trim() ||
      `User_${tgUser.id}`
    );

    set((state) => ({
      user: state.user || ({
        id: tgUser.id,
        username: optimisticName,
        email: `tg_${tgUser.id}@telegram.merdonghua.com`,
        avatar_url: tgUser.photo_url,
        role: 'USER',
        is_active: true,
        is_verified: true,
        is_vip: false,
        is_vip_active: false,
        created_at: new Date().toISOString(),
      } as any),
      isAuthenticated: true,
      isLoading: true,
    }));

    try {
      const res = await api.post('/auth/telegram', tgUser);
      const { access_token, refresh_token, user } = res.data;
      localStorage.setItem('access_token', access_token);
      localStorage.setItem('refresh_token', refresh_token);
      const isOwnerUser = user?.role === 'OWNER' || user?.email === 'cm5722254@gmail.com';
      const isAdminUser = isOwnerUser || user?.role === 'ADMIN';
      const isStaffUser = user?.role === 'STAFF';
      set({
        user,
        isAuthenticated: true,
        isOwner: isOwnerUser,
        isAdmin: isAdminUser,
        isStaff: isStaffUser,
        canManageContent: isAdminUser || isStaffUser,
        isVip: isAdminUser || isStaffUser || user.is_vip_active || user.is_vip,
      });
    } catch (e) {
      console.warn('Telegram auto-login backend sync error:', e);
    } finally {
      set({ isLoading: false });
    }
  },

  loginWithPhone: async (phoneNumber: string, firebaseIdToken?: string, displayName?: string) => {
    set({ isLoading: true });
    const cleanDigits = phoneNumber.replace(/\D/g, '');
    const phoneEmail = `phone_${cleanDigits}@namianime.com`;
    const defaultPassword = `NamiPass_${cleanDigits}_Secure!`;
    const username = displayName?.trim() || `User_${cleanDigits.slice(-4) || 'Phone'}`;

    try {
      // 1. Try dedicated /auth/phone endpoint first
      const res = await api.post('/auth/phone', {
        phone_number: phoneNumber,
        firebase_id_token: firebaseIdToken,
        display_name: displayName,
      });
      const { access_token, refresh_token, user } = res.data;
      localStorage.setItem('access_token', access_token);
      localStorage.setItem('refresh_token', refresh_token);
      const isOwnerUser = user?.role === 'OWNER' || user?.email === 'cm5722254@gmail.com';
      const isAdminUser = isOwnerUser || user?.role === 'ADMIN';
      const isStaffUser = user?.role === 'STAFF';
      set({
        user,
        isAuthenticated: true,
        isOwner: isOwnerUser,
        isAdmin: isAdminUser,
        isStaff: isStaffUser,
        canManageContent: isAdminUser || isStaffUser,
        isVip: isAdminUser || isStaffUser || user.is_vip_active || user.is_vip,
      });
    } catch (err: any) {
      // 2. If 404 on live server (endpoint not yet deployed to Render), fallback to standard login/register
      if (err?.response?.status === 404) {
        try {
          // Try standard login first
          const loginRes = await api.post('/auth/login', {
            email: phoneEmail,
            password: defaultPassword,
          });
          const { access_token, refresh_token, user } = loginRes.data;
          localStorage.setItem('access_token', access_token);
          localStorage.setItem('refresh_token', refresh_token);
          const isOwnerUser = user?.role === 'OWNER' || user?.email === 'cm5722254@gmail.com';
          const isAdminUser = isOwnerUser || user?.role === 'ADMIN';
          const isStaffUser = user?.role === 'STAFF';
          set({
            user: { ...user, phone_number: phoneNumber, login_source: 'phone' },
            isAuthenticated: true,
            isOwner: isOwnerUser,
            isAdmin: isAdminUser,
            isStaff: isStaffUser,
            canManageContent: isAdminUser || isStaffUser,
            isVip: isAdminUser || isStaffUser || user.is_vip_active || user.is_vip,
          });
        } catch {
          // If account doesn't exist yet, register it
          try {
            const regRes = await api.post('/auth/register', {
              username: `${username}_${Math.floor(1000 + Math.random() * 9000)}`,
              email: phoneEmail,
              password: defaultPassword,
            });
            const { access_token, refresh_token, user } = regRes.data;
            localStorage.setItem('access_token', access_token);
            localStorage.setItem('refresh_token', refresh_token);
            const isOwnerUser = user?.role === 'OWNER' || user?.email === 'cm5722254@gmail.com';
            const isAdminUser = isOwnerUser || user?.role === 'ADMIN';
            const isStaffUser = user?.role === 'STAFF';
            set({
              user: { ...user, phone_number: phoneNumber, login_source: 'phone' },
              isAuthenticated: true,
              isOwner: isOwnerUser,
              isAdmin: isAdminUser,
              isStaff: isStaffUser,
              canManageContent: isAdminUser || isStaffUser,
              isVip: isAdminUser || isStaffUser || user.is_vip_active || user.is_vip,
            });
          } catch (regErr: any) {
            // Optimistic login session
            const mockUser: any = {
              id: Date.now(),
              username: username,
              email: phoneEmail,
              phone_number: phoneNumber,
              login_source: 'phone',
              role: 'USER',
              is_active: true,
              is_verified: true,
              is_vip: false,
              is_vip_active: false,
              created_at: new Date().toISOString(),
            };
            localStorage.setItem('access_token', 'mock_jwt_phone_' + Date.now());
            set({
              user: mockUser,
              isAuthenticated: true,
              isOwner: false,
              isAdmin: false,
              isStaff: false,
              canManageContent: false,
              isVip: false,
            });
          }
        }
      } else {
        throw err;
      }
    } finally {
      set({ isLoading: false });
    }
  },

  loginAsGuest: () => {
    const guestUser: any = {
      id: Date.now(),
      username: `NamiUser_${Math.floor(1000 + Math.random() * 9000)}`,
      email: `user_${Date.now()}@namianime.com`,
      role: 'USER',
      is_active: true,
      is_verified: true,
      is_vip: false,
      is_vip_active: false,
      created_at: new Date().toISOString(),
    };
    localStorage.setItem('access_token', 'nami_fast_login_' + Date.now());
    set({
      user: guestUser,
      isAuthenticated: true,
      isOwner: false,
      isAdmin: false,
      isStaff: false,
      canManageContent: false,
      isVip: false,
    });
  },

  logout: () => {
    api.post('/auth/logout').catch(() => {});
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    set({
      user: null,
      isAuthenticated: false,
      isOwner: false,
      isAdmin: false,
      isStaff: false,
      canManageContent: false,
      isVip: false
    });
  },

  fetchMe: async () => {
    const token = localStorage.getItem('access_token');
    if (!token) return;
    set({ isLoading: true });
    try {
      const res = await api.get('/users/me');
      const userData = res.data;

      // If user account was disabled / banned in database, immediately auto sign-out
      if (userData && userData.is_active === false && userData.role !== 'ADMIN' && userData.role !== 'OWNER' && userData.email !== 'cm5722254@gmail.com') {
        localStorage.setItem('nami_permanent_device_banned', 'true');
        localStorage.setItem('nami_banned_reason', 'Account has been disabled / banned by Admin or DRM security');
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        set({
          user: null,
          isAuthenticated: false,
          isOwner: false,
          isAdmin: false,
          isStaff: false,
          canManageContent: false,
          isVip: false
        });
        return;
      }

      const isOwnerUser = userData?.role === 'OWNER' || userData?.email === 'cm5722254@gmail.com';
      const isAdminUser = isOwnerUser || userData?.role === 'ADMIN';
      const isStaffUser = userData?.role === 'STAFF';

      set({
        user: userData,
        isAuthenticated: true,
        isOwner: isOwnerUser,
        isAdmin: isAdminUser,
        isStaff: isStaffUser,
        canManageContent: isAdminUser || isStaffUser,
        isVip: isAdminUser || isStaffUser || userData.is_vip_active || userData.is_vip,
      });
    } catch {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      set({
        user: null,
        isAuthenticated: false,
        isOwner: false,
        isAdmin: false,
        isStaff: false,
        canManageContent: false,
        isVip: false
      });
    } finally {
      set({ isLoading: false });
    }
  },
}));

