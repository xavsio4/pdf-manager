import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';

const BANNER_DISMISSED_KEY = 'language-banner-dismissed';

const languageNames: Record<string, { native: string; english: string; flag: string }> = {
  en: { native: 'English', english: 'English', flag: '🇺🇸' },
  fr: { native: 'Français', english: 'French', flag: '🇫🇷' },
  es: { native: 'Español', english: 'Spanish', flag: '🇪🇸' },
  de: { native: 'Deutsch', english: 'German', flag: '🇩🇪' },
};

export default function LanguageBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const [detectedLanguage, setDetectedLanguage] = useState<string | null>(null);
  const router = useRouter();
  const { t } = useTranslation('common');

  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return;

    // Check if banner was already dismissed
    const dismissed = localStorage.getItem(BANNER_DISMISSED_KEY);
    if (dismissed) return;

    // Detect browser language
    const browserLanguages = navigator.languages || [navigator.language];
    const supportedLocales = ['en', 'fr', 'es', 'de'];
    
    let preferredLang: string | null = null;
    
    for (const browserLang of browserLanguages) {
      const mainLangCode = browserLang.toLowerCase().split('-')[0];
      
      // Check if we support this language and it's different from current
      if (supportedLocales.includes(mainLangCode) && mainLangCode !== router.locale) {
        preferredLang = mainLangCode;
        break;
      }
    }

    if (preferredLang) {
      setDetectedLanguage(preferredLang);
      setShowBanner(true);
    }
  }, [router.locale]);

  const switchToLanguage = async (locale: string) => {
    await router.push(router.asPath, router.asPath, { locale });
    dismissBanner();
  };

  const dismissBanner = () => {
    setShowBanner(false);
    localStorage.setItem(BANNER_DISMISSED_KEY, 'true');
  };

  if (!showBanner || !detectedLanguage) return null;

  const detectedLangInfo = languageNames[detectedLanguage];
  const currentLangInfo = languageNames[router.locale || 'en'];

  return (
    <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <div className="text-lg">{detectedLangInfo.flag}</div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">
                🌍 We detected your browser language is {detectedLangInfo.native}
              </p>
              <p className="text-xs text-blue-100">
                You're currently viewing in {currentLangInfo.native}. Would you like to switch?
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => switchToLanguage(detectedLanguage)}
              className="bg-white bg-opacity-20 hover:bg-opacity-30 text-white px-3 py-1 rounded-md text-sm font-medium transition-colors"
            >
              Switch to {detectedLangInfo.native}
            </button>
            <button
              onClick={dismissBanner}
              className="text-blue-100 hover:text-white p-1 rounded-md transition-colors"
              aria-label="Dismiss"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}