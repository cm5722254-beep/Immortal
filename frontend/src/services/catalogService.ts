import api from './api';
import type { Anime, Banner, Episode } from '../types';

export interface StaticCatalog {
  version?: string;
  genres?: any[];
  banners?: Banner[];
  anime?: Anime[];
  episodes?: Episode[];
}

let memoryCatalog: StaticCatalog | null = null;
let catalogRefresh: Promise<StaticCatalog> | null = null;
const CATALOG_STORAGE_KEY = 'nami_static_catalog_v3';

export function clearLocalCatalogCache() {
  memoryCatalog = null;
  try { localStorage.removeItem(CATALOG_STORAGE_KEY); } catch {}
}

// 1. Synchronously get catalog from memory or localStorage (0.001s)
export function getLocalCatalogSync(): StaticCatalog | null {
  if (memoryCatalog) return memoryCatalog;
  try {
    const raw = localStorage.getItem(CATALOG_STORAGE_KEY);
    if (raw) {
      memoryCatalog = JSON.parse(raw);
      return memoryCatalog;
    }
  } catch {}
  return null;
}

// 2. Fetch catalog from Live Database API (first priority) or fallback
export async function loadCatalog(): Promise<StaticCatalog> {
  const apiRequest = refreshCatalogInBackground();

  // Return a saved catalogue immediately, then refresh it without blocking first paint.
  const cached = getLocalCatalogSync();
  if (cached?.anime?.length) return cached;

  // On a fresh install, try the local static copy before waiting for a cold API server.
  try {
    const res = await fetch('/data/catalog.json');
    if (res.ok) {
      const data: StaticCatalog = await res.json();
      if (data?.anime?.length) {
        memoryCatalog = data;
        try { localStorage.setItem(CATALOG_STORAGE_KEY, JSON.stringify(data)); } catch {}
        return data;
      }
    }
  } catch {}

  // 1. Try Live Database API first so any website/Supabase updates persist across refreshes!
  try {
    const apiData = await apiRequest;
    if (apiData && apiData.anime && apiData.anime.length > 0) {
      return apiData;
    }
  } catch {}

  // 2. Try static CDN /data/catalog.json fallback
  try {
    const res = await fetch(`/data/catalog.json?t=${Date.now()}`);
    if (res.ok) {
      const data: StaticCatalog = await res.json();
      if (data && data.anime && data.anime.length > 0) {
        memoryCatalog = data;
        return data;
      }
    }
  } catch {}

  const sync = getLocalCatalogSync();
  if (sync && sync.anime && sync.anime.length > 0) {
    return sync;
  }

  return { anime: [], banners: [], episodes: [] };
}

async function refreshCatalogInBackground() {
  if (catalogRefresh) return catalogRefresh;
  catalogRefresh = fetchCatalogFromApi().finally(() => { catalogRefresh = null; });
  // Share this in-flight request with loadCatalog so a cold start does not
  // issue duplicate catalogue requests from the app shell and the page.
  return catalogRefresh;
}

async function fetchCatalogFromApi(): Promise<StaticCatalog> {
  try {
    const [animeRes, bannersRes] = await Promise.all([
      api.get('/anime?per_page=100').catch(() => ({ data: { items: [] } })),
      api.get('/admin/banners').catch(() => ({ data: [] })),
    ]);

    const data: StaticCatalog = {
      anime: animeRes.data.items || [],
      banners: bannersRes.data || [],
      episodes: getLocalCatalogSync()?.episodes || [],
    };
    if (data.anime && data.anime.length > 0) {
      memoryCatalog = data;
      try {
        localStorage.setItem(CATALOG_STORAGE_KEY, JSON.stringify(data));
      } catch {}
      window.dispatchEvent(new Event('nami-catalog-updated'));
    }
    return data;
  } catch {
    return { anime: [], banners: [], episodes: [] };
  }
}

// 3. Instant Home Data extraction
export function extractHomeData(catalog: StaticCatalog) {
  const allAnime = (catalog.anime || []).filter((a) => a.is_published !== false);
  const donghua = allAnime.filter((a) => a.type === 'DONGHUA');
  const drama = allAnime.filter((a) => a.type === 'DRAMA');
  const movies = allAnime.filter((a) => a.type === 'MOVIE');
  const anime = allAnime.filter((a) => a.type === 'ANIME');

  const banners = (catalog.banners || []).filter((b) => b.is_active !== false);

  return {
    banners,
    forYouDonghua: donghua.slice(0, 6),
    popularDonghua: donghua.length > 6 ? donghua.slice(6, 24) : donghua,
    drama: drama.slice(0, 18),
    movies: movies.slice(0, 18),
    animeList: anime.slice(0, 18),
  };
}

// 4. Instant Detail Data extraction
export function extractAnimeDetail(slugOrId: string, catalog: StaticCatalog) {
  const allAnime = catalog.anime || [];
  const decoded = decodeURIComponent(slugOrId).trim().toLowerCase();

  const matched = allAnime.find((a) =>
    a.slug?.toLowerCase() === decoded ||
    a.slug === slugOrId ||
    a.title?.trim().toLowerCase() === decoded ||
    String(a.id) === slugOrId
  );

  if (!matched) return null;

  const animeWithGenres = {
    ...matched,
    genres: matched.genres || [],
  };

  const allEpisodes = (catalog.episodes || []).filter((ep) => ep.anime_id === matched.id);
  allEpisodes.sort((a, b) => a.episode_number - b.episode_number);

  const related = allAnime
    .filter((a) => a.id !== matched.id && a.type === matched.type)
    .map((a) => ({ ...a, genres: a.genres || [] }))
    .slice(0, 6);

  return {
    anime: animeWithGenres,
    episodes: allEpisodes,
    related,
  };
}

// 5. Instant 0ms Local Search
export function searchCatalogSync(query: string, catalog?: StaticCatalog | null): Anime[] {
  if (!query.trim()) return [];
  const c = catalog || getLocalCatalogSync();
  if (!c || !c.anime) return [];

  const q = query.trim().toLowerCase();
  return c.anime.filter((a) => {
    const titleMatch = a.title?.toLowerCase().includes(q);
    const altMatch = a.alt_title?.toLowerCase().includes(q);
    const slugMatch = a.slug?.toLowerCase().includes(q);
    const descMatch = a.description?.toLowerCase().includes(q);
    return titleMatch || altMatch || slugMatch || descMatch;
  });
}

// 6. Instant 0ms Bookmarks extraction
export function getFavoritesSync(catalog?: StaticCatalog | null): Anime[] {
  const c = catalog || getLocalCatalogSync();
  if (!c || !c.anime) return [];

  let ids: number[] = [];
  try {
    const raw = localStorage.getItem('nami_my_list');
    if (raw) ids = JSON.parse(raw);
  } catch {}

  try {
    const favsRaw = localStorage.getItem('local_favorites');
    if (favsRaw) {
      const favs: Anime[] = JSON.parse(favsRaw);
      favs.forEach((f) => {
        if (!ids.includes(f.id)) ids.push(f.id);
      });
    }
  } catch {}

  if (!ids.length) return [];
  return c.anime.filter((a) => ids.includes(a.id));
}
