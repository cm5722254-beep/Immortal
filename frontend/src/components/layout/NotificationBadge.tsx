import { useState } from 'react';
import { Bell } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useNavStore } from '../../store/navStore';

export function NotificationBadge() {
  const { isAuthenticated } = useAuthStore();
  const { isSidebarOpen } = useNavStore();

  // Mock notification count - in a real app, this would come from API
  const [unreadCount, setUnreadCount] = useState(3);

  // Handle notification click
  const handleNotificationClick = () => {
    // In a real app, this would open the notification modal
    console.log('Notifications clicked');
  };

  if (!isAuthenticated) return null;

  return (
    <div
      onClick={handleNotificationClick}
      className="relative p-2 rounded-full hover:bg-white/20 transition-colors duration-200"
    >
      <Bell className="h-4 w-4 text-text-secondary" />
      {unreadCount > 0 && (
        <div className="absolute -top-1 -right-1 flex h-3 w-3 items-center justify-center rounded-full bg-accent-primary text-text-xs font-medium text-white">
          {unreadCount > 99 ? '99+' : unreadCount}
        </div>
      )}
    </div>
  );
}