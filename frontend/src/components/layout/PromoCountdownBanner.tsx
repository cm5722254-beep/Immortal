import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Crown, ArrowRight, Flame, Clock, X } from 'lucide-react';
import { usePromoStore } from '../../store/promoStore';
import { useAuthStore } from '../../store/authStore';

export function PromoCountdownBanner() {
  const { promoData, fetchPromoCountdown, tickCountdown } = usePromoStore();
  const { user } = useAuthStore();
  const [isDismissed, setIsDismissed] = useState(() => {
    return sessionStorage.getItem('nami_promo_dismissed') === 'true';
  });
  const isVipUser = !!user && (user.role === 'ADMIN' || user.is_vip_active || user.is_vip);

  const handleDismiss = () => {
    setIsDismissed(true);
    sessionStorage.setItem('nami_promo_dismissed', 'true');
  };

  useEffect(() => {
    fetchPromoCountdown();
  }, [fetchPromoCountdown]);

  // Real-time ticking interval every 1 second
  useEffect(() => {
    const timer = setInterval(() => {
      tickCountdown();
    }, 1000);
    return () => clearInterval(timer);
  }, [tickCountdown]);

  if (!promoData || isDismissed) return null;


  const isLocked = promoData.is_vip_locked || promoData.is_expired;

  // Format numbers to two digits
  const pad = (n: number) => String(Math.max(0, n)).padStart(2, '0');

  if (isLocked) {
    if (isVipUser) return null; // Don't annoy VIP users with expired lock banner

    return (
      <div className="w-full bg-gradient-to-r from-red-950 via-[#20070e] to-red-950 border-b border-red-500/40 text-white px-3 py-2 text-xs relative z-40 shadow-[0_4px_20px_rgba(220,38,38,0.25)]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 shrink-0 animate-pulse">
              <Crown className="w-3.5 h-3.5 fill-red-400" />
            </div>
            <div>
              <span className="font-bold text-red-400">ផុតកំណត់ ៧ ថ្ងៃឥតគិតថ្លៃ៖</span>{' '}
              <span className="text-gray-200">
                រាល់រឿងទាំងអស់ត្រូវបានដាក់ <strong className="text-amber-400">VIP</strong>។ ទាល់តែ Admin កំណត់ VIP ទើបអាចទស្សនាបាន!
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/vip"
              className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 text-black font-black text-[11px] shadow-lg shadow-amber-500/20 hover:scale-105 transition-all"
            >
              <Crown className="w-3 h-3 fill-black" /> ដំឡើង VIP ឥឡូវនេះ ($1.50) <ArrowRight className="w-3 h-3" />
            </Link>
            <button
              onClick={handleDismiss}
              className="p-1 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
              title="Close banner"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Active Promo Countdown (7-Day Free Watch Promo)
  return (
    <div className="w-full bg-[#0d111a]/95 border-b border-amber-500/20 text-white px-3 py-1.5 text-xs relative z-40 backdrop-blur-md">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
        {/* Left: Message */}
        <div className="flex items-center gap-2 min-w-0 truncate">
          <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
            <Flame className="w-2.5 h-2.5 sm:w-3 sm:h-3 fill-amber-400 text-amber-400" />
          </div>
          <p className="text-gray-300 text-[11px] truncate">
            <span className="bg-amber-500/20 text-amber-300 font-bold px-1.5 py-0.2 rounded text-[9px] uppercase mr-1 inline-block">
              ប្រូម៉ូសិនពិសេស
            </span>
            <span className="hidden sm:inline">ទស្សនាឥតគិតថ្លៃ! ពេលផុតកំណត់ ៧ ថ្ងៃ រឿងទាំងអស់នឹងជាប់ VIP</span>
          </p>
        </div>

        {/* Right: Live Real Countdown Timer & VIP Link & Close */}
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="flex items-center gap-1 bg-black/50 px-2 py-0.5 rounded-lg border border-white/10 font-mono text-[10px] sm:text-[11px]">
            <Clock className="w-3 h-3 text-amber-400 mr-0.5" />
            <span className="text-amber-300 font-bold">
              {pad(promoData.days)}ថ្ងៃ {pad(promoData.hours)}ម៉:{pad(promoData.minutes)}ន:{pad(promoData.seconds)}វ
            </span>
          </div>

          <Link
            to="/vip"
            className="hidden md:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 text-black font-black text-[10px] hover:brightness-110 shadow-sm transition-all"
          >
            <Sparkles className="w-2.5 h-2.5 fill-black" /> VIP
          </Link>

          <button
            onClick={handleDismiss}
            className="p-1 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-colors ml-0.5 cursor-pointer"
            title="Close banner"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
