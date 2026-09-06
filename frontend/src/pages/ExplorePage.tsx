import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AnimeCard } from '../components/home/AnimeCard';
import { SkeletonCard } from '../components/common/SkeletonLoader';
import api from '../services/api';
import { loadCatalog } from '../services/catalogService';
import type { Anime, PaginatedResponse, AnimeType } from '../types';

interface ExplorePageProps {
  defaultType?: AnimeType;
  isFreeOnly?: boolean;
}

export function ExplorePage({ defaultType, isFreeOnly }: ExplorePageProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [items, setItems] = useState<Anime[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);

  const sort = searchParams.get('sort') || 'latest';
  const genre = searchParams.get('genre') || '';
  const status = searchParams.get('status') || '';
  const type = defaultType || searchParams.get('type') || '';
  const access = isFreeOnly ? 'free' : (searchParams.get('access') || '');

  const updateFilter = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (!value || value === 'ALL') {
      next.delete(key);
    } else {
      next.set(key, value);
    }
    next.set('page', '1');
    setPage(1);
    setSearchParams(next);
  };

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    // 1. Fast instant load from CDN catalog
    loadCatalog().then((catalog) => {
      if (!isMounted || !catalog?.anime?.length) return;
      let list = [...catalog.anime];
      if (type) list = list.filter((a) => a.type === type);
      if (isFreeOnly) list = list.filter((a) => a.is_free && a.type !== 'MOVIE');
      else if (access === 'free') list = list.filter((a) => a.is_free);
      else if (access === 'vip') list = list.filter((a) => !a.is_free);
      if (status) list = list.filter((a) => a.status === status);
      
      setItems(list.slice((page - 1) * 24, page * 24));
      setTotal(list.length);
      setPages(Math.ceil(list.length / 24) || 1);
      setIsLoading(false);
    });

    // 2. Live API sync
    const params = new URLSearchParams({ sort, page: page.toString(), per_page: '24' });
    if (type) params.set('type', type);
    if (genre) params.set('genre', genre);
    if (status) params.set('status', status);
    if (access === 'free') params.set('is_free', 'true');
    if (access === 'vip') params.set('is_free', 'false');

    api.get(`/anime?${params}`)
      .then((res) => {
        if (!isMounted) return;
        const data = res.data as PaginatedResponse<Anime>;
        const filtered = isFreeOnly
          ? data.items.filter((item) => item.type !== 'MOVIE')
          : data.items;
        setItems(filtered);
        setTotal(isFreeOnly ? filtered.length : data.total);
        setPages(data.pages);
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => { isMounted = false; };
  }, [sort, genre, status, type, access, page, isFreeOnly]);

  const title = isFreeOnly
    ? '🆓 តំបន់ទស្សនាឥតគិតថ្លៃ (Free Zone)'
    : defaultType === 'DONGHUA'
    ? '🇨🇳 រឿងចិន 3D (Donghua)'
    : defaultType === 'DRAMA'
    ? '🎭 រឿងភាគ (Drama)'
    : defaultType === 'MOVIE'
    ? '🎬 ភាពយន្តដុំ (Movies)'
    : defaultType === 'ANIME'
    ? '🇯🇵 រឿងគំនូរជីវចលជប៉ុន (Anime)'
    : '🌟 រុករកបញ្ជីរឿងទាំងអស់';

  return (
    <main className="min-h-screen pt-16 sm:pt-20 pb-24 md:pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto bg-[#141414] text-gray-100">
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-display font-black text-2xl sm:text-3xl text-white mb-1">{title}</h1>
        <p className="text-gray-400 text-xs sm:text-sm">សរុប {total.toLocaleString()} រឿង</p>
      </div>

      {/* ── Responsive Khmer Filter Toolbar ── */}
      <div className="mb-8 space-y-3 bg-[#111726]/80 p-3.5 sm:p-4 rounded-2xl border border-white/10 backdrop-blur-md">
        {/* Type selector (Only if not fixed by route) */}
        {!defaultType && !isFreeOnly && (
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
            <span className="text-xs font-bold text-gray-400 mr-1 shrink-0">ប្រភេទ៖</span>
            {[
              { id: 'ALL', label: 'ទាំងអស់' },
              { id: 'DONGHUA', label: '🇨🇳 រឿងចិន 3D' },
              { id: 'ANIME', label: '🇯🇵 រឿងជប៉ុន' },
              { id: 'MOVIE', label: '🍿 ភាពយន្តដុំ' },
              { id: 'DRAMA', label: '📺 រឿងភាគ' },
            ].map((t) => {
              const active = (!type && t.id === 'ALL') || type === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => updateFilter('type', t.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                    active
                      ? 'bg-[#E50914] text-white shadow-md shadow-red-600/30'
                      : 'bg-[#182033] hover:bg-white/10 text-gray-300'
                  }`}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
        )}

        {/* Access & Sort & Status Toolbar */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {/* Access Filter */}
          {!isFreeOnly && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-gray-400">សិទ្ធិមើល៖</span>
              {[
                { id: 'ALL', label: 'ទាំងអស់' },
                { id: 'free', label: '🆓 ឥតគិតថ្លៃ' },
                { id: 'vip', label: '⭐ VIP' },
              ].map((a) => {
                const active = (!access && a.id === 'ALL') || access === a.id;
                return (
                  <button
                    key={a.id}
                    onClick={() => updateFilter('access', a.id)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                      active
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'bg-[#182033] hover:bg-white/10 text-gray-300 border border-transparent'
                    }`}
                  >
                    {a.label}
                  </button>
                );
              })}
            </div>
          )}

          {/* Sort Selector */}
          <div className="flex items-center gap-1.5 ml-auto">
            <span className="text-xs font-bold text-gray-400">តម្រៀប៖</span>
            <select
              value={sort}
              onChange={(e) => updateFilter('sort', e.target.value)}
              className="bg-[#182033] border border-white/10 rounded-xl px-2.5 py-1 text-xs text-white focus:outline-none focus:border-[#E50914]"
            >
              <option value="latest">ថ្មីៗចុងក្រោយ</option>
              <option value="popular">ពេញនិយមបំផុត</option>
              <option value="rating">ពិន្ទុខ្ពស់</option>
            </select>
          </div>
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
          <SkeletonCard count={18} />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-20 bg-[#111726]/40 rounded-3xl border border-white/5">
          <p className="text-gray-300 text-base font-bold">រកមិនឃើញរឿងឡើយ</p>
          <p className="text-gray-500 text-xs mt-1">សូមសាកល្បងជ្រើសរើសប្រភេទរឿង ឬលក្ខខណ្ឌផ្សេងទៀត</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
          {items.map((a) => (
            <AnimeCard key={a.id} anime={a} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-10">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3.5 py-2 rounded-xl bg-[#1e1e1e] hover:bg-white/10 text-white text-xs font-bold disabled:opacity-40 transition-colors cursor-pointer"
          >
            ← ថយក្រោយ
          </button>
          {Array.from({ length: Math.min(pages, 7) }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`w-9 h-9 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                p === page
                  ? 'bg-[#E50914] text-white shadow-lg shadow-red-600/40'
                  : 'bg-[#1e1e1e] hover:bg-white/10 text-gray-300'
              }`}
            >
              {p}
            </button>
          ))}
          <button
            onClick={() => setPage((p) => Math.min(pages, p + 1))}
            disabled={page === pages}
            className="px-3.5 py-2 rounded-xl bg-[#1e1e1e] hover:bg-white/10 text-white text-xs font-bold disabled:opacity-40 transition-colors cursor-pointer"
          >
            បន្ទាប់ →
          </button>
        </div>
      )}
    </main>
  );
}
