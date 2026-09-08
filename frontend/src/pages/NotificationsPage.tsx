import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Bell, Film, Crown, Send, CheckCheck,
  Flame, Clock, ChevronRight
} from 'lucide-react';

import api from '../services/api';

interface NotificationItem {
  id: string;
  icon: string;
  title: string;
  subtitle: string;
  time: string;
  link: string;
  avatarUrl?: string;
  tag?: string;
  category?: string;
}

export function NotificationsPage() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notifTab, setNotifTab] = useState<'all' | 'episode' | 'vip' | 'unread'>('all');
  const [readNotifIds, setReadNotifIds] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('mer_read_notifs') || '[]');
    } catch {
      return [];
    }
  });

  useEffect(() => {
    api.get('/notifications')
      .then((res) => {
        if (Array.isArray(res.data)) {
          setNotifications(res.data);
        }
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const handleNotifClick = (n: NotificationItem) => {
    if (!readNotifIds.includes(n.id)) {
      const updated = [...readNotifIds, n.id];
      setReadNotifIds(updated);
      localStorage.setItem('mer_read_notifs', JSON.stringify(updated));
    }
    if (n.link.startsWith('http')) {
      window.open(n.link, '_blank');
    } else {
      navigate(n.link);
    }
  };

  const markAllRead = () => {
    const allIds = notifications.map((n) => n.id);
    setReadNotifIds(allIds);
    localStorage.setItem('mer_read_notifs', JSON.stringify(allIds));
  };

  const unreadCount = notifications.filter((n) => !readNotifIds.includes(n.id)).length;
  const episodeCount = notifications.filter((n) => n.icon === 'episode' || n.category === 'episode').length;
  const systemCount = notifications.filter((n) => n.icon === 'vip' || n.icon === 'system' || n.category === 'vip' || n.category === 'system').length;

  const filteredNotifications = notifications.filter((n) => {
    const isUnread = !readNotifIds.includes(n.id);
    if (notifTab === 'unread') return isUnread;
    if (notifTab === 'episode') return n.icon === 'episode' || n.category === 'episode';
    if (notifTab === 'vip') return n.icon === 'vip' || n.icon === 'system' || n.category === 'vip' || n.category === 'system';
    return true;
  });

  return (
    <main className="min-h-screen pb-24 md:pb-12 text-gray-100 px-3 sm:px-4 py-6 sm:py-8 max-w-3xl mx-auto animate-fade-in">
      {/* ── Top Header ── */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-rose-500/20">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            aria-label="Back"
            className="w-10 h-10 rounded-2xl flex items-center justify-center text-white bg-white/5 hover:bg-white/10 transition-colors border border-white/10 active:scale-95"
          >
            <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
          </button>
          <div>
            <h1 className="font-display font-black text-xl sm:text-2xl md:text-3xl text-white flex items-center gap-2">
              <span>សេចក្តីជូនដំណឹង</span>
              {unreadCount > 0 && (
                <span className="bg-gradient-to-r from-rose-500 to-pink-500 text-white text-xs font-bold px-2.5 py-0.5 rounded-full shadow-md shadow-rose-500/30 animate-pulse">
                  {unreadCount} ថ្មី
                </span>
              )}
            </h1>
            <p className="text-xs text-gray-400 mt-0.5">ដំណឹងចេញផ្សាយភាគថ្មីៗ និងប្រព័ន្ធ VIP ពិសេស</p>
          </div>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="inline-flex items-center gap-1.5 text-xs text-rose-400 hover:text-rose-300 font-bold transition-all px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 active:scale-95"
          >
            <CheckCheck className="w-4 h-4" />
            <span className="hidden xs:inline">អានទាំងអស់</span>
          </button>
        )}
      </div>

      {/* ── Filter Tabs ── */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto no-scrollbar pb-1">
        <button
          onClick={() => setNotifTab('all')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
            notifTab === 'all'
              ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-md shadow-rose-500/25'
              : 'bg-white/5 text-gray-300 hover:text-white hover:bg-white/10 border border-white/5'
          }`}
        >
          ទាំងអស់ ({notifications.length})
        </button>
        <button
          onClick={() => setNotifTab('episode')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
            notifTab === 'episode'
              ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-md shadow-rose-500/25'
              : 'bg-white/5 text-gray-300 hover:text-white hover:bg-white/10 border border-white/5'
          }`}
        >
          <Flame className="w-3.5 h-3.5 text-amber-400" />
          ភាគថ្មី ({episodeCount})
        </button>
        <button
          onClick={() => setNotifTab('vip')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
            notifTab === 'vip'
              ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-md shadow-rose-500/25'
              : 'bg-white/5 text-gray-300 hover:text-white hover:bg-white/10 border border-white/5'
          }`}
        >
          <Crown className="w-3.5 h-3.5 text-yellow-400" />
          VIP & ប្រព័ន្ធ ({systemCount})
        </button>
        {unreadCount > 0 && (
          <button
            onClick={() => setNotifTab('unread')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              notifTab === 'unread'
                ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-md shadow-rose-500/25'
                : 'bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 border border-rose-500/20'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            មិនទាន់អាន ({unreadCount})
          </button>
        )}
      </div>

      {/* ── Notifications List ── */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-24 rounded-2xl bg-white/5 animate-pulse border border-white/5" />
            ))}
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="text-center py-24 space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-[#12172b] border border-rose-500/30 flex items-center justify-center mx-auto text-gray-400 shadow-xl shadow-rose-500/10">
              <Bell className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-200 text-base font-bold">មិនមានការជូនដំណឹងនៅឡើយទេ</p>
            <p className="text-xs text-gray-400">នៅពេលមានភាគថ្មី ឬដំណឹងពិសេស នឹងបង្ហាញនៅទីនេះ</p>
          </div>
        ) : (
          filteredNotifications.map((item) => {
            const isUnread = !readNotifIds.includes(item.id);
            return (
              <div
                key={item.id}
                onClick={() => handleNotifClick(item)}
                className={`p-3.5 sm:p-4 rounded-2xl border transition-all duration-200 flex items-start gap-3.5 sm:gap-4 cursor-pointer group hover:scale-[1.01] ${
                  isUnread
                    ? 'bg-gradient-to-r from-rose-950/40 via-[#12182c] to-[#0f1424] border-rose-500/40 shadow-lg shadow-rose-500/10 hover:border-rose-400/80'
                    : 'bg-[#0f1424]/60 border-white/5 hover:border-white/15 opacity-85 hover:opacity-100'
                }`}
              >
                {/* Poster / Avatar */}
                <div className="relative shrink-0 mt-0.5">
                  {item.avatarUrl ? (
                    <div className="w-14 h-16 rounded-xl overflow-hidden border border-white/15 bg-black/60 shadow-md">
                      <img
                        src={item.avatarUrl}
                        alt=""
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                        onError={(e) => {
                          (e.currentTarget as HTMLElement).style.display = 'none';
                          const fallback = e.currentTarget.parentElement?.querySelector('.avatar-fallback');
                          if (fallback) (fallback as HTMLElement).style.display = 'flex';
                        }}
                      />
                      <div className="avatar-fallback hidden w-full h-full bg-rose-900/30 flex items-center justify-center text-rose-400">
                        <Film className="w-6 h-6" />
                      </div>
                    </div>
                  ) : (
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-[#FF3B30] shadow-md border ${
                      item.icon === 'vip'
                        ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                        : item.icon === 'system'
                        ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30'
                        : 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                    }`}>
                      {item.icon === 'vip' ? (
                        <Crown className="w-7 h-7 text-amber-400 fill-amber-400" />
                      ) : item.icon === 'system' ? (
                        <Send className="w-6 h-6 text-cyan-400" />
                      ) : (
                        <Film className="w-7 h-7" />
                      )}
                    </div>
                  )}
                  {isUnread && (
                    <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-rose-500 ring-2 ring-[#0c101d] shadow-[0_0_8px_#ff4d6d] animate-pulse" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {item.tag && (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                        item.icon === 'vip'
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          : item.icon === 'system'
                          ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                          : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                      }`}>
                        {item.tag}
                      </span>
                    )}
                    <span className="text-[11px] text-gray-400 font-mono flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-gray-500" />
                      {item.time}
                    </span>
                  </div>

                  <h3 className={`font-display font-bold text-sm sm:text-base line-clamp-2 leading-snug transition-colors ${
                    isUnread ? 'text-white group-hover:text-rose-300' : 'text-gray-200 group-hover:text-white'
                  }`}>
                    {item.title}
                  </h3>
                  <p className="text-xs text-gray-400 line-clamp-2 mt-1 leading-relaxed">
                    {item.subtitle}
                  </p>
                </div>

                {/* Arrow CTA */}
                <div className="shrink-0 self-center text-gray-500 group-hover:text-rose-400 transition-all p-1">
                  <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            );
          })
        )}
      </div>
    </main>
  );
}
