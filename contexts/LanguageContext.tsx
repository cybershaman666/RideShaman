import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';

// Define the shape of the context
interface LanguageContextType {
  language: string;
  changeLanguage: (lang: string) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

// Create the context with a default value
const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Define available languages
const availableLanguages = ['cs', 'en', 'de'];

// Provider component that wraps the app
export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<string>(() => {
    const savedLang = localStorage.getItem('app-language');
    return savedLang && availableLanguages.includes(savedLang) ? savedLang : 'cs';
  });

  const [translations, setTranslations] = useState<Record<string, any>>({});

  useEffect(() => {
    const loadTranslations = async () => {
      try {
        const response = await fetch(`/locales/${language}.json`);
        if (!response.ok) {
            // Fallback to English if the language file is not found
            console.error(`Could not load ${language}.json, falling back to en.json`);
            const fallbackResponse = await fetch(`/locales/en.json`);
            const fallbackData = await fallbackResponse.json();
            setTranslations(fallbackData);
            return;
        }
        const data = await response.json();
        setTranslations(data);
      } catch (error) {
        console.error('Failed to load translations:', error);
      }
    };

    loadTranslations();
  }, [language]);

  const changeLanguage = (lang: string) => {
    if (availableLanguages.includes(lang)) {
      setLanguage(lang);
      localStorage.setItem('app-language', lang);
    }
  };

  const t = useCallback((key: string, params?: Record<string, string | number>): string => {
    const keys = key.split('.');
    let result = keys.reduce((acc, currentKey) => {
      return acc && acc[currentKey] !== undefined ? acc[currentKey] : undefined;
    }, translations);

    if (result === undefined) {
      console.warn(`Translation key not found: "${key}"`);
      return key; // Return the key itself as a fallback
    }

    if (params) {
      Object.keys(params).forEach(paramKey => {
        result = result.replace(`{${paramKey}}`, String(params[paramKey]));
      });
    }

    return result;
  }, [translations]);

  return (
    <LanguageContext.Provider value={{ language, changeLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

// Custom hook to use the language context
export const useTranslation = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  return context;
};
