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
import { useLanguageStore, translate } from '../../store/languageStore';

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
  const language = useLanguageStore((state) => state.language);

  const isOwner = Boolean(user?.role === 'OWNER' || user?.email?.toLowerCase() === 'cm5722254@gmail.com');
  const isAdmin = Boolean(isOwner || user?.role === 'ADMIN');
  const isStaff = Boolean(user?.role === 'STAFF');
  const canManage = Boolean(isAdmin || isOwner || isStaff);

  const menuItems: MenuItem[] = [
    {
      label: translate('Profile', language),
      to: '/profile',
      icon: UserIcon,
      visible: isAuthenticated,
    },
    {
      label: translate('Library', language),
      to: '/favorites',
      icon: Bookmark,
      visible: isAuthenticated,
    },
    {
      label: translate('History', language),
      to: '/history',
      icon: Clock,
      visible: isAuthenticated,
    },
    {
      label: translate('Notifications', language),
      to: '/notifications',
      icon: Bell,
      visible: isAuthenticated,
    },
    {
      label: translate('Settings', language),
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
      label: translate('Logout', language) || 'ចាកចេញ',
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
        className="relative flex items-center space-x-2 p-1 sm:p-1.5 rounded-full hover:bg-slate-100 transition-colors duration-200 cursor-pointer"
        aria-label="User menu"
        aria-haspopup="true"
        aria-expanded={isMenuOpen}
      >
        <div className="w-8 h-8 flex items-center justify-center rounded-full bg-blue-100 text-blue-600 font-bold text-xs overflow-hidden ring-2 ring-blue-50">
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
          <p className="text-xs font-bold text-slate-900 leading-tight">
            {user?.username || user?.email?.split('@')[0] || 'User'}
          </p>
          {(isOwner || isAdmin) && (
            <span className="text-[10px] text-blue-600 font-extrabold uppercase tracking-wider">
              {isOwner ? 'Owner' : 'Admin'}
            </span>
          )}
        </div>

        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isMenuOpen ? 'rotate-180' : ''}`} />
      </button>

      {isMenuOpen && (
        <div className="absolute right-0 mt-2 w-56 origin-top-right bg-white/95 backdrop-blur-2xl rounded-2xl shadow-xl border border-slate-200/90 z-[999] py-1.5 divide-y divide-slate-100 animate-scale-in">
          <div className="py-1">
            {menuItems
              .filter((item) => item.visible)
              .map((item) => {
                const IconComp = item.icon;
                const isDanger = item.to === '#' || item.label.toLowerCase().includes('log') || item.label.includes('ចាកចេញ');
                return (
                  <button
                    key={item.label}
                    onClick={() => handleMenuItemClick(item.to, item.onClick)}
                    className={`flex items-center space-x-3 w-full px-4 py-2.5 text-left text-xs sm:text-sm font-semibold transition-colors cursor-pointer ${
                      isDanger
                        ? 'text-rose-600 hover:bg-rose-50'
                        : 'text-slate-700 hover:text-blue-600 hover:bg-blue-50/80'
                    }`}
                  >
                    <IconComp className={`h-4 w-4 shrink-0 ${isDanger ? 'text-rose-500' : 'text-blue-600'}`} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}