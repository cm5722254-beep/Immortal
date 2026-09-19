import { useCallback, useEffect, useState, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Search as SearchIcon, X, Sparkles, Filter, SlidersHorizontal,
  ChevronDown, RotateCcw, Check, Star
} from 'lucide-react';
import { AnimeCard } from '../components/home/AnimeCard';
import { SkeletonCard } from '../components/common/SkeletonLoader';
import api from '../services/api';
import { searchCatalogSync, loadCatalog, getLocalCatalogSync } from '../services/catalogService';
import type { Anime } from '../types';

const POPULAR_SEARCHES = [
  'គុជអមតះធៀននី',
  'ពិភពនៃថាមពលវេទមន្ត',
  'ដាវទេពប្រយុទ្ធមេឃា',
  'ពិភពដួងវិញ្ញាណ',
  'ដាវទេពជូសៀន',
  'ផ្កាយលេបត្របាក់',
  'គ្រូពេទ្យទេវតា',
  'អ្នកបួសបះបោរ',
  'បាំងបិទមេឃា',
  'Battle Through the Heavens',
  'Soul Land',
  'Perfect World',
];

type ContentTypeFilter = 'ALL' | 'DONGHUA' | 'ANIME' | 'MOVIE';
type LanguageFilter = 'ALL' | 'DUB' | 'SUB';
type StatusFilter = 'ALL' | 'ONGOING' | 'COMPLETED';
type SortFilter = 'LATEST' | 'VIEWS' | 'RATING' | 'TITLE';

