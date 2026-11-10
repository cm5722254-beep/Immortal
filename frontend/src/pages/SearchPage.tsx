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
import { translate, useLanguageStore } from '../store/languageStore';

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
  const appLanguage = useLanguageStore((state) => state.language);
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
    <main className="min-h-screen pb-24 md:pb-16 bg-bg-base text-text-primary px-4 sm:px-6 lg:px-8 py-6 max-w-7xl mx-auto">
      {/* ── Page Title ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display font-black text-2xl sm:text-3xl text-text-primary tracking-tight flex items-center gap-2.5">
            <span className="w-2.5 h-7 rounded-full bg-blue-600" />
            {translate('Title search and advanced filters', appLanguage)}
          </h1>
          <p className="text-text-secondary text-xs sm:text-sm mt-1">
            {translate('Search anime, donghua, and movies in 4K.', appLanguage)}
          </p>
        </div>

        {/* Filter Toggle Button */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`px-4 py-2.5 rounded-xl border text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
            showFilters || hasActiveFilters
              ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-600/25'
              : 'bg-bg-card text-text-secondary border-border-subtle hover:border-border-focus hover:text-text-primary'
          }`}
        >
          <SlidersHorizontal className="w-4 h-4" />
          <span>{translate('Filters', appLanguage)}</span>
          {hasActiveFilters && (
            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
          )}
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* ── Search Input & Autocomplete Popover ── */}
      <div ref={searchContainerRef} className="relative mb-6 max-w-3xl">
        <div className="relative">
          <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-600 w-5 h-5 pointer-events-none" />
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
            placeholder={translate('Enter a title to search...', appLanguage)}
            autoFocus
            className="w-full pl-12 pr-11 py-3.5 text-sm sm:text-base rounded-2xl bg-bg-card border border-border-subtle focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 text-text-primary placeholder-text-secondary outline-none transition-all shadow-inner"
            aria-label={translate('Search title', appLanguage)}
          />
          {query && (
            <button
              onClick={clearSearch}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-bg-subtle flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
              title={translate('Clear search', appLanguage)}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Live Autocomplete Popover Dropdown */}
        {showSuggestions && autocompleteSuggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-bg-card border border-border-subtle rounded-2xl shadow-2xl backdrop-blur-xl z-50 overflow-hidden animate-scale-in">
            <div className="p-2 border-b border-border-subtle flex items-center justify-between text-[11px] text-text-secondary font-bold px-3">
              <span>{translate('Quick suggestions count', appLanguage)} ({autocompleteSuggestions.length})</span>
              <span>{translate('Tap a title to watch.', appLanguage)}</span>
            </div>
            <div className="divide-y divide-border-subtle max-h-80 overflow-y-auto">
              {autocompleteSuggestions.map((item) => (
                <Link
                  key={item.id}
                  to={`/watch/${item.slug}/1`}
                  onClick={() => setShowSuggestions(false)}
                  className="flex items-center gap-3 p-3 hover:bg-bg-subtle transition-colors group cursor-pointer"
                >
                  <img
                    src={item.poster_url || '/placeholder-poster.png'}
                    alt={item.title}
                    className="w-11 h-14 object-cover rounded-lg shrink-0 border border-border-subtle group-hover:border-blue-600 transition-all"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-text-primary text-sm font-bold truncate group-hover:text-blue-600 transition-colors">
                      {item.title}
                    </p>
                    {item.alt_title && (
                      <p className="text-text-secondary text-xs truncate">
                        {item.alt_title}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-1 text-[10px] text-text-secondary">
                      <span className="px-1.5 py-0.5 rounded bg-bg-subtle text-text-secondary font-semibold">
                        {item.type === 'DONGHUA' ? translate('Donghua 3D', appLanguage) : item.type === 'MOVIE' ? translate('Movies', appLanguage) : translate('Anime', appLanguage)}
                      </span>
                      {item.year && <span>{item.year}</span>}
                      {item.average_rating > 0 && (
                        <span className="flex items-center gap-0.5 text-amber-500">
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
        <div className="mb-6 p-4 sm:p-5 rounded-2xl bg-bg-card border border-border-subtle space-y-4 animate-scale-in">
          <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
            <div className="flex items-center gap-2 text-sm font-black text-text-primary">
              <Filter className="w-4 h-4 text-blue-600" />
              <span>{translate('Filter options', appLanguage)}</span>
            </div>
            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="text-xs text-rose-500 hover:text-rose-600 flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{translate('Reset', appLanguage)}</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Content Type Filter */}
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-2">{translate('Type', appLanguage)}</label>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { value: 'ALL', label: 'All' },
                  { value: 'DONGHUA', label: 'Donghua 3D' },
                  { value: 'ANIME', label: 'Japanese Anime' },
                  { value: 'MOVIE', label: 'Movies (Movie)' },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setContentType(opt.value as ContentTypeFilter)}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all text-left flex items-center justify-between cursor-pointer border ${
                      contentType === opt.value
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'bg-slate-50 text-slate-700 border-slate-200/80 hover:bg-slate-100'
                    }`}
                  >
                    <span>{translate(opt.label, appLanguage)}</span>
                    {contentType === opt.value && <Check className="w-3.5 h-3.5" />}
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Language Filter (Dub / Sub) */}
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-2">{translate('Language', appLanguage)}</label>
              <div className="space-y-1.5">
                {[
                  { value: 'ALL', label: 'All audio' },
                  { value: 'DUB', label: 'Khmer dub' },
                  { value: 'SUB', label: 'Khmer subtitles' },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setLanguage(opt.value as LanguageFilter)}
                    className={`w-full px-3 py-2 rounded-xl text-xs font-semibold transition-all text-left flex items-center justify-between cursor-pointer border ${
                      language === opt.value
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'bg-slate-50 text-slate-700 border-slate-200/80 hover:bg-slate-100'
                    }`}
                  >
                    <span>{translate(opt.label, appLanguage)}</span>
                    {language === opt.value && <Check className="w-3.5 h-3.5" />}
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Status Filter */}
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-2">{translate('Status', appLanguage)}</label>
              <div className="space-y-1.5">
                {[
                  { value: 'ALL', label: 'All' },
                  { value: 'ONGOING', label: 'Ongoing (status)' },
                  { value: 'COMPLETED', label: 'Completed (status)' },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setStatus(opt.value as StatusFilter)}
                    className={`w-full px-3 py-2 rounded-xl text-xs font-semibold transition-all text-left flex items-center justify-between cursor-pointer border ${
                      status === opt.value
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'bg-slate-50 text-slate-700 border-slate-200/80 hover:bg-slate-100'
                    }`}
                  >
                    <span>{translate(opt.label, appLanguage)}</span>
                    {status === opt.value && <Check className="w-3.5 h-3.5" />}
                  </button>
                ))}
              </div>
            </div>

            {/* 4. Sort Filter */}
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-2">{translate('Sort by', appLanguage)}</label>
              <div className="space-y-1.5">
                {[
                  { value: 'LATEST', label: 'Latest first' },
                  { value: 'VIEWS', label: 'Most viewed' },
                  { value: 'RATING', label: 'Highest rated' },
                  { value: 'TITLE', label: 'Title A to Z' },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setSortBy(opt.value as SortFilter)}
                    className={`w-full px-3 py-2 rounded-xl text-xs font-semibold transition-all text-left flex items-center justify-between cursor-pointer border ${
                      sortBy === opt.value
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'bg-slate-50 text-slate-700 border-slate-200/80 hover:bg-slate-100'
                    }`}
                  >
                    <span>{translate(opt.label, appLanguage)}</span>
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
          <p className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" /> {translate('Search popular titles', appLanguage)}
          </p>
          <div className="flex flex-wrap gap-2">
            {POPULAR_SEARCHES.map((term) => (
              <button
                key={term}
                onClick={() => handleChipClick(term)}
                className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-600 border border-slate-200/90 hover:border-blue-200 transition-all cursor-pointer active:scale-95 shadow-xs"
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
        <div className="text-center py-16 space-y-3 bg-white rounded-3xl border border-slate-200/80 p-8 shadow-xs">
          <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-center mx-auto text-slate-400">
            <SearchIcon className="w-7 h-7 text-slate-400" />
          </div>
          <p className="text-slate-900 text-base font-bold">
            {translate('No results for this search', appLanguage)}{query && appLanguage === 'km' ? ` សម្រាប់ "${query}"` : query ? ` for "${query}"` : ''}
          </p>
          <p className="text-slate-500 text-xs max-w-sm mx-auto">
            {translate('Try another title or reset filters.', appLanguage)}
          </p>
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="mt-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition cursor-pointer shadow-xs"
            >
              {translate('Clear all filters', appLanguage)}
            </button>
          )}
        </div>
      ) : results.length > 0 ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs sm:text-sm text-slate-500 font-medium flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-600" />
              {translate('Showing results', appLanguage)} <strong className="text-slate-900 font-bold">{results.length}</strong> {translate('titles', appLanguage)}
              {query && <span>{appLanguage === 'km' ? `សម្រាប់ពាក្យ "${query}"` : `for "${query}"`}</span>}
            </p>
            {hasActiveFilters && (
              <span className="text-xs text-blue-600 font-semibold bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200">
                {translate('Filter active', appLanguage)}
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
        <div className="text-center py-20 space-y-3 bg-white rounded-3xl border border-slate-200/80 shadow-xs">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center mx-auto text-blue-600">
            <SearchIcon className="w-7 h-7 text-blue-600" />
          </div>
          <p className="text-slate-900 text-sm sm:text-base font-bold">{translate('Search for something to watch', appLanguage)}</p>
          <p className="text-slate-500 text-xs max-w-xs mx-auto">
            {translate('Search and watch popular titles in 4K.', appLanguage)}
          </p>
        </div>
      )}
    </main>
  );
}
