import { useState, useEffect } from "react";
import { useTranslation } from "next-i18next";

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

interface PropertyEditModalProps {
  isOpen: boolean;
  propertyId: number | null;
  onClose: () => void;
  onPropertyUpdated: () => void;
}

export default function PropertyEditModal({
  isOpen,
  propertyId,
  onClose,
  onPropertyUpdated,
}: PropertyEditModalProps) {
  const [property, setProperty] = useState<Property | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    street_address: "",
    city: "",
    zip_code: "",
    country: "",
    description: "",
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { t } = useTranslation(["common", "dashboard"]);

  useEffect(() => {
    if (isOpen && propertyId) {
      fetchProperty(propertyId);
    }
  }, [isOpen, propertyId]);

  const fetchProperty = async (id: number) => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("No authentication token");
      }

      const response = await fetch(`http://localhost:8000/properties/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch property");
      }

      const data = await response.json();
      setProperty(data);
      setFormData({
        name: data.name || "",
        street_address: data.street_address || "",
        city: data.city || "",
        zip_code: data.zip_code || "",
        country: data.country || "",
        description: data.description || "",
      });
    } catch (err) {
      console.error("Error fetching property:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!propertyId) return;

    try {
      setSaving(true);
      setError(null);
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("No authentication token");
      }

      const response = await fetch(
        `http://localhost:8000/properties/${propertyId}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(formData),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to update property");
      }

      onPropertyUpdated();
      onClose();
    } catch (err) {
      console.error("Error updating property:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleClose = () => {
    setProperty(null);
    setFormData({
      name: "",
      street_address: "",
      city: "",
      zip_code: "",
      country: "",
      description: "",
    });
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t("dashboard:selectedProperty.editProperty")}
          </h3>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
              <span className="ml-2 text-gray-600 dark:text-gray-400">
                {t("common:status.loading")}
              </span>
            </div>
          ) : error ? (
            <div className="text-red-600 dark:text-red-400 text-sm mb-4">
              {error}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t("dashboard:properties.fields.name")} *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                  placeholder={t("dashboard:properties.placeholders.name")}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t("dashboard:properties.fields.streetAddress")}
                </label>
                <input
                  type="text"
                  name="street_address"
                  value={formData.street_address}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                  placeholder={t(
                    "dashboard:properties.placeholders.streetAddress"
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t("dashboard:properties.fields.city")}
                  </label>
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                    placeholder={t("dashboard:properties.placeholders.city")}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t("dashboard:properties.fields.zipCode")}
                  </label>
                  <input
                    type="text"
                    name="zip_code"
                    value={formData.zip_code}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                    placeholder={t("dashboard:properties.placeholders.zipCode")}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t("dashboard:properties.fields.country")}
                </label>
                <input
                  type="text"
                  name="country"
                  value={formData.country}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                  placeholder={t("dashboard:properties.placeholders.country")}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t("dashboard:properties.fields.description")}
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                  placeholder={t(
                    "dashboard:properties.placeholders.description"
                  )}
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                  {t("common:buttons.cancel")}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed">
                  {saving
                    ? t("common:status.loading")
                    : t("common:buttons.save")}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
