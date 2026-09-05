import { 
  Crown, 
  CheckCircle2, 
  ShieldCheck, 
  Zap, 
  Film, 
  Tv, 
  Sparkles, 
  Send, 
  Check, 
  Calendar,
  MessageCircleQuestion,
  ExternalLink,
  Flame,
  Gem,
  Award
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';

interface Plan {
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
    btnBg: string;
    btnText: string;
    accentText: string;
    icon: any;
  };
  features: string[];
}

export function VIPPage() {
  const { user, isVip } = useAuthStore();

  const plans: Plan[] = [
    {
      id: '1month',
      name: '1 Month Plan',
      titleKhmer: 'គម្រោង ១ ខែ',
      duration: '៣០ ថ្ងៃ',
      days: 30,
      priceUsd: 2.00,
      priceKhr: 8000,
      khrText: '៨,០០០',
      badge: 'សាកល្បង',
      popular: false,
      theme: {
        border: 'border-rose-500/30 hover:border-rose-400/60',
        glow: 'hover:shadow-[0_10px_35px_rgba(244,63,94,0.2)]',
        bg: 'bg-gradient-to-b from-[#1c1218]/90 via-[#130b10]/95 to-[#0a0508]/98',
        badgeBg: 'bg-rose-500/20 text-rose-300 border border-rose-500/40',
        btnBg: 'bg-gradient-to-r from-rose-600 via-pink-600 to-rose-600 hover:from-rose-500 hover:to-pink-500',
        btnText: 'text-white',
        accentText: 'text-rose-400',
        icon: Zap,
      },
      features: [
        'ទស្សនា 4K UHD & 1080p Full HD',
        'គ្មានផ្ទាំង Logo / Watermark បាំង',
        'VIP Cloud Server ល្បឿនលឿន Bufferless',
        'ទស្សនាបានទាំង Anime & Donghua ទាំងអស់',
        'Sync ប្រវត្តិទស្សនាលើគ្រប់ឧបករណ៍',
      ]
    },
    {
      id: '3month',
      name: '3 Months Plan',
      titleKhmer: 'គម្រោង ៣ ខែ',
      duration: '៩០ ថ្ងៃ',
      days: 90,
      priceUsd: 6.25,
      priceKhr: 25000,
      khrText: '២៥,០០០',
      badge: '★ ពេញនិយមបំផុត (Popular)',
      popular: true,
      theme: {
        border: 'border-2 border-amber-400',
        glow: 'shadow-[0_15px_50px_rgba(245,158,11,0.4)] scale-100 lg:scale-105 z-10',
        bg: 'bg-gradient-to-b from-[#2a1a0c]/95 via-[#1a0f08]/95 to-[#0f0703]/98',
        badgeBg: 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-black font-black shadow-lg shadow-amber-500/40',
        btnBg: 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 shadow-[0_8px_25px_rgba(245,158,11,0.5)]',
        btnText: 'text-black font-black',
        accentText: 'text-amber-400',
        icon: Flame,
      },
      features: [
        'ទស្សនា 4K UHD & 1080p Full HD',
        'គ្មានផ្ទាំង Logo / Watermark បាំង',
        'VIP Cloud Server ល្បឿនលឿន Bufferless',
        'ទស្សនាបានទាំង Anime & Donghua ទាំងអស់',
        'Sync ប្រវត្តិទស្សនាលើគ្រប់ឧបករណ៍',
        'សន្សំសំចៃពេលវេលា និងថវិកា',
      ]
    },
    {
      id: '6month',
      name: '6 Months Plan',
      titleKhmer: 'គម្រោង ៦ ខែ',
      duration: '១៨០ ថ្ងៃ',
      days: 180,
      priceUsd: 12.50,
      priceKhr: 50000,
      khrText: '៥០,០០០',
      badge: '💎 តម្លៃពិសេស (Special)',
      popular: false,
      theme: {
        border: 'border-cyan-500/35 hover:border-cyan-400/60',
        glow: 'hover:shadow-[0_10px_35px_rgba(6,182,212,0.25)]',
        bg: 'bg-gradient-to-b from-[#0c1a24]/90 via-[#08121a]/95 to-[#04080e]/98',
        badgeBg: 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40',
        btnBg: 'bg-gradient-to-r from-cyan-600 via-sky-600 to-cyan-600 hover:from-cyan-500 hover:to-sky-500',
        btnText: 'text-white font-black',
        accentText: 'text-cyan-400',
        icon: Gem,
      },
      features: [
        'ទស្សនា 4K UHD & 1080p Full HD',
        'គ្មានផ្ទាំង Logo / Watermark បាំង',
        'VIP Cloud Server ល្បឿនលឿន Bufferless',
        'ទស្សនាបានទាំង Anime & Donghua ទាំងអស់',
        'Sync ប្រវត្តិទស្សនាលើគ្រប់ឧបករណ៍',
        'ទទួលបាន Badge VIP ពិសេសលើ Profile',
      ]
    },
    {
      id: '1year',
      name: '1 Year Plan',
      titleKhmer: 'គម្រោង ១ ឆ្នាំ',
      duration: '៣៦៥ ថ្ងៃ',
      days: 365,
      priceUsd: 22.50,
      priceKhr: 90000,
      khrText: '៩០,០០០',
      badge: '👑 ល្អបំផុត (Best Value)',
      popular: false,
      theme: {
        border: 'border-purple-500/40 hover:border-purple-400/70',
        glow: 'hover:shadow-[0_10px_35px_rgba(168,85,247,0.3)]',
        bg: 'bg-gradient-to-b from-[#1f102b]/90 via-[#14081d]/95 to-[#0a030f]/98',
        badgeBg: 'bg-gradient-to-r from-purple-500/30 to-pink-500/30 text-purple-300 border border-purple-500/50',
        btnBg: 'bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:from-purple-500 hover:to-indigo-500',
        btnText: 'text-white font-black',
        accentText: 'text-purple-400',
        icon: Award,
      },
      features: [
        'ទស្សនា 4K UHD & 1080p Full HD',
        'គ្មានផ្ទាំង Logo / Watermark បាំង',
        'VIP Cloud Server ល្បឿនលឿន Bufferless',
        'ទស្សនាបានទាំង Anime & Donghua ទាំងអស់',
        'Sync ប្រវត្តិទស្សនាលើគ្រប់ឧបករណ៍',
        'តម្លៃធូរថ្លៃបំផុតពេញ ១ ឆ្នាំ (សន្សំសំចៃ)',
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

  return (
    <main className="min-h-screen pt-24 pb-24 md:pb-16 px-4 md:px-8 max-w-7xl mx-auto animate-fade-in relative">
      {/* Ambient background glows */}
      <div className="absolute top-12 left-1/2 -translate-x-1/2 w-[600px] h-96 bg-gradient-to-r from-amber-500/15 via-yellow-500/10 to-purple-600/15 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute top-80 right-10 w-96 h-96 bg-red-600/10 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute top-[600px] left-10 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* Header Banner */}
      <div className="text-center max-w-3xl mx-auto mb-10">
        <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-gradient-to-r from-amber-500/20 via-yellow-500/20 to-amber-500/20 border border-amber-500/50 text-amber-300 text-xs md:text-sm font-black mb-4 shadow-[0_0_25px_rgba(245,158,11,0.25)] animate-pulse">
          <Crown className="w-4 h-4 fill-amber-400 text-amber-400" /> សមាជិក VIP EXCLUSIVE MEMBER
        </div>
        <h1 className="font-display font-black text-3xl md:text-5xl lg:text-6xl text-white tracking-tight leading-tight">
          ជ្រើសរើសគម្រោង <span className="bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 bg-clip-text text-transparent">VIP Member</span>
        </h1>
        <p className="text-gray-300 text-sm md:text-base mt-4 leading-relaxed max-w-2xl mx-auto">
          ទស្សនាភាពយន្តភាគ និង Anime កម្រិត <strong className="text-amber-400">4K Ultra HD</strong> គ្មាន Logo បាំងលើអេក្រង់ ជាមួយ Cloud Server ល្បឿនលឿនបំផុត!
        </p>

        {/* Telegram Subscription Quick Guide Banner */}
        <div className="mt-6 p-4 md:p-5 rounded-3xl bg-gradient-to-r from-[#0d1b2a]/90 via-[#101424]/95 to-[#1c1328]/90 border border-sky-500/40 text-sky-200 text-xs md:text-sm font-semibold shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4 backdrop-blur-xl">
          <div className="flex items-center gap-3 text-left">
            <div className="w-10 h-10 rounded-2xl bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-400 shrink-0">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-white text-sm">របៀបជាវ VIP យ៉ាងងាយស្រួល & ឆាប់រហ័ស៖</p>
              <p className="text-xs text-gray-300 mt-0.5">ជ្រើសរើសគម្រោងខាងក្រោម រួចចុចផ្ញើសារទៅកាន់ Admin <a href="https://t.me/Huang404" target="_blank" rel="noopener noreferrer" className="text-amber-400 font-bold underline hover:text-white">@Huang404</a> តាម Telegram ដើម្បីបើកសិទ្ធិភ្លាមៗ!</p>
            </div>
          </div>
          <a
            href="https://t.me/Huang404"
            target="_blank"
            rel="noopener noreferrer"
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-black text-xs shrink-0 shadow-lg shadow-sky-500/30 flex items-center gap-1.5 transition"
          >
            <Send className="w-3.5 h-3.5" /> Chat ជាមួយ Admin
          </a>
        </div>
      </div>

      {/* Active VIP Status Banner (If User is already VIP) */}
      {isVip && (
        <div className="mb-12 max-w-2xl mx-auto p-5 md:p-6 rounded-3xl bg-gradient-to-r from-amber-500/20 via-yellow-500/15 to-transparent border border-amber-500/50 backdrop-blur-xl shadow-[0_10px_35px_rgba(245,158,11,0.2)] flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4 text-center md:text-left">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-400 flex items-center justify-center text-black shrink-0 shadow-lg shadow-amber-500/30">
              <Crown className="w-8 h-8 fill-black" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold border border-emerald-500/40 mb-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> គណនីរបស់អ្នកជា VIP រួចរាល់ហើយ
              </div>
              <h3 className="text-lg font-bold text-white">
                គម្រោងបច្ចុប្បន្ន: <span className="text-amber-400 uppercase">{user?.vip_plan || '1 MONTH VIP'}</span>
              </h3>
              <p className="text-xs text-gray-300 flex items-center gap-1 mt-0.5 justify-center md:justify-start">
                <Calendar className="w-3.5 h-3.5 text-gray-400" />
                ផុតកំណត់នៅថ្ងៃទី: <strong className="text-white">{formatExpiryDate(user?.vip_expires_at)}</strong>
              </p>
            </div>
          </div>

          <a
            href={`https://t.me/Huang404?text=${encodeURIComponent(`សួស្តី Admin ខ្ញុំចង់ពន្យារពេលគម្រោង VIP បន្ថែម សម្រាប់ Username: ${user?.username || 'Guest'}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-black text-xs font-black shadow-lg shadow-amber-500/20 transition flex items-center gap-2 shrink-0 cursor-pointer"
          >
            <Zap className="w-3.5 h-3.5" /> ពន្យារពេលបន្ថែម (Extend Plan)
          </a>
        </div>
      )}

      {/* ── 4 VIP PLANS GRID (1 Month, 3 Months, 6 Months, 1 Year) ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12 items-stretch">
        {plans.map((plan) => {
          const telegramMessage = `សួស្តី Admin ខ្ញុំចង់ជាវគម្រោង ${plan.titleKhmer} (${plan.name}) $${plan.priceUsd.toFixed(2)} (${plan.khrText} ៛) សម្រាប់ Username: ${user?.username || 'Guest'}`;
          const telegramUrl = `https://t.me/Huang404?text=${encodeURIComponent(telegramMessage)}`;
          const IconComp = plan.theme.icon;

          return (
            <div
              key={plan.id}
              className={`relative rounded-3xl p-6 flex flex-col justify-between transition-all duration-300 backdrop-blur-2xl border ${plan.theme.border} ${plan.theme.bg} ${plan.theme.glow} hover:-translate-y-1`}
            >
              {/* Top Popular / Value Badge */}
              {plan.badge && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span className={`text-[11px] py-1 px-4 rounded-full flex items-center gap-1 uppercase tracking-wider whitespace-nowrap ${plan.theme.badgeBg}`}>
                    <Sparkles className="w-3 h-3" /> {plan.badge}
                  </span>
                </div>
              )}

              <div>
                {/* Plan Header */}
                <div className="text-center pt-2 pb-5 border-b border-white/10">
                  <div className="w-12 h-12 mx-auto mb-2 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                    <IconComp className={`w-6 h-6 ${plan.theme.accentText}`} />
                  </div>
                  <span className={`text-xs font-bold uppercase tracking-wider ${plan.theme.accentText}`}>{plan.titleKhmer}</span>
                  <h2 className="text-xl font-black text-white mt-0.5">{plan.name}</h2>

                  {/* Pricing Display */}
                  <div className="mt-4 flex items-baseline justify-center gap-1">
                    <span className="font-display font-black text-4xl text-white tracking-tight">
                      ${plan.priceUsd.toFixed(2)}
                    </span>
                    <span className="text-xs text-gray-400 font-bold">/ {plan.duration}</span>
                  </div>

                  {/* KHR Currency Highlight */}
                  <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-black/40 border border-white/10 shadow-inner">
                    <span className="text-amber-400 font-display font-black text-sm">≈ {plan.khrText} ៛</span>
                    <span className="text-[10px] text-gray-400 font-bold">({plan.priceKhr.toLocaleString()} KHR)</span>
                  </div>
                </div>

                {/* Features Checklist */}
                <div className="py-5 space-y-3">
                  <p className="text-[11px] font-bold text-gray-300 uppercase tracking-wider">អត្ថប្រយោជន៍គម្រោង៖</p>
                  <ul className="space-y-2.5">
                    {plan.features.map((feat, idx) => (
                      <li key={idx} className="flex items-start gap-2.5 text-xs text-left">
                        <div className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0 mt-0.5">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                        <span className="text-gray-300 leading-snug">{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Action Button: Direct to Telegram Admin @Huang404 */}
              <div className="pt-4 border-t border-white/10 space-y-2">
                <a
                  href={telegramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`w-full py-3.5 px-4 rounded-2xl text-xs md:text-sm flex items-center justify-center gap-2 transition-all duration-300 cursor-pointer shadow-lg active:scale-95 ${plan.theme.btnBg} ${plan.theme.btnText}`}
                >
                  <Send className="w-4 h-4" /> ជាវ VIP តាម Telegram
                </a>
                <p className="text-[10px] text-center text-amber-300/90 font-medium">
                  💬 ទាក់ទង Admin @Huang404 ដើម្បីបើកសិទ្ធិភ្លាមៗ
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── SINGLE MOVIE CARD (Pay-Per-View $1.00) ── */}
      <div className="mb-14 p-6 md:p-8 rounded-3xl bg-gradient-to-r from-[#210d18]/90 via-[#180914]/95 to-[#120710]/98 border border-rose-500/40 shadow-2xl relative overflow-hidden backdrop-blur-2xl flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-5 text-center md:text-left">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/20 border border-rose-500/50 flex items-center justify-center text-rose-400 shrink-0 shadow-lg shadow-rose-500/20 text-2xl">
            🍿
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-bold mb-2">
              <Film className="w-3.5 h-3.5" /> ភាពយន្តដុំ Movie Pay-Per-View
            </div>
            <h3 className="text-xl md:text-2xl font-display font-black text-white">
              ចង់ទិញទស្សនាតែ ១ រឿងដុំ? (Movie Single Access)
            </h3>
            <p className="text-xs md:text-sm text-gray-300 mt-1 max-w-xl leading-relaxed">
              ទិញត្រឹមតែ <strong className="text-rose-400 font-black">$1.00 (៤,០០០ ៛)</strong> តែម្តងគត់ គឺអាចទស្សនារឿង Movie នោះបានរហូតពេញមួយជីវិត (Lifetime Access) ទោះមិនមែនជាសមាជិក VIP ក៏ដោយ!
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4 shrink-0 w-full md:w-auto">
          <div className="text-center md:text-right">
            <div className="font-display font-black text-3xl text-rose-400">$1.00</div>
            <div className="text-xs text-gray-400 font-bold">≈ ៤,០០០ ៛ (4,000 KHR)</div>
          </div>
          <a
            href={`https://t.me/Huang404?text=${encodeURIComponent(`សួស្តី Admin ខ្ញុំចង់ទិញទស្សនារឿង Movie ($1.00 / ៤,០០០ ៛) សម្រាប់ Username: ${user?.username || 'Guest'}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto py-3.5 px-7 rounded-2xl bg-gradient-to-r from-rose-600 via-pink-600 to-rose-600 hover:from-rose-500 hover:to-pink-500 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-rose-600/30 active:scale-95 transition"
          >
            <Send className="w-4 h-4" /> ទិញ Movie តាម Telegram
          </a>
        </div>
      </div>

      {/* Benefits Highlights Section */}
      <div className="p-8 rounded-3xl mb-12 bg-gradient-to-r from-[#170a12]/80 via-[#10060d]/90 to-[#0c0307]/90 border border-white/10 shadow-2xl">
        <h3 className="font-display font-black text-xl md:text-2xl text-white text-center mb-8">
          ហេតុអ្វីត្រូវជ្រើសរើសសមាជិក VIP?
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex items-start gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/5">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 shadow-lg shadow-amber-500/10">
              <Film className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-white text-sm">4K Ultra HD & Zero Watermarks</h4>
              <p className="text-xs text-gray-400 mt-1 leading-relaxed">ទស្សនាវីដេអូច្បាស់ត្រជាក់ភ្នែក គ្មាន Logo ឬ Watermark ណាដែលបាំងលើអេក្រង់ឡើយ។</p>
            </div>
          </div>

          <div className="flex items-start gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/5">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0 shadow-lg shadow-cyan-500/10">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-white text-sm">High-Speed VIP Cloud Servers</h4>
              <p className="text-xs text-gray-400 mt-1 leading-relaxed">Server ល្បឿនលឿនពិសេស គ្មានការរអាក់រអួល ឬ Buffering ពេលទស្សនាក្នុងម៉ោងមមាញឹក។</p>
            </div>
          </div>

          <div className="flex items-start gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/5">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0 shadow-lg shadow-purple-500/10">
              <Tv className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-white text-sm">Full Screen Support on All Devices</h4>
              <p className="text-xs text-gray-400 mt-1 leading-relaxed">អាចពង្រីកមើល FULL SCREEN បានយ៉ាងងាយស្រួល ទាំងលើទូរស័ព្ទ កុំព្យូទ័រ និង Smart TV។</p>
            </div>
          </div>
        </div>
      </div>

      {/* Manual Admin Contact Support */}
      <div className="p-8 rounded-3xl bg-[#0e0c1a] border border-amber-500/30 flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl">
        <div className="space-y-2 text-center md:text-left">
          <h3 className="font-display font-black text-xl text-white flex items-center justify-center md:justify-start gap-2">
            <ShieldCheck className="w-5 h-5 text-amber-400" /> ជំនួយ និងការជាវគម្រោង VIP ផ្ទាល់ជាមួយ Admin
          </h3>
          <p className="text-xs text-gray-300 max-w-xl leading-relaxed">
            ប្រសិនបើលោកអ្នកចង់ជាវគម្រោង VIP ឬបង់ប្រាក់តាមរយៈ ABA Bank, Wing, ACLEDA ឬ Bakong ដោយផ្ទាល់ សូមទាក់ទងមក Admin តាមរយៈ Telegram (@Huang404) ដើម្បីទទួលបានការបើកសិទ្ធិភ្លាមៗ។
          </p>
        </div>
        <a
          href={`https://t.me/Huang404?text=${encodeURIComponent(`សួស្តី Admin ខ្ញុំចង់សាកសួរព័ត៌មាន និងជាវ VIP សម្រាប់ Username: ${user?.username || 'Guest'}`)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary py-3.5 px-8 text-sm shrink-0 flex items-center gap-2 shadow-[0_0_25px_rgba(245,158,11,0.4)]"
        >
          <MessageCircleQuestion className="w-4 h-4" /> ទាក់ទង Admin @Huang404 តាម Telegram
          <ExternalLink className="w-4 h-4 ml-1 opacity-70" />
        </a>
      </div>
    </main>
  );
}
