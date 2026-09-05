import React from 'react';
import { Flame, Film, Tv, Video, Sparkles, Crown } from 'lucide-react';

export type CategoryFilterType = 'ALL' | 'DONGHUA' | 'ANIME' | 'MOVIE' | 'DRAMA' | 'VIP';

interface QuickCategoryFilterProps {
  activeFilter: CategoryFilterType;
  onSelect: (filter: CategoryFilterType) => void;
}

const FILTERS: { id: CategoryFilterType; label: string; icon: React.ElementType }[] = [
  { id: 'ALL', label: 'ទាំងអស់', icon: Flame },
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
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all duration-300 select-none ${
                isActive
                  ? 'bg-[#e8452c] text-white shadow-lg shadow-[#e8452c]/30 scale-[1.02]'
                  : 'bg-[#0f1422] text-gray-300 border border-white/[0.08] hover:border-white/20 hover:text-white hover:bg-[#161d30]'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-gray-400'}`} />
              <span>{f.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
