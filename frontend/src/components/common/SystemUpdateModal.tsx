import { useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import {
  Rocket, RefreshCw, Sparkles, ShieldCheck, Zap,
  Send, X, ExternalLink, CheckCircle2, Wrench
} from 'lucide-react';
import { useSystemUpdateStore } from '../../store/systemUpdateStore';
import { useAuthStore } from '../../store/authStore';

export function SystemUpdateModal() {
  const location = useLocation();
  const { config, isDismissed, isPreviewing, fetchStatus, dismissModal, closePreview } = useSystemUpdateStore();
  const { isAdmin, isOwner } = useAuthStore();

  useEffect(() => {
    fetchStatus();
    // Poll every 30 seconds for live updates
    const timer = setInterval(() => {
      fetchStatus();
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  // Don't show in admin dashboard unless previewing
  const isInAdmin = location.pathname.startsWith('/admin');
  if (isInAdmin && !isPreviewing) return null;

  // If update mode is disabled and not previewing -> don't show
  if (!config.enabled && !isPreviewing) return null;

  // If user already dismissed it this session and allow_dismiss is true and not previewing -> don't show
  if (isDismissed && config.allow_dismiss && !isPreviewing) return null;

  const handleClose = () => {
    if (isPreviewing) {
      closePreview();
    } else if (config.allow_dismiss) {
      dismissModal();
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-300"
    >
      {/* Dynamic Ambient Backdrop with Glassmorphism */}
      <div
        className="fixed inset-0 bg-[#060810]/85 backdrop-blur-xl transition-all"
        onClick={config.allow_dismiss || isPreviewing ? handleClose : undefined}
      />

      {/* Decorative Glow Orbs */}
      <div className="fixed -top-24 left-1/2 -translate-x-1/2 w-96 h-96 bg-gradient-to-br from-red-600/25 via-amber-500/20 to-purple-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed -bottom-24 right-1/4 w-80 h-80 bg-gradient-to-tr from-cyan-500/20 to-blue-600/20 rounded-full blur-3xl pointer-events-none" />

      {/* Main Modal Card */}
      <div className="relative w-full max-w-lg bg-[#0d111a]/95 border border-white/15 rounded-3xl p-5 sm:p-7 shadow-[0_25px_70px_rgba(0,0,0,0.8)] backdrop-blur-2xl text-white overflow-hidden my-auto animate-in zoom-in-95 duration-300">
        {/* Top Accent Gradient Border Line */}
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-red-500 via-amber-400 to-cyan-400" />

        {/* Close Button (if dismissible) */}
        {(config.allow_dismiss || isPreviewing) && (
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 p-2 rounded-2xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all cursor-pointer z-10"
            title="បិទផ្ទាំងនេះ"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* Header with animated Icon */}
        <div className="flex flex-col items-center text-center mt-1">
          <div className="relative mb-4">
            {/* Pulsing ring animation */}
            <div className="absolute -inset-2 bg-gradient-to-r from-red-500 to-amber-500 rounded-3xl blur-md opacity-50 animate-pulse" />
            <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-[#1c2233] to-[#0d111a] border border-white/20 flex items-center justify-center shadow-xl">
              <Rocket className="w-8 h-8 sm:w-10 sm:h-10 text-amber-400 animate-bounce" />
            </div>
            {/* Small floating badge */}
            <span className="absolute -bottom-1 -right-2 px-2 py-0.5 rounded-full bg-red-600 text-[10px] font-black tracking-wider text-white shadow-lg flex items-center gap-1 border border-white/20">
              <Sparkles className="w-3 h-3 text-yellow-300" /> NEW
            </span>
          </div>

          {/* Version pill */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold mb-2.5">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
            <span>{config.version || 'Version Update'}</span>
            {config.eta && (
              <>
                <span className="text-gray-500">•</span>
                <span className="text-gray-300 font-normal">{config.eta}</span>
              </>
            )}
          </div>

          {/* Title */}
          <h2 className="font-display font-black text-xl sm:text-2xl text-white tracking-tight leading-snug">
            {config.title || 'Website កំពុង Update ជំនាន់ថ្មី'}
          </h2>

          {/* Subtitle / Message */}
          <p className="text-xs sm:text-sm text-gray-300 mt-2.5 leading-relaxed font-sans max-w-md">
            {config.message || 'យើងខ្ញុំកំពុងធ្វើការអាប់ដេតប្រព័ន្ធ និងបន្ថែមមុខងារថ្មីៗ ដើម្បីផ្ដល់នូវបទពិសោធន៍ទស្សនាកាន់តែរលូន និងល្អបំផុត!'}
          </p>
        </div>

        {/* Feature Highlights Card */}
        <div className="my-5 p-3.5 sm:p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] space-y-2.5">
          <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-400" /> ការកែលម្អក្នុងកំណែថ្មី (What's New):
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-200">
            <div className="flex items-center gap-2 bg-white/[0.02] p-2 rounded-xl border border-white/5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>បង្កើនល្បឿន Stream វីដេអូ</span>
            </div>
            <div className="flex items-center gap-2 bg-white/[0.02] p-2 rounded-xl border border-white/5">
              <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>រូបភាពច្បាស់ Full HD 1080p</span>
            </div>
            <div className="flex items-center gap-2 bg-white/[0.02] p-2 rounded-xl border border-white/5">
              <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Interface & Player ថ្មីស្រឡាង</span>
            </div>
            <div className="flex items-center gap-2 bg-white/[0.02] p-2 rounded-xl border border-white/5">
              <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0" />
              <span>ប្រព័ន្ធការពារសុវត្ថិភាពខ្ពស់</span>
            </div>
          </div>
        </div>

        {/* Status progress bar */}
        <div className="mb-5 space-y-1.5">
          <div className="flex items-center justify-between text-[11px] text-gray-400">
            <span className="flex items-center gap-1">
              <Wrench className="w-3 h-3 text-amber-400 animate-spin" /> ស្ថានភាព Upgrade:
            </span>
            <span className="font-bold text-emerald-400">កំពុងដំណើរការ (In Progress)</span>
          </div>
          <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden p-0.5">
            <div className="h-full bg-gradient-to-r from-red-500 via-amber-400 to-emerald-400 rounded-full animate-pulse w-4/5" />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-stretch gap-2.5">
          {config.allow_dismiss || isPreviewing ? (
            <button
              onClick={handleClose}
              className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-red-600 via-red-500 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-red-500/25 flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-yellow-200" />
              <span>យល់ព្រម & ចូលទស្សនាបន្ត</span>
            </button>
          ) : (
            <div className="flex-1 py-2.5 px-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center text-xs text-amber-300 font-medium">
              ប្រព័ន្ធកំពុងអាប់ដេត សូមរង់ចាំបន្តិច...
            </div>
          )}

          {config.telegram_link && (
            <a
              href={config.telegram_link}
              target="_blank"
              rel="noopener noreferrer"
              className="py-3 px-4 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/30 text-sky-300 hover:text-sky-200 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shrink-0 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>Telegram Channel</span>
              <ExternalLink className="w-3 h-3 opacity-60" />
            </a>
          )}
        </div>

        {/* Admin Access Quick Link */}
        {(isAdmin || isOwner) && (
          <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-gray-400">
            <span className="flex items-center gap-1 text-amber-300 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" /> អ្នកជា Admin/Owner
            </span>
            <Link
              to="/admin"
              onClick={handleClose}
              className="text-amber-400 hover:text-amber-300 underline font-semibold flex items-center gap-1"
            >
              ចូលគ្រប់គ្រង (Admin Dashboard) →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
