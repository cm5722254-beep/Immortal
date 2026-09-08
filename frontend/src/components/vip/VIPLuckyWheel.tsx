import { useState, useRef, useEffect } from 'react';
import confetti from 'canvas-confetti';
import {
  Sparkles,
  Trophy,
  Gift,
  Zap,
  RotateCw,
  CheckCircle2,
  X,
  Volume2,
  VolumeX,
  History,
  ShoppingBag
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

export interface PrizeItem {
  id: string;
  label: string;
  subLabel: string;
  days: number;
  color: string;
  textColor: string;
  accent: string;
  isJackpot?: boolean;
  isRiggedEligible: boolean; // Only 1, 2, 3 days are eligible for standard users
  weight: number; // Probability weight
}

// 8 Clean slices matching the user request
export const WHEEL_PRIZES: PrizeItem[] = [
  {
    id: 'vip_1day_a',
    label: 'VIP 1 ថ្ងៃ',
    subLabel: '+1 Day VIP',
    days: 1,
    color: '#e11d48', // Rose 600
    textColor: '#ffffff',
    accent: '#ffe4e6',
    isRiggedEligible: true,
    weight: 45, // 45%
  },
  {
    id: 'vip_2days',
    label: 'VIP 2 ថ្ងៃ',
    subLabel: '+2 Days VIP',
    days: 2,
    color: '#1e293b', // Dark Slate
    textColor: '#f43f5e',
    accent: '#fecdd3',
    isRiggedEligible: true,
    weight: 35, // 35%
  },
  {
    id: 'vip_3days',
    label: 'VIP 3 ថ្ងៃ',
    subLabel: '+3 Days VIP',
    days: 3,
    color: '#be123c', // Rose 700
    textColor: '#ffffff',
    accent: '#f43f5e',
    isRiggedEligible: true,
    weight: 15, // 15%
  },
  {
    id: 'vip_6days',
    label: 'VIP 6 ថ្ងៃ',
    subLabel: '+6 Days VIP',
    days: 6,
    color: '#0f172a', // Deep Blue-Black
    textColor: '#38bdf8',
    accent: '#7dd3fc',
    isRiggedEligible: false, // Visual teaser only
    weight: 0,
  },
  {
    id: 'vip_15days',
    label: 'VIP 15 ថ្ងៃ',
    subLabel: '+15 Days VIP',
    days: 15,
    color: '#831843', // Pink-Rose 900
    textColor: '#f472b6',
    accent: '#fbcfe8',
    isRiggedEligible: false, // Visual teaser only
    weight: 0,
  },
  {
    id: 'vip_1month',
    label: 'VIP 1 ខែ',
    subLabel: '+30 Days VIP',
    days: 30,
    color: '#1e1b4b', // Indigo 950
    textColor: '#fbbf24',
    accent: '#fde68a',
    isRiggedEligible: false, // Visual teaser only
    weight: 0,
  },
  {
    id: 'vip_3months',
    label: '🏆 VIP 3 ខែ',
    subLabel: 'រង្វាន់ធំ Grand Prize',
    days: 90,
    color: '#b45309', // Amber 700 / Gold
    textColor: '#ffffff',
    accent: '#fef08a',
    isJackpot: true,
    isRiggedEligible: false, // Visual grand prize teaser only
    weight: 0,
  },
  {
    id: 'vip_1day_b',
    label: 'VIP 1 ថ្ងៃ',
    subLabel: '+1 Day VIP',
    days: 1,
    color: '#334155', // Slate 700
    textColor: '#fb7185',
    accent: '#ffe4e6',
    isRiggedEligible: true,
    weight: 5, // 5%
  },
];

interface VIPLuckyWheelProps {
  onBuyVipClick?: () => void;
  isModal?: boolean;
  onClose?: () => void;
}

export function VIPLuckyWheel({ onBuyVipClick, isModal = false, onClose }: VIPLuckyWheelProps) {
  const { user, isOwner, isAdmin } = useAuthStore();
  
  // Admin or Owner role has infinite spins forever
  const hasUnlimitedSpins = Boolean(
    isOwner ||
    isAdmin ||
    user?.role === 'OWNER' ||
    user?.role === 'ADMIN' ||
    user?.username === 'cheat_admin' ||
    user?.email?.toLowerCase() === 'cm5722254@gmail.com'
  );

  // Local storage key for spin persistence
  const storageKey = `vip_spins_${user?.id || 'guest'}`;
  const historyKey = `vip_spin_history_${user?.id || 'guest'}`;

  const [spinsLeft, setSpinsLeft] = useState<number>(() => {
    if (hasUnlimitedSpins) return 999;
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? Math.max(0, parseInt(saved, 10)) : 1; // Default 1 welcome spin
    } catch {
      return 1;
    }
  });

  const [spinHistory, setSpinHistory] = useState<Array<{ prize: string; date: string; days: number }>>(() => {
    try {
      const saved = localStorage.getItem(historyKey);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [isSpinning, setIsSpinning] = useState(false);
  const [wheelRotation, setWheelRotation] = useState(0);
  const [winningPrize, setWinningPrize] = useState<PrizeItem | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [adminMode, setAdminMode] = useState<'NORMAL_RIGGED' | 'FORCE_GRAND_PRIZE'>('NORMAL_RIGGED');
  
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Sound Synthesizer via Web Audio API (100% offline & reliable)
  const playTickSound = () => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioCtx();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(620, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(140, ctx.currentTime + 0.04);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.05);
    } catch (_) {}
  };

  const playWinFanfare = () => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!audioCtxRef.current) audioCtxRef.current = new AudioCtx();
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume();

      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.1);
        gain.gain.setValueAtTime(0.2, ctx.currentTime + idx * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.1 + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.1);
        osc.stop(ctx.currentTime + idx * 0.1 + 0.4);
      });
    } catch (_) {}
  };

  // Sync spinsLeft
  useEffect(() => {
    if (!hasUnlimitedSpins) {
      localStorage.setItem(storageKey, spinsLeft.toString());
    }
  }, [spinsLeft, storageKey, hasUnlimitedSpins]);

  // Handle Wheel Spin
  const handleSpin = () => {
    if (isSpinning) return;
    if (!hasUnlimitedSpins && spinsLeft <= 0) {
      if (onBuyVipClick) {
        onBuyVipClick();
      }
      return;
    }

    setIsSpinning(true);
    setWinningPrize(null);
    setShowCelebration(false);

    // ── RIGGING ALGORITHM ──
    // User requested:
    // "តែ ពេលចាប់រង្វាន់ អោយតែចូលភាគច្រើន តែ 1DAY 2 DAY 3 DAY បាន ក្រៅ ពី ហ្នឹងមិនបាច់ ចូលទេ"
    // "ADMIN ចាប់បានរហូត"
    let targetPrizeIndex: number;

    if (hasUnlimitedSpins && adminMode === 'FORCE_GRAND_PRIZE') {
      // Admin testing grand prize
      targetPrizeIndex = 6; // VIP 3 Months
    } else {
      // Standard / regular user: MUST land ONLY on 1 Day, 2 Days, or 3 Days (slices 0, 1, 2, or 7)
      const eligibleIndices = [0, 1, 2, 7];
      const eligiblePrizes = eligibleIndices.map(idx => ({ idx, prize: WHEEL_PRIZES[idx] }));
      const totalWeight = eligiblePrizes.reduce((sum, item) => sum + item.prize.weight, 0);
      
      const rand = Math.random() * totalWeight;
      let cumulative = 0;
      targetPrizeIndex = eligibleIndices[0]; // fallback

      for (const item of eligiblePrizes) {
        cumulative += item.prize.weight;
        if (rand <= cumulative) {
          targetPrizeIndex = item.idx;
          break;
        }
      }
    }

    const sliceAngle = 360 / WHEEL_PRIZES.length; // 45 degrees

    // In SVG with -rotate-90, slice `i` center is at (i * 45 + 22.5) deg clockwise from 12 o'clock (the pointer).
    // To rotate that slice directly under the 12 o'clock pointer, the wheel must rotate clockwise by:
    // targetAngle = (360 - sliceCenter) % 360
    const sliceCenter = targetPrizeIndex * sliceAngle + (sliceAngle / 2);
    const targetAngle = (360 - sliceCenter) % 360;

    // Small random jitter within +-7 degrees (well inside the 45-deg slice) so it looks natural
    const jitter = (Math.random() - 0.5) * 14;

    // 6 full spins (2160 deg) for suspense
    const fullSpins = 360 * 6;

    // Always rotate forward from current wheelRotation
    const currentMod = wheelRotation % 360;
    const forwardDelta = ((targetAngle - currentMod) + 360) % 360;
    const finalRotation = wheelRotation + fullSpins + forwardDelta + jitter;

    setWheelRotation(finalRotation);

    // Interval ticking sound while rotating
    let tickCount = 0;
    const tickInterval = setInterval(() => {
      tickCount++;
      playTickSound();
      if (tickCount > 28) clearInterval(tickInterval);
    }, 160);

    // Stop and celebrate after 5 seconds
    setTimeout(() => {
      setIsSpinning(false);

      // Dynamically calculate the EXACT slice resting under the 12 o'clock pointer
      const normalizedStopAngle = ((360 - (finalRotation % 360)) % 360 + 360) % 360;
      const landedIndex = Math.floor(normalizedStopAngle / sliceAngle) % WHEEL_PRIZES.length;
      const actualPrize = WHEEL_PRIZES[landedIndex];

      setWinningPrize(actualPrize);
      setShowCelebration(true);
      playWinFanfare();

      // Confetti burst
      try {
        confetti({
          particleCount: 160,
          spread: 90,
          origin: { y: 0.55 },
          colors: ['#ff4d6d', '#ffd166', '#06d6a0', '#118ab2', '#ffffff'],
        });
      } catch (_) {}

      // Deduct spin if not admin
      if (!hasUnlimitedSpins) {
        setSpinsLeft((prev) => Math.max(0, prev - 1));
      }

      // Record in spin history
      const record = {
        prize: actualPrize.label,
        days: actualPrize.days,
        date: new Date().toLocaleTimeString('km-KH', { hour: '2-digit', minute: '2-digit' }),
      };
      setSpinHistory((prev) => {
        const updated = [record, ...prev].slice(0, 5);
        try {
          localStorage.setItem(historyKey, JSON.stringify(updated));
        } catch (_) {}
        return updated;
      });

      // Optimistically add won days to user's VIP expiry
      extendUserVipDays(actualPrize.days);
    }, 5000);
  };

  // Helper to extend VIP date
  const extendUserVipDays = (additionalDays: number) => {
    try {
      const currentUser = useAuthStore.getState().user;
      const currentExpiry = currentUser?.vip_expires_at
        ? new Date(currentUser.vip_expires_at)
        : new Date();
      
      const newExpiry = new Date(Math.max(Date.now(), currentExpiry.getTime()));
      newExpiry.setDate(newExpiry.getDate() + additionalDays);

      if (currentUser) {
        useAuthStore.setState({
          user: {
            ...currentUser,
            is_vip: true,
            is_vip_active: true,
            vip_expires_at: newExpiry.toISOString(),
          },
          isVip: true,
        });
      }
      localStorage.setItem('is_vip_active', 'true');
    } catch (_) {}
  };

  return (
    <div className={`relative w-full overflow-hidden ${isModal ? 'p-3 sm:p-5' : 'py-10 sm:py-14'}`}>
      
      {/* ── Header Ribbon ── */}
      <div className="text-center max-w-2xl mx-auto mb-6 sm:mb-8 px-4">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-rose-500/25 via-pink-500/20 to-amber-500/20 border border-rose-500/40 text-rose-300 text-xs font-black shadow-[0_0_20px_rgba(255,77,109,0.3)] mb-3 animate-pulse">
          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
          <span>កង់បង្វិលសំណាង VIP • ឈ្នះរហូតដល់ 3 ខែ</span>
          <Trophy className="w-3.5 h-3.5 text-yellow-400" />
        </div>

        <h2 className="font-display font-black text-2xl sm:text-4xl text-white tracking-tight leading-tight">
          ចាប់រង្វាន់ <span className="bg-gradient-to-r from-rose-400 via-pink-400 to-amber-300 bg-clip-text text-transparent">VIP LUCKY WHEEL</span>
        </h2>

        <p className="text-xs sm:text-sm text-gray-300 mt-2 leading-relaxed">
          ទិញគម្រោង VIP ម្ដង ទទួលបានសិទ្ធិចាប់រង្វាន់ ១ លើកភ្លាមៗ! ឈ្នះថ្ងៃបន្ថែម VIP ពី 1 ថ្ងៃ ដល់ 3 ខែ!
        </p>

        {/* Spins Status Pill */}
        <div className="mt-4 inline-flex flex-wrap items-center justify-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-black/60 border border-rose-500/30 backdrop-blur-md shadow-lg">
            <Gift className="w-4 h-4 text-rose-400" />
            <span className="text-xs text-gray-300 font-bold">សិទ្ធិចាប់រង្វាន់:</span>
            {hasUnlimitedSpins ? (
              <span className="text-xs font-black px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 text-black shadow-md">
                👑 ADMIN (ចាប់បានរហូត)
              </span>
            ) : (
              <span className={`text-sm font-black ${spinsLeft > 0 ? 'text-rose-400' : 'text-gray-400'}`}>
                {spinsLeft} លើក
              </span>
            )}
          </div>

          {/* Sound Toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="w-9 h-9 rounded-xl bg-black/60 border border-white/10 hover:border-rose-400/40 text-gray-300 hover:text-white flex items-center justify-center transition-all cursor-pointer"
            title={soundEnabled ? 'បិទសំឡេង' : 'បើកសំឡេង'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-rose-400" /> : <VolumeX className="w-4 h-4 text-gray-400" />}
          </button>
        </div>

        {/* Admin Secret Mode Switch (Only visible for cheat_admin / owner) */}
        {hasUnlimitedSpins && (
          <div className="mt-3 flex items-center justify-center gap-2">
            <span className="text-[10px] text-amber-300 font-bold">👑 របៀប Admin:</span>
            <button
              onClick={() => setAdminMode(adminMode === 'NORMAL_RIGGED' ? 'FORCE_GRAND_PRIZE' : 'NORMAL_RIGGED')}
              className={`text-[10px] font-black px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                adminMode === 'FORCE_GRAND_PRIZE'
                  ? 'bg-amber-500 text-black border-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.5)]'
                  : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
              }`}
            >
              {adminMode === 'FORCE_GRAND_PRIZE' ? '⚡ បង្ខំរង្វាន់ធំ (3 ខែ)' : '🎯 ធម្មតា (1-3 ថ្ងៃ)'}
            </button>
          </div>
        )}
      </div>

      {/* ── Main Wheel Stage ── */}
      <div className="relative max-w-lg mx-auto flex flex-col items-center justify-center px-4">
        
        {/* Glowing Pedestal Glow beneath the Wheel */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 sm:w-96 h-80 sm:h-96 bg-rose-500/25 blur-3xl rounded-full pointer-events-none" />

        {/* Outer Ring Chassis with Golden Lights */}
        <div className="relative w-[300px] h-[300px] sm:w-[380px] sm:h-[380px] rounded-full p-3 sm:p-4 bg-gradient-to-tr from-[#2d0f1c] via-[#1a0812] to-[#3a1224] border-4 border-rose-500/70 shadow-[0_0_50px_rgba(255,77,109,0.5),inset_0_0_30px_rgba(0,0,0,0.8)] flex items-center justify-center">
          
          {/* Outer Decorative Dots around the rim */}
          <div className="absolute inset-1 rounded-full border border-rose-400/30 pointer-events-none" />
          
          {/* Top Pointer Arrow (Triangular Needle pointing sharply down) */}
          <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-40 drop-shadow-[0_4px_12px_rgba(0,0,0,0.95)]">
            <div className={`w-0 h-0 border-l-[13px] border-l-transparent border-r-[13px] border-r-transparent border-t-[28px] border-t-amber-400 filter drop-shadow-[0_0_8px_rgba(251,191,36,0.9)] transition-transform duration-100 ${isSpinning ? 'scale-110' : ''}`} />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-white shadow-[0_0_10px_#ffffff] border-2 border-amber-400" />
          </div>

          {/* Rotating Canvas / SVG Wheel */}
          <div
            className="relative w-full h-full rounded-full overflow-hidden shadow-inner cursor-pointer select-none"
            style={{
              transform: `rotate(${wheelRotation}deg)`,
              transition: isSpinning
                ? 'transform 5s cubic-bezier(0.17, 0.97, 0.28, 1)'
                : 'none',
            }}
          >
            <svg
              viewBox="0 0 400 400"
              className="w-full h-full transform -rotate-90"
            >
              {WHEEL_PRIZES.map((prize, index) => {
                const sliceAngle = 360 / WHEEL_PRIZES.length; // 45 degrees
                const startAngle = index * sliceAngle;
                const endAngle = (index + 1) * sliceAngle;
                
                // SVG sector coordinates
                const x1 = 200 + 195 * Math.cos((Math.PI * startAngle) / 180);
                const y1 = 200 + 195 * Math.sin((Math.PI * startAngle) / 180);
                const x2 = 200 + 195 * Math.cos((Math.PI * endAngle) / 180);
                const y2 = 200 + 195 * Math.sin((Math.PI * endAngle) / 180);
                const pathData = `M 200 200 L ${x1} ${y1} A 195 195 0 0 1 ${x2} ${y2} Z`;

                // Center angle for text label
                const midAngle = startAngle + sliceAngle / 2;
                const textX = 200 + 125 * Math.cos((Math.PI * midAngle) / 180);
                const textY = 200 + 125 * Math.sin((Math.PI * midAngle) / 180);

                return (
                  <g key={prize.id}>
                    {/* Sector Slice */}
                    <path
                      d={pathData}
                      fill={prize.color}
                      stroke="#ff4d6d"
                      strokeWidth="2"
                      className="transition-colors hover:brightness-110"
                    />

                    {/* Grand Prize Highlight overlay */}
                    {prize.isJackpot && (
                      <path
                        d={pathData}
                        fill="url(#goldGradient)"
                        opacity="0.35"
                      />
                    )}

                    {/* Sector Text (Rotated towards center) */}
                    <text
                      x={textX}
                      y={textY}
                      fill={prize.textColor}
                      fontSize={prize.isJackpot ? "14" : "12"}
                      fontWeight="900"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      transform={`rotate(${midAngle + 90}, ${textX}, ${textY})`}
                      style={{
                        fontFamily: 'system-ui, -apple-system, sans-serif',
                        filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.8))',
                      }}
                    >
                      {prize.label}
                    </text>
                  </g>
                );
              })}

              <defs>
                <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#fef08a" />
                  <stop offset="50%" stopColor="#f59e0b" />
                  <stop offset="100%" stopColor="#b45309" />
                </linearGradient>
              </defs>
            </svg>
          </div>

          {/* Center Spin Hub & Action Button */}
          <div className="absolute z-30 flex items-center justify-center">
            <button
              onClick={handleSpin}
              disabled={isSpinning || (!hasUnlimitedSpins && spinsLeft <= 0)}
              className={`w-18 h-18 sm:w-22 sm:h-22 rounded-full font-display font-black text-xs sm:text-sm text-white flex flex-col items-center justify-center gap-0.5 border-4 border-amber-300 shadow-[0_0_25px_rgba(255,77,109,0.8),0_4px_15px_rgba(0,0,0,0.9)] transition-all cursor-pointer ${
                isSpinning
                  ? 'bg-gray-700 opacity-80 cursor-wait animate-pulse'
                  : (!hasUnlimitedSpins && spinsLeft <= 0)
                  ? 'bg-gradient-to-tr from-gray-700 to-gray-600 hover:opacity-90'
                  : 'bg-gradient-to-tr from-rose-600 via-pink-600 to-amber-500 hover:scale-105 active:scale-95'
              }`}
            >
              <RotateCw className={`w-5 h-5 ${isSpinning ? 'animate-spin' : ''}`} />
              <span>{isSpinning ? 'កំពុងវិល...' : 'SPIN'}</span>
              <span className="text-[9px] font-bold text-amber-200">
                {hasUnlimitedSpins ? 'គ្មានដែនកំណត់' : spinsLeft > 0 ? `${spinsLeft} លើក` : 'ទិញ VIP'}
              </span>
            </button>
          </div>

        </div>

        {/* ── Quick Action Callouts Under Wheel ── */}
        <div className="mt-6 w-full max-w-sm flex flex-col gap-2.5">
          {!hasUnlimitedSpins && spinsLeft <= 0 ? (
            <button
              onClick={onBuyVipClick}
              className="w-full py-3 px-5 rounded-2xl bg-gradient-to-r from-rose-500 via-pink-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-[0_8px_25px_rgba(255,77,109,0.35)] hover:scale-102 active:scale-98 transition cursor-pointer"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>ទិញគម្រោង VIP ដើម្បីទទួលបានសិទ្ធិចាប់រង្វាន់</span>
            </button>
          ) : (
            <button
              onClick={handleSpin}
              disabled={isSpinning}
              className="w-full py-3 px-5 rounded-2xl bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-[0_8px_25px_rgba(255,77,109,0.35)] hover:scale-102 active:scale-98 transition cursor-pointer disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>{isSpinning ? 'កំពុងបង្វិល...' : 'ចុចបង្វិលចាប់រង្វាន់ឥឡូវនេះ (SPIN)'}</span>
            </button>
          )}

          {/* Rules / Hint */}
          <p className="text-[11px] text-gray-400 text-center leading-relaxed">
            * គណនី Admin មានសិទ្ធិចាប់រង្វាន់គ្មានដែនកំណត់។ រាល់ការជាវគម្រោង VIP ទទួលបានសិទ្ធិចាប់រង្វាន់ ១ លើក។
          </p>
        </div>

        {/* ── Recent Spin History ── */}
        {spinHistory.length > 0 && (
          <div className="mt-6 w-full max-w-sm rounded-2xl bg-black/40 border border-white/10 p-3.5 backdrop-blur-md">
            <div className="flex items-center gap-1.5 text-xs font-bold text-gray-300 mb-2">
              <History className="w-3.5 h-3.5 text-rose-400" />
              <span>ប្រវត្តិចាប់រង្វាន់ថ្មីៗរបស់អ្នក:</span>
            </div>
            <div className="space-y-1.5">
              {spinHistory.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs py-1 px-2.5 rounded-lg bg-white/5">
                  <span className="text-white font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    <span>ឈ្នះ {item.prize}</span>
                  </span>
                  <span className="text-[10px] text-gray-400 font-mono">{item.date}</span>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* ── WINNING CELEBRATION MODAL ── */}
      {showCelebration && winningPrize && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-sm rounded-3xl p-6 sm:p-8 bg-gradient-to-b from-[#2a0e1c] via-[#180812] to-[#0c0308] border-2 border-rose-500/80 shadow-[0_0_60px_rgba(255,77,109,0.6)] text-center animate-zoom-3d">
            
            {/* Close button */}
            <button
              onClick={() => setShowCelebration(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white flex items-center justify-center transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Trophy Icon */}
            <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-tr from-amber-400 via-rose-500 to-pink-500 p-0.5 shadow-[0_0_30px_rgba(255,77,109,0.7)] animate-bounce">
              <div className="w-full h-full rounded-[22px] bg-[#1a0812] flex items-center justify-center">
                <Trophy className="w-10 h-10 text-amber-300 fill-amber-300/30" />
              </div>
            </div>

            {/* Winning Headline */}
            <h3 className="font-display font-black text-2xl text-white mt-4 tracking-tight">
              🎉 អបអរសាទរ!
            </h3>
            <p className="text-xs text-gray-300 mt-1">
              អ្នកបានឈ្នះរង្វាន់ពីកង់បង្វិលសំណាង VIP
            </p>

            {/* Prize Highlight Box */}
            <div className="my-5 p-4 rounded-2xl bg-gradient-to-r from-rose-500/20 via-pink-500/20 to-amber-500/20 border border-rose-500/50 shadow-inner">
              <span className="text-xs font-bold uppercase text-rose-300 tracking-wider">រង្វាន់ដែលទទួលបាន</span>
              <div className="text-3xl font-black text-white mt-1 drop-shadow-[0_2px_10px_rgba(255,77,109,0.8)]">
                {winningPrize.label}
              </div>
              <p className="text-xs text-emerald-400 font-bold mt-1.5 flex items-center justify-center gap-1">
                <Zap className="w-3.5 h-3.5" />
                <span>បានបន្ថែម {winningPrize.days} ថ្ងៃ ទៅក្នុងគណនី VIP របស់អ្នកភ្លាមៗ!</span>
              </p>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-2">
              <button
                onClick={() => {
                  setShowCelebration(false);
                  if (hasUnlimitedSpins || spinsLeft > 0) {
                    setTimeout(() => handleSpin(), 300);
                  }
                }}
                disabled={!hasUnlimitedSpins && spinsLeft <= 0}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white font-black text-xs sm:text-sm shadow-lg shadow-rose-500/30 transition cursor-pointer disabled:opacity-50"
              >
                {hasUnlimitedSpins || spinsLeft > 0 ? 'បង្វិលម្ដងទៀត (Spin Again)' : 'សិទ្ធិចាប់រង្វាន់អស់ហើយ'}
              </button>

              <button
                onClick={() => {
                  setShowCelebration(false);
                  if (onClose) onClose();
                }}
                className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-gray-300 hover:text-white font-bold text-xs transition cursor-pointer"
              >
                រួចរាល់ (Done)
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
