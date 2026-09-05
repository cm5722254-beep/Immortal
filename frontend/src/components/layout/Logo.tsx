import { Link } from 'react-router-dom';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showWordmark?: boolean;
  className?: string;
}

const sizes = {
  sm: { icon: 28, text: 'text-sm',  sub: 'text-[9px]' },
  md: { icon: 34, text: 'text-base font-black', sub: 'text-[10px]' },
  lg: { icon: 44, text: 'text-xl font-black',   sub: 'text-xs' },
};

/** High quality Logo Icon */
export function LogoIcon({ size = 36, className = '' }: { size?: number; className?: string }) {
  return (
    <img
      src="/logo.png"
      alt="ទស្សនារឿង"
      width={size}
      height={size}
      className={`shrink-0 rounded-full object-cover shadow-[0_0_15px_rgba(245,158,11,0.4)] border border-amber-500/30 transition-transform duration-300 group-hover:scale-105 ${className}`}
      style={{ width: `${size}px`, height: `${size}px` }}
    />
  );
}

/** Wordmark — "ទស្សនារឿង" with clean Khmer typography & sleek subtitle */
function Wordmark({ size }: { size: 'sm' | 'md' | 'lg' }) {
  const s = sizes[size];
  return (
    <div className="flex flex-col leading-none select-none">
      <div className={`font-display font-black tracking-normal text-white ${s.text} flex items-center gap-1`}>
        <span className="text-white">ទស្សនា</span>
        <span className="text-amber-400 bg-gradient-to-r from-amber-300 via-amber-400 to-yellow-500 bg-clip-text text-transparent drop-shadow-[0_2px_10px_rgba(245,158,11,0.4)]">
          រឿង
        </span>
      </div>
      <span className={`font-sans tracking-widest text-amber-300/80 font-bold uppercase mt-0.5 ${s.sub}`}>
        DONGHUA & ANIME 4K
      </span>
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
      aria-label="ទស្សនារឿង Home"
      className={`inline-flex items-center gap-2.5 transition-transform active:scale-95 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 rounded-xl ${className}`}
    >
      <LogoIcon size={s.icon} />
      {showWordmark && <Wordmark size={size} />}
    </Link>
  );
}

export default Logo;

