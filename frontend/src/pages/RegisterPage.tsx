import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Shield, Sparkles, CheckCircle2, AlertTriangle, Play, Smartphone, Film,
  Mail, Lock, Eye, EyeOff, User, UserPlus
} from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { GoogleSignInButton } from '../components/common/GoogleSignInButton';
import { useAuthStore } from '../store/authStore';

export function RegisterPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as any)?.from || '/';

  const isNativeApp = Capacitor.isNativePlatform();
  const { register, loginWithPhone, isLoading } = useAuthStore();

  // On Website -> default to Google signup; On Android App APK -> default to Normal register
  const [registerMethod, setRegisterMethod] = useState<'google' | 'normal'>(
    isNativeApp ? 'normal' : 'google'
  );

  const [activeNormalTab, setActiveNormalTab] = useState<'email' | 'phone'>('email');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !email.trim() || !password.trim()) {
      setError('សូមបំពេញព័ត៌មានឱ្យបានគ្រប់គ្រាន់');
      return;
    }
    if (password !== confirmPassword) {
      setError('ពាក្យសម្ងាត់ទាំង ២ មិនដូចគ្នាទេ');
      return;
    }
    if (password.length < 6) {
      setError('ពាក្យសម្ងាត់ត្រូវមានយ៉ាងតិច ៦ តួអក្សរ');
      return;
    }
    setError('');
    try {
      await register(username.trim(), email.trim(), password);
      navigate(from, { replace: true });
    } catch (err: any) {
      const d = err?.response?.data?.detail;
      const msg = typeof d === 'string'
        ? d
        : Array.isArray(d)
        ? d.map((x: any) => x.msg || JSON.stringify(x)).join('; ')
        : (d?.msg || err?.message || 'បរាជ័យក្នុងការចុះឈ្មោះគណនី');
      setError(msg);
    }
  };

  const handlePhoneRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = phoneNumber.replace(/\s+/g, '').trim();
    if (!cleanPhone) {
      setError('សូមបញ្ចូលលេខទូរសព្ទរបស់អ្នក');
      return;
    }
    setError('');
    try {
      await loginWithPhone(cleanPhone, undefined, displayName.trim() || undefined);
      navigate(from, { replace: true });
    } catch (err: any) {
      const d = err?.response?.data?.detail;
      const msg = typeof d === 'string'
        ? d
        : (d?.msg || err?.message || 'បរាជ័យក្នុងការចុះឈ្មោះជាមួយលេខទូរសព្ទ');
      setError(msg);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-8 sm:py-12 bg-[#080306] relative overflow-hidden select-none">
      {/* ── Dynamic Glowing Auroras ── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-gradient-to-br from-amber-500/20 via-red-600/15 to-transparent rounded-full blur-[150px]" />
        <div className="absolute bottom-10 left-1/4 w-80 h-80 bg-red-700/15 rounded-full blur-[110px]" />
        <div className="absolute top-10 right-10 w-72 h-72 bg-amber-400/10 rounded-full blur-[100px]" />
      </div>

      <div className="relative w-full max-w-md animate-scale-in z-10">
        {/* ── Brand Header & Logo ── */}
        <div className="text-center mb-6">
          <Link to="/" className="inline-flex items-center gap-3 group transition-transform duration-300 hover:scale-105">
            <img
              src="/logo.png"
              alt="ទស្សនារឿង"
              className="w-14 h-14 object-cover rounded-full border border-amber-500/40 drop-shadow-[0_0_25px_rgba(245,158,11,0.5)]"
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
            <div className="text-left">
              <span className="font-display font-black text-2xl sm:text-3xl text-white tracking-tight">
                ទស្សនា <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-500">រឿង</span>
              </span>
              <p className="text-[10px] text-amber-300 font-bold uppercase tracking-widest flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-400" /> Ultra HD 4K Streaming App
              </p>
            </div>
          </Link>
        </div>

        {/* ── Main Luxury Glass Card ── */}
        <div className="bg-[#15060A]/95 border border-amber-500/30 rounded-3xl p-6 sm:p-8 shadow-[0_20px_60px_rgba(0,0,0,0.85)] backdrop-blur-2xl relative overflow-hidden">
          
          <div className="text-center mb-6">
            <h1 className="font-display font-black text-xl sm:text-2xl text-white mb-1.5 tracking-tight">
              {registerMethod === 'google' ? 'ចុះឈ្មោះជាមួយ Google' : 'ចុះឈ្មោះគណនីថ្មី (App Register)'}
            </h1>
            <p className="text-xs sm:text-sm text-gray-300">
              {registerMethod === 'google'
                ? 'ចុះឈ្មោះគណនីថ្មីជាមួយ Google ដោយចុចតែ 1 ដង'
                : 'បង្កើតគណនីទស្សនា Anime & Donghua ឥតគិតថ្លៃ'}
            </p>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="p-4 mb-5 rounded-2xl bg-red-500/15 border border-red-500/40 text-red-300 text-xs font-bold text-center animate-fade-in flex items-center justify-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              <p className="text-xs font-bold">{error}</p>
            </div>
          )}

          {registerMethod === 'google' ? (
            /* ─── WEBSITE: GOOGLE 1-CLICK SIGNUP ─── */
            <div className="space-y-6 text-center">
              <div className="p-4 rounded-3xl bg-gradient-to-b from-amber-500/10 via-white/5 to-transparent border border-amber-500/40 shadow-inner flex flex-col items-center justify-center">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 mb-3 shadow-md">
                  <Play className="w-6 h-6 fill-current ml-0.5" />
                </div>
                <p className="text-xs text-amber-300 font-bold mb-4">
                  ⚡ ចុចប៊ូតុងខាងក្រោមដើម្បីបង្កើតគណនីភ្លាមៗ៖
                </p>
                <div className="w-full flex justify-center">
                  <GoogleSignInButton
                    text="signup_with"
                    onSuccess={() => navigate(from, { replace: true })}
                    onError={(msg) => setError(msg)}
                  />
                </div>
              </div>

              {/* Feature Badges */}
              <div className="pt-4 border-t border-white/10 space-y-2.5 text-xs text-gray-300 text-left">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>បង្កើតគណនី និង Login ស្វ័យប្រវត្តិតាមរយៈ Google</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Film className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>រក្សាទុកប្រវត្តិទស្សនា និងរឿងពេញចិត្ត (Bookmarks)</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Smartphone className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span>ទស្សនា Anime & Donghua កម្រិត 4K Ultra HD</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Shield className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>សុវត្ថិភាព 100% មិនបាច់ចាំពាក្យសម្ងាត់</span>
                </div>
              </div>

              {/* Optional Switch to Normal Register */}
              <div className="pt-3">
                <button
                  type="button"
                  onClick={() => { setRegisterMethod('normal'); setError(''); }}
                  className="text-[11px] text-gray-400 hover:text-amber-400 transition-colors underline"
                >
                  ចុះឈ្មោះជាមួយ Email/Password ឬលេខទូរសព្ទធម្មតា (App Mode)
                </button>
              </div>
            </div>
          ) : (
            /* ─── ANDROID APK: NORMAL REGISTER FORM ─── */
            <div className="space-y-4">
              {/* Tab Switcher: Email vs Phone */}
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-black/50 border border-white/10 rounded-2xl mb-4">
                <button
                  type="button"
                  onClick={() => { setActiveNormalTab('email'); setError(''); }}
                  className={`py-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all ${
                    activeNormalTab === 'email'
                      ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-black shadow-md'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <Mail className="w-3.5 h-3.5" /> Email Register
                </button>
                <button
                  type="button"
                  onClick={() => { setActiveNormalTab('phone'); setError(''); }}
                  className={`py-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all ${
                    activeNormalTab === 'phone'
                      ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-black shadow-md'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" /> លេខទូរសព្ទ (Phone)
                </button>
              </div>

              {activeNormalTab === 'email' ? (
                <form onSubmit={handleRegister} className="space-y-3.5 text-left">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-400 mb-1 flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-amber-400" /> ឈ្មោះគណនី (Username)
                    </label>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="ឧ. somnang99"
                      required
                      className="w-full bg-[#080306] border border-white/15 focus:border-amber-500 text-white rounded-2xl px-4 py-2.5 text-xs sm:text-sm focus:outline-none transition-all placeholder:text-gray-600"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-400 mb-1 flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5 text-amber-400" /> អាសយដ្ឋាន Email
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      required
                      className="w-full bg-[#080306] border border-white/15 focus:border-amber-500 text-white rounded-2xl px-4 py-2.5 text-xs sm:text-sm focus:outline-none transition-all placeholder:text-gray-600"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-400 mb-1 flex items-center gap-1">
                      <Lock className="w-3.5 h-3.5 text-amber-400" /> ពាក្យសម្ងាត់ (Password)
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="យ៉ាងតិច ៦ តួអក្សរ"
                        required
                        className="w-full bg-[#080306] border border-white/15 focus:border-amber-500 text-white rounded-2xl px-4 py-2.5 pr-11 text-xs sm:text-sm focus:outline-none transition-all placeholder:text-gray-600"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-amber-400 transition-colors p-1"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-400 mb-1 flex items-center gap-1">
                      <Lock className="w-3.5 h-3.5 text-amber-400" /> បញ្ជាក់ពាក្យសម្ងាត់ (Confirm Password)
                    </label>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="បញ្ចូលពាក្យសម្ងាត់ម្ដងទៀត"
                      required
                      className="w-full bg-[#080306] border border-white/15 focus:border-amber-500 text-white rounded-2xl px-4 py-2.5 text-xs sm:text-sm focus:outline-none transition-all placeholder:text-gray-600"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 text-black font-black text-sm py-3.5 rounded-2xl shadow-lg shadow-amber-500/25 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
                  >
                    {isLoading ? (
                      <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4" />
                        <span>បង្កើតគណនី (Sign Up)</span>
                      </>
                    )}
                  </button>
                </form>
              ) : (
                <form onSubmit={handlePhoneRegister} className="space-y-4 text-left">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-400 mb-1.5 flex items-center gap-1">
                      <Smartphone className="w-3.5 h-3.5 text-amber-400" /> លេខទូរសព្ទរបស់អ្នក
                    </label>
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="ឧ. 012 345 678 ឬ 098 765 432"
                      required
                      className="w-full bg-[#080306] border border-white/15 focus:border-amber-500 text-white rounded-2xl px-4 py-3 text-xs sm:text-sm focus:outline-none transition-all placeholder:text-gray-600"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-400 mb-1.5 flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-amber-400" /> ឈ្មោះគណនី (Username)
                    </label>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="ឧ. Sokha_Nami"
                      className="w-full bg-[#080306] border border-white/15 focus:border-amber-500 text-white rounded-2xl px-4 py-3 text-xs sm:text-sm focus:outline-none transition-all placeholder:text-gray-600"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 text-black font-black text-sm py-3.5 rounded-2xl shadow-lg shadow-amber-500/25 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
                  >
                    {isLoading ? (
                      <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4" />
                        <span>ចុះឈ្មោះជាមួយលេខទូរសព្ទ</span>
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* Link to Login & Switch to Google */}
              <div className="pt-4 mt-4 border-t border-white/10 text-center space-y-2">
                <p className="text-xs text-gray-400">
                  មានគណនីរួចហើយមែនទេ?{' '}
                  <Link to="/login" className="text-amber-400 hover:text-amber-300 font-bold underline ml-1">
                    ចូលប្រើប្រាស់ (Login)
                  </Link>
                </p>
                {!isNativeApp && (
                  <button
                    type="button"
                    onClick={() => { setRegisterMethod('google'); setError(''); }}
                    className="text-[11px] text-amber-400/80 hover:text-amber-300 font-semibold underline block mx-auto pt-1"
                  >
                    ← ត្រឡប់ទៅប្រើ Google 1-Click Register វិញ
                  </button>
                )}
              </div>
            </div>
          )}

        </div>

        {/* ── Back to Home ── */}
        <div className="text-center mt-6">
          <Link to="/" className="text-xs text-gray-400 hover:text-amber-400 transition-colors inline-flex items-center gap-1">
            ← ត្រឡប់ទៅទំព័រដើម (Back to Home)
          </Link>
        </div>
      </div>
    </main>
  );
}
