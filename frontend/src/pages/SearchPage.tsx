import { useCallback, useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search as SearchIcon, X, Sparkles } from 'lucide-react';
import { AnimeCard } from '../components/home/AnimeCard';
import { SkeletonCard } from '../components/common/SkeletonLoader';
import api from '../services/api';
import { searchCatalogSync, loadCatalog } from '../services/catalogService';
import type { Anime } from '../types';

const POPULAR_SEARCHES = [
  'ដាវទេពប្រយុទ្ធមេឃា',
  'ពិភពដួងវិញ្ញាណ',
  'ពិភពដ៏ល្អឥតខ្ចោះ',
  'ដាវទេពជូសៀន',
  'ផ្កាយលេបត្របាក់',
  'អ្នកបួសបះបោរ',
  'បាំងបិទមេឃា',
  'Battle Through the Heavens',
  'Soul Land',
  'Perfect World',
];

export function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQ = searchParams.get('q') || '';
  const [results, setResults] = useState<Anime[]>(() => searchCatalogSync(initialQ));
  const [isLoading, setIsLoading] = useState(false);
  const [query, setQuery] = useState(initialQ);
  const debounceRef = useRef<number | undefined>(undefined);

  // Pre-fetch catalog for instant searches
  useEffect(() => {
    loadCatalog();
  }, []);

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    // 1. Instant 0ms local search
    const localMatches = searchCatalogSync(q);
    if (localMatches.length > 0) {
      setResults(localMatches);
      setIsLoading(false);
    } else {
      setIsLoading(true);
    }

    // 2. Background API search
    try {
      const res = await api.get(`/search?q=${encodeURIComponent(q.trim())}`);
      if (res.data && Array.isArray(res.data) && res.data.length > 0) {
        setResults(res.data);
      }
    } catch {} finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const q = searchParams.get('q') || '';
    setQuery(q);
    if (q) doSearch(q);
    else setResults([]);
  }, [searchParams, doSearch]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);

    // Instant filter on type
    if (val.trim()) {
      const instant = searchCatalogSync(val);
      setResults(instant);
    } else {
      setResults([]);
    }

    clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      const p = new URLSearchParams(searchParams);
      if (val.trim()) p.set('q', val.trim()); else p.delete('q');
      setSearchParams(p);
    }, 200);
  };

  const handleChipClick = (term: string) => {
    setQuery(term);
    const p = new URLSearchParams(searchParams);
    p.set('q', term);
    setSearchParams(p);
  };

  const clearSearch = () => {
    setQuery('');
    setResults([]);
    setSearchParams({});
  };

  return (
    <main className="min-h-screen pb-24 md:pb-12 bg-[#141414] text-gray-100 px-4 sm:px-6 lg:px-8 py-6 max-w-7xl mx-auto">
      {/* ── Page Title ── */}
      <div className="mb-4">
        <h1 className="font-display font-black text-2xl sm:text-3xl text-white">
          ស្វែងរកចំណងជើងរឿង
        </h1>
      </div>

      {/* ── Search Input ── */}
      <div className="relative mb-6 max-w-2xl">
        <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-[#E50914] w-5 h-5" />
        <input
          id="search-input"
          type="text"
          value={query}
          onChange={handleChange}
          placeholder="វាយបញ្ចូលឈ្មោះរឿងចិន 3D, រឿងជប៉ុន, ឬភាពយន្ត..."
          autoFocus
          className="input pl-12 pr-11 py-3.5 text-sm rounded-2xl bg-[#1e1e1e] border border-white/10 focus:border-[#E50914] w-full text-white placeholder-gray-400"
          aria-label="ស្វែងរក"
        />
        {query && (
          <button
            onClick={clearSearch}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* ── Quick search chips ── */}
      {!query && (
        <div className="mb-8 space-y-3">
          <p className="text-xs font-bold text-gray-400 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#E50914]" /> ពាក្យពេញនិយមស្វែងរក
          </p>
          <div className="flex flex-wrap gap-2">
            {POPULAR_SEARCHES.map((term) => (
              <button
                key={term}
                onClick={() => handleChipClick(term)}
                className="px-3.5 py-1.5 rounded-full text-xs font-medium bg-[#1e1e1e] hover:bg-[#E50914] text-gray-300 hover:text-white border border-white/10 transition-colors cursor-pointer"
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
      ) : query && results.length === 0 ? (
        <div className="text-center py-16 space-y-2">
          <div className="w-16 h-16 rounded-full bg-[#1e1e1e] border border-white/10 flex items-center justify-center mx-auto text-gray-500">
            <SearchIcon className="w-8 h-8 text-gray-500" />
          </div>
          <p className="text-gray-200 text-base font-bold">រកមិនឃើញលទ្ធផលសម្រាប់ "{query}" ឡើយ</p>
          <p className="text-gray-400 text-xs">សូមសាកល្បងវាយបញ្ចូលឈ្មោះរឿងផ្សេងទៀត ឬពិនិត្យអក្ខរាវិរុទ្ធឡើងវិញ</p>
        </div>
      ) : results.length > 0 ? (
        <div className="space-y-3">
          <p className="text-xs text-gray-400 font-medium">
            រកឃើញចំនួន {results.length} រឿង សម្រាប់ពាក្យ "{query}"
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5">
            {results.map((a) => (
              <AnimeCard key={a.id} anime={a} />
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-20 space-y-3">
          <div className="w-16 h-16 rounded-full bg-[#1e1e1e] border border-white/10 flex items-center justify-center mx-auto text-[#E50914]">
            <SearchIcon className="w-8 h-8 text-[#E50914]" />
          </div>
          <p className="text-gray-200 text-sm font-bold">ស្វែងរករឿងដែលអ្នកចូលចិត្ត</p>
          <p className="text-gray-400 text-xs max-w-xs mx-auto">
            ស្វែងរក និងទស្សនារឿងចិន 3D, Anime ជប៉ុន និងភាពយន្តល្បីៗជាច្រើនកម្រិត 4K Ultra HD។
          </p>
        </div>
      )}
    </main>
  );
}
