import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Sparkles, AlertTriangle, Play, Smartphone,
  Lock, Eye, EyeOff, ArrowLeft, X, KeyRound, Plus
} from 'lucide-react';
import { GoogleSignInButton } from '../components/common/GoogleSignInButton';
import { PhoneAuthForm } from '../components/common/PhoneAuthForm';
import { useAuthStore } from '../store/authStore';
import { triggerHaptic } from '../utils/telegram';
import { usePlatform } from '../utils/platform';
import { translate, useLanguageStore } from '../store/languageStore';

export function LoginPage() {
  const language = useLanguageStore((state) => state.language);
  const t = (text: string) => translate(text, language);
  const { isTelegram } = usePlatform();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as any)?.from || '/';

  const { login, isLoading } = useAuthStore();

  const [loginMethod, setLoginMethod] = useState<'phone' | 'google'>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  // Unban Appeal Form states
  const [showAppeal, setShowAppeal] = useState(false);
  const [appealUsername, setAppealUsername] = useState('');
  const [appealReason, setAppealReason] = useState('');
  const [appealContact, setAppealContact] = useState('');
  const [isSubmittingAppeal, setIsSubmittingAppeal] = useState(false);
  const [appealSuccess, setAppealSuccess] = useState('');

  const handlePhoneLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = phoneNumber.replace(/\s+/g, '').trim();
    if (!cleanPhone || !password.trim()) {
      setError(t('សូមបញ្ចូលលេខទូរសព្ទ និងពាក្យសម្ងាត់របស់អ្នក'));
      return;
    }

    setError('');
    triggerHaptic('medium');

    try {
      await login(cleanPhone, password.trim());
      navigate(from, { replace: true });
    } catch (err: any) {
      const d = err?.response?.data?.detail;
      const msg = typeof d === 'string'
        ? d
        : (d?.msg || err?.message || t('លេខទូរសព្ទ ឬពាក្យសម្ងាត់មិនត្រឹមត្រូវឡើយ'));
      setError(msg);
    }
  };


  const handleAppealSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appealUsername.trim() || !appealReason.trim()) return;

    setIsSubmittingAppeal(true);
    try {
      const isProd = typeof window !== 'undefined' && !window.location.hostname.includes('localhost');
      const apiBase = (window as any).__VITE_API_URL__ || (isProd ? 'https://immortal-s7ui.onrender.com' : 'http://localhost:8000');
      const res = await fetch(`${apiBase}/api/auth/request-unban`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username_or_email: appealUsername.trim(),
          reason: appealReason.trim(),
          contact: appealContact.trim() || 'Not provided',
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setAppealSuccess(data.message || t('សំណើស្នើសុំដោះសោរត្រូវបានផ្ញើទៅកាន់ Admin រួចរាល់ហើយ!'));
      } else {
        setError(data.detail || t('មានបញ្ហាក្នុងការផ្ញើសំណើ'));
      }
    } catch {
      setError(t('មិនអាចភ្ជាប់ទៅកាន់ Server បានទេ'));
    } finally {
      setIsSubmittingAppeal(false);
    }
  };

  if (isTelegram) {
    return (
      <TelegramMiniLogin
        from={from}
        navigate={navigate}
        loginMethod={loginMethod}
        setLoginMethod={setLoginMethod}
        phoneNumber={phoneNumber}
        setPhoneNumber={setPhoneNumber}
        password={password}
        setPassword={setPassword}
        showPassword={showPassword}
        setShowPassword={setShowPassword}
        error={error}
        setError={setError}
        isLoading={isLoading}
        onPasswordLogin={handlePhoneLogin}
      />
    );
  }

  return (
    <main className={`website-login min-h-screen ${isTelegram ? 'min-h-[100dvh] items-center px-4 py-5 sm:py-8' : 'items-center px-4 py-8 sm:py-12'} flex justify-center bg-[#080d1a] relative overflow-x-hidden overflow-y-auto select-none`}>
      {/* ── Dynamic Glowing Auroras ── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className={`absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full blur-[150px] ${isTelegram ? 'bg-gradient-to-br from-rose-500/25 via-violet-700/15 to-transparent' : 'bg-gradient-to-br from-rose-500/20 via-pink-600/15 to-transparent'}`} />
        <div className={`absolute bottom-10 left-1/4 w-80 h-80 rounded-full blur-[110px] ${isTelegram ? 'bg-fuchsia-700/15' : 'bg-rose-700/15'}`} />
        <div className={`absolute top-10 right-10 w-72 h-72 rounded-full blur-[100px] ${isTelegram ? 'bg-blue-600/10' : 'bg-amber-400/10'}`} />
      </div>

      <div className={`relative w-full ${isTelegram ? 'max-w-[520px]' : 'max-w-md'} animate-scale-in z-10`}>
        {/* ── Brand Header & Logo ── */}
        <div className="text-center mb-6">
          <Link to="/" className="inline-flex items-center gap-3 group transition-transform duration-300 hover:scale-105">
            <img
              src="/logo.png"
              alt={t('ទស្សនារឿង')}
              className="w-14 h-14 object-cover rounded-full border border-rose-500/40 drop-shadow-[0_0_25px_rgba(255,77,109,0.5)]"
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
            <div className="text-left">
              <span className="font-display font-black text-2xl sm:text-3xl text-white tracking-tight">
                {t('ទស្សនា')} <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-400 via-pink-300 to-amber-300">{t('រឿង')}</span>
              </span>
              <p className="text-[10px] text-rose-300 font-bold uppercase tracking-widest flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-rose-400" /> {t('កម្មវិធីទស្សនារឿងកម្រិត 4K Ultra HD')}
              </p>
            </div>
          </Link>
        </div>

        {/* ── Main Luxury Glass Card ── */}
        <div className={`${isTelegram ? 'bg-[#101727]/95 border-[#293247] rounded-[26px] p-5 sm:p-7 shadow-[0_22px_70px_rgba(0,0,0,.62)]' : 'bg-[#0e1629]/95 border-white/10 rounded-3xl p-6 sm:p-8 shadow-[0_20px_60px_rgba(0,0,0,0.85)]'} border backdrop-blur-2xl relative overflow-hidden`}>
          
          <div className="text-center mb-5">
            <h1 className="font-display font-black text-xl sm:text-2xl text-white mb-1 tracking-tight">
              {t('ចូលទស្សនារឿង')}
            </h1>
            <p className="text-xs text-gray-300">
              {t('ចូលគណនីតាមលេខទូរសព្ទ ឬ Google យ៉ាងងាយស្រួល')}
            </p>
          </div>

          {/* ── Tab Switcher: Phone vs Google ── */}
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-black/40 border border-white/10 rounded-2xl mb-5">
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setLoginMethod('phone');
                setError('');
              }}
              className={`py-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                loginMethod === 'phone'
                  ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-md shadow-rose-500/30'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" /> {t('លេខទូរសព្ទ (Phone)')}
            </button>
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setLoginMethod('google');
                setError('');
              }}
              className={`py-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                loginMethod === 'google'
                  ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-md shadow-rose-500/30'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Play className="w-3.5 h-3.5" /> Google 1-Click
            </button>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="p-3.5 mb-5 rounded-2xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs font-bold text-center animate-fade-in space-y-2">
              <div className="flex items-center justify-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <p className="text-xs font-bold">{error}</p>
              </div>
              {(error.toLowerCase().includes('disabled') || error.toLowerCase().includes('banned') || error.toLowerCase().includes('403') || error.toLowerCase().includes('បិទ')) && (
                <div className="pt-2 border-t border-rose-500/30">
                  <p className="text-[11px] text-gray-300 font-normal mb-2">
                    {t('គណនីរបស់អ្នកត្រូវបានផ្អាកដំណើរការ។ សូមដាក់ពាក្យស្នើសុំដោះសោរទៅកាន់ Admin៖')}
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowAppeal(true)}
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs shadow-md transition-all active:scale-95"
                  >
                    📝 {t('ដាក់ពាក្យស្នើសុំដោះសោរ')}
                  </button>
                </div>
              )}
            </div>
          )}

          {showAppeal ? (
            /* ─── INLINE UNBAN APPEAL FORM ─── */
            <div className="space-y-4 py-2 animate-slide-up text-left">
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                  📝 {t('ពាក្យស្នើសុំដោះសោរគណនី')}
                </span>
                <button
                  type="button"
                  onClick={() => setShowAppeal(false)}
                  className="text-xs text-gray-400 hover:text-white cursor-pointer"
                >
                  {t('បោះបង់')}
                </button>
              </div>

              {appealSuccess ? (
                <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs text-center font-bold space-y-2">
                  <p>✅ {appealSuccess}</p>
                  <p className="text-gray-300 font-normal text-[11px]">
                    {t('Admin នឹងពិនិត្យ និងដោះសោរជូនអ្នកក្នុងពេលឆាប់ៗ!')}
                  </p>
                </div>
              ) : (
                <form onSubmit={handleAppealSubmit} className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-400 mb-1">
                      {t('ឈ្មោះគណនី / Email របស់អ្នក៖')}
                    </label>
                    <input
                      type="text"
                      value={appealUsername}
                      onChange={(e) => setAppealUsername(e.target.value)}
                      placeholder={t('ឧ. your_email@gmail.com ឬ 012345678')}
                      required
                      className="w-full bg-[#131d36] border border-white/15 focus:border-rose-500 text-white rounded-xl px-3.5 py-2.5 text-xs focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-400 mb-1">
                      {t('មូលហេតុស្នើសុំដោះសោរ៖')}
                    </label>
                    <textarea
                      value={appealReason}
                      onChange={(e) => setAppealReason(e.target.value)}
                      placeholder={t('ឧ. ខ្ញុំច្រឡំដៃចុច F12 / Shortcut សូម Admin ជួយដោះសោរគណនីខ្ញុំវិញផង...')}
                      rows={3}
                      required
                      className="w-full bg-[#131d36] border border-white/15 focus:border-rose-500 text-white rounded-xl px-3.5 py-2.5 text-xs focus:outline-none resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-400 mb-1">
                      {t('ព័ត៌មានទំនាក់ទំនង (Telegram ឬលេខទូរស័ព្ទ) [បើមាន]៖')}
                    </label>
                    <input
                      type="text"
                      value={appealContact}
                      onChange={(e) => setAppealContact(e.target.value)}
                      placeholder={t('ឧ. @my_telegram ឬ 012345678')}
                      className="w-full bg-[#131d36] border border-white/15 focus:border-rose-500 text-white rounded-xl px-3.5 py-2.5 text-xs focus:outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmittingAppeal}
                    className="w-full bg-gradient-to-r from-rose-500 to-pink-600 text-white font-black text-xs py-2.5 rounded-xl shadow-lg shadow-rose-500/20 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    {isSubmittingAppeal ? t('កំពុងផ្ញើសំណើ...') : `📩 ${t('ផ្ញើសំណើទៅកាន់ Admin')}`}
                  </button>
                </form>
              )}
            </div>
          ) : loginMethod === 'phone' ? (
            /* ─── 📱 PHONE NUMBER & PASSWORD LOGIN FORM ─── */
            <form onSubmit={handlePhoneLogin} className="space-y-4 text-left">
              <div>
                <label className="block text-[11px] font-bold text-gray-300 mb-1.5 flex items-center gap-1">
                  <Smartphone className="w-3.5 h-3.5 text-rose-400" /> {t('លេខទូរសព្ទរបស់អ្នក')}
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">
                    🇰🇭 +855
                  </span>
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder={t('12 345 678 ឬ 012345678')}
                    required
                    className="w-full bg-[#131d36] border border-white/15 focus:border-rose-500 text-white rounded-2xl pl-20 pr-4 py-3 text-xs sm:text-sm focus:outline-none transition-all placeholder:text-gray-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-300 mb-1.5 flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5 text-rose-400" /> {t('ពាក្យសម្ងាត់ (Password)')}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t('បញ្ចូលពាក្យសម្ងាត់របស់អ្នក')}
                    required
                    className="w-full bg-[#131d36] border border-white/15 focus:border-rose-500 text-white rounded-2xl pl-4 pr-11 py-3 text-xs sm:text-sm focus:outline-none transition-all placeholder:text-gray-500 font-sans"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white p-1 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-rose-500 via-pink-500 to-rose-600 hover:from-rose-600 hover:to-pink-600 text-white font-black text-sm py-3.5 rounded-2xl shadow-lg shadow-rose-500/30 hover:scale-[1.01] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer pt-3"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Lock className="w-4 h-4 stroke-[2.5]" />
                    <span>{t('ចូលគណនី (Login)')}</span>
                  </>
                )}
              </button>

              {/* Links below: Register & Guest */}
              <div className="pt-3 border-t border-white/10 flex flex-col items-center gap-2.5 text-center text-xs">
                <p className="text-gray-400">
                  {t('មិនទាន់មានគណនីមែនទេ?')}{' '}
                  <Link
                    to="/register"
                    state={{ from }}
                    className="text-rose-400 font-black hover:text-rose-300 underline"
                  >
                    {t('បង្កើតគណនីថ្មី (ចុះឈ្មោះ)')}
                  </Link>
                </p>
              </div>
            </form>
          ) : (
            /* ─── DIRECT GOOGLE 1-CLICK LOGIN ─── */
            <div className="space-y-5 text-center">
              <div className="p-5 rounded-3xl bg-gradient-to-b from-rose-500/10 via-white/5 to-transparent border border-rose-500/30 shadow-inner flex flex-col items-center justify-center relative overflow-hidden">
                <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 mb-3 shadow-md">
                  <Play className="w-6 h-6 fill-current ml-0.5" />
                </div>
                <p className="text-xs text-rose-300 font-bold mb-4">
                  ⚡ {t('ចុចប៊ូតុងខាងក្រោមដើម្បីចូលប្រើប្រាស់ភ្លាមៗ៖')}
                </p>

                <div className="w-full flex justify-center animate-scale-in">
                  <GoogleSignInButton
                    text="continue_with"
                    onSuccess={() => navigate(from, { replace: true })}
                    onError={(msg) => setError(msg)}
                  />
                </div>
              </div>
            </div>
          )}

        </div>

        {/* ── Back to Home ── */}
        <div className="text-center mt-6 pb-2">
          {isTelegram ? (
            <a href="https://t.me/animeflickh_bot" className="text-sm tracking-wide text-gray-300/90 hover:text-rose-300 transition-colors">@animeflickh_bot</a>
          ) : (
            <Link to="/" className="text-xs text-gray-400 hover:text-rose-400 transition-colors inline-flex items-center gap-1">
              ← {t('ត្រឡប់ទៅទំព័រដើម')}
            </Link>
          )}
        </div>
      </div>
    </main>
  );
}

