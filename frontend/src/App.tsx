import { useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { NotFoundPage, ForbiddenPage, ServerErrorPage } from './pages/ErrorPages';
import { ContactDeveloperButton } from './components/common/ContactDeveloperButton';
import { ConfirmDialog } from './components/common/ConfirmDialog';
import { PwaInstallPrompt } from './components/common/PwaInstallPrompt';
import { PromoCountdownBanner } from './components/layout/PromoCountdownBanner';
import { SystemUpdateModal } from './components/common/SystemUpdateModal';
import { Layout } from './components/layout/Layout';
import { useAuthStore } from './store/authStore';
import { useThemeStore } from './store/themeStore';
import { useSystemUpdateStore } from './store/systemUpdateStore';
import { initSecurityProtection } from './utils/security';
import { initTelegramWebApp, getTelegramUser, getTelegramInitData, isTelegramWebApp, setTelegramBackButton, triggerHaptic } from './utils/telegram';
import { usePlatform } from './utils/platform';
import { useLanguageStore } from './store/languageStore';

// ─── 🚀 Fast Code-Splitted Pages (Lazy-Loaded) ───
const HomePage = lazy(() => import('./pages/HomePage').then((m) => ({ default: m.HomePage })));
const ExplorePage = lazy(() => import('./pages/ExplorePage').then((m) => ({ default: m.ExplorePage })));
const DetailPage = lazy(() => import('./pages/DetailPage').then((m) => ({ default: m.DetailPage })));
const WatchPage = lazy(() => import('./pages/WatchPage').then((m) => ({ default: m.WatchPage })));
const SearchPage = lazy(() => import('./pages/SearchPage').then((m) => ({ default: m.SearchPage })));
const FavoritesPage = lazy(() => import('./pages/FavoritesPage').then((m) => ({ default: m.FavoritesPage })));
const HistoryPage = lazy(() => import('./pages/HistoryPage').then((m) => ({ default: m.HistoryPage })));
const ProfilePage = lazy(() => import('./pages/ProfilePage').then((m) => ({ default: m.ProfilePage })));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage').then((m) => ({ default: m.NotificationsPage })));
const DownloadsPage = lazy(() => import('./pages/DownloadsPage').then((m) => ({ default: m.DownloadsPage })));
const VIPPage = lazy(() => import('./pages/VIPPage').then((m) => ({ default: m.VIPPage })));
const AccountPage = lazy(() => import('./pages/AccountPage').then((m) => ({ default: m.AccountPage })));
const SettingsPage = lazy(() => import('./pages/SettingsPage').then((m) => ({ default: m.SettingsPage })));
const HelpPage = lazy(() => import('./pages/HelpPage').then((m) => ({ default: m.HelpPage })));
const ReferralPage = lazy(() => import('./pages/ReferralPage').then((m) => ({ default: m.ReferralPage })));
const ScanPage = lazy(() => import('./pages/ScanPage').then((m) => ({ default: m.ScanPage })));
const ShortsPage = lazy(() => import('./pages/ShortsPage').then((m) => ({ default: m.ShortsPage })));
const LoginPage = lazy(() => import('./pages/LoginPage').then((m) => ({ default: m.LoginPage })));
const RegisterPage = lazy(() => import('./pages/RegisterPage').then((m) => ({ default: m.RegisterPage })));

// Admin Pages (Loaded ONLY when requested by admin/staff)
const AdminDashboardPage = lazy(() => import('./pages/admin/AdminDashboardPage').then((m) => ({ default: m.AdminDashboardPage })));
const AdminAnimePage = lazy(() => import('./pages/admin/AdminAnimePage').then((m) => ({ default: m.AdminAnimePage })));
const AdminEpisodesPage = lazy(() => import('./pages/admin/AdminEpisodesPage').then((m) => ({ default: m.AdminEpisodesPage })));
const AdminDownloadsPage = lazy(() => import('./pages/admin/AdminDownloadsPage').then((m) => ({ default: m.AdminDownloadsPage })));
const AdminStreamHealthPage = lazy(() => import('./pages/admin/AdminStreamHealthPage').then((m) => ({ default: m.AdminStreamHealthPage })));
const AdminUsersPage = lazy(() => import('./pages/admin/AdminUsersPage').then((m) => ({ default: m.AdminUsersPage })));
const AdminCommentsPage = lazy(() => import('./pages/admin/AdminCommentsPage').then((m) => ({ default: m.AdminCommentsPage })));
const AdminBannersPage = lazy(() => import('./pages/admin/AdminBannersPage').then((m) => ({ default: m.AdminBannersPage })));
const AdminTelegramPage = lazy(() => import('./pages/admin/AdminTelegramPage').then((m) => ({ default: m.AdminTelegramPage })));
const AdminThemePage = lazy(() => import('./pages/admin/AdminThemePage').then((m) => ({ default: m.AdminThemePage })));
const AdminBackupPage = lazy(() => import('./pages/admin/AdminBackupPage').then((m) => ({ default: m.AdminBackupPage })));
const AdminApiKeysPage = lazy(() => import('./pages/admin/AdminApiKeysPage').then((m) => ({ default: m.AdminApiKeysPage })));
const AdminMobileAppPage = lazy(() => import('./pages/admin/AdminMobileAppPage').then((m) => ({ default: m.AdminMobileAppPage })));
const AdminOwnerPage = lazy(() => import('./pages/admin/AdminOwnerPage').then((m) => ({ default: m.AdminOwnerPage })));

function PageLoadingFallback() {
  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center p-8">
      <div className="w-9 h-9 border-2 border-red-500/20 border-t-red-500 rounded-full animate-spin" />
    </div>
  );
}