export function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQ = searchParams.get('q') || '';
  const [query, setQuery] = useState(initialQ);
  const [results, setResults] = useState<Anime[]>([]);
  const [autocompleteSuggestions, setAutocompleteSuggestions] = useState<Anime[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Filter States
  const [contentType, setContentType] = useState<ContentTypeFilter>('ALL');
  const [language, setLanguage] = useState<LanguageFilter>('ALL');
  const [status, setStatus] = useState<StatusFilter>('ALL');
  const [sortBy, setSortBy] = useState<SortFilter>('LATEST');

  const debounceRef = useRef<number | undefined>(undefined);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Pre-fetch catalog for instant searches
  useEffect(() => {
    loadCatalog();
  }, []);

  // Close suggestions when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Apply filters and sorting to any list of animes
  const applyFiltersAndSort = useCallback((items: Anime[]): Anime[] => {
    let filtered = [...items];

    // Filter by Type
    if (contentType !== 'ALL') {
      filtered = filtered.filter(a => a.type === contentType);
    }

    // Filter by Language (Dub / Sub)
    if (language === 'DUB') {
      filtered = filtered.filter(a => {
        const titleLower = (a.title + ' ' + (a.alt_title || '')).toLowerCase();
        return !titleLower.includes('sub') || titleLower.includes('dub') || titleLower.includes('និយាយខ្មែរ');
      });
    } else if (language === 'SUB') {
      filtered = filtered.filter(a => {
        const titleLower = (a.title + ' ' + (a.alt_title || '')).toLowerCase();
        return titleLower.includes('sub') || titleLower.includes('អក្សររត់');
      });
    }

    // Filter by Status
    if (status !== 'ALL') {
      filtered = filtered.filter(a => a.status === status);
    }

    // Sort
    filtered.sort((a, b) => {
      if (sortBy === 'VIEWS') {
        return (b.view_count || 0) - (a.view_count || 0);
      }
      if (sortBy === 'RATING') {
        return (b.average_rating || 0) - (a.average_rating || 0);
      }
      if (sortBy === 'TITLE') {
        return a.title.localeCompare(b.title, 'km');
      }
      // Default: Latest by id / year
      return (b.year || 0) - (a.year || 0) || b.id - a.id;
    });

    return filtered;
  }, [contentType, language, status, sortBy]);

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      // If query is empty but filter is applied, show filtered full catalog
      const all = getLocalCatalogSync()?.anime || [];
      if (all && all.length > 0) {
        setResults(applyFiltersAndSort(all));
      } else {
        setResults([]);
      }
      setIsLoading(false);
      return;
    }

    // 1. Instant 0ms local search
    const localMatches = searchCatalogSync(q);
    if (localMatches.length > 0) {
      setResults(applyFiltersAndSort(localMatches));
      setIsLoading(false);
    } else {
      setIsLoading(true);
    }

    // 2. Background API search for complete results
    try {
      const res = await api.get(`/search?q=${encodeURIComponent(q.trim())}`);
      if (res.data && Array.isArray(res.data) && res.data.length > 0) {
        setResults(applyFiltersAndSort(res.data));
      }
    } catch {
      // If API fails, localMatches is already preserved
    } finally {
      setIsLoading(false);
    }
  }, [applyFiltersAndSort]);

  // Handle URL Param changes
  useEffect(() => {
    const q = searchParams.get('q') || '';
    setQuery(q);
    doSearch(q);
  }, [searchParams, doSearch]);

  // Re-apply filters when filters change
  useEffect(() => {
    if (query.trim()) {
      const localMatches = searchCatalogSync(query);
      setResults(applyFiltersAndSort(localMatches));
    } else if (contentType !== 'ALL' || language !== 'ALL' || status !== 'ALL' || sortBy !== 'LATEST') {
      const all = getLocalCatalogSync()?.anime || [];
      if (all && all.length > 0) {
        setResults(applyFiltersAndSort(all));
      }
    }
  }, [contentType, language, status, sortBy, applyFiltersAndSort, query]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);

    // Instant filter on type
    if (val.trim()) {
      const instant = searchCatalogSync(val);
      setAutocompleteSuggestions(instant.slice(0, 6));
      setShowSuggestions(true);
      setResults(applyFiltersAndSort(instant));
    } else {
      setAutocompleteSuggestions([]);
      setShowSuggestions(false);
      setResults([]);
    }

    clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      const p = new URLSearchParams(searchParams);
      if (val.trim()) p.set('q', val.trim()); else p.delete('q');
      setSearchParams(p);
    }, 250);
  };

  const handleChipClick = (term: string) => {
    setQuery(term);
    setShowSuggestions(false);
    const p = new URLSearchParams(searchParams);
    p.set('q', term);
    setSearchParams(p);
  };

  const clearSearch = () => {
    setQuery('');
    setResults([]);
    setAutocompleteSuggestions([]);
    setShowSuggestions(false);
    setSearchParams({});
  };

  const resetFilters = () => {
    setContentType('ALL');
    setLanguage('ALL');
    setStatus('ALL');
    setSortBy('LATEST');
  };

  const hasActiveFilters = contentType !== 'ALL' || language !== 'ALL' || status !== 'ALL' || sortBy !== 'LATEST';

  return (
    <main className="min-h-screen pb-24 md:pb-16 bg-[#141414] text-gray-100 px-4 sm:px-6 lg:px-8 py-6 max-w-7xl mx-auto">
      {/* ── Page Title ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display font-black text-2xl sm:text-3xl text-white tracking-tight flex items-center gap-2.5">
            <span className="w-2.5 h-7 rounded-full bg-[#E50914]" />
            ស្វែងរកចំណងជើងរឿង & តម្រងកម្រិតខ្ពស់
          </h1>
          <p className="text-gray-400 text-xs sm:text-sm mt-1">
            ស្វែងរករឿងចិន 3D, Anime ជប៉ុន និងភាពយន្តច្រើនជាង 75+ រឿងកម្រិត 4K Ultra HD
          </p>
        </div>

        {/* Filter Toggle Button */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`px-4 py-2.5 rounded-xl border text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
            showFilters || hasActiveFilters
              ? 'bg-[#E50914] text-white border-[#E50914] shadow-lg shadow-[#E50914]/25'
              : 'bg-[#1e1e1e] text-gray-300 border-white/10 hover:border-white/20 hover:text-white'
          }`}
        >
          <SlidersHorizontal className="w-4 h-4" />
          <span>តម្រងស្វែងរក (Filters)</span>
          {hasActiveFilters && (
            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
          )}
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* ── Search Input & Autocomplete Popover ── */}
      <div ref={searchContainerRef} className="relative mb-6 max-w-3xl">
        <div className="relative">
          <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-[#E50914] w-5 h-5 pointer-events-none" />
          <input
            id="search-input"
            type="text"
            value={query}
            onChange={handleChange}
            onFocus={() => {
              if (query.trim() && autocompleteSuggestions.length > 0) {
                setShowSuggestions(true);
              }
            }}
            placeholder="វាយបញ្ចូលឈ្មោះរឿងចិន 3D, រឿងជប៉ុន, ឬឈ្មោះភាសាអង់គ្លេស..."
            autoFocus
            className="w-full pl-12 pr-11 py-3.5 text-sm sm:text-base rounded-2xl bg-[#1e1e1e] border border-white/10 focus:border-[#E50914] focus:ring-2 focus:ring-[#E50914]/20 text-white placeholder-gray-400 outline-none transition-all shadow-inner"
            aria-label="ស្វែងរក"
          />
          {query && (
            <button
              onClick={clearSearch}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors cursor-pointer"
              title="លុបពាក្យស្វែងរក"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Live Autocomplete Popover Dropdown */}
        {showSuggestions && autocompleteSuggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-[#181818] border border-white/15 rounded-2xl shadow-2xl backdrop-blur-xl z-50 overflow-hidden animate-scale-in">
            <div className="p-2 border-b border-white/10 flex items-center justify-between text-[11px] text-gray-400 font-bold px-3">
              <span>លទ្ធផលណែនាំរហ័ស ({autocompleteSuggestions.length})</span>
              <span>ចុចលើរឿងដើម្បីទស្សនាផ្ទាល់</span>
            </div>
            <div className="divide-y divide-white/5 max-h-80 overflow-y-auto">
              {autocompleteSuggestions.map((item) => (
                <Link
                  key={item.id}
                  to={`/anime/${item.slug}`}
                  onClick={() => setShowSuggestions(false)}
                  className="flex items-center gap-3 p-3 hover:bg-white/10 transition-colors group cursor-pointer"
                >
                  <img
                    src={item.poster_url || '/placeholder-poster.png'}
                    alt={item.title}
                    className="w-11 h-14 object-cover rounded-lg shrink-0 border border-white/10 group-hover:border-[#E50914] transition-all"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-bold truncate group-hover:text-[#E50914] transition-colors">
                      {item.title}
                    </p>
                    {item.alt_title && (
                      <p className="text-gray-400 text-xs truncate">
                        {item.alt_title}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-1 text-[10px] text-gray-400">
                      <span className="px-1.5 py-0.5 rounded bg-white/10 text-gray-300 font-semibold">
                        {item.type === 'DONGHUA' ? 'រឿងចិន 3D' : item.type === 'MOVIE' ? 'ភាពយន្ត' : 'Anime'}
                      </span>
                      {item.year && <span>{item.year}</span>}
                      {item.average_rating > 0 && (
                        <span className="flex items-center gap-0.5 text-amber-400">
                          <Star className="w-3 h-3 fill-current" /> {item.average_rating.toFixed(1)}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Multi-Criteria Filter Panel ── */}
      {showFilters && (
        <div className="mb-6 p-4 sm:p-5 rounded-2xl bg-[#1e1e1e] border border-white/10 space-y-4 animate-scale-in">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div className="flex items-center gap-2 text-sm font-black text-white">
              <Filter className="w-4 h-4 text-[#E50914]" />
              <span>កំណត់លក្ខខណ្ឌចម្រាញ់</span>
            </div>
            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>កំណត់ឡើងវិញ (Reset)</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Content Type Filter */}
            <div>
              <label className="block text-xs font-bold text-gray-400 mb-2">ប្រភេទសាច់រឿង (Type)</label>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { value: 'ALL', label: 'ទាំងអស់' },
                  { value: 'DONGHUA', label: 'រឿងចិន 3D' },
                  { value: 'ANIME', label: 'Anime ជប៉ុន' },
                  { value: 'MOVIE', label: 'ភាពយន្ត Movie' },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setContentType(opt.value as ContentTypeFilter)}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all text-left flex items-center justify-between cursor-pointer ${
                      contentType === opt.value
                        ? 'bg-[#E50914] text-white'
                        : 'bg-white/5 text-gray-300 hover:bg-white/10'
                    }`}
                  >
                    <span>{opt.label}</span>
                    {contentType === opt.value && <Check className="w-3.5 h-3.5" />}
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Language Filter (Dub / Sub) */}
            <div>
              <label className="block text-xs font-bold text-gray-400 mb-2">ភាសា & សំឡេង (Language)</label>
              <div className="space-y-1.5">
                {[
                  { value: 'ALL', label: 'ទាំងអស់ (All Audio)' },
                  { value: 'DUB', label: 'និយាយខ្មែរ (KH DUB)' },
                  { value: 'SUB', label: 'អក្សររត់ខ្មែរ (SUB KH)' },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setLanguage(opt.value as LanguageFilter)}
                    className={`w-full px-3 py-2 rounded-xl text-xs font-semibold transition-all text-left flex items-center justify-between cursor-pointer ${
                      language === opt.value
                        ? 'bg-[#E50914] text-white'
                        : 'bg-white/5 text-gray-300 hover:bg-white/10'
                    }`}
                  >
                    <span>{opt.label}</span>
                    {language === opt.value && <Check className="w-3.5 h-3.5" />}
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Status Filter */}
            <div>
              <label className="block text-xs font-bold text-gray-400 mb-2">ស្ថានភាពផ្សាយ (Status)</label>
              <div className="space-y-1.5">
                {[
                  { value: 'ALL', label: 'ទាំងអស់' },
                  { value: 'ONGOING', label: 'កំពុងចាក់ផ្សាយ (ONGOING)' },
                  { value: 'COMPLETED', label: 'ចប់ហើយ (COMPLETED)' },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setStatus(opt.value as StatusFilter)}
                    className={`w-full px-3 py-2 rounded-xl text-xs font-semibold transition-all text-left flex items-center justify-between cursor-pointer ${
                      status === opt.value
                        ? 'bg-[#E50914] text-white'
                        : 'bg-white/5 text-gray-300 hover:bg-white/10'
                    }`}
                  >
                    <span>{opt.label}</span>
                    {status === opt.value && <Check className="w-3.5 h-3.5" />}
                  </button>
                ))}
              </div>
            </div>

            {/* 4. Sort Filter */}
            <div>
              <label className="block text-xs font-bold text-gray-400 mb-2">តម្រៀបតាម (Sort By)</label>
              <div className="space-y-1.5">
                {[
                  { value: 'LATEST', label: 'ចុងក្រោយបង្អស់ (Latest)' },
                  { value: 'VIEWS', label: 'មើលច្រើនជាងគេ (Popular)' },
                  { value: 'RATING', label: 'ពិន្ទុខ្ពស់ជាងគេ (Top Rated)' },
                  { value: 'TITLE', label: 'តាមតួអក្សរ (A - Z)' },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setSortBy(opt.value as SortFilter)}
                    className={`w-full px-3 py-2 rounded-xl text-xs font-semibold transition-all text-left flex items-center justify-between cursor-pointer ${
                      sortBy === opt.value
                        ? 'bg-[#E50914] text-white'
                        : 'bg-white/5 text-gray-300 hover:bg-white/10'
                    }`}
                  >
                    <span>{opt.label}</span>
                    {sortBy === opt.value && <Check className="w-3.5 h-3.5" />}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Quick search chips ── */}
      {!query && !hasActiveFilters && (
        <div className="mb-8 space-y-3">
          <p className="text-xs font-bold text-gray-400 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#E50914]" /> ពាក្យពេញនិយមស្វែងរក
          </p>
          <div className="flex flex-wrap gap-2">
            {POPULAR_SEARCHES.map((term) => (
              <button
                key={term}
                onClick={() => handleChipClick(term)}
                className="px-3.5 py-1.5 rounded-full text-xs font-medium bg-[#1e1e1e] hover:bg-[#E50914] text-gray-300 hover:text-white border border-white/10 transition-all cursor-pointer active:scale-95 shadow-sm"
              >
                {term}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Results / Empty State ── */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5">
          <SkeletonCard count={12} />
        </div>
      ) : (query || hasActiveFilters) && results.length === 0 ? (
        <div className="text-center py-16 space-y-3 bg-[#181818]/60 rounded-3xl border border-white/5 p-8">
          <div className="w-16 h-16 rounded-full bg-[#1e1e1e] border border-white/10 flex items-center justify-center mx-auto text-gray-500">
            <SearchIcon className="w-8 h-8 text-gray-500" />
          </div>
          <p className="text-gray-200 text-base font-bold">
            រកមិនឃើញលទ្ធផល {query ? `សម្រាប់ "${query}"` : 'តាមលក្ខខណ្ឌតម្រងនេះ'} ឡើយ
          </p>
          <p className="text-gray-400 text-xs max-w-sm mx-auto">
            សូមសាកល្បងវាយបញ្ចូលឈ្មោះរឿងផ្សេងទៀត ឬចុចកំណត់ឡើងវិញនូវតម្រងស្វែងរក។
          </p>
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="mt-2 px-4 py-2 rounded-xl bg-[#E50914] text-white text-xs font-bold transition cursor-pointer"
            >
              លុបលក្ខខណ្ឌតម្រងទាំងអស់
            </button>
          )}
        </div>
      ) : results.length > 0 ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs sm:text-sm text-gray-400 font-medium flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#E50914]" />
              រកឃើញចំនួន <strong className="text-white font-bold">{results.length}</strong> រឿង
              {query && <span>សម្រាប់ពាក្យ "{query}"</span>}
            </p>
            {hasActiveFilters && (
              <span className="text-xs text-[#E50914] font-semibold bg-[#E50914]/10 px-2.5 py-1 rounded-full border border-[#E50914]/30">
                កំពុងប្រើតម្រង
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5 sm:gap-4">
            {results.map((a) => (
              <AnimeCard key={a.id} anime={a} />
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-20 space-y-3">
          <div className="w-16 h-16 rounded-full bg-[#1e1e1e] border border-white/10 flex items-center justify-center mx-auto text-[#E50914] shadow-lg shadow-[#E50914]/10">
            <SearchIcon className="w-8 h-8 text-[#E50914]" />
          </div>
          <p className="text-gray-200 text-sm sm:text-base font-bold">ស្វែងរករឿងដែលអ្នកចូលចិត្ត</p>
          <p className="text-gray-400 text-xs max-w-xs mx-auto">
            ស្វែងរក និងទស្សនារឿងចិន 3D, Anime ជប៉ុន និងភាពយន្តល្បីៗជាច្រើនកម្រិត 4K Ultra HD។
          </p>
        </div>
      )}
    </main>
  );
}
