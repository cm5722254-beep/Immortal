import { Globe, ExternalLink, Play } from 'lucide-react';
import {
  KNOWN_PROVIDERS,
  TYPE_LABEL,
  TYPE_COLOR,
  buildRegion,
  type StreamingProvider,
  type RegionAvailability
} from './streamingAvailabilityData';

export { buildRegion };

// ── Main Component ────────────────────────────────────────────────────────────
interface StreamingAvailabilityHubProps {
  /**
   * Pass an array of regions with their providers.
   * If omitted, a default "Available on Mer Donghua" fallback is shown.
   */
  regions?: RegionAvailability[];
  /** If the content is free on Mer Donghua, pass the watch URL */
  merDonghuaUrl?: string;
  animeTitle?: string;
}

export function StreamingAvailabilityHub({
  regions,
  merDonghuaUrl,
  animeTitle,
}: StreamingAvailabilityHubProps) {
  // Default if no regions supplied
  const displayRegions: RegionAvailability[] = regions ?? [
    {
      region: 'Global',
      flag: '🌐',
      providers: [{ ...KNOWN_PROVIDERS['merdonghua'], url: merDonghuaUrl }],
    },
  ];

  const allProviders = displayRegions.flatMap(r => r.providers);
  const hasAnyFree = allProviders.some(p => p.type === 'free');

  return (
    <div className="card p-5 border border-white/5 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
          <Globe className="w-4 h-4 text-blue-400" />
        </div>
        <div>
          <h2 className="font-bold text-white text-base">Where to Watch</h2>
          <p className="text-xs text-gray-400">
            {animeTitle ? `Global streaming availability for "${animeTitle}"` : 'Streaming availability by region'}
          </p>
        </div>
        {hasAnyFree && (
          <span className="ml-auto text-xs font-bold bg-green-500/20 text-green-300 border border-green-500/30 px-2.5 py-1 rounded-full">
            🆓 Free Available
          </span>
        )}
      </div>

      {/* Mer Donghua CTA (always shown if URL provided) */}
      {merDonghuaUrl && (
        <a
          href={merDonghuaUrl}
          className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-orange-500/10 to-orange-600/5
                     border border-orange-500/30 hover:border-orange-500/60 transition-all group"
        >
          <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center text-white font-black text-sm shadow-lg shadow-orange-500/30 shrink-0">
            MD
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-white group-hover:text-orange-300 transition-colors">Watch on Mer Donghua</p>
            <p className="text-xs text-gray-400">Free · HD · Subtitles available</p>
          </div>
          <Play className="w-5 h-5 text-orange-400 group-hover:scale-110 transition-transform fill-orange-400" />
        </a>
      )}

      {/* Region breakdown */}
      <div className="space-y-5">
        {displayRegions
          .filter(r => r.providers.length > 0 && !(r.providers.length === 1 && r.providers[0].name === 'Mer Donghua'))
          .map(region => (
            <RegionRow key={region.region} region={region} />
          ))
        }
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2 pt-2 border-t border-white/5">
        <span className="text-[10px] text-gray-600 self-center mr-1">Legend:</span>
        {Object.entries(TYPE_COLOR).map(([type, cls]) => (
          <span key={type} className={`text-[9px] font-bold px-2 py-0.5 rounded border ${cls}`}>
            {TYPE_LABEL[type as StreamingProvider['type']]}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────
function ProviderBadge({ provider }: { provider: StreamingProvider }) {
  const inner = (
    <div className="group flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/15 rounded-xl transition-all duration-200 cursor-pointer">
      {/* Logo circle */}
      <div className={`w-8 h-8 rounded-lg ${provider.color} flex items-center justify-center text-white font-black text-[10px] shrink-0 shadow-lg`}>
        {provider.logo}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-white truncate">{provider.name}</p>
        <span className={`inline-block text-[9px] font-bold px-1.5 py-0 rounded border ${TYPE_COLOR[provider.type]}`}>
          {TYPE_LABEL[provider.type]}
        </span>
      </div>
      {provider.url && (
        <ExternalLink className="w-3.5 h-3.5 text-gray-600 group-hover:text-white shrink-0 ml-auto transition-colors" />
      )}
    </div>
  );

  return provider.url ? (
    <a href={provider.url} target="_blank" rel="noopener noreferrer">{inner}</a>
  ) : (
    <div>{inner}</div>
  );
}

function RegionRow({ region }: { region: RegionAvailability }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-lg">{region.flag}</span>
        <span className="text-sm font-semibold text-gray-200">{region.region}</span>
        <span className="text-xs text-gray-500">({region.providers.length} provider{region.providers.length !== 1 ? 's' : ''})</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 pl-7">
        {region.providers.map(p => <ProviderBadge key={p.name} provider={p} />)}
      </div>
    </div>
  );
}
