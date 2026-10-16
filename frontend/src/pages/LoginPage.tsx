import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Sparkles,
  AlertTriangle,
  Play,
  ArrowLeft,
  ShieldCheck,
  Zap,
  Film,
  Send,
  CheckCircle2,
} from 'lucide-react';
import { GoogleSignInButton } from '../components/common/GoogleSignInButton';
import { useAuthStore } from '../store/authStore';
import { getTelegramInitData, getTelegramUser, triggerHaptic } from '../utils/telegram';
import { usePlatform } from '../utils/platform';
import { translate, useLanguageStore } from '../store/languageStore';

export function LoginPage() {
  const language = useLanguageStore((state) => state.language);
  const t = (text: string) => translate(text, language);
  const { isTelegram } = usePlatform();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as any)?.from || '/';

  const { loginWithTelegram, isLoading } = useAuthStore();
  const [error, setError] = useState('');
  const tgUser = getTelegramUser();

  const handleTelegramLogin = async () => {
    triggerHaptic('medium');
    const initData = getTelegramInitData();
    if (!initData && !tgUser) {
      setError(
        language === 'km'
          ? 'សូមបើកកម្មវិធីនេះតាមរយៈ Telegram ដើម្បីចូលប្រើប្រាស់ដោយផ្ទាល់។'
          : 'Open this mini app from Telegram to sign in directly.'
      );
      return;
    }
    setError('');
    await loginWithTelegram({
      id: tgUser?.id,
      first_name: tgUser?.first_name,
      last_name: tgUser?.last_name,
      username: tgUser?.username,
      photo_url: tgUser?.photo_url,
      init_data: initData,
    });
    if (useAuthStore.getState().isAuthenticated) {
      navigate(from, { replace: true });
    } else {
      setError(
        language === 'km'
          ? 'ការចូលតាម Telegram មិនទាន់ជោគជ័យ។ សូមព្យាយាមម្តងទៀត។'
          : 'Telegram sign-in failed. Please try again.'
      );
    }
  };

  /* ─────────────────────────────────────────────────────────────
     📱 TELEGRAM MINI APP NATIVE LOGIN VIEW
  ───────────────────────────────────────────────────────────── */
  if (isTelegram) {
    return (
      <main className="fixed inset-0 z-50 flex flex-col justify-between bg-[#080B14] text-white overflow-y-auto px-5 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))] select-none">
        {/* Dynamic Glow Ambient Orbs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full bg-gradient-to-br from-rose-500/20 via-blue-600/15 to-transparent blur-[100px]" />
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-72 h-72 rounded-full bg-amber-500/10 blur-[90px]" />
        </div>

        {/* Header Bar */}
        <div className="relative z-10 flex items-center justify-between w-full">
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              navigate(from && from !== '/login' ? from : '/', { replace: true });
            }}
            className="p-2.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 transition-all active:scale-95"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className="text-xs font-bold text-gray-400 tracking-wider uppercase">
            Telegram Mini App
          </span>
          <div className="w-9" />
        </div>

        {/* Central Hero Branding & Login Card */}
        <div className="relative z-10 my-auto py-6 flex flex-col items-center text-center max-w-sm mx-auto w-full">
          <div className="relative mb-5 group">
            <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-rose-500 via-amber-500 to-blue-500 opacity-60 blur-lg group-hover:opacity-100 transition duration-500 animate-pulse" />
            <img
              src="/logo.png"
              alt="ANIMEKH"
              className="relative w-20 h-20 rounded-3xl object-cover border border-white/20 shadow-2xl"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>

          <h1 className="font-display font-black text-2xl text-white tracking-tight mb-1.5">
            ANIMEKH <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-400 to-amber-300">4K</span>
          </h1>
          <p className="text-xs text-gray-300 max-w-xs leading-relaxed mb-6">
            {language === 'km'
              ? 'ទស្សនារឿងភាគដុងហួរ និងអានីម៉ែគុណភាពខ្ពស់ 4K Ultra HD ភ្លាមៗ'
              : 'Stream Donghua & Anime in high-definition 4K Ultra HD instantly.'}
          </p>

          {/* Error Message */}
          {error && (
            <div className="w-full mb-4 p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs font-bold flex items-center justify-center gap-2 animate-fade-in shadow-lg">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Main Action Box */}
          <div className="w-full bg-[#10172A]/90 border border-white/10 rounded-3xl p-5 shadow-[0_20px_50px_rgba(0,0,0,0.6)] backdrop-blur-2xl space-y-3.5">
            <div className="text-center pb-1">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/15 border border-rose-500/30 text-[11px] font-bold text-rose-300">
                <Sparkles className="w-3.5 h-3.5 text-rose-400" />
                {language === 'km' ? 'ចូលប្រើប្រាស់រហ័ស ១-Click' : 'Fast 1-Click Sign In'}
              </span>
            </div>

            {/* Google Continue Button (Hero) */}
            <div className="w-full flex justify-center pt-1">
              <GoogleSignInButton
                text="continue_with"
                onSuccess={() => {
                  triggerHaptic('medium');
                  navigate(from, { replace: true });
                }}
                onError={(msg) => setError(msg)}
              />
            </div>

            {/* Telegram 1-Click Native Login if opened inside TG */}
            {tgUser && (
              <button
                type="button"
                onClick={handleTelegramLogin}
                disabled={isLoading}
                className="w-full h-12 rounded-2xl bg-gradient-to-r from-[#2AABEE] to-[#229ED9] hover:from-[#259cdb] hover:to-[#1e8bc2] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2.5 shadow-lg shadow-sky-500/25 transition-all active:scale-[0.98] cursor-pointer"
              >
                <Send className="w-4 h-4 fill-white" />
                <span>
                  {language === 'km'
                    ? `ចូលជាមួយ Telegram (@${tgUser.username || tgUser.first_name})`
                    : `Continue as @${tgUser.username || tgUser.first_name}`}
                </span>
              </button>
            )}

            {/* Feature Pills */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5 text-[10.5px] text-gray-400 font-medium">
              <div className="flex items-center justify-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>{language === 'km' ? 'គ្មានលេខសម្ងាត់' : 'No Password'}</span>
              </div>
              <div className="flex items-center justify-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span>{language === 'km' ? 'សុវត្ថិភាពខ្ពស់' : '100% Secure'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 text-center">
          <p className="text-[11px] text-gray-500">
            {language === 'km'
              ? 'ការចូលរួមមានន័យថាអ្នកយល់ព្រមតាម លក្ខខណ្ឌ និង គោលការណ៍ឯកជនភាព'
              : 'By signing in, you agree to our Terms of Service & Privacy Policy.'}
          </p>
        </div>
      </main>
    );
  }

  /* ─────────────────────────────────────────────────────────────
     🌐 WEB & RESPONSIVE DESKTOP/MOBILE VIEW
  ───────────────────────────────────────────────────────────── */
  return (
    <main className="website-login min-h-screen flex items-center justify-center bg-[#070A12] relative overflow-hidden px-4 py-8 sm:py-12 select-none">
      {/* ── Dynamic Glowing Auroras ── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[650px] h-[650px] rounded-full blur-[160px] bg-gradient-to-br from-rose-500/20 via-pink-600/10 to-transparent" />
        <div className="absolute bottom-10 left-1/4 w-96 h-96 rounded-full blur-[120px] bg-rose-700/15" />
        <div className="absolute top-10 right-10 w-80 h-80 rounded-full blur-[110px] bg-amber-400/10" />
      </div>

      <div className="relative w-full max-w-md animate-scale-in z-10">
        {/* ── Brand Header & Logo ── */}
        <div className="text-center mb-6">
          <Link
            to="/"
            className="inline-flex items-center gap-3.5 group transition-transform duration-300 hover:scale-105"
          >
            <div className="relative">
              <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-rose-500 to-amber-500 opacity-60 blur group-hover:opacity-100 transition duration-300" />
              <img
                src="/logo.png"
                alt="ANIMEKH"
                className="relative w-14 h-14 object-cover rounded-full border border-white/20 shadow-xl"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
            <div className="text-left">
              <span className="font-display font-black text-2xl sm:text-3xl text-white tracking-tight">
                ANIME<span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-400 via-pink-300 to-amber-300">KH</span>
              </span>
              <p className="text-[10px] text-rose-300 font-bold uppercase tracking-widest flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-rose-400" />
                {t('កម្មវិធីទស្សនារឿងកម្រិត 4K Ultra HD')}
              </p>
            </div>
          </Link>
        </div>

        {/* ── Main Luxury Glass Card ── */}
        <div className="bg-[#0D1322]/95 border border-white/10 rounded-3xl p-6 sm:p-8 shadow-[0_25px_70px_rgba(0,0,0,0.85)] backdrop-blur-2xl relative overflow-hidden">
          {/* Subtle Accent Glow Line on Top */}
          <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-rose-500/80 to-transparent" />

          <div className="text-center mb-6">
            <h1 className="font-display font-black text-xl sm:text-2xl text-white mb-1.5 tracking-tight">
              {t('ចូលទស្សនារឿង')}
            </h1>
            <p className="text-xs text-gray-300 leading-relaxed">
              {language === 'km'
                ? 'ចូលប្រើប្រាស់ដោយសុវត្ថិភាព ១-Click ជាមួយគណនី Google'
                : 'Sign in securely with 1-click using your Google Account.'}
            </p>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="p-3.5 mb-5 rounded-2xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs font-bold text-center animate-fade-in flex items-center justify-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* ─── DIRECT GOOGLE 1-CLICK AUTH BOX ─── */}
          <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-b from-white/[0.04] to-transparent border border-white/10 flex flex-col items-center justify-center relative overflow-hidden shadow-inner">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-3 shadow-md">
              <Play className="w-5 h-5 fill-current ml-0.5" />
            </div>

            <p className="text-xs text-rose-300 font-bold mb-4 text-center">
              ⚡ {t('ចុចប៊ូតុងខាងក្រោមដើម្បីចូលប្រើប្រាស់ភ្លាមៗ៖')}
            </p>

            <div className="w-full flex justify-center animate-scale-in">
              <GoogleSignInButton
                text="continue_with"
                onSuccess={() => {
                  triggerHaptic('medium');
                  navigate(from, { replace: true });
                }}
                onError={(msg) => setError(msg)}
              />
            </div>
          </div>

          {/* Value Highlights */}
          <div className="mt-6 pt-5 border-t border-white/10 grid grid-cols-3 gap-2 text-center">
            <div className="p-2 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
              <Zap className="w-4 h-4 text-amber-400 mx-auto" />
              <p className="text-[10px] font-bold text-gray-200">{language === 'km' ? 'ចូលភ្លាមៗ' : 'Instant'}</p>
              <p className="text-[9px] text-gray-400">{language === 'km' ? '១-Click' : '1-Click'}</p>
            </div>
            <div className="p-2 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
              <ShieldCheck className="w-4 h-4 text-emerald-400 mx-auto" />
              <p className="text-[10px] font-bold text-gray-200">{language === 'km' ? 'សុវត្ថិភាព' : 'Secure'}</p>
              <p className="text-[9px] text-gray-400">{language === 'km' ? 'ការពារ ១០០%' : 'Protected'}</p>
            </div>
            <div className="p-2 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
              <Film className="w-4 h-4 text-rose-400 mx-auto" />
              <p className="text-[10px] font-bold text-gray-200">{language === 'km' ? 'ភាពច្បាស់' : 'Quality'}</p>
              <p className="text-[9px] text-gray-400">4K Ultra HD</p>
            </div>
          </div>
        </div>

        {/* ── Back to Home ── */}
        <div className="text-center mt-6 pb-2">
          <Link
            to="/"
            className="text-xs text-gray-400 hover:text-rose-400 transition-colors inline-flex items-center gap-1.5 font-medium"
          >
            ← {t('ត្រឡប់ទៅទំព័រដើម')}
          </Link>
        </div>
      </div>
    </main>
  );
}
