import React, { createContext, useContext, useEffect, useState } from 'react';
import i18n from './i18n';

interface LanguageContextType {
  currentLanguage: string;
  changeLanguage: (lang: string) => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [currentLanguage, setCurrentLanguage] = useState<string>(() => {
    // Initialize with saved language or default
    return localStorage.getItem('language') || i18n.language || 'en';
  });

  useEffect(() => {
    // Listen for i18n language changes
    const handleLanguageChange = (lng: string) => {
      setCurrentLanguage(lng);
      localStorage.setItem('language', lng);
    };

    i18n.on('languageChanged', handleLanguageChange);

    return () => {
      i18n.off('languageChanged', handleLanguageChange);
    };
  }, []);

  const changeLanguage = (lang: string) => {
    if (['en', 'hi', 'mr'].includes(lang)) {
      i18n.changeLanguage(lang);
      setCurrentLanguage(lang);
      localStorage.setItem('language', lang);
    }
  };

  return (
    <LanguageContext.Provider value={{ currentLanguage, changeLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
}
