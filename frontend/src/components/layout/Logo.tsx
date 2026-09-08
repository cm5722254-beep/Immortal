import { Link } from 'react-router-dom';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showWordmark?: boolean;
  className?: string;
}

const sizes = {
  sm: { icon: 30, text: 'text-sm',  sub: 'text-[9px]' },
  md: { icon: 36, text: 'text-base font-black', sub: 'text-[10px]' },
  lg: { icon: 48, text: 'text-xl font-black',   sub: 'text-xs' },
};

/** WatchFlix Anime Logo Icon with 3D glow ring */
export function LogoIcon({ size = 36, className = '' }: { size?: number; className?: string }) {
  return (
    <div
      className={`relative shrink-0 group-hover:scale-110 transition-transform duration-300 ${className}`}
      style={{ width: `${size}px`, height: `${size}px` }}
    >
      {/* Outer glow ring - Light Red / Rose */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: 'conic-gradient(from 0deg, #ff4d6d, #ff758f, #fb7185, #ff4d6d, #e11d48, #ff4d6d)',
          filter: 'blur(3px)',
          animation: 'logo-spin 4s linear infinite',
          opacity: 0.8,
        }}
      />
      {/* Logo image */}
      <img
        src="/logo.png"
        alt="WatchFlix Anime"
        width={size}
        height={size}
        className="relative z-10 rounded-full object-cover w-full h-full"
        style={{
          boxShadow: '0 0 20px rgba(255,77,109,0.65), 0 0 8px rgba(255,77,109,0.4)',
          border: '2px solid rgba(255,77,109,0.75)',
        }}
      />
    </div>
  );
}

/** WatchFlix Anime Wordmark — premium 3D styled text in Light Red */
function Wordmark({ size }: { size: 'sm' | 'md' | 'lg' }) {
  if (size === 'sm') {
    return (
      <div className="flex flex-col leading-none select-none">
        <div className="flex items-baseline gap-0.5">
          <span
            className="font-black text-white tracking-tight"
            style={{
              fontFamily: "'Outfit', 'Inter', sans-serif",
              fontSize: '0.85rem',
              textShadow: '0 0 12px rgba(255,255,255,0.4)',
            }}
          >
            Watch
          </span>
          <span
            className="font-black tracking-tight"
            style={{
              fontFamily: "'Outfit', 'Inter', sans-serif",
              fontSize: '0.85rem',
              background: 'linear-gradient(135deg, #ffa8b6 0%, #ff6b8b 35%, #ff3366 70%, #e11d48 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              textShadow: 'none',
              filter: 'drop-shadow(0 0 8px rgba(255,77,109,0.65))',
            }}
          >
            Flix
          </span>
        </div>
        <span
          className="font-bold uppercase tracking-widest"
          style={{
            fontFamily: "'Outfit', sans-serif",
            fontSize: '0.55rem',
            background: 'linear-gradient(90deg, #ff758f, #fda4af)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: '0.2em',
          }}
        >
          ANIME
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col leading-none select-none">
      {/* WatchFlix */}
      <div className="flex items-baseline gap-0.5">
        <span
          className="font-black text-white"
          style={{
            fontFamily: "'Outfit', 'Inter', sans-serif",
            fontSize: size === 'lg' ? '1.35rem' : '1.05rem',
            letterSpacing: '-0.02em',
            textShadow: '0 2px 12px rgba(255,255,255,0.25), 0 0 30px rgba(255,255,255,0.1)',
          }}
        >
          Watch
        </span>
        <span
          className="font-black"
          style={{
            fontFamily: "'Outfit', 'Inter', sans-serif",
            fontSize: size === 'lg' ? '1.35rem' : '1.05rem',
            letterSpacing: '-0.02em',
            background: 'linear-gradient(135deg, #ffa8b6 0%, #ff6b8b 35%, #ff3366 70%, #e11d48 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            filter: 'drop-shadow(0 0 10px rgba(255,77,109,0.75))',
          }}
        >
          Flix
        </span>
      </div>
      {/* ANIME subtitle */}
      <div className="flex items-center gap-1 mt-0.5">
        <span className="text-rose-400/80 font-black" style={{ fontSize: '0.55rem' }}>─</span>
        <span
          className="font-black uppercase tracking-[0.25em]"
          style={{
            fontFamily: "'Outfit', sans-serif",
            fontSize: size === 'lg' ? '0.65rem' : '0.55rem',
            background: 'linear-gradient(90deg, #ffa8b6 0%, #ff758f 50%, #fb7185 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            filter: 'drop-shadow(0 0 6px rgba(255,117,143,0.5))',
          }}
        >
          ANIME
        </span>
        <span className="text-rose-400/80 font-black" style={{ fontSize: '0.55rem' }}>─</span>
      </div>
    </div>
  );
}

export function Logo({
  size = 'md',
  showWordmark = true,
  className = '',
}: LogoProps) {
  const s = sizes[size];

  return (
    <Link
      to="/"
      aria-label="WatchFlix Anime Home"
      className={`inline-flex items-center gap-2.5 transition-all duration-300 active:scale-95 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 rounded-xl ${className}`}
    >
      <LogoIcon size={s.icon} />
      {showWordmark && <Wordmark size={size} />}
    </Link>
  );
}

export default Logo;
