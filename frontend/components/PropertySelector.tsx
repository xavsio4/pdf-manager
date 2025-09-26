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

interface PropertySelectorProps {
  selectedPropertyId?: number | null;
  onPropertySelect: (propertyId: number | null) => void;
  onCreateProperty: () => void;
}

export default function PropertySelector({
  selectedPropertyId,
  onPropertySelect,
  onCreateProperty,
}: PropertySelectorProps) {
  const { t } = useTranslation(["common", "dashboard"]);
  const { properties, loading, error } = useProperty();

  const formatPropertyAddress = (property: Property) => {
    const parts = [
      property.street_address,
      property.city,
      property.zip_code,
      property.country,
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(", ") : null;
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {t("dashboard:properties.title")}
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
          {t("dashboard:properties.title")}
        </h3>
        <div className="text-red-600 dark:text-red-400 text-sm">
          {t("common:errors.loadingFailed")}: {error}
        </div>
      </div>
    );
  }

  // Show max 3 properties as requested
  const displayProperties = properties.slice(0, 3);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          {t("dashboard:properties.title")}
        </h3>
        <button
          onClick={onCreateProperty}
          className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 text-sm font-medium">
          + {t("dashboard:properties.create")}
        </button>
      </div>

      {displayProperties.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-gray-500 dark:text-gray-400 mb-4">
            {t("dashboard:properties.noProperties")}
          </div>
          <button
            onClick={onCreateProperty}
            className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
            {t("dashboard:properties.createFirst")}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {/* All Properties option */}
          <div
            onClick={() => onPropertySelect(null)}
            className={`cursor-pointer p-3 rounded-lg border transition-colors ${
              selectedPropertyId === null
                ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20"
                : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
            }`}>
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white">
                  {t("dashboard:properties.allProperties")}
                </h4>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t("dashboard:properties.viewAll")}
                </p>
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {properties.reduce((sum, p) => sum + p.document_count, 0)}{" "}
                {t("dashboard:properties.documents")}
              </div>
            </div>
          </div>

          {/* Individual Properties */}
          {displayProperties.map((property) => (
            <div
              key={property.id}
              onClick={() => onPropertySelect(property.id)}
              className={`cursor-pointer p-3 rounded-lg border transition-colors ${
                selectedPropertyId === property.id
                  ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20"
                  : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
              }`}>
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-gray-900 dark:text-white truncate">
                    {property.name}
                  </h4>
                  {formatPropertyAddress(property) && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                      {formatPropertyAddress(property)}
                    </p>
                  )}
                  {property.description && (
                    <p className="text-xs text-gray-400 dark:text-gray-500 truncate mt-1">
                      {property.description}
                    </p>
                  )}
                </div>
                <div className="ml-3 text-sm text-gray-500 dark:text-gray-400">
                  {property.document_count}{" "}
                  {property.document_count === 1
                    ? t("dashboard:properties.document")
                    : t("dashboard:properties.documents")}
                </div>
              </div>
            </div>
          ))}

          {properties.length > 3 && (
            <div className="text-center pt-2">
              <button
                onClick={() => {
                  // TODO: Open properties management modal
                  console.log("Show all properties");
                }}
                className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 text-sm font-medium">
                {t("dashboard:properties.viewMore", {
                  count: properties.length - 3,
                })}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
