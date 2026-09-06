import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, ChevronRight } from 'lucide-react';

const REALTIME_UPDATES = [
  { id: 1, text: '🔥 អ្នកបួសបះបោរ (Renegade Immortal) — ភាគថ្មីចាក់ផ្សាយកម្រិត 4K Ultra HD សំឡេងខ្មែរ!', slug: 'renegade-immortal', ep: 12 },
  { id: 2, text: '⚡ ពិភពដ៏ល្អឥតខ្ចោះ (Perfect World) — ស៊ីហាវ បញ្ចេញក្បាច់គុណគុនប៉េងបំបែកមេឃា!', slug: 'perfect-world', ep: 10 },
  { id: 3, text: '⚔️ ដាវទេពប្រយុទ្ធមេឃា (BTTH) — សៀវយាន ស្រូបយកអណ្តាតភ្លើងឋានសួគ៌ជោគជ័យ!', slug: 'battle-through-the-heavens', ep: 8 },
  { id: 4, text: '🌟 ដំណើរផ្សងព្រេងរបស់បុរសសាមញ្ញ (RMJI) — ហានលី ឈានជើងចូលក្នុងពិភពមន្តអាគមថ្មី!', slug: 'a-record-of-a-mortals-journey-to-immortality', ep: 10 },
];

export function LiveTicker() {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % REALTIME_UPDATES.length);
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  const current = REALTIME_UPDATES[currentIndex];

  return (
    <div className="bg-gradient-to-r from-brand-950/80 via-dark-card to-brand-950/80 border-y border-brand-500/20 py-2.5 px-4">
      <div className="max-w-[1600px] mx-auto flex items-center justify-between gap-4">
        {/* Left Badge */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="flex h-2.5 w-2.5 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-brand-500" />
          </span>
          <span className="text-xs font-bold uppercase tracking-wider text-brand-400 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" /> ផ្សាយផ្ទាល់ថ្មីៗ
          </span>
        </div>

        {/* Scrolling item */}
        <div className="flex-1 min-w-0 overflow-hidden text-center sm:text-left">
          <Link
            key={current.id}
            to={`/watch/${current.slug}/${current.ep}`}
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-gray-200 hover:text-brand-300 transition-colors truncate max-w-full animate-fade-in group"
          >
            <span>{current.text}</span>
            <ChevronRight className="w-3.5 h-3.5 text-brand-400 group-hover:translate-x-1 transition-transform inline" />
          </Link>
        </div>

        {/* Right action */}
        <div className="hidden md:flex items-center gap-2 shrink-0">
          <span className="text-[11px] text-gray-500 font-mono">អាប់ដេតស្វ័យប្រវត្តិ</span>
        </div>
      </div>
    </div>
  );
}
