import axios, { AxiosError } from 'axios';
import { Capacitor } from '@capacitor/core';

const isNative = Capacitor.isNativePlatform();
const BASE_URL =
  import.meta.env.VITE_API_URL ||
  (isNative || import.meta.env.PROD
    ? 'https://merdonghua-com.onrender.com'
    : 'http://localhost:8000');

export const api = axios.create({
  baseURL: `${BASE_URL}/api`,
  headers: { 'Content-Type': 'application/json' },
  timeout: 60000,
});

// Fast in-memory cache for public GET endpoints (30s TTL)
const apiCache = new Map<string, { data: any; status: number; timestamp: number }>();
const CACHE_TTL = 30 * 1000; // 30 seconds
const CACHEABLE_ROUTES = ['/anime', '/admin/banners', '/theme', '/genres', '/schedule'];

// Inject JWT Bearer token on every request & check cache for GET
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Check cache for GET
  if (config.method?.toLowerCase() === 'get' && config.url) {
    const isCacheable = CACHEABLE_ROUTES.some((route) => config.url?.includes(route));
    if (isCacheable) {
      const cacheKey = `${config.url}?${JSON.stringify(config.params || {})}`;
      const cached = apiCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        config.adapter = async () => ({
          data: cached.data,
          status: cached.status,
          statusText: 'OK',
          headers: {},
          config,
          request: {},
        });
      }
    }
  }

  return config;
});

// Auto-refresh on 401
let refreshing = false;

// Cache successful GET responses
api.interceptors.response.use(
  (res) => {
    if (res.config.method?.toLowerCase() === 'get' && res.config.url) {
      const isCacheable = CACHEABLE_ROUTES.some((route) => res.config.url?.includes(route));
      if (isCacheable && res.status === 200) {
        const cacheKey = `${res.config.url}?${JSON.stringify(res.config.params || {})}`;
        apiCache.set(cacheKey, {
          data: res.data,
          status: res.status,
          timestamp: Date.now(),
        });
      }
    }
    return res;
  },
  async (error: AxiosError) => {
    if (error.response?.status === 401 && !refreshing) {
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        refreshing = true;
        try {
          const res = await axios.post(`${BASE_URL}/api/auth/refresh`, {
            refresh_token: refreshToken,
          });
          const { access_token, refresh_token } = res.data;
          localStorage.setItem('access_token', access_token);
          localStorage.setItem('refresh_token', refresh_token);
          // Retry original request
          if (error.config) {
            error.config.headers.Authorization = `Bearer ${access_token}`;
            return api(error.config);
          }
        } catch {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          window.location.href = '/login';
        } finally {
          refreshing = false;
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
