import { Link } from 'react-router-dom';
import { Crown, Sparkles, Gift } from 'lucide-react';

interface PromoTile {
  id: string;
  tag: string;
  tagBg: string;
  title: string;
  subtitle: string;
  bgGradient: string;
  link: string;
  icon: React.ElementType;
}

const PROMO_TILES: PromoTile[] = [
  {
    id: 'member',
    tag: 'VIP Membership',
    tagBg: 'bg-[#E8452C]',
    title: 'How to Subscribe',
    subtitle: 'Unlimited 4K Streaming',
    bgGradient: 'from-[#2A1810] via-[#1E1410] to-[#111726]',
    link: '/donghua',
    icon: Crown,
  },
  {
    id: 'single',
    tag: 'Full Series',
    tagBg: 'bg-[#D63720]',
    title: 'Unlock Full Series',
    subtitle: 'Complete Episode Access',
    bgGradient: 'from-[#1C1828] via-[#151220] to-[#111726]',
    link: '/explore',
    icon: Sparkles,
  },
  {
    id: 'free',
    tag: 'Free Watch',
    tagBg: 'bg-[#1E283C]',
    title: 'Free Streaming',
    subtitle: 'Watch Early Episodes Free',
    bgGradient: 'from-[#141C28] via-[#101620] to-[#111726]',
    link: '/free',
    icon: Gift,
  },
];

export function PromoTilesSection() {
  return (
    <section className="mb-6 px-1">
      <div className="flex items-center justify-between mb-2.5">
        <h2 className="font-display font-bold text-base sm:text-lg text-white">
          Features & Guide
        </h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-4">
        {PROMO_TILES.map((tile) => {
          const Icon = tile.icon;
          return (
            <Link
              key={tile.id}
              to={tile.link}
              className={`relative rounded-2xl p-3.5 bg-gradient-to-br ${tile.bgGradient} border border-[#1E283C] hover:border-[#E8452C]/50 transition-all duration-300 flex flex-col justify-between overflow-hidden shadow-lg group active:scale-95`}
            >
              {/* Top Tag */}
              <div className="mb-2">
                <span
                  className={`inline-block ${tile.tagBg} text-white font-bold text-[10px] sm:text-xs px-2.5 py-0.5 rounded-full shadow-sm`}
                >
                  {tile.tag}
                </span>
              </div>

              {/* Center Decorative Icon */}
              <div className="my-2 flex justify-end">
                <div className="w-8 h-8 rounded-full bg-white/5 group-hover:bg-white/10 flex items-center justify-center text-gray-300 group-hover:text-white transition-colors">
                  <Icon className="w-4 h-4 text-[#E8452C]" />
                </div>
              </div>

              {/* Title & Subtitle */}
              <div>
                <h3 className="font-display font-bold text-xs sm:text-sm text-white leading-tight">
                  {tile.title}
                </h3>
                <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5 line-clamp-1">
                  {tile.subtitle}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
