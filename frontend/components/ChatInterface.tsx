import { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface ChatMessage {
  id: number;
  role: "user" | "assistant";
  content: string;
  referenced_documents?: number[];
  created_at: string;
}

interface ChatSession {
  id: number;
  title: string;
  created_at: string;
  updated_at?: string;
}

interface ChatResponse {
  user_message: ChatMessage;
  ai_response: ChatMessage;
  context_used: number;
  session_title?: string;
}

export default function ChatInterface() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(
    null
  );
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { token } = useAuth();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    loadChatSessions();
  }, []);

  const loadChatSessions = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get<ChatSession[]>(
        `${API_URL}/chat/sessions`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setSessions(response.data);

      // Auto-select the most recent session
      if (response.data.length > 0 && !currentSession) {
        selectSession(response.data[0]);
      }
    } catch (error) {
      console.error("Error loading chat sessions:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const createNewSession = async () => {
    try {
      const response = await axios.post<ChatSession>(
        `${API_URL}/chat/sessions`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const newSession = response.data;
      setSessions((prev) => [newSession, ...prev]);
      setCurrentSession(newSession);
      setMessages([]);
    } catch (error) {
      console.error("Error creating chat session:", error);
      alert("Failed to create new chat session");
    }
  };

  const selectSession = async (session: ChatSession) => {
    try {
      setCurrentSession(session);
      setIsLoading(true);

      const response = await axios.get<ChatMessage[]>(
        `${API_URL}/chat/sessions/${session.id}/messages`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setMessages(response.data);
    } catch (error) {
      console.error("Error loading messages:", error);
      setMessages([]);
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !currentSession || isSending) return;

    const messageText = newMessage.trim();
    setNewMessage("");
    setIsSending(true);

    try {
      const response = await axios.post<ChatResponse>(
        `${API_URL}/chat/sessions/${currentSession.id}/messages`,
        { content: messageText },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Add both user and AI messages to the chat
      setMessages((prev) => [
        ...prev,
        response.data.user_message,
        response.data.ai_response,
      ]);

      // Update session title if it was changed
      if (
        response.data.session_title &&
        response.data.session_title !== currentSession.title
      ) {
        const updatedSession = {
          ...currentSession,
          title: response.data.session_title,
        };
        setCurrentSession(updatedSession);

        // Simple session list update - just update the title
        setSessions((prev) =>
          prev.map((s) =>
            s.id === currentSession.id
              ? { ...s, title: response.data.session_title }
              : s
          )
        );
      }
    } catch (error: any) {
      console.error("Error sending message:", error);
      alert(error.response?.data?.detail || "Failed to send message");
      setNewMessage(messageText); // Restore the message
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  };

  const formatFullDateTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  };

  const getReferencedDocuments = (docIds: number[]) => {
    if (!docIds || docIds.length === 0) return "";
    return `Referenced ${docIds.length} document${
      docIds.length > 1 ? "s" : ""
    }`;
  };

  return (
    <div className="flex h-[600px] bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Sidebar - Chat Sessions */}
      <div className="w-1/3 bg-gray-50 border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-gray-900">AI Chat</h3>
            <button
              onClick={createNewSession}
              className="bg-indigo-600 text-white p-2 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              title="New Chat">
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
            </button>
          </div>
          <p className="text-sm text-gray-600">
            Chat with your documents using AI
          </p>
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoading && !currentSession ? (
            <div className="p-4 text-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600 mx-auto"></div>
              <p className="text-sm text-gray-500 mt-2">Loading chats...</p>
            </div>
          ) : sessions.length === 0 ? (
            <div className="p-4 text-center">
              <div className="text-gray-400 mb-2">
                <svg
                  className="mx-auto h-8 w-8"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
              </div>
              <p className="text-sm text-gray-500">No chat sessions yet</p>
              <button
                onClick={createNewSession}
                className="mt-2 text-indigo-600 hover:text-indigo-500 text-sm font-medium">
                Start your first chat
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {sessions.map((session) => (
                <button
                  key={session.id}
                  onClick={() => selectSession(session)}
                  className={`w-full text-left p-4 hover:bg-gray-100 focus:outline-none focus:bg-gray-100 transition-colors ${
                    currentSession?.id === session.id
                      ? "bg-indigo-50 border-r-2 border-indigo-500"
                      : ""
                  }`}>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {session.title}
                    </p>
                    {currentSession?.id === session.id && (
                      <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {formatFullDateTime(
                      session.updated_at || session.created_at
                    )}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {currentSession ? (
          <>
            {/* Chat Header */}
            <div className="px-6 py-4 border-b border-gray-200 bg-white">
              <h4 className="text-lg font-medium text-gray-900">
                {currentSession.title}
              </h4>
              <p className="text-sm text-gray-500">
                Ask questions about your documents
              </p>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {isLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600 mx-auto"></div>
                  <p className="text-sm text-gray-500 mt-2">
                    Loading messages...
                  </p>
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-gray-400 mb-4">
                    <svg
                      className="mx-auto h-12 w-12"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                      />
                    </svg>
                  </div>
                  <p className="text-gray-500">Start a conversation!</p>
                  <p className="text-sm text-gray-400 mt-1">
                    Ask questions about your uploaded documents
                  </p>
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${
                      message.role === "user" ? "justify-end" : "justify-start"
                    }`}>
                    <div
                      className={`max-w-[70%] rounded-lg px-4 py-2 ${
                        message.role === "user"
                          ? "bg-indigo-600 text-white"
                          : "bg-gray-100 text-gray-900"
                      }`}>
                      <p className="text-sm whitespace-pre-wrap">
                        {message.content}
                      </p>
                      <div className="flex items-center justify-between mt-2">
                        <p
                          className={`text-xs ${
                            message.role === "user"
                              ? "text-indigo-200"
                              : "text-gray-500"
                          }`}>
                          {formatFullDateTime(message.created_at)}
                        </p>
                        {message.role === "assistant" &&
                          message.referenced_documents &&
                          message.referenced_documents.length > 0 && (
                            <p className="text-xs text-gray-500">
                              {getReferencedDocuments(
                                message.referenced_documents
                              )}
                            </p>
                          )}
                      </div>
                    </div>
                  </div>
                ))
              )}

              {isSending && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 rounded-lg px-4 py-2">
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                      <p className="text-sm text-gray-600">AI is thinking...</p>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="border-t border-gray-200 p-4">
              <div className="flex space-x-2">
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask a question about your documents..."
                  className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
                  rows={2}
                  disabled={isSending}
                />
                <button
                  onClick={sendMessage}
                  disabled={!newMessage.trim() || isSending}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed">
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                    />
                  </svg>
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Press Enter to send, Shift+Enter for new line
              </p>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="text-gray-400 mb-4">
                <svg
                  className="mx-auto h-16 w-16"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                AI Document Chat
              </h3>
              <p className="text-gray-500 mb-4">
                Select a chat session or create a new one to start
              </p>
              <button
                onClick={createNewSession}
                className="bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                Start New Chat
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
