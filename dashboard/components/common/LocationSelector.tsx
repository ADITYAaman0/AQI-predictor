'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MapPin, Search, X, Star, Navigation } from 'lucide-react';
import { getAQIClient } from '@/lib/api/aqi-client';
import type { LocationSearchResult } from '@/lib/api/types';

export interface LocationInfo {
  id: string;
  name: string;
  city: string;
  state: string;
  country: string;
  latitude: number;
  longitude: number;
}

export interface LocationSelectorProps {
  currentLocation: LocationInfo;
  favoriteLocations?: LocationInfo[];
  onLocationChange: (location: LocationInfo) => void;
  onAddFavorite?: (location: LocationInfo) => void;
  onRemoveFavorite?: (locationId: string) => void;
  className?: string;
}

export const LocationSelector: React.FC<LocationSelectorProps> = ({
  currentLocation,
  favoriteLocations = [],
  onLocationChange,
  onAddFavorite,
  onRemoveFavorite,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<LocationInfo[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isGeolocating, setIsGeolocating] = useState(false);
  const [geolocationError, setGeolocationError] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
        setSearchResults([]);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  // Debounced search function
  const performSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);

    try {
      // Call the real API to search locations
      const client = getAQIClient();
      const results = await client.searchLocations(query);
      
      // Map LocationSearchResult to LocationInfo format
      const mappedResults: LocationInfo[] = results.map((result) => ({
        id: result.id,
        name: result.name,
        city: result.city,
        state: result.state,
        country: result.country,
        latitude: result.latitude,
        longitude: result.longitude,
      }));

      setSearchResults(mappedResults);
    } catch (error) {
      console.error('Error searching locations:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Debounce search input
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      performSearch(searchQuery);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, performSearch]);

  const handleLocationSelect = (location: LocationInfo) => {
    onLocationChange(location);
    setIsOpen(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleToggleFavorite = (location: LocationInfo, isFavorite: boolean) => {
    if (isFavorite && onRemoveFavorite) {
      onRemoveFavorite(location.id);
    } else if (!isFavorite && onAddFavorite) {
      onAddFavorite(location);
    }
  };

  const isFavorite = (locationId: string) => {
    return favoriteLocations.some(fav => fav.id === locationId);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    searchInputRef.current?.focus();
  };

  // Geolocation functionality
  const handleUseCurrentLocation = useCallback(async () => {
    setIsGeolocating(true);
    setGeolocationError(null);

    // Check if geolocation is supported
    if (!navigator.geolocation) {
      setGeolocationError('Geolocation is not supported by your browser');
      setIsGeolocating(false);
      return;
    }

    try {
      // Request geolocation permission and get coordinates
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        });
      });

      const { latitude, longitude } = position.coords;

      // Reverse geocode to get location name
      const client = getAQIClient();
      const locationInfo = await client.reverseGeocode(latitude, longitude);

      // Convert to LocationInfo format
      const location: LocationInfo = {
        id: locationInfo.id,
        name: locationInfo.name,
        city: locationInfo.city,
        state: locationInfo.state,
        country: locationInfo.country,
        latitude: locationInfo.latitude,
        longitude: locationInfo.longitude,
      };

      // Update the current location
      onLocationChange(location);
      setIsOpen(false);
      setSearchQuery('');
      setSearchResults([]);
    } catch (error) {
      // Handle geolocation errors
      if (error && typeof error === 'object' && 'code' in error) {
        const geoError = error as { code: number; message: string };
        switch (geoError.code) {
          case 1: // PERMISSION_DENIED
            setGeolocationError('Location access denied. Please enable location permissions.');
            break;
          case 2: // POSITION_UNAVAILABLE
            setGeolocationError('Unable to determine your location. Please try again.');
            break;
          case 3: // TIMEOUT
            setGeolocationError('Location request timed out. Please try again.');
            break;
          default:
            setGeolocationError('An error occurred while getting your location.');
        }
      } else {
        console.error('Error getting location:', error);
        setGeolocationError('Failed to get location information. Please try searching manually.');
      }
    } finally {
      setIsGeolocating(false);
    }
  }, [onLocationChange]);

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Current Location Display */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 backdrop-blur-md border border-white/20 hover:bg-white/15 transition-all duration-300"
        aria-label="Select location"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <MapPin className="w-5 h-5 text-white/80" />
        <span className="text-white font-medium">{currentLocation.name}</span>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          className="absolute top-full left-0 mt-2 w-80 max-w-[calc(100vw-2rem)] bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl shadow-level2 overflow-hidden z-50"
          role="listbox"
          aria-label="Location selector"
        >
          {/* Search Input */}
          <div className="p-4 border-b border-white/10">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/60" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search locations..."
                className="w-full pl-10 pr-10 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/30"
                aria-label="Search locations"
                aria-autocomplete="list"
                aria-controls="location-results"
              />
              {searchQuery && (
                <button
                  onClick={handleClearSearch}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white/80 transition-colors"
                  aria-label="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Use Current Location Button */}
            <button
              onClick={handleUseCurrentLocation}
              disabled={isGeolocating}
              className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/15 disabled:bg-white/5 border border-white/20 rounded-lg text-white text-sm font-medium transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Use current location"
            >
              <Navigation className={`w-4 h-4 ${isGeolocating ? 'animate-pulse' : ''}`} />
              {isGeolocating ? 'Getting location...' : 'Use Current Location'}
            </button>

            {/* Geolocation Error Message */}
            {geolocationError && (
              <div className="mt-2 px-3 py-2 bg-red-500/20 border border-red-500/30 rounded-lg text-red-200 text-xs">
                {geolocationError}
              </div>
            )}
          </div>

          {/* Results Container */}
          <div className="max-h-80 overflow-y-auto">
            {/* Favorites Section */}
            {!searchQuery && favoriteLocations.length > 0 && (
              <div className="p-2">
                <div className="px-3 py-2 text-xs font-medium text-white/60 uppercase tracking-wider">
                  Favorites
                </div>
                {favoriteLocations.map((location) => (
                  <LocationItem
                    key={location.id}
                    location={location}
                    isFavorite={true}
                    isSelected={location.id === currentLocation.id}
                    onSelect={handleLocationSelect}
                    onToggleFavorite={handleToggleFavorite}
                  />
                ))}
              </div>
            )}

            {/* Search Results */}
            {searchQuery && (
              <div className="p-2" id="location-results">
                {isSearching ? (
                  <div className="px-3 py-8 text-center text-white/60">
                    Searching...
                  </div>
                ) : searchResults.length > 0 ? (
                  <>
                    <div className="px-3 py-2 text-xs font-medium text-white/60 uppercase tracking-wider">
                      Search Results
                    </div>
                    {searchResults.map((location) => (
                      <LocationItem
                        key={location.id}
                        location={location}
                        isFavorite={isFavorite(location.id)}
                        isSelected={location.id === currentLocation.id}
                        onSelect={handleLocationSelect}
                        onToggleFavorite={handleToggleFavorite}
                      />
                    ))}
                  </>
                ) : (
                  <div className="px-3 py-8 text-center text-white/60">
                    No locations found
                  </div>
                )}
              </div>
            )}

            {/* Empty State */}
            {!searchQuery && favoriteLocations.length === 0 && (
              <div className="px-3 py-8 text-center text-white/60">
                <p className="mb-2">No favorite locations</p>
                <p className="text-sm">Search for a location to get started</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

interface LocationItemProps {
  location: LocationInfo;
  isFavorite: boolean;
  isSelected: boolean;
  onSelect: (location: LocationInfo) => void;
  onToggleFavorite: (location: LocationInfo, isFavorite: boolean) => void;
}

const LocationItem: React.FC<LocationItemProps> = ({
  location,
  isFavorite,
  isSelected,
  onSelect,
  onToggleFavorite,
}) => {
  return (
    <div
      className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-all duration-200 ${
        isSelected
          ? 'bg-white/20'
          : 'hover:bg-white/10'
      }`}
      role="option"
      aria-selected={isSelected}
    >
      <button
        onClick={() => onSelect(location)}
        className="flex-1 flex items-start gap-3 text-left"
        aria-label={`Select ${location.name}`}
      >
        <MapPin className="w-4 h-4 text-white/60 mt-1 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-white font-medium truncate">{location.name}</div>
          <div className="text-sm text-white/60 truncate">
            {location.city && location.state
              ? `${location.city}, ${location.state}`
              : location.city || location.state || location.country}
          </div>
        </div>
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggleFavorite(location, isFavorite);
        }}
        className={`p-1 rounded transition-colors ${
          isFavorite
            ? 'text-yellow-400 hover:text-yellow-300'
            : 'text-white/40 hover:text-white/60'
        }`}
        aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
      >
        <Star
          className="w-4 h-4"
          fill={isFavorite ? 'currentColor' : 'none'}
        />
      </button>
    </div>
  );
};

export default LocationSelector;
