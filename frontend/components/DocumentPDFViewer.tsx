import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface DocumentPDFViewerProps {
  documentId: number;
  filename: string;
  onClose: () => void;
}

export default function DocumentPDFViewer({
  documentId,
  filename,
  onClose,
}: DocumentPDFViewerProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pdfUrl, setPdfUrl] = useState<string>("");

  const { token } = useAuth();

  useEffect(() => {
    const loadPDF = async () => {
      try {
        setLoading(true);
        setError("");

        // Create a blob URL for the PDF
        const response = await fetch(
          `${API_URL}/documents/${documentId}/download`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error("Failed to load PDF");
        }

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        setPdfUrl(url);
      } catch (error: any) {
        console.error("Error loading PDF:", error);
        setError(error.message || "Failed to load PDF");
      } finally {
        setLoading(false);
      }
    };

    loadPDF();

    // Cleanup function to revoke the blob URL
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [documentId, token]);

  // Add keyboard support for Esc key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  const handleDownload = () => {
    if (pdfUrl) {
      const link = document.createElement("a");
      link.href = pdfUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleOpenInNewTab = () => {
    if (pdfUrl) {
      window.open(pdfUrl, "_blank");
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full h-full max-w-7xl max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 rounded-t-lg">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
              {filename}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              PDF Document Viewer
            </p>
          </div>

          <div className="flex items-center space-x-2 ml-4">
            {pdfUrl && (
              <>
                <button
                  onClick={handleDownload}
                  className="inline-flex items-center px-3 py-1.5 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  title="Download PDF">
                  <svg
                    className="w-4 h-4 mr-1.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  Download
                </button>
                <button
                  onClick={handleOpenInNewTab}
                  className="inline-flex items-center px-3 py-1.5 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  title="Open in new tab">
                  <svg
                    className="w-4 h-4 mr-1.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                    />
                  </svg>
                  New Tab
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 rounded-full p-1"
              title="Close viewer">
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
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden bg-gray-100 dark:bg-gray-900">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
                <p className="mt-4 text-gray-600 dark:text-gray-400">
                  Loading PDF...
                </p>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <svg
                  className="mx-auto h-12 w-12 text-red-400"
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
                <h3 className="mt-2 text-lg font-medium text-gray-900 dark:text-white">
                  Error loading PDF
                </h3>
                <p className="mt-1 text-gray-500 dark:text-gray-400">{error}</p>
                <button
                  onClick={() => window.location.reload()}
                  className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                  Try Again
                </button>
              </div>
            </div>
          ) : pdfUrl ? (
            <div className="w-full h-full">
              <iframe
                src={pdfUrl}
                className="w-full h-full border-0"
                title={`PDF Viewer - ${filename}`}
                style={{ minHeight: "600px" }}
              />
            </div>
          ) : null}
        </div>

        {/* Footer with instructions */}
        {pdfUrl && !loading && !error && (
          <div className="px-4 py-2 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 rounded-b-lg">
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
              Use your browser's PDF controls to zoom, navigate pages, and
              print. Press{" "}
              <kbd className="px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs">
                Esc
              </kbd>{" "}
              to close this viewer.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
