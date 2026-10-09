import { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { useLanguageStore } from '../../store/languageStore';

export function SearchModal({
  isOpen,
  onClose,
  onSearch,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSearch: (query: string) => void;
}) {
  const { language } = useLanguageStore((state) => state.language);
  const [query, setQuery] = useState('');

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      const input = document.getElementById('search-input');
      input?.focus();
    }
  }, [isOpen]);

  // Handle search submission
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query.trim());
    }
  };

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
  };

  // Handle clear input
  const handleClearInput = () => {
    setQuery('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[[var(--animekh-z-index-modal-backdrop)]] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative bg-bg-card w-full max-w-md mx-4 sm:mx-0 lg:mx-0 rounded-lg shadow-xl border border-border-subtle">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle">
          <div className="flex items-center space-x-3">
            <Search className="h-5 w-5 text-accent-primary" />
            <h2 className="font-display text-text-primary">
              Search
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/20 transition-colors duration-200"
            aria-label="Close"
          >
            <X className="h-5 w-5 text-text-secondary" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          <form onSubmit={handleSearch} className="mb-6">
            <div className="relative">
              <input
                type="text"
                id="search-input"
                value={query}
                onChange={handleInputChange}
                placeholder="Search for anime, movies, dramas..."
                className="w-full animekh-input pl-10 pr-4"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
              {query.length > 0 && (
                <button
                  onClick={handleClearInput}
                  className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary/hover:text-accent-primary"
                  onMouseDown={(e) => e.preventDefault()} // Prevent form submit
                >
                  <X className="h-3 w-3" />
                </button>
              )}
              <button
                type="submit"
                className="absolute right-0 top-0 bottom-0 w-10 bg-accent-primary text-text-primary hover:bg-accent-primary/90
                         rounded-e-md hover:rounded-e-md"
              >
                <Search className="h-4 w-4" />
              </button>
            </div>
          </form>

          {/* Search Results Preview (would be populated from API) */}
          {query.length > 0 && (
            <div className="space-y-4">
              <h3 className="font-medium text-text-primary mb-3">
                Results for "{query}"
              </div>
              {/* Mock results */}
              <div className="space-y-3">
                <div className="flex items-start space-x-3 p-3 bg-bg-card-subtle rounded-lg hover:border-accent-primary/30 transition-border duration-200">
                  <div className="flex-shrink-0 h-12 w-12 rounded-lg bg-accent-primary/20">
                    <Film className="h-5 w-5 text-accent-primary" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <h4 className="font-semibold text-text-primary">Attack on Titan Final Season</h4>
                    <p className="text-text-secondary/70 text-sm">Action • 2023 • 16 Episodes</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3 p-3 bg-bg-card-subtle rounded-lg hover:border-accent-primary/30 transition-border duration-200">
                  <div className="flex-shrink-0 h-12 w-12 rounded-lg bg-accent-primary/20">
                    <Play className="h-5 w-5 text-accent-primary" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <h4 className="font-semibold text-text-primary">Demon Slayer: Kimetsu no Yaiba</h4>
                    <p className="text-text-secondary/70 text-sm">Action • 2021 • 26 Episodes</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}