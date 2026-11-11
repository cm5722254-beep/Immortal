import { Sun, Moon } from 'lucide-react';
import { useThemeStore } from '../../store/themeStore';
import { useLanguageStore } from '../../store/languageStore';
import { triggerHaptic } from '../../utils/telegram';

interface ThemeToggleProps {
  compact?: boolean;
  className?: string;
}

export function ThemeToggle({ compact = false, className = '' }: ThemeToggleProps) {
  const { activeThemeId, toggleWhiteGrey } = useThemeStore();
  const language = useLanguageStore((s) => s.language);
  const isGrey = activeThemeId === 'cosmic-grey';

  const handleClick = () => {
    triggerHaptic('light');
    toggleWhiteGrey();
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`theme-toggle-btn inline-flex items-center gap-1.5 rounded-full border border-border-subtle bg-bg-card-subtle hover:bg-bg-card text-text-primary px-2.5 py-1.5 text-xs font-bold shadow-2xs transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer shrink-0 ${className}`}
      title={
        isGrey
          ? (language === 'km' ? 'ប្តូរទៅពណ៌សស្អាត' : 'Switch to Snow White theme')
          : (language === 'km' ? 'ប្តូរទៅពណ៌ប្រផេះស្អាត' : 'Switch to Space Grey theme')
      }
      aria-label={isGrey ? 'Switch to White theme' : 'Switch to Grey theme'}
    >
      <span
        className={`w-5 h-5 rounded-full flex items-center justify-center transition-colors ${
          isGrey
            ? 'bg-slate-600 text-sky-300'
            : 'bg-blue-100 text-amber-500'
        }`}
      >
        {isGrey ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
      </span>
      {!compact && (
        <span className="hidden sm:inline whitespace-nowrap">
          {isGrey
            ? (language === 'km' ? 'ប្រផេះ' : 'Grey')
            : (language === 'km' ? 'ពណ៌ស' : 'White')}
        </span>
      )}
    </button>
  );
}

