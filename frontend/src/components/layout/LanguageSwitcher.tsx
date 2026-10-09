import { useState } from 'react';
import { Globe } from 'lucide-react';
import { useLanguageStore } from '../../store/languageStore';

export function LanguageSwitcher({
  onLanguageChange,
  className = ''
}: {
  onLanguageChange: (language: string) => void;
  className?: string;
}) {
  const { language, languages } = useLanguageStore((state) => ({
    language: state.language,
    languages: state.languages
  }));
  const [isOpen, setIsOpen] = useState(false);

  // Handle language change
  const handleLanguageSelect = (selectedLanguage: string) => {
    setIsOpen(false);
    onLanguageChange(selectedLanguage);
  };

  // Handle toggle
  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  // Close when clicking outside
  // useEffect(() => {
  //   const handleClickOutside = (event: MouseEvent) => {
  //     if (isOpen && event.target instanceof HTMLElement) {
  //       // Check if click is outside language switcher
  //       const switcherElement = document.getElementById('language-switcher');
  //       if (!switcherElement?.contains(event.target as Node)) {
  //         setIsOpen(false);
  //       }
  //     }
  //   };
  //
  //   document.addEventListener('mousedown', handleClickOutside);
  //   return () => document.removeEventListener('mousedown', handleClickOutside);
  // }, [isOpen]);

  return (
    <div className={`${className} relative`} id="language-switcher">
      <button
        onClick={handleToggle}
        className="relative flex items-center space-x-2 p-2 rounded-full hover:bg-white/20 transition-colors duration-200"
        aria-label="Language switcher"
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        {/* Current Language Indicator */}
        <div className="w-4 h-4 flex items-center justify-center">
          {/* Would show language flag or code */}
          <span className="text-text-xs font-medium">{language.toUpperCase()}</span>
        </div>

        {/* Dropdown Indicator */}
        <div className="w-4 h-4 flex items-center justify-center">
          <span className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>
            {/* Would use chevron-down icon */}
          </span>
        </div>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-32 origin-top-right bg-bg-card rounded-lg shadow-xl border border-border-subtle z-[[var(--animekh-z-index-popover)]]">
          {/* Menu Arrow */}
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-bg-card rotate-45 border-t border-r border-border-subtle" />

          {/* Language Options */}
          <div className="py-1 space-y-1">
            {languages.map((lang, index) => (
              <div
                key={lang}
                className="border-t border-border-subtle first:border-t-0"
              >
                <button
                  onClick={() => handleLanguageSelect(lang)}
                  className={`flex items-center w-full px-3 py-2 text-left
                         ${language === lang ? 'bg-accent-primary/20 text-accent-primary font-medium' :
                           'hover:bg-accent-primary/10 hover:text-text-primary'}`}
                >
                  {/* Language Flag/Code */}
                  <div className="w-4 h-4 flex items-center justify-center mr-2">
                    <span className="text-text-xs font-medium">{lang.toUpperCase()}</span>
                  </div>

                  {/* Language Name */}
                  <span className="flex-1 text-text-sm">
                    {/* Would show full language name in a real app */}
                    {lang === 'en' && 'English'}
                    {lang === 'km' && 'ខ្មែរ (Khmer)'}
                    {lang === 'th' && 'ภาษาไทย (Thai)'}
                    {lang === 'vi' && 'Tiếng Việt (Vietnamese)'}
                    {lang === 'ja' && '日本語 (Japanese)'}
                    {lang === 'ko' && '한국어 (Korean)'}
                    {lang === 'zh' && '中文 (Chinese)'}
                    {/* Default fallback */}
                    {['en', 'km', 'th', 'vi', 'ja', 'ko', 'zh'].indexOf(lang) === -1 && lang.toUpperCase()}
                  </span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}