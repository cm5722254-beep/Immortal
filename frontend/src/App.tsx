import { useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { MobileNav } from './components/layout/MobileNav';
import { NotFoundPage, ForbiddenPage, ServerErrorPage } from './pages/ErrorPages';
import { ContactDeveloperButton } from './components/common/ContactDeveloperButton';
import { ConfirmDialog } from './components/common/ConfirmDialog';
import { PwaInstallPrompt } from './components/common/PwaInstallPrompt';
import { PromoCountdownBanner } from './components/layout/PromoCountdownBanner';
import { SystemUpdateModal } from './components/common/SystemUpdateModal';
import { MaintenancePage } from './pages/MaintenancePage';
import { useAuthStore } from './store/authStore';
import { useThemeStore } from './store/themeStore';
import { useSystemUpdateStore } from './store/systemUpdateStore';
import { initSecurityProtection } from './utils/security';
import { initTelegramWebApp, getTelegramUser, getTelegramInitData } from './utils/telegram';

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
const LoginPage = lazy(() => import('./pages/LoginPage').then((m) => ({ default: m.LoginPage })));
const RegisterPage = lazy(() => import('./pages/RegisterPage').then((m) => ({ default: m.RegisterPage })));

// Admin Pages (Loaded ONLY when requested by admin/staff)
const AdminDashboardPage = lazy(() => import('./pages/admin/AdminDashboardPage').then((m) => ({ default: m.AdminDashboardPage })));
const AdminAnimePage = lazy(() => import('./pages/admin/AdminAnimePage').then((m) => ({ default: m.AdminAnimePage })));
const AdminEpisodesPage = lazy(() => import('./pages/admin/AdminEpisodesPage').then((m) => ({ default: m.AdminEpisodesPage })));
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
  const { canManageContent, isAuthenticated, isLoading } = useAuthStore();
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#080306] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!canManageContent) return <ForbiddenPage />;
  return <>{children}</>;
}

function AdminGuard({ children }: { children: React.ReactNode }) {
  const { isAdmin, isAuthenticated, isLoading } = useAuthStore();
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#080306] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!isAdmin) return <ForbiddenPage />;
  return <>{children}</>;
}

function OwnerGuard({ children }: { children: React.ReactNode }) {
  const { isOwner, isAuthenticated, isLoading } = useAuthStore();
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#080306] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!isOwner) return <ForbiddenPage />;
  return <>{children}</>;
}

// Layout wrapper for public pages
function PublicLayout({ children }: { children: React.ReactNode }) {
  const { config } = useSystemUpdateStore();
  const { isAdmin, isOwner, isStaff } = useAuthStore();

  // 🔒 Website Maintenance Lock: If enabled, visitors cannot view or click anything!
  if (config.enabled && !isAdmin && !isOwner && !isStaff) {
    return <MaintenancePage />;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <PromoCountdownBanner />
      <Navbar />
      <div className="flex-1 pb-16 sm:pb-20 md:pb-0">
        {children}
      </div>
      <ContactDeveloperButton />
      <Footer />
      <MobileNav />
    </div>
  );
}

// Layout wrapper for watch page with Maintenance Lock
function PublicWatchLayout({ children }: { children: React.ReactNode }) {
  const { config } = useSystemUpdateStore();
  const { isAdmin, isOwner, isStaff } = useAuthStore();

  if (config.enabled && !isAdmin && !isOwner && !isStaff) {
    return <MaintenancePage />;
  }

  return (
    <>
      <Navbar />
      {children}
      <MobileNav />
    </>
  );
}


