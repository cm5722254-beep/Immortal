import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Play } from 'lucide-react';
import type { WeeklySchedule, Anime } from '../../types';
import api from '../../services/api';

const DAYS = [
  { id: 'Monday', label: 'Mon', full: 'Monday', zh: '周一' },
  { id: 'Tuesday', label: 'Tue', full: 'Tuesday', zh: '周二' },
  { id: 'Wednesday', label: 'Wed', full: 'Wednesday', zh: '周三' },
  { id: 'Thursday', label: 'Thu', full: 'Thursday', zh: '周四' },
  { id: 'Friday', label: 'Fri', full: 'Friday', zh: '周五' },
  { id: 'Saturday', label: 'Sat', full: 'Saturday', zh: '周六' },
  { id: 'Sunday', label: 'Sun', full: 'Sunday', zh: '周日' },
];

export function ScheduleSection() {
  const todayName = DAYS[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1].id;
  const [activeDay, setActiveDay] = useState(todayName);
  const [schedule, setSchedule] = useState<WeeklySchedule>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    api.get('/schedule')
      .then((res) => setSchedule(res.data))
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const itemsForDay: Anime[] = schedule[activeDay] || [];
  const isToday = activeDay === todayName;

  return (
    <section id="schedule" className="px-4 md:px-8 max-w-[1600px] mx-auto my-12">
      <div className="section-header mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="badge bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[10px] font-bold">
              📅 每日更新周历 BROADCAST TIMETABLE
            </span>
          </div>
          <h2 className="section-title text-gradient-cyan text-2xl md:text-3xl">
            <Calendar className="w-6 h-6 text-cyan-400" />
            Weekly Airing Timetable (កាលវិភាគចេញផ្សាយ)
          </h2>
          <p className="text-xs text-gray-400 mt-1">កាលវិភាគចេញភាគថ្មីៗនៃរឿង Donghua & Anime ផ្ទាល់តាមថ្ងៃនីមួយៗ</p>
        </div>
      </div>

      {/* Day Selector Tabs with Chinese Character Accents */}
      <div className="flex gap-2.5 overflow-x-auto pb-3 mb-6 scrollbar-hide border-b border-dark-border">
        {DAYS.map((d) => {
          const isSelected = activeDay === d.id;
          const isCurrentToday = d.id === todayName;
          const count = schedule[d.id]?.length || 0;

          return (
            <button
              key={d.id}
              onClick={() => setActiveDay(d.id)}
              className={`flex flex-col items-center min-w-[90px] md:min-w-[110px] py-3 px-3.5 rounded-2xl transition-all duration-300 cursor-pointer ${
                isSelected
                  ? 'bg-gradient-to-r from-red-600 via-brand-600 to-cyan-500 text-white font-bold shadow-xl shadow-brand-500/25 ring-2 ring-brand-400/40 scale-105'
                  : isCurrentToday
                  ? 'bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300'
                  : 'bg-[#0e0b1c] hover:bg-white/5 border border-white/10 text-gray-400 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <span className="text-xs md:text-sm font-black">{d.label}</span>
                <span className="text-[10px] font-serif opacity-80">{d.zh}</span>
                {isCurrentToday && (
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                )}
              </div>
              <span className={`text-[10px] mt-1 font-semibold ${isSelected ? 'text-white' : isCurrentToday ? 'text-emerald-300' : 'text-gray-500'}`}>
                {isCurrentToday ? '★ TODAY' : `${count} series`}
              </span>
            </button>
          );
        })}
      </div>

      {/* Schedule Items Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="skeleton h-64 rounded-2xl" />
          ))}
        </div>
      ) : itemsForDay.length === 0 ? (
        <div className="card p-12 text-center bg-[#0e0b1c] border border-white/10 rounded-3xl">
          <Calendar className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-300 text-base font-bold">No releases scheduled for {activeDay}</p>
          <p className="text-xs text-gray-500 mt-1">សូមជ្រើសរើសថ្ងៃផ្សេងទៀតដើម្បីទស្សនាកាលវិភាគរឿង។</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {itemsForDay.map((anime) => (
            <Link
              key={anime.id}
              to={`/anime/${anime.slug}`}
              className="card card-shine group block rounded-2xl overflow-hidden bg-[#0d0a1a] border border-white/10 hover:border-cyan-400/50 hover:shadow-[0_10px_25px_rgba(56,189,248,0.2)] transition-all duration-300 hover:-translate-y-1.5"
            >
              {/* Poster */}
              <div className="relative aspect-[2/3] overflow-hidden bg-[#161224]">
                {anime.poster_url ? (
                  <img
                    src={anime.poster_url}
                    alt={anime.title}
                    className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-500"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-600 font-bold">
                    {anime.title[0]}
                  </div>
                )}

                {/* Airing badge */}
                <div className="absolute top-2 left-2 flex flex-col gap-1 z-10">
                  {isToday ? (
                    <span className="badge bg-emerald-500 text-black font-black text-[9px] shadow-lg animate-pulse py-0.5 px-2">
                      ⚡ AIRING TODAY
                    </span>
                  ) : (
                    <span className="badge bg-black/75 text-cyan-300 border border-cyan-500/40 text-[9px] font-bold">
                      {activeDay.slice(0, 3)}
                    </span>
                  )}
                </div>

                <div className="absolute top-2 right-2 z-10">
                  <span className="badge-4k text-[8px]">4K</span>
                </div>

                {/* Play icon overlay */}
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center glow-cyan shadow-xl">
                    <Play className="w-4 h-4 text-white fill-white ml-0.5" />
                  </div>
                </div>
              </div>

              {/* Info */}
              <div className="p-3">
                <h3 className="font-bold text-xs text-white line-clamp-1 group-hover:text-cyan-300 transition-colors">
                  {anime.title}
                </h3>
                {anime.alt_title && (
                  <p className="text-[10px] text-gray-400 line-clamp-1 font-serif mt-0.5">{anime.alt_title}</p>
                )}
                <div className="flex items-center justify-between text-[10px] text-gray-400 mt-2 pt-1 border-t border-white/5">
                  <span className="text-gray-500 truncate max-w-[80px]">{anime.studio || 'Sparkly Key'}</span>
                  <span className="text-cyan-400 font-bold">{anime.episode_count || 12} eps</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

