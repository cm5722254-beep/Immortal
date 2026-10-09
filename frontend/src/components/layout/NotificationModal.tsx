import { useState } from 'react';
import { Bell, X, Check, Clock, Bookmark } from 'lucide-react';
import { useLanguageStore } from '../../store/languageStore';
import { usePlatform } from '../../utils/platform';

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
  const { language } = useLanguageStore((state) => state.language);
  const { isWeb, isMobileApp } = usePlatform();

  // Group notifications by category
  const groupedNotifications = notifications.reduce((acc, notif) => {
    const category = notif.category || 'other';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(notif);
    return acc;
  }, {} as Record<string, NotificationItem[]>);

  // Handle marking a single notification as read
  const handleMarkAsRead = (id: string) => {
    // In a real app, this would call an API endpoint
    // await api.post(`/notifications/${id}/read`);
    // For now, we'll just filter it out locally
    // setNotificationList(notifications.filter(n => n.id !== id));
  };

  // Handle clearing all notifications
  const handleClearAll = () => {
    // In a real app, this would call an API endpoint
    // await api.delete('/notifications');
    onMarkAllAsRead();
  };

  // Get icon component based on icon name
  const getIconComponent = (iconName: string) => {
    switch (iconName) {
      case 'bell': return Bell;
      case 'bookmark': return Bookmark;
      case 'clock': return Clock;
      case 'check': return Check;
      default: return Bell; // Default fallback
    }
  };

  return (
    <div className="fixed inset-0 z-[[var(--animekh-z-index-modal-backdrop)]] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative bg-bg-card w-full max-w-2xl mx-4 sm:mx-0 lg:mx-0 rounded-lg shadow-xl border border-border-subtle">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtl">
          <div className="flex items-center space-x-3">
            <Bell className="h-5 w-5 text-accent-primary" />
            <h2 className="font-display text-text-primary">
              Notifications
            </h2>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={onMarkAllAsRead}
              className="px-3 py-1 text-text-xs font-medium bg-accent-primary/10 text-accent-primary rounded-hover"
              disabled={totalUnread === 0}
            >
              Mark all as read
            </button>
            <button
              onClick={handleClearAll}
              className="px-3 py-1 text-text-xs font-medium bg-accent-primary/10 text-accent-primary rounded-hover"
              disabled={notifications.length === 0}
            >
              Clear all
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-white/20 transition-colors duration-200"
              aria-label="Close"
            >
              <X className="h-5 w-5 text-text-secondary" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          {/* Empty State */}
          {notifications.length === 0 && (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-accent-primary/10">
                <Bell className="h-8 w-8 text-accent-primary" />
              </div>
              <p className="text-text-secondary">No notifications</p>
              {totalUnread > 0 && (
                <p className="mt-2 text-text-secondary/50">
                  You have {totalUnread} new notifications
                </p>
              )}
            </div>
          )}

          {/* Notification List */}
          {notifications.length > 0 && (
            <div className="space-y-4">
              {Object.entries(groupedNotifications).map(([category, items]) => (
                <div key={category} className="mb-4">
                  <h3 className="font-medium text-text-secondary mb-2">
                    {/* Category names would be localized in a real app */}
                    {category === 'episode' && 'New Episodes'}
                    {category === 'watchlist' && 'Watchlist Updates'}
                    {category === 'system' && 'System Notifications'}
                    {(!['episode', 'watchlist', 'system'].includes(category)) && 'Other'}
                  </h3>
                  <div className="space-y-2">
                    {items.map((notification) => (
                      <div
                        key={notification.id}
                        className={`flex items-start space-x-3 p-3 bg-bg-card-subtle rounded-lg
                                   ${!notification.isRead ? 'border-l-2 border-accent-primary' : ''}`}
                      >
                        {/* Avatar or Icon */}
                        <div className="flex-shrink-0 mt-0.5">
                          {notification.avatarUrl ? (
                            <img
                              src={notification.avatarUrl}
                              alt={notification.title}
                              className="w-8 h-8 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-8 h-8 flex items-center justify-center rounded-full bg-accent-primary/20">
                              <getIconComponent(notification.icon)
                                className="h-4 w-4 text-accent-primary"
                              />
                            </div>
                          )}
                        </div>

                        {/* Notification Content */}
                        <div className="flex-1 space-y-1">
                          <div className="flex justify-between items-start">
                            <h4 className="font-semibold text-text-primary line-clamp-1">
                              {notification.title}
                            </h4>
                            <span className="text-text-xs text-text-secondary/50">
                              {notification.time}
                            </span>
                          </div>
                          <p className="text-text-secondary/80 line-clamp-2">
                            {notification.subtitle}
                          </p>
                          {notification.tag && (
                            <span className="mt-1 inline-flex items-center px-2 py-0.5 text-text-xs font-medium
                                      bg-accent-primary/10 text-accent-primary rounded-full">
                              {notification.tag}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {/* Show "View All" link if there are more notifications */}
              {notifications.length > 5 && (
                <div className="mt-4 text-center">
                  <button
                    onClick={() => {
                      // In a real app, this would navigate to notifications page
                      onClose();
                      // navigate('/notifications');
                    }}
                    className="text-text-xs font-medium text-accent-primary hover:underline"
                  >
                    View all {notifications.length} notifications
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        {notifications.length > 0 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-border-subtl">
            <span className="text-text-xs text-text-secondary/50">
              Showing {Math.min(notifications.length, 5)} of {notifications.length} notifications
            </span>
            <button
              onClick={onMarkAllAsRead}
              className="px-4 py-2 text-sm font-medium bg-accent-primary text-text-primary rounded-hover hover:bg-accent-primary/90 disabled:opacity-50"
              disabled={totalUnread === 0}
            >
              Mark all as read ({totalUnread})
            </button>
          </div>
        )}
      </div>
    </div>
  );
}