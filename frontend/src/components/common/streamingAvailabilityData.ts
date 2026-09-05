// ── Static provider data ──────────────────────────────────────────────────────
// In production, swap this with a real streaming availability API (e.g. JustWatch API).
// For now, this renders curated static data you can pass as props.

export interface StreamingProvider {
  name: string;
  /** Short color class for the badge background */
  color: string;
  /** Emoji or initials to represent the provider */
  logo: string;
  url?: string;
  type: 'subscription' | 'free' | 'rent' | 'buy';
}

export interface RegionAvailability {
  region: string;   // e.g. "Global", "Southeast Asia", "US"
  flag: string;     // emoji flag
  providers: StreamingProvider[];
}

// ── Default provider catalogue ────────────────────────────────────────────────
export const KNOWN_PROVIDERS: Record<string, StreamingProvider> = {
  netflix:       { name: 'Netflix',        color: 'bg-red-600',     logo: 'N',   type: 'subscription' },
  crunchyroll:   { name: 'Crunchyroll',    color: 'bg-orange-500',  logo: 'CR',  type: 'subscription' },
  funimation:    { name: 'Funimation',     color: 'bg-purple-600',  logo: 'FN',  type: 'subscription' },
  hidive:        { name: 'HIDIVE',         color: 'bg-teal-600',    logo: 'HI',  type: 'subscription' },
  amazon:        { name: 'Prime Video',   color: 'bg-blue-600',    logo: 'PV',  type: 'subscription' },
  disney:        { name: 'Disney+',       color: 'bg-blue-800',    logo: 'D+',  type: 'subscription' },
  youtube:       { name: 'YouTube Free',  color: 'bg-red-500',     logo: 'YT',  type: 'free'         },
  bilibili:      { name: 'Bilibili',      color: 'bg-blue-400',    logo: 'BB',  type: 'free'         },
  iqiyi:         { name: 'iQIYI',         color: 'bg-green-600',   logo: 'IQ',  type: 'subscription' },
  tencent:       { name: 'Tencent Video', color: 'bg-blue-500',    logo: 'TV',  type: 'subscription' },
  wetv:          { name: 'WeTV',          color: 'bg-amber-500',   logo: 'WT',  type: 'subscription' },
  merdonghua:    { name: 'Mer Donghua',   color: 'bg-orange-500',  logo: 'MD',  type: 'free'         },
};

export const TYPE_LABEL: Record<StreamingProvider['type'], string> = {
  subscription: 'Sub',
  free:         'Free',
  rent:         'Rent',
  buy:          'Buy',
};
export const TYPE_COLOR: Record<StreamingProvider['type'], string> = {
  subscription: 'text-orange-300 bg-orange-500/15 border-orange-500/30',
  free:         'text-green-300 bg-green-500/15 border-green-500/30',
  rent:         'text-blue-300 bg-blue-500/15 border-blue-500/30',
  buy:          'text-purple-300 bg-purple-500/15 border-purple-500/30',
};

/** Helper to build a RegionAvailability from provider keys */
export function buildRegion(
  region: string,
  flag: string,
  providerKeys: (keyof typeof KNOWN_PROVIDERS)[],
  urlOverrides?: Partial<Record<keyof typeof KNOWN_PROVIDERS, string>>
): RegionAvailability {
  return {
    region, flag,
    providers: providerKeys.map(k => ({
      ...KNOWN_PROVIDERS[k],
      url: urlOverrides?.[k] ?? KNOWN_PROVIDERS[k].url,
    })),
  };
}