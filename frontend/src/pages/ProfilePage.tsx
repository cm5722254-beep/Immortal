import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ChevronRight, Languages, Headset,
  Sparkles, Tv, Zap, ExternalLink,
  Send, Smartphone, Trash2, CheckCircle2, Crown, ShieldAlert,
  RotateCw, SlidersHorizontal, Eye, Wand2, Clock3, Download, Bookmark,
  Gift, Settings, MessageSquare, Plus, Bell, QrCode
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { usePlatform } from '../utils/platform';
import { triggerHaptic } from '../utils/telegram';
import { useUiPreferencesStore } from '../store/uiPreferencesStore';
import { PlatformSwitcherModal } from '../components/common/PlatformSwitcherModal';
import { clearLocalCatalogCache } from '../services/catalogService';
import { getVipContactUrl } from '../utils/vip';

export function ProfilePage() {
  const { user } = useAuthStore();
  const { isTelegram, isMobileApp } = usePlatform();
  const {
    cleanMode,
    reduceMotion,
    hidePromos,
    toggleCleanMode,
    toggleReduceMotion,
    toggleHidePromos,
  } = useUiPreferencesStore();

  const [userName, setUserName] = useState(user?.username || 'Free Cultivator');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [streamQuality, setStreamQuality] = useState(() => {
    try { return localStorage.getItem('nami_playback_quality') || 'Auto'; } catch { return 'Auto'; }
  });
  const [showPlatformModal, setShowPlatformModal] = useState(false);
  const [subtitlesEnabled, setSubtitlesEnabled] = useState(() => {
    try { return localStorage.getItem('nami_subtitles_enabled') !== 'false'; } catch { return true; }
  });
  const [vipClock, setVipClock] = useState(() => Date.now());

  useEffect(() => {
    if (user?.username) {
      setUserName(user.username);
    }
  }, [user]);

  useEffect(() => {
    if (!user?.vip_expires_at) return;
    const timer = window.setInterval(() => setVipClock(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, [user?.vip_expires_at]);

  const vipTimeLeft = (() => {
    if (!user?.vip_expires_at) return user?.is_vip_active ? 'No expiry date' : 'No active VIP plan';
    const remaining = new Date(user.vip_expires_at).getTime() - vipClock;
    if (!Number.isFinite(remaining) || remaining <= 0) return 'Expired';
    const days = Math.floor(remaining / 86_400_000);
    const hours = Math.floor((remaining % 86_400_000) / 3_600_000);
    const minutes = Math.floor((remaining % 3_600_000) / 60_000);
    return `${days}d ${hours}h ${minutes}m remaining`;
  })();
  const vipExpiryDate = user?.vip_expires_at ? new Date(user.vip_expires_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : null;

  const showToast = (msg: string) => {
    triggerHaptic('light');
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2500);
  };

  if (isTelegram || isMobileApp) {
    const menuRows = [
      { label: 'My List', icon: Bookmark, to: '/favorites' },
      { label: 'History', icon: Clock3, to: '/history' },
      { label: 'Download TV App', icon: Download, to: '/downloads', hint: 'Enjoy now' },
      { label: 'Language · Khmer', icon: Languages, action: () => showToast('Khmer is the current interface language') },
      { label: `Subtitles · ${subtitlesEnabled ? 'On' : 'Off'}`, icon: Languages, action: () => {
        const next = !subtitlesEnabled;
        setSubtitlesEnabled(next);
        localStorage.setItem('nami_subtitles_enabled', String(next));
        showToast(`Subtitles ${next ? 'enabled' : 'disabled'}`);
      } },
      { label: 'Settings', icon: Settings, to: '/settings' },
      { label: 'App appearance', icon: SlidersHorizontal, action: () => setShowPlatformModal(true) },
      { label: 'VIP Membership', icon: Gift, to: '/vip' },
      { label: 'Friend Referral Rewards', icon: Gift, to: '/referrals' },
      { label: 'Help and Feedback', icon: MessageSquare, to: '/help' },
    ];

    return (
      <main className="mini-profile min-h-screen bg-[#111216] text-white pb-8">
        <div className="mini-profile-top">
          <div className="mini-profile-tools">
            <Link aria-label="Scan QR code" to="/scan"><QrCode /></Link>
            <Link aria-label="Notifications" to="/notifications"><Bell /></Link>
            <button aria-label="Display settings" onClick={() => setShowPlatformModal(true)}><SlidersHorizontal /></button>
          </div>
          <div className="mini-profile-identity">
            <Link to="/account" className="mini-profile-avatar" aria-label="Personal data">{user?.avatar_url ? <img src={user.avatar_url} alt="" /> : userName.slice(0, 1).toUpperCase()}</Link>
            <div><h1>{userName}</h1><p>{user?.telegram_username ? `@${user.telegram_username}` : user?.telegram_first_name || user?.email || 'Welcome to Huang Anime'}{user?.telegram_id ? ` · Telegram ID: ${user.telegram_id}` : ''}</p></div>
            <ChevronRight className="w-5 h-5 ml-auto text-white/50" />
          </div>
          <div className={`mini-vip-status ${user?.is_vip_active ? 'active' : ''}`}>
            <div><strong>{user?.is_vip_active ? `VIP · ${user.vip_plan || 'Active'}` : 'Standard'}</strong><span>{vipExpiryDate ? `Expires ${vipExpiryDate} · ${vipTimeLeft}` : vipTimeLeft}</span></div>
            {user?.is_vip_active ? <Link to="/vip">VIP benefits ›</Link> : <a href={getVipContactUrl(user?.username)} target="_blank" rel="noopener noreferrer">Upgrade VIP ›</a>}
          </div>
        </div>
        {user?.trial_expires_at && new Date(user.trial_expires_at).getTime() > Date.now() && (
          <p className="mx-4 mt-3 rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">Free trial active for one series · expires {new Date(user.trial_expires_at).toLocaleString()}</p>
        )}
        <div className="mini-profile-wallet">
          {[
            { label: 'VIP Plans', icon: Gift },
            { label: 'My List', icon: Bookmark },
            { label: 'Downloads', icon: Download },
          ].map(({ label, icon: Icon }, index) => index === 0
            ? <a key={label} href={getVipContactUrl(user?.username)} target="_blank" rel="noopener noreferrer"><Icon /><span>Message to buy</span></a>
            : <Link key={label} to={index === 1 ? '/favorites' : '/downloads'}><Icon /><span>{label}</span></Link>)}
        </div>
        <div className="mini-profile-menu">
          {menuRows.map(({ label, icon: Icon, to, hint, action }) => {
            const row = <><Icon className="mini-menu-icon" /><span>{label}</span>{hint && <small>{hint}</small>}{label === 'My List' && <Plus className="mini-menu-plus" />}</>;
            return to === '/vip'
              ? <a key={label} href={getVipContactUrl(user?.username)} target="_blank" rel="noopener noreferrer" className="mini-menu-row">{row}</a>
              : to ? <Link key={label} to={to} className="mini-menu-row">{row}</Link> : <button key={label} className="mini-menu-row" onClick={action}>{row}</button>;
          })}
        </div>
        <p className="mini-profile-version">Huang Anime · Mobile</p>
        <PlatformSwitcherModal isOpen={showPlatformModal} onClose={() => setShowPlatformModal(false)} />
        {toastMessage && <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] bg-[#24252b] border border-white/10 text-white text-xs px-4 py-3 rounded-xl shadow-2xl whitespace-nowrap">{toastMessage}</div>}
      </main>
    );
  }

  return (
    <main className={`website-profile min-h-screen pb-28 md:pb-14 bg-[#0A0E17] text-gray-100 px-4 py-6 max-w-lg mx-auto ${!isTelegram && !isMobileApp ? 'is-web-profile' : ''}`}>
      {/* ── Top Header ── */}
      <div className="mb-6 pt-1 flex items-center justify-between">
        <div>
          <h1 className="font-display font-black text-2xl sm:text-3xl text-white tracking-tight">
            {isTelegram ? 'គណនី Telegram' : isMobileApp ? 'ការកំណត់កម្មវិធី' : 'ព័ត៌មានគណនី'}
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">
            {isTelegram ? 'កម្មវិធីទស្សនារឿង Telegram' : isMobileApp ? 'កម្មវិធីទូរស័ព្ទ App v1.5' : 'ការកំណត់ និងព័ត៌មានទស្សនា'}
          </p>
        </div>

        <button
          onClick={() => {
            triggerHaptic('light');
            setShowPlatformModal(true);
          }}
          className={`text-[10px] font-bold px-2.5 py-1 rounded-full border transition-all active:scale-95 cursor-pointer flex items-center gap-1 shadow-sm ${
            isTelegram ? 'bg-[#24A1DE]/20 text-[#24A1DE] border-[#24A1DE]/40' :
            isMobileApp ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' :
            'bg-white/10 hover:bg-white/15 text-gray-200 border-white/20'
          }`}
          title="ចុចដើម្បីប្តូរទម្រង់ UI"
        >
          <span>{isTelegram ? '✈️ Telegram' : isMobileApp ? '📱 APK App' : '🌐 Web Cinema'}</span>
          <span className="text-[8px] opacity-70">▼</span>
        </button>
      </div>

      <div className="space-y-6">
        {/* ── 1. Profile / Account Card ── */}
        <div className={`rounded-2xl border p-4.5 flex items-center justify-between shadow-xl transition-all ${
          isTelegram
            ? 'bg-gradient-to-br from-[#0E1B2B] via-[#0B141F] to-[#0B141F] border-[#24A1DE]/40'
            : isMobileApp
            ? 'bg-gradient-to-br from-[#1C1405] via-[#0D0B05] to-[#050508] border-amber-500/40'
            : 'bg-[#111726] border-[#1E283C]'
        }`}>
          <div className="flex items-center gap-3.5">
            {/* Avatar */}
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-500 flex items-center justify-center text-black font-black text-xl shadow-md overflow-hidden shrink-0 border-2 border-white/10">
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                userName.charAt(0).toUpperCase()
              )}
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-display font-black text-base text-white truncate max-w-[160px]">
                  {userName}
                </h2>
                {user?.role === 'OWNER' || user?.email === 'cm5722254@gmail.com' ? (
                  <span className="bg-gradient-to-r from-amber-500/25 via-yellow-500/25 to-red-500/25 text-amber-300 border border-amber-400/50 text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm flex items-center gap-1">
                    <Crown className="w-3 h-3 fill-amber-400" /> OWNER (ម្ចាស់)
                  </span>
                ) : user?.role === 'ADMIN' ? (
                  <span className="bg-red-500/20 text-red-300 border border-red-500/40 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                    <ShieldAlert className="w-3 h-3" /> អ្នកគ្រប់គ្រង (Admin)
                  </span>
                ) : user?.role === 'STAFF' ? (
                  <span className="bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                    <ShieldAlert className="w-3 h-3" /> បុគ្គលិក (Staff)
                  </span>
                ) : user?.is_vip_active ? (
                  <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-black px-2 py-0.5 rounded-full">
                    <Crown className="w-3 h-3 fill-amber-400" /> VIP ({user.vip_plan ? user.vip_plan.toUpperCase() : 'សកម្ម'})
                  </span>
                ) : (
                  <span className="bg-white/10 text-gray-300 border border-white/15 text-[10px] py-0.5 px-2 rounded-full flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-yellow-400" /> សមាជិកឥតគិតថ្លៃ
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-1 flex items-center gap-1 font-mono">
                {user?.phone_number ? (
                  <span className="text-amber-300">{user.phone_number}</span>
                ) : user?.telegram_username ? (
                  <span className="text-[#24A1DE]">@{user.telegram_username}</span>
                ) : (
                  <span className="text-emerald-400 flex items-center gap-1"><Zap className="w-3 h-3" /> កម្រិត 4K Ultra HD សកម្ម</span>
                )}
              </p>
            </div>
          </div>
        </div>

        <section className="rounded-2xl border border-amber-400/25 bg-gradient-to-r from-[#201a10] to-[#17191e] px-5 py-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wider text-amber-300">VIP membership</p>
            <p className="mt-1 text-sm font-semibold text-white">{vipExpiryDate ? `Expires ${vipExpiryDate}` : user?.is_vip_active ? 'Lifetime membership' : 'Standard plan'}</p>
            <p className="mt-1 text-xs text-gray-400">{vipTimeLeft}</p>
          </div>
          {user?.is_vip_active ? <Link to="/vip" className="rounded-lg bg-[#f3c17e] px-4 py-2 text-sm font-bold text-[#171717]">VIP benefits</Link> : <a href={getVipContactUrl(user?.username)} target="_blank" rel="noopener noreferrer" className="rounded-lg bg-[#f3c17e] px-4 py-2 text-sm font-bold text-[#171717]">Message to buy</a>}
        </section>
        {user?.trial_expires_at && new Date(user.trial_expires_at).getTime() > Date.now() && (
          <p className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">Free trial active for one series · expires {new Date(user.trial_expires_at).toLocaleString()}</p>
        )}

        {/* ── 2. ✨ NEW: UI & DISPLAY SETTINGS (ការកំណត់ការបង្ហាញកុំឱ្យរញេរញៃ) ── */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
              <SlidersHorizontal className="w-3.5 h-3.5 text-rose-400" /> ការកំណត់ការបង្ហាញ (Display & UI)
            </span>
            {cleanMode && (
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                ✓ របៀបស្រួលភ្នែក
              </span>
            )}
          </div>

          <div className="rounded-2xl bg-[#111726] border border-[#1E283C] overflow-hidden divide-y divide-[#1E283C]/70 shadow-lg">
            
            {/* Toggle 1: Clean & Minimalist Mode (Master Clutter Remover) */}
            <div
              onClick={() => {
                toggleCleanMode();
                showToast(!cleanMode ? 'បានបើក៖ របៀបទស្សនាសាមញ្ញ (Clean Mode)' : 'បានបិទ៖ របៀបទស្សនាសាមញ្ញ');
              }}
              className="p-4 flex items-center justify-between gap-3 hover:bg-white/5 cursor-pointer transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors shadow-md ${
                  cleanMode
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-emerald-500/20'
                    : 'bg-white/10 text-gray-400 border border-white/10'
                }`}>
                  <Wand2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-display font-bold text-sm text-white">របៀបសាមញ្ញ (Clean UI Mode)</span>
                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                      ណែនាំ
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-400 leading-relaxed mt-0.5">
                    លុបចលនាវិល 3D ស្មុគស្មាញ និងសម្រួលស្លាកលើ Poster ឱ្យលែងរញេរញៃ
                  </p>
                </div>
              </div>

              {/* iOS Style Switch */}
              <div className={`w-11 h-6 rounded-full transition-colors relative shrink-0 p-0.5 cursor-pointer ${
                cleanMode ? 'bg-emerald-500' : 'bg-gray-700'
              }`}>
                <div className={`w-5 h-5 rounded-full bg-white transition-transform shadow-md ${
                  cleanMode ? 'translate-x-5' : 'translate-x-0'
                }`} />
              </div>
            </div>

            {/* Toggle 2: Reduce Motion & Glow */}
            <div
              onClick={() => {
                toggleReduceMotion();
                showToast(!reduceMotion ? 'បានបើក៖ កាត់បន្ថយចលនា & ពន្លឺ' : 'បានបិទ៖ កាត់បន្ថយចលនា & ពន្លឺ');
              }}
              className="p-4 flex items-center justify-between gap-3 hover:bg-white/5 cursor-pointer transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors shadow-md ${
                  reduceMotion
                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                    : 'bg-white/10 text-gray-400 border border-white/10'
                }`}>
                  <Eye className="w-5 h-5" />
                </div>
                <div>
                  <span className="font-display font-bold text-sm text-white">កាត់បន្ថយចលនា & ពន្លឺ (Reduce Motion)</span>
                  <p className="text-[11px] text-gray-400 leading-relaxed mt-0.5">
                    បិទពន្លឺ Neon Pulse និងចលនាខ្លាំងៗកុំឱ្យឈឺភ្នែក
                  </p>
                </div>
              </div>

              {/* iOS Style Switch */}
              <div className={`w-11 h-6 rounded-full transition-colors relative shrink-0 p-0.5 cursor-pointer ${
                reduceMotion ? 'bg-cyan-500' : 'bg-gray-700'
              }`}>
                <div className={`w-5 h-5 rounded-full bg-white transition-transform shadow-md ${
                  reduceMotion ? 'translate-x-5' : 'translate-x-0'
                }`} />
              </div>
            </div>

            {/* Toggle 3: Hide Promo & Lucky Wheel */}
            <div
              onClick={() => {
                toggleHidePromos();
                showToast(!hidePromos ? 'បានលាក់៖ ផ្ទាំងផ្សាយ & កង់បង្វិល' : 'បានបង្ហាញ៖ ផ្ទាំងផ្សាយ & កង់បង្វិល');
              }}
              className="p-4 flex items-center justify-between gap-3 hover:bg-white/5 cursor-pointer transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors shadow-md ${
                  hidePromos
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                    : 'bg-white/10 text-gray-400 border border-white/10'
                }`}>
                  <RotateCw className="w-5 h-5" />
                </div>
                <div>
                  <span className="font-display font-bold text-sm text-white">លាក់ផ្ទាំងផ្សាយ & កង់បង្វិល</span>
                  <p className="text-[11px] text-gray-400 leading-relaxed mt-0.5">
                    លាក់ផ្ទាំងផ្សាយធំៗដើម្បីផ្ដោតលើការទស្សនារឿងសុទ្ធសាធ
                  </p>
                </div>
              </div>

              {/* iOS Style Switch */}
              <div className={`w-11 h-6 rounded-full transition-colors relative shrink-0 p-0.5 cursor-pointer ${
                hidePromos ? 'bg-amber-500' : 'bg-gray-700'
              }`}>
                <div className={`w-5 h-5 rounded-full bg-white transition-transform shadow-md ${
                  hidePromos ? 'translate-x-5' : 'translate-x-0'
                }`} />
              </div>
            </div>

          </div>
        </div>

        {/* ── 3. Playback Preferences (ការកំណត់ការចាក់វីដេអូ) ── */}
        <div className="space-y-2">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider px-1 flex items-center gap-1.5">
            <Tv className="w-3.5 h-3.5 text-amber-400" /> ការកំណត់ការចាក់វីដេអូ (Playback)
          </span>

          <div className="rounded-2xl bg-[#111726] border border-[#1E283C] overflow-hidden divide-y divide-[#1E283C]/70 shadow-lg">
            {/* Quality Selector */}
            <div
              onClick={() => {
                const order = ['Auto', '720p HD', '1080p Full HD', '4K Ultra HD'];
                const next = order[(order.indexOf(streamQuality) + 1) % order.length];
                setStreamQuality(next);
                localStorage.setItem('nami_playback_quality', next);
                showToast(`កម្រិតរូបភាព៖ ${next}`);
              }}
              className="flex items-center justify-between p-4 hover:bg-white/5 cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500 flex items-center justify-center text-black shadow-md shadow-amber-500/20">
                  <Tv className="w-4.5 h-4.5" />
                </div>
                <span className="font-display font-bold text-sm text-white">កម្រិតរូបភាពលំនាំដើម</span>
              </div>
              <div className="flex items-center gap-2 text-gray-400 text-xs font-bold">
                <span className="text-amber-400">{streamQuality}</span>
                <ChevronRight className="w-4 h-4 text-gray-500" />
              </div>
            </div>

            {/* Language Selector */}
            <div
              onClick={() => showToast('ភាសា៖ ភាសាខ្មែរ 100%')}
              className="flex items-center justify-between p-4 hover:bg-white/5 cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
                  <Languages className="w-4.5 h-4.5" />
                </div>
                <span className="font-display font-bold text-sm text-white">ភាសាបង្ហាញ (Language)</span>
              </div>
              <div className="flex items-center gap-2 text-gray-400 text-xs font-bold">
                <span className="text-white font-semibold">ភាសាខ្មែរ (Khmer 100%)</span>
                <ChevronRight className="w-4 h-4 text-gray-500" />
              </div>
            </div>
          </div>
        </div>

        {/* ── 4. Optional Lucky Wheel Banner (Hidden if hidePromos is ON) ── */}
        {!hidePromos && (
          <Link
            to="/vip#lucky-wheel"
            className="rounded-2xl p-4 bg-gradient-to-r from-rose-500/15 via-pink-500/10 to-amber-500/10 border border-rose-500/30 shadow-md flex items-center justify-between gap-3 hover:border-rose-400/60 hover:scale-[1.01] active:scale-[0.99] transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-500 via-pink-500 to-amber-400 flex items-center justify-center text-white shadow-md shadow-rose-500/30 shrink-0 group-hover:rotate-45 transition-transform duration-500">
                <RotateCw className="w-4.5 h-4.5" />
              </div>
              <div>
                <div className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-amber-300">
                  <Sparkles className="w-3 h-3 text-amber-300" /> ឈ្នះរង្វាន់ VIP រហូតដល់ 3 ខែ
                </div>
                <h3 className="font-display font-black text-xs sm:text-sm text-white">កង់បង្វិលសំណាង VIP (Lucky Wheel)</h3>
                <p className="text-[10px] sm:text-[11px] text-gray-400">
                  {user?.role === 'OWNER' || user?.role === 'ADMIN' || user?.username === 'cheat_admin'
                    ? '👑 គណនី Admin (ចាប់រង្វាន់បានរហូត)'
                    : 'ទិញ VIP ម្ដង ចាប់រង្វាន់បានម្ដង!'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 py-1 px-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 text-white font-black text-xs shadow-sm shrink-0 group-hover:from-rose-400 group-hover:to-pink-400 transition-all">
              <span>ចាប់រង្វាន់</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </Link>
        )}

        {/* ── 5. Platform Specific Actions (Telegram / Mobile App) ── */}
        {isTelegram && (
          <div className="rounded-2xl bg-[#0E1B2B]/90 border border-[#24A1DE]/30 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Send className="w-4 h-4 text-[#24A1DE]" /> ប៉ុស្តិ៍ Telegram ផ្លូវការ
              </span>
              <a
                href="https://t.me/watchflixanimeadmin"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-[#24A1DE] font-bold hover:underline"
              >
                ចូលរួម Channel →
              </a>
            </div>
            <p className="text-[11px] text-gray-400">
              ទទួលដំណឹងរឿងភាគចិន និង Anime ថ្មីៗជារៀងរាល់ថ្ងៃតាម Telegram
            </p>
          </div>
        )}

        {isMobileApp && (
          <div className="rounded-2xl bg-amber-500/10 border border-amber-500/30 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Smartphone className="w-4 h-4 text-amber-400" /> NAMI ANIME APK v1.5
              </span>
              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold px-2 py-0.5 rounded-full">
                កំណែចុងក្រោយ
              </span>
            </div>
            <div className="pt-2 flex items-center justify-between text-xs text-gray-400 border-t border-amber-500/20">
              <span>ទិន្នន័យផ្ទុកបណ្ដោះអាសន្ន (Cache)៖</span>
              <button
                onClick={() => { clearLocalCatalogCache(); showToast('បានសម្អាត Cache រួចរាល់!'); }}
                className="text-amber-400 font-bold hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" /> សម្អាត Cache
              </button>
            </div>
          </div>
        )}

        {/* ── 6. Support & Security (ជំនួយ និងសុវត្ថិភាព) ── */}
        <div className="space-y-2">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider px-1 flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5 text-blue-400" /> ជំនួយ និងសុវត្ថិភាព (Support & Security)
          </span>

          <div className="rounded-2xl bg-[#111726] border border-[#1E283C] overflow-hidden divide-y divide-[#1E283C]/70 shadow-lg">
            {/* Customer Support */}
            <a
              href="https://t.me/watchflixanimeadmin"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-4 hover:bg-white/5 cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
                  <Headset className="w-4.5 h-4.5" />
                </div>
                <span className="font-display font-bold text-sm text-white">ផ្នែកបម្រើអតិថិជន និងជំនួយ</span>
              </div>
              <div className="flex items-center gap-2 text-gray-400 text-xs font-bold">
                <span className="text-emerald-400">@watchflixanimeadmin</span>
                <ExternalLink className="w-4 h-4 text-gray-500" />
              </div>
            </a>
          </div>
        </div>

      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 py-2.5 px-4 rounded-xl bg-[#131a29] border border-amber-500/50 text-amber-300 font-bold text-xs shadow-2xl animate-fade-in flex items-center gap-2 backdrop-blur-md">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Platform UI Switcher Modal */}
      <PlatformSwitcherModal
        isOpen={showPlatformModal}
        onClose={() => setShowPlatformModal(false)}
      />
    </main>
  );
}
