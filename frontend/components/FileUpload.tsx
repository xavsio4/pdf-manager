import { useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface UploadResponse {
  id: number;
  filename: string;
  original_filename: string;
  file_size: number;
  ocr_status: string;
  message: string;
}

interface FileUploadProps {
  onUploadSuccess: () => void;
}

export default function FileUpload({ onUploadSuccess }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadMessage, setUploadMessage] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [uploadedFile, setUploadedFile] = useState<UploadResponse | null>(null);
  
  const { token } = useAuth();

  const validateFile = (file: File): string | null => {
    // Check file type
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      return 'Please select a PDF file';
    }
    
    // Check file size (50MB limit)
    const maxSize = 50 * 1024 * 1024; // 50MB in bytes
    if (file.size > maxSize) {
      return 'File size must be less than 50MB';
    }
    
    return null;
  };

  const uploadFile = async (file: File) => {
    setIsUploading(true);
    setUploadError('');
    setUploadMessage('');
    setUploadedFile(null);
    setUploadProgress(0);

    const validation = validateFile(file);
    if (validation) {
      setUploadError(validation);
      setIsUploading(false);
      return;
    }

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await axios.post<UploadResponse>(`${API_URL}/upload`, formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const progress = Math.round((progressEvent.loaded / progressEvent.total) * 100);
            setUploadProgress(progress);
          }
        },
      });

      setUploadedFile(response.data);
      setUploadMessage('Upload successful! Processing will begin shortly.');
      setUploadProgress(100);
      
      // Reset after a delay and refresh the list
      setTimeout(() => {
        setUploadMessage('');
        setUploadProgress(0);
        setUploadedFile(null);
        onUploadSuccess(); // Refresh the documents list
      }, 3000);

    } catch (error: any) {
      console.error('Upload error:', error);
      setUploadError(error.response?.data?.detail || 'Upload failed');
      setUploadProgress(0);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      uploadFile(files[0]);
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      uploadFile(files[0]);
    }
    // Reset input
    e.target.value = '';
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="w-full space-y-4">
      {/* Upload Area */}
      <div
        className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 ${
          isDragging
            ? 'border-blue-400 bg-blue-50 scale-[1.02]'
            : isUploading
            ? 'border-gray-300 bg-gray-50'
            : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          type="file"
          accept=".pdf,application/pdf"
          onChange={handleFileSelect}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={isUploading}
        />
        
        <div className="space-y-4">
          <div className="flex justify-center">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center transition-colors ${
              isUploading ? 'bg-blue-100' : isDragging ? 'bg-blue-200' : 'bg-gray-100'
            }`}>
              {isUploading ? (
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              ) : (
                <svg className={`w-8 h-8 transition-colors ${isDragging ? 'text-blue-500' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              )}
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {isUploading 
                ? 'Uploading...' 
                : isDragging 
                ? 'Drop your PDF here!' 
                : 'Upload PDF Document'
              }
            </h3>
            <p className="text-sm text-gray-500">
              {isUploading 
                ? 'Please wait while your file is being uploaded'
                : 'Drag and drop your PDF file here, or click to select'
              }
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Maximum file size: 50MB • Supports: PDF files only
            </p>
          </div>
        </div>
        
        {/* Progress Bar */}
        {isUploading && uploadProgress > 0 && (
          <div className="mt-6">
            <div className="bg-gray-200 rounded-full h-3 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-blue-500 to-blue-600 h-full transition-all duration-500 ease-out"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
            <p className="text-sm text-gray-600 mt-2 font-medium">{uploadProgress}% complete</p>
          </div>
        )}
      </div>

      {/* Success Message with File Info */}
      {uploadedFile && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start">
            <svg className="w-5 h-5 text-green-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-medium text-green-800">Upload Successful!</h3>
              <div className="mt-2 text-sm text-green-700">
                <p><strong>File:</strong> {uploadedFile.original_filename}</p>
                <p><strong>Size:</strong> {formatFileSize(uploadedFile.file_size)}</p>
                <p><strong>Status:</strong> {uploadedFile.ocr_status}</p>
                <p className="mt-1 text-xs text-green-600">Your document is now being processed for text extraction.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {uploadError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Upload Failed</h3>
              <p className="mt-1 text-sm text-red-700">{uploadError}</p>
            </div>
          </div>
        </div>
      )}

      {/* General Success Message */}
      {uploadMessage && !uploadedFile && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex">
            <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <p className="ml-2 text-sm text-green-700">{uploadMessage}</p>
          </div>
        </div>
      )}
    </div>
  );
}