import { useState, useEffect } from 'react';
import {
  ChevronRight, Languages, Headset,
  Sparkles, Tv, Zap, ExternalLink,
  Send, Smartphone, Trash2, CheckCircle2, Crown, ShieldAlert
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { usePlatform } from '../utils/platform';
import { triggerHaptic } from '../utils/telegram';
import { SecurityPolicyModal } from '../components/common/SecurityPolicyModal';

export function ProfilePage() {
  const { user } = useAuthStore();
  const { isTelegram, isMobileApp } = usePlatform();

  const [userName, setUserName] = useState(user?.username || 'Free Cultivator');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [streamQuality, setStreamQuality] = useState('4K Ultra HD');
  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false);

  useEffect(() => {
    if (user?.username) {
      setUserName(user.username);
    }
  }, [user]);

  const showToast = (msg: string) => {
    triggerHaptic('light');
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2500);
  };

  return (
    <main className="min-h-screen pb-24 md:pb-12 bg-[#0A0E17] text-gray-100 px-4 py-6 max-w-lg mx-auto">
      {/* ── Top Header ── */}
      <div className="mb-6 pt-1 flex items-center justify-between">
        <div>
          <h1 className="font-display font-black text-2xl sm:text-3xl text-white">
            {isTelegram ? 'គណនី Telegram' : isMobileApp ? 'ការកំណត់កម្មវិធី' : 'ព័ត៌មានគណនី'}
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">
            {isTelegram ? 'កម្មវិធីទស្សនារឿង Telegram' : isMobileApp ? 'កម្មវិធីទូរស័ព្ទ App v1.5' : 'គេហទំព័រទស្សនារឿង'}
          </p>
        </div>

        <span className={`badge text-[10px] font-bold ${
          isTelegram ? 'bg-[#24A1DE]/20 text-[#24A1DE] border border-[#24A1DE]/40' :
          isMobileApp ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' :
          'bg-white/10 text-gray-300 border border-white/20'
        }`}>
          {isTelegram ? 'របៀប Telegram' : isMobileApp ? 'កម្មវិធី Android' : 'កម្មវិធីរុករក Web'}
        </span>
      </div>

      <div className="space-y-4">
        {/* ── 1. Profile Card ── */}
        <div className={`rounded-2xl border p-4.5 flex items-center justify-between shadow-xl ${
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
                  <span className="badge bg-gradient-to-r from-amber-500/30 via-yellow-500/30 to-red-500/30 text-amber-300 border border-amber-400/50 text-[10px] font-black shadow-md flex items-center gap-1">
                    <Crown className="w-3 h-3 fill-amber-400" /> OWNER (ម្ចាស់)
                  </span>
                ) : user?.role === 'ADMIN' ? (
                  <span className="badge bg-red-500/20 text-red-300 border border-red-500/40 text-[10px] font-bold flex items-center gap-1">
                    <ShieldAlert className="w-3 h-3" /> អ្នកគ្រប់គ្រង (Admin)
                  </span>
                ) : user?.role === 'STAFF' ? (
                  <span className="badge bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[10px] font-bold flex items-center gap-1">
                    <ShieldAlert className="w-3 h-3" /> បុគ្គលិក (Staff)
                  </span>
                ) : user?.is_vip_active || user?.is_vip ? (
                  <span className="badge bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-black">
                    <Crown className="w-3 h-3 fill-amber-400" /> VIP ({user.vip_plan ? user.vip_plan.toUpperCase() : 'សកម្ម'})
                  </span>
                ) : (
                  <span className="badge-rating text-[10px] py-0.5 px-2">
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
                  <span className="text-emerald-400"><Zap className="w-3 h-3 inline" /> កម្រិត 4K Ultra HD សកម្ម</span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* ── 2. Platform Specific Quick Actions ── */}
        {isTelegram && (
          <div className="rounded-2xl bg-[#0E1B2B]/90 border border-[#24A1DE]/30 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Send className="w-4 h-4 text-[#24A1DE]" /> ប៉ុស្តិ៍ Telegram ផ្លូវការ
              </span>
              <a
                href="https://t.me/Huang404"
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
              <span className="badge bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold">
                កំណែចុងក្រោយ
              </span>
            </div>
            <div className="pt-2 flex items-center justify-between text-xs text-gray-400 border-t border-amber-500/20">
              <span>ទិន្នន័យផ្ទុកបណ្ដោះអាសន្ន (Cache)៖</span>
              <button
                onClick={() => showToast('បានសម្អាត Cache រួចរាល់!')}
                className="text-amber-400 font-bold hover:underline flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" /> សម្អាត Cache
              </button>
            </div>
          </div>
        )}

        {/* ── 3. Playback Preferences ── */}
        <div className="rounded-2xl bg-[#111726] border border-[#1E283C] overflow-hidden divide-y divide-[#1E283C]/70 shadow-lg">
          {/* Quality Selector */}
          <div
            onClick={() => {
              const next = streamQuality === '4K Ultra HD' ? '1080p Full HD' : '4K Ultra HD';
              setStreamQuality(next);
              showToast(`កម្រិតរូបភាព៖ ${next}`);
            }}
            className="flex items-center justify-between p-4 hover:bg-white/5 cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-amber-500 flex items-center justify-center text-black shadow-md shadow-amber-500/20">
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
              <div className="w-8 h-8 rounded-xl bg-blue-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
                <Languages className="w-4.5 h-4.5" />
              </div>
              <span className="font-display font-bold text-sm text-white">ភាសាបង្ហាញ (Language)</span>
            </div>
            <div className="flex items-center gap-2 text-gray-400 text-xs font-bold">
              <span className="text-white font-semibold">ភាសាខ្មែរ (Khmer 100%)</span>
              <ChevronRight className="w-4 h-4 text-gray-500" />
            </div>
          </div>

          {/* Security & Forbidden Keys Policy */}
          <div
            onClick={() => setIsSecurityModalOpen(true)}
            className="flex items-center justify-between p-4 hover:bg-white/5 cursor-pointer transition-colors border-b border-white/5"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-red-500 flex items-center justify-center text-white shadow-md shadow-red-500/20">
                <ShieldAlert className="w-4.5 h-4.5" />
              </div>
              <span className="font-display font-bold text-sm text-red-300">គោលការណ៍សុវត្ថិភាព និងប៊ូតុងហាមឃាត់</span>
            </div>
            <div className="flex items-center gap-2 text-red-400 text-xs font-bold">
              <span>សេចក្ដីព្រមាន</span>
              <ChevronRight className="w-4 h-4 text-red-400" />
            </div>
          </div>

          {/* Customer Support */}
          <a
            href="https://t.me/Huang404"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between p-4 hover:bg-white/5 cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
                <Headset className="w-4.5 h-4.5" />
              </div>
              <span className="font-display font-bold text-sm text-white">ផ្នែកបម្រើអតិថិជន និងជំនួយ</span>
            </div>
            <div className="flex items-center gap-2 text-gray-400 text-xs font-bold">
              <span className="text-emerald-400">@Huang404</span>
              <ExternalLink className="w-4 h-4 text-gray-500" />
            </div>
          </a>
        </div>
      </div>

      {/* Security Policy Modal */}
      <SecurityPolicyModal
        isOpen={isSecurityModalOpen}
        onClose={() => setIsSecurityModalOpen(false)}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 py-2.5 px-4 rounded-xl bg-dark-card border border-amber-500/40 text-amber-300 font-bold text-xs shadow-2xl animate-fade-in flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}
    </main>
  );
}
