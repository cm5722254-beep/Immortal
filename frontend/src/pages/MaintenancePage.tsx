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
    <div className="min-h-screen w-full bg-[#05070d] text-white flex flex-col justify-between relative overflow-hidden selection:bg-red-500/30 select-none">
      {/* Background Animated Gradient Mesh */}
      <div className="absolute inset-0 pointer-events-none">
        <div className={`absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-[120px] animate-pulse ${
          isVipMode
            ? 'bg-gradient-to-br from-amber-500/25 via-yellow-600/20 to-orange-500/10'
            : 'bg-gradient-to-br from-red-600/20 via-amber-500/15 to-purple-600/10'
        }`} />
        <div className="absolute -bottom-20 right-10 w-96 h-96 bg-cyan-600/10 rounded-full blur-[100px]" />
        {/* Subtle Cyber Grid Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)]" />
      </div>

      {/* Top Header / Branding */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg ${
            isVipMode
              ? 'bg-gradient-to-br from-amber-500 to-yellow-500 shadow-amber-500/30 text-black'
              : 'bg-gradient-to-br from-red-600 to-amber-500 shadow-red-600/30 text-white'
          }`}>
            <span className="font-black text-lg font-display">M</span>
          </div>
          <div>
            <h1 className="font-display font-black text-lg tracking-wider text-white">MER DONGHUA</h1>
            <p className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold">
              {isVipMode ? 'VIP Exclusive Access' : 'Under Development'}
            </p>
          </div>
        </div>

        {/* Admin/VIP Login Trigger */}
        <button
          onClick={() => setShowAdminLogin(!showAdminLogin)}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
            isVipMode
              ? 'bg-amber-500/15 hover:bg-amber-500/25 border-amber-500/30 text-amber-300'
              : 'bg-white/5 hover:bg-white/10 border-white/10 text-gray-300 hover:text-white'
          }`}
        >
          {isVipMode ? <Crown className="w-3.5 h-3.5 text-amber-400" /> : <Lock className="w-3.5 h-3.5 text-amber-400" />}
          <span>{showAdminLogin ? 'បិទ Login' : isVipMode ? 'ចូលគណនី VIP / Admin' : 'Admin Login'}</span>
        </button>
      </header>

      {/* Main Center Content */}
      <main className="relative z-10 w-full max-w-3xl mx-auto px-4 py-8 flex flex-col items-center text-center my-auto">
        {/* Animated Icon Shield */}
        <div className="relative mb-6">
          <div className={`absolute -inset-4 rounded-3xl blur-xl opacity-40 animate-pulse ${
            isVipMode
              ? 'bg-gradient-to-r from-amber-400 via-yellow-500 to-orange-500'
              : 'bg-gradient-to-r from-red-500 via-amber-500 to-orange-600'
          }`} />
          <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-[#0b0e18]/90 border border-white/20 shadow-2xl flex items-center justify-center">
            {isVipMode ? (
              <Crown className="w-12 h-12 sm:w-14 sm:h-14 text-amber-400 animate-pulse" />
            ) : (
              <Wrench className="w-12 h-12 sm:w-14 sm:h-14 text-amber-400 animate-bounce" />
            )}
          </div>
          <span className={`absolute -bottom-2 -right-2 px-2.5 py-1 rounded-full text-[10px] font-black tracking-wider text-white shadow-lg border border-white/20 flex items-center gap-1 ${
            isVipMode ? 'bg-amber-600' : 'bg-red-600'
          }`}>
            {isVipMode ? <Crown className="w-3 h-3 text-yellow-300" /> : <Lock className="w-3 h-3 text-yellow-300" />}
            {isVipMode ? 'VIP ONLY' : 'LOCKED'}
          </span>
        </div>

        {/* Version & Status Pill */}
        <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold mb-4 shadow-sm border ${
          isVipMode
            ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
            : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
        }`}>
          {isVipMode ? (
            <Crown className="w-3.5 h-3.5 text-amber-400" />
          ) : (
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
          )}
          <span>{isVipMode ? 'VIP Exclusive Mode' : (config.version || 'Version Upgrade')}</span>
          <span className="text-gray-500">•</span>
          <span className="text-gray-300 font-normal">
            {isVipMode ? 'បើកអោយតែសមាជិក VIP ប៉ុណ្ណោះ' : (config.eta || 'កំពុង Update ជំនាន់ថ្មី')}
          </span>
        </div>

        {/* Primary Heading */}
        <h2 className="font-display font-black text-2xl sm:text-4xl text-white tracking-tight leading-tight max-w-2xl">
          {isVipMode
            ? '👑 Website បើកសម្រាប់តែសមាជិក VIP ប៉ុណ្ណោះ'
            : (config.title || 'Website កំពុង Update ជំនាន់ថ្មី')}
        </h2>

        {/* Detailed Subtitle */}
        <p className="text-sm sm:text-base text-gray-300 mt-4 leading-relaxed font-sans max-w-xl">
          {isVipMode
            ? 'បច្ចុប្បន្ន Website កំពុងស្ថិតក្នុងដំណាក់កាលផ្ដល់សិទ្ធិពិសេសសម្រាប់តែសមាជិក VIP និង Admin។ ប្រសិនបើលោកអ្នកជាសមាជិក VIP សូម Login ដើម្បីចូលទស្សនាភ្លាមៗ ឬទំនាក់ទំនង Admin ដើម្បី Upgrade ជា VIP។'
            : (config.message || 'វេបសាយកំពុងស្ថិតក្រោមការអាប់ដេតប្រព័ន្ធ និងកែលម្អមុខងារថ្មីៗដោយ Admin/Developer។ យើងខ្ញុំបានបិទការទស្សនាជាបណ្ដោះអាសន្ន ដើម្បីធានាដំណើរការរលូន និងល្អបំផុត!')}
        </p>

        {/* Feature Highlights Grid */}
        <div className="w-full max-w-xl my-6 p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] backdrop-blur-md">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3 flex items-center justify-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-400" /> ការកែលម្អដែលនឹងមាននៅក្នុងជំនាន់ថ្មី៖
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-left text-gray-200">
            <div className="flex items-center gap-2 bg-black/30 p-2.5 rounded-xl border border-white/5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>បង្កើនល្បឿន Stream វីដេអូ</span>
            </div>
            <div className="flex items-center gap-2 bg-black/30 p-2.5 rounded-xl border border-white/5">
              <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>រូបភាពច្បាស់ Full HD 1080p</span>
            </div>
            <div className="flex items-center gap-2 bg-black/30 p-2.5 rounded-xl border border-white/5">
              <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Interface & Video Player ថ្មី</span>
            </div>
            <div className="flex items-center gap-2 bg-black/30 p-2.5 rounded-xl border border-white/5">
              <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0" />
              <span>ប្រព័ន្ធការពារសុវត្ថិភាពខ្ពស់</span>
            </div>
          </div>
        </div>

        {/* Live Status Indicator */}
        <div className="w-full max-w-md mb-6 space-y-2">
          <div className="flex items-center justify-between text-xs text-gray-400 font-semibold px-1">
            <span className="flex items-center gap-1.5 text-amber-400">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              ស្ថានភាព៖ កំពុងកែសម្រួល Code
            </span>
            <span className="text-emerald-400">{config.eta || 'ឆាប់ៗនេះ'}</span>
          </div>
          <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden p-0.5">
            <div className="h-full bg-gradient-to-r from-red-500 via-amber-400 to-emerald-400 rounded-full animate-pulse w-3/4" />
          </div>
        </div>

        {/* Telegram & Support Button */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          {config.telegram_link && (
            <a
              href={config.telegram_link}
              target="_blank"
              rel="noopener noreferrer"
              className="py-3 px-6 rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold text-sm shadow-lg shadow-sky-500/25 flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>តាមដានដំណឹងលើ Telegram</span>
              <ExternalLink className="w-3.5 h-3.5 opacity-70" />
            </a>
          )}

          <button
            onClick={() => window.location.reload()}
            className="py-3 px-6 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold text-sm flex items-center gap-2 transition-all cursor-pointer"
          >
            <RefreshCw className="w-4 h-4 text-amber-400" />
            <span>ពិនិត្យឡើងវិញ (Refresh)</span>
          </button>
        </div>

        {/* Admin Quick Login Card (Opens when clicked) */}
        {showAdminLogin && (
          <div className="w-full max-w-sm mt-8 p-5 rounded-3xl bg-[#0e121d]/95 border border-amber-500/30 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/10">
              <div className="flex items-center gap-2 text-amber-300 font-bold text-sm">
                <Shield className="w-4 h-4" />
                <span>Admin / Owner Bypass</span>
              </div>
              <span className="text-[10px] text-gray-400 font-mono">Staff Only</span>
            </div>

            <form onSubmit={handleAdminQuickLogin} className="space-y-3 text-left">
              <div>
                <label className="block text-[11px] text-gray-300 font-semibold mb-1">
                  Username ឬ Email
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin"
                  className="w-full bg-black/50 border border-white/15 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-400"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] text-gray-300 font-semibold mb-1">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-black/50 border border-white/15 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-400 pr-9"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {loginError && (
                <p className="text-[11px] text-red-400 font-semibold bg-red-500/10 border border-red-500/20 p-2 rounded-xl">
                  {loginError}
                </p>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black font-extrabold text-xs shadow-md transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Key className="w-3.5 h-3.5" />
                <span>{isLoading ? 'កំពុងផ្ទៀងផ្ទាត់...' : 'ចូលទៅកាន់ Admin'}</span>
              </button>
            </form>
          </div>
        )}
      </main>

      {/* Bottom Footer */}
      <footer className="relative z-10 w-full text-center py-4 border-t border-white/[0.06] text-xs text-gray-500 font-sans">
        © {new Date().getFullYear()} MER DONGHUA · ប្រព័ន្ធកំពុងធ្វើការអាប់ដេតដើម្បីបទពិសោធន៍ទស្សនាកាន់តែប្រសើរ
      </footer>
    </div>
  );
}
