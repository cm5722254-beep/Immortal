import { useEffect, useState } from 'react';
import { Activity, AlertTriangle, CheckCircle2, ExternalLink, Film, Link2Off, LoaderCircle, RefreshCw, Wrench } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AdminLayout } from './AdminLayout';
import api from '../../services/api';

interface StreamIssue {
  episode_id: number;
  anime_title: string;
  anime_slug: string;
  episode_number: number;
  episode_title?: string | null;
  is_published: boolean;
  issue: string;
}

interface StreamHealth {
  total_episodes: number;
  healthy: number;
  missing: number;
  invalid: number;
  issues: StreamIssue[];
}

export function AdminStreamHealthPage() {
  const [data, setData] = useState<StreamHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/admin/stream-health');
      setData(response.data);
    } catch (err: any) {
      setError(typeof err?.response?.data?.detail === 'string' ? err.response.data.detail : 'Could not load stream status.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const cards = [
    { label: 'Episodes scanned', value: data?.total_episodes ?? 0, icon: Film, color: 'text-sky-300', style: 'border-sky-400/15 bg-sky-400/[.06]' },
    { label: 'Links present', value: data?.healthy ?? 0, icon: CheckCircle2, color: 'text-emerald-300', style: 'border-emerald-400/15 bg-emerald-400/[.06]' },
    { label: 'Missing links', value: data?.missing ?? 0, icon: Link2Off, color: 'text-amber-300', style: 'border-amber-400/15 bg-amber-400/[.06]' },
    { label: 'Invalid links', value: data?.invalid ?? 0, icon: AlertTriangle, color: 'text-rose-300', style: 'border-rose-400/15 bg-rose-400/[.06]' },
  ];

  return (
    <AdminLayout title="Stream Health">
      <div className="mx-auto max-w-screen-2xl space-y-5">
        <section className="relative overflow-hidden rounded-3xl border border-sky-400/15 bg-[radial-gradient(ellipse_at_top_right,rgba(14,165,233,.14),transparent_45%),linear-gradient(110deg,#101a24,#0c1117_68%)] p-5 sm:p-7">
          <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-sky-300/15 bg-sky-300/[.07] px-3 py-1 text-[11px] font-bold uppercase tracking-[.15em] text-sky-300"><Activity className="h-3.5 w-3.5" /> Content quality</span>
              <h2 className="mt-3 text-2xl font-black tracking-tight text-white sm:text-3xl">Stream health monitor</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">Find episodes with missing or malformed stream links. This checks saved URL format; it does not probe private or external video hosts.</p>
            </div>
            <button type="button" onClick={() => void load()} disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[.04] px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-white/[.08] disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh</button>
          </div>
        </section>

        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          {cards.map(({ label, value, icon: Icon, color, style }) => <div key={label} className={`rounded-2xl border p-4 sm:p-5 ${style}`}>
            <div className="flex items-center justify-between"><span className="text-xs font-semibold text-slate-400">{label}</span><Icon className={`h-4 w-4 ${color}`} /></div>
            <div className="mt-3 text-2xl font-black tracking-tight text-white">{loading ? '—' : value.toLocaleString()}</div>
          </div>)}
        </div>

        {error ? <div role="alert" className="rounded-2xl border border-rose-400/20 bg-rose-400/[.06] p-4 text-sm text-rose-200">{error}</div> : null}
        <section className="overflow-hidden rounded-3xl border border-white/[.08] bg-[#11161d]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[.07] px-4 py-4 sm:px-5">
            <div><h3 className="font-bold text-white">Needs attention</h3><p className="mt-1 text-xs text-slate-500">{loading ? 'Scanning episodes…' : `${data?.issues.length || 0} episode(s) need a stream link fix`}</p></div>
            <Link to="/admin/episodes" className="inline-flex items-center gap-2 rounded-xl bg-emerald-400/10 px-3 py-2 text-xs font-bold text-emerald-300 transition hover:bg-emerald-400/15"><Wrench className="h-3.5 w-3.5" /> Open episode manager</Link>
          </div>
          {loading ? <div className="flex items-center justify-center gap-2 p-12 text-sm text-slate-400"><LoaderCircle className="h-4 w-4 animate-spin" /> Checking saved links…</div> : data?.issues.length ? (
            <div className="max-h-[65vh] overflow-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="sticky top-0 bg-[#151b23] text-[11px] uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Series</th><th className="px-5 py-3">Episode</th><th className="px-5 py-3">Issue</th><th className="px-5 py-3">Status</th><th className="px-5 py-3"></th></tr></thead>
                <tbody className="divide-y divide-white/[.05]">
                  {data.issues.map((item) => <tr key={item.episode_id} className="transition hover:bg-white/[.025]">
                    <td className="max-w-[320px] px-5 py-3.5"><div className="truncate font-semibold text-slate-100">{item.anime_title}</div><div className="mt-1 truncate text-[11px] text-slate-500">{item.anime_slug}</div></td>
                    <td className="px-5 py-3.5 text-slate-300">EP {item.episode_number}{item.episode_title ? <span className="ml-2 text-xs text-slate-500">{item.episode_title}</span> : null}</td>
                    <td className="px-5 py-3.5"><span className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-bold ${item.issue.startsWith('Missing') ? 'bg-amber-400/10 text-amber-300' : 'bg-rose-400/10 text-rose-300'}`}><AlertTriangle className="h-3 w-3" />{item.issue}</span></td>
                    <td className="px-5 py-3.5"><span className={`rounded-full px-2 py-1 text-[10px] font-bold ${item.is_published ? 'bg-emerald-400/10 text-emerald-300' : 'bg-slate-700/50 text-slate-400'}`}>{item.is_published ? 'Published' : 'Draft'}</span></td>
                    <td className="px-5 py-3.5 text-right"><Link aria-label={`Open ${item.anime_title} episode ${item.episode_number}`} to={`/watch/${item.anime_slug}/${item.episode_number}`} className="inline-flex rounded-lg p-2 text-slate-500 transition hover:bg-white/[.06] hover:text-white"><ExternalLink className="h-4 w-4" /></Link></td>
                  </tr>)}
                </tbody>
              </table>
            </div>
          ) : <div className="px-4 py-16 text-center"><CheckCircle2 className="mx-auto h-9 w-9 text-emerald-300" /><h4 className="mt-3 font-bold text-white">All clear</h4><p className="mt-1 text-sm text-slate-500">Every episode has a well-formed stream URL.</p></div>}
        </section>
      </div>
    </AdminLayout>
  );
}
