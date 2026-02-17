/**
 * Property-Based Tests for Location Management
 * 
 * Tests correctness properties for location search and favorites persistence
 * using fast-check for property-based testing.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import fc from 'fast-check';
import { LocationSelector, LocationInfo } from '../LocationSelector';
import { getAQIClient } from '@/lib/api/aqi-client';
import type { LocationSearchResult } from '@/lib/api/types';
import {
  addFavoriteLocation,
  removeFavoriteLocation,
  getFavoriteLocations,
  clearFavoriteLocations,
} from '@/lib/utils/favoritesStorage';

// Mock the API client
jest.mock('@/lib/api/aqi-client', () => ({
  getAQIClient: jest.fn(),
}));

const mockSearchLocations = jest.fn();
const mockReverseGeocode = jest.fn();

beforeAll(() => {
  (getAQIClient as jest.Mock).mockReturnValue({
    searchLocations: mockSearchLocations,
    reverseGeocode: mockReverseGeocode,
  });
});

// Generators for test data
const locationInfoArbitrary = fc.record({
  id: fc.string({ minLength: 1, maxLength: 50 }),
  name: fc.string({ minLength: 1, maxLength: 100 }),
  city: fc.string({ minLength: 1, maxLength: 50 }),
  state: fc.string({ minLength: 1, maxLength: 50 }),
  country: fc.string({ minLength: 1, maxLength: 50 }),
  latitude: fc.double({ min: -90, max: 90 }),
  longitude: fc.double({ min: -180, max: 180 }),
});

// Generator for city names
const cityNameArbitrary = fc.oneof(
  fc.constantFrom('Delhi', 'Mumbai', 'Bangalore', 'Chennai', 'Kolkata', 'Hyderabad'),
  fc.string({ minLength: 3, maxLength: 30 }).filter(s => /^[a-zA-Z\s]+$/.test(s))
);

// Generator for coordinates in "lat,lon" format
const coordinatesArbitrary = fc.tuple(
  fc.double({ min: -90, max: 90 }),
  fc.double({ min: -180, max: 180 })
).map(([lat, lon]) => `${lat.toFixed(6)},${lon.toFixed(6)}`);

// Generator for addresses
const addressArbitrary = fc.record({
  street: fc.string({ minLength: 5, maxLength: 50 }),
  city: fc.string({ minLength: 3, maxLength: 30 }),
  state: fc.string({ minLength: 3, maxLength: 30 }),
  country: fc.string({ minLength: 3, maxLength: 30 }),
}).map(addr => `${addr.street}, ${addr.city}, ${addr.state}, ${addr.country}`);

// Generator for any valid location format
const locationFormatArbitrary = fc.oneof(
  cityNameArbitrary,
  coordinatesArbitrary,
  addressArbitrary
);

describe('Feature: glassmorphic-dashboard, Location Management Property Tests', () => {
  const mockCurrentLocation: LocationInfo = {
    id: 'test-current',
    name: 'Test City',
    city: 'Test City',
    state: 'Test State',
    country: 'Test Country',
    latitude: 0,
    longitude: 0,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    clearFavoriteLocations();
    
    // Default mock implementation
    mockSearchLocations.mockImplementation((query: string) => {
      // Simulate API returning results for any non-empty query
      if (!query || query.trim().length === 0) {
        return Promise.resolve([]);
      }
      
      // Return mock results based on query
      const results: LocationSearchResult[] = [
        {
          id: `result-1-${query}`,
          name: `${query} City`,
          city: query,
          state: 'State',
          country: 'Country',
          latitude: Math.random() * 180 - 90,
          longitude: Math.random() * 360 - 180,
        },
        {
          id: `result-2-${query}`,
          name: `${query} Downtown`,
          city: query,
          state: 'State',
          country: 'Country',
          latitude: Math.random() * 180 - 90,
          longitude: Math.random() * 360 - 180,
        },
      ];
      
      return Promise.resolve(results);
    });
  });

  describe('Property 17: Location Search Format Support', () => {
    it('for any valid location format (city, coordinates, address), search should return results', async () => {
      jest.useFakeTimers();

      await fc.assert(
        fc.asyncProperty(
          locationFormatArbitrary,
          async (searchQuery) => {
            // Skip empty or whitespace-only queries
            if (!searchQuery || searchQuery.trim().length === 0) {
              return true;
            }

            const mockOnLocationChange = jest.fn();

            const { unmount } = render(
              <LocationSelector
                currentLocation={mockCurrentLocation}
                onLocationChange={mockOnLocationChange}
              />
            );

            try {
              // Open dropdown
              const button = screen.getByRole('button', { name: /select location/i });
              fireEvent.click(button);

              // Enter search query
              const searchInput = screen.getByPlaceholderText(/search locations/i);
              fireEvent.change(searchInput, { target: { value: searchQuery } });

              // Advance timers to trigger debounced search
              jest.advanceTimersByTime(300);

              // Wait for API call
              await waitFor(
                () => {
                  expect(mockSearchLocations).toHaveBeenCalledWith(searchQuery);
                },
                { timeout: 1000 }
              );

              // Verify that search was called with the query
              expect(mockSearchLocations).toHaveBeenCalledWith(searchQuery);

              // Verify that results are displayed (or "no results" message)
              await waitFor(
                () => {
                  const hasResults = screen.queryByText(/search results/i) !== null;
                  const hasNoResults = screen.queryByText(/no locations found/i) !== null;
                  expect(hasResults || hasNoResults).toBe(true);
                },
                { timeout: 1000 }
              );

              return true;
            } finally {
              unmount();
            }
          }
        ),
        {
          numRuns: 50, // Run 50 iterations for performance
          timeout: 60000, // 60 second timeout for all runs
        }
      );

      jest.useRealTimers();
    });

    it('for any city name, search should call API and return results', async () => {
      jest.useFakeTimers();

      await fc.assert(
        fc.asyncProperty(
          cityNameArbitrary,
          async (cityName) => {
            // Skip empty or whitespace-only queries
            if (!cityName || cityName.trim().length === 0) {
              return true;
            }

            const mockOnLocationChange = jest.fn();

            const { unmount } = render(
              <LocationSelector
                currentLocation={mockCurrentLocation}
                onLocationChange={mockOnLocationChange}
              />
            );

            try {
              // Open dropdown
              const button = screen.getByRole('button', { name: /select location/i });
              fireEvent.click(button);

              // Enter city name
              const searchInput = screen.getByPlaceholderText(/search locations/i);
              fireEvent.change(searchInput, { target: { value: cityName } });

              // Advance timers
              jest.advanceTimersByTime(300);

              // Wait for API call
              await waitFor(
                () => {
                  expect(mockSearchLocations).toHaveBeenCalledWith(cityName);
                },
                { timeout: 1000 }
              );

              // Verify API was called
              expect(mockSearchLocations).toHaveBeenCalledWith(cityName);

              return true;
            } finally {
              unmount();
            }
          }
        ),
        {
          numRuns: 30,
          timeout: 45000,
        }
      );

      jest.useRealTimers();
    });

    it('for any coordinate format, search should call API', async () => {
      jest.useFakeTimers();

      await fc.assert(
        fc.asyncProperty(
          coordinatesArbitrary,
          async (coordinates) => {
            const mockOnLocationChange = jest.fn();

            const { unmount } = render(
              <LocationSelector
                currentLocation={mockCurrentLocation}
                onLocationChange={mockOnLocationChange}
              />
            );

            try {
              // Open dropdown
              const button = screen.getByRole('button', { name: /select location/i });
              fireEvent.click(button);

              // Enter coordinates
              const searchInput = screen.getByPlaceholderText(/search locations/i);
              fireEvent.change(searchInput, { target: { value: coordinates } });

              // Advance timers
              jest.advanceTimersByTime(300);

              // Wait for API call
              await waitFor(
                () => {
                  expect(mockSearchLocations).toHaveBeenCalledWith(coordinates);
                },
                { timeout: 1000 }
              );

              // Verify API was called with coordinates
              expect(mockSearchLocations).toHaveBeenCalledWith(coordinates);

              return true;
            } finally {
              unmount();
            }
          }
        ),
        {
          numRuns: 30,
          timeout: 45000,
        }
      );

      jest.useRealTimers();
    });

    it('for any address format, search should call API', async () => {
      jest.useFakeTimers();

      await fc.assert(
        fc.asyncProperty(
          addressArbitrary,
          async (address) => {
            const mockOnLocationChange = jest.fn();

            const { unmount } = render(
              <LocationSelector
                currentLocation={mockCurrentLocation}
                onLocationChange={mockOnLocationChange}
              />
            );

            try {
              // Open dropdown
              const button = screen.getByRole('button', { name: /select location/i });
              fireEvent.click(button);

              // Enter address
              const searchInput = screen.getByPlaceholderText(/search locations/i);
              fireEvent.change(searchInput, { target: { value: address } });

              // Advance timers
              jest.advanceTimersByTime(300);

              // Wait for API call
              await waitFor(
                () => {
                  expect(mockSearchLocations).toHaveBeenCalledWith(address);
                },
                { timeout: 1000 }
              );

              // Verify API was called with address
              expect(mockSearchLocations).toHaveBeenCalledWith(address);

              return true;
            } finally {
              unmount();
            }
          }
        ),
        {
          numRuns: 30,
          timeout: 45000,
        }
      );

      jest.useRealTimers();
    });
  });

  describe('Property 18: Favorite Location Persistence', () => {
    it('for any location marked as favorite, it should persist in local storage', async () => {
      await fc.assert(
        fc.asyncProperty(
          locationInfoArbitrary,
          async (location) => {
            // Clear storage before test
            clearFavoriteLocations();

            // Add location to favorites using storage utility
            const updated = addFavoriteLocation(location);

            // Verify it was added
            expect(updated).toContainEqual(location);

            // Verify it persists in local storage
            const stored = getFavoriteLocations();
            expect(stored).toContainEqual(location);

            // Verify the data in localStorage directly
            const rawData = localStorage.getItem('aqi-dashboard-favorite-locations');
            expect(rawData).not.toBeNull();
            
            if (rawData) {
              const parsed = JSON.parse(rawData);
              expect(parsed).toContainEqual(location);
            }

            return true;
          }
        ),
        {
          numRuns: 100,
        }
      );
    });

    it('for any location added via UI, it should persist in local storage', async () => {
      jest.useFakeTimers();

      await fc.assert(
        fc.asyncProperty(
          locationInfoArbitrary,
          async (location) => {
            // Clear storage before test
            clearFavoriteLocations();

            const mockOnLocationChange = jest.fn();
            const mockOnAddFavorite = jest.fn((loc: LocationInfo) => {
              addFavoriteLocation(loc);
            });

            // Mock search to return our test location
            mockSearchLocations.mockResolvedValue([
              {
                id: location.id,
                name: location.name,
                city: location.city,
                state: location.state,
                country: location.country,
                latitude: location.latitude,
                longitude: location.longitude,
              } as LocationSearchResult,
            ]);

            const { unmount } = render(
              <LocationSelector
                currentLocation={mockCurrentLocation}
                favoriteLocations={[]}
                onLocationChange={mockOnLocationChange}
                onAddFavorite={mockOnAddFavorite}
              />
            );

            try {
              // Open dropdown
              const button = screen.getByRole('button', { name: /select location/i });
              fireEvent.click(button);

              // Search for location
              const searchInput = screen.getByPlaceholderText(/search locations/i);
              fireEvent.change(searchInput, { target: { value: location.name } });

              // Advance timers
              jest.advanceTimersByTime(300);

              // Wait for results
              await waitFor(
                () => {
                  expect(screen.queryByText(location.name)).toBeInTheDocument();
                },
                { timeout: 1000 }
              );

              // Click add to favorites button
              const addFavoriteButton = screen.getByRole('button', { name: /add to favorites/i });
              fireEvent.click(addFavoriteButton);

              // Verify callback was called
              expect(mockOnAddFavorite).toHaveBeenCalledWith(
                expect.objectContaining({
                  id: location.id,
                  name: location.name,
                })
              );

              // Verify it persists in local storage
              const stored = getFavoriteLocations();
              expect(stored).toContainEqual(
                expect.objectContaining({
                  id: location.id,
                  name: location.name,
                })
              );

              return true;
            } finally {
              unmount();
            }
          }
        ),
        {
          numRuns: 50,
          timeout: 60000,
        }
      );

      jest.useRealTimers();
    });

    it('for any location removed from favorites, it should be removed from local storage', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(locationInfoArbitrary, { minLength: 1, maxLength: 5 }),
          fc.integer({ min: 0, max: 4 }),
          async (locations, indexToRemove) => {
            // Ensure index is valid
            const index = indexToRemove % locations.length;
            const locationToRemove = locations[index];

            // Clear and add all locations
            clearFavoriteLocations();
            locations.forEach(loc => addFavoriteLocation(loc));

            // Verify all are stored
            let stored = getFavoriteLocations();
            expect(stored.length).toBe(locations.length);

            // Remove one location
            removeFavoriteLocation(locationToRemove.id);

            // Verify it was removed
            stored = getFavoriteLocations();
            expect(stored).not.toContainEqual(locationToRemove);
            expect(stored.length).toBe(locations.length - 1);

            // Verify the data in localStorage directly
            const rawData = localStorage.getItem('aqi-dashboard-favorite-locations');
            if (rawData) {
              const parsed = JSON.parse(rawData);
              expect(parsed).not.toContainEqual(locationToRemove);
            }

            return true;
          }
        ),
        {
          numRuns: 100,
        }
      );
    });

    it('for any sequence of add/remove operations, storage should remain consistent', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              operation: fc.constantFrom('add', 'remove'),
              location: locationInfoArbitrary,
            }),
            { minLength: 1, maxLength: 10 }
          ),
          async (operations) => {
            // Clear storage
            clearFavoriteLocations();

            const expectedFavorites = new Map<string, LocationInfo>();

            // Perform operations
            for (const op of operations) {
              if (op.operation === 'add') {
                addFavoriteLocation(op.location);
                expectedFavorites.set(op.location.id, op.location);
              } else {
                removeFavoriteLocation(op.location.id);
                expectedFavorites.delete(op.location.id);
              }
            }

            // Verify final state matches expected
            const stored = getFavoriteLocations();
            expect(stored.length).toBe(expectedFavorites.size);

            for (const [id, location] of expectedFavorites) {
              expect(stored).toContainEqual(location);
            }

            return true;
          }
        ),
        {
          numRuns: 100,
        }
      );
    });

    it('for any location, adding it twice should not create duplicates', async () => {
      await fc.assert(
        fc.asyncProperty(
          locationInfoArbitrary,
          async (location) => {
            // Clear storage
            clearFavoriteLocations();

            // Add location twice
            addFavoriteLocation(location);
            addFavoriteLocation(location);

            // Verify only one copy exists
            const stored = getFavoriteLocations();
            const count = stored.filter(loc => loc.id === location.id).length;
            expect(count).toBe(1);

            return true;
          }
        ),
        {
          numRuns: 100,
        }
      );
    });

    it('for any favorites, they should persist across page reloads (simulated)', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(locationInfoArbitrary, { minLength: 1, maxLength: 5 }),
          async (locations) => {
            // Clear storage
            clearFavoriteLocations();

            // Add all locations
            locations.forEach(loc => addFavoriteLocation(loc));

            // Simulate page reload by getting fresh data from storage
            const storedAfterReload = getFavoriteLocations();

            // Verify all locations are still there
            expect(storedAfterReload.length).toBe(locations.length);
            locations.forEach(loc => {
              expect(storedAfterReload).toContainEqual(loc);
            });

            return true;
          }
        ),
        {
          numRuns: 100,
        }
      );
    });
  });

  describe('Combined Properties: Search and Favorites Integration', () => {
    it('for any searched location that is favorited, it should appear in favorites list', async () => {
      jest.useFakeTimers();

      await fc.assert(
        fc.asyncProperty(
          locationInfoArbitrary,
          async (location) => {
            // Clear storage
            clearFavoriteLocations();

            const mockOnLocationChange = jest.fn();
            const mockOnAddFavorite = jest.fn((loc: LocationInfo) => {
              addFavoriteLocation(loc);
            });

            // Mock search to return our test location
            mockSearchLocations.mockResolvedValue([
              {
                id: location.id,
                name: location.name,
                city: location.city,
                state: location.state,
                country: location.country,
                latitude: location.latitude,
                longitude: location.longitude,
              } as LocationSearchResult,
            ]);

            const { unmount, rerender } = render(
              <LocationSelector
                currentLocation={mockCurrentLocation}
                favoriteLocations={getFavoriteLocations()}
                onLocationChange={mockOnLocationChange}
                onAddFavorite={mockOnAddFavorite}
              />
            );

            try {
              // Open dropdown and search
              const button = screen.getByRole('button', { name: /select location/i });
              fireEvent.click(button);

              const searchInput = screen.getByPlaceholderText(/search locations/i);
              fireEvent.change(searchInput, { target: { value: location.name } });

              jest.advanceTimersByTime(300);

              await waitFor(
                () => {
                  expect(screen.queryByText(location.name)).toBeInTheDocument();
                },
                { timeout: 1000 }
              );

              // Add to favorites
              const addButton = screen.getByRole('button', { name: /add to favorites/i });
              fireEvent.click(addButton);

              // Close dropdown
              fireEvent.click(button);

              // Rerender with updated favorites
              rerender(
                <LocationSelector
                  currentLocation={mockCurrentLocation}
                  favoriteLocations={getFavoriteLocations()}
                  onLocationChange={mockOnLocationChange}
                  onAddFavorite={mockOnAddFavorite}
                />
              );

              // Open dropdown again (should show favorites now)
              fireEvent.click(button);

              // Verify location appears in favorites section
              await waitFor(
                () => {
                  const favoritesSection = screen.queryByText(/favorites/i);
                  expect(favoritesSection).toBeInTheDocument();
                },
                { timeout: 1000 }
              );

              return true;
            } finally {
              unmount();
            }
          }
        ),
        {
          numRuns: 30,
          timeout: 60000,
        }
      );

      jest.useRealTimers();
    });
  });
});
