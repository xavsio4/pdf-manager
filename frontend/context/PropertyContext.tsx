import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from "react";
import { useAuth } from "./AuthContext";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

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

interface PropertyContextType {
  properties: Property[];
  selectedPropertyId: number | null;
  selectedProperty: Property | null;
  loading: boolean;
  error: string | null;
  setSelectedPropertyId: (propertyId: number | null) => void;
  refreshProperties: () => Promise<void>;
  fetchProperties: () => Promise<void>;
}

const PropertyContext = createContext<PropertyContextType | undefined>(
  undefined
);

export const useProperty = () => {
  const context = useContext(PropertyContext);
  if (context === undefined) {
    throw new Error("useProperty must be used within a PropertyProvider");
  }
  return context;
};

interface PropertyProviderProps {
  children: ReactNode;
}

export const PropertyProvider: React.FC<PropertyProviderProps> = ({
  children,
}) => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedPropertyId, setSelectedPropertyIdState] = useState<
    number | null
  >(null);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { token, user } = useAuth();

  // Load selected property from session storage on mount
  useEffect(() => {
    if (user) {
      const storedPropertyId = sessionStorage.getItem(
        `selectedPropertyId_${user.id}`
      );
      if (storedPropertyId && storedPropertyId !== "null") {
        setSelectedPropertyIdState(parseInt(storedPropertyId, 10));
      }
    }
  }, [user]);

  // Update selected property when selectedPropertyId changes
  useEffect(() => {
    if (selectedPropertyId === null) {
      setSelectedProperty(null);
    } else {
      const property = properties.find((p) => p.id === selectedPropertyId);
      setSelectedProperty(property || null);
    }
  }, [selectedPropertyId, properties]);

  // Save selected property to session storage
  const setSelectedPropertyId = (propertyId: number | null) => {
    setSelectedPropertyIdState(propertyId);
    if (user) {
      if (propertyId === null) {
        sessionStorage.setItem(`selectedPropertyId_${user.id}`, "null");
      } else {
        sessionStorage.setItem(
          `selectedPropertyId_${user.id}`,
          propertyId.toString()
        );
      }
    }
  };

  const fetchProperties = useCallback(async () => {
    if (!token) {
      setError("No authentication token");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_URL}/properties`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch properties");
      }

      const data = await response.json();
      setProperties(data);

      // Auto-select first property if none is selected and properties exist
      if (data.length > 0 && selectedPropertyId === null) {
        const storedPropertyId = user
          ? sessionStorage.getItem(`selectedPropertyId_${user.id}`)
          : null;

        if (!storedPropertyId || storedPropertyId === "null") {
          // Select the first property as default
          setSelectedPropertyId(data[0].id);
        } else {
          // Verify stored property still exists
          const storedId = parseInt(storedPropertyId, 10);
          const propertyExists = data.some((p: Property) => p.id === storedId);
          if (!propertyExists) {
            // If stored property doesn't exist, select first available
            setSelectedPropertyId(data[0].id);
          }
        }
      }
    } catch (err) {
      console.error("Error fetching properties:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [token, user, selectedPropertyId]);

  const refreshProperties = async () => {
    await fetchProperties();
  };

  // Fetch properties when token becomes available
  useEffect(() => {
    if (token && user) {
      fetchProperties();
    }
  }, [token, user, fetchProperties]);

  // Clear selection when user logs out
  useEffect(() => {
    if (!user) {
      setSelectedPropertyIdState(null);
      setSelectedProperty(null);
      setProperties([]);
    }
  }, [user]);

  const value = {
    properties,
    selectedPropertyId,
    selectedProperty,
    loading,
    error,
    setSelectedPropertyId,
    refreshProperties,
    fetchProperties,
  };

  return (
    <PropertyContext.Provider value={value}>
      {children}
    </PropertyContext.Provider>
  );
};