type TelegramMiniLoginProps = {
  from: string;
  navigate: (path: string, options?: { replace?: boolean }) => void;
  loginMethod: 'phone' | 'google';
  setLoginMethod: (method: 'phone' | 'google') => void;
  phoneNumber: string;
  setPhoneNumber: (value: string) => void;
  password: string;
  setPassword: (value: string) => void;
  showPassword: boolean;
  setShowPassword: (value: boolean) => void;
  error: string;
  setError: (value: string) => void;
  isLoading: boolean;
  onPasswordLogin: (event: React.FormEvent) => Promise<void>;
};

function TelegramMiniLogin({
  from, navigate, phoneNumber, setPhoneNumber, password, setPassword,
  showPassword, setShowPassword, error, setError, isLoading, onPasswordLogin,
}: TelegramMiniLoginProps) {
  const [screen, setScreen] = useState<'methods' | 'password' | 'phone'>('methods');
  const language = useLanguageStore((state) => state.language);
  const t = (text: string) => translate(text, language);

  const close = () => navigate(from && from !== '/login' ? from : '/', { replace: true });

  return (
    <main className="fixed inset-0 z-[100] flex flex-col justify-end overflow-hidden bg-[#07080b] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_25%,rgba(40,48,65,.35),transparent_62%)]" />
      <div className="relative z-10 flex min-h-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-4 border-b border-white/[0.06] px-5 text-white/70">
          <button type="button" onClick={close} aria-label={t('Back')} className="p-1"><ArrowLeft className="h-5 w-5" /></button>
          <span className="text-[15px] font-medium">{t('Switch accounts')}</span>
        </header>
        <div className="flex flex-1 flex-col px-5 pt-5">
          <button type="button" onClick={() => setScreen('methods')} className="flex items-center gap-4 py-3 text-left text-white/70">
            <span className="grid h-11 w-11 place-items-center rounded-full bg-white/[0.06]"><Plus className="h-6 w-6" /></span>
            <span className="text-sm">{t('Add account')}</span>
          </button>
        </div>
      </div>

      <section className="relative z-20 max-h-[88dvh] shrink-0 overflow-y-auto rounded-t-[24px] border-t border-white/[0.08] bg-[#15161b] px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-4 shadow-[0_-18px_60px_rgba(0,0,0,.6)]">
        <div className="mb-5 flex items-center justify-between">
          <button type="button" onClick={() => screen === 'methods' ? close() : (setError(''), setScreen('methods'))} aria-label={t('Back')} className="p-1 text-white/70">
            {screen === 'methods' ? <span className="block h-5 w-5" /> : <ArrowLeft className="h-5 w-5" />}
          </button>
          <h1 className="text-center text-base font-bold">{t('Login to unlock more content')}</h1>
          <button type="button" onClick={close} aria-label={t('Close')} className="p-1 text-white/60"><X className="h-5 w-5" /></button>
        </div>

        {error && <p role="alert" className="mb-4 rounded-lg bg-red-500/10 px-3 py-2 text-center text-xs text-red-300">{error}</p>}

        {screen === 'methods' && <div className="space-y-3">
          <button type="button" onClick={() => { setError(''); setScreen('password'); }} className="flex h-14 w-full items-center gap-4 rounded-lg bg-[#25262c] px-4 text-left text-[15px] font-semibold"><KeyRound className="h-5 w-5 text-white/70" />{t('Log in with password')}</button>
          <button type="button" onClick={() => { setError(''); setScreen('phone'); }} className="flex h-14 w-full items-center gap-4 rounded-lg bg-[#25262c] px-4 text-left text-[15px] font-semibold"><Smartphone className="h-5 w-5 text-white/70" />{t('Log in with mobile number')}</button>
          <div className="flex justify-center py-2">
            <GoogleSignInButton text="continue_with" onSuccess={() => navigate(from, { replace: true })} onError={setError} />
          </div>
        </div>}

        {screen === 'password' && <form onSubmit={onPasswordLogin} className="space-y-4">
          <label className="block border-b border-white/10 pb-3"><span className="sr-only">{t('Phone number')}</span><input type="tel" value={phoneNumber} onChange={(event) => setPhoneNumber(event.target.value)} placeholder={t('Email or mobile number')} autoComplete="username" className="w-full bg-transparent py-2 text-[15px] text-white outline-none placeholder:text-white/45" /></label>
          <label className="flex items-center border-b border-white/10 pb-3"><span className="sr-only">{t('Password')}</span><input type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} placeholder={t('Enter password')} autoComplete="current-password" className="w-full bg-transparent py-2 text-[15px] text-white outline-none placeholder:text-white/45" /><button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? t('Hide password') : t('Show password')} className="text-white/60">{showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}</button></label>
          <button type="button" className="block w-full py-2 text-center text-sm text-white/80">{t('Recover password')}</button>
          <button type="submit" disabled={isLoading || !phoneNumber.trim() || !password} className="h-14 w-full rounded-xl bg-gradient-to-r from-rose-500 via-pink-500 to-rose-600 text-base font-bold text-white shadow-lg shadow-rose-500/25 disabled:opacity-45">{isLoading ? t('Signing in…') : t('Login')}</button>
        </form>}

        {screen === 'phone' && <PhoneAuthForm onSuccess={() => navigate(from, { replace: true })} />}

        <p className="mt-7 text-center text-[11px] leading-5 text-white/45">{t('Login indicates you agree to the')} <span className="text-emerald-400">{t('Terms of Service')}</span> {t('and')} <span className="text-emerald-400">{t('Privacy Policy')}</span>.</p>
        <Link to="/register" state={{ from }} className="-mx-5 mt-5 block border-t border-white/[0.08] py-4 text-center text-base font-medium">{t('Register')}</Link>
      </section>
    </main>
  );
}
