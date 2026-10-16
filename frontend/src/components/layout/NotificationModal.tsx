import { useState, useMemo } from 'react';
import { Bell, X, Check, Clock, Bookmark, Play, CheckCheck, Sparkles, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLanguageStore, translate } from '../../store/languageStore';

export interface NotificationItem {
  id: string;
  icon: string;
  title: string;
  subtitle: string;
  time: string;
  link: string;
  avatarUrl?: string;
  tag?: string;
  category?: 'episode' | 'watchlist' | 'system' | string;
  isRead?: boolean;
}

export function NotificationModal({
  notifications,
  onClose,
  onMarkAllAsRead,
  totalUnread
}: {
  notifications: NotificationItem[];
  onClose: () => void;
  onMarkAllAsRead: () => void;
  totalUnread: number;
}) {
  const navigate = useNavigate();
  const language = useLanguageStore((state) => state.language);
  const [activeTab, setActiveTab] = useState<'all' | 'episode' | 'watchlist' | 'system'>('all');

  const filteredItems = useMemo(() => {
    if (activeTab === 'all') return notifications;
    return notifications.filter((n) => n.category === activeTab);
  }, [notifications, activeTab]);

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'bookmark': return Bookmark;
      case 'clock': return Clock;
      case 'check': return Check;
      case 'play': return Play;
      default: return Bell;
    }
  };

  const handleItemClick = (link: string) => {
    onClose();
    if (link) {
      navigate(link);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 sm:p-6 bg-black/75 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative bg-[#121318] text-white w-full max-w-xl rounded-2xl shadow-2xl border border-white/10 overflow-hidden mt-8 sm:mt-0"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-400/20 text-amber-400 flex items-center justify-center">
              <Bell className="h-4 w-4" />
            </div>
            <div>
              <h2 className="font-display font-bold text-white text-base">
                {language === 'km' ? 'ការជូនដំណឹង' : 'Notifications'}
              </h2>
              {totalUnread > 0 ? (
                <span className="text-[11px] text-amber-400 font-medium">
                  {language === 'km' ? `${totalUnread} មិនទាន់អាន` : `${totalUnread} unread updates`}
                </span>
              ) : (
                <span className="text-[11px] text-gray-400 font-normal">
                  {language === 'km' ? 'បានអានទាំងអស់' : 'All caught up'}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {totalUnread > 0 && (
              <button
                onClick={onMarkAllAsRead}
                className="px-2.5 py-1 text-xs font-semibold bg-amber-400/15 hover:bg-amber-400/25 text-amber-300 rounded-lg flex items-center gap-1 transition-colors"
                title="Mark all as read"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">
                  {language === 'km' ? 'អានទាំងអស់' : 'Mark read'}
                </span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1 px-5 pt-3 border-b border-white/5 overflow-x-auto no-scrollbar">
          {[
            { id: 'all', label: language === 'km' ? 'ទាំងអស់' : 'All' },
            { id: 'episode', label: language === 'km' ? 'ភាគថ្មី' : 'Episodes' },
            { id: 'watchlist', label: language === 'km' ? 'បញ្ជីតាមដាន' : 'Watchlist' },
            { id: 'system', label: language === 'km' ? 'ប្រព័ន្ធ' : 'System' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap mb-2.5 ${
                activeTab === tab.id
                  ? 'bg-amber-400 text-black'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Body Items */}
        <div className="max-h-[55vh] overflow-y-auto p-4 space-y-2">
          {filteredItems.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Sparkles className="w-9 h-9 mx-auto text-gray-600 mb-2" />
              <p className="text-sm">
                {language === 'km' ? 'គ្មានការជូនដំណឹងនៅឡើយទេ' : 'No notifications in this category'}
              </p>
            </div>
          ) : (
            filteredItems.map((item) => {
              const IconComp = getIcon(item.icon);
              return (
                <div
                  key={item.id}
                  onClick={() => handleItemClick(item.link)}
                  className={`flex items-start gap-3.5 p-3 rounded-xl cursor-pointer transition-all border ${
                    !item.isRead
                      ? 'bg-amber-400/[0.07] border-amber-400/30 hover:bg-amber-400/[0.12]'
                      : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.06]'
                  }`}
                >
                  <div className="w-8 h-8 rounded-lg shrink-0 flex items-center justify-center bg-white/10 text-amber-400 mt-0.5">
                    <IconComp className="w-4 h-4" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <h4 className="text-xs sm:text-sm font-semibold text-white truncate">
                        {item.title}
                      </h4>
                      <span className="text-[10px] text-gray-400 shrink-0">
                        {item.time}
                      </span>
                    </div>

                    <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">
                      {item.subtitle}
                    </p>

                    <div className="flex items-center gap-2 mt-1.5">
                      {item.tag && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-400/20 text-amber-300">
                          {item.tag}
                        </span>
                      )}
                      <span className="text-[11px] text-amber-400/80 hover:text-amber-300 flex items-center gap-0.5 ml-auto">
                        {language === 'km' ? 'ទស្សនា' : 'View'}
                        <ExternalLink className="w-2.5 h-2.5" />
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-black/40 border-t border-white/5 flex items-center justify-between text-xs text-gray-400">
          <button
            onClick={() => {
              onClose();
              navigate('/notifications');
            }}
            className="text-amber-400 hover:underline font-semibold"
          >
            {language === 'km' ? 'មើលទំព័រការជូនដំណឹងពេញលេញ' : 'View full notifications page'}
          </button>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            {translate('Close', language) || 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default NotificationModal;