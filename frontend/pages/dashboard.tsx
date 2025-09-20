import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useTranslation } from "next-i18next";
import { GetServerSideProps } from "next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { useAuth } from "../context/AuthContext";
import FileUpload from "../components/FileUpload";
import DocumentsList from "../components/DocumentsList";
import LanguageSwitcher from "../components/LanguageSwitcher";
import ThemeToggle from "../components/ThemeToggle";

export default function Dashboard() {
  const { user, logout, loading } = useAuth();
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const router = useRouter();
  const { t } = useTranslation(["common", "dashboard"]);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  const handleUploadSuccess = () => {
    // Trigger a refresh of the documents list
    setRefreshTrigger((prev) => prev + 1);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          <span className="text-gray-600 dark:text-gray-400">
            {t("common:status.loading")}
          </span>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect to login
  }

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Navigation */}
      <nav className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-8">
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                {t("common:appName")}
              </h1>
              <div className="hidden md:flex space-x-8">
                <a
                  href="/dashboard"
                  className="bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 px-3 py-2 rounded-md text-sm font-medium">
                  {t("common:navigation.dashboard")}
                </a>
                <a
                  href="/chat"
                  className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 px-3 py-2 rounded-md text-sm font-medium">
                  {t("common:navigation.aiChat")}
                </a>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <ThemeToggle />
              <LanguageSwitcher />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {t("common:auth.welcome", { username: user.username })}
              </span>
              <button
                onClick={handleLogout}
                className="bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500">
                {t("common:auth.logout")}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Upload Section */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                {t("dashboard:uploadDocuments")}
              </h2>
              <FileUpload onUploadSuccess={handleUploadSuccess} />
            </div>

            {/* Documents List */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <DocumentsList refreshTrigger={refreshTrigger} />
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Account Info */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                {t("dashboard:accountInformation")}
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    {t("common:auth.email")}
                  </label>
                  <p className="text-sm text-gray-900 dark:text-gray-100">
                    {user.email}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    {t("common:auth.username")}
                  </label>
                  <p className="text-sm text-gray-900 dark:text-gray-100">
                    {user.username}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    {t("common:status.status")}
                  </label>
                  <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
                    {user.is_active
                      ? t("common:status.active")
                      : t("common:status.inactive")}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                {t("dashboard:quickStats")}
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {t("dashboard:stats.documents")}
                  </span>
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {t("common:status.loading")}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {t("dashboard:stats.processing")}
                  </span>
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    -
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {t("dashboard:stats.completed")}
                  </span>
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    -
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                {t("dashboard:quickActions")}
              </h3>
              <div className="space-y-2">
                <button className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors">
                  {t("dashboard:quickActionButtons.searchDocuments")}
                </button>
                <a
                  href="/chat"
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors block">
                  {t("dashboard:quickActionButtons.aiChat")}
                </a>
                <button className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors">
                  {t("dashboard:quickActionButtons.viewAnalytics")}
                </button>
                <button className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors">
                  {t("dashboard:quickActionButtons.settings")}
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// Add this for server-side translation loading
export const getServerSideProps: GetServerSideProps = async ({ locale }) => {
  return {
    props: {
      ...(await serverSideTranslations(locale ?? "en", [
        "common",
        "dashboard",
      ])),
    },
  };
};
