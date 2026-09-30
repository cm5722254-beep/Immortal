import { Link } from 'react-router-dom';
import { Sparkles, Film, Video, Crown } from 'lucide-react';
import { triggerHaptic } from '../../utils/telegram';

export function MiniAppQuickHub() {
  const hubs = [
    {
      to: '/donghua',
      title: 'Donghua 3D',
      sub: 'រឿងចិន 3D',
      icon: Sparkles,
      gradient: 'from-rose-500 to-pink-600',
      shadow: 'shadow-rose-500/20',
      border: 'border-rose-500/30',
      badge: 'HOT',
    },
    {
      to: '/anime',
      title: 'Anime ជប៉ុន',
      sub: 'កម្រិត 4K',
      icon: Film,
      gradient: 'from-sky-500 to-indigo-600',
      shadow: 'shadow-sky-500/20',
      border: 'border-sky-500/30',
    },
    {
      to: '/movies',
      title: 'ភាពយន្តដុំ',
      sub: 'Cinema Movies',
      icon: Video,
      gradient: 'from-purple-500 to-violet-600',
      shadow: 'shadow-purple-500/20',
      border: 'border-purple-500/30',
    },
    {
      to: '/vip',
      title: 'សមាជិក VIP',
      sub: 'ដោះសោរគ្រប់រឿង',
      icon: Crown,
      gradient: 'from-amber-400 via-amber-500 to-yellow-500',
      shadow: 'shadow-amber-500/25',
      border: 'border-amber-400/40',
      badge: 'PRO',
      goldText: true,
    },
  ];

  return (
    <div className="grid grid-cols-4 gap-2 sm:gap-3 py-2 px-1">
      {hubs.map((hub) => {
        const Icon = hub.icon;
        return (
          <Link
            key={hub.to}
            to={hub.to}
            onClick={() => triggerHaptic('light')}
            className="flex flex-col items-center justify-center p-2 rounded-2xl bg-[#0f1424]/80 border border-white/[0.08] hover:border-white/20 transition-all active:scale-95 group relative select-none"
          >
            {hub.badge && (
              <span className={`absolute -top-1.5 -right-1 text-[8px] font-black px-1.5 py-0.2 rounded-full uppercase shadow-sm ${
                hub.badge === 'PRO' ? 'bg-amber-400 text-black' : 'bg-rose-500 text-white'
              }`}>
                {hub.badge}
              </span>
            )}
            <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-tr ${hub.gradient} flex items-center justify-center text-white shadow-lg ${hub.shadow} border ${hub.border} group-hover:scale-105 transition-transform`}>
              <Icon className="w-5 h-5 drop-shadow" />
            </div>
            <span className={`text-[11px] font-bold mt-1.5 truncate max-w-full text-center leading-tight ${
              hub.goldText ? 'text-amber-300' : 'text-gray-200'
            }`}>
              {hub.title}
            </span>
            <span className="text-[9px] text-gray-400 font-medium truncate max-w-full text-center hidden xs:inline">
              {hub.sub}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
