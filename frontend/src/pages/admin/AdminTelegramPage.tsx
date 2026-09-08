import { useState, useEffect, useCallback } from 'react';
import { Send, Bot, Check, AlertCircle, RefreshCw, Radio, ExternalLink } from 'lucide-react';
import { AdminLayout } from './AdminLayout';
import api from '../../services/api';

export function AdminTelegramPage() {
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [status, setStatus] = useState<any>(null);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/telegram/status');
      setStatus(res.data);
    } catch (err: any) {
      setError('Could not fetch Telegram Bot status');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const sendTestNotification = async () => {
    setSyncing(true);
    setTestResult(null);
    setError(null);
    try {
      const res = await api.post('/admin/telegram/test');
      setTestResult(`Test notification sent! Dispatched to ${res.data.sent_count} destination(s).`);
      fetchStatus();
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to dispatch Telegram test notification.');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <AdminLayout title="Telegram Bot">
      <div className="space-y-6 animate-fade-in max-w-5xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-display font-black text-2xl text-white flex items-center gap-2">
              <Bot className="w-6 h-6 text-brand-400" /> Telegram Bot Automation
            </h1>
            <p className="text-gray-400 text-sm mt-1">
              Auto-send rich notifications with poster, title & episode number to Telegram subscribers when new anime/episodes are uploaded.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <a
              href="https://t.me/watchflixanimeadmin"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-sky-500/20 transition-all"
            >
              <Send className="w-3.5 h-3.5" /> Telegram Channel
            </a>

            <a
              href="https://t.me/namianime_bot"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary text-xs"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Open Bot
            </a>
            <button
              onClick={fetchStatus}
              disabled={loading}
              className="btn-secondary text-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </button>
          </div>
        </div>

        {/* Status Messages */}
        {testResult && (
          <div className="p-4 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 flex items-center gap-3 animate-slide-down text-sm">
            <Check className="w-5 h-5 shrink-0" />
            <span>{testResult}</span>
          </div>
        )}
        {error && (
          <div className="p-4 rounded-xl bg-red-500/20 border border-red-500/40 text-red-300 flex items-center gap-3 animate-slide-down text-sm">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Bot Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card p-5 bg-gradient-to-br from-brand-950/40 to-dark-card border-brand-500/30">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-gray-400 uppercase">Bot Status</span>
              <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Online
              </span>
            </div>
            <p className="font-display font-black text-xl text-white">@{status?.bot_info?.username || 'namianime_bot'}</p>
            <p className="text-xs text-gray-400 mt-1">First Name: {status?.bot_info?.first_name || 'ទស្សនារឿង'}</p>
          </div>

          <div className="card p-5 bg-gradient-to-br from-purple-950/40 to-dark-card border-purple-500/30">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-gray-400 uppercase">Auto Notification</span>
              <span className="badge bg-brand-500/20 text-brand-300 border border-brand-500/40 text-[10px]">
                Active
              </span>
            </div>
            <p className="font-display font-black text-xl text-white">On Upload Trigger</p>
            <p className="text-xs text-gray-400 mt-1">Automatic for new Anime & Episodes</p>
          </div>

          <div className="card p-5 bg-gradient-to-br from-cyan-950/40 to-dark-card border-cyan-500/30">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-gray-400 uppercase">Subscribers / Chats</span>
              <Radio className="w-4 h-4 text-cyan-400" />
            </div>
            <p className="font-display font-black text-xl text-white">{status?.subscribers_count || 0}</p>
            <p className="text-xs text-gray-400 mt-1">Registered chat recipients</p>
          </div>
        </div>

        {/* Test Notification Trigger */}
        <div className="card p-6 border-brand-500/30">
          <h2 className="font-display font-bold text-lg text-white mb-2 flex items-center gap-2">
            <Send className="w-5 h-5 text-brand-400" /> Test Dispatch
          </h2>
          <p className="text-gray-400 text-sm mb-4">
            Click below to dispatch a sample anime announcement to your Telegram bot. Anyone who has started chat with <b>@namianime_bot</b> or added it to their channel will receive this notification.
          </p>
          <button
            onClick={sendTestNotification}
            disabled={syncing}
            className="btn-primary text-sm py-2.5 px-6"
          >
            <Send className="w-4 h-4" /> {syncing ? 'Sending test message...' : 'Send Test Notification to Bot'}
          </button>
        </div>
      </div>
    </AdminLayout>
  );
}
