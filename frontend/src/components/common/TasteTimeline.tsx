import { useEffect, useState } from 'react';
import { BarChart2, TrendingUp, Film, Clock } from 'lucide-react';
import api from '../../services/api';
import type { WatchHistoryItem, Genre } from '../../types';

// ── Derived stat types ────────────────────────────────────────────────────────
interface GenreStat { name: string; count: number; pct: number; color: string; }
interface MonthStat  { label: string; count: number; }

const GENRE_COLORS = [
  'bg-orange-500', 'bg-blue-500', 'bg-purple-500', 'bg-green-500',
  'bg-pink-500',   'bg-yellow-500', 'bg-red-500', 'bg-teal-500',
];

// Month abbreviations
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function deriveStats(history: WatchHistoryItem[]) {
  // ── Genre frequency from anime titles (we only have genre data via detail fetch,
  //    so we'll derive monthly watch volume + total hours instead)
  const monthMap: Record<string, number> = {};
  for (const item of history) {
    const d = new Date(item.last_watched_at);
    const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2,'0')}`;
    monthMap[key] = (monthMap[key] ?? 0) + 1;
  }
  const sortedMonths = Object.entries(monthMap)
    .sort(([a],[b]) => a.localeCompare(b))
    .slice(-6)
    .map(([key, count]) => {
      const [,m] = key.split('-');
      return { label: MONTHS[parseInt(m)], count };
    });

  const totalHours = history.reduce((sum, h) => sum + (h.duration_seconds ?? 0), 0) / 3600;
  return { sortedMonths, totalHours };
}

// ── Sub-components ────────────────────────────────────────────────────────────

function GenreBar({ stat, index }: { stat: GenreStat; index: number }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-24 text-right text-xs text-gray-300 font-medium shrink-0">{stat.name}</span>
      <div className="flex-1 bg-white/5 rounded-full h-2.5 overflow-hidden">
        <div
          className={`h-full rounded-full ${stat.color} transition-all duration-700`}
          style={{
            width: `${stat.pct}%`,
            transitionDelay: `${index * 80}ms`,
          }}
        />
      </div>
      <span className="w-8 text-right text-xs text-gray-500 shrink-0">{stat.count}</span>
    </div>
  );
}

function MonthBar({ stat, max }: { stat: MonthStat; max: number }) {
  const pct = max > 0 ? (stat.count / max) * 100 : 0;
  return (
    <div className="flex flex-col items-center gap-1.5">
      <span className="text-xs text-gray-300 font-bold">{stat.count}</span>
      <div className="w-7 bg-white/5 rounded-t-full overflow-hidden" style={{ height: '80px' }}>
        <div
          className="w-full rounded-t-full bg-gradient-to-t from-orange-600 to-orange-400 transition-all duration-700"
          style={{ height: `${pct}%`, marginTop: `${100-pct}%` }}
        />
      </div>
      <span className="text-[10px] text-gray-500">{stat.label}</span>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
interface TasteTimelineProps {
  /** Optionally pass history directly (for embedding in ProfilePage) */
  historyItems?: WatchHistoryItem[];
  /** Optionally pass genre frequency from outside */
  genreFrequency?: Array<{ genre: Genre; count: number }>;
}

export function TasteTimeline({ historyItems, genreFrequency }: TasteTimelineProps) {
  const [history, setHistory] = useState<WatchHistoryItem[]>(historyItems ?? []);
  const [genres, setGenres] = useState<GenreStat[]>([]);
  const [months, setMonths] = useState<MonthStat[]>([]);
  const [totalHours, setTotalHours] = useState(0);
  const [isLoading, setIsLoading] = useState(!historyItems);

  useEffect(() => {
    if (historyItems) {
      setTimeout(() => {
        setHistory(historyItems);
      }, 0);
      return;
    }
    setTimeout(() => {
      setIsLoading(true);
    }, 0);
    api.get('/history?per_page=100')
      .then(r => {
        setHistory(Array.isArray(r.data) ? r.data : (r.data.items ?? []));
      })
      .catch(() => {})
      .finally(() => {
        setTimeout(() => {
          setIsLoading(false);
        }, 0);
      });
  }, [historyItems]);

  // Build genre stats from passed frequency or from history slugs
  useEffect(() => {
    if (genreFrequency && genreFrequency.length > 0) {
      const max = Math.max(...genreFrequency.map(g => g.count));
      const computedGenres = genreFrequency.slice(0, 8).map((g, i) => ({
        name: g.genre.name,
        count: g.count,
        pct: max > 0 ? Math.round((g.count / max) * 100) : 0,
        color: GENRE_COLORS[i % GENRE_COLORS.length],
      }));
      setTimeout(() => {
        setGenres(computedGenres);
      }, 0);
    } else {
      // We can't get genre data from history alone without extra fetches.
      // Show a placeholder with types instead.
      const typeCount: Record<string, number> = {};
      for (const h of history) {
        // Heuristic: guess type from slug or title
        const slug = h.anime_slug ?? '';
        const type = slug.includes('movie') ? 'Movie' : 'Series';
        typeCount[type] = (typeCount[type] ?? 0) + 1;
      }
      const entries = Object.entries(typeCount).sort((a,b) => b[1]-a[1]);
      const max = entries[0]?.[1] ?? 1;
      const computedGenres = entries.map(([name, count], i) => ({
        name, count,
        pct: Math.round((count / max) * 100),
        color: GENRE_COLORS[i % GENRE_COLORS.length],
      }));
      setTimeout(() => {
        setGenres(computedGenres);
      }, 0);
    }
  }, [history, genreFrequency]);

  useEffect(() => {
    if (history.length === 0) return;
    const { sortedMonths, totalHours: h } = deriveStats(history);
    setTimeout(() => {
      setMonths(sortedMonths);
      setTotalHours(h);
    }, 0);
  }, [history]);

  const maxMonthCount = Math.max(...months.map(m => m.count), 1);

  if (isLoading) {
    return (
      <div className="card p-5 border border-white/5 space-y-4">
        <div className="skeleton h-6 w-48 rounded" />
        {Array.from({length:5}).map((_,i)=>(
          <div key={i} className="flex items-center gap-3">
            <div className="skeleton h-3 w-20 rounded" />
            <div className="skeleton h-2.5 flex-1 rounded-full" />
          </div>
        ))}
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="card p-8 border border-white/5 text-center">
        <BarChart2 className="w-10 h-10 mx-auto mb-3 text-gray-600 opacity-50" />
        <p className="text-sm text-gray-500">Start watching to build your Taste Timeline!</p>
      </div>
    );
  }

  return (
    <div className="card p-5 border border-white/5 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
          <BarChart2 className="w-4 h-4 text-blue-400" />
        </div>
        <div>
          <h2 className="font-bold text-white">Taste Timeline</h2>
          <p className="text-xs text-gray-400">Your cinematic fingerprint</p>
        </div>
      </div>

      {/* Quick stats row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: Film,      label: 'Watched',       value: history.length,              unit: 'titles' },
          { icon: Clock,     label: 'Total Time',     value: totalHours.toFixed(1),       unit: 'hours'  },
          { icon: TrendingUp,label: 'This Month',     value: months.at(-1)?.count ?? 0,  unit: 'eps'    },
        ].map(({ icon: Icon, label, value, unit }) => (
          <div key={label} className="bg-white/5 rounded-xl p-3 border border-white/5 text-center">
            <Icon className="w-4 h-4 text-orange-400 mx-auto mb-1" />
            <p className="font-black text-white text-lg leading-none">{value}</p>
            <p className="text-[10px] text-gray-500 mt-0.5">{unit}</p>
            <p className="text-[10px] text-gray-600 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Genre breakdown */}
      {genres.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-300 mb-3 flex items-center gap-1.5">
            <span className="w-4 h-0.5 bg-orange-500 rounded" /> Genre Breakdown
          </p>
          <div className="space-y-2.5">
            {genres.map((g, i) => <GenreBar key={g.name} stat={g} index={i} />)}
          </div>
        </div>
      )}

      {/* Monthly activity chart */}
      {months.length > 1 && (
        <div>
          <p className="text-xs font-semibold text-gray-300 mb-3 flex items-center gap-1.5">
            <span className="w-4 h-0.5 bg-blue-500 rounded" /> Monthly Activity
          </p>
          <div className="flex items-end justify-around gap-2">
            {months.map(m => <MonthBar key={m.label} stat={m} max={maxMonthCount} />)}
          </div>
        </div>
      )}

      {/* Recent watches */}
      <div>
        <p className="text-xs font-semibold text-gray-300 mb-3 flex items-center gap-1.5">
          <span className="w-4 h-0.5 bg-purple-500 rounded" /> Recently Watched
        </p>
        <div className="space-y-2">
          {history.slice(0, 5).map(item => (
            <div key={item.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors group">
              {item.anime_poster ? (
                <img src={item.anime_poster} alt={item.anime_title}
                  className="w-8 h-12 object-cover rounded shrink-0 group-hover:scale-105 transition-transform" />
              ) : (
                <div className="w-8 h-12 bg-white/5 rounded shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-white truncate">{item.anime_title}</p>
                <p className="text-[10px] text-gray-500">EP {item.episode_number}</p>
              </div>
              {item.duration_seconds > 0 && (
                <div className="shrink-0 w-20">
                  <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-orange-500 rounded-full"
                      style={{ width: `${Math.min((item.progress_seconds / item.duration_seconds) * 100, 100)}%` }}
                    />
                  </div>
                  <p className="text-[9px] text-gray-600 text-right mt-0.5">
                    {Math.round((item.progress_seconds / item.duration_seconds) * 100)}%
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
