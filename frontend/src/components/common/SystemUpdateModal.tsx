import { useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import {
  Rocket, RefreshCw, ShieldCheck,
  Send, X, ExternalLink, CheckCircle2
} from 'lucide-react';
import { useSystemUpdateStore } from '../../store/systemUpdateStore';
import { useAuthStore } from '../../store/authStore';

export function SystemUpdateModal() {
  const location = useLocation();
  const { config, isDismissed, isPreviewing, fetchStatus, dismissModal, closePreview } = useSystemUpdateStore();
  const { isAdmin, isOwner } = useAuthStore();

  useEffect(() => {
    fetchStatus();
    const timer = setInterval(() => {
      fetchStatus();
    }, 30000);
    return () => clearInterval(timer);
  }, [fetchStatus]);

  const isInAdmin = location.pathname.startsWith('/admin');
  if (isInAdmin && !isPreviewing) return null;
  if (!config.enabled && !isPreviewing) return null;
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
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 overflow-y-auto animate-fade-in"
    >
      {/* iOS Frosted Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/45 backdrop-blur-md transition-all"
        onClick={config.allow_dismiss || isPreviewing ? handleClose : undefined}
      />

      {/* iOS 27 White Glass Modal Card */}
      <div className="relative w-full max-w-md bg-white/95 border border-slate-200/90 rounded-3xl p-6 sm:p-7 shadow-2xl backdrop-blur-2xl text-slate-900 overflow-hidden my-auto animate-scale-in">
        {(config.allow_dismiss || isPreviewing) && (
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 transition-all cursor-pointer z-10"
            title="បិទផ្ទាំងនេះ"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 mb-4 shadow-xs">
            <Rocket className="w-8 h-8" />
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200/80 text-blue-700 text-xs font-bold mb-3">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600" />
            <span>{config.version || 'System Update'}</span>
            {config.eta && (
              <>
                <span className="text-slate-300">•</span>
                <span className="text-slate-600 font-medium">{config.eta}</span>
              </>
            )}
          </div>

          <h2 className="font-display font-black text-xl sm:text-2xl text-slate-900 tracking-tight leading-snug">
            {config.title || 'Website កំពុង Update ជំនាន់ថ្មី'}
          </h2>

          <p className="text-xs sm:text-sm text-slate-500 mt-2 leading-relaxed max-w-sm">
            {config.message || 'យើងខ្ញុំកំពុងធ្វើការអាប់ដេតប្រព័ន្ធ និងបន្ថែមមុខងារថ្មីៗ ដើម្បីផ្ដល់នូវបទពិសោធន៍ទស្សនាកាន់តែរលូន!'}
          </p>
        </div>

        {/* Highlights */}
        <div className="my-5 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70 grid grid-cols-2 gap-2 text-xs text-slate-700 font-medium">
          <div className="flex items-center gap-2 bg-white p-2.5 rounded-xl border border-slate-200/60">
            <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
            <span>ល្បឿន Stream រហ័ស</span>
          </div>
          <div className="flex items-center gap-2 bg-white p-2.5 rounded-xl border border-slate-200/60">
            <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
            <span>កម្រិត 4K Ultra HD</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-stretch gap-2.5">
          {config.allow_dismiss || isPreviewing ? (
            <button
              onClick={handleClose}
              className="flex-1 py-3 px-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm shadow-xs flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
            >
              <span>យល់ព្រម & ចូលទស្សនាបន្ត</span>
            </button>
          ) : (
            <div className="flex-1 py-3 px-4 rounded-2xl bg-slate-100 border border-slate-200 text-center text-xs text-slate-600 font-semibold">
              ប្រព័ន្ធកំពុងអាប់ដេត សូមរង់ចាំបន្តិច...
            </div>
          )}

          {config.telegram_link && (
            <a
              href={config.telegram_link}
              target="_blank"
              rel="noopener noreferrer"
              className="py-3 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shrink-0 cursor-pointer"
            >
              <Send className="w-4 h-4 text-blue-600" />
              <span>Telegram</span>
              <ExternalLink className="w-3 h-3 text-slate-400" />
            </a>
          )}
        </div>

        {(isAdmin || isOwner) && (
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span className="flex items-center gap-1 text-slate-700 font-semibold">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600" /> Admin Access
            </span>
            <Link
              to="/admin"
              onClick={handleClose}
              className="text-blue-600 hover:text-blue-700 font-bold"
            >
              Admin Dashboard
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
