import { useState, useEffect, useCallback } from 'react';

interface UseTheaterModeReturn {
  isTheaterMode: boolean;
  toggleTheaterMode: () => void;
  exitTheaterMode: () => void;
}

/**
 * Theater Mode: hides Navbar, MobileNav, Footer and dims the viewport
 * around the player. Also adds keyboard shortcut (T key).
 */
export function useTheaterMode(): UseTheaterModeReturn {
  const [isTheaterMode, setIsTheaterMode] = useState(false);

  const enterTheaterMode = useCallback(() => {
    setIsTheaterMode(true);
    document.documentElement.classList.add('theater-mode');
    // Prevent body scroll when in theater mode
    document.body.style.overflow = 'hidden';
  }, []);

  const exitTheaterMode = useCallback(() => {
    setIsTheaterMode(false);
    document.documentElement.classList.remove('theater-mode');
    document.body.style.overflow = '';
  }, []);

  const toggleTheaterMode = useCallback(() => {
    if (isTheaterMode) exitTheaterMode();
    else enterTheaterMode();
  }, [isTheaterMode, enterTheaterMode, exitTheaterMode]);

  // Keyboard shortcut: T = toggle, Escape = exit
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      // Don't hijack keyboard when user is typing in inputs
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
      if (e.key === 't' || e.key === 'T') toggleTheaterMode();
      if (e.key === 'Escape' && isTheaterMode) exitTheaterMode();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [toggleTheaterMode, isTheaterMode, exitTheaterMode]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      document.documentElement.classList.remove('theater-mode');
      document.body.style.overflow = '';
    };
  }, []);

  return { isTheaterMode, toggleTheaterMode, exitTheaterMode };
}
