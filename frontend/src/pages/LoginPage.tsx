import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Shield, Sparkles, CheckCircle2, AlertTriangle, Play, Smartphone, Film,
  ShieldCheck, Lock, Check, Images
} from 'lucide-react';
import { GoogleSignInButton } from '../components/common/GoogleSignInButton';
import { ImageCaptchaModal } from '../components/common/ImageCaptchaModal';

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as any)?.from || '/';

  const [error, setError] = useState('');

  // Anti-Bot Protection state
  const [botVerified, setBotVerified] = useState(false);
  const [showImageCaptcha, setShowImageCaptcha] = useState(false);

  const handleOpenCaptcha = () => {
    if (botVerified) return;
    setShowImageCaptcha(true);
  };

  const handleCaptchaSuccess = () => {
    setBotVerified(true);
    setShowImageCaptcha(false);
  };

  // Unban Appeal Form states
  const [showAppeal, setShowAppeal] = useState(false);
  const [appealUsername, setAppealUsername] = useState('');
  const [appealReason, setAppealReason] = useState('');
  const [appealContact, setAppealContact] = useState('');
  const [isSubmittingAppeal, setIsSubmittingAppeal] = useState(false);
  const [appealSuccess, setAppealSuccess] = useState('');

  const handleAppealSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appealUsername.trim() || !appealReason.trim()) return;

    setIsSubmittingAppeal(true);
    try {
      const isProd = typeof window !== 'undefined' && !window.location.hostname.includes('localhost');
      const apiBase = (window as any).__VITE_API_URL__ || (isProd ? 'https://merdonghua-com.onrender.com' : 'http://localhost:8000');
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
        setAppealSuccess(data.message || 'សំណើស្នើសុំដោះសោរត្រូវបានផ្ញើទៅកាន់ Admin រួចរាល់ហើយ!');
      } else {
        setError(data.detail || 'មានបញ្ហាក្នុងការផ្ញើសំណើ');
      }
    } catch {
      setError('មិនអាចភ្ជាប់ទៅកាន់ Server បានទេ');
    } finally {
      setIsSubmittingAppeal(false);
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
                <Sparkles className="w-3 h-3 text-amber-400" /> កម្មវិធីទស្សនារឿងកម្រិត 4K Ultra HD
              </p>
            </div>
          </Link>
        </div>

        {/* ── Main Luxury Glass Card ── */}
        <div className="bg-[#15060A]/95 border border-amber-500/30 rounded-3xl p-6 sm:p-8 shadow-[0_20px_60px_rgba(0,0,0,0.85)] backdrop-blur-2xl relative overflow-hidden">
          
          <div className="text-center mb-6">
            <h1 className="font-display font-black text-xl sm:text-2xl text-white mb-1.5 tracking-tight">
              ចូលទស្សនារឿង
            </h1>
            <p className="text-xs sm:text-sm text-gray-300">
              ចូលប្រើប្រាស់ជាមួយគណនី Google របស់អ្នកដោយសុវត្ថិភាព
            </p>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="p-4 mb-5 rounded-2xl bg-red-500/15 border border-red-500/40 text-red-300 text-xs font-bold text-center animate-fade-in space-y-2">
              <div className="flex items-center justify-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                <p className="text-xs font-bold">{error}</p>
              </div>
              {(error.toLowerCase().includes('disabled') || error.toLowerCase().includes('banned') || error.toLowerCase().includes('403') || error.toLowerCase().includes('បិទ')) && (
                <div className="pt-2 border-t border-red-500/30">
                  <p className="text-[11px] text-gray-300 font-normal mb-2">
                    គណនីរបស់អ្នកត្រូវបានផ្អាកដំណើរការ។ សូមដាក់ពាក្យស្នើសុំដោះសោរទៅកាន់ Admin៖
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowAppeal(true)}
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs shadow-md transition-all active:scale-95"
                  >
                    📝 ដាក់ពាក្យស្នើសុំដោះសោរ
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
                  📝 ពាក្យស្នើសុំដោះសោរគណនី
                </span>
                <button
                  type="button"
                  onClick={() => setShowAppeal(false)}
                  className="text-xs text-gray-400 hover:text-white"
                >
                  បោះបង់
                </button>
              </div>

              {appealSuccess ? (
                <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs text-center font-bold space-y-2">
                  <p>✅ {appealSuccess}</p>
                  <p className="text-gray-300 font-normal text-[11px]">
                    Admin នឹងពិនិត្យ និងដោះសោរជូនអ្នកក្នុងពេលឆាប់ៗ!
                  </p>
                </div>
              ) : (
                <form onSubmit={handleAppealSubmit} className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-400 mb-1">
                      ឈ្មោះគណនី / Email របស់អ្នក៖
                    </label>
                    <input
                      type="text"
                      value={appealUsername}
                      onChange={(e) => setAppealUsername(e.target.value)}
                      placeholder="ឧ. your_email@gmail.com"
                      required
                      className="w-full bg-[#080306] border border-white/15 focus:border-amber-500 text-white rounded-xl px-3.5 py-2.5 text-xs focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-400 mb-1">
                      មូលហេតុស្នើសុំដោះសោរ៖
                    </label>
                    <textarea
                      value={appealReason}
                      onChange={(e) => setAppealReason(e.target.value)}
                      placeholder="ឧ. ខ្ញុំច្រឡំដៃចុច F12 / Shortcut សូម Admin ជួយដោះសោរគណនីខ្ញុំវិញផង..."
                      rows={3}
                      required
                      className="w-full bg-[#080306] border border-white/15 focus:border-amber-500 text-white rounded-xl px-3.5 py-2.5 text-xs focus:outline-none resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-400 mb-1">
                      ព័ត៌មានទំនាក់ទំនង (Telegram ឬលេខទូរស័ព្ទ) [បើមាន]៖
                    </label>
                    <input
                      type="text"
                      value={appealContact}
                      onChange={(e) => setAppealContact(e.target.value)}
                      placeholder="ឧ. @my_telegram ឬ 012345678"
                      className="w-full bg-[#080306] border border-white/15 focus:border-amber-500 text-white rounded-xl px-3.5 py-2.5 text-xs focus:outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmittingAppeal}
                    className="w-full bg-gradient-to-r from-amber-500 to-yellow-500 text-black font-black text-xs py-2.5 rounded-xl shadow-lg shadow-amber-500/20 transition-all active:scale-95 disabled:opacity-50"
                  >
                    {isSubmittingAppeal ? 'កំពុងផ្ញើសំណើ...' : '📩 ផ្ញើសំណើទៅកាន់ Admin'}
                  </button>
                </form>
              )}
            </div>
          ) : (
            /* ─── GOOGLE 1-CLICK LOGIN WITH ANTI-BOT SHIELD ─── */
            <div className="space-y-5 text-center">
              {/* Anti-Bot Verification Checkbox (Turnstile / Image Challenge Style) */}
              <div
                onClick={handleOpenCaptcha}
                className={`p-3 sm:p-3.5 rounded-2xl border transition-all duration-300 select-none cursor-pointer flex items-center justify-between text-left ${
                  botVerified
                    ? 'bg-emerald-950/30 border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.15)]'
                    : 'bg-black/60 hover:bg-black/80 border-white/15 hover:border-amber-500/50 shadow-inner group'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="relative shrink-0">
                    {botVerified ? (
                      <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-emerald-500 text-black flex items-center justify-center font-bold shadow-[0_0_12px_rgba(16,185,129,0.5)]">
                        <Check className="w-4 h-4 stroke-[3]" />
                      </div>
                    ) : (
                      <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg border-2 border-amber-400/60 group-hover:border-amber-400 bg-black/60 flex items-center justify-center transition-colors">
                        <div className="w-2 h-2 rounded-sm bg-transparent group-hover:bg-amber-400/50" />
                      </div>
                    )}
                  </div>
                  <div>
                    <p className={`text-xs sm:text-[13px] font-bold transition-colors ${
                      botVerified ? 'text-emerald-300' : 'text-gray-200 group-hover:text-amber-300'
                    }`}>
                      {botVerified
                        ? 'បានផ្ទៀងផ្ទាត់ជោគជ័យ (Verified Human)'
                        : 'ខ្ញុំមិនមែនជាមនុស្សយន្តទេ (I am not a robot)'}
                    </p>
                    <p className="text-[10px] text-gray-400 font-mono flex items-center gap-1 mt-0.5">
                      {botVerified ? (
                        'Cloud Security Verified ✓'
                      ) : (
                        <>
                          <Images className="w-3 h-3 text-amber-400" />
                          <span>ចុចទីនេះដើម្បីរើសរូបភាពផ្ទៀងផ្ទាត់</span>
                        </>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col items-end opacity-80 shrink-0 pl-2">
                  <ShieldCheck className={`w-5 h-5 ${botVerified ? 'text-emerald-400' : 'text-amber-400'}`} />
                  <span className="text-[8px] sm:text-[9px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">
                    Bot Defense
                  </span>
                </div>
              </div>

              {/* Google Sign In Container (Protected by Anti-Bot) */}
              <div className="p-4 rounded-3xl bg-gradient-to-b from-amber-500/10 via-white/5 to-transparent border border-amber-500/40 shadow-inner flex flex-col items-center justify-center relative overflow-hidden">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 mb-3 shadow-md">
                  <Play className="w-6 h-6 fill-current ml-0.5" />
                </div>
                <p className="text-xs text-amber-300 font-bold mb-4">
                  {botVerified ? '⚡ ចុចប៊ូតុងខាងក្រោមដើម្បីចូលប្រើប្រាស់ភ្លាមៗ៖' : '🔒 សូមផ្ទៀងផ្ទាត់ Anti-Bot ខាងលើជាមុនសិន'}
                </p>

                {botVerified ? (
                  <div className="w-full flex justify-center animate-scale-in">
                    <GoogleSignInButton
                      text="continue_with"
                      onSuccess={() => navigate(from, { replace: true })}
                      onError={(msg) => setError(msg)}
                    />
                  </div>
                ) : (
                  <div
                    onClick={handleOpenCaptcha}
                    className="w-full py-3 px-4 rounded-xl bg-white/5 border border-white/10 hover:border-amber-500/40 flex items-center justify-center gap-2 text-xs text-gray-400 hover:text-amber-300 cursor-pointer transition-all active:scale-95"
                  >
                    <Lock className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>ចុចរើសរូបភាពផ្ទៀងផ្ទាត់ Anti-Bot ដើម្បីដោះសោរ</span>
                  </div>
                )}
              </div>

              {/* Feature Badges */}
              <div className="pt-4 border-t border-white/10 space-y-2.5 text-xs text-gray-300 text-left">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>ចូលប្រើប្រាស់ដោយផ្ទាល់ជាមួយគណនី Google យ៉ាងរហ័ស</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Film className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>ស្វ័យប្រវត្តិចងចាំប្រវត្តិទស្សនា និងបញ្ជីរឿងទុកមើល</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Smartphone className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span>ទស្សនារឿងភាគ និងភាពយន្តកម្រិត 4K លើគ្រប់ឧបករណ៍</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Shield className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>ប្រព័ន្ធសុវត្ថិភាពខ្ពស់ និងការពារទិន្នន័យឯកជនភាព</span>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* ── Back to Home ── */}
        <div className="text-center mt-6">
          <Link to="/" className="text-xs text-gray-400 hover:text-amber-400 transition-colors inline-flex items-center gap-1">
            ← ត្រឡប់ទៅទំព័រដើម
          </Link>
        </div>
      </div>

      {/* ── Image CAPTCHA Verification Modal ── */}
      <ImageCaptchaModal
        isOpen={showImageCaptcha}
        onClose={() => setShowImageCaptcha(false)}
        onSuccess={handleCaptchaSuccess}
      />
    </main>
  );
}
