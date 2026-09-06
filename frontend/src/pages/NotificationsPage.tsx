import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell, Film, Crown, Send, CheckCheck } from 'lucide-react';

import api from '../services/api';

interface NotificationItem {
  id: string;
  icon: string;
  title: string;
  subtitle: string;
  time: string;
  link: string;
  avatarUrl?: string;
}

export function NotificationsPage() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
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

  return (
    <main className="min-h-screen pb-24 md:pb-12 text-gray-100 px-4 py-8 max-w-2xl mx-auto animate-fade-in">
      {/* ── Top Header ── */}
      <div className="flex items-center justify-between mb-8 border-b border-red-500/20 pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            aria-label="Back"
            className="w-10 h-10 rounded-full flex items-center justify-center text-white bg-white/5 hover:bg-white/10 transition-colors border border-white/10"
          >
            <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
          </button>
          <div>
            <h1 className="font-display font-black text-2xl sm:text-3xl text-white flex items-center gap-2">
              ការជូនដំណឹង
              {unreadCount > 0 && (
                <span className="bg-[#FF3B30] text-white text-xs font-bold px-2 py-0.5 rounded-full shadow-md shadow-red-500/30">
                  {unreadCount} ថ្មី
                </span>
              )}
            </h1>
            <p className="text-xs text-gray-400 mt-0.5">ដំណឹងចេញផ្សាយភាគថ្មីៗ និងប្រព័ន្ធសុវត្ថិភាព</p>
          </div>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="inline-flex items-center gap-1.5 text-xs text-[#FF3B30] hover:text-[#ff6f61] font-bold transition-all px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20"
          >
            <CheckCheck className="w-4 h-4" />
            អានទាំងអស់
          </button>
        )}
      </div>

      {/* ── Notifications List ── */}
      <div className="space-y-3.5">
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 rounded-2xl bg-white/5 animate-pulse border border-white/5" />
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-24 space-y-4">
            <div className="w-16 h-16 rounded-full bg-[#15060A] border border-red-500/30 flex items-center justify-center mx-auto text-gray-400 shadow-xl shadow-red-500/10">
              <Bell className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-300 text-base font-bold">មិនទាន់មានការជូនដំណឹងនៅឡើយទេ</p>
            <p className="text-xs text-gray-500">នៅពេលមានភាគថ្មី ឬដំណឹងពិសេស នឹងបង្ហាញនៅទីនេះ</p>
          </div>
        ) : (
          notifications.map((item) => {
            const isUnread = !readNotifIds.includes(item.id);
            return (
              <div
                key={item.id}
                onClick={() => handleNotifClick(item)}
                className={`p-4 rounded-2xl border transition-all duration-200 flex items-start gap-4 cursor-pointer group hover:scale-[1.01] ${
                  isUnread
                    ? 'bg-gradient-to-r from-[#200910] via-[#15060A] to-[#15060A] border-red-500/40 shadow-lg shadow-red-500/10'
                    : 'bg-[#15060A]/70 border-red-500/15 opacity-80 hover:opacity-100'
                }`}
              >
                {/* Circular Avatar / Icon */}
                <div className="relative shrink-0 mt-0.5">
                  {item.avatarUrl ? (
                    <div className="w-12 h-12 rounded-full overflow-hidden border border-red-500/30 bg-[#200910] shadow-md">
                      <img
                        src={item.avatarUrl}
                        alt=""
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      />
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-red-500/15 border border-red-500/30 flex items-center justify-center text-[#FF3B30] shadow-md">
                      {item.icon === 'vip' ? (
                        <Crown className="w-6 h-6 text-amber-400 fill-amber-400" />
                      ) : item.icon === 'system' ? (
                        <Send className="w-5 h-5 text-cyan-400" />
                      ) : (
                        <Film className="w-6 h-6" />
                      )}
                    </div>
                  )}
                  {isUnread && (
                    <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#FF3B30] ring-2 ring-[#080306] animate-pulse" />
                  )}
                </div>

                {/* Two-Line Text (Title + Subtitle + Time) */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className={`font-display font-bold text-sm sm:text-base line-clamp-1 leading-snug group-hover:text-[#FF3B30] transition-colors ${
                      isUnread ? 'text-white font-black' : 'text-gray-200'
                    }`}>
                      {item.title}
                    </h3>
                    <span className="text-[10px] text-gray-500 shrink-0 font-mono">
                      {item.time}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 line-clamp-2 mt-1 leading-relaxed">
                    {item.subtitle}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </main>
  );
}
