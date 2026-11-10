import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Bell, Film, Crown, Send, CheckCheck, Heart,
  Flame, Clock, ChevronRight
} from 'lucide-react';

import api from '../services/api';
import { useAuthStore } from '../store/authStore';
import { translate, useLanguageStore } from '../store/languageStore';

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

function formatNotificationTime(value: string, language: 'km' | 'en') {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return value;
  const minutes = Math.floor((Date.now() - timestamp) / 60000);
  const unit = minutes < 60 ? 'minute' : minutes < 1440 ? 'hour' : 'day';
  const amount = unit === 'minute' ? Math.max(1, minutes) : unit === 'hour' ? Math.floor(minutes / 60) : Math.floor(minutes / 1440);
  return new Intl.RelativeTimeFormat(language === 'km' ? 'km-KH' : 'en-US', { numeric: 'auto' }).format(-amount, unit);
}

export function NotificationsPage() {
  const appLanguage = useLanguageStore((state) => state.language);
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notifTab, setNotifTab] = useState<'all' | 'episode' | 'vip' | 'unread' | 'following'>('all');
  const [readNotifIds, setReadNotifIds] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('mer_read_notifs') || '[]');
    } catch {
      return [];
    }
  });

  useEffect(() => {
    Promise.all([
      api.get('/notifications').catch(() => ({ data: [] })),
      isAuthenticated ? api.get('/notifications/following').catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
    ])
      .then(([general, following]) => {
        const generalItems = Array.isArray(general.data) ? general.data : [];
        const followingItems = Array.isArray(following.data) ? following.data : [];
        setNotifications([...followingItems, ...generalItems]);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [isAuthenticated]);

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
  const followingCount = notifications.filter((n) => n.category === 'following').length;

  const filteredNotifications = notifications.filter((n) => {
    const isUnread = !readNotifIds.includes(n.id);
    if (notifTab === 'following') return n.category === 'following';
    if (notifTab === 'unread') return isUnread;
    if (notifTab === 'episode') return n.icon === 'episode' || n.category === 'episode';
    if (notifTab === 'vip') return n.icon === 'vip' || n.icon === 'system' || n.category === 'vip' || n.category === 'system';
    return true;
  });

  const pillClass = (active: boolean) =>
    `px-3.5 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
      active
        ? 'bg-blue-600 text-white shadow-xs'
        : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-slate-200/90'
    }`;

  return (
    <main className="mini-notifications-page min-h-screen pb-24 md:pb-12 bg-slate-50/60 text-slate-900 px-3 sm:px-4 py-6 sm:py-8 max-w-3xl mx-auto animate-fade-in">
      {/* Top Header */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-200/80">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            aria-label={appLanguage === 'km' ? 'ត្រឡប់ក្រោយ' : 'Back'}
            className="w-10 h-10 rounded-2xl flex items-center justify-center text-slate-700 bg-white hover:bg-slate-100 transition-colors border border-slate-200/90 shadow-xs active:scale-95 cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-display font-black text-xl sm:text-2xl text-slate-900 flex items-center gap-2">
              <span>{translate('Notifications', appLanguage)}</span>
              {unreadCount > 0 && (
                <span className="bg-blue-600 text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                  {unreadCount} {translate('New', appLanguage)}
                </span>
              )}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">{translate('New episodes and VIP updates', appLanguage)}</p>
          </div>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-semibold transition-all px-3 py-2 rounded-xl bg-blue-50 hover:bg-blue-100/80 border border-blue-200/80 active:scale-95 cursor-pointer"
          >
            <CheckCheck className="w-4 h-4" />
            <span className="hidden xs:inline">{translate('Mark all read', appLanguage)}</span>
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto no-scrollbar pb-1">
        <button onClick={() => setNotifTab('all')} className={pillClass(notifTab === 'all')}>
          {translate('All', appLanguage)} ({notifications.length})
        </button>
        <button onClick={() => setNotifTab('episode')} className={pillClass(notifTab === 'episode')}>
          <Flame className={`w-3.5 h-3.5 ${notifTab === 'episode' ? 'text-white' : 'text-blue-600'}`} />
          {translate('New episodes', appLanguage)} ({episodeCount})
        </button>
        {isAuthenticated && (
          <button onClick={() => setNotifTab('following')} className={pillClass(notifTab === 'following')}>
            <Heart className={`w-3.5 h-3.5 ${notifTab === 'following' ? 'text-white' : 'text-blue-600'}`} />
            <span>{appLanguage === 'km' ? 'បញ្ជីរបស់ខ្ញុំ' : 'My List'} ({followingCount})</span>
          </button>
        )}
        <button onClick={() => setNotifTab('vip')} className={pillClass(notifTab === 'vip')}>
          <Crown className={`w-3.5 h-3.5 ${notifTab === 'vip' ? 'text-white' : 'text-amber-500'}`} />
          {translate('VIP & system', appLanguage)} ({systemCount})
        </button>
        {unreadCount > 0 && (
          <button onClick={() => setNotifTab('unread')} className={pillClass(notifTab === 'unread')}>
            <span className={`w-2 h-2 rounded-full ${notifTab === 'unread' ? 'bg-white' : 'bg-blue-600'}`} />
            {translate('Unread', appLanguage)} ({unreadCount})
          </button>
        )}
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-24 rounded-2xl bg-white animate-pulse border border-slate-200/80" />
            ))}
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="text-center py-20 space-y-3 bg-white rounded-3xl border border-slate-200/80 shadow-xs">
            <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-center mx-auto text-slate-400">
              <Bell className="w-7 h-7" />
            </div>
            <p className="text-slate-900 text-base font-bold">{translate('No notifications yet', appLanguage)}</p>
            <p className="text-xs text-slate-500">{translate('Updates will appear here.', appLanguage)}</p>
          </div>
        ) : (
          filteredNotifications.map((item) => {
            const isUnread = !readNotifIds.includes(item.id);
            return (
              <div
                key={item.id}
                onClick={() => handleNotifClick(item)}
                className={`p-3.5 sm:p-4 rounded-2xl border transition-all duration-200 flex items-start gap-3.5 sm:gap-4 cursor-pointer group ${
                  isUnread
                    ? 'bg-blue-50/50 border-blue-200 hover:border-blue-300 shadow-xs'
                    : 'bg-white border-slate-200/80 hover:border-slate-300 shadow-xs'
                }`}
              >
                {/* Poster / Avatar */}
                <div className="relative shrink-0 mt-0.5">
                  {(() => {
                    const slugMatch = item.link?.match(/\/watch\/([^/]+)/);
                    const slug = slugMatch ? slugMatch[1] : '';
                    const hasValidAvatar = item.avatarUrl && !item.avatarUrl.includes('onrender.com') && !item.avatarUrl.includes('unsplash.com');
                    const posterSrc = hasValidAvatar ? item.avatarUrl : (slug ? `/posters/${slug}.jpg` : item.avatarUrl);

                    if (posterSrc) {
                      return (
                        <div className="w-14 h-16 rounded-xl overflow-hidden border border-slate-200/90 bg-slate-100">
                          <img
                            src={posterSrc}
                            alt=""
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            onError={(e) => {
                              const target = e.currentTarget as HTMLImageElement;
                              if (slug && !target.src.includes(`/posters/${slug}.jpg`)) {
                                target.src = `/posters/${slug}.jpg`;
                              } else {
                                target.style.display = 'none';
                                const fallback = target.parentElement?.querySelector('.avatar-fallback');
                                if (fallback) (fallback as HTMLElement).style.display = 'flex';
                              }
                            }}
                          />
                          <div className="avatar-fallback hidden w-full h-full bg-blue-50 flex items-center justify-center text-blue-600">
                            <Film className="w-6 h-6" />
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div className={`w-13 h-13 rounded-2xl flex items-center justify-center border ${
                        item.icon === 'vip'
                          ? 'bg-amber-50 text-amber-600 border-amber-200'
                          : 'bg-blue-50 text-blue-600 border-blue-100'
                      }`}>
                        {item.icon === 'vip' ? (
                          <Crown className="w-6 h-6 text-amber-500" />
                        ) : item.icon === 'system' ? (
                          <Send className="w-5 h-5 text-blue-600" />
                        ) : (
                          <Film className="w-6 h-6 text-blue-600" />
                        )}
                      </div>
                    );
                  })()}
                  {isUnread && (
                    <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-blue-600 ring-2 ring-white" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {item.tag && (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                        item.icon === 'vip'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-blue-50 text-blue-700 border-blue-100'
                      }`}>
                        {item.tag}
                      </span>
                    )}
                    <span className="text-[11px] text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatNotificationTime(item.time, appLanguage)}
                    </span>
                  </div>

                  <h3 className={`font-display font-bold text-sm sm:text-base line-clamp-2 leading-snug transition-colors ${
                    isUnread ? 'text-slate-900 group-hover:text-blue-600' : 'text-slate-800 group-hover:text-blue-600'
                  }`}>
                    {item.title}
                  </h3>
                  <p className="text-xs text-slate-500 line-clamp-2 mt-1 leading-relaxed">
                    {item.subtitle}
                  </p>
                </div>

                {/* Arrow CTA */}
                <div className="shrink-0 self-center text-slate-400 group-hover:text-blue-600 transition-all p-1">
                  <ChevronRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            );
          })
        )}
      </div>
    </main>
  );
}
