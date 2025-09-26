import { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { useTranslation } from "next-i18next";
import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Tag {
  id: number;
  name: string;
  name_fr?: string;
  color: string;
  is_default: boolean;
  document_count?: number;
}

interface TagManagerProps {
  selectedTags?: number[];
  onTagsChange?: (tagIds: number[]) => void;
  showTagCounts?: boolean;
  mode?: "select" | "manage"; // select for document tagging, manage for tag management
}

export default function TagManager({
  selectedTags = [],
  onTagsChange,
  showTagCounts = false,
  mode = "select",
}: TagManagerProps) {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [inputValue, setInputValue] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredTags, setFilteredTags] = useState<Tag[]>([]);
  const [isCreating, setIsCreating] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const { token } = useAuth();
  const { t, i18n } = useTranslation("common");
  const isFrench = i18n.language === "fr";

  const fetchTags = async () => {
    try {
      setError("");
      const response = await axios.get<Tag[]>(`${API_URL}/tags`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setTags(response.data);
    } catch (error: any) {
      console.error("Error fetching tags:", error);
      setError(error.response?.data?.detail || "Failed to load tags");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTags();
  }, [token]);

  useEffect(() => {
    // Filter tags based on input value
    if (inputValue.trim()) {
      const filtered = tags.filter((tag) => {
        const tagName = getTagDisplayName(tag).toLowerCase();
        const searchTerm = inputValue.toLowerCase();
        return tagName.includes(searchTerm) && !selectedTags.includes(tag.id);
      });
      setFilteredTags(filtered);
    } else {
      setFilteredTags([]);
    }
  }, [inputValue, tags, selectedTags]);

  // Handle click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const getTagDisplayName = (tag: Tag) => {
    if (isFrench && tag.name_fr) {
      return tag.name_fr;
    }
    return tag.name;
  };

  const handleTagToggle = (tagId: number) => {
    if (mode !== "select" || !onTagsChange) return;

    const newSelectedTags = selectedTags.includes(tagId)
      ? selectedTags.filter((id) => id !== tagId)
      : [...selectedTags, tagId];

    onTagsChange(newSelectedTags);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    setShowSuggestions(value.trim().length > 0);
  };

  const handleInputFocus = () => {
    if (inputValue.trim()) {
      setShowSuggestions(true);
    }
  };

  const handleSuggestionClick = (tag: Tag) => {
    if (mode === "select" && onTagsChange) {
      onTagsChange([...selectedTags, tag.id]);
    }
    setInputValue("");
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const handleCreateTag = async () => {
    if (!inputValue.trim() || isCreating) return;

    setIsCreating(true);
    try {
      const response = await axios.post(
        `${API_URL}/tags/assign`,
        {
          tag_names: [inputValue.trim()],
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      const newTag = response.data[0];
      if (newTag) {
        // Add the new tag to the list
        setTags((prev) => [...prev, newTag]);

        // Auto-select the new tag if in select mode
        if (mode === "select" && onTagsChange) {
          onTagsChange([...selectedTags, newTag.id]);
        }
      }

      setInputValue("");
      setShowSuggestions(false);
    } catch (error: any) {
      console.error("Error creating tag:", error);
      setError(error.response?.data?.detail || "Failed to create tag");
    } finally {
      setIsCreating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (filteredTags.length > 0) {
        // Select first suggestion
        handleSuggestionClick(filteredTags[0]);
      } else if (inputValue.trim()) {
        // Create new tag
        handleCreateTag();
      }
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
      setInputValue("");
    }
  };

  const handleDeleteTag = async (tagId: number) => {
    const tag = tags.find((t) => t.id === tagId);
    if (!tag || tag.is_default) return;

    if (!confirm(t("tags.deleteTagConfirm"))) return;

    try {
      await axios.delete(`${API_URL}/tags/${tagId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      // Remove from tags list
      setTags((prev) => prev.filter((t) => t.id !== tagId));

      // Remove from selected tags if applicable
      if (mode === "select" && onTagsChange && selectedTags.includes(tagId)) {
        onTagsChange(selectedTags.filter((id) => id !== tagId));
      }
    } catch (error: any) {
      console.error("Error deleting tag:", error);
      setError(error.response?.data?.detail || "Failed to delete tag");
    }
  };

  const getSelectedTagsData = () => {
    return tags.filter((tag) => selectedTags.includes(tag.id));
  };

  const getAvailableTagsData = () => {
    return tags.filter((tag) => !selectedTags.includes(tag.id));
  };

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20 mb-3"></div>
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-8 bg-gray-200 dark:bg-gray-700 rounded-full w-16"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="text-red-600 dark:text-red-400 text-sm bg-red-50 dark:bg-red-900/20 p-2 rounded">
          {error}
        </div>
      )}

      {/* Available Tags - Inline Selection */}
      {mode === "select" && (
        <div>
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
            {t("tags.availableTags")}
          </h4>
          <div className="flex flex-wrap gap-2 mb-4">
            {getAvailableTagsData().map((tag) => (
              <button
                key={tag.id}
                onClick={() => handleTagToggle(tag.id)}
                className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                style={{
                  borderLeftColor: tag.color,
                  borderLeftWidth: "4px",
                }}>
                <span className="flex-1">
                  {getTagDisplayName(tag)}
                  {showTagCounts && tag.document_count !== undefined && (
                    <span className="ml-1 text-xs opacity-75">
                      ({tag.document_count})
                    </span>
                  )}
                </span>
                <span className="ml-2 text-xs text-gray-500">+</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Tag Input with Autocomplete */}
      {mode === "select" && (
        <div className="relative">
          <div className="flex items-center space-x-2">
            <div className="flex-1 relative">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={handleInputChange}
                onFocus={handleInputFocus}
                onKeyDown={handleKeyDown}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder={t("tags.searchOrCreateTag")}
              />

              {/* Autocomplete Suggestions */}
              {showSuggestions &&
                (filteredTags.length > 0 || inputValue.trim()) && (
                  <div
                    ref={suggestionsRef}
                    className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-md shadow-lg max-h-48 overflow-y-auto">
                    {filteredTags.map((tag) => (
                      <button
                        key={tag.id}
                        onClick={() => handleSuggestionClick(tag)}
                        className="w-full px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center space-x-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: tag.color }}></div>
                        <span className="text-gray-900 dark:text-white">
                          {getTagDisplayName(tag)}
                        </span>
                        {tag.is_default && (
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {t("tags.defaultTag")}
                          </span>
                        )}
                      </button>
                    ))}

                    {/* Create new tag option */}
                    {inputValue.trim() &&
                      !tags.some(
                        (tag) =>
                          getTagDisplayName(tag).toLowerCase() ===
                          inputValue.toLowerCase()
                      ) && (
                        <button
                          onClick={handleCreateTag}
                          disabled={isCreating}
                          className="w-full px-3 py-2 text-left hover:bg-indigo-50 dark:hover:bg-indigo-900/20 flex items-center space-x-2 border-t border-gray-200 dark:border-gray-600">
                          <div className="w-3 h-3 rounded-full bg-gray-400"></div>
                          <span className="text-indigo-600 dark:text-indigo-400">
                            {isCreating
                              ? t("status.loading")
                              : `${t("tags.createTag")}: "${inputValue}"`}
                          </span>
                        </button>
                      )}
                  </div>
                )}
            </div>

            {inputValue.trim() && (
              <button
                onClick={handleCreateTag}
                disabled={isCreating}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-sm">
                {isCreating ? t("status.loading") : t("tags.assign")}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Selected Tags */}
      {mode === "select" && selectedTags.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
            {t("tags.selectedTags")}
          </h4>
          <div className="flex flex-wrap gap-2">
            {getSelectedTagsData().map((tag) => (
              <div
                key={tag.id}
                className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300"
                style={{
                  borderLeftColor: tag.color,
                  borderLeftWidth: "4px",
                }}>
                <span className="flex-1">
                  {getTagDisplayName(tag)}
                  {showTagCounts && tag.document_count !== undefined && (
                    <span className="ml-1 text-xs opacity-75">
                      ({tag.document_count})
                    </span>
                  )}
                </span>
                <button
                  onClick={() => handleTagToggle(tag.id)}
                  className="ml-2 text-indigo-500 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
                  title={t("tags.removeTag")}>
                  <svg
                    className="w-4 h-4"
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
            ))}
          </div>
        </div>
      )}

      {/* All Tags (for manage mode) */}
      {mode === "manage" && (
        <div>
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
            {t("tags.title")}
          </h4>
          {tags.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t("tags.noTags")}
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <div
                  key={tag.id}
                  className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                  style={{
                    borderLeftColor: tag.color,
                    borderLeftWidth: "4px",
                  }}>
                  <span className="flex-1">
                    {getTagDisplayName(tag)}
                    {showTagCounts && tag.document_count !== undefined && (
                      <span className="ml-1 text-xs opacity-75">
                        ({tag.document_count})
                      </span>
                    )}
                  </span>

                  {tag.is_default && (
                    <span className="ml-2 text-xs opacity-60">
                      {t("tags.defaultTag")}
                    </span>
                  )}

                  {!tag.is_default && (
                    <button
                      onClick={() => handleDeleteTag(tag.id)}
                      className="ml-2 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                      title={t("tags.deleteTag")}>
                      <svg
                        className="w-4 h-4"
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
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
