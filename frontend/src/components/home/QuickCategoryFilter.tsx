import { triggerHaptic } from '../../utils/telegram';

export type CategoryFilterType = 'ALL' | 'DONGHUA' | 'ANIME' | 'MOVIE' | 'DRAMA' | 'VIP';

interface QuickCategoryFilterProps {
  activeFilter: CategoryFilterType;
  onSelect: (filter: CategoryFilterType) => void;
}

const FILTERS: { id: CategoryFilterType; label: string }[] = [
  { id: 'ALL', label: 'ទាំងអស់' },
  { id: 'DONGHUA', label: 'រឿងចិន 3D' },
  { id: 'ANIME', label: 'Anime ជប៉ុន' },
  { id: 'MOVIE', label: 'ភាពយន្តដុំ' },
  { id: 'DRAMA', label: 'រឿងភាគ' },
  { id: 'VIP', label: 'VIP' },
];

export function QuickCategoryFilter({ activeFilter, onSelect }: QuickCategoryFilterProps) {
  return (
    <div className="w-full overflow-x-auto no-scrollbar py-1.5 my-1">
      <div className="flex items-center gap-1.5 min-w-max px-0.5">
        {FILTERS.map((f) => {
          const isActive = activeFilter === f.id;
          return (
            <button
              key={f.id}
              onClick={() => {
                triggerHaptic('light');
                onSelect(f.id);
              }}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all duration-150 select-none cursor-pointer ${
                isActive
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200/80 shadow-xs'
              }`}
            >
              {f.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
