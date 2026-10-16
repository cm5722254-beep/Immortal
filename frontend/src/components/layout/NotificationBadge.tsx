import { Bell } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

export function NotificationBadge({
  notifications = [],
  className = '',
  onClick,
}: {
  notifications?: Array<{ id: string; count?: number; isRead?: boolean }>;
  className?: string;
  onClick?: () => void;
}) {
  const { isAuthenticated } = useAuthStore();

  if (!isAuthenticated) return null;

  const unreadCount = notifications.length > 0
    ? notifications.filter((n) => !n.isRead).length
    : 0;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative p-2 rounded-full hover:bg-white/10 transition-colors duration-200 text-text-secondary hover:text-text-primary ${className}`}
      aria-label="Notifications"
    >
      <Bell className="h-5 w-5" />
      {unreadCount > 0 && (
        <div className="absolute top-1 right-1 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-accent-primary text-[10px] font-bold text-white">
          {unreadCount > 99 ? '99+' : unreadCount}
        </div>
      )}
    </button>
  );
}