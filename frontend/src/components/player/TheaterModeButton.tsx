import { Maximize2, Minimize2 } from 'lucide-react';
import { useTheaterMode } from '../../hooks/useTheaterMode';

interface TheaterModeButtonProps {
  className?: string;
}

/**
 * Drop-in button that toggles theater mode.
 * Place inside WatchPage or VideoPlayer controls.
 */
export function TheaterModeButton({ className = '' }: TheaterModeButtonProps) {
  const { isTheaterMode, toggleTheaterMode } = useTheaterMode();

  return (
    <button
      onClick={toggleTheaterMode}
      title={isTheaterMode ? 'Exit Theater Mode (T)' : 'Theater Mode (T)'}
      aria-label={isTheaterMode ? 'Exit theater mode' : 'Enter theater mode'}
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold
        transition-all duration-200 select-none
        ${isTheaterMode
          ? 'bg-orange-500/20 text-orange-400 border border-orange-500/40 hover:bg-orange-500/30'
          : 'bg-white/10 text-gray-300 border border-white/10 hover:bg-white/20 hover:text-white'
        } ${className}`}
    >
      {isTheaterMode ? (
        <><Minimize2 className="w-3.5 h-3.5" /> Exit Theater</>
      ) : (
        <><Maximize2 className="w-3.5 h-3.5" /> Theater Mode</>
      )}
    </button>
  );
}

/**
 * Full-screen theater mode overlay — place as a sibling of your
 * video player. Dims everything outside the player.
 *
 * Usage: render <TheaterModeOverlay /> inside WatchPage.
 * It reads isTheaterMode from the DOM class (theater-mode on <html>).
 */
export function TheaterModeOverlay() {
  // We check the DOM class directly so this can live anywhere without prop drilling
  const isActive =
    typeof document !== 'undefined' &&
    document.documentElement.classList.contains('theater-mode');

  if (!isActive) return null;

  return (
    <div
      className="fixed inset-0 bg-black/90 z-30 animate-fade-in"
      aria-hidden="true"
      style={{ backdropFilter: 'blur(2px)' }}
    />
  );
}
