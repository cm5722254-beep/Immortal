import { useState } from 'react';
import { Sparkles, X, RefreshCw, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import type { Anime } from '../../types';

// ── Mood definitions ─────────────────────────────────────────────────────────
interface Mood {
  id: string;
  label: string;
  emoji: string;
  color: string;   // Tailwind bg class
  border: string;  // Tailwind border class
  text: string;    // Tailwind text class
  /** Genre slugs / tags sent to the backend filter */
  genres: string[];
}

const MOODS: Mood[] = [
  { id: 'mind-bending',  label: 'Mind-Bending',     emoji: '🌀', color: 'bg-purple-500/20',  border: 'border-purple-500/50',  text: 'text-purple-300',  genres: ['psychological', 'sci-fi', 'mystery'] },
  { id: 'dark',          label: 'Dark & Gritty',     emoji: '🌑', color: 'bg-gray-800/60',    border: 'border-gray-600/50',    text: 'text-gray-300',    genres: ['dark-fantasy', 'horror', 'thriller'] },
  { id: 'cozy',          label: 'Cozy & Nostalgic',  emoji: '☕', color: 'bg-amber-500/20',   border: 'border-amber-500/50',   text: 'text-amber-300',   genres: ['slice-of-life', 'romance', 'drama'] },
  { id: 'high-octane',   label: 'High-Octane',       emoji: '⚡', color: 'bg-yellow-500/20',  border: 'border-yellow-500/50',  text: 'text-yellow-300',  genres: ['action', 'martial-arts', 'cultivation'] },
  { id: 'epic-fantasy',  label: 'Epic Fantasy',      emoji: '🐉', color: 'bg-red-500/20',     border: 'border-red-500/50',     text: 'text-red-300',     genres: ['fantasy', 'cultivation', 'adventure'] },
  { id: 'heartfelt',     label: 'Heartfelt',         emoji: '💖', color: 'bg-pink-500/20',    border: 'border-pink-500/50',    text: 'text-pink-300',    genres: ['romance', 'slice-of-life', 'drama'] },
  { id: 'laugh',         label: 'Laugh Out Loud',    emoji: '😂', color: 'bg-green-500/20',   border: 'border-green-500/50',   text: 'text-green-300',   genres: ['comedy', 'school', 'slice-of-life'] },
  { id: 'cinematic',     label: 'Cinematic',         emoji: '🎬', color: 'bg-blue-500/20',    border: 'border-blue-500/50',    text: 'text-blue-300',    genres: ['movie', 'drama'] },
  { id: 'tense',         label: 'Edge of My Seat',   emoji: '😰', color: 'bg-orange-500/20',  border: 'border-orange-500/50',  text: 'text-orange-300',  genres: ['thriller', 'action', 'mystery'] },
  { id: 'otherworldly',  label: 'Otherworldly',      emoji: '🌌', color: 'bg-indigo-500/20',  border: 'border-indigo-500/50',  text: 'text-indigo-300',  genres: ['isekai', 'fantasy', 'supernatural'] },
];

interface ResultCardProps { anime: Anime; }
function ResultCard({ anime }: ResultCardProps) {
  const detailUrl = `/${anime.type === 'ANIME' ? 'anime' : anime.type === 'DONGHUA' ? 'donghua' : anime.type === 'DRAMA' ? 'drama' : 'movie'}/${anime.slug}`;
  return (
    <Link to={detailUrl} className="group flex gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-orange-500/30 transition-all duration-200">
      {anime.poster_url && (
        <img src={anime.poster_url} alt={anime.title}
          className="w-14 h-20 object-cover rounded-lg shrink-0 group-hover:scale-105 transition-transform duration-300" />
      )}
      <div className="flex-1 min-w-0">
        <p className="font-bold text-sm text-white group-hover:text-orange-400 transition-colors line-clamp-2 leading-snug">{anime.title}</p>
        <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
          {anime.year && <span>{anime.year}</span>}
          {anime.average_rating > 0 && <span className="text-yellow-400">★ {anime.average_rating.toFixed(1)}</span>}
        </div>
        {anime.genres && anime.genres.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {anime.genres.slice(0, 3).map(g => (
              <span key={g.id} className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-gray-300">{g.name}</span>
            ))}
          </div>
        )}
        {anime.description && (
          <p className="text-[11px] text-gray-500 mt-1.5 line-clamp-2">{anime.description}</p>
        )}
      </div>
      <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-orange-400 shrink-0 self-center transition-colors" />
    </Link>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export function VibeMatcher() {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [results, setResults] = useState<Anime[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < 3) next.add(id); // max 3 moods
      return next;
    });
    setHasSearched(false);
  };

  const findMyVibe = async () => {
    if (selected.size === 0) return;
    setIsLoading(true);
    setHasSearched(true);

    // Collect all genres from selected moods
    const genres = [...selected]
      .flatMap(id => MOODS.find(m => m.id === id)?.genres ?? []);
    const uniqueGenres = [...new Set(genres)];

    try {
      // Try each genre and merge results, dedupe by id
      const requests = uniqueGenres.slice(0, 3).map(g =>
        api.get(`/anime?genre=${g}&sort=popular&per_page=6`).catch(() => null)
      );
      const responses = await Promise.all(requests);
      const seen = new Set<number>();
      const merged: Anime[] = [];
      for (const res of responses) {
        if (!res) continue;
        for (const item of (res.data.items ?? [])) {
          if (!seen.has(item.id)) { seen.add(item.id); merged.push(item); }
        }
      }
      setResults(merged.slice(0, 6));
    } catch {
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const reset = () => {
    setSelected(new Set());
    setResults([]);
    setHasSearched(false);
  };

  return (
    <div className="card p-6 border border-white/5 bg-gradient-to-br from-[#141414] to-[#0f0f14]">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500/30 to-blue-500/30 border border-purple-500/30 flex items-center justify-center text-lg">
            🎭
          </div>
          <div>
            <h2 className="font-bold text-white text-base flex items-center gap-1.5">
              Vibe Matcher <Sparkles className="w-4 h-4 text-purple-400" />
            </h2>
            <p className="text-xs text-gray-400">Pick up to 3 moods and we'll find your perfect watch</p>
          </div>
        </div>
        {selected.size > 0 && (
          <button onClick={reset} className="btn-ghost text-xs gap-1.5 text-gray-500 hover:text-white py-1.5 px-3">
            <X className="w-3.5 h-3.5" /> Clear
          </button>
        )}
      </div>

      {/* Mood Chips Grid */}
      <div className="flex flex-wrap gap-2 mb-5">
        {MOODS.map(mood => {
          const isActive = selected.has(mood.id);
          const isDisabled = !isActive && selected.size >= 3;
          return (
            <button
              key={mood.id}
              onClick={() => !isDisabled && toggle(mood.id)}
              disabled={isDisabled}
              aria-pressed={isActive}
              className={`flex items-center gap-2 px-3 py-2 rounded-full text-sm font-semibold
                border transition-all duration-200 select-none
                ${isActive
                  ? `${mood.color} ${mood.border} ${mood.text} scale-105 shadow-lg`
                  : isDisabled
                  ? 'bg-white/5 border-white/5 text-gray-600 cursor-not-allowed opacity-40'
                  : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10 hover:border-white/20 hover:text-white'
                }`}
            >
              <span className="text-base leading-none">{mood.emoji}</span>
              {mood.label}
              {isActive && (
                <span className="ml-0.5 text-[10px] opacity-60">✓</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Selected summary + CTA */}
      <div className="flex items-center justify-between gap-3 mb-5">
        <div className="flex flex-wrap gap-1.5">
          {[...selected].map(id => {
            const mood = MOODS.find(m => m.id === id);
            return mood ? (
              <span key={id} className={`text-xs px-2.5 py-1 rounded-full font-semibold ${mood.color} ${mood.text} ${mood.border} border`}>
                {mood.emoji} {mood.label}
              </span>
            ) : null;
          })}
          {selected.size === 0 && (
            <span className="text-xs text-gray-600">No vibes selected yet…</span>
          )}
        </div>
        <button
          onClick={findMyVibe}
          disabled={selected.size === 0 || isLoading}
          className="btn-primary text-sm whitespace-nowrap shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <><RefreshCw className="w-4 h-4 animate-spin" /> Matching…</>
          ) : (
            <><Sparkles className="w-4 h-4" /> Find My Vibe</>
          )}
        </button>
      </div>

      {/* Results */}
      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex gap-3 p-3 rounded-xl bg-white/5 border border-white/5">
              <div className="skeleton w-14 h-20 rounded-lg shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="skeleton h-4 w-3/4 rounded" />
                <div className="skeleton h-3 w-1/2 rounded" />
                <div className="skeleton h-3 w-2/3 rounded" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!isLoading && hasSearched && results.length > 0 && (
        <div>
          <p className="text-xs text-gray-400 mb-3 font-medium">
            ✨ Curated playlist for your vibe ({results.length} picks)
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {results.map(anime => <ResultCard key={anime.id} anime={anime} />)}
          </div>
        </div>
      )}

      {!isLoading && hasSearched && results.length === 0 && (
        <div className="text-center py-8 text-gray-500 text-sm">
          <p className="text-2xl mb-2">😕</p>
          No matches found for this vibe combination. Try different moods!
        </div>
      )}
    </div>
  );
}
