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
          iconBg: 'bg-rose-50 text-rose-600 border-rose-200',
          btnClass: 'bg-rose-600 hover:bg-rose-700 text-white shadow-xs',
        };
      case 'warning':
        return {
          icon: AlertCircle,
          iconBg: 'bg-amber-50 text-amber-600 border-amber-200',
          btnClass: 'bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-xs',
        };
      default:
        return {
          icon: Info,
          iconBg: 'bg-blue-50 text-blue-600 border-blue-200',
          btnClass: 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs',
        };
    }
  };

  const { icon: Icon, iconBg, btnClass } = getVariantStyles();

  return (
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in"
      onClick={() => !isLoading && closeConfirm()}
    >
      <div
        className="bg-white/95 backdrop-blur-2xl border border-slate-200/90 rounded-3xl w-full max-w-sm p-6 shadow-2xl animate-scale-in relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <div className={`w-11 h-11 rounded-2xl ${iconBg} border flex items-center justify-center shrink-0`}>
            <Icon className="w-5 h-5" />
          </div>
          <button
            onClick={closeConfirm}
            disabled={isLoading}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div>
          <h3 className="font-display font-black text-lg text-slate-900 mb-1.5">
            {title}
          </h3>
          <p className="text-slate-500 text-xs sm:text-sm leading-relaxed">
            {message}
          </p>
        </div>

        <div className="flex items-center justify-end gap-2.5 mt-6 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={closeConfirm}
            disabled={isLoading}
            className="text-xs sm:text-sm font-semibold py-2.5 px-4 rounded-2xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isLoading}
            className={`text-xs sm:text-sm font-bold py-2.5 px-5 rounded-2xl transition-all duration-200 flex items-center gap-2 cursor-pointer active:scale-95 ${btnClass}`}
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
