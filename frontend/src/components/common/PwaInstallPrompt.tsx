import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone, Share, PlusSquare } from 'lucide-react';
import { useUiPreferencesStore } from '../../store/uiPreferencesStore';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export const PwaInstallPrompt: React.FC = () => {
  const hidePromos = useUiPreferencesStore((state) => state.hidePromos);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  useEffect(() => {
    const isRunningStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;

    setIsStandalone(isRunningStandalone);
    if (isRunningStandalone) return;

    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    const dismissedUntil = localStorage.getItem('pwa_prompt_dismissed');
    if (dismissedUntil && Date.now() < parseInt(dismissedUntil, 10)) {
      return;
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setTimeout(() => setIsVisible(true), 2500);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    if (isIosDevice && !isRunningStandalone) {
      setTimeout(() => setIsVisible(true), 3500);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSGuide(true);
      return;
    }

    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsVisible(false);
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem('pwa_prompt_dismissed', (Date.now() + 7 * 24 * 60 * 60 * 1000).toString());
  };

  if (isStandalone || !isVisible || hidePromos) return null;

  return (
    <div className="fixed bottom-20 sm:bottom-6 right-4 left-4 sm:left-auto sm:right-6 sm:w-[360px] z-50 animate-fade-in">
      <div className="relative overflow-hidden rounded-3xl bg-white/95 backdrop-blur-2xl border border-slate-200/90 p-4 shadow-[0_20px_50px_-10px_rgba(15,23,42,0.14)]">
        {/* Close Button */}
        <button
          onClick={handleDismiss}
          className="absolute top-3.5 right-3.5 text-slate-400 hover:text-slate-800 p-1.5 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
          aria-label="Close install prompt"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3.5">
          {/* App Icon */}
          <div className="w-12 h-12 rounded-2xl bg-slate-50 p-0.5 shrink-0 border border-slate-200/80 shadow-xs overflow-hidden">
            <img
              src="/logo.png"
              alt="MerDonghua"
              className="w-full h-full rounded-[14px] object-cover"
            />
          </div>

          <div className="flex-1 min-w-0 pr-6">
            <div className="flex items-center gap-1.5">
              <h4 className="font-display text-sm font-black text-slate-900 tracking-tight truncate">
                MerDonghua
              </h4>
              <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-200/80">
                App
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 leading-snug">
              ដំឡើងកម្មវិធីដើម្បីទស្សនាលឿនរហ័ស Full Screen
            </p>
          </div>
        </div>

        {/* iOS Safari Guide */}
        {showIOSGuide ? (
          <div className="mt-3.5 pt-3 border-t border-slate-100 text-xs text-slate-700 space-y-2 bg-slate-50/80 p-3 rounded-2xl border border-slate-200/60">
            <p className="font-bold text-slate-900 flex items-center gap-1.5">
              <Smartphone className="w-3.5 h-3.5 text-blue-600" /> របៀបដំឡើងលើ iPhone / iPad៖
            </p>
            <ol className="list-decimal list-inside space-y-1 text-slate-600 text-[11px]">
              <li className="flex items-center gap-1.5">
                ចុចប៊ូតុង Share <Share className="w-3 h-3 text-blue-600 inline" /> នៅខាងក្រោម Safari
              </li>
              <li className="flex items-center gap-1.5">
                ជ្រើសរើស <PlusSquare className="w-3 h-3 text-blue-600 inline" />{' '}
                <span className="font-semibold text-slate-900">Add to Home Screen</span>
              </li>
            </ol>
            <button
              onClick={() => setShowIOSGuide(false)}
              className="w-full mt-2 py-2 text-center text-xs font-bold text-slate-700 hover:text-slate-900 bg-white border border-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              យល់ព្រម
            </button>
          </div>
        ) : (
          <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              onClick={handleDismiss}
              className="px-3.5 py-2 rounded-full text-xs font-semibold text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              ពេលក្រោយ
            </button>
            <button
              onClick={handleInstallClick}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs active:scale-95 transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>ដំឡើង App</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PwaInstallPrompt;
