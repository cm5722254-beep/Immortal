import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Sparkles, CheckCircle2, AlertTriangle, Play, Smartphone,
  Lock, Eye, EyeOff, User, UserPlus
} from 'lucide-react';
import { GoogleSignInButton } from '../components/common/GoogleSignInButton';
import { useAuthStore } from '../store/authStore';
import { triggerHaptic } from '../utils/telegram';

export function RegisterPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as any)?.from || '/';

  const { registerWithPhone, isLoading } = useAuthStore();

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
      setError('សូមបញ្ចូលលេខទូរសព្ទរបស់អ្នក');
      return;
    }
    if (!password.trim()) {
      setError('សូមបញ្ចូលពាក្យសម្ងាត់');
      return;
    }
    if (password.length < 6) {
      setError('ពាក្យសម្ងាត់ត្រូវមានយ៉ាងតិច ៦ តួអក្សរ');
      return;
    }
    if (password !== confirmPassword) {
      setError('ពាក្យសម្ងាត់ទាំង ២ មិនដូចគ្នាទេ');
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
        : (d?.msg || err?.message || 'បរាជ័យក្នុងការចុះឈ្មោះគណនី');
      setError(msg);
    }
  };


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
              alt="ទស្សនារឿង"
              className="w-14 h-14 object-cover rounded-full border border-rose-500/40 drop-shadow-[0_0_25px_rgba(255,77,109,0.5)]"
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
            <div className="text-left">
              <span className="font-display font-black text-2xl sm:text-3xl text-white tracking-tight">
                ទស្សនា <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-400 via-pink-300 to-amber-300">រឿង</span>
              </span>
              <p className="text-[10px] text-rose-300 font-bold uppercase tracking-widest flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-rose-400" /> កម្មវិធីទស្សនារឿងកម្រិត 4K Ultra HD
              </p>
            </div>
          </Link>
        </div>

        {/* ── Main Luxury Glass Card ── */}
        <div className="bg-[#0e1629]/95 border border-white/10 rounded-3xl p-6 sm:p-8 shadow-[0_20px_60px_rgba(0,0,0,0.85)] backdrop-blur-2xl relative overflow-hidden">
          
          <div className="text-center mb-5">
            <h1 className="font-display font-black text-xl sm:text-2xl text-white mb-1 tracking-tight">
              បង្កើតគណនីថ្មី (Register)
            </h1>
            <p className="text-xs text-gray-300">
              ចុះឈ្មោះជាមួយលេខទូរសព្ទ និងពាក្យសម្ងាត់ងាយស្រួល
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
              <Smartphone className="w-3.5 h-3.5" /> លេខទូរសព្ទ (Phone)
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
                  <Smartphone className="w-3.5 h-3.5 text-rose-400" /> លេខទូរសព្ទរបស់អ្នក
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">
                    🇰🇭 +855
                  </span>
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="12 345 678 ឬ 012345678"
                    required
                    className="w-full bg-[#131d36] border border-white/15 focus:border-rose-500 text-white rounded-2xl pl-20 pr-4 py-2.5 text-xs sm:text-sm focus:outline-none transition-all placeholder:text-gray-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-300 mb-1 flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-rose-400" /> ឈ្មោះគណនី (Username / ឈ្មោះហៅក្រៅ) [Optional]
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
                  <Lock className="w-3.5 h-3.5 text-rose-400" /> ពាក្យសម្ងាត់ (យ៉ាងតិច ៦ តួ)
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="កំណត់ពាក្យសម្ងាត់"
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
                  <CheckCircle2 className="w-3.5 h-3.5 text-rose-400" /> ផ្ទៀងផ្ទាត់ពាក្យសម្ងាត់ម្ដងទៀត
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="បញ្ចូលពាក្យសម្ងាត់ដូចខាងលើ"
                  required
                  className="w-full bg-[#131d36] border border-white/15 focus:border-rose-500 text-white rounded-2xl px-4 py-2.5 text-xs sm:text-sm focus:outline-none transition-all placeholder:text-gray-500"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-rose-500 via-pink-500 to-rose-600 hover:from-rose-600 hover:to-pink-600 text-white font-black text-sm py-3.5 rounded-2xl shadow-lg shadow-rose-500/30 hover:scale-[1.01] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer pt-3 mt-1"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <UserPlus className="w-4 h-4 stroke-[2.5]" />
                    <span>បង្កើតគណនី (Sign Up)</span>
                  </>
                )}
              </button>

              {/* Links below: Login & Guest */}
              <div className="pt-3 border-t border-white/10 flex flex-col items-center gap-2.5 text-center text-xs">
                <p className="text-gray-400">
                  មានគណនីរួចហើយ?{' '}
                  <Link
                    to="/login"
                    state={{ from }}
                    className="text-rose-400 font-black hover:text-rose-300 underline"
                  >
                    ចូលគណនី (Sign In)
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
                  ⚡ ចុចប៊ូតុងខាងក្រោមដើម្បីបង្កើតគណនីភ្លាមៗ៖
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
            ← ត្រឡប់ទៅទំព័រដើម
          </Link>
        </div>
      </div>
    </main>
  );
}
