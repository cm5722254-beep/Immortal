import { useState } from 'react';
import { 
  Crown, 
  Sparkles, 
  Send, 
  Check, 
  Calendar,
  Clock,
  Zap,
  Film,
  Tv,
  Flame,
  Gem,
  Award,
  ShieldCheck,
  CheckCircle2,
  Bell,
  ArrowRight
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { AcledaPaymentModal } from '../components/payment/AcledaPaymentModal';
import { VIPLuckyWheel } from '../components/vip/VIPLuckyWheel';

interface UpcomingPlan {
  id: string;
  name: string;
  titleKhmer: string;
  duration: string;
  days: number;
  priceUsd: number;
  priceKhr: number;
  khrText: string;
  badge?: string;
  popular?: boolean;
  theme: {
    border: string;
    glow: string;
    bg: string;
    badgeBg: string;
    accentText: string;
    icon: any;
  };
  features: string[];
}

export function VIPPage() {
  const { user, isVip } = useAuthStore();
  const [notifySubscribed, setNotifySubscribed] = useState(false);
  const [selectedPlanForPayment, setSelectedPlanForPayment] = useState<string | null>(null);
  const [showComingSoonModal, setShowComingSoonModal] = useState(false);

  const upcomingPlans: UpcomingPlan[] = [
    {
      id: '1month',
      name: 'គម្រោង ១ ខែ',
      titleKhmer: 'គម្រោង ១ ខែ (1 Month)',
      duration: '៣០ ថ្ងៃ',
      days: 30,
      priceUsd: 2.00,
      priceKhr: 8000,
      khrText: '៨,០០០',
      badge: 'សាកល្បង',
      popular: false,
      theme: {
        border: 'border-rose-500/30 hover:border-rose-400/60',
        glow: 'hover:shadow-[0_10px_35px_rgba(255,77,109,0.25)]',
        bg: 'bg-gradient-to-b from-[#1c1218]/90 via-[#130b10]/95 to-[#0a0508]/98',
        badgeBg: 'bg-rose-500/20 text-rose-300 border border-rose-500/40',
        accentText: 'text-rose-400',
        icon: Zap,
      },
      features: [
        'កម្រិតភាពច្បាស់ 4K UHD & 1080p 60FPS',
        'គ្មានពាណិជ្ជកម្ម & គ្មាន Logo បាំងអេក្រង់',
        'VIP Cloud Server ល្បឿនលឿន Bufferless',
        'ទស្សនាបានទាំង Anime & Donghua គ្រប់ភាគ',
        'Sync ប្រវត្តិទស្សនាលើគ្រប់ឧបករណ៍',
      ]
    },
    {
      id: '3month',
      name: 'គម្រោង ៣ ខែ',
      titleKhmer: 'គម្រោង ៣ ខែ (3 Months)',
      duration: '៩០ ថ្ងៃ',
      days: 90,
      priceUsd: 6.25,
      priceKhr: 25000,
      khrText: '២៥,០០០',
      badge: '★ ពេញនិយមបំផុត',
      popular: true,
      theme: {
        border: 'border-2 border-rose-400/80',
        glow: 'shadow-[0_15px_50px_rgba(255,77,109,0.35)] scale-100 lg:scale-105 z-10',
        bg: 'bg-gradient-to-b from-[#25101a]/95 via-[#180913]/95 to-[#0d040a]/98',
        badgeBg: 'bg-gradient-to-r from-rose-500 via-pink-500 to-rose-600 text-white font-black shadow-lg shadow-rose-500/40',
        accentText: 'text-rose-400',
        icon: Flame,
      },
      features: [
        'កម្រិតភាពច្បាស់ 4K UHD & 1080p 60FPS',
        'គ្មានពាណិជ្ជកម្ម & គ្មាន Logo បាំងអេក្រង់',
        'VIP Cloud Server ល្បឿនលឿន Bufferless',
        'ទស្សនាបានទាំង Anime & Donghua គ្រប់ភាគ',
        'Sync ប្រវត្តិទស្សនាលើគ្រប់ឧបករណ៍',
        'សន្សំសំចៃថវិកា និងទទួលបាន Early Access',
      ]
    },
    {
      id: '6month',
      name: 'គម្រោង ៦ ខែ',
      titleKhmer: 'គម្រោង ៦ ខែ (6 Months)',
      duration: '១៨០ ថ្ងៃ',
      days: 180,
      priceUsd: 12.50,
      priceKhr: 50000,
      khrText: '៥០,០០០',
      badge: '💎 តម្លៃពិសេស',
      popular: false,
      theme: {
        border: 'border-cyan-500/35 hover:border-cyan-400/60',
        glow: 'hover:shadow-[0_10px_35px_rgba(6,182,212,0.25)]',
        bg: 'bg-gradient-to-b from-[#0c1a24]/90 via-[#08121a]/95 to-[#04080e]/98',
        badgeBg: 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40',
        accentText: 'text-cyan-400',
        icon: Gem,
      },
      features: [
        'កម្រិតភាពច្បាស់ 4K UHD & 1080p 60FPS',
        'គ្មានពាណិជ្ជកម្ម & គ្មាន Logo បាំងអេក្រង់',
        'VIP Cloud Server ល្បឿនលឿន Bufferless',
        'ទស្សនាបានទាំង Anime & Donghua គ្រប់ភាគ',
        'Sync ប្រវត្តិទស្សនាលើគ្រប់ឧបករណ៍',
        'ទទួលបាន Badge VIP ពិសេសលើ Profile',
      ]
    },
    {
      id: '1year',
      name: 'គម្រោង ១ ឆ្នាំ',
      titleKhmer: 'គម្រោង ១ ឆ្នាំ (1 Year VIP)',
      duration: '៣៦៥ ថ្ងៃ',
      days: 365,
      priceUsd: 22.50,
      priceKhr: 90000,
      khrText: '៩០,០០០',
      badge: '👑 កំពូលសន្សំសំចៃ',
      popular: false,
      theme: {
        border: 'border-amber-500/40 hover:border-amber-400/70',
        glow: 'hover:shadow-[0_10px_35px_rgba(245,158,11,0.3)]',
        bg: 'bg-gradient-to-b from-[#24170a]/90 via-[#160e05]/95 to-[#0a0502]/98',
        badgeBg: 'bg-gradient-to-r from-amber-500/30 to-yellow-500/30 text-amber-300 border border-amber-500/50',
        accentText: 'text-amber-400',
        icon: Award,
      },
      features: [
        'កម្រិតភាពច្បាស់ 4K UHD & 1080p 60FPS',
        'គ្មានពាណិជ្ជកម្ម & គ្មាន Logo បាំងអេក្រង់',
        'VIP Cloud Server ល្បឿនលឿន Bufferless',
        'ទស្សនាបានទាំង Anime & Donghua គ្រប់ភាគ',
        'Sync ប្រវត្តិទស្សនាលើគ្រប់ឧបករណ៍',
        'តម្លៃធូរថ្លៃបំផុតពេញ ១ ឆ្នាំ (Best Value)',
      ]
    },
  ];

  const formatExpiryDate = (dateStr?: string | null) => {
    if (!dateStr) return 'មួយជីវិត (Lifetime)';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('km-KH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const handleNotifyMe = () => {
    setNotifySubscribed(true);
  };

  return (
    <main className="min-h-screen pt-24 pb-24 md:pb-16 px-4 md:px-8 max-w-7xl mx-auto animate-fade-in relative">
      {/* ── Ambient Background Glows ── */}
      <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[700px] h-[450px] bg-gradient-to-r from-rose-500/15 via-pink-500/10 to-amber-500/15 rounded-full blur-[120px] pointer-events-none -z-10" />
      <div className="absolute top-[500px] right-5 w-96 h-96 bg-rose-600/10 rounded-full blur-[100px] pointer-events-none -z-10" />
      <div className="absolute top-[800px] left-5 w-96 h-96 bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none -z-10" />

      {/* ── 1. Hero COMING SOON Banner Section ── */}
      <div className="text-center max-w-3xl mx-auto mb-14">
        
        {/* Glowing 3D Badge */}
        <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-rose-500/20 via-pink-500/20 to-rose-500/20 border border-rose-500/50 text-rose-300 text-xs md:text-sm font-black mb-6 shadow-[0_0_30px_rgba(255,77,109,0.35)] animate-pulse">
          <Clock className="w-4 h-4 text-rose-400 animate-spin" style={{ animationDuration: '6s' }} />
          <span>🚀 COMING SOON • នឹងបើកដំណើរការឆាប់ៗនេះ</span>
        </div>

        {/* 3D Animated Crown Icon with Levitation */}
        <div className="relative w-24 h-24 mx-auto mb-6 flex items-center justify-center animate-levitate">
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-tr from-rose-500 via-pink-500 to-amber-400 blur-xl opacity-60 animate-pulse" />
          <div className="relative z-10 w-20 h-20 rounded-2xl bg-gradient-to-b from-[#2a1320] to-[#12070f] border-2 border-rose-400/80 flex items-center justify-center shadow-[0_0_30px_rgba(255,77,109,0.5)] transform hover:scale-110 transition-transform duration-300">
            <Crown className="w-10 h-10 fill-rose-400 text-rose-400 drop-shadow-[0_0_12px_rgba(255,77,109,0.8)]" />
          </div>
        </div>

        {/* Main Heading */}
        <h1 className="font-display font-black text-3xl sm:text-5xl md:text-6xl text-white tracking-tight leading-tight">
          គម្រោងសមាជិក <span className="bg-gradient-to-r from-rose-400 via-pink-300 to-amber-300 bg-clip-text text-transparent drop-shadow-[0_4px_16px_rgba(255,77,109,0.4)]">VIP Member</span>
        </h1>

        <p className="text-gray-300 text-sm md:text-base mt-4 leading-relaxed max-w-2xl mx-auto">
          ប្រព័ន្ធសមាជិកភាព VIP កំពុងស្ថិតក្នុងដំណាក់កាលអភិវឌ្ឍន៍ចុងក្រោយ (Final Tuning)។ យើងនឹងបើកដំណើរការការទូទាត់ស្វ័យប្រវត្តិតាមរយៈ <strong className="text-rose-400">Bakong KHQR</strong> និងម៉ាស៊ីនបម្រើ Cloud 4K UHD ល្បឿនលឿនក្នុងពេលឆាប់ៗនេះ!
        </p>

        {/* Early Access Notification Subscription Pill */}
        <div className="mt-8 max-w-md mx-auto p-2 rounded-2xl bg-[#111827]/90 border border-rose-500/30 backdrop-blur-xl shadow-2xl flex items-center gap-2">
          {notifySubscribed ? (
            <div className="w-full py-2.5 px-4 text-emerald-400 font-bold text-xs sm:text-sm flex items-center justify-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>អរគុណ! យើងនឹងជូនដំណឹងដល់លោកអ្នកមុនគេបង្អស់។</span>
            </div>
          ) : (
            <>
              <div className="flex-1 px-3 text-left">
                <span className="text-xs text-gray-300 flex items-center gap-1.5">
                  <Bell className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                  <span>ទទួលដំណឹងពេលបើកដំណើរការ VIP</span>
                </span>
              </div>
              <button
                onClick={handleNotifyMe}
                className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-400 hover:to-pink-500 text-white font-bold text-xs shrink-0 shadow-lg shadow-rose-500/30 transition-all cursor-pointer active:scale-95 flex items-center gap-1"
              >
                <span>ជូនដំណឹងខ្ញុំ</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>

        {/* Contact Admin for Early Access Preview */}
        <div className="mt-5 text-xs text-gray-400 flex items-center justify-center gap-2">
          <span>ចង់សាកល្បងមុនគេ (Early Access)?</span>
          <a
            href={`https://t.me/watchflixanimeadmin?text=${encodeURIComponent('សួស្តី Admin ខ្ញុំចង់សាកសួរអំពីគម្រោង VIP Member (Early Access)')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-rose-400 font-bold underline hover:text-white flex items-center gap-1"
          >
            <Send className="w-3 h-3" /> Chat ជាមួយ Admin @watchflixanimeadmin
          </a>
        </div>
      </div>

      {/* ── Active VIP Status (If user is already VIP) ── */}
      {isVip && (
        <div className="mb-12 max-w-2xl mx-auto p-5 md:p-6 rounded-3xl bg-gradient-to-r from-rose-500/20 via-pink-500/15 to-transparent border border-rose-500/50 backdrop-blur-xl shadow-[0_10px_35px_rgba(255,77,109,0.25)] flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4 text-center md:text-left">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-rose-500 to-pink-400 flex items-center justify-center text-white shrink-0 shadow-lg shadow-rose-500/30">
              <Crown className="w-8 h-8 fill-white" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold border border-emerald-500/40 mb-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> គណនីរបស់អ្នកជា VIP រួចរាល់ហើយ
              </div>
              <h3 className="text-lg font-bold text-white">
                គម្រោងបច្ចុប្បន្ន: <span className="text-rose-400 uppercase">{user?.vip_plan || 'VIP MEMBER'}</span>
              </h3>
              <p className="text-xs text-gray-300 flex items-center gap-1 mt-0.5 justify-center md:justify-start">
                <Calendar className="w-3.5 h-3.5 text-gray-400" />
                ផុតកំណត់នៅថ្ងៃទី: <strong className="text-white">{formatExpiryDate(user?.vip_expires_at)}</strong>
              </p>
            </div>
          </div>

          <a
            href={`https://t.me/watchflixanimeadmin?text=${encodeURIComponent(`សួស្តី Admin ខ្ញុំចង់ពន្យារពេលគម្រោង VIP បន្ថែម សម្រាប់ Username: ${user?.username || 'Guest'}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-400 hover:to-pink-400 text-white text-xs font-black shadow-lg shadow-rose-500/20 transition flex items-center gap-2 shrink-0 cursor-pointer"
          >
            <Zap className="w-3.5 h-3.5" /> ពន្យារពេលបន្ថែម
          </a>
        </div>
      )}

      {/* ── 2. VIP LUCKY WHEEL (កង់បង្វិលសំណាង VIP) ── */}
      <section id="lucky-wheel" className="mb-16 scroll-mt-24">
        <div className="rounded-3xl p-4 sm:p-8 bg-gradient-to-b from-[#220c1a]/95 via-[#140610]/95 to-[#0a0208]/98 border-2 border-rose-500/40 shadow-[0_15px_60px_rgba(255,77,109,0.25)]">
          <VIPLuckyWheel
            onBuyVipClick={() => {
              const el = document.getElementById('vip-plans-section');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
          />
        </div>
      </section>

      {/* ── 3. VIP PLANS GRID (With Active Purchase & +1 Spin Bonus) ── */}
      <div id="vip-plans-section" className="mb-16 scroll-mt-24">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider text-rose-400 bg-rose-500/10 px-3 py-1 rounded-full border border-rose-500/20 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" /> ជាវគម្រោង VIP • ទទួលបានសិទ្ធិចាប់រង្វាន់ភ្លាមៗ
          </div>
          <h2 className="text-2xl md:text-4xl font-black text-white">
            ជ្រើសរើសគម្រោង VIP ដែលអ្នកពេញចិត្ត
          </h2>
          <p className="text-xs sm:text-sm text-gray-300 mt-1 max-w-xl mx-auto">
            រាល់ការទិញគម្រោង VIP ម្ដង ទទួលបានសិទ្ធិចាប់រង្វាន់ VIP លើ Lucky Wheel ១ លើកភ្លាមៗ!
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
          {upcomingPlans.map((plan) => {
            const IconComp = plan.theme.icon;

            return (
              <div
                key={plan.id}
                className={`relative rounded-3xl p-6 flex flex-col justify-between transition-all duration-300 backdrop-blur-2xl border ${plan.theme.border} ${plan.theme.bg} ${plan.theme.glow} hover:-translate-y-1 group tilt-3d`}
              >
                {/* Top Badge */}
                {plan.badge && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-20">
                    <span className={`text-[10px] sm:text-[11px] py-1 px-3.5 rounded-full flex items-center gap-1 uppercase tracking-wider whitespace-nowrap ${plan.theme.badgeBg}`}>
                      <Sparkles className="w-3 h-3" /> {plan.badge}
                    </span>
                  </div>
                )}

                <div>
                  {/* Plan Header */}
                  <div className="text-center pt-2 pb-5 border-b border-white/10">
                    <div className="w-12 h-12 mx-auto mb-2 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <IconComp className={`w-6 h-6 ${plan.theme.accentText}`} />
                    </div>
                    <span className={`text-xs font-bold uppercase tracking-wider ${plan.theme.accentText}`}>{plan.titleKhmer}</span>
                    <h3 className="text-xl font-black text-white mt-0.5">{plan.name}</h3>

                    {/* Pricing Display */}
                    <div className="mt-4 flex items-baseline justify-center gap-1">
                      <span className="font-display font-black text-4xl text-white tracking-tight">
                        ${plan.priceUsd.toFixed(2)}
                      </span>
                      <span className="text-xs text-gray-400 font-bold">/ {plan.duration}</span>
                    </div>

                    {/* KHR Currency Highlight */}
                    <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-black/40 border border-white/10 shadow-inner">
                      <span className="text-rose-400 font-display font-black text-sm">≈ {plan.khrText} ៛</span>
                      <span className="text-[10px] text-gray-400 font-bold">({plan.priceKhr.toLocaleString()} រៀល)</span>
                    </div>
                  </div>

                  {/* Features Checklist */}
                  <div className="py-5 space-y-3">
                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">អត្ថប្រយោជន៍គម្រោង៖</p>
                    <ul className="space-y-2.5">
                      {plan.features.map((feat, idx) => (
                        <li key={idx} className="flex items-start gap-2.5 text-xs text-left">
                          <div className="w-4 h-4 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center shrink-0 mt-0.5">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </div>
                          <span className="text-gray-300 leading-snug">{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Coming Soon Button */}
                <div className="pt-4 border-t border-white/10 space-y-2">
                  <button
                    onClick={() => setShowComingSoonModal(true)}
                    className="w-full py-3.5 px-4 rounded-2xl text-xs md:text-sm font-black flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98] bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:from-amber-400 hover:to-yellow-400 text-black shadow-amber-500/25"
                  >
                    <Clock className="w-4 h-4 text-black" />
                    <span>មកដល់ឆាប់ៗនេះ (Coming Soon)</span>
                  </button>
                  <p className="text-[10px] text-center text-amber-300/90 font-bold flex items-center justify-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-300" />
                    <span>ប្រព័ន្ធជាវ VIP កំពុងរៀបចំ នឹងសម្ពោធឆាប់ៗនេះ!</span>
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── 3. VIP Benefits Showcase (Why Upgrade?) ── */}
      <div className="p-8 md:p-10 rounded-3xl mb-12 bg-gradient-to-r from-[#170a14]/80 via-[#10060e]/90 to-[#0c0308]/90 border border-rose-500/20 shadow-2xl">
        <div className="text-center max-w-2xl mx-auto mb-8">
          <h3 className="font-display font-black text-2xl md:text-3xl text-white">
            អត្ថប្រយោជន៍ពិសេសនៃសមាជិកភាព VIP
          </h3>
          <p className="text-xs md:text-sm text-gray-400 mt-1">
            បទពិសោធន៍ទស្សនាភាពយន្តកម្រិតខ្ពស់បំផុត គ្មានការរំខាន
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex items-start gap-4 p-5 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-rose-500/30 transition-colors">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0 shadow-lg shadow-rose-500/10">
              <Film className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-white text-sm">4K Ultra HD & គ្មានស្លាកសញ្ញា (No Logo)</h4>
              <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                ទស្សនាវីដេអូច្បាស់ត្រជាក់ភ្នែក គ្មាន Watermark ឬស្លាកសញ្ញាបាំងលើអេក្រង់ឡើយ 100%។
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 p-5 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-cyan-500/30 transition-colors">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0 shadow-lg shadow-cyan-500/10">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-white text-sm">Cloud Streaming Server ល្បឿនលឿន</h4>
              <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                Server ផ្ទាល់ខ្លួនល្បឿនលឿន Bufferless ទស្សនារលូនគ្មានការទាក់ សូម្បីតែក្នុងម៉ោងមមាញឹក។
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 p-5 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-amber-500/30 transition-colors">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 shadow-lg shadow-amber-500/10">
              <Tv className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-white text-sm">Full Screen គ្រប់ឧបករណ៍ (Mobile, PC, TV)</h4>
              <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                គាំទ្រអេក្រង់ពេញលេញ 100% លើគ្រប់ Browser ទូរស័ព្ទដៃ iPad និង Smart TV ទាំងអស់។
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── 4. Early Inquiries & Admin Telegram Support ── */}
      <div className="p-8 rounded-3xl bg-gradient-to-r from-[#140b16] via-[#0d0710] to-[#120710] border border-rose-500/30 flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl">
        <div className="space-y-2 text-center md:text-left">
          <h3 className="font-display font-black text-xl text-white flex items-center justify-center md:justify-start gap-2">
            <ShieldCheck className="w-5 h-5 text-rose-400" />
            <span>ចង់សាកសួរ ឬកក់គម្រោង VIP ទុកជាមុន?</span>
          </h3>
          <p className="text-xs text-gray-300 max-w-xl leading-relaxed">
            ទាក់ទងមកកាន់ Admin តាម Telegram (@watchflixanimeadmin) ដើម្បីទទួលបានការណែនាំ ឬស្នើសុំបើកសិទ្ធិ VIP មុនគេក្នុងតម្លៃពិសេស (Early Bird Special)!
          </p>
        </div>
        <a
          href={`https://t.me/watchflixanimeadmin?text=${encodeURIComponent(`សួស្តី Admin ខ្ញុំចង់សាកសួរអំពីការជាវ VIP មុនគេ (Pre-order VIP) សម្រាប់ Username: ${user?.username || 'Guest'}`)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="py-3.5 px-8 rounded-2xl bg-gradient-to-r from-rose-500 via-pink-500 to-rose-600 hover:from-rose-400 hover:to-pink-400 text-white font-black text-xs sm:text-sm flex items-center gap-2 shadow-[0_0_25px_rgba(255,77,109,0.4)] active:scale-95 transition shrink-0 cursor-pointer"
        >
          <Send className="w-4 h-4" />
          <span>ទាក់ទង Admin @watchflixanimeadmin</span>
        </a>
      </div>

      {/* ── 5. Bakong KHQR VIP Checkout Modal ── */}
      {selectedPlanForPayment && (
        <AcledaPaymentModal
          isOpen={Boolean(selectedPlanForPayment)}
          onClose={() => setSelectedPlanForPayment(null)}
          planKey={selectedPlanForPayment}
          onPaymentSuccess={() => {
            // Grant +1 spin for user
            const storageKey = `vip_spins_${user?.id || 'guest'}`;
            const currentSpins = parseInt(localStorage.getItem(storageKey) || '0', 10);
            localStorage.setItem(storageKey, (currentSpins + 1).toString());

            setSelectedPlanForPayment(null);

            // Smooth scroll to lucky wheel
            setTimeout(() => {
              const wheelEl = document.getElementById('lucky-wheel');
              if (wheelEl) wheelEl.scrollIntoView({ behavior: 'smooth' });
            }, 600);
          }}
        />
      )}

      {/* ── Coming Soon Modal ── */}
      {showComingSoonModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-md p-6 sm:p-8 rounded-3xl bg-gradient-to-b from-[#1c0d18] via-[#120710] to-[#0a0309] border border-amber-500/40 shadow-[0_20px_60px_rgba(245,158,11,0.3)] text-center space-y-5">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-400 flex items-center justify-center text-black shadow-lg shadow-amber-500/40">
              <Crown className="w-9 h-9 fill-black" />
            </div>

            <div>
              <span className="text-xs font-black uppercase tracking-widest text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/30">
                🚀 Coming Soon • មកដល់ឆាប់ៗនេះ
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-white mt-2">
                គម្រោងសមាជិក VIP 4K UHD
              </h3>
              <p className="text-xs sm:text-sm text-gray-300 mt-2 leading-relaxed">
                មុខងារជាវ VIP តាមរយៈ KHQR (ABA, ACLEDA, Wing) កំពុងស្ថិតក្រោមការរៀបចំប្រព័ន្ធ។ សូមចូលរួមក្នុង Telegram Channel ផ្លូវការ ដើម្បីទទួលបានដំណឹងថ្ងៃសម្ពោធ និងកាដូ Discount Code បញ្ចុះតម្លៃ <strong>50%</strong> មុនគេបង្អស់!
              </p>
            </div>

            <div className="space-y-2.5 pt-2">
              <a
                href="https://t.me/animekhnotocation"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3.5 px-4 rounded-2xl font-black text-sm bg-gradient-to-r from-[#0088cc] to-[#00a2ed] hover:from-[#0077b5] hover:to-[#0091d5] text-white flex items-center justify-center gap-2 shadow-lg shadow-[#0088cc]/30 transition hover:scale-102"
              >
                <Send className="w-4 h-4 fill-white" />
                <span>ចូលរួម Telegram Channel ផ្លូវការ</span>
              </a>

              <a
                href="https://t.me/animekhanddonghuabot"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3 px-4 rounded-2xl font-bold text-xs bg-white/10 hover:bg-white/15 text-gray-200 border border-white/15 flex items-center justify-center gap-2 transition"
              >
                <span>🤖 ឆាតជាមួយ Anime Bot (@animekhanddonghuabot)</span>
              </a>

              <button
                onClick={() => setShowComingSoonModal(false)}
                className="w-full py-2.5 text-xs text-gray-400 hover:text-white transition"
              >
                បិទផ្ទាំងនេះ (Close)
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default VIPPage;
