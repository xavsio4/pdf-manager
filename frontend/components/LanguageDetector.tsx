import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

interface LanguageDetectorProps {
  children: React.ReactNode;
}

const SUPPORTED_LOCALES = ['en', 'fr', 'es', 'de'];
const LOCALE_STORAGE_KEY = 'preferred-locale';

export default function LanguageDetector({ children }: LanguageDetectorProps) {
  const [isDetecting, setIsDetecting] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const detectAndSetLanguage = async () => {
      try {
        // Skip detection if user is already on a specific locale
        if (router.locale && router.locale !== router.defaultLocale) {
          setIsDetecting(false);
          return;
        }

        // Skip detection if user has manually selected a language before
        const storedLocale = localStorage.getItem(LOCALE_STORAGE_KEY);
        if (storedLocale && SUPPORTED_LOCALES.includes(storedLocale)) {
          if (router.locale !== storedLocale) {
            await router.push(router.asPath, router.asPath, { locale: storedLocale });
            return;
          }
        }

        // Detect browser language
        const detectedLocale = detectBrowserLanguage();
        
        // Store the detected/default locale for future visits
        localStorage.setItem(LOCALE_STORAGE_KEY, detectedLocale);

        // Redirect if detected language is different from current
        if (router.locale !== detectedLocale && detectedLocale !== 'en') {
          await router.push(router.asPath, router.asPath, { locale: detectedLocale });
          return;
        }

      } catch (error) {
        console.warn('Language detection error:', error);
      } finally {
        setIsDetecting(false);
      }
    };

    // Only run detection on client side
    if (typeof window !== 'undefined') {
      detectAndSetLanguage();
    } else {
      setIsDetecting(false);
    }
  }, [router]);

  // Track language changes and store preference
  useEffect(() => {
    if (router.locale && typeof window !== 'undefined') {
      localStorage.setItem(LOCALE_STORAGE_KEY, router.locale);
    }
  }, [router.locale]);

  const detectBrowserLanguage = (): string => {
    if (typeof window === 'undefined') return 'en';

    // Get browser languages in order of preference
    const browserLanguages = navigator.languages || [navigator.language];
    
    console.log('🌍 Browser languages detected:', browserLanguages);

    // Check each browser language against supported locales
    for (const browserLang of browserLanguages) {
      // Extract main language code (e.g., 'fr-CA' -> 'fr')
      const mainLangCode = browserLang.toLowerCase().split('-')[0];
      
      // Check for exact match first
      if (SUPPORTED_LOCALES.includes(browserLang.toLowerCase())) {
        console.log('✅ Exact language match found:', browserLang);
        return browserLang.toLowerCase();
      }
      
      // Check for main language code match
      if (SUPPORTED_LOCALES.includes(mainLangCode)) {
        console.log('✅ Main language match found:', mainLangCode, 'from', browserLang);
        return mainLangCode;
      }
    }

    console.log('ℹ️ No supported language found, defaulting to English');
    return 'en';
  };

  // Show loading state during detection
  if (isDetecting) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Detecting language...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

// Utility function to get user's stored language preference
export const getUserLanguagePreference = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(LOCALE_STORAGE_KEY);
};

// Utility function to set user's language preference
export const setUserLanguagePreference = (locale: string): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LOCALE_STORAGE_KEY, locale);
};