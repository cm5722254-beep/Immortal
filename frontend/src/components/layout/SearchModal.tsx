import { useState, useEffect, useMemo, useRef } from 'react';
import { Search, X, Play, Star, Film, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { searchCatalogSync } from '../../services/catalogService';
import type { Anime } from '../../types';
import { useLanguageStore, translate } from '../../store/languageStore';

export function SearchModal({
  isOpen,
  onClose,
  onSearch,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSearch: (query: string) => void;
}) {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  const language = useLanguageStore((state) => state.language);
  const inputRef = useRef<HTMLInputElement>(null);

  const trendingSearches = [
    'Renegade Immortal',
    'Swallowed Star',
    'A Will Eternal',
    'Perfect World',
    'Soul Land',
    'Big Brother',
  ];

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    return searchCatalogSync(query.trim()).slice(0, 8);
  }, [query]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query.trim());
    }
  };

  const handleSelectAnime = (anime: Anime) => {
    onClose();
    navigate(`/watch/${anime.slug}/1`);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-3 sm:p-6 bg-slate-900/40 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative bg-white/95 backdrop-blur-2xl text-slate-900 w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200/90 overflow-hidden mt-6 sm:mt-0 animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Apple Spotlight Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 bg-white">
          <form onSubmit={handleSearch} className="relative flex items-center">
            <Search className="absolute left-4 h-5 w-5 text-blue-600 pointer-events-none" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={language === 'km' ? 'ស្វែងរកចំណងជើងរឿង ដើម្បីចុចមើលភ្លាមៗ...' : 'Search Donghua, Anime, Movies...'}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-12 py-3.5 text-sm sm:text-base text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
            />
            {query.length > 0 ? (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute right-3.5 p-1.5 text-slate-400 hover:text-slate-900 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
                aria-label="Clear input"
              >
                <X className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="absolute right-3.5 p-1.5 text-slate-400 hover:text-slate-900 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
                aria-label="Close search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </form>

          {/* Quick Trending Tags */}
          <div className="mt-3 flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            <span className="text-[11px] font-bold text-slate-400 shrink-0 pr-1">
              {language === 'km' ? 'ពេញនិយម៖' : 'Trending:'}
            </span>
            {trendingSearches.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => setQuery(tag)}
                className="text-xs px-3 py-1 rounded-full bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-600 border border-slate-200/80 hover:border-blue-200 font-medium transition-colors whitespace-nowrap cursor-pointer"
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        {/* Results */}
        <div className="max-h-[60vh] overflow-y-auto p-4 sm:p-5 space-y-2 bg-slate-50/50">
          {query.trim().length === 0 ? (
            <div className="py-10 text-center text-slate-500">
              <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200/80 flex items-center justify-center mx-auto mb-3 shadow-xs">
                <Film className="w-6 h-6 text-blue-600" />
              </div>
              <p className="text-xs sm:text-sm font-medium text-slate-600">
                {language === 'km'
                  ? 'វាយបញ្ចូលឈ្មោះរឿង រួចចុចលើលទ្ធផលដើម្បីចូលទស្សនាភ្លាមៗ'
                  : 'Type any title and tap a result to play immediately'}
              </p>
            </div>
          ) : results.length > 0 ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-2 px-1">
                <span className="font-semibold">
                  {language === 'km' ? `លទ្ធផលរកឃើញ (${results.length})` : `Matches found (${results.length})`}
                </span>
                <button
                  onClick={handleSearch}
                  className="text-blue-600 hover:text-blue-700 font-bold flex items-center gap-1 cursor-pointer"
                >
                  {language === 'km' ? 'មើលទាំងអស់' : 'View all'}
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {results.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleSelectAnime(item)}
                  className="flex items-center gap-3.5 p-2.5 rounded-2xl bg-white hover:bg-blue-50/40 border border-slate-200/80 hover:border-blue-300 shadow-xs cursor-pointer transition-all group"
                >
                  <div className="relative w-12 h-16 sm:w-14 sm:h-20 shrink-0 rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
                    <img
                      src={item.poster_url || item.banner_url || ''}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = `/posters/${item.slug}.jpg`;
                      }}
                    />
                    {!item.is_free && (
                      <span className="absolute top-1 left-1 bg-amber-400 text-slate-950 text-[9px] font-black px-1.5 py-0.5 rounded-md shadow-xs">
                        VIP
                      </span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200/70">
                        {item.type || 'DONGHUA'}
                      </span>
                      <span className="text-xs text-slate-500 font-medium">
                        {item.year || 2024}
                      </span>
                      {item.average_rating ? (
                        <span className="flex items-center gap-0.5 text-xs text-amber-600 font-bold">
                          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                          {item.average_rating.toFixed(1)}
                        </span>
                      ) : null}
                    </div>

                    <h4 className="text-sm font-bold text-slate-900 truncate group-hover:text-blue-600 transition-colors">
                      {item.title}
                    </h4>

                    {item.alt_title && (
                      <p className="text-xs text-slate-500 truncate">
                        {item.alt_title}
                      </p>
                    )}

                    <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400 font-medium">
                      <span>{item.episode_count ? `${item.episode_count} ភាគ` : 'Ongoing'}</span>
                      {item.genres && item.genres.length > 0 && (
                        <>
                          <span>•</span>
                          <span className="truncate">
                            {item.genres.map((g) => g.name).slice(0, 2).join(', ')}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="pr-1">
                    <div className="w-9 h-9 rounded-full bg-blue-50 group-hover:bg-blue-600 text-blue-600 group-hover:text-white flex items-center justify-center transition-colors shadow-xs">
                      <Play className="w-4 h-4 fill-current translate-x-0.5" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-10 text-center text-slate-500">
              <p className="text-sm font-semibold text-slate-700 mb-3">
                {language === 'km'
                  ? `មិនមានលទ្ធផលសម្រាប់ "${query}" ទេ`
                  : `No exact matches for "${query}"`}
              </p>
              <button
                type="button"
                onClick={handleSearch}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-full text-xs font-bold transition-colors shadow-xs cursor-pointer"
              >
                <Search className="w-3.5 h-3.5" />
                {language === 'km' ? 'ស្វែងរកក្នុងទំព័រ Search' : 'Search all titles'}
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-white border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
          <span>{translate('Press ESC to close', language) || 'ESC to close'}</span>
          <button
            onClick={onClose}
            className="text-slate-600 hover:text-slate-900 font-semibold transition-colors cursor-pointer"
          >
            {translate('Close', language) || 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default SearchModal;
