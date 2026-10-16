import { useState, useRef, useEffect } from 'react';
import {
  User as UserIcon,
  Settings,
  LogOut,
  Bookmark,
  Clock,
  Bell,
  Shield,
  Crown,
  BookOpen,
  Users as UsersIcon,
  ChevronDown,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface UserMenuProps {
  user: any;
  isAuthenticated: boolean;
  onLogout: () => void;
}

interface MenuItem {
  label: string;
  to: string;
  icon: React.ElementType;
  visible: boolean;
  onClick?: () => void;
}

export function UserMenu({ user, isAuthenticated, onLogout }: UserMenuProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();
  const menuRef = useRef<HTMLDivElement>(null);

  const isOwner = user?.role === 'OWNER' || user?.email?.toLowerCase() === 'cm5722254@gmail.com';
  const isAdmin = isOwner || user?.role === 'ADMIN';
  const isStaff = user?.role === 'STAFF';
  const canManage = user?.canManageContent || isAdmin || isStaff;

  const menuItems: MenuItem[] = [
    {
      label: 'Profile',
      to: '/profile',
      icon: UserIcon,
      visible: isAuthenticated,
    },
    {
      label: 'Watchlist',
      to: '/favorites',
      icon: Bookmark,
      visible: isAuthenticated,
    },
    {
      label: 'History',
      to: '/history',
      icon: Clock,
      visible: isAuthenticated,
    },
    {
      label: 'Notifications',
      to: '/notifications',
      icon: Bell,
      visible: isAuthenticated,
    },
    {
      label: 'Settings',
      to: '/settings',
      icon: Settings,
      visible: isAuthenticated,
    },
    {
      label: 'Admin Dashboard',
      to: '/admin',
      icon: Shield,
      visible: Boolean(isAdmin || isOwner),
    },
    {
      label: 'Content Management',
      to: '/admin/anime',
      icon: BookOpen,
      visible: Boolean(canManage),
    },
    {
      label: 'User Management',
      to: '/admin/users',
      icon: UsersIcon,
      visible: Boolean(isAdmin || isOwner),
    },
    {
      label: 'Owner Control',
      to: '/admin/owner',
      icon: Crown,
      visible: Boolean(isOwner),
    },
    {
      label: 'Logout',
      to: '#',
      icon: LogOut,
      visible: isAuthenticated,
      onClick: () => {
        onLogout();
      },
    },
  ];

  const handleMenuToggle = () => {
    setIsMenuOpen((prev) => !prev);
  };

  const handleMenuItemClick = (to: string, onClick?: () => void) => {
    setIsMenuOpen(false);
    if (onClick) {
      onClick();
    } else if (to && to !== '#') {
      navigate(to);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);

  if (!isAuthenticated) return null;

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={handleMenuToggle}
        className="relative flex items-center space-x-2 p-1.5 rounded-full hover:bg-white/10 transition-colors duration-200"
        aria-label="User menu"
        aria-haspopup="true"
        aria-expanded={isMenuOpen}
      >
        <div className="w-8 h-8 flex items-center justify-center rounded-full bg-accent-primary/20 text-accent-primary font-bold text-sm overflow-hidden">
          {user?.avatar_url ? (
            <img
              src={user.avatar_url}
              alt={user?.username || 'User'}
              className="w-8 h-8 rounded-full object-cover"
            />
          ) : (
            (user?.username || user?.email?.split('@')[0] || 'U').toUpperCase().charAt(0)
          )}
        </div>

        <div className="hidden md:flex flex-col text-left">
          <p className="text-xs font-semibold text-text-primary leading-tight">
            {user?.username || user?.email?.split('@')[0] || 'User'}
          </p>
          {(isOwner || isAdmin) && (
            <span className="text-[10px] text-accent-primary font-bold">
              {isOwner ? 'Owner' : 'Admin'}
            </span>
          )}
        </div>

        <ChevronDown className={`w-3.5 h-3.5 text-text-secondary transition-transform duration-200 ${isMenuOpen ? 'rotate-180' : ''}`} />
      </button>

      {isMenuOpen && (
        <div className="absolute right-0 mt-2 w-56 origin-top-right bg-bg-card rounded-xl shadow-2xl border border-border-subtle z-[999] py-1 backdrop-blur-md">
          {menuItems
            .filter((item) => item.visible)
            .map((item) => {
              const IconComp = item.icon;
              return (
                <button
                  key={item.label}
                  onClick={() => handleMenuItemClick(item.to, item.onClick)}
                  className="flex items-center space-x-3 w-full px-4 py-2.5 text-left text-sm text-text-secondary hover:text-text-primary hover:bg-accent-primary/10 transition-colors"
                >
                  <IconComp className="h-4 w-4 shrink-0 text-accent-primary" />
                  <span className="font-medium">{item.label}</span>
                </button>
              );
            })}
        </div>
      )}
    </div>
  );
}