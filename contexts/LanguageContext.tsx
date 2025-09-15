import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { LoadingSpinner } from '../components/LoadingSpinner';

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
  const [isLoading, setIsLoading] = useState(true);

  // Fix: Define the changeLanguage function that was missing.
  const changeLanguage = useCallback((lang: string) => {
    if (availableLanguages.includes(lang)) {
      setLanguage(lang);
      localStorage.setItem('app-language', lang);
    }
  }, []);

  useEffect(() => {
    const loadTranslations = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/locales/${language}.json`);
        if (!response.ok) {
            console.error(`Could not load ${language}.json, falling back to en.json`);
            const fallbackResponse = await fetch(`/locales/en.json`);
            const fallbackData = await fallbackResponse.json();
            setTranslations(fallbackData);
        } else {
            const data = await response.json();
            setTranslations(data);
        }
      } catch (error) {
        console.error('Failed to load translations:', error);
        // Attempt to load English as a last-resort fallback
         try {
            const fallbackResponse = await fetch(`/locales/en.json`);
            const fallbackData = await fallbackResponse.json();
            setTranslations(fallbackData);
        } catch (e) {
            setTranslations({}); // Final fallback to avoid crash
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadTranslations();
  }, [language]);

  const t = useCallback((key: string, params?: Record<string, string | number>): string => {
    const keys = key.split('.');
    let result = keys.reduce((acc, currentKey) => {
      return acc && acc[currentKey] !== undefined ? acc[currentKey] : undefined;
    }, translations);

    if (result === undefined) {
      console.warn(`Translation key not found: "${key}"`);
      return key; // Return the key itself as a fallback
    }

    if (params && typeof result === 'string') {
      Object.keys(params).forEach(paramKey => {
        result = result.replace(`{${paramKey}}`, String(params[paramKey]));
      });
    }

    return result;
  }, [translations]);
  
  if (isLoading) {
      return (
          <div className="flex items-center justify-center h-screen w-screen bg-slate-900">
              <LoadingSpinner text="Loading application..." />
          </div>
      );
  }

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