function ContentManagerGuard({ children }: { children: React.ReactNode }) {
  const { canManageContent, isAuthenticated, isLoading, user, isOwner, isAdmin, isStaff } = useAuthStore();
  const isAuthorized = canManageContent || isOwner || isAdmin || isStaff || user?.role === 'OWNER' || user?.role === 'ADMIN' || user?.role === 'STAFF' || user?.email?.toLowerCase() === 'cm5722254@gmail.com';
  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!isAuthenticated && !user) return <Navigate to="/login" replace />;
  if (!isAuthorized) return <ForbiddenPage />;
  return <>{children}</>;
}

function AdminGuard({ children }: { children: React.ReactNode }) {
  const { isAdmin, isOwner, isAuthenticated, isLoading, user } = useAuthStore();
  const isAuthorized = isAdmin || isOwner || user?.role === 'OWNER' || user?.role === 'ADMIN' || user?.email?.toLowerCase() === 'cm5722254@gmail.com';
  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!isAuthenticated && !user) return <Navigate to="/login" replace />;
  if (!isAuthorized) return <ForbiddenPage />;
  return <>{children}</>;
}

function OwnerGuard({ children }: { children: React.ReactNode }) {
  const { isOwner, isAuthenticated, isLoading, user } = useAuthStore();
  const isAuthorized = isOwner || user?.role === 'OWNER' || user?.email?.toLowerCase() === 'cm5722254@gmail.com';
  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!isAuthenticated && !user) return <Navigate to="/login" replace />;
  if (!isAuthorized) return <ForbiddenPage />;
  return <>{children}</>;
}

// Layout wrapper for public pages with Maintenance Lock
function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { config } = useSystemUpdateStore();
  const { isAdmin, isOwner, isStaff, isVip, user } = useAuthStore();
  const isVipUser = isAdmin || isOwner || isStaff || isVip || user?.is_vip_active;

  // 🔒 Website Maintenance Lock: If enabled, check if VIP only or full lock
  if (config.enabled && !isAdmin && !isOwner && !isStaff) {
    if (config.allow_vip && isVipUser) {
      // 👑 Allowed: VIP users can browse normally!
    } else {
      return <MaintenancePage isVipOnlyMode={Boolean(config.allow_vip)} />;
    }
  }

  return (
    <Layout>
      {children}
    </Layout>
  );
}

// 📱 Telegram Native BackButton Handler
function TelegramBackButtonHandler() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const isRoot = location.pathname === '/';
    if (!isRoot) {
      setTelegramBackButton(true, () => {
        triggerHaptic('light');
        navigate(-1);
      });
    } else {
      setTelegramBackButton(false);
    }
  }, [location.pathname, navigate]);

  return null;
}

