import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  AlertTriangle,
  Play,
  ArrowLeft,
  ShieldCheck,
  Zap,
  Film,
  Send,
  CheckCircle2,
  Lock,
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
     TELEGRAM MINI APP NATIVE LOGIN VIEW (iOS 27 Liquid Glass White)
  ───────────────────────────────────────────────────────────── */
  if (isTelegram) {
    return (
      <main className="fixed inset-0 z-50 flex flex-col justify-between bg-slate-50 text-slate-900 overflow-y-auto px-5 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))] select-none">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full bg-blue-500/8 blur-[110px]" />
        </div>

        {/* Header Bar */}
        <div className="relative z-10 flex items-center justify-between w-full">
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              navigate(from && from !== '/login' ? from : '/', { replace: true });
            }}
            className="w-10 h-10 rounded-2xl bg-white hover:bg-slate-100 border border-slate-200/90 text-slate-700 flex items-center justify-center shadow-sm transition-all active:scale-95"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className="text-[11px] font-bold text-slate-400 tracking-wider uppercase">
            MerDonghua Mini App
          </span>
          <div className="w-10" />
        </div>

        {/* Central Hero Branding & Login Card */}
        <div className="relative z-10 my-auto py-6 flex flex-col items-center text-center max-w-sm mx-auto w-full">
          <div className="w-20 h-20 rounded-[24px] bg-white border border-slate-200/90 shadow-md p-1 mb-4 flex items-center justify-center overflow-hidden">
            <img
              src="/logo.png"
              alt="MerDonghua"
              className="w-full h-full rounded-[20px] object-cover"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>

          <h1 className="font-display font-black text-2xl text-slate-900 tracking-tight mb-1.5">
            Mer<span className="text-blue-600">Donghua</span>
          </h1>
          <p className="text-xs text-slate-500 max-w-xs leading-relaxed mb-6">
            {language === 'km'
              ? 'ទស្សនារឿងភាគដុងហួរ និងអានីម៉ែគុណភាពខ្ពស់ 4K Ultra HD ភ្លាមៗ'
              : 'Stream Donghua & Anime in high-definition 4K Ultra HD instantly.'}
          </p>

          {error && (
            <div className="w-full mb-4 p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center justify-center gap-2 animate-fade-in">
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Main Action Box */}
          <div className="w-full bg-white/95 border border-slate-200/90 rounded-[28px] p-5 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur-2xl space-y-4">
            <div className="text-center">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-[11px] font-bold text-blue-600">
                <Lock className="w-3 h-3" />
                {language === 'km' ? 'ចូលប្រើប្រាស់រហ័ស 1-Click' : 'Fast 1-Click Sign In'}
              </span>
            </div>

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

            {tgUser && (
              <button
                type="button"
                onClick={handleTelegramLogin}
                disabled={isLoading}
                className="w-full h-11 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2.5 shadow-sm shadow-blue-600/20 transition-all active:scale-[0.98] cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>
                  {language === 'km'
                    ? `ចូលជាមួយ Telegram (@${tgUser.username || tgUser.first_name})`
                    : `Continue as @${tgUser.username || tgUser.first_name}`}
                </span>
              </button>
            )}

            <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-100 text-[11px] text-slate-500 font-medium">
              <div className="flex items-center justify-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>{language === 'km' ? 'គ្មានលេខសម្ងាត់' : 'No Password'}</span>
              </div>
              <div className="flex items-center justify-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>{language === 'km' ? 'សុវត្ថិភាពខ្ពស់' : '100% Secure'}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 text-center">
          <p className="text-[11px] text-slate-400">
            {language === 'km'
              ? 'ការចូលរួមមានន័យថាអ្នកយល់ព្រមតាមលក្ខខណ្ឌ និងគោលការណ៍ឯកជនភាព'
              : 'By signing in, you agree to our Terms of Service & Privacy Policy.'}
          </p>
        </div>
      </main>
    );
  }

  /* ─────────────────────────────────────────────────────────────
     WEB & RESPONSIVE DESKTOP/MOBILE VIEW (iOS 27 Liquid Glass White)
  ───────────────────────────────────────────────────────────── */
  return (
    <main className="website-login min-h-screen flex items-center justify-center bg-slate-50/70 relative overflow-hidden px-4 py-10 sm:py-14 select-none text-slate-900">
      {/* Soft Subtle Ambient Daylight */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[560px] h-[560px] rounded-full blur-[140px] bg-blue-500/8" />
      </div>

      <div className="relative w-full max-w-md animate-scale-in z-10">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <Link
            to="/"
            className="inline-flex items-center gap-3 group transition-transform duration-200 hover:scale-[1.02]"
          >
            <div className="w-13 h-13 rounded-2xl bg-white border border-slate-200/90 shadow-sm p-1 flex items-center justify-center overflow-hidden">
              <img
                src="/logo.png"
                alt="MerDonghua"
                className="w-11 h-11 object-cover rounded-xl"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
            <div className="text-left">
              <span className="font-display font-black text-2xl sm:text-[26px] text-slate-900 tracking-tight block leading-none">
                Mer<span className="text-blue-600">Donghua</span>
              </span>
              <span className="text-[11px] text-slate-500 font-semibold mt-1 block">
                {language === 'km' ? 'វេទិកាទស្សនារឿងកម្រិត 4K Ultra HD' : '4K Ultra HD Streaming'}
              </span>
            </div>
          </Link>
        </div>

        {/* Frosted White iOS 27 Card */}
        <div className="bg-white/95 border border-slate-200/90 rounded-[28px] p-6 sm:p-8 shadow-[0_20px_50px_rgba(15,23,42,0.07)] backdrop-blur-2xl">
          <div className="text-center mb-6">
            <h1 className="font-display font-black text-xl sm:text-2xl text-slate-900 mb-1.5 tracking-tight">
              {t('ចូលគណនីដើម្បីទស្សនា')}
            </h1>
            <p className="text-xs sm:text-[13px] text-slate-500 leading-relaxed">
              {language === 'km'
                ? 'សូមចូលគណនីរបស់អ្នកជាមុនសិន ដើម្បីអាចចូលទស្សនារឿង និងរក្សាទុកប្រវត្តិមើល'
                : 'Sign in securely with 1-click using your Google Account to start watching.'}
            </p>
          </div>

          {error && (
            <div className="p-3.5 mb-5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold text-center animate-fade-in flex items-center justify-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Direct Google 1-Click Auth Box */}
          <div className="p-5 sm:p-6 rounded-2xl bg-slate-50/90 border border-slate-200/80 flex flex-col items-center justify-center">
            <div className="w-11 h-11 rounded-2xl bg-blue-600 text-white flex items-center justify-center mb-3 shadow-sm shadow-blue-600/20">
              <Play className="w-5 h-5 fill-current ml-0.5" />
            </div>

            <p className="text-xs text-slate-600 font-semibold mb-4 text-center">
              {language === 'km'
                ? 'ចុចប៊ូតុងខាងក្រោមដើម្បីចូលប្រើប្រាស់ភ្លាមៗ'
                : 'Continue instantly with Google'}
            </p>

            <div className="w-full flex justify-center">
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
          <div className="mt-6 pt-5 border-t border-slate-100 grid grid-cols-3 gap-2.5 text-center">
            <div className="p-2.5 rounded-2xl bg-slate-50/80 border border-slate-200/70 space-y-1">
              <Zap className="w-4 h-4 text-blue-600 mx-auto" />
              <p className="text-[11px] font-bold text-slate-800">{language === 'km' ? 'ចូលភ្លាមៗ' : 'Instant'}</p>
              <p className="text-[10px] text-slate-500">1-Click</p>
            </div>
            <div className="p-2.5 rounded-2xl bg-slate-50/80 border border-slate-200/70 space-y-1">
              <ShieldCheck className="w-4 h-4 text-blue-600 mx-auto" />
              <p className="text-[11px] font-bold text-slate-800">{language === 'km' ? 'សុវត្ថិភាព' : 'Secure'}</p>
              <p className="text-[10px] text-slate-500">{language === 'km' ? 'ការពារ 100%' : 'Protected'}</p>
            </div>
            <div className="p-2.5 rounded-2xl bg-slate-50/80 border border-slate-200/70 space-y-1">
              <Film className="w-4 h-4 text-blue-600 mx-auto" />
              <p className="text-[11px] font-bold text-slate-800">{language === 'km' ? 'ភាពច្បាស់' : 'Quality'}</p>
              <p className="text-[10px] text-slate-500">4K Ultra HD</p>
            </div>
          </div>
        </div>

        {/* Back to Home */}
        <div className="text-center mt-5 pb-2">
          <Link
            to="/"
            className="text-xs text-slate-500 hover:text-blue-600 transition-colors inline-flex items-center gap-1.5 font-semibold"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{t('ត្រឡប់ទៅទំព័រដើម')}</span>
          </Link>
        </div>
      </div>
    </main>
  );
}
