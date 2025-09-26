import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { useTranslation } from "next-i18next";
import DocumentTextViewer from "./DocumentTextViewer";
import DocumentPDFViewer from "./DocumentPDFViewer";
import TagManager from "./TagManager";
import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Tag {
  id: number;
  name: string;
  name_fr?: string;
  color: string;
  is_default: boolean;
}

interface Document {
  id: number;
  filename: string;
  original_filename: string;
  file_size: number;
  ocr_status: string;
  title?: string;
  created_at: string;
  tags: Tag[];
}

interface DocumentsListProps {
  refreshTrigger: number;
  selectedPropertyId?: number | null;
}

export default function DocumentsList({
  refreshTrigger,
  selectedPropertyId,
}: DocumentsListProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedDocumentId, setSelectedDocumentId] = useState<number | null>(
    null
  );
  const [selectedDocumentName, setSelectedDocumentName] = useState<string>("");
  const [selectedPDFDocumentId, setSelectedPDFDocumentId] = useState<
    number | null
  >(null);
  const [selectedPDFDocumentName, setSelectedPDFDocumentName] =
    useState<string>("");
  const [editingTags, setEditingTags] = useState<number | null>(null);
  const [selectedTags, setSelectedTags] = useState<number[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    processing: 0,
    completed: 0,
    failed: 0,
  });

  const { token } = useAuth();
  const { t, i18n } = useTranslation("common");
  const isFrench = i18n.language === "fr";

  const fetchDocuments = useCallback(async () => {
    try {
      setError("");

      let url = `${API_URL}/documents`;

      // If a specific property is selected, fetch documents for that property
      if (selectedPropertyId !== null && selectedPropertyId !== undefined) {
        url = `${API_URL}/properties/${selectedPropertyId}/documents`;
      }

      const response = await axios.get<Document[]>(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const docs = response.data;
      setDocuments(docs);

      // Calculate stats
      const newStats = docs.reduce(
        (acc, doc) => {
          acc.total++;
          acc[doc.ocr_status as keyof typeof acc] =
            (acc[doc.ocr_status as keyof typeof acc] || 0) + 1;
          return acc;
        },
        {
          total: 0,
          pending: 0,
          processing: 0,
          completed: 0,
          failed: 0,
        }
      );

      setStats(newStats);
    } catch (error: any) {
      console.error("Error fetching documents:", error);
      setError(error.response?.data?.detail || "Failed to load documents");
    } finally {
      setLoading(false);
    }
  }, [token, selectedPropertyId]);

  // Initial fetch and refresh trigger
  useEffect(() => {
    fetchDocuments();
  }, [refreshTrigger, fetchDocuments]);

  // Real-time polling for status updates
  useEffect(() => {
    const hasProcessingDocs = documents.some(
      (doc) => doc.ocr_status === "pending" || doc.ocr_status === "processing"
    );

    if (hasProcessingDocs) {
      const interval = setInterval(() => {
        fetchDocuments();
      }, 3000); // Poll every 3 seconds

      return () => clearInterval(interval);
    }
  }, [documents, fetchDocuments]);

  const handleDelete = async (documentId: number) => {
    if (!confirm("Are you sure you want to delete this document?")) {
      return;
    }

    try {
      await axios.delete(`${API_URL}/documents/${documentId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      // Refresh the list
      fetchDocuments();
    } catch (error: any) {
      console.error("Delete error:", error);
      alert(
        "Failed to delete document: " +
          (error.response?.data?.detail || error.message)
      );
    }
  };

  const handleDownload = async (documentId: number, filename: string) => {
    try {
      const response = await axios.get(
        `${API_URL}/documents/${documentId}/download`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          responseType: "blob",
        }
      );

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error("Download error:", error);
      alert(
        "Failed to download document: " +
          (error.response?.data?.detail || error.message)
      );
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";

    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateString;
    }
  };

  const handleViewText = (documentId: number, filename: string) => {
    setSelectedDocumentId(documentId);
    setSelectedDocumentName(filename);
  };

  const handleViewPDF = (documentId: number, filename: string) => {
    setSelectedPDFDocumentId(documentId);
    setSelectedPDFDocumentName(filename);
  };

  const handleEditTags = (documentId: number, currentTags: Tag[]) => {
    setEditingTags(documentId);
    setSelectedTags(currentTags.map((tag) => tag.id));
  };

  const handleSaveTags = async () => {
    if (editingTags === null) return;

    try {
      await axios.put(
        `${API_URL}/documents/${editingTags}/tags`,
        { tag_ids: selectedTags },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      // Refresh the documents list to show updated tags
      fetchDocuments();
      setEditingTags(null);
      setSelectedTags([]);
    } catch (error: any) {
      console.error("Error updating tags:", error);
      alert(
        "Failed to update tags: " +
          (error.response?.data?.detail || error.message)
      );
    }
  };

  const handleCancelEditTags = () => {
    setEditingTags(null);
    setSelectedTags([]);
  };

  const getTagDisplayName = (tag: Tag) => {
    if (isFrench && tag.name_fr) {
      return tag.name_fr;
    }
    return tag.name;
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: {
        color: "bg-yellow-100 text-yellow-800 border-yellow-200",
        text: "Pending",
        icon: "⏳",
      },
      processing: {
        color: "bg-blue-100 text-blue-800 border-blue-200",
        text: "Processing",
        icon: "🔄",
      },
      completed: {
        color: "bg-green-100 text-green-800 border-green-200",
        text: "Completed",
        icon: "✅",
      },
      failed: {
        color: "bg-red-100 text-red-800 border-red-200",
        text: "Failed",
        icon: "❌",
      },
    };

    const config =
      statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;

    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 text-xs font-semibold rounded-full border ${config.color}`}>
        <span className="mr-1">{config.icon}</span>
        {config.text}
        {status === "processing" && (
          <div className="ml-1 animate-spin rounded-full h-3 w-3 border-b border-current"></div>
        )}
      </span>
    );
  };

  if (loading) {
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            Your Documents
          </h3>
          <div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-4 w-20 rounded"></div>
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="animate-pulse bg-gray-100 dark:bg-gray-800 h-20 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 mb-4">
          <svg
            className="mx-auto h-12 w-12"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Error loading documents
        </h3>
        <p className="text-gray-500 mb-4">{error}</p>
        <button
          onClick={fetchDocuments}
          className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg text-center">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {stats.total}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Total</div>
        </div>
        <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg text-center">
          <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
            {stats.pending}
          </div>
          <div className="text-xs text-yellow-600 dark:text-yellow-400">
            Pending
          </div>
        </div>
        <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg text-center">
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {stats.processing}
          </div>
          <div className="text-xs text-blue-600 dark:text-blue-400">
            Processing
          </div>
        </div>
        <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg text-center">
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
            {stats.completed}
          </div>
          <div className="text-xs text-green-600 dark:text-green-400">
            Completed
          </div>
        </div>
        <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg text-center">
          <div className="text-2xl font-bold text-red-600 dark:text-red-400">
            {stats.failed}
          </div>
          <div className="text-xs text-red-600 dark:text-red-400">Failed</div>
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          Your Documents ({documents.length})
        </h3>
        <button
          onClick={fetchDocuments}
          className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 text-sm font-medium flex items-center">
          <svg
            className="w-4 h-4 mr-1"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          Refresh
        </button>
      </div>

      {documents.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 dark:text-gray-500 mb-4">
            <svg
              className="mx-auto h-12 w-12"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No documents yet
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            Upload your first PDF document to get started!
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {documents.map((doc) => (
              <li key={doc.id}>
                <div className="px-4 py-4 sm:px-6 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center min-w-0 flex-1">
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 bg-red-100 dark:bg-red-900/20 rounded-lg flex items-center justify-center">
                          <svg
                            className="w-6 h-6 text-red-600 dark:text-red-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                            />
                          </svg>
                        </div>
                      </div>
                      <div className="ml-4 min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <button
                            onClick={() =>
                              handleViewPDF(doc.id, doc.original_filename)
                            }
                            className="text-sm font-medium text-gray-900 dark:text-white truncate hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer text-left"
                            title="Click to view PDF">
                            {doc.original_filename}
                          </button>
                          {getStatusBadge(doc.ocr_status)}
                        </div>
                        <div className="mt-1 flex items-center text-sm text-gray-500 dark:text-gray-400 space-x-4">
                          <span>{formatFileSize(doc.file_size)}</span>
                          <span>•</span>
                          <span>{formatDate(doc.created_at)}</span>
                        </div>

                        {/* Tags */}
                        {doc.tags && doc.tags.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {doc.tags.map((tag) => (
                              <span
                                key={tag.id}
                                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                                style={{
                                  borderLeft: `3px solid ${tag.color}`,
                                }}>
                                {getTagDisplayName(tag)}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="ml-4 flex-shrink-0 flex space-x-2">
                      <button
                        onClick={() => handleEditTags(doc.id, doc.tags)}
                        className="text-gray-400 dark:text-gray-500 hover:text-green-600 dark:hover:text-green-400 p-1 rounded"
                        title={t("tags.editTags")}>
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                          />
                        </svg>
                      </button>
                      <button
                        onClick={() =>
                          handleViewText(doc.id, doc.original_filename)
                        }
                        className="text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 p-1 rounded"
                        title="View extracted text">
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                          />
                        </svg>
                      </button>
                      <button
                        onClick={() =>
                          handleDownload(doc.id, doc.original_filename)
                        }
                        className="text-gray-400 dark:text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 p-1 rounded"
                        title="Download PDF">
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2z"
                          />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(doc.id)}
                        className="text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 p-1 rounded"
                        title="Delete document">
                        <svg
                          className="w-5 h-5"
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
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Text Viewer Modal */}
      {selectedDocumentId && (
        <DocumentTextViewer
          documentId={selectedDocumentId}
          filename={selectedDocumentName}
          onClose={() => {
            setSelectedDocumentId(null);
            setSelectedDocumentName("");
          }}
        />
      )}

      {/* PDF Viewer Modal */}
      {selectedPDFDocumentId && (
        <DocumentPDFViewer
          documentId={selectedPDFDocumentId}
          filename={selectedPDFDocumentName}
          onClose={() => {
            setSelectedPDFDocumentId(null);
            setSelectedPDFDocumentName("");
          }}
        />
      )}

      {/* Tag Editor Modal */}
      {editingTags !== null && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                {t("tags.editTags")}
              </h3>
              <button
                onClick={handleCancelEditTags}
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

            <TagManager
              selectedTags={selectedTags}
              onTagsChange={setSelectedTags}
              showTagCounts={false}
              mode="select"
            />

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={handleCancelEditTags}
                className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200">
                {t("buttons.cancel")}
              </button>
              <button
                onClick={handleSaveTags}
                className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                {t("buttons.save")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