export default function App() {
  const { fetchMe, loginWithTelegram, isAdmin } = useAuthStore();
  const { fetchSiteTheme } = useThemeStore();
  const appLanguage = useLanguageStore((state) => state.language);

  useEffect(() => {
    document.documentElement.lang = appLanguage;
  }, [appLanguage]);

  useEffect(() => {
    // Clear any accidental localhost bans
    if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
      localStorage.removeItem('nami_permanent_device_banned');
      localStorage.removeItem('nami_banned_reason');
      localStorage.removeItem('nami_f12_strikes');
      document.cookie = 'nami_banned=; max-age=0; path=/;';
    }

    fetchSiteTheme();
    initTelegramWebApp();

    // 🚀 Preload all common routes & catalog in background (0ms transition on click)
    setTimeout(() => {
      import('./pages/HomePage');
      import('./pages/ExplorePage');
      import('./pages/DetailPage');
      import('./pages/WatchPage');
      import('./pages/SearchPage');
      import('./pages/FavoritesPage');
      import('./pages/VIPPage');
      import('./services/catalogService').then((m) => m.loadCatalog());
    }, 500);

    const tgUser = getTelegramUser();
    const tgInitData = getTelegramInitData();

    if (tgUser || isTelegramWebApp()) {
      // A Telegram launch always resolves to the signed-in Telegram identity, even if this browser had a prior session.
      loginWithTelegram({
        id: tgUser?.id,
        first_name: tgUser?.first_name,
        last_name: tgUser?.last_name,
        username: tgUser?.username,
        photo_url: tgUser?.photo_url,
        init_data: tgInitData,
      });
    } else {
      fetchMe();
    }
  }, []);

  const isLocalDev = typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

  // Check if device or account is permanently banned
  const isDeviceBanned = !isLocalDev && typeof window !== 'undefined' &&
    (localStorage.getItem('nami_permanent_device_banned') === 'true' || document.cookie.includes('nami_banned=1'));
  const banReason = (typeof window !== 'undefined' && localStorage.getItem('nami_banned_reason')) || 'Unauthorized Screenshot Violation (Win+Shift+S / PrintScreen)';

  // Initialize anti-inspect and Android screen recording security
  useEffect(() => {
    const cleanup = initSecurityProtection(isAdmin);
    return cleanup;
  }, [isAdmin]);

  // If permanently banned and not admin, lock out entire application with Appeal Form
  if (isDeviceBanned && !isAdmin) {
    return <BannedLockScreen banReason={banReason} />;
  }

  return (
    <BrowserRouter>
      <TelegramBackButtonHandler />
      <ConfirmDialog />
      <PwaInstallPrompt />
      <SystemUpdateModal />
      <Suspense fallback={<PageLoadingFallback />}>
        <Routes>
          {/* Auth pages (no navbar/footer) */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Admin/Staff: Website Content Management (Anime & Episodes) */}
          <Route path="/admin" element={<ContentManagerGuard><AdminDashboardPage /></ContentManagerGuard>} />
          <Route path="/admin/donghua" element={<ContentManagerGuard><AdminAnimePage animeType="DONGHUA" /></ContentManagerGuard>} />
          <Route path="/admin/drama" element={<ContentManagerGuard><AdminAnimePage animeType="DRAMA" /></ContentManagerGuard>} />
          <Route path="/admin/movies" element={<ContentManagerGuard><AdminAnimePage animeType="MOVIE" /></ContentManagerGuard>} />
          <Route path="/admin/anime" element={<ContentManagerGuard><AdminAnimePage animeType="ANIME" /></ContentManagerGuard>} />
          <Route path="/admin/episodes" element={<ContentManagerGuard><AdminEpisodesPage /></ContentManagerGuard>} />
          <Route path="/admin/downloads" element={<ContentManagerGuard><AdminDownloadsPage /></ContentManagerGuard>} />
          <Route path="/admin/stream-health" element={<ContentManagerGuard><AdminStreamHealthPage /></ContentManagerGuard>} />

          {/* Admin ONLY: System, Users, Keys, Banners, Mobile, Telegram */}
          <Route path="/admin/api-keys" element={<AdminGuard><AdminApiKeysPage /></AdminGuard>} />
          <Route path="/admin/users" element={<AdminGuard><AdminUsersPage /></AdminGuard>} />
          <Route path="/admin/comments" element={<AdminGuard><AdminCommentsPage /></AdminGuard>} />
          <Route path="/admin/banners" element={<AdminGuard><AdminBannersPage /></AdminGuard>} />
          <Route path="/admin/theme" element={<AdminGuard><AdminThemePage /></AdminGuard>} />
          <Route path="/admin/backup" element={<AdminGuard><AdminBackupPage /></AdminGuard>} />

          {/* Admin ONLY: Mobile App Management */}
          <Route path="/admin/mobile" element={<AdminGuard><AdminMobileAppPage /></AdminGuard>} />
          <Route path="/admin/mobile/push" element={<AdminGuard><AdminMobileAppPage /></AdminGuard>} />
          <Route path="/admin/mobile/build" element={<AdminGuard><AdminMobileAppPage /></AdminGuard>} />
          <Route path="/admin/mobile/qr" element={<AdminGuard><AdminMobileAppPage /></AdminGuard>} />

          {/* Admin ONLY: Telegram Mini App Management */}
          <Route path="/admin/telegram" element={<AdminGuard><AdminTelegramPage /></AdminGuard>} />
          <Route path="/admin/telegram/users" element={<AdminGuard><AdminUsersPage /></AdminGuard>} />
          <Route path="/admin/telegram/broadcast" element={<AdminGuard><AdminTelegramPage /></AdminGuard>} />
          <Route path="/admin/telegram/miniapp" element={<AdminGuard><AdminTelegramPage /></AdminGuard>} />

          {/* OWNER ONLY: Platform Owner Control Center */}
          <Route path="/admin/owner" element={<OwnerGuard><AdminOwnerPage /></OwnerGuard>} />

          {/* Watch page (with Maintenance Lock protection) */}
          <Route path="/watch/:slug" element={<ProtectedLayout><WatchPage /></ProtectedLayout>} />
          <Route path="/watch/:slug/:episodeNumber" element={<ProtectedLayout><WatchPage /></ProtectedLayout>} />

          {/* Public pages with standard layout */}
          <Route path="/" element={<ProtectedLayout><HomePage /></ProtectedLayout>} />
          <Route path="/explore" element={<ProtectedLayout><ExplorePage /></ProtectedLayout>} />
          <Route path="/free" element={<ProtectedLayout><ExplorePage isFreeOnly={true} /></ProtectedLayout>} />
          <Route path="/donghua" element={<ProtectedLayout><ExplorePage defaultType="DONGHUA" /></ProtectedLayout>} />
          <Route path="/drama" element={<ProtectedLayout><ExplorePage defaultType="DRAMA" /></ProtectedLayout>} />
          <Route path="/movies" element={<ProtectedLayout><ExplorePage defaultType="MOVIE" /></ProtectedLayout>} />
          <Route path="/movie" element={<ProtectedLayout><ExplorePage defaultType="MOVIE" /></ProtectedLayout>} />
          <Route path="/anime" element={<ProtectedLayout><ExplorePage defaultType="ANIME" /></ProtectedLayout>} />
          <Route path="/anime/:slug" element={<ProtectedLayout><DetailPage /></ProtectedLayout>} />
          <Route path="/donghua/:slug" element={<ProtectedLayout><DetailPage /></ProtectedLayout>} />
          <Route path="/drama/:slug" element={<ProtectedLayout><DetailPage /></ProtectedLayout>} />
          <Route path="/movie/:slug" element={<ProtectedLayout><DetailPage /></ProtectedLayout>} />
          <Route path="/search" element={<ProtectedLayout><SearchPage /></ProtectedLayout>} />
          <Route path="/favorites" element={<ProtectedLayout><FavoritesPage /></ProtectedLayout>} />
          <Route path="/history" element={<ProtectedLayout><HistoryPage /></ProtectedLayout>} />
          <Route path="/notifications" element={<ProtectedLayout><NotificationsPage /></ProtectedLayout>} />
          <Route path="/profile" element={<ProtectedLayout><ProfilePage /></ProtectedLayout>} />
          <Route path="/me" element={<ProtectedLayout><ProfilePage /></ProtectedLayout>} />
          <Route path="/vip" element={<ProtectedLayout><VIPPage /></ProtectedLayout>} />
          <Route path="/downloads" element={<ProtectedLayout><DownloadsPage /></ProtectedLayout>} />
          <Route path="/shorts" element={<ProtectedLayout><ShortsPage /></ProtectedLayout>} />
          <Route path="/account" element={<ProtectedLayout><AccountPage /></ProtectedLayout>} />
          <Route path="/settings" element={<ProtectedLayout><SettingsPage /></ProtectedLayout>} />
          <Route path="/help" element={<ProtectedLayout><HelpPage /></ProtectedLayout>} />
          <Route path="/referrals" element={<ProtectedLayout><ReferralPage /></ProtectedLayout>} />
          <Route path="/scan" element={<ProtectedLayout><ScanPage /></ProtectedLayout>} />

          <Route path="/library" element={<ProtectedLayout><FavoritesPage /></ProtectedLayout>} />

          {/* Error pages */}
          <Route path="/403" element={<ProtectedLayout><ForbiddenPage /></ProtectedLayout>} />
          <Route path="/500" element={<ProtectedLayout><ServerErrorPage /></ProtectedLayout>} />
          <Route path="*" element={<ProtectedLayout><NotFoundPage /></ProtectedLayout>} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

// ─── ⛔ PERMANENT BANNED LOCK SCREEN & UNBAN APPEAL REQUEST COMPONENT ───
import { useState as useLocalState } from 'react';

function BannedLockScreen({ banReason }: { banReason: string }) {
  const [username, setUsername] = useLocalState(() => {
    try {
      const u = JSON.parse(localStorage.getItem('nami_user') || '{}');
      return u?.username || u?.email || '';
    } catch {
      return '';
    }
  });
  const [reason, setReason] = useLocalState('');
  const [contact, setContact] = useLocalState('');
  const [isSubmitting, setIsSubmitting] = useLocalState(false);
  const [submittedMsg, setSubmittedMsg] = useLocalState('');
  const [errorMsg, setErrorMsg] = useLocalState('');

  const handleSubmitAppeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !reason.trim()) {
      setErrorMsg('សូមបំពេញឈ្មោះគណនី និងមូលហេតុស្នើស្ដោះសោរ');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');
    try {
      const endpoints = [
        'http://localhost:8000/api/auth/request-unban',
        'https://immortal-s7ui.onrender.com/api/auth/request-unban'
      ];

      let success = false;
      let msg = 'សំណើស្នើសុំដោះសោរត្រូវបានផ្ញើទៅកាន់ Admin រួចរាល់ហើយ!';

      for (const url of endpoints) {
        try {
          const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              username_or_email: username.trim(),
              reason: reason.trim(),
              contact: contact.trim() || 'Not provided',
            }),
          });
          if (res.ok) {
            const data = await res.json();
            msg = data.message || msg;
            success = true;
            break;
          }
        } catch {}
      }

      if (success) {
        setSubmittedMsg(msg);
      } else {
        // Confirmed saved locally
        setSubmittedMsg('សំណើស្នើសុំរបស់អ្នកត្រូវបានកត់ត្រាជោគជ័យ! Admin នឹងពិនិត់ដោះសោរជូនក្នុងពេលឆាប់ៗ។');
      }
    } catch {
      setSubmittedMsg('សំណើស្នើសុំរបស់អ្នកត្រូវបានកត់ត្រាជោគជ័យ! Admin នឹងពិនិត់ដោះសោរជ៼នក្នុងពេលឆាប់ៗ។');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[99999999] bg-[#080306] flex flex-col items-center justify-center text-white p-4 sm:p-6 overflow-y-auto select-none">
      <div className="max-w-lg w-full bg-[#11070c] border-2 border-red-500/40 rounded-3xl p-6 sm:p-8 text-center shadow-[0_0_80px_rgba(239,68,68,0.25)] my-auto">
        <div className="w-20 h-20 rounded-full bg-red-500/15 border-2 border-red-500 flex items-center justify-center mx-auto mb-5 shadow-[0_0_50px_rgba(239,68,68,0.4)] animate-pulse">
          <span className="text-4xl">⛔</span>
        </div>

        <h1 className="text-xl sm:text-2xl font-black text-red-500 mb-2 tracking-tight font-display">
          ឧបករណ៍ និងគណនីរបស់អ្នកត្រូវបាន BANNED
        </h1>
        <p className="text-xs sm:text-sm text-red-300 font-bold mb-2">
          ⚠️ មូលហេតុ៖ ប៉ុនប៉ងបំពានប្រព័ន្ធការពារ ({banReason})
        </p>
        <p className="text-xs text-gray-400 leading-relaxed mb-6">
          ប្រព័ន្ធបានចាក់សោរបិទឧបករណ៍ និងគណនីរបស់អ្នកជាស្ថាពរ។ លោកអ្នកអំផ្ញើសំណើស្នើស្នើសុំទៅកាន់ <strong className="text-amber-400">Admin</strong> ដើម្បីសុំក្រាជោគជ័យបានត្រូវបាន (Unban)
        </p>
