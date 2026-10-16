import { useState, useEffect, useMemo, useRef } from 'react';
import { Search, X, Play, Star, Sparkles, Film, ArrowRight } from 'lucide-react';
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

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Real live search results
  const results = useMemo(() => {
    if (!query.trim()) return [];
    return searchCatalogSync(query.trim()).slice(0, 8);
  }, [query]);

  // Handle search submission
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
      className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 sm:p-6 bg-black/75 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative bg-[#121318] text-white w-full max-w-2xl rounded-2xl shadow-2xl border border-white/10 overflow-hidden mt-8 sm:mt-0"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header & Search Input */}
        <div className="p-4 sm:p-5 border-b border-white/10">
          <form onSubmit={handleSearch} className="relative flex items-center">
            <Search className="absolute left-4 h-5 w-5 text-amber-400" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={language === 'km' ? 'ស្វែងរកចំណងជើងរឿង ឬឈ្មោះតួអង្គ...' : 'Search Donghua, Anime, Movies...'}
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-12 py-3.5 text-sm sm:text-base text-white placeholder-gray-400 focus:outline-none focus:border-amber-400/80 focus:ring-2 focus:ring-amber-400/20 transition-all"
            />
            {query.length > 0 && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute right-3.5 p-1 text-gray-400 hover:text-white rounded-full hover:bg-white/10 transition-colors"
                aria-label="Clear input"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </form>

          {/* Quick Trending Tags */}
          <div className="mt-3 flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
            <span className="text-[11px] font-medium text-gray-400 flex items-center gap-1 shrink-0">
              <Sparkles className="w-3 h-3 text-amber-400" />
              {language === 'km' ? 'ពេញនិយម:' : 'Trending:'}
            </span>
            {trendingSearches.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => setQuery(tag)}
                className="text-xs px-2.5 py-1 rounded-full bg-white/5 hover:bg-white/15 text-gray-300 hover:text-white border border-white/5 transition-colors whitespace-nowrap"
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        {/* Modal Body / Results */}
        <div className="max-h-[60vh] overflow-y-auto p-4 sm:p-5 space-y-2">
          {query.trim().length === 0 ? (
            <div className="py-8 text-center text-gray-400">
              <Film className="w-10 h-10 mx-auto text-gray-600 mb-2" />
              <p className="text-sm">
                {language === 'km'
                  ? 'វាយបញ្ចូលឈ្មោះរឿងដើម្បីស្វែងរកក្នុងកាតាឡុកពិតប្រាកដ'
                  : 'Type a title to search 70+ animated series and movies'}
              </p>
            </div>
          ) : results.length > 0 ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-gray-400 mb-2 px-1">
                <span>
                  {language === 'km' ? `លទ្ធផលរកឃើញ (${results.length})` : `Matches found (${results.length})`}
                </span>
                <button
                  onClick={handleSearch}
                  className="text-amber-400 hover:underline flex items-center gap-1"
                >
                  {language === 'km' ? 'មើលទាំងអស់' : 'View all'}
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>

              {results.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleSelectAnime(item)}
                  className="flex items-center gap-3.5 p-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 hover:border-amber-400/30 cursor-pointer transition-all group"
                >
                  <div className="relative w-12 h-16 sm:w-14 sm:h-20 shrink-0 rounded-lg overflow-hidden bg-gray-900 border border-white/10">
                    <img
                      src={item.poster_url || item.banner_url || ''}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = `/posters/${item.slug}.jpg`;
                      }}
                    />
                    {!item.is_free && (
                      <span className="absolute top-1 left-1 bg-amber-500 text-black text-[9px] font-black px-1 rounded">
                        VIP
                      </span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-400/10 text-amber-300 border border-amber-400/20">
                        {item.type || 'DONGHUA'}
                      </span>
                      <span className="text-xs text-gray-400">
                        {item.year || 2024}
                      </span>
                      {item.average_rating ? (
                        <span className="flex items-center gap-0.5 text-xs text-amber-400 font-semibold">
                          <Star className="w-3 h-3 fill-amber-400" />
                          {item.average_rating.toFixed(1)}
                        </span>
                      ) : null}
                    </div>

                    <h4 className="text-sm font-semibold text-white truncate group-hover:text-amber-400 transition-colors">
                      {item.title}
                    </h4>

                    {item.alt_title && (
                      <p className="text-xs text-gray-400 truncate">
                        {item.alt_title}
                      </p>
                    )}

                    <div className="flex items-center gap-2 mt-1 text-[11px] text-gray-400">
                      <span>{item.episode_count ? `${item.episode_count} eps` : 'Ongoing'}</span>
                      {item.genres && item.genres.length > 0 && (
                        <>
                          <span>•</span>
                          <span className="truncate text-gray-400">
                            {item.genres.map((g) => g.name).slice(0, 2).join(', ')}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="pr-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-8 h-8 rounded-full bg-amber-400 text-black flex items-center justify-center shadow-lg">
                      <Play className="w-4 h-4 fill-black translate-x-0.5" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-10 text-center text-gray-400">
              <p className="text-sm mb-2">
                {language === 'km'
                  ? `មិនមានលទ្ធផលសម្រាប់ "${query}" ទេ`
                  : `No exact matches for "${query}"`}
              </p>
              <button
                type="button"
                onClick={handleSearch}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-400/20 hover:bg-amber-400/30 text-amber-300 rounded-lg text-xs font-semibold transition-colors"
              >
                <Search className="w-3.5 h-3.5" />
                {language === 'km' ? 'ស្វែងរកទូទៅក្នុងទំព័រ Explore' : 'Search full database in Explore'}
              </button>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 bg-black/40 border-t border-white/5 flex items-center justify-between text-xs text-gray-400">
          <span>{translate('Press ESC to close', language) || 'ESC to close'}</span>
          <button
            onClick={onClose}
            className="text-gray-300 hover:text-white transition-colors"
          >
            {translate('Close', language) || 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default SearchModal;