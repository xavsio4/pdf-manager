import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface DocumentText {
  id: number;
  filename: string;
  ocr_status: string;
  extracted_text: string;
  processed_at?: string;
}

interface DocumentTextViewerProps {
  documentId: number;
  filename: string;
  onClose: () => void;
}

export default function DocumentTextViewer({ documentId, filename, onClose }: DocumentTextViewerProps) {
  const [documentText, setDocumentText] = useState<DocumentText | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const { token } = useAuth();

  useEffect(() => {
    const fetchDocumentText = async () => {
      try {
        setLoading(true);
        setError('');
        
        const response = await axios.get<DocumentText>(`${API_URL}/documents/${documentId}/text`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        
        setDocumentText(response.data);
      } catch (error: any) {
        console.error('Error fetching document text:', error);
        setError(error.response?.data?.detail || 'Failed to load document text');
      } finally {
        setLoading(false);
      }
    };

    fetchDocumentText();
  }, [documentId, token]);

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return dateString;
    }
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'completed':
        return { color: 'text-green-600 bg-green-100', icon: '✅', text: 'Text extraction completed' };
      case 'processing':
        return { color: 'text-blue-600 bg-blue-100', icon: '🔄', text: 'Processing...' };
      case 'failed':
        return { color: 'text-red-600 bg-red-100', icon: '❌', text: 'Text extraction failed' };
      default:
        return { color: 'text-yellow-600 bg-yellow-100', icon: '⏳', text: 'Pending processing' };
    }
  };

  const copyToClipboard = async () => {
    if (documentText?.extracted_text) {
      try {
        await navigator.clipboard.writeText(documentText.extracted_text);
        alert('Text copied to clipboard!');
      } catch (err) {
        console.error('Failed to copy text: ', err);
      }
    }
  };

  const downloadAsText = () => {
    if (documentText?.extracted_text) {
      const blob = new Blob([documentText.extracted_text], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename.replace('.pdf', '')}_extracted_text.txt`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-gray-900 truncate">
              {filename}
            </h2>
            {documentText && (
              <div className="mt-2 flex items-center space-x-4">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusInfo(documentText.ocr_status).color}`}>
                  <span className="mr-1">{getStatusInfo(documentText.ocr_status).icon}</span>
                  {getStatusInfo(documentText.ocr_status).text}
                </span>
                {documentText.processed_at && (
                  <span className="text-sm text-gray-500">
                    Processed: {formatDate(documentText.processed_at)}
                  </span>
                )}
              </div>
            )}
          </div>
          
          <button
            onClick={onClose}
            className="ml-4 text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 rounded-full p-1"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              <span className="ml-2 text-gray-600">Loading extracted text...</span>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <svg className="mx-auto h-12 w-12 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="mt-2 text-lg font-medium text-gray-900">Error loading text</h3>
                <p className="mt-1 text-gray-500">{error}</p>
              </div>
            </div>
          ) : documentText ? (
            <div className="h-full flex flex-col">
              {/* Action buttons */}
              {documentText.extracted_text && documentText.ocr_status === 'completed' && (
                <div className="px-6 py-3 border-b border-gray-200 bg-gray-50">
                  <div className="flex space-x-3">
                    <button
                      onClick={copyToClipboard}
                      className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Copy Text
                    </button>
                    <button
                      onClick={downloadAsText}
                      className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Download as TXT
                    </button>
                  </div>
                </div>
              )}
              
              {/* Text content */}
              <div className="flex-1 overflow-auto p-6">
                {documentText.extracted_text ? (
                  <div className="prose max-w-none">
                    <pre className="whitespace-pre-wrap text-sm text-gray-700 font-mono leading-relaxed bg-gray-50 p-4 rounded-lg border">
                      {documentText.extracted_text}
                    </pre>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="text-gray-400 mb-4">
                      <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      {documentText.ocr_status === 'failed' ? 'Text extraction failed' : 'No text available'}
                    </h3>
                    <p className="text-gray-500">
                      {documentText.ocr_status === 'failed' 
                        ? 'The document could not be processed for text extraction.'
                        : documentText.ocr_status === 'processing'
                        ? 'Text extraction is still in progress...'
                        : 'Text extraction has not started yet.'
                      }
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}