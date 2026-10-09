import { useState } from 'react';
import { User as UserIcon, Settings, LogOut, Bookmark, Clock, Bell, Shield, Crown } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useLanguageStore } from '../../store/languageStore';
import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';

interface UserMenuProps {
  user: any; // Would be proper User type
  isAuthenticated: boolean;
  onLogout: () => void;
}

export function UserMenu({ user, isAuthenticated, onLogout }: UserMenuProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { language } = useLanguageStore((state) => state.language);
  const navigate = useNavigate();

  // Calculate user role info
  const isOwner = user?.role === 'OWNER' || user?.email?.toLowerCase() === 'cm5722254@gmail.com';
  const isAdmin = isOwner || user?.role === 'ADMIN';
  const isStaff = user?.role === 'STAFF';
  const canManage = user?.canManageContent || isAdmin || isStaff;

  // User menu items
  const menuItems = [
    {
      label: 'profile',
      to: '/profile',
      icon: UserIcon,
      visible: isAuthenticated,
    },
    {
      label: 'watchlist',
      to: '/favorites',
      icon: Bookmark,
      visible: isAuthenticated,
    },
    {
      label: 'history',
      to: '/history',
      icon: Clock,
      visible: isAuthenticated,
    },
    {
      label: 'notifications',
      to: '/notifications',
      icon: Bell,
      visible: isAuthenticated,
    },
    {
      label: 'settings',
      to: '/settings',
      icon: Settings,
      visible: isAuthenticated,
    },
    // Admin-only items
    {
      label: 'admin_dashboard',
      to: '/admin',
      icon: Shield,
      visible: isAdmin || isOwner,
    },
    {
      label: 'content_management',
      to: '/admin/anime',
      icon: 'book-open', // We'll use book icon or create custom
      visible: canManage,
    },
    {
      label: 'users_management',
      to: '/admin/users',
      icon: 'users', // We'll use users icon
      visible: isAdmin || isOwner,
    },
    // Owner-only items
    {
      label: 'owner_control',
      to: '/admin/owner',
      icon: Crown,
      visible: isOwner,
    },
    {
      label: 'logout',
      to: '#',
      icon: LogOut,
      visible: isAuthenticated,
      onClick: (e: React.MouseEvent) => {
        e.preventDefault();
        onLogout();
      },
    },
  ];

  // Handle menu toggle
  const handleMenuToggle = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  // Handle menu item click
  const handleMenuItemClick = (to: string, onClick?: () => void) => {
    setIsMenuOpen(false);
    if (onClick) {
      onClick();
    } else if (to && to !== '#') {
      navigate(to);
    }
  };

  // Close menu when clicking outside
  // useEffect(() => {
  //   const handleClickOutside = (event: MouseEvent) => {
  //     if (isMenuOpen && event.target instanceof HTMLElement) {
  //       // Check if click is outside menu
  //       const menuElement = document.getElementById('user-menu');
  //       const userButton = document.getElementById('user-menu-button');
  //
  //       if (!menuElement?.contains(event.target as Node) &&
  //           !userButton?.contains(event.target as Node)) {
  //         setIsMenuOpen(false);
  //       }
  //     }
  //   };
  //
  //   document.addEventListener('mousedown', handleClickOutside);
  //   return () => document.removeEventListener('mousedown', handleClickOutside);
  // }, [isMenuOpen]);

  return (
    <>
      {/* User Button */}
      <div className="relative" id="user-menu-button">
        <button
          onClick={handleMenuToggle}
          className="relative flex items-center space-x-2 p-2 rounded-full hover:bg-white/20 transition-colors duration-200"
          aria-label="User menu"
          aria-haspopup="true"
          aria-expanded={isMenuOpen}
        >
          {/* User Avatar */}
          <div className="w-8 h-8 flex items-center justify-center rounded-full bg-accent-primary/20">
            {user?.avatar_url ? (
              <img
                src={user.avatar_url}
                alt={user?.username || 'User'}
                className="w-8 h-8 rounded-full object-cover"
              />
            ) : (
              <div className="text-text-xs font-medium">
                {(user?.username || user?.email?.split('@')[0] || 'U').toUpperCase().charAt(0)}
              </div>
            )}
          </div>

          {/* User Info */}
          <div className="hidden md:flex flex-col">
            <p className="text-text-xs font-medium text-text-primary">
              {user?.username || user?.email?.split('@')[0] || 'User'}
            </p>
            {isAdmin && (
              <span className="text-text-xs text-accent-primary">Admin</span>
            )}
            {isOwner && (
              <span className="text-text-xs text-accent-primary">Owner</span>
            )}
          </div>

          {/* Dropdown Indicator */}
          <div className="w-4 h-4 flex items-center justify-center">
            <span className={`transition-transform duration-200 ${isMenuOpen ? 'rotate-180' : ''}`}>
              {/* Would use chevron-down icon */}
            </span>
          </div>
        </button>
      </div>

      {/* Menu Dropdown */}
      {isMenuOpen && (
        <div className="absolute right-0 mt-2 w-56 origin-top-right bg-bg-card rounded-lg shadow-xl border border-border-subtle z-[[var(--animekh-z-index-popover)]]">
          {/* Menu Arrow */}
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-bg-card rotate-45 border-t border-r border-border-subtle" />

          {/* Menu Items */}
          <div className="py-1 space-y-1">
            {menuItems
              .filter(item => item.visible)
              .map((item, index) => (
                <div
                  key={index}
                  className="border-t border-border-subtle first:border-t-0"
                >
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      handleMenuItemClick(item.to, item.onClick);
                    }}
                    className={`flex items-start space-x-3 w-full px-4 py-3 text-left
                             hover:bg-accent-primary/10 hover:text-accent-primary
                             transition-all duration-200`}
                  >
                    {/* Icon */}
                    <div className="flex-shrink-0 mt-0.5">
                      {item.icon === 'book-open' && (
                        <div className="w-4 h-4 flex items-center justify-center">
                          {/* Custom book open icon */}
                        </div>
                      )}
                      {item.icon === 'users' && (
                        <div className="w-4 h-4 flex items-center justify-center">
                          {/* Custom users icon */}
                        </div>
                      )}
                      {/* Default to lucide icons for known ones */}
                      {item.icon !== 'book-open' && item.icon !== 'users' && (
                        <ReactNode as={typeof item.icon === 'string' ?
                                    (() => {
                                      switch (item.icon) {
                                        case 'User': return UserIcon;
                                        case 'Settings': return Settings;
                                        case 'LogOut': return LogOut;
                                        case 'Bookmark': return Bookmark;
                                        case 'Clock': return Clock;
                                        case 'Bell': return Bell;
                                        case 'Shield': return Shield;
                                        case 'Crown': return Crown;
                                        default: return UserIcon; // Default
                                      }
                                    })() : item.icon}
                                  className="h-4 w-4"
                                />
                      )}
                    </div>

                    {/* Text */}
                    <div className="flex-1 space-y-1">
                      <p className="text-text-sm font-medium text-text-primary">
                        {item.label}
                      </p>
                      {item.description && (
                        <p className="text-text-xs text-text-secondary/50">
                          {item.description}
                        </p>
                      )}
                    </div>

                    {/* Arrow indicator for submenus (if needed) */}
                    {/* Would add if we had submenus */}
                  </button>
                </div>
              ))}
          </div>

          {/* Footer */}
          <div className="border-t border-border-subtle px-4 py-3">
            <button
              onClick={() => {
                setIsMenuOpen(false);
                onLogout();
              }}
              className="w-full text-left text-text-xs font-medium text-accent-primary hover:underline"
            >
              Logout
            </button>
          </div>
        </div>
      )}
    </>
  );
}