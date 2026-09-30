import { useState } from 'react';
import { Monitor, Smartphone, Send, Check, Sparkles, X, Download } from 'lucide-react';
import { usePlatform, type PlatformMode } from '../../utils/platform';
import { triggerHaptic } from '../../utils/telegram';

interface PlatformSwitcherModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PlatformSwitcherModal({ isOpen, onClose }: PlatformSwitcherModalProps) {
  const { platform, overrideMode, setOverrideMode } = usePlatform();
  const [showApkGuide, setShowApkGuide] = useState(false);

  if (!isOpen) return null;

  const platforms: {
    id: PlatformMode;
    title: string;
    subtitle: string;
    tag: string;
    icon: any;
    color: string;
    badgeBg: string;
    features: string[];
  }[] = [
    {
      id: 'auto',
      title: 'ស្វ័យប្រវត្តិ (Auto Detect)',
      subtitle: 'ប្រព័ន្ធនឹងចាប់យកតាមឧបករណ៍ជាក់ស្តែងរបស់អ្នក',
      tag: 'DEFAULT',
      icon: Sparkles,
      color: 'text-rose-400',
      badgeBg: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
      features: ['ស្គាល់ Telegram WebApp ស្វ័យប្រវត្តិ', 'ស្គាល់ Android APK ស្វ័យប្រវត្តិ', 'ស្គាល់ Web Browser'],
    },
    {
      id: 'web',
      title: '🌐 Website UI (Desktop/Cinema)',
      subtitle: 'រចនាបថវេបសាយធំទូលាយ 16:9 សម្រាប់កុំព្យូទ័រ & Smart TV',
      tag: 'WEBSITE',
      icon: Monitor,
      color: 'text-sky-400',
      badgeBg: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
      features: ['Mega Navigation Menu ពេញលេញ', 'Footer ធំទូលាយ & Keyboard Controls', 'Multi-column Card Grid'],
    },
    {
      id: 'telegram',
      title: '✈️ Telegram Mini App UI',
      subtitle: 'រចនាបថកម្មវិធីក្នុង Telegram Bot (@animeflickh_bot)',
      tag: 'TELEGRAM',
      icon: Send,
      color: 'text-[#24A1DE]',
      badgeBg: 'bg-[#24A1DE]/20 text-[#24A1DE] border-[#24A1DE]/40',
      features: ['Telegram Native BackButton & Theme', 'Touch Haptic Vibration Feedback', 'Compact Portrait Billboard Banner'],
    },
    {
      id: 'mobile',
      title: '📱 Android APK UI (Native App)',
      subtitle: 'រចនាបថកម្មវិធីទូរស័ព្ទ Android (.apk) ដំឡើងផ្ទាល់',
      tag: 'APK APP',
      icon: Smartphone,
      color: 'text-emerald-400',
      badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      features: ['5-Tab Bottom Dock + ទាញយក Offline', 'Fullscreen គ្មាន Address Bar', 'Gesture Swipe Transitions'],
    },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in select-none">
      <div className="w-full max-w-lg bg-[#0e1629] border border-white/15 rounded-3xl p-5 sm:p-6 space-y-5 shadow-2xl animate-scale-in text-white max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div>
            <h3 className="font-display font-black text-base sm:text-lg text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-rose-400" />
              ជ្រើសរើសទម្រង់ UI (Platform Preview)
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              សាកល្បងមើល UI ខុសៗគ្នាតាមឧបករណ៍ទាំង ៣ (Server តែមួយ)
            </p>
          </div>
          <button
            onClick={() => {
              triggerHaptic('light');
              onClose();
            }}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Current Active Mode Indicator */}
        <div className="p-3 rounded-2xl bg-[#131d36] border border-white/10 flex items-center justify-between">
          <span className="text-xs text-gray-400">ទម្រង់កំពុងបង្ហាញបច្ចុប្បន្ន៖</span>
          <span className="text-xs font-black text-rose-300 uppercase px-2.5 py-0.5 rounded-full bg-rose-500/20 border border-rose-500/40">
            {platform === 'telegram' ? '✈️ Telegram Mini App' : platform === 'mobile' ? '📱 Android APK' : '🌐 Website Desktop'}
          </span>
        </div>

        {/* Platform Selection Options */}
        <div className="space-y-2.5">
          {platforms.map((p) => {
            const isSelected = overrideMode === p.id;
            const Icon = p.icon;

            return (
              <button
                key={p.id}
                onClick={() => {
                  triggerHaptic('medium');
                  setOverrideMode(p.id);
                }}
                className={`w-full p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-3.5 ${
                  isSelected
                    ? 'bg-rose-500/15 border-rose-500/60 shadow-lg shadow-rose-500/20 ring-1 ring-rose-400/40'
                    : 'bg-[#121a2d]/80 hover:bg-[#16223b] border-white/10'
                }`}
              >
                <div className={`w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0 ${p.color}`}>
                  <Icon className="w-5 h-5" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-bold text-xs sm:text-sm text-white truncate">
                      {p.title}
                    </p>
                    {isSelected && (
                      <span className="w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center shrink-0 shadow">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-400 mt-0.5 line-clamp-1">
                    {p.subtitle}
                  </p>
                  <div className="flex items-center gap-1.5 flex-wrap mt-2">
                    {p.features.map((feat, idx) => (
                      <span key={idx} className="text-[9px] px-2 py-0.5 rounded-md bg-white/5 text-gray-300 border border-white/5">
                        {feat}
                      </span>
                    ))}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* APK Build Help Drawer Toggle */}
        <div className="pt-2 border-t border-white/10 space-y-2">
          <button
            onClick={() => setShowApkGuide(!showApkGuide)}
            className="w-full py-2.5 px-4 rounded-xl bg-[#131d36] hover:bg-white/10 border border-white/10 text-xs font-bold text-emerald-300 flex items-center justify-between transition cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <Download className="w-4 h-4 text-emerald-400" />
              របៀប Build ចេញជា Android APK (.apk file)
            </span>
            <span className="text-gray-400 text-[10px]">{showApkGuide ? '▲ បិទ' : '▼ បើកមើល'}</span>
          </button>

          {showApkGuide && (
            <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 space-y-2 text-xs text-gray-300 leading-relaxed font-mono">
              <p className="font-sans font-bold text-emerald-400">ជំហានបង្កើត APK តាមរយៈ Capacitor:</p>
              <ol className="list-decimal list-inside space-y-1 text-[11px]">
                <li><code className="text-rose-300">npm run build</code> (Build Frontend)</li>
                <li><code className="text-rose-300">npx cap sync android</code> (Sync ចូល Android Studio)</li>
                <li><code className="text-rose-300">npx cap open android</code> (បើកក្នុង Android Studio រួចចុច Build APK)</li>
              </ol>
            </div>
          )}
        </div>

        {/* Close Button */}
        <button
          onClick={() => {
            triggerHaptic('light');
            onClose();
          }}
          className="w-full py-3 rounded-2xl bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white font-black text-xs sm:text-sm shadow-lg shadow-rose-500/25 active:scale-95 transition cursor-pointer"
        >
          យល់ព្រម & រក្សាទុក
        </button>
      </div>
    </div>
  );
}