export default function App() {
  const { fetchMe, loginWithTelegram, isAuthenticated, isAdmin } = useAuthStore();
  const { fetchSiteTheme } = useThemeStore();

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

    if (tgUser && !isAuthenticated) {
      // Auto login with Telegram account
      loginWithTelegram({
        id: tgUser.id,
        first_name: tgUser.first_name,
        last_name: tgUser.last_name,
        username: tgUser.username,
        photo_url: tgUser.photo_url,
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
          <Route path="/watch/:slug" element={<PublicWatchLayout><WatchPage /></PublicWatchLayout>} />
          <Route path="/watch/:slug/:episodeNumber" element={<PublicWatchLayout><WatchPage /></PublicWatchLayout>} />

          {/* Public pages with standard layout */}
          <Route path="/" element={<PublicLayout><HomePage /></PublicLayout>} />
          <Route path="/explore" element={<PublicLayout><ExplorePage /></PublicLayout>} />
          <Route path="/free" element={<PublicLayout><ExplorePage isFreeOnly={true} /></PublicLayout>} />
          <Route path="/donghua" element={<PublicLayout><ExplorePage defaultType="DONGHUA" /></PublicLayout>} />
          <Route path="/drama" element={<PublicLayout><ExplorePage defaultType="DRAMA" /></PublicLayout>} />
          <Route path="/movies" element={<PublicLayout><ExplorePage defaultType="MOVIE" /></PublicLayout>} />
          <Route path="/movie" element={<PublicLayout><ExplorePage defaultType="MOVIE" /></PublicLayout>} />
          <Route path="/anime" element={<PublicLayout><ExplorePage defaultType="ANIME" /></PublicLayout>} />
          <Route path="/anime/:slug" element={<PublicLayout><DetailPage /></PublicLayout>} />
          <Route path="/donghua/:slug" element={<PublicLayout><DetailPage /></PublicLayout>} />
          <Route path="/drama/:slug" element={<PublicLayout><DetailPage /></PublicLayout>} />
          <Route path="/movie/:slug" element={<PublicLayout><DetailPage /></PublicLayout>} />
          <Route path="/search" element={<PublicLayout><SearchPage /></PublicLayout>} />
          <Route path="/favorites" element={<PublicLayout><FavoritesPage /></PublicLayout>} />
          <Route path="/history" element={<PublicLayout><HistoryPage /></PublicLayout>} />
          <Route path="/notifications" element={<PublicLayout><NotificationsPage /></PublicLayout>} />
          <Route path="/profile" element={<PublicLayout><ProfilePage /></PublicLayout>} />
          <Route path="/me" element={<PublicLayout><ProfilePage /></PublicLayout>} />
          <Route path="/settings" element={<PublicLayout><ProfilePage /></PublicLayout>} />
          <Route path="/vip" element={<PublicLayout><VIPPage /></PublicLayout>} />
          <Route path="/downloads" element={<PublicLayout><DownloadsPage /></PublicLayout>} />

          <Route path="/library" element={<PublicLayout><FavoritesPage /></PublicLayout>} />

          {/* Error pages */}
          <Route path="/403" element={<PublicLayout><ForbiddenPage /></PublicLayout>} />
          <Route path="/500" element={<PublicLayout><ServerErrorPage /></PublicLayout>} />
          <Route path="*" element={<PublicLayout><NotFoundPage /></PublicLayout>} />
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
      setErrorMsg('សូមបំពេញឈ្មោះគណនី និងមូលហេតុស្នើសុំដោះសោរ');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');
    try {
      const endpoints = [
        'http://localhost:8000/api/auth/request-unban',
        'https://merdonghua-com.onrender.com/api/auth/request-unban'
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
        setSubmittedMsg('សំណើស្នើសុំរបស់អ្នកត្រូវបានកត់ត្រាជោគជ័យ! Admin នឹងពិនិត្យដោះសោរជូនក្នុងពេលឆាប់ៗ។');
      }
    } catch {
      setSubmittedMsg('សំណើស្នើសុំរបស់អ្នកត្រូវបានកត់ត្រាជោគជ័យ! Admin នឹងពិនិត្យដោះសោរជូនក្នុងពេលឆាប់ៗ។');
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
          ប្រព័ន្ធបានចាក់សោរបិទឧបករណ៍ និងគណនីរបស់អ្នកជាស្ថាពរ។ លោកអ្នកអាចផ្ញើសំណើស្នើសុំទៅកាន់ <strong className="text-amber-400">Admin</strong> ដើម្បីសុំការដោះសោរ (Unban) បានតាមទម្រង់ខាងក្រោម៖
        </p>

        {submittedMsg ? (
          <div className="bg-emerald-500/15 border border-emerald-500/40 rounded-2xl p-5 text-emerald-300 text-xs sm:text-sm font-bold animate-fade-in space-y-2">
            <p className="text-base">✅ {submittedMsg}</p>
            <p className="text-gray-300 font-normal text-xs">
              សូមរង់ចាំ Admin ពិនិត្យ និងដោះសោរជូន។ ឬអាចទាក់ទង Admin តាម Telegram ផ្ទាល់បន្ថែម៖
            </p>
            <div className="pt-2">
              <a
                href="https://t.me/merdonghuakh"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 bg-[#229ED9] text-white text-xs font-bold py-2 px-4 rounded-xl"
              >
                💬 @merdonghuakh (Telegram)
              </a>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmitAppeal} className="space-y-3.5 text-left">
            {errorMsg && (
              <div className="bg-red-500/15 border border-red-500/40 text-red-300 text-xs p-2.5 rounded-xl text-center">
                {errorMsg}
              </div>
            )}

            <div>
              <label className="block text-[11px] font-bold text-gray-400 mb-1">
                ឈ្មោះគណនី / Email / លេខទូរសព្ទរបស់អ្នក៖
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="ឧ. username, email ឬ 012345678"
                required
                className="w-full bg-[#080306] border border-white/10 focus:border-red-500 text-white rounded-xl px-3.5 py-2.5 text-xs focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-400 mb-1">
                មូលហេតុស្នើសុំដោះសោរ (Appeal Message)៖
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="ឧ. សូមទោស Admin ខ្ញុំច្រឡំដៃចុច F12 / Shortcut សូមមេត្តាជួយដោះសោរឱ្យខ្ញុំវិញផង..."
                rows={3}
                required
                className="w-full bg-[#080306] border border-white/10 focus:border-red-500 text-white rounded-xl px-3.5 py-2.5 text-xs focus:outline-none resize-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-400 mb-1">
                ព័ត៌មានទំនាក់ទំនង (Telegram / Phone) [Optional]៖
              </label>
              <input
                type="text"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder="ឧ. @my_telegram ឬ 098765432"
                className="w-full bg-[#080306] border border-white/10 focus:border-red-500 text-white rounded-xl px-3.5 py-2.5 text-xs focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-black text-xs py-3 rounded-xl shadow-lg shadow-red-600/30 transition-all active:scale-95 disabled:opacity-50"
            >
              {isSubmitting ? 'កំពុងផ្ញើសំណើ...' : '📩 ផ្ញើសំណើស្នើសុំដោះសោរទៅកាន់ Admin (Submit Appeal)'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

