import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Sparkles, CheckCircle2, AlertTriangle, Play, Smartphone, Send,
  Lock, Eye, EyeOff, User, UserPlus, ArrowLeft, X, Plus
} from 'lucide-react';
import { GoogleSignInButton } from '../components/common/GoogleSignInButton';
import { useAuthStore } from '../store/authStore';
import { getTelegramInitData, getTelegramUser, triggerHaptic } from '../utils/telegram';
import { translate, useLanguageStore } from '../store/languageStore';
import { usePlatform } from '../utils/platform';

export function RegisterPage() {
  const language = useLanguageStore((state) => state.language);
  const t = (text: string) => translate(text, language);
  const { isTelegram } = usePlatform();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as any)?.from || '/';

  const { registerWithPhone, loginWithTelegram, isLoading } = useAuthStore();

  const [registerMethod, setRegisterMethod] = useState<'phone' | 'google'>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handlePhoneRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = phoneNumber.replace(/\s+/g, '').trim();
    if (!cleanPhone) {
      setError(t('សូមបញ្ចូលលេខទូរសព្ទរបស់អ្នក'));
      return;
    }
    if (!password.trim()) {
      setError(t('សូមបញ្ចូលពាក្យសម្ងាត់'));
      return;
    }
    if (password.length < 6) {
      setError(t('ពាក្យសម្ងាត់ត្រូវមានយ៉ាងតិច ៦ តួអក្សរ'));
      return;
    }
    if (password !== confirmPassword) {
      setError(t('ពាក្យសម្ងាត់ទាំង ២ មិនដូចគ្នាទេ'));
      return;
    }

    setError('');
    triggerHaptic('medium');

    try {
      await registerWithPhone(cleanPhone, password.trim(), displayName.trim() || undefined);
      navigate(from, { replace: true });
    } catch (err: any) {
      const d = err?.response?.data?.detail;
      const msg = typeof d === 'string'
        ? d
        : Array.isArray(d)
        ? d.map((x: any) => x.msg || JSON.stringify(x)).join('; ')
        : (d?.msg || err?.message || t('បរាជ័យក្នុងការចុះឈ្មោះគណនី'));
      setError(msg);
    }
  };

  const handleTelegramRegister = async () => {
    const tgUser = getTelegramUser();
    const initData = getTelegramInitData();
    if (!initData) {
      setError(t('Open this mini app from Telegram to create an account.'));
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
    if (useAuthStore.getState().isAuthenticated) navigate(from, { replace: true });
    else setError(t('Telegram registration failed. Please try again.'));
  };

  if (isTelegram) {
    return (
      <main className="fixed inset-0 z-[100] flex flex-col justify-end overflow-hidden bg-[#07080b] text-white">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_25%,rgba(40,48,65,.35),transparent_62%)]" />
        <div className="relative z-10 flex min-h-0 flex-1 flex-col">
          <header className="flex h-14 shrink-0 items-center gap-4 border-b border-white/[0.06] px-5 text-white/70">
            <button type="button" onClick={() => navigate('/login', { state: { from }, replace: true })} aria-label={t('Back')} className="p-1"><ArrowLeft className="h-5 w-5" /></button>
            <span className="text-[15px] font-medium">{t('Switch accounts')}</span>
          </header>
          <div className="flex flex-1 flex-col px-5 pt-5">
            <button type="button" onClick={() => setRegisterMethod('phone')} className="flex items-center gap-4 py-3 text-left text-white/70">
              <span className="grid h-11 w-11 place-items-center rounded-full bg-white/[0.06]"><Plus className="h-6 w-6" /></span>
              <span className="text-sm">{t('Add account')}</span>
            </button>
          </div>
        </div>

        <section className="relative z-20 max-h-[88dvh] shrink-0 overflow-y-auto rounded-t-[24px] border-t border-white/[0.08] bg-[#15161b] px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-4 shadow-[0_-18px_60px_rgba(0,0,0,.6)]">
          <div className="mb-5 flex items-center justify-between">
            <button type="button" onClick={() => navigate('/login', { state: { from }, replace: true })} aria-label={t('Back')} className="p-1 text-white/70"><ArrowLeft className="h-5 w-5" /></button>
            <h1 className="text-center text-base font-bold">{t('Create your account')}</h1>
            <button type="button" onClick={() => navigate(from, { replace: true })} aria-label={t('Close')} className="p-1 text-white/60"><X className="h-5 w-5" /></button>
          </div>

          <p className="mb-4 text-center text-xs text-white/55">{t('Register with your phone number or Google.')}</p>

          <div className="mb-4 grid grid-cols-2 gap-1 rounded-lg bg-[#090a0e] p-1">
            <button type="button" onClick={() => { setRegisterMethod('phone'); setError(''); }} className={`flex h-11 items-center justify-center gap-2 rounded-md text-sm font-semibold ${registerMethod === 'phone' ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white' : 'text-white/55'}`}><Smartphone className="h-4 w-4" />{t('Phone number')}</button>
            <button type="button" onClick={() => { setRegisterMethod('google'); setError(''); }} className={`flex h-11 items-center justify-center gap-2 rounded-md text-sm font-semibold ${registerMethod === 'google' ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white' : 'text-white/55'}`}><Send className="h-4 w-4" />Telegram</button>
          </div>

          {error && <div role="alert" className="mb-4 rounded-lg bg-red-500/10 px-3 py-2 text-center text-xs text-red-300">{error}</div>}

          {registerMethod === 'phone' ? <form onSubmit={handlePhoneRegister} className="space-y-3.5">
            <label className="block text-xs text-white/65">{t('Your phone number')}<span className="mt-1.5 flex h-12 items-center rounded-lg border-b border-white/15 bg-transparent px-1"><span className="mr-3 text-sm font-semibold text-white/60">🇰🇭 +855</span><input type="tel" value={phoneNumber} onChange={(event) => setPhoneNumber(event.target.value)} placeholder={t('12 345 678 or 012345678')} autoComplete="tel" required className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/35" /></span></label>
            <label className="block text-xs text-white/65">{t('Username (optional)')}<span className="mt-1.5 flex h-12 items-center rounded-lg border-b border-white/15"><input type="text" value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder={t('e.g. Sokha 3D')} autoComplete="nickname" className="w-full bg-transparent px-1 text-sm text-white outline-none placeholder:text-white/35" /></span></label>
            <label className="block text-xs text-white/65">{t('Password (at least 6 characters)')}<span className="mt-1.5 flex h-12 items-center rounded-lg border-b border-white/15"><input type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} placeholder={t('Create a password')} autoComplete="new-password" required className="w-full bg-transparent px-1 text-sm text-white outline-none placeholder:text-white/35" /><button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? t('Hide password') : t('Show password')} className="px-2 text-white/60">{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></span></label>
            <label className="block text-xs text-white/65">{t('Confirm your password')}<span className="mt-1.5 flex h-12 items-center rounded-lg border-b border-white/15"><input type={showPassword ? 'text' : 'password'} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder={t('Re-enter your password')} autoComplete="new-password" required className="w-full bg-transparent px-1 text-sm text-white outline-none placeholder:text-white/35" /></span></label>
            <button type="submit" disabled={isLoading} className="btn btn-primary h-12 w-full text-sm font-bold disabled:opacity-50">{isLoading ? t('Creating account…') : <><UserPlus className="h-4 w-4" />{t('Create account')}</>}</button>
          </form> : <div className="py-5"><button type="button" onClick={() => { void handleTelegramRegister(); }} className="mx-auto flex h-12 w-full max-w-[260px] items-center justify-center gap-2 rounded-xl bg-[#229ed9] px-4 text-sm font-semibold text-white shadow-lg shadow-sky-500/20 active:scale-[0.99]"><Send className="h-4 w-4" />{t('Continue with Telegram')}</button></div>}

          <p className="mt-5 text-center text-[11px] leading-5 text-white/45">{t('Login indicates you agree to the')} <span className="text-emerald-400">{t('Terms of Service')}</span> {t('and')} <span className="text-emerald-400">{t('Privacy Policy')}</span>.</p>
          <p className="-mx-5 mt-4 border-t border-white/[0.08] pt-4 text-center text-sm text-white/60">{t('Already have an account?')} <Link to="/login" state={{ from }} className="font-bold text-rose-400">{t('Sign in')}</Link></p>
        </section>
      </main>
    );
  }


  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-8 sm:py-12 bg-[#080d1a] relative overflow-hidden select-none">
      {/* ── Dynamic Glowing Auroras ── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-gradient-to-br from-rose-500/20 via-pink-600/15 to-transparent rounded-full blur-[150px]" />
        <div className="absolute bottom-10 left-1/4 w-80 h-80 bg-rose-700/15 rounded-full blur-[110px]" />
        <div className="absolute top-10 right-10 w-72 h-72 bg-amber-400/10 rounded-full blur-[100px]" />
      </div>

      <div className="relative w-full max-w-md animate-scale-in z-10">
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
        <div className="bg-[#0e1629]/95 border border-white/10 rounded-3xl p-6 sm:p-8 shadow-[0_20px_60px_rgba(0,0,0,0.85)] backdrop-blur-2xl relative overflow-hidden">
          
          <div className="text-center mb-5">
            <h1 className="font-display font-black text-xl sm:text-2xl text-white mb-1 tracking-tight">
              {t('បង្កើតគណនីថ្មី (Register)')}
            </h1>
            <p className="text-xs text-gray-300">
              {t('ចុះឈ្មោះជាមួយលេខទូរសព្ទ និងពាក្យសម្ងាត់ងាយស្រួល')}
            </p>
          </div>

          {/* ── Tab Switcher: Phone vs Google ── */}
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-black/40 border border-white/10 rounded-2xl mb-5">
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setRegisterMethod('phone');
                setError('');
              }}
              className={`py-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                registerMethod === 'phone'
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
                setRegisterMethod('google');
                setError('');
              }}
              className={`py-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                registerMethod === 'google'
                  ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-md shadow-rose-500/30'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Play className="w-3.5 h-3.5" /> Google 1-Click
            </button>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="p-3.5 mb-5 rounded-2xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs font-bold text-center animate-fade-in flex items-center justify-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <p className="text-xs font-bold">{error}</p>
            </div>
          )}

          {registerMethod === 'phone' ? (
            /* ─── 📱 PHONE NUMBER + PASSWORD REGISTRATION ─── */
            <form onSubmit={handlePhoneRegister} className="space-y-3.5 text-left">
              <div>
                <label className="block text-[11px] font-bold text-gray-300 mb-1 flex items-center gap-1">
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
                    className="w-full bg-[#131d36] border border-white/15 focus:border-rose-500 text-white rounded-2xl pl-20 pr-4 py-2.5 text-xs sm:text-sm focus:outline-none transition-all placeholder:text-gray-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-300 mb-1 flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-rose-400" /> {t('ឈ្មោះគណនី (Username / ឈ្មោះហៅក្រៅ) [Optional]')}
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="ឧ. Sokha 3D"
                  className="w-full bg-[#131d36] border border-white/15 focus:border-rose-500 text-white rounded-2xl px-4 py-2.5 text-xs sm:text-sm focus:outline-none transition-all placeholder:text-gray-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-300 mb-1 flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5 text-rose-400" /> {t('ពាក្យសម្ងាត់ (យ៉ាងតិច ៦ តួ)')}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t('កំណត់ពាក្យសម្ងាត់')}
                    required
                    className="w-full bg-[#131d36] border border-white/15 focus:border-rose-500 text-white rounded-2xl pl-4 pr-11 py-2.5 text-xs sm:text-sm focus:outline-none transition-all placeholder:text-gray-500"
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

              <div>
                <label className="block text-[11px] font-bold text-gray-300 mb-1 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-rose-400" /> {t('ផ្ទៀងផ្ទាត់ពាក្យសម្ងាត់ម្ដងទៀត')}
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={t('បញ្ចូលពាក្យសម្ងាត់ដូចខាងលើ')}
                  required
                  className="w-full bg-[#131d36] border border-white/15 focus:border-rose-500 text-white rounded-2xl px-4 py-2.5 text-xs sm:text-sm focus:outline-none transition-all placeholder:text-gray-500"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="btn btn-primary h-12 w-full text-sm font-bold disabled:opacity-50 mt-1"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <UserPlus className="w-4 h-4 stroke-[2.5]" />
                    <span>{t('បង្កើតគណនី (Sign Up)')}</span>
                  </>
                )}
              </button>

              {/* Links below: Login & Guest */}
              <div className="pt-3 border-t border-white/10 flex flex-col items-center gap-2.5 text-center text-xs">
                <p className="text-gray-400">
                  {t('មានគណនីរួចហើយ?')}{' '}
                  <Link
                    to="/login"
                    state={{ from }}
                    className="text-rose-400 font-black hover:text-rose-300 underline"
                  >
                    {t('ចូលគណនី (Sign In)')}
                  </Link>
                </p>
              </div>
            </form>
          ) : (
            /* ─── GOOGLE 1-CLICK REGISTRATION ─── */
            <div className="space-y-5 text-center">
              <div className="p-5 rounded-3xl bg-gradient-to-b from-rose-500/10 via-white/5 to-transparent border border-rose-500/30 shadow-inner flex flex-col items-center justify-center relative overflow-hidden">
                <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 mb-3 shadow-md">
                  <Play className="w-6 h-6 fill-current ml-0.5" />
                </div>
                <p className="text-xs text-rose-300 font-bold mb-4">
                  ⚡ {t('ចុចប៊ូតុងខាងក្រោមដើម្បីបង្កើតគណនីភ្លាមៗ៖')}
                </p>

                <div className="w-full flex justify-center animate-scale-in">
                  <GoogleSignInButton
                    text="signup_with"
                    onSuccess={() => navigate(from, { replace: true })}
                    onError={(msg) => setError(msg)}
                  />
                </div>
              </div>
            </div>
          )}

        </div>

        {/* ── Back to Home ── */}
        <div className="text-center mt-6">
          <Link to="/" className="text-xs text-gray-400 hover:text-rose-400 transition-colors inline-flex items-center gap-1">
            ← {t('ត្រឡប់ទៅទំព័រដើម')}
          </Link>
        </div>
      </div>
    </main>
  );
}
