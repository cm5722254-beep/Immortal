import React from 'react';
import { Flame, Film, Tv, Video, Sparkles, Crown, Zap } from 'lucide-react';

export type CategoryFilterType = 'ALL' | 'ULTRA_3D' | 'DONGHUA' | 'ANIME' | 'MOVIE' | 'DRAMA' | 'VIP';

interface QuickCategoryFilterProps {
  activeFilter: CategoryFilterType;
  onSelect: (filter: CategoryFilterType) => void;
}

const FILTERS: { id: CategoryFilterType; label: string; icon: React.ElementType; special?: boolean }[] = [
  { id: 'ALL', label: 'ទាំងអស់', icon: Flame },
  { id: 'ULTRA_3D', label: '⚡ Ultra 3D (UE5)', icon: Zap, special: true },
  { id: 'DONGHUA', label: 'រឿងចិន 3D', icon: Sparkles },
  { id: 'ANIME', label: 'រឿងជប៉ុន', icon: Film },
  { id: 'MOVIE', label: 'ភាពយន្តដុំ', icon: Video },
  { id: 'DRAMA', label: 'រឿងភាគ', icon: Tv },
  { id: 'VIP', label: 'សមាជិក VIP', icon: Crown },
];

export function QuickCategoryFilter({ activeFilter, onSelect }: QuickCategoryFilterProps) {
  return (
    <div className="w-full overflow-x-auto no-scrollbar py-2 my-4">
      <div className="flex items-center gap-2 min-w-max px-1">
        {FILTERS.map((f) => {
          const Icon = f.icon;
          const isActive = activeFilter === f.id;
          return (
            <button
              key={f.id}
              onClick={() => onSelect(f.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all duration-300 select-none cursor-pointer ${
                isActive
                  ? f.special
                    ? 'bg-gradient-to-r from-rose-500 via-pink-500 to-rose-600 text-white shadow-lg shadow-rose-500/40 scale-[1.04] font-black'
                    : 'bg-gradient-to-r from-rose-500 to-rose-600 text-white shadow-lg shadow-rose-500/35 scale-[1.02]'
                  : f.special
                  ? 'bg-[#18111e] text-rose-300 border border-rose-500/40 hover:border-rose-400 hover:text-white hover:bg-rose-500/15 shadow-[0_0_12px_rgba(244,63,94,0.2)]'
                  : 'bg-[#0f1422] text-gray-300 border border-white/[0.08] hover:border-white/20 hover:text-white hover:bg-[#161d30]'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : (f.special ? 'text-rose-400' : 'text-gray-400')}`} />
              <span>{f.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
