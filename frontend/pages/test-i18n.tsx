import { GetStaticProps } from 'next';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import LanguageSwitcher from '../components/LanguageSwitcher';

export default function TestI18n() {
  const { t } = useTranslation('common');

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        
        {/* Header with Language Switcher */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            {t('appName')} - i18n Test
          </h1>
          <LanguageSwitcher />
        </div>

        {/* Test Translation Display */}
        <div className="bg-white rounded-lg shadow p-6 space-y-6">
          
          <div>
            <h2 className="text-xl font-semibold mb-4">🌍 Internationalization Test</h2>
          </div>

          {/* Navigation Translations */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Navigation</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="bg-gray-50 p-3 rounded">
                <span className="font-medium">Dashboard:</span><br/>
                <span className="text-indigo-600">{t('navigation.dashboard')}</span>
              </div>
              <div className="bg-gray-50 p-3 rounded">
                <span className="font-medium">AI Chat:</span><br/>
                <span className="text-indigo-600">{t('navigation.aiChat')}</span>
              </div>
              <div className="bg-gray-50 p-3 rounded">
                <span className="font-medium">Documents:</span><br/>
                <span className="text-indigo-600">{t('navigation.documents')}</span>
              </div>
              <div className="bg-gray-50 p-3 rounded">
                <span className="font-medium">Settings:</span><br/>
                <span className="text-indigo-600">{t('navigation.settings')}</span>
              </div>
            </div>
          </div>

          {/* Auth Translations */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Authentication</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <div className="bg-gray-50 p-3 rounded">
                <span className="font-medium">Login:</span><br/>
                <span className="text-green-600">{t('auth.login')}</span>
              </div>
              <div className="bg-gray-50 p-3 rounded">
                <span className="font-medium">Register:</span><br/>
                <span className="text-green-600">{t('auth.register')}</span>
              </div>
              <div className="bg-gray-50 p-3 rounded">
                <span className="font-medium">Email:</span><br/>
                <span className="text-green-600">{t('auth.email')}</span>
              </div>
            </div>
          </div>

          {/* Status Translations */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Status Messages</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
              <div className="bg-yellow-50 p-3 rounded">
                <span className="font-medium">Pending:</span><br/>
                <span className="text-yellow-600">{t('status.pending')}</span>
              </div>
              <div className="bg-blue-50 p-3 rounded">
                <span className="font-medium">Processing:</span><br/>
                <span className="text-blue-600">{t('status.processing')}</span>
              </div>
              <div className="bg-green-50 p-3 rounded">
                <span className="font-medium">Completed:</span><br/>
                <span className="text-green-600">{t('status.completed')}</span>
              </div>
              <div className="bg-red-50 p-3 rounded">
                <span className="font-medium">Failed:</span><br/>
                <span className="text-red-600">{t('status.failed')}</span>
              </div>
              <div className="bg-gray-50 p-3 rounded">
                <span className="font-medium">Loading:</span><br/>
                <span className="text-gray-600">{t('status.loading')}</span>
              </div>
            </div>
          </div>

          {/* Test Username with Interpolation */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Dynamic Content</h3>
            <div className="bg-indigo-50 p-4 rounded">
              <span className="text-indigo-800">
                {t('auth.welcome', { username: 'John Doe' })}
              </span>
            </div>
          </div>

        </div>

        {/* Test Links */}
        <div className="mt-8 flex space-x-4">
          <a
            href="/test-i18n"
            className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
          >
            English Version
          </a>
          <a
            href="/fr/test-i18n"
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            Version Française
          </a>
        </div>
      </div>
    </div>
  );
}

export const getStaticProps: GetStaticProps = async ({ locale }) => {
  return {
    props: {
      ...(await serverSideTranslations(locale ?? 'en', ['common'])),
    },
  };
};