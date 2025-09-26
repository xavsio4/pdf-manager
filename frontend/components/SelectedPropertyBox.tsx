import { useEffect, useState } from "react";
import { useTranslation } from "next-i18next";
import { useAuth } from "../context/AuthContext";
import { useProperty } from "../context/PropertyContext";

interface Property {
  id: number;
  name: string;
  country?: string;
  street_address?: string;
  city?: string;
  zip_code?: string;
  description?: string;
  document_count: number;
}

interface SelectedPropertyBoxProps {
  selectedPropertyId: number | null;
  onEditProperty?: (propertyId: number) => void;
  refreshTrigger?: number;
}

export default function SelectedPropertyBox({
  selectedPropertyId,
  onEditProperty,
  refreshTrigger,
}: SelectedPropertyBoxProps) {
  const { t } = useTranslation(["common", "dashboard"]);
  const { selectedProperty, loading, error } = useProperty();

  const formatPropertyAddress = (property: Property) => {
    const parts = [
      property.street_address,
      property.city,
      property.zip_code,
      property.country,
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(", ") : null;
  };

  const handleEditClick = () => {
    if (selectedProperty && onEditProperty) {
      onEditProperty(selectedProperty.id);
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {t("dashboard:selectedProperty.title")}
        </h3>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
          <span className="ml-2 text-gray-600 dark:text-gray-400">
            {t("common:status.loading")}
          </span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {t("dashboard:selectedProperty.title")}
        </h3>
        <div className="text-red-600 dark:text-red-400 text-sm">
          {t("common:errors.loadingFailed")}: {error}
        </div>
      </div>
    );
  }

  if (!selectedPropertyId || !selectedProperty) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {t("dashboard:selectedProperty.title")}
        </h3>
        <div className="text-center py-8">
          <div className="text-gray-500 dark:text-gray-400 mb-2">
            {t("dashboard:selectedProperty.noPropertySelected")}
          </div>
          <p className="text-sm text-gray-400 dark:text-gray-500">
            {t("dashboard:selectedProperty.selectPropertyDesc")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          {t("dashboard:selectedProperty.title")}
        </h3>
        {onEditProperty && (
          <button
            onClick={handleEditClick}
            className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 text-sm font-medium flex items-center">
            <svg
              className="w-4 h-4 mr-1"
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
            {t("dashboard:selectedProperty.editProperty")}
          </button>
        )}
      </div>

      <div className="space-y-4">
        <div>
          <h4 className="font-medium text-gray-900 dark:text-white text-base">
            {selectedProperty.name}
          </h4>
        </div>

        {formatPropertyAddress(selectedProperty) && (
          <div>
            <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
              {t("dashboard:selectedProperty.address")}
            </label>
            <p className="text-sm text-gray-900 dark:text-gray-100 mt-1">
              {formatPropertyAddress(selectedProperty)}
            </p>
          </div>
        )}

        {selectedProperty.description && (
          <div>
            <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
              {t("dashboard:selectedProperty.description")}
            </label>
            <p className="text-sm text-gray-900 dark:text-gray-100 mt-1">
              {selectedProperty.description}
            </p>
          </div>
        )}

        <div>
          <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
            {t("dashboard:selectedProperty.documentCount")}
          </label>
          <p className="text-sm text-gray-900 dark:text-gray-100 mt-1">
            {selectedProperty.document_count}{" "}
            {selectedProperty.document_count === 1
              ? t("dashboard:properties.document")
              : t("dashboard:properties.documents")}
          </p>
        </div>
      </div>
    </div>
  );
}
