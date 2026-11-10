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
    { label: 'Episodes scanned', value: data?.total_episodes ?? 0, icon: Film, color: 'text-blue-600', iconBg: 'bg-blue-50 border-blue-200/60' },
    { label: 'Links present', value: data?.healthy ?? 0, icon: CheckCircle2, color: 'text-emerald-600', iconBg: 'bg-emerald-50 border-emerald-200/60' },
    { label: 'Missing links', value: data?.missing ?? 0, icon: Link2Off, color: 'text-amber-600', iconBg: 'bg-amber-50 border-amber-200/60' },
    { label: 'Invalid links', value: data?.invalid ?? 0, icon: AlertTriangle, color: 'text-rose-600', iconBg: 'bg-rose-50 border-rose-200/60' },
  ];

  return (
    <AdminLayout title="Stream Health">
      <div className="mx-auto max-w-screen-2xl space-y-5">
        <section className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-5 sm:p-7 shadow-xs">
          <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[.15em] text-blue-700">
                <Activity className="h-3.5 w-3.5 text-blue-600" /> Content quality
              </span>
              <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">Stream health monitor</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                Find episodes with missing or malformed stream links. This checks saved URL format; it does not probe private or external video hosts.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void load()}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-2xs transition hover:bg-slate-50 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </button>
          </div>
        </section>

        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          {cards.map(({ label, value, icon: Icon, color, iconBg }) => (
            <div key={label} className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">{label}</span>
                <span className={`flex h-8 w-8 items-center justify-center rounded-xl border ${iconBg}`}>
                  <Icon className={`h-4 w-4 ${color}`} />
                </span>
              </div>
              <div className="mt-3 text-2xl font-black tracking-tight text-slate-900">{loading ? '—' : value.toLocaleString()}</div>
            </div>
          ))}
        </div>

        {error ? (
          <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        <section className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 bg-slate-50/60 px-4 py-4 sm:px-5">
            <div>
              <h3 className="font-bold text-slate-900">Needs attention</h3>
              <p className="mt-1 text-xs text-slate-500">
                {loading ? 'Scanning episodes…' : `${data?.issues.length || 0} episode(s) need a stream link fix`}
              </p>
            </div>
            <Link
              to="/admin/episodes"
              className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3.5 py-2 text-xs font-bold text-blue-700 transition hover:bg-blue-100"
            >
              <Wrench className="h-3.5 w-3.5 text-blue-600" /> Open episode manager
            </Link>
          </div>
          {loading ? (
            <div className="flex items-center justify-center gap-2 p-12 text-sm text-slate-500">
              <LoaderCircle className="h-4 w-4 animate-spin text-blue-600" /> Checking saved links…
            </div>
          ) : data?.issues.length ? (
            <div className="max-h-[65vh] overflow-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="sticky top-0 border-b border-slate-200/80 bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-3">Series</th>
                    <th className="px-5 py-3">Episode</th>
                    <th className="px-5 py-3">Issue</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.issues.map((item) => (
                    <tr key={item.episode_id} className="transition hover:bg-slate-50/80">
                      <td className="max-w-[320px] px-5 py-3.5">
                        <div className="truncate font-semibold text-slate-900">{item.anime_title}</div>
                        <div className="mt-1 truncate text-[11px] text-slate-500">{item.anime_slug}</div>
                      </td>
                      <td className="px-5 py-3.5 text-slate-700 font-medium">
                        EP {item.episode_number}
                        {item.episode_title ? <span className="ml-2 text-xs text-slate-500 font-normal">{item.episode_title}</span> : null}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-bold ${
                          item.issue.startsWith('Missing')
                            ? 'border-amber-200 bg-amber-50 text-amber-700'
                            : 'border-rose-200 bg-rose-50 text-rose-700'
                        }`}>
                          <AlertTriangle className="h-3 w-3" />{item.issue}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${
                          item.is_published
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                            : 'border-slate-200 bg-slate-100 text-slate-600'
                        }`}>
                          {item.is_published ? 'Published' : 'Draft'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <Link
                          aria-label={`Open ${item.anime_title} episode ${item.episode_number}`}
                          to={`/watch/${item.anime_slug}/${item.episode_number}`}
                          className="inline-flex rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="px-4 py-16 text-center">
              <CheckCircle2 className="mx-auto h-9 w-9 text-emerald-600" />
              <h4 className="mt-3 font-bold text-slate-900">All clear</h4>
              <p className="mt-1 text-sm text-slate-500">Every episode has a well-formed stream URL.</p>
            </div>
          )}
        </section>
      </div>
    </AdminLayout>
  );
}
