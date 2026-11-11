import { useState } from 'react';
import {
  Wrench, Shield, Send, Lock, Sparkles, RefreshCw,
  ExternalLink, Key, CheckCircle2, Eye, Crown
} from 'lucide-react';
import { useSystemUpdateStore } from '../store/systemUpdateStore';
import { useAuthStore } from '../store/authStore';

export function MaintenancePage({ isVipOnlyMode }: { isVipOnlyMode?: boolean } = {}) {
  const { config } = useSystemUpdateStore();
  const { login, isLoading } = useAuthStore();
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [showPass, setShowPass] = useState(false);

  const isVipMode = Boolean(isVipOnlyMode || config.allow_vip);

  const handleAdminQuickLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    try {
      await login(username, password);
      // If success, user state will update and maintenance screen will automatically unlock
    } catch (err: any) {
      setLoginError(err?.response?.data?.detail || 'ឈ្មោះគណនី ឬលេខសម្ងាត់មិនត្រឹមត្រូវ!');
    }
  };

  return (
    <div className="min-h-screen w-full bg-bg-base text-text-primary flex flex-col justify-between relative overflow-hidden selection:bg-blue-500/20 select-none">
      {/* Clean Aerospace Atmospheric Glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[560px] h-[560px] rounded-full blur-[120px] opacity-60 bg-blue-500/12" />
        <div className="absolute -bottom-20 right-10 w-80 h-80 bg-sky-500/10 rounded-full blur-[100px]" />
      </div>

      {/* Top Header / Branding */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-sm bg-blue-600 text-white">
            <span className="font-black text-lg font-display">M</span>
          </div>
          <div>
            <h1 className="font-display font-black text-lg tracking-wider text-slate-900">MER DONGHUA</h1>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">
              {isVipMode ? 'Authorized Access' : 'System Upgrade'}
            </p>
          </div>
        </div>

        {/* Admin Login Trigger */}
        <button
          onClick={() => setShowAdminLogin(!showAdminLogin)}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer bg-white hover:bg-slate-50 border-slate-200 text-slate-700 shadow-xs"
        >
          <Lock className="w-3.5 h-3.5 text-blue-600" />
          <span>{showAdminLogin ? 'បិទ Login' : 'Admin Login'}</span>
        </button>
      </header>

      {/* Main Center Content */}
      <main className="relative z-10 w-full max-w-3xl mx-auto px-4 py-8 flex flex-col items-center text-center my-auto">
        {/* Animated Icon Shield */}
        <div className="relative mb-6">
          <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-white border border-slate-200 shadow-lg flex items-center justify-center">
            <Wrench className="w-11 h-11 sm:w-12 sm:h-12 text-blue-600" />
          </div>
          <span className="absolute -bottom-2 -right-2 px-2.5 py-1 rounded-full text-[10px] font-black tracking-wider text-white bg-blue-600 shadow-sm border border-white flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            UPDATING
          </span>
        </div>

        {/* Version & Status Pill */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold mb-4 shadow-xs border bg-blue-50 border-blue-200 text-blue-700">
          {isVipMode ? (
            <Crown className="w-3.5 h-3.5 text-blue-600" />
          ) : (
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600" />
          )}
          <span>{isVipMode ? 'Upgrade in Progress' : (config.version || 'Version Upgrade')}</span>
          <span className="text-slate-400">•</span>
          <span className="text-slate-600 font-normal">
            {config.eta || 'កំពុង Update ជំនាន់ថ្មី'}
          </span>
        </div>

        {/* Primary Heading */}
        <h2 className="font-display font-black text-2xl sm:text-4xl text-slate-900 tracking-tight leading-tight max-w-2xl">
          {config.title || 'Website កំពុង Update ជំនាន់ថ្មី'}
        </h2>

        {/* Detailed Subtitle */}
        <p className="text-sm sm:text-base text-slate-600 mt-4 leading-relaxed font-sans max-w-xl">
          {config.message || 'វេបសាយកំពុងស្ថិតក្រោមការអាប់ដេតប្រព័ន្ធ និងកែលម្អមុខងារថ្មីៗ ដើម្បីផ្តល់បទពិសោធន៍ទស្សនាកាន់តែល្អ និងលឿនជាងមុន។'}
        </p>

        {/* Feature Highlights Grid */}
        <div className="w-full max-w-xl my-6 p-4 sm:p-5 rounded-3xl bg-white/95 border border-slate-200/80 shadow-sm backdrop-blur-md">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center justify-center gap-1.5">
            <Sparkles className="w-4 h-4 text-blue-600" /> ការកែលម្អដែលនឹងមាននៅក្នុងជំនាន់ថ្មី៖
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-left text-slate-700">
            <div className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200/70">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>បង្កើនល្បឿន Stream វីដេអូ</span>
            </div>
            <div className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200/70">
              <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
              <span>រូបភាពច្បាស់ Full HD 1080p & 4K</span>
            </div>
            <div className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200/70">
              <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0" />
              <span>រចនាបទយានអវកាស 3D ថ្មីស្អាត</span>
            </div>
            <div className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200/70">
              <CheckCircle2 className="w-4 h-4 text-purple-600 shrink-0" />
              <span>ចុចមើលភ្លាមៗ គ្មានការរំខាន</span>
            </div>
          </div>
        </div>

        {/* Live Status Indicator */}
        <div className="w-full max-w-md mb-6 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold px-1">
            <span className="flex items-center gap-1.5 text-blue-600">
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping" />
              ស្ថានភាព៖ កំពុងកែសម្រួលប្រព័ន្ធ
            </span>
            <span className="text-emerald-600 font-bold">{config.eta || 'ឆាប់ៗនេះ'}</span>
          </div>
          <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden p-0.5">
            <div className="h-full bg-gradient-to-r from-blue-600 via-sky-500 to-indigo-500 rounded-full animate-pulse w-3/4" />
          </div>
        </div>

        {/* Telegram & Support Button */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          {config.telegram_link && (
            <a
              href={config.telegram_link}
              target="_blank"
              rel="noopener noreferrer"
              className="py-3 px-6 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-sm flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>តាមដានដំណឹងលើ Telegram</span>
              <ExternalLink className="w-3.5 h-3.5 opacity-75" />
            </a>
          )}

          <button
            onClick={() => window.location.reload()}
            className="py-3 px-6 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 font-semibold text-sm flex items-center gap-2 transition-all cursor-pointer shadow-xs"
          >
            <RefreshCw className="w-4 h-4 text-blue-600" />
            <span>ពិនិត្យឡើងវិញ (Refresh)</span>
          </button>
        </div>

        {/* Admin Quick Login Card (Opens when clicked) */}
        {showAdminLogin && (
          <div className="w-full max-w-sm mt-8 p-5 rounded-3xl bg-white border border-slate-200 shadow-xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2 text-blue-600 font-bold text-sm">
                <Shield className="w-4 h-4" />
                <span>Admin / Owner Bypass</span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">Staff Only</span>
            </div>

            <form onSubmit={handleAdminQuickLogin} className="space-y-3 text-left">
              <div>
                <label className="block text-[11px] text-slate-700 font-semibold mb-1">
                  Username ឬ Email
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-700 font-semibold mb-1">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 pr-9"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {loginError && (
                <p className="text-[11px] text-red-600 font-semibold bg-red-50 border border-red-200 p-2 rounded-xl">
                  {loginError}
                </p>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Key className="w-3.5 h-3.5" />
                <span>{isLoading ? 'កំពុងផ្ទៀងផ្ទាត់...' : 'ចូលទៅកាន់ Admin'}</span>
              </button>
            </form>
          </div>
        )}
      </main>

      {/* Bottom Footer */}
      <footer className="relative z-10 w-full text-center py-4 border-t border-slate-200/80 text-xs text-slate-500 font-sans">
        © {new Date().getFullYear()} MER DONGHUA · ប្រព័ន្ធកំពុងធ្វើការអាប់ដេតដើម្បីបទពិសោធន៍ទស្សនាកាន់តែប្រសើរ
      </footer>
    </div>
  );
}
