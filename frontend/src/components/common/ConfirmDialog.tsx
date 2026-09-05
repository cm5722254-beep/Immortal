import { useEffect } from 'react';
import { AlertTriangle, Info, AlertCircle, X } from 'lucide-react';
import { useConfirmStore } from '../../store/confirmStore';

export function ConfirmDialog() {
  const { isOpen, options, isLoading, closeConfirm } = useConfirmStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isLoading) {
        closeConfirm();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isLoading, closeConfirm]);

  if (!isOpen || !options) return null;

  const {
    title = 'Are you sure?',
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    variant = 'danger',
    onConfirm,
  } = options;

  const handleConfirm = async () => {
    closeConfirm();
    try {
      await onConfirm();
    } catch (err) {
      console.error('Confirm action error:', err);
    }
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'danger':
        return {
          icon: AlertTriangle,
          iconBg: 'bg-red-500/20 text-red-400 border-red-500/30',
          btnClass: 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white shadow-lg shadow-red-500/25',
        };
      case 'warning':
        return {
          icon: AlertCircle,
          iconBg: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
          btnClass: 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white shadow-lg shadow-amber-500/25',
        };
      default:
        return {
          icon: Info,
          iconBg: 'bg-brand-500/20 text-brand-400 border-brand-500/30',
          btnClass: 'btn-primary shadow-lg shadow-brand-500/25',
        };
    }
  };

  const { icon: Icon, iconBg, btnClass } = getVariantStyles();

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div
        className="bg-dark-card border border-dark-border/80 rounded-3xl w-full max-w-md p-6 shadow-2xl shadow-black/80 animate-scale-in relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Ambient Top Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-12 bg-brand-500/15 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-start justify-between mb-4">
          <div className={`w-12 h-12 rounded-2xl ${iconBg} border flex items-center justify-center shrink-0`}>
            <Icon className="w-6 h-6 animate-pulse" />
          </div>
          <button
            onClick={closeConfirm}
            disabled={isLoading}
            className="btn-icon text-gray-500 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div>
          <h3 className="font-display font-bold text-lg text-white mb-1.5">
            {title}
          </h3>
          <p className="text-gray-400 text-xs sm:text-sm leading-relaxed">
            {message}
          </p>
        </div>

        <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-dark-border/60">
          <button
            type="button"
            onClick={closeConfirm}
            disabled={isLoading}
            className="btn-ghost text-xs sm:text-sm py-2.5 px-4 rounded-xl text-gray-400 hover:text-white"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isLoading}
            className={`text-xs sm:text-sm font-semibold py-2.5 px-5 rounded-xl transition-all duration-200 flex items-center gap-2 ${btnClass}`}
          >
            {isLoading && (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            )}
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
