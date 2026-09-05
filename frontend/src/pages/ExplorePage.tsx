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
  const [searchParams] = useSearchParams();
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
  }, [sort, genre, status, type, access, page]);

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
    <main className="min-h-screen pt-20 pb-24 md:pb-8 px-4 md:px-8 max-w-[1600px] mx-auto bg-[#141414] text-gray-100">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-display font-black text-2xl sm:text-3xl text-white mb-1">{title}</h1>
        <p className="text-gray-400 text-sm">សរុប {total.toLocaleString()} រឿង</p>
      </div>

      {/* Grid */}
      <div className="anime-grid">
        {isLoading ? (
          <SkeletonCard count={24} />
        ) : items.length === 0 ? (
          <div className="col-span-full text-center py-20">
            <p className="text-gray-300 text-lg font-bold">រកមិនឃើញរឿងឡើយ</p>
            <p className="text-gray-500 text-sm mt-1">សូមសាកល្បងជ្រើសរើសប្រភេទរឿងផ្សេងទៀត</p>
          </div>
        ) : (
          items.map((a) => <AnimeCard key={a.id} anime={a} />)
        )}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-10">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="btn-secondary px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold disabled:opacity-40"
          >
            ← ថយក្រោយ
          </button>
          {Array.from({ length: Math.min(pages, 7) }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`w-10 h-10 rounded-xl text-sm font-bold transition-all ${
                p === page ? 'bg-[#E50914] text-white shadow-lg shadow-red-600/40' : 'bg-[#1e1e1e] hover:bg-white/10 text-gray-300'
              }`}
            >
              {p}
            </button>
          ))}
          <button
            onClick={() => setPage((p) => Math.min(pages, p + 1))}
            disabled={page === pages}
            className="btn-secondary px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold disabled:opacity-40"
          >
            បន្ទាប់ →
          </button>
        </div>
      )}
    </main>
  );
}
