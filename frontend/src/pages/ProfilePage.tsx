import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ChevronRight, Languages, Headset,
  Tv, ExternalLink,
  ShieldCheck, Trash2, CheckCircle2, Crown, ShieldAlert,
  RotateCw, Eye, Wand2, Clock3, Download, Bookmark,
  LogOut, Bell
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { triggerHaptic } from '../utils/telegram';
import { useUiPreferencesStore } from '../store/uiPreferencesStore';
import { clearLocalCatalogCache } from '../services/catalogService';
import { translate, useLanguageStore } from '../store/languageStore';

export function ProfilePage() {
  const { user, isAuthenticated, logout, isAdmin, isOwner, isStaff } = useAuthStore();
  const navigate = useNavigate();
  const language = useLanguageStore((state) => state.language);
  const setLanguage = useLanguageStore((state) => state.setLanguage);

  const {
    cleanMode,
    reduceMotion,
    hidePromos,
    toggleCleanMode,
    toggleReduceMotion,
    toggleHidePromos,
  } = useUiPreferencesStore();

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [streamQuality, setStreamQuality] = useState(() => {
    try { return localStorage.getItem('nami_playback_quality') || '1080p Full HD'; } catch { return '1080p Full HD'; }
  });
  const [vipClock, setVipClock] = useState(() => Date.now());

  useEffect(() => {
    if (!user?.vip_expires_at) return;
    const timer = window.setInterval(() => setVipClock(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, [user?.vip_expires_at]);

  const vipTimeLeft = (() => {
    if (!user?.vip_expires_at) return translate(user?.is_vip_active ? 'No expiry date' : 'No active VIP plan', language);
    const remaining = new Date(user.vip_expires_at).getTime() - vipClock;
    if (!Number.isFinite(remaining) || remaining <= 0) return translate('Expired', language);
    const days = Math.floor(remaining / 86_400_000);
    const hours = Math.floor((remaining % 86_400_000) / 3_600_000);
    const minutes = Math.floor((remaining % 3_600_000) / 60_000);
    return language === 'km' ? `នៅសល់ ${days}ថ្ងៃ ${hours}ម៉ោង ${minutes}នាទី` : `${days}d ${hours}h ${minutes}m remaining`;
  })();

  const vipExpiryDate = user?.vip_expires_at
    ? new Date(user.vip_expires_at).toLocaleString(language === 'km' ? 'km-KH' : 'en-US', { dateStyle: 'medium', timeStyle: 'short' })
    : null;

  const showToast = (msg: string) => {
    triggerHaptic('light');
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const userName = user?.username || (isAuthenticated ? 'Member' : 'Guest Viewer');

  return (
    <main className="min-h-screen bg-slate-50/70 text-slate-900 pb-28 md:pb-16 px-4 py-6 max-w-xl mx-auto transition-colors">
      {/* ── Page Header ── */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display font-black text-2xl sm:text-3xl text-slate-900 tracking-tight">
            {language === 'km' ? 'គណនី & ការកំណត់' : 'Settings & Profile'}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {language === 'km' ? 'គ្រប់គ្រងគណនី និងបទពិសោធន៍ទស្សនា' : 'Manage your preferences and stream quality'}
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          <Link
            to="/notifications"
            className="p-2.5 rounded-2xl bg-white border border-slate-200/80 hover:bg-slate-50 text-slate-600 hover:text-slate-900 shadow-xs transition-all"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4" />
          </Link>
        </div>
      </div>

      <div className="space-y-6">
        {/* ── 1. Apple-Style ID Card ── */}
        <div className="bg-white/90 backdrop-blur-xl border border-slate-200/90 rounded-3xl p-5 shadow-xs transition-all flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 min-w-0">
            {/* Avatar */}
            <div className="relative shrink-0">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-black text-xl shadow-sm ring-4 ring-blue-50 overflow-hidden">
                {user?.avatar_url ? (
                  <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  userName.charAt(0).toUpperCase()
                )}
              </div>
              {user?.is_vip_active && (
                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-amber-400 border-2 border-white flex items-center justify-center shadow-xs">
                  <Crown className="w-3 h-3 fill-slate-950 text-slate-950" />
                </div>
              )}
            </div>

            {/* User Meta */}
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-display font-bold text-base text-slate-900 truncate">
                  {userName}
                </h2>
                {user?.role === 'OWNER' || user?.email === 'cm5722254@gmail.com' ? (
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 shadow-xs inline-flex items-center gap-1">
                    <Crown className="w-3 h-3 fill-amber-700 text-amber-700" /> OWNER
                  </span>
                ) : user?.role === 'ADMIN' ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200 inline-flex items-center gap-1">
                    <ShieldAlert className="w-3 h-3" /> ADMIN
                  </span>
                ) : user?.role === 'STAFF' ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-100 text-cyan-700 border border-cyan-200 inline-flex items-center gap-1">
                    STAFF
                  </span>
                ) : user?.is_vip_active ? (
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 inline-flex items-center gap-1">
                    <Crown className="w-3 h-3 fill-amber-600 text-amber-600" /> VIP
                  </span>
                ) : (
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                    Standard
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5 truncate font-sans">
                {user?.email || (user?.phone_number ? `+855 ${user.phone_number}` : (user?.telegram_username ? `@${user.telegram_username}` : 'MerDonghua Member'))}
              </p>
            </div>
          </div>

          {!isAuthenticated ? (
            <Link
              to="/login"
              className="px-4 py-2 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-all shrink-0"
            >
              {language === 'km' ? 'ចូលគណនី' : 'Sign in'}
            </Link>
          ) : (
            <Link
              to="/account"
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors shrink-0"
              aria-label="Account Details"
            >
              <ChevronRight className="w-5 h-5" />
            </Link>
          )}
        </div>

        {/* ── 2. VIP Membership Status Banner ── */}
        <div className="bg-gradient-to-br from-amber-500/10 via-white to-amber-500/5 border border-amber-200/80 rounded-3xl p-5 shadow-xs flex items-center justify-between gap-4">
          <div className="space-y-1 min-w-0">
            <div className="inline-flex items-center gap-1 text-[11px] font-black text-amber-700 uppercase tracking-wider">
              <Crown className="w-3.5 h-3.5 fill-amber-500 text-amber-600" />
              <span>{language === 'km' ? 'សមាជិកភាព VIP' : 'VIP Membership'}</span>
            </div>
            <p className="text-sm font-bold text-slate-900">
              {user?.is_vip_active
                ? (vipExpiryDate ? `${language === 'km' ? 'ផុតកំណត់ត្រឹម' : 'Expires'} ${vipExpiryDate}` : (language === 'km' ? 'សមាជិកពេញមួយជីវិត' : 'Lifetime Access'))
                : (language === 'km' ? 'គម្រោងទូទៅ (មិនទាន់មាន VIP)' : 'Standard Free Viewer')}
            </p>
            <p className="text-xs text-slate-500">{vipTimeLeft}</p>
          </div>

          <Link
            to="/vip"
            onClick={() => triggerHaptic('medium')}
            className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-xs shadow-xs transition-all shrink-0 hover:scale-105 active:scale-95"
          >
            {user?.is_vip_active ? (language === 'km' ? 'បន្តសុពលភាព' : 'Extend VIP') : (language === 'km' ? 'ទិញ VIP ឥឡូវ' : 'Get VIP')}
          </Link>
        </div>

        {/* ── 3. Quick Actions: Favorites / History / Downloads ── */}
        <div>
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-2 block">
            {language === 'km' ? 'បណ្ណាល័យវីដេអូ' : 'My Library'}
          </span>
          <div className="grid grid-cols-3 gap-3">
            <Link
              to="/favorites"
              className="bg-white/90 backdrop-blur-xl border border-slate-200/80 hover:border-blue-400/60 rounded-2xl p-3.5 text-center shadow-xs transition-all group hover:scale-[1.02] active:scale-[0.98]"
            >
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform">
                <Bookmark className="w-5 h-5 fill-rose-100" />
              </div>
              <span className="font-bold text-xs text-slate-800 block">
                {language === 'km' ? 'រក្សាទុក' : 'Saved'}
              </span>
            </Link>

            <Link
              to="/history"
              className="bg-white/90 backdrop-blur-xl border border-slate-200/80 hover:border-blue-400/60 rounded-2xl p-3.5 text-center shadow-xs transition-all group hover:scale-[1.02] active:scale-[0.98]"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform">
                <Clock3 className="w-5 h-5" />
              </div>
              <span className="font-bold text-xs text-slate-800 block">
                {language === 'km' ? 'ប្រវត្តិមើល' : 'History'}
              </span>
            </Link>

            <Link
              to="/downloads"
              className="bg-white/90 backdrop-blur-xl border border-slate-200/80 hover:border-blue-400/60 rounded-2xl p-3.5 text-center shadow-xs transition-all group hover:scale-[1.02] active:scale-[0.98]"
            >
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform">
                <Download className="w-5 h-5" />
              </div>
              <span className="font-bold text-xs text-slate-800 block">
                {language === 'km' ? 'ទាញយក' : 'Downloads'}
              </span>
            </Link>
          </div>
        </div>

        {/* ── 4. Apple Inset Group: UI & Display Experience ── */}
        <div>
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-2 block">
            {language === 'km' ? 'បទពិសោធន៍ទស្សនា & UI' : 'Display & Visuals'}
          </span>
          <div className="bg-white/90 backdrop-blur-xl border border-slate-200/80 rounded-3xl overflow-hidden divide-y divide-slate-100 shadow-xs">
            {/* Toggle 1: Clean UI Mode */}
            <div
              onClick={() => {
                toggleCleanMode();
                showToast(!cleanMode ? 'បានបើក៖ របៀបទស្សនាសាមញ្ញ' : 'បានបិទ៖ របៀបទស្សនាសាមញ្ញ');
              }}
              className="p-4 flex items-center justify-between gap-3 hover:bg-slate-50/70 cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <Wand2 className="w-4.5 h-4.5" />
                </div>
                <div>
                  <span className="font-display font-bold text-sm text-slate-900 block">
                    {language === 'km' ? 'របៀបទស្សនាសាមញ្ញ' : 'Clean & Minimalist View'}
                  </span>
                  <span className="text-[11px] text-slate-500">
                    {language === 'km' ? 'កាត់បន្ថយបដារំខាន ផ្តោតលើវីដេអូ' : 'Removes clutter for focus'}
                  </span>
                </div>
              </div>

              {/* iOS Switch */}
              <div className={`w-11 h-6 rounded-full transition-colors relative shrink-0 p-0.5 ${cleanMode ? 'bg-blue-600' : 'bg-slate-200'}`}>
                <div className={`w-5 h-5 rounded-full bg-white transition-transform shadow-xs ${cleanMode ? 'translate-x-5' : 'translate-x-0'}`} />
              </div>
            </div>

            {/* Toggle 2: Reduce Motion */}
            <div
              onClick={() => {
                toggleReduceMotion();
                showToast(!reduceMotion ? 'បានបើក៖ កាត់បន្ថយចលនា' : 'បានបិទ៖ កាត់បន្ថយចលនា');
              }}
              className="p-4 flex items-center justify-between gap-3 hover:bg-slate-50/70 cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <Eye className="w-4.5 h-4.5" />
                </div>
                <div>
                  <span className="font-display font-bold text-sm text-slate-900 block">
                    {language === 'km' ? 'កាត់បន្ថយចលនា' : 'Reduce Motion'}
                  </span>
                  <span className="text-[11px] text-slate-500">
                    {language === 'km' ? 'បិទចលនាញ័រ ឬរំកិលរហ័ស' : 'Disables heavy animations'}
                  </span>
                </div>
              </div>

              {/* iOS Switch */}
              <div className={`w-11 h-6 rounded-full transition-colors relative shrink-0 p-0.5 ${reduceMotion ? 'bg-blue-600' : 'bg-slate-200'}`}>
                <div className={`w-5 h-5 rounded-full bg-white transition-transform shadow-xs ${reduceMotion ? 'translate-x-5' : 'translate-x-0'}`} />
              </div>
            </div>

            {/* Toggle 3: Hide Promos */}
            <div
              onClick={() => {
                toggleHidePromos();
                showToast(!hidePromos ? 'បានលាក់ផ្ទាំងផ្សាយ' : 'បានបង្ហាញផ្ទាំងផ្សាយ');
              }}
              className="p-4 flex items-center justify-between gap-3 hover:bg-slate-50/70 cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                  <RotateCw className="w-4.5 h-4.5" />
                </div>
                <div>
                  <span className="font-display font-bold text-sm text-slate-900 block">
                    {language === 'km' ? 'លាក់កង់សំណាង & បដាផ្សាយ' : 'Hide Promo Banners'}
                  </span>
                  <span className="text-[11px] text-slate-500">
                    {language === 'km' ? 'លាក់ផ្ទាំងកង់បង្វិលយករង្វាន់' : 'Hide rewards wheel on feed'}
                  </span>
                </div>
              </div>

              {/* iOS Switch */}
              <div className={`w-11 h-6 rounded-full transition-colors relative shrink-0 p-0.5 ${hidePromos ? 'bg-blue-600' : 'bg-slate-200'}`}>
                <div className={`w-5 h-5 rounded-full bg-white transition-transform shadow-xs ${hidePromos ? 'translate-x-5' : 'translate-x-0'}`} />
              </div>
            </div>
          </div>
        </div>

        {/* ── 5. Apple Inset Group: Playback & Language Preferences ── */}
        <div>
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-2 block">
            {language === 'km' ? 'ការចាក់វីដេអូ & ភាសា' : 'Playback & Regional'}
          </span>
          <div className="bg-white/90 backdrop-blur-xl border border-slate-200/80 rounded-3xl overflow-hidden divide-y divide-slate-100 shadow-xs">
            {/* Stream Quality */}
            <div
              onClick={() => {
                const order = ['Auto', '720p HD', '1080p Full HD', '4K Ultra HD'];
                const next = order[(order.indexOf(streamQuality) + 1) % order.length];
                setStreamQuality(next);
                try { localStorage.setItem('nami_playback_quality', next); } catch {}
                showToast(`កម្រិតវីដេអូ៖ ${next}`);
              }}
              className="p-4 flex items-center justify-between gap-3 hover:bg-slate-50/70 cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                  <Tv className="w-4.5 h-4.5" />
                </div>
                <div>
                  <span className="font-display font-bold text-sm text-slate-900 block">
                    {language === 'km' ? 'កម្រិតរូបភាពវីដេអូ' : 'Default Stream Quality'}
                  </span>
                  <span className="text-[11px] text-slate-500">
                    {language === 'km' ? 'កម្រិតច្បាស់ពេលចាប់ផ្តើមចាក់' : 'Initial playback resolution'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-xs font-bold text-blue-600">
                <span>{streamQuality}</span>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </div>
            </div>

            {/* Display Language */}
            <div className="p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                  <Languages className="w-4.5 h-4.5" />
                </div>
                <div>
                  <span className="font-display font-bold text-sm text-slate-900 block">
                    {language === 'km' ? 'ភាសាក្នុងកម្មវិធី' : 'App Language'}
                  </span>
                  <span className="text-[11px] text-slate-500">
                    {language === 'km' ? 'ជ្រើសរើសភាសាខ្មែរ ឬ អង់គ្លេស' : 'Choose Khmer or English'}
                  </span>
                </div>
              </div>

              <div className="inline-flex rounded-xl bg-slate-100 p-0.5 border border-slate-200">
                <button
                  type="button"
                  onClick={() => { setLanguage('km'); showToast('បានប្តូរទៅជាភាសាខ្មែរ'); }}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                    language === 'km' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  ខ្មែរ
                </button>
                <button
                  type="button"
                  onClick={() => { setLanguage('en'); showToast('Language switched to English'); }}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                    language === 'en' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  English
                </button>
              </div>
            </div>

            {/* Clear Cache */}
            <div
              onClick={() => {
                clearLocalCatalogCache();
                showToast(language === 'km' ? 'បានសម្អាតទិន្នន័យ Cache ជោគជ័យ' : 'Catalog cache cleared');
              }}
              className="p-4 flex items-center justify-between gap-3 hover:bg-slate-50/70 cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                  <Trash2 className="w-4.5 h-4.5" />
                </div>
                <div>
                  <span className="font-display font-bold text-sm text-slate-900 block">
                    {language === 'km' ? 'សម្អាតទិន្នន័យបណ្តោះអាសន្ន' : 'Clear Temporary Cache'}
                  </span>
                  <span className="text-[11px] text-slate-500">
                    {language === 'km' ? 'ជួយឱ្យទំព័រដំណើរការលឿនជាងមុន' : 'Frees up local storage'}
                  </span>
                </div>
              </div>

              <ChevronRight className="w-4 h-4 text-slate-400" />
            </div>
          </div>
        </div>

        {/* ── 6. Admin Portal Link (Only for authorized roles) ── */}
        {(isAdmin || isOwner || isStaff) && (
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-2 block">
              {language === 'km' ? 'ផ្នែកគ្រប់គ្រង' : 'Management Portal'}
            </span>
            <div className="bg-white/90 backdrop-blur-xl border border-slate-200/80 rounded-3xl overflow-hidden shadow-xs">
              <Link
                to="/admin"
                className="p-4 flex items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <span className="font-display font-bold text-sm text-slate-900 block">
                      {isOwner ? 'ផ្ទាំងម្ចាស់ Platform (Owner Dashboard)' : 'ផ្ទាំងអ្នកគ្រប់គ្រង (Admin Dashboard)'}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {language === 'km' ? 'គ្រប់គ្រងរឿង ភាគ និងសមាជិក' : 'Manage series, episodes, and users'}
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </Link>
            </div>
          </div>
        )}

        {/* ── 7. Support & Sign Out ── */}
        <div>
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-2 block">
            {language === 'km' ? 'ជំនួយ & គណនី' : 'Support & Account'}
          </span>
          <div className="bg-white/90 backdrop-blur-xl border border-slate-200/80 rounded-3xl overflow-hidden divide-y divide-slate-100 shadow-xs">
            <a
              href="https://t.me/watchflixanimeadmin"
              target="_blank"
              rel="noopener noreferrer"
              className="p-4 flex items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <Headset className="w-4.5 h-4.5" />
                </div>
                <div>
                  <span className="font-display font-bold text-sm text-slate-900 block">
                    {language === 'km' ? 'ទាក់ទងជំនួយ Telegram' : 'Customer Support'}
                  </span>
                  <span className="text-[11px] text-slate-500 font-mono">
                    @watchflixanimeadmin
                  </span>
                </div>
              </div>
              <ExternalLink className="w-4 h-4 text-slate-400" />
            </a>

            {isAuthenticated && (
              <button
                type="button"
                onClick={() => {
                  logout();
                  showToast(language === 'km' ? 'បានចាកចេញពីគណនី' : 'Signed out');
                  navigate('/');
                }}
                className="w-full p-4 flex items-center justify-between gap-3 hover:bg-rose-50/50 text-left transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                    <LogOut className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <span className="font-display font-bold text-sm text-rose-600 block">
                      {language === 'km' ? 'ចាកចេញពីគណនី' : 'Log out'}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {language === 'km' ? 'ចាកចេញពីឧបករណ៍នេះ' : 'Sign out of this session'}
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-rose-300" />
              </button>
            )}
          </div>
        </div>

        {/* Footer info */}
        <p className="text-center text-[11px] font-medium text-slate-400 pt-2 pb-4">
          MerDonghua v2.0 • Ultra HD Stream
        </p>
      </div>

      {/* Floating Toast */}
      {toastMessage && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 py-2.5 px-4 rounded-2xl bg-slate-900/90 text-white font-bold text-xs shadow-xl animate-fade-in flex items-center gap-2 backdrop-blur-md">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}
    </main>
  );
}

export default ProfilePage;
