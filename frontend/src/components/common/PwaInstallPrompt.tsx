import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone, Sparkles, Share, PlusSquare } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export const PwaInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  useEffect(() => {
    // Check if already installed as standalone PWA
    const isRunningStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;

    setIsStandalone(isRunningStandalone);
    if (isRunningStandalone) return;

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    // Check if previously dismissed
    const dismissedUntil = localStorage.getItem('pwa_prompt_dismissed');
    if (dismissedUntil && Date.now() < parseInt(dismissedUntil, 10)) {
      return;
    }

    // Android / Chrome / Edge beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Show prompt banner with slight delay for smooth entrance
      setTimeout(() => setIsVisible(true), 2500);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Show for iOS users if not dismissed
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
    // Dismiss for 3 days
    localStorage.setItem('pwa_prompt_dismissed', (Date.now() + 3 * 24 * 60 * 60 * 1000).toString());
  };

  if (isStandalone || !isVisible) return null;

  return (
    <div className="fixed bottom-5 right-4 left-4 sm:left-auto sm:right-6 sm:w-96 z-50 animate-in fade-in slide-in-from-bottom-5 duration-500">
      <div className="relative overflow-hidden rounded-2xl bg-dark-card/95 backdrop-blur-xl border border-brand-500/30 p-4 shadow-2xl shadow-brand-950/60 ring-1 ring-white/10">
        {/* Glow ambient background */}
        <div className="absolute -top-12 -right-12 w-28 h-28 bg-brand-600/30 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-24 h-24 bg-cyan-600/20 rounded-full blur-2xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
          aria-label="Close install prompt"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-start gap-3.5">
          {/* App Icon */}
          <div className="w-12 h-12 rounded-xl bg-amber-500/20 p-0.5 flex-shrink-0 shadow-lg shadow-amber-500/25 border border-amber-500/30">
            <img
              src="/logo.png"
              alt="NAMI ANIME"
              className="w-full h-full rounded-[10px] object-contain"
            />
          </div>

          <div className="flex-1 pr-4">
            <div className="flex items-center gap-1.5">
              <h4 className="text-sm font-bold text-white tracking-wide">Install NAMI ANIME</h4>
              <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                <Sparkles className="w-2.5 h-2.5" /> App
              </span>
            </div>
            <p className="text-xs text-gray-300 mt-1 leading-relaxed">
              ដំឡើង App លើទូរស័ព្ទ ឬកុំព្យូទ័រ ដើម្បីមើលរឿង Anime & Donghua លឿនរហ័ស Full Screen!
            </p>
          </div>
        </div>

        {/* iOS specific guide modal / popover */}
        {showIOSGuide ? (
          <div className="mt-3.5 pt-3 border-t border-white/10 text-xs text-gray-200 space-y-2 bg-dark-bg/60 p-2.5 rounded-xl">
            <p className="font-semibold text-brand-300 flex items-center gap-1.5">
              <Smartphone className="w-3.5 h-3.5" /> របៀបដំឡើងលើ iPhone / iPad (Safari)៖
            </p>
            <ol className="list-decimal list-inside space-y-1 text-gray-300 text-[11px]">
              <li className="flex items-center gap-1.5">
                ចុចប៊ូតុង Share <Share className="w-3 h-3 text-cyan-400 inline" /> នៅខាងក្រោម Safari
              </li>
              <li className="flex items-center gap-1.5">
                អូសចុះក្រោម រួចជ្រើសរើស <PlusSquare className="w-3 h-3 text-brand-400 inline" />{' '}
                <span className="font-medium text-white">Add to Home Screen</span>
              </li>
              <li>
                ចុច <span className="font-medium text-white">Add</span> នៅជ្រុងខាងស្តាំលើ
              </li>
            </ol>
            <button
              onClick={() => setShowIOSGuide(false)}
              className="w-full mt-2 py-1.5 text-center text-xs text-gray-400 hover:text-white bg-white/5 rounded-lg"
            >
              យល់ព្រម
            </button>
          </div>
        ) : (
          <div className="mt-3.5 pt-3 border-t border-white/10 flex items-center justify-end gap-2">
            <button
              onClick={handleDismiss}
              className="px-3 py-1.5 text-xs font-medium text-gray-400 hover:text-white transition-colors"
            >
              ពេលក្រោយ
            </button>
            <button
              onClick={handleInstallClick}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-gradient-to-r from-brand-600 to-purple-600 hover:from-brand-500 hover:to-purple-500 text-white text-xs font-bold shadow-md shadow-brand-500/25 active:scale-95 transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              ដំឡើង App (Install)
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PwaInstallPrompt;
