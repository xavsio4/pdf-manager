import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useTranslation } from "next-i18next";
import { GetServerSideProps } from "next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { useAuth } from "../context/AuthContext";
import LanguageSwitcher from "../components/LanguageSwitcher";
import ThemeToggle from "../components/ThemeToggle";

export default function Account() {
  const { user, logout, loading } = useAuth();
  const router = useRouter();
  const { t } = useTranslation(["common", "dashboard"]);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

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

  const handleBackToDashboard = () => {
    router.push("/dashboard");
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
                  className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 px-3 py-2 rounded-md text-sm font-medium">
                  {t("common:navigation.dashboard")}
                </a>
                <a
                  href="/chat"
                  className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 px-3 py-2 rounded-md text-sm font-medium">
                  {t("common:navigation.aiChat")}
                </a>
                <a
                  href="/account"
                  className="bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 px-3 py-2 rounded-md text-sm font-medium">
                  {t("common:navigation.account")}
                </a>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <ThemeToggle />
              <LanguageSwitcher />
              <a
                href="/account"
                className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-medium">
                {t("common:auth.welcome", { username: user.username })}
              </a>
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
      <main className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <button
            onClick={handleBackToDashboard}
            className="flex items-center text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 text-sm font-medium">
            <svg
              className="w-4 h-4 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            {t("common:navigation.backToDashboard")}
          </button>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {t("dashboard:accountInformation")}
            </h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              {t("dashboard:accountDescription")}
            </p>
          </div>

          <div className="px-6 py-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Basic Information */}
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t("common:auth.email")}
                  </label>
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-md px-3 py-2">
                    <p className="text-sm text-gray-900 dark:text-gray-100">
                      {user.email}
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t("common:auth.username")}
                  </label>
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-md px-3 py-2">
                    <p className="text-sm text-gray-900 dark:text-gray-100">
                      {user.username}
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t("common:status.status")}
                  </label>
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-md px-3 py-2">
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
                      {user.is_active
                        ? t("common:status.active")
                        : t("common:status.inactive")}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t("dashboard:account.userId")}
                  </label>
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-md px-3 py-2">
                    <p className="text-sm text-gray-900 dark:text-gray-100 font-mono">
                      #{user.id}
                    </p>
                  </div>
                </div>
              </div>

              {/* Account Actions */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                    {t("dashboard:account.actions")}
                  </h3>
                  <div className="space-y-3">
                    <button className="w-full text-left px-4 py-3 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-md transition-colors">
                      <div className="flex items-center">
                        <svg
                          className="w-5 h-5 text-gray-400 mr-3"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                          />
                        </svg>
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {t("dashboard:account.editProfile")}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {t("dashboard:account.editProfileDesc")}
                          </p>
                        </div>
                      </div>
                    </button>

                    <button className="w-full text-left px-4 py-3 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-md transition-colors">
                      <div className="flex items-center">
                        <svg
                          className="w-5 h-5 text-gray-400 mr-3"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                          />
                        </svg>
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {t("dashboard:account.changePassword")}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {t("dashboard:account.changePasswordDesc")}
                          </p>
                        </div>
                      </div>
                    </button>

                    <button className="w-full text-left px-4 py-3 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-md transition-colors">
                      <div className="flex items-center">
                        <svg
                          className="w-5 h-5 text-gray-400 mr-3"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                        </svg>
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {t("dashboard:account.preferences")}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {t("dashboard:account.preferencesDesc")}
                          </p>
                        </div>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Danger Zone */}
                <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                  <h3 className="text-lg font-medium text-red-600 dark:text-red-400 mb-4">
                    {t("dashboard:account.dangerZone")}
                  </h3>
                  <button className="w-full text-left px-4 py-3 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-md transition-colors">
                    <div className="flex items-center">
                      <svg
                        className="w-5 h-5 text-red-500 mr-3"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                      <div>
                        <p className="text-sm font-medium text-red-600 dark:text-red-400">
                          {t("dashboard:account.deleteAccount")}
                        </p>
                        <p className="text-xs text-red-500 dark:text-red-400">
                          {t("dashboard:account.deleteAccountDesc")}
                        </p>
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

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
