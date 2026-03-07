'use client';

import React, { createContext, useState, useEffect, useMemo, useCallback } from 'react';
import en from '@/locales/en.json';
import zh from '@/locales/zh.json';
import th from '@/locales/th.json';

export type Language = 'en' | 'zh' | 'th';

type Translations = { [key: string]: string | Translations };

const translations: { [key in Language]: Translations } = { en, zh, th };

interface LanguageContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: string) => string;
}

export const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('zh'); // Default to Chinese

  useEffect(() => {
    const storedLang = localStorage.getItem('language') as Language | null;
    if (storedLang && ['en', 'zh', 'th'].includes(storedLang)) {
      setLanguageState(storedLang);
    } else {
      // If no language is set, default to Chinese.
      setLanguageState('zh');
      localStorage.setItem('language', 'zh');
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('language', lang);
  };
  
  const t = useCallback((key: string): string => {
    const keys = key.split('.');
    let result: string | Translations | undefined = translations[language];
    for (const k of keys) {
        if (result && typeof result === 'object' && k in result) {
            result = result[k];
        } else {
            // Fallback to English if key not found
            result = translations['en'];
            for (const fk of keys) {
                 if (result && typeof result === 'object' && fk in result) {
                    result = result[fk];
                 } else {
                    return key; // Return the key itself if not found even in fallback
                 }
            }
            break;
        }
    }
    return typeof result === 'string' ? result : key;
  }, [language]);


  const value = useMemo(() => ({
    language,
    setLanguage,
    t,
  }), [language, t]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}
