"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import en from './locales/en';
import type { TranslationKey } from './locales/en';
import ar from './locales/ar';
import es from './locales/es';
import fr from './locales/fr';
import zh from './locales/zh';
import de from './locales/de';
import ru from './locales/ru';
import ku from './locales/ku';

type Language = 'en' | 'ar' | 'es' | 'fr' | 'zh' | 'de' | 'ru' | 'ku';

const translationsMap: Record<Language, typeof en> = {
  en,
  ar,
  es,
  fr,
  zh,
  de,
  ru,
  ku,
};

function getInitialLanguage(): Language {
  if (typeof window !== 'undefined') {
    const savedLang = localStorage.getItem('app_language') as Language;
    if (savedLang && Object.keys(translationsMap).includes(savedLang)) {
      return savedLang;
    }
  }
  return 'en';
}

type LanguageContextType = {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  dir: 'ltr' | 'rtl';
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(getInitialLanguage);

  useEffect(() => {
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
    localStorage.setItem('app_language', language);
  }, [language]);

  const t = (key: string) => {
    const dict = translationsMap[language];
    return key in dict ? dict[key as TranslationKey] : key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, dir: language === 'ar' ? 'rtl' : 'ltr' }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
