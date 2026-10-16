import { useState } from 'react';
import { Globe, ChevronDown } from 'lucide-react';
import { useLanguageStore, type AppLanguage } from '../../store/languageStore';

const supportedLanguages: { code: AppLanguage; label: string }[] = [
  { code: 'km', label: 'ខ្មែរ (Khmer)' },
  { code: 'en', label: 'English' },
];

export function LanguageSwitcher({
  onLanguageChange,
  className = ''
}: {
  onLanguageChange?: (language: AppLanguage) => void;
  className?: string;
}) {
  const { language, setLanguage } = useLanguageStore();
  const [isOpen, setIsOpen] = useState(false);

  const handleLanguageSelect = (selectedLanguage: AppLanguage) => {
    setIsOpen(false);
    setLanguage(selectedLanguage);
    if (onLanguageChange) {
      onLanguageChange(selectedLanguage);
    }
  };

  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div className={`${className} relative`} id="language-switcher">
      <button
        onClick={handleToggle}
        className="relative flex items-center space-x-1.5 p-2 rounded-full hover:bg-white/10 transition-colors duration-200 text-text-secondary hover:text-text-primary"
        aria-label="Language switcher"
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <Globe className="w-4 h-4" />
        <span className="text-xs font-semibold uppercase">{language}</span>
        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-36 origin-top-right bg-bg-card rounded-lg shadow-xl border border-border-subtle z-[999] py-1">
          {supportedLanguages.map((item) => (
            <button
              key={item.code}
              onClick={() => handleLanguageSelect(item.code)}
              className={`flex items-center w-full px-3 py-2 text-left text-xs transition-colors
                     ${language === item.code ? 'bg-accent-primary/20 text-accent-primary font-bold' :
                       'hover:bg-accent-primary/10 text-text-secondary hover:text-text-primary'}`}
            >
              <span className="w-6 font-bold uppercase">{item.code}</span>
              <span className="flex-1">{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}