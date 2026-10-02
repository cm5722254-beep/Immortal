import { useMemo, useState } from 'react';
import { Check, CheckSquare, ChevronDown, ChevronRight, Download, FolderDown, Search, Square, X, Film, SlidersHorizontal, CircleHelp, Layers3, ShieldCheck, LoaderCircle } from 'lucide-react';
import api from '../../services/api';
import type { Anime, Episode } from '../../types';

type DownloadJob = { anime: Anime; episode: Episode };

const safeName = (value: string) => value.replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_').replace(/[. ]+$/g, '').slice(0, 120) || 'untitled';

/** Admin-only direct file exporter. Uses the browser folder picker; no server-side URL fetches. */
export function AdminSeriesDownloader({ items }: { items: Anime[] }) {
  const [selectedEpisodeIds, setSelectedEpisodeIds] = useState<Set<number>>(new Set());
  const [episodesByAnime, setEpisodesByAnime] = useState<Record<number, Episode[]>>({});
  const [expandedAnimeId, setExpandedAnimeId] = useState<number | null>(null);
  const [loadingAnimeId, setLoadingAnimeId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState('');
  const [result, setResult] = useState('');
  const [controller, setController] = useState<AbortController | null>(null);
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const visibleItems = useMemo(() => items.filter((item) => {
    const matchesSearch = `${item.title} ${item.alt_title || ''}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase());
    return matchesSearch && (typeFilter === 'ALL' || item.type === typeFilter);
  }), [items, query, typeFilter]);
  const selectedJobs = useMemo(() => items.flatMap((anime) =>
    (episodesByAnime[anime.id] || [])
      .filter((episode) => selectedEpisodeIds.has(episode.id))
      .map((episode) => ({ anime, episode })),
  ), [items, episodesByAnime, selectedEpisodeIds]);
  const expandedAnime = items.find((item) => item.id === expandedAnimeId) || null;
  const expandedEpisodes = expandedAnime ? episodesByAnime[expandedAnime.id] || [] : [];
  const downloadableExpandedEpisodes = expandedEpisodes.filter((episode) => episode.video_url?.trim());
  const allExpandedSelected = downloadableExpandedEpisodes.length > 0 && downloadableExpandedEpisodes.every((episode) => selectedEpisodeIds.has(episode.id));

  const loadAnimeEpisodes = async (anime: Anime) => {
    if (episodesByAnime[anime.id]) return episodesByAnime[anime.id];
    setLoadingAnimeId(anime.id);
    setResult('');
    try {
      const response = await api.get(`/anime/${encodeURIComponent(anime.slug)}/episodes`);
      const episodes = (Array.isArray(response.data) ? response.data : response.data?.items || []) as Episode[];
      setEpisodesByAnime((current) => ({ ...current, [anime.id]: episodes }));
      return episodes;
    } catch (error) {
      setResult(`Could not load episodes for ${anime.title}: ${(error as Error).message}`);
      return [];
    } finally {
      setLoadingAnimeId(null);
    }
  };

  const toggleAnime = async (anime: Anime) => {
    if (expandedAnimeId === anime.id) {
      setExpandedAnimeId(null);
      return;
    }
    setExpandedAnimeId(anime.id);
    if (!episodesByAnime[anime.id]) await loadAnimeEpisodes(anime);
  };

  const toggleExpandedEpisodes = () => {
    if (!expandedAnime) return;
    const availableIds = downloadableExpandedEpisodes.map((episode) => episode.id);
    setSelectedEpisodeIds((current) => {
      const next = new Set(current);
      if (allExpandedSelected) availableIds.forEach((id) => next.delete(id));
      else availableIds.forEach((id) => next.add(id));
      return next;
    });
  };

  const toggleEpisode = (episode: Episode) => {
    if (!episode.video_url?.trim()) return;
    setSelectedEpisodeIds((current) => {
      const next = new Set(current);
      if (next.has(episode.id)) next.delete(episode.id);
      else next.add(episode.id);
      return next;
    });
  };

  const startDownload = async () => {
    if (!selectedJobs.length || busy) return;
    const pickFolder = (window as any).showDirectoryPicker;
    if (!pickFolder) {
      setResult('Folder selection is not supported in this browser. Open this page in Chrome or Edge.');
      return;
    }
    let root: any;
    try {
      root = await pickFolder({ mode: 'readwrite' });
    } catch (error) {
      if ((error as DOMException)?.name !== 'AbortError') setResult('Could not open the destination folder.');
      return;
    }

    const abort = new AbortController();
    setController(abort);
    setBusy(true);
    setResult('');
    let saved = 0;
    let skipped = 0;
    const failed: string[] = [];
    try {
      const jobs: DownloadJob[] = selectedJobs;

      for (let batchStart = 0; batchStart < jobs.length; batchStart += 4) {
        if (abort.signal.aborted) break;
        const batch = jobs.slice(batchStart, batchStart + 4);
        await Promise.all(batch.map(async ({ anime, episode }, offset) => {
          const index = batchStart + offset;
          const rawUrl = episode.video_url!.trim();
          setProgress(`Downloading ${index + 1}/${jobs.length} (up to 4 at once) · ${anime.title} · Episode ${episode.episode_number}`);
          let url: URL;
          try {
            const apiOrigin = new URL(api.defaults.baseURL || window.location.origin, window.location.origin).origin;
            url = new URL(rawUrl, apiOrigin);
          } catch {
            skipped += 1;
            return;
          }
          if (!['http:', 'https:'].includes(url.protocol) || /\.(m3u8|mpd)(?:$|\?)/i.test(url.href) || /youtu(?:\.be|be\.com)|facebook\.com/i.test(url.hostname)) {
            skipped += 1;
            return;
          }
          try {
            // Fetch remote video through our API proxy. Direct browser requests
            // fail for R2 and most video hosts because their CORS policy blocks
            // cross-origin downloads, even when the source URL is valid.
            const proxyUrl = api.getUri({ url: '/stream/proxy', params: { url: url.href } });
            const token = localStorage.getItem('access_token');
            const response = await fetch(proxyUrl, {
              signal: abort.signal,
              cache: 'no-store',
              headers: {
                'Cache-Control': 'no-cache',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
              },
            });
            if (!response.ok || !response.body) throw new Error(`HTTP ${response.status}`);
            const folder = await root.getDirectoryHandle(safeName(anime.title), { create: true });
            const extension = url.pathname.match(/\.(mp4|m4v|mov|webm|mkv)$/i)?.[1] || 'mp4';
            const fileName = `Episode ${String(episode.episode_number).padStart(3, '0')}${episode.title ? ` - ${safeName(episode.title)}` : ''}.${extension}`;
            const file = await folder.getFileHandle(fileName, { create: true });
            const writable = await file.createWritable();
            await response.body.pipeTo(writable, { signal: abort.signal });
            saved += 1;
          } catch (error) {
            if (abort.signal.aborted) return;
            failed.push(`${anime.title} Ep ${episode.episode_number}: ${(error as Error).message}`);
          }
        }));
      }
      setResult(abort.signal.aborted
        ? `Stopped. Saved ${saved} episode file(s).`
        : `Finished: saved ${saved} episode file(s), skipped ${skipped} stream/link item(s), failed ${failed.length}.${failed.length ? ` First issue: ${failed[0]}` : ''}`);
    } catch (error) {
      if (abort.signal.aborted) setResult(`Stopped. Saved ${saved} episode file(s).`);
      else setResult(`Download could not continue: ${(error as Error).message}`);
    } finally {
      setBusy(false);
      setProgress('');
      setController(null);
    }
  };

  return (
    <section className="overflow-hidden rounded-3xl border border-white/[.09] bg-[#11151b] shadow-[0_18px_70px_rgba(0,0,0,.24)]">
      <div className="border-b border-white/[.08] bg-gradient-to-r from-[#171d24] to-[#12161d] p-4 sm:p-5">
        <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
          <div>
            <div className="flex items-center gap-2 text-base font-bold text-white"><FolderDown className="h-5 w-5 text-emerald-400" /> Choose episodes</div>
            <p className="mt-1 text-xs text-slate-400">Open a series to choose individual episodes or select all its available episodes.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-1 rounded-lg border border-white/[.08] bg-black/20 px-3 py-2 text-xs text-slate-300"><span className="font-bold text-white">{selectedJobs.length}</span> episode{selectedJobs.length === 1 ? '' : 's'} selected</span>
            {selectedJobs.length > 0 && <button type="button" onClick={() => setSelectedEpisodeIds(new Set())} disabled={busy} className="rounded-xl px-2.5 py-2 text-xs text-slate-400 transition hover:text-white">Clear selection</button>}
            <button type="button" onClick={startDownload} disabled={!selectedJobs.length || busy} className="inline-flex items-center gap-2 rounded-xl bg-emerald-400 px-4 py-2.5 text-xs font-extrabold text-[#06231b] shadow-lg shadow-emerald-950/40 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-40">
              <Download size={15} /> {busy ? 'Saving…' : 'Choose folder & download'}
            </button>
            {busy && <button type="button" onClick={() => controller?.abort()} className="rounded-xl border border-red-400/30 p-2.5 text-red-300 hover:bg-red-500/10" title="Stop download"><X size={15} /></button>}
          </div>
        </div>
        <div className="mt-4 flex flex-col gap-3 lg:flex-row">
          <label className="relative block flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search series by title…" className="h-11 w-full rounded-xl border border-white/[.09] bg-[#0b0f14] pl-10 pr-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-emerald-400/50 focus:ring-2 focus:ring-emerald-400/10" />
          </label>
          <div className="flex items-center gap-1.5 overflow-x-auto rounded-xl border border-white/[.07] bg-[#0b0f14] p-1">
            <span className="flex shrink-0 items-center gap-1.5 px-2 text-[11px] font-semibold text-slate-500"><SlidersHorizontal className="h-3.5 w-3.5" /> Type</span>
            {[['ALL', 'All'], ['DONGHUA', 'Donghua'], ['ANIME', 'Anime'], ['DRAMA', 'Drama'], ['MOVIE', 'Movies']].map(([value, label]) => <button key={value} type="button" onClick={() => setTypeFilter(value)} className={`shrink-0 rounded-lg px-3 py-2 text-[11px] font-bold transition ${typeFilter === value ? 'bg-emerald-400/15 text-emerald-300' : 'text-slate-400 hover:bg-white/[.05] hover:text-white'}`}>{label}</button>)}
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500"><span>Showing <b className="text-slate-300">{visibleItems.length}</b> of {items.length} series</span><span className="hidden items-center gap-1.5 sm:flex"><CircleHelp className="h-3.5 w-3.5" /> Select only the episodes you want to save</span></div>
      </div>
      {visibleItems.length ? <div className="grid max-h-[min(62vh,680px)] grid-cols-2 gap-3 overflow-y-auto p-4 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 sm:p-5">
        {visibleItems.map((item) => {
          const opened = expandedAnimeId === item.id;
          const selectedForAnime = (episodesByAnime[item.id] || []).filter((episode) => selectedEpisodeIds.has(episode.id)).length;
          return <button key={item.id} type="button" onClick={() => void toggleAnime(item)} aria-expanded={opened} disabled={busy} className={`group relative flex min-w-0 cursor-pointer items-center gap-3 rounded-2xl border p-2.5 text-left transition duration-200 ${opened ? 'border-emerald-400/55 bg-emerald-400/[.08] shadow-[0_0_0_1px_rgba(52,211,153,.12)]' : 'border-white/[.07] bg-[#171c23] hover:border-white/[.16] hover:bg-[#1b222a]'}`}>
            <span className="relative h-[68px] w-[50px] shrink-0 overflow-hidden rounded-lg bg-[#232a33]">
              {item.poster_url ? <img src={item.poster_url} alt="" loading="lazy" className="h-full w-full object-cover transition duration-300 group-hover:scale-105" /> : <span className="flex h-full w-full items-center justify-center text-slate-600"><Film className="h-5 w-5" /></span>}
              {opened && <span className="absolute inset-0 grid place-items-center bg-emerald-950/60 text-emerald-200"><Check className="h-5 w-5" /></span>}
            </span>
            <span className="min-w-0 flex-1">
              <span className="line-clamp-2 text-xs font-bold leading-5 text-slate-100">{item.title}</span>
              <span className="mt-1.5 flex items-center gap-1.5 text-[10px] text-slate-500"><Layers3 className="h-3 w-3" />{item.episode_count || 0} episodes{selectedForAnime > 0 ? ` · ${selectedForAnime} selected` : ''}</span>
              <span className="mt-1 block truncate text-[9px] font-semibold uppercase tracking-wide text-slate-600">{item.type?.toLowerCase() || 'series'}</span>
            </span>
            {loadingAnimeId === item.id ? <LoaderCircle className="h-4 w-4 shrink-0 animate-spin text-emerald-300" /> : opened ? <ChevronDown className="h-4 w-4 shrink-0 text-emerald-300" /> : <ChevronRight className="h-4 w-4 shrink-0 text-slate-500" />}
          </button>;
        })}
      </div> : <div className="px-4 py-16 text-center"><Search className="mx-auto h-8 w-8 text-slate-600" /><p className="mt-3 text-sm font-semibold text-slate-300">No series match your search</p><button type="button" onClick={() => { setQuery(''); setTypeFilter('ALL'); }} className="mt-2 text-xs font-bold text-emerald-300 hover:text-emerald-200">Clear filters</button></div>}
      {expandedAnime && <div className="border-t border-white/[.08] bg-[#0d1218] p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h3 className="font-bold text-white">{expandedAnime.title}</h3><p className="mt-1 text-xs text-slate-500">{downloadableExpandedEpisodes.length} episode(s) have a stream link</p></div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={toggleExpandedEpisodes} disabled={!downloadableExpandedEpisodes.length || busy || loadingAnimeId === expandedAnime.id} className="inline-flex items-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/[.07] px-3 py-2 text-xs font-bold text-emerald-300 transition hover:bg-emerald-400/[.13] disabled:opacity-40">
              {allExpandedSelected ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}{allExpandedSelected ? 'Deselect all episodes' : 'Select all episodes'}
            </button>
            <button type="button" onClick={() => setExpandedAnimeId(null)} className="rounded-lg p-2 text-slate-500 transition hover:bg-white/[.06] hover:text-white" aria-label="Close episode list"><X className="h-4 w-4" /></button>
          </div>
        </div>
        {loadingAnimeId === expandedAnime.id ? <div className="flex items-center gap-2 py-8 text-sm text-slate-400"><LoaderCircle className="h-4 w-4 animate-spin" /> Loading episodes…</div> : expandedEpisodes.length ? <div className="mt-4 grid max-h-72 grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2 xl:grid-cols-3">
          {expandedEpisodes.map((episode) => {
            const canDownload = Boolean(episode.video_url?.trim());
            const checked = selectedEpisodeIds.has(episode.id);
            return <label key={episode.id} className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 transition ${!canDownload ? 'cursor-not-allowed border-white/[.04] bg-white/[.015] opacity-45' : checked ? 'cursor-pointer border-emerald-400/30 bg-emerald-400/[.07]' : 'cursor-pointer border-white/[.07] bg-white/[.025] hover:border-white/[.15]'}`}>
              <input type="checkbox" checked={checked} disabled={!canDownload || busy} onChange={() => toggleEpisode(episode)} className="h-4 w-4 accent-emerald-400" />
              <span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold text-slate-200">Episode {episode.episode_number}{episode.title ? ` · ${episode.title}` : ''}</span><span className={`mt-1 block text-[10px] ${canDownload ? 'text-emerald-400/80' : 'text-slate-500'}`}>{canDownload ? 'Video link available' : 'No video link'}</span></span>
            </label>;
          })}
        </div> : <div className="py-8 text-center text-sm text-slate-500">No episodes found for this series.</div>}
      </div>}
      {(progress || result) && <div role="status" className={`border-t border-white/[.08] px-4 py-3 text-xs ${result.includes('failed') || result.includes('could not') ? 'bg-red-500/[.05] text-red-300' : 'bg-emerald-500/[.05] text-emerald-300'}`}>{progress || result}</div>}
      <div className="flex items-center gap-2 border-t border-white/[.06] px-4 py-3 text-[11px] text-slate-500"><ShieldCheck size={14} className="text-emerald-500" /> Browser folder access is private to this download session.</div>
    </section>
  );
}
