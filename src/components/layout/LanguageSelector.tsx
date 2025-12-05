import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlobeAltIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import { useLanguageStore, Language } from '../../store/languageStore';
import { useAuthStore } from '../../store/authStore';
import { useTranslation } from 'react-i18next';

interface LanguageOption {
  code: Language;
  name: string;
  flag: string;
}

const languages: LanguageOption[] = [
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'en', name: 'English', flag: '🇺🇸' },
];

export function LanguageSelector() {
  const { t } = useTranslation();
  const { language, setLanguage } = useLanguageStore();
  const { isAuthenticated, updatePreferredLanguage } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentLanguage = languages.find((l) => l.code === language) || languages[0];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLanguageChange = async (lang: Language) => {
    setIsOpen(false);

    // If authenticated, persist to backend (which also updates local state)
    if (isAuthenticated) {
      try {
        await updatePreferredLanguage(lang);
      } catch {
        // Fallback to local-only change if backend fails
        setLanguage(lang);
      }
    } else {
      // Not authenticated, just update locally
      setLanguage(lang);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="flex items-center gap-2 px-3 py-2 rounded-xl
                   bg-gray-50 hover:bg-gray-100 transition-all duration-200
                   border border-gray-200/50 text-gray-600 hover:text-gray-800"
        title={t('common:language.select')}
      >
        <GlobeAltIcon className="h-4 w-4" />
        <span className="text-sm font-medium hidden sm:inline">
          {currentLanguage.flag} {currentLanguage.code.toUpperCase()}
        </span>
        <span className="text-sm font-medium sm:hidden">
          {currentLanguage.flag}
        </span>
        <ChevronDownIcon
          className={`h-3 w-3 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-40 rounded-xl bg-white
                       shadow-lg shadow-gray-200/50 border border-gray-100
                       overflow-hidden z-50"
          >
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => handleLanguageChange(lang.code)}
                className={`w-full px-4 py-2.5 text-left text-sm flex items-center gap-3
                           transition-colors duration-150
                           ${
                             language === lang.code
                               ? 'bg-indigo-50 text-indigo-700 font-medium'
                               : 'text-gray-700 hover:bg-gray-50'
                           }`}
              >
                <span className="text-base">{lang.flag}</span>
                <span>{lang.name}</span>
                {language === lang.code && (
                  <motion.div
                    layoutId="activeLanguage"
                    className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-500"
                  />
                )}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
