import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Search, X, Star, Play, Film, ArrowRight } from 'lucide-react';
import api from '../../services/api';
import type { Anime } from '../../types';

interface InstantSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function InstantSearchModal({ isOpen, onClose }: InstantSearchModalProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Anime[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const debounceTimer = useRef<number | undefined>(undefined);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
      setResults([]);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    clearTimeout(debounceTimer.current);
    debounceTimer.current = window.setTimeout(async () => {
      try {
        const res = await api.get(`/search?q=${encodeURIComponent(query.trim())}`);
        setResults(res.data.slice(0, 6));
      } catch {
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 250);

    return () => clearTimeout(debounceTimer.current);
  }, [query]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose(); else window.dispatchEvent(new CustomEvent('open-instant-search'));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/75 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-2xl bg-dark-card border border-dark-border rounded-2xl shadow-2xl overflow-hidden animate-scale-in">
        {/* Search Header */}
        <div className="flex items-center gap-3 p-4 border-b border-dark-border bg-dark-muted/40">
          <Search className="w-5 h-5 text-brand-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="វាយបញ្ចូលឈ្មោះរឿងចិន 3D ឬរឿងជប៉ុន..."
            className="flex-1 bg-transparent text-white placeholder-gray-500 text-base focus:outline-none"
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-gray-500 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          )}
          <span className="text-[10px] bg-dark-muted px-2 py-1 rounded text-gray-400 font-mono">ចាកចេញ (ESC)</span>
        </div>

        {/* Results List */}
        <div className="max-h-[60vh] overflow-y-auto p-3 divide-y divide-dark-border/40">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="w-8 h-8 border-2 border-[#E50914]/30 border-t-[#E50914] rounded-full animate-spin mx-auto mb-2" />
              <p className="text-xs text-gray-400">កំពុងស្វែងរក...</p>
            </div>
          ) : results.length > 0 ? (
            results.map((anime) => (
              <Link
                key={anime.id}
                to={`/anime/${anime.slug}`}
                onClick={onClose}
                className="flex items-center gap-4 p-3 rounded-xl hover:bg-white/5 transition-all group"
              >
                {/* Poster */}
                <div className="w-12 h-16 rounded-lg overflow-hidden bg-dark-muted shrink-0 border border-dark-border">
                  {anime.poster_url ? (
                    <img src={anime.poster_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-600 font-bold">
                      {anime.title[0]}
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={anime.type === 'ANIME' ? 'badge-anime text-[10px] py-0 px-2' : 'badge-donghua text-[10px] py-0 px-2'}>
                      {anime.type === 'ANIME' ? 'រឿងជប៉ុន' : 'រឿងចិន 3D'}
                    </span>
                    <span className="text-xs text-yellow-400 flex items-center gap-1 font-semibold">
                      <Star className="w-3 h-3 fill-current" /> {anime.average_rating.toFixed(1)}
                    </span>
                  </div>
                  <h4 className="font-semibold text-sm text-white truncate group-hover:text-brand-400 transition-colors">
                    {anime.title}
                  </h4>
                  {anime.alt_title && (
                    <p className="text-xs text-gray-500 truncate">{anime.alt_title}</p>
                  )}
                </div>

                {/* Quick Watch */}
                <Link
                  to={`/watch/${anime.slug}/1`}
                  onClick={(e) => { e.stopPropagation(); onClose(); }}
                  className="btn bg-brand-500/10 hover:bg-brand-500 text-brand-300 hover:text-white p-2 rounded-xl text-xs transition-colors shrink-0"
                >
                  <Play className="w-4 h-4 fill-current" />
                </Link>
              </Link>
            ))
          ) : query ? (
            <div className="p-8 text-center">
              <Film className="w-10 h-10 text-gray-600 mx-auto mb-2" />
              <p className="text-sm text-gray-300 font-bold">រកមិនឃើញរឿងសម្រាប់ "{query}" ឡើយ</p>
              <p className="text-xs text-gray-500 mt-1">សូមសាកល្បងពាក្យគន្លឹះដូចជា 'ជូសៀន', 'មេឃា', 'វិញ្ញាណ'</p>
            </div>
          ) : (
            <div className="p-4">
              <p className="text-xs font-bold text-gray-400 tracking-wider mb-2">រឿងដែលណែនាំសម្រាប់ស្វែងរក</p>
              <div className="flex flex-wrap gap-2">
                {['ដាវទេពប្រយុទ្ធមេឃា', 'ពិភពដួងវិញ្ញាណ', 'ពិភពដ៏ល្អឥតខ្ចោះ', 'ដាវទេពជូសៀន', 'ផ្កាយលេបត្របាក់', 'អ្នកបួសបះបោរ'].map((s) => (
                  <button
                    key={s}
                    onClick={() => setQuery(s)}
                    className="text-xs px-3 py-1.5 rounded-lg bg-dark-muted hover:bg-[#E50914]/20 hover:text-white text-gray-300 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {results.length > 0 && (
          <div className="p-3 bg-dark-muted/30 border-t border-dark-border text-center">
            <Link
              to={`/search?q=${encodeURIComponent(query)}`}
              onClick={onClose}
              className="text-xs text-[#E50914] hover:underline inline-flex items-center gap-1 font-semibold"
            >
              មើលលទ្ធផលស្វែងរកទាំងអស់សម្រាប់ "{query}" <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
