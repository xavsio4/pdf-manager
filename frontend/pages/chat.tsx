import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../context/AuthContext';
import ChatInterface from '../components/ChatInterface';

export default function ChatPage() {
  const { user, logout, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          <span className="text-gray-600">Loading...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect to login
  }

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-8">
              <h1 className="text-xl font-semibold text-gray-900">PDF Manager</h1>
              <div className="hidden md:flex space-x-8">
                <a
                  href="/dashboard"
                  className="text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Dashboard
                </a>
                <a
                  href="/chat"
                  className="bg-indigo-100 text-indigo-700 px-3 py-2 rounded-md text-sm font-medium"
                >
                  AI Chat
                </a>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">Welcome, {user.username}!</span>
              <button
                onClick={handleLogout}
                className="bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">AI Document Chat</h2>
          <p className="mt-1 text-sm text-gray-600">
            Ask questions about your uploaded documents. The AI will search through your files and provide intelligent answers.
          </p>
        </div>
        
        <ChatInterface />
        
        {/* Help Section */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-blue-900 mb-4">💡 Tips for better results:</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
            <div>
              <h4 className="font-medium mb-2">Ask specific questions:</h4>
              <ul className="space-y-1 text-blue-700">
                <li>• "What are the key terms in my contract?"</li>
                <li>• "Summarize the main findings"</li>
                <li>• "What does section 5 say about payments?"</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Reference specific documents:</h4>
              <ul className="space-y-1 text-blue-700">
                <li>• "In my lease agreement, what's the notice period?"</li>
                <li>• "According to the manual, how do I reset the device?"</li>
                <li>• "What does the research paper conclude?"</li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}