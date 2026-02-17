'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

/**
 * LocationInfo - Represents a geographic location
 */
export interface LocationInfo {
  id: string;
  name: string;
  city: string;
  state: string;
  country: string;
  latitude: number;
  longitude: number;
}

interface LocationContextType {
  currentLocation: LocationInfo | null;
  setCurrentLocation: (location: LocationInfo) => void;
  favoriteLocations: LocationInfo[];
  addFavorite: (location: LocationInfo) => void;
  removeFavorite: (locationId: string) => void;
  isFavorite: (locationId: string) => boolean;
  isLoading: boolean;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

// Default location (Delhi, India)
const DEFAULT_LOCATION: LocationInfo = {
  id: 'delhi-india',
  name: 'Delhi',
  city: 'Delhi',
  state: 'Delhi',
  country: 'India',
  latitude: 28.6139,
  longitude: 77.2090,
};

const STORAGE_KEY_CURRENT = 'aqi-dashboard-current-location';
const STORAGE_KEY_FAVORITES = 'aqi-dashboard-favorite-locations';

/**
 * LocationProvider - Manages current location and favorite locations state
 * 
 * Features:
 * - Persists current location to localStorage
 * - Manages favorite locations list
 * - Provides helper methods for favorite management
 * - Initializes with default location (Delhi) if none stored
 * 
 * Usage:
 * const { currentLocation, setCurrentLocation, favoriteLocations, addFavorite } = useLocation();
 */
export function LocationProvider({ children }: { children: ReactNode }) {
  const [currentLocation, setCurrentLocationState] = useState<LocationInfo | null>(null);
  const [favoriteLocations, setFavoriteLocations] = useState<LocationInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize from localStorage on mount
  useEffect(() => {
    try {
      // Load current location
      const storedLocation = localStorage.getItem(STORAGE_KEY_CURRENT);
      if (storedLocation) {
        const parsed = JSON.parse(storedLocation) as LocationInfo;
        setCurrentLocationState(parsed);
      } else {
        // Use default location
        setCurrentLocationState(DEFAULT_LOCATION);
      }

      // Load favorite locations
      const storedFavorites = localStorage.getItem(STORAGE_KEY_FAVORITES);
      if (storedFavorites) {
        const parsed = JSON.parse(storedFavorites) as LocationInfo[];
        setFavoriteLocations(parsed);
      }
    } catch (error) {
      console.error('Error loading location data from localStorage:', error);
      // Fall back to default location
      setCurrentLocationState(DEFAULT_LOCATION);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Set current location and persist to localStorage
   */
  const setCurrentLocation = (location: LocationInfo) => {
    setCurrentLocationState(location);
    try {
      localStorage.setItem(STORAGE_KEY_CURRENT, JSON.stringify(location));
    } catch (error) {
      console.error('Error saving current location to localStorage:', error);
    }
  };

  /**
   * Add a location to favorites
   */
  const addFavorite = (location: LocationInfo) => {
    setFavoriteLocations((prev) => {
      // Check if already in favorites
      if (prev.some((loc) => loc.id === location.id)) {
        return prev;
      }

      const updated = [...prev, location];
      
      try {
        localStorage.setItem(STORAGE_KEY_FAVORITES, JSON.stringify(updated));
      } catch (error) {
        console.error('Error saving favorites to localStorage:', error);
      }

      return updated;
    });
  };

  /**
   * Remove a location from favorites
   */
  const removeFavorite = (locationId: string) => {
    setFavoriteLocations((prev) => {
      const updated = prev.filter((loc) => loc.id !== locationId);
      
      try {
        localStorage.setItem(STORAGE_KEY_FAVORITES, JSON.stringify(updated));
      } catch (error) {
        console.error('Error saving favorites to localStorage:', error);
      }

      return updated;
    });
  };

  /**
   * Check if a location is in favorites
   */
  const isFavorite = (locationId: string): boolean => {
    return favoriteLocations.some((loc) => loc.id === locationId);
  };

  return (
    <LocationContext.Provider
      value={{
        currentLocation,
        setCurrentLocation,
        favoriteLocations,
        addFavorite,
        removeFavorite,
        isFavorite,
        isLoading,
      }}
    >
      {children}
    </LocationContext.Provider>
  );
}

/**
 * useLocation - Hook to access location context
 * 
 * @returns {LocationContextType} Location context with current location and favorites
 * @throws {Error} If used outside of LocationProvider
 */
export function useLocation(): LocationContextType {
  const context = useContext(LocationContext);
  
  if (context === undefined) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  
  return context;
}
