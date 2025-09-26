import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useTranslation } from "next-i18next";
import { GetServerSideProps } from "next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { useAuth } from "../context/AuthContext";
import { useProperty } from "../context/PropertyContext";
import FileUpload from "../components/FileUpload";
import DocumentsList from "../components/DocumentsList";
import LanguageSwitcher from "../components/LanguageSwitcher";
import ThemeToggle from "../components/ThemeToggle";
import PropertySelector from "../components/PropertySelector";
import PropertyCreateModal from "../components/PropertyCreateModal";
import PropertyEditModal from "../components/PropertyEditModal";
import SelectedPropertyBox from "../components/SelectedPropertyBox";

export default function Dashboard() {
  const { user, logout, loading } = useAuth();
  const { selectedPropertyId, setSelectedPropertyId, refreshProperties } =
    useProperty();
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editPropertyId, setEditPropertyId] = useState<number | null>(null);
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

  const handlePropertySelect = (propertyId: number | null) => {
    setSelectedPropertyId(propertyId);
    // Trigger refresh to load documents for the selected property
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleCreateProperty = () => {
    setShowCreateModal(true);
  };

  const handlePropertyCreated = () => {
    // Refresh the property selector to show the new property
    refreshProperties();
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleEditProperty = (propertyId: number) => {
    setEditPropertyId(propertyId);
    setShowEditModal(true);
  };

  const handlePropertyUpdated = () => {
    // Refresh both the property selector and selected property box
    refreshProperties();
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
              <DocumentsList
                refreshTrigger={refreshTrigger}
                selectedPropertyId={selectedPropertyId}
              />
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Selected Property Info */}
            <SelectedPropertyBox
              selectedPropertyId={selectedPropertyId}
              onEditProperty={handleEditProperty}
              refreshTrigger={refreshTrigger}
            />

            {/* Property Selector */}
            <PropertySelector
              selectedPropertyId={selectedPropertyId}
              onPropertySelect={handlePropertySelect}
              onCreateProperty={handleCreateProperty}
            />

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

      {/* Property Create Modal */}
      <PropertyCreateModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onPropertyCreated={handlePropertyCreated}
      />

      {/* Property Edit Modal */}
      <PropertyEditModal
        isOpen={showEditModal}
        propertyId={editPropertyId}
        onClose={() => {
          setShowEditModal(false);
          setEditPropertyId(null);
        }}
        onPropertyUpdated={handlePropertyUpdated}
      />
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
