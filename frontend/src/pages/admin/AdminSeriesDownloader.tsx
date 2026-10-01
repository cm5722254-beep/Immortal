import { useMemo, useState } from 'react';
import { CheckSquare, Download, FolderDown, Square, X } from 'lucide-react';
import api from '../../services/api';
import type { Anime, Episode } from '../../types';

type DownloadJob = { anime: Anime; episode: Episode };

const safeName = (value: string) => value.replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_').replace(/[. ]+$/g, '').slice(0, 120) || 'untitled';

/** Admin-only direct file exporter. Uses the browser folder picker; no server-side URL fetches. */
export function AdminSeriesDownloader({ items }: { items: Anime[] }) {
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState('');
  const [result, setResult] = useState('');
  const [controller, setController] = useState<AbortController | null>(null);
  const selected = useMemo(() => items.filter((item) => selectedIds.includes(item.id)), [items, selectedIds]);
  const allSelected = items.length > 0 && items.every((item) => selectedIds.includes(item.id));

  const toggleAll = () => setSelectedIds(allSelected ? [] : items.map((item) => item.id));
  const toggleOne = (id: number) => setSelectedIds((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]);

  const startDownload = async () => {
    if (!selected.length || busy) return;
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
      const jobs: DownloadJob[] = [];
      for (const anime of selected) {
        setProgress(`Loading episodes · ${anime.title}`);
        const response = await api.get(`/anime/${encodeURIComponent(anime.slug)}/episodes`, { signal: abort.signal });
        const episodes = (Array.isArray(response.data) ? response.data : response.data?.items || []) as Episode[];
        episodes.filter((episode) => episode.video_url?.trim()).forEach((episode) => jobs.push({ anime, episode }));
      }
      if (!jobs.length) {
        setResult('No episodes with a direct video file were found for the selected series.');
        return;
      }

      for (let index = 0; index < jobs.length; index += 1) {
        if (abort.signal.aborted) break;
        const { anime, episode } = jobs[index];
        const rawUrl = episode.video_url!.trim();
        setProgress(`Downloading ${index + 1}/${jobs.length} · ${anime.title} · Episode ${episode.episode_number}`);
        let url: URL;
        try {
          const apiOrigin = new URL(api.defaults.baseURL || window.location.origin, window.location.origin).origin;
          url = new URL(rawUrl, apiOrigin);
        } catch {
          skipped += 1;
          continue;
        }
        if (!['http:', 'https:'].includes(url.protocol) || /\.(m3u8|mpd)(?:$|\?)/i.test(url.href) || /youtu(?:\.be|be\.com)|facebook\.com/i.test(url.hostname)) {
          skipped += 1;
          continue;
        }
        try {
          const response = await fetch(url.href, { signal: abort.signal, headers: { 'Cache-Control': 'no-cache' } });
          if (!response.ok || !response.body) throw new Error(`HTTP ${response.status}`);
          const folder = await root.getDirectoryHandle(safeName(anime.title), { create: true });
          const extension = url.pathname.match(/\.(mp4|m4v|mov|webm|mkv)$/i)?.[1] || 'mp4';
          const fileName = `Episode ${String(episode.episode_number).padStart(3, '0')}${episode.title ? ` - ${safeName(episode.title)}` : ''}.${extension}`;
          const file = await folder.getFileHandle(fileName, { create: true });
          const writable = await file.createWritable();
          await response.body.pipeTo(writable, { signal: abort.signal });
          saved += 1;
        } catch (error) {
          if (abort.signal.aborted) break;
          failed.push(`${anime.title} Ep ${episode.episode_number}: ${(error as Error).message}`);
        }
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
    <section className="mb-5 overflow-hidden rounded-2xl border border-white/10 bg-[#181a20]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-bold text-white"><FolderDown className="h-4 w-4 text-emerald-400" /> Save episode files to computer</h2>
          <p className="mt-1 text-xs text-gray-400">Select one or more series. Episodes with direct video file URLs are saved into folders.</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={toggleAll} disabled={!items.length || busy} className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-3 py-2 text-xs text-gray-200 hover:bg-white/5 disabled:opacity-50">
            {allSelected ? <CheckSquare size={14} /> : <Square size={14} />}{allSelected ? 'Clear page' : 'Select all on page'}
          </button>
          <button type="button" onClick={startDownload} disabled={!selected.length || busy} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-2 text-xs font-bold text-black disabled:opacity-50">
            <Download size={14} /> {busy ? 'Saving…' : `Download (${selected.length})`}
          </button>
          {busy && <button type="button" onClick={() => controller?.abort()} className="rounded-lg border border-red-400/30 p-2 text-red-300" title="Stop download"><X size={14} /></button>}
        </div>
      </div>
      {items.length > 0 && <div className="grid max-h-36 grid-cols-1 gap-x-4 overflow-y-auto px-4 py-2 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => <label key={item.id} className="flex min-w-0 cursor-pointer items-center gap-2 py-1 text-xs text-gray-300">
          <input type="checkbox" checked={selectedIds.includes(item.id)} onChange={() => toggleOne(item.id)} disabled={busy} className="accent-emerald-500" />
          <span className="truncate">{item.title}</span><span className="shrink-0 text-gray-500">{item.episode_count} ep</span>
        </label>)}
      </div>}
      {(progress || result) && <p role="status" className="border-t border-white/10 px-4 py-2 text-xs text-emerald-300">{progress || result}</p>}
    </section>
  );
}
