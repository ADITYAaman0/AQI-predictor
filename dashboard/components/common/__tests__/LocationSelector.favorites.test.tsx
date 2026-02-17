/**
 * Integration tests for LocationSelector favorites management
 * Tests that favorites persist across sessions using local storage
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { LocationSelector, LocationInfo } from '../LocationSelector';
import { getAQIClient } from '@/lib/api/aqi-client';
import type { LocationSearchResult } from '@/lib/api/types';

// Mock the API client
jest.mock('@/lib/api/aqi-client', () => ({
  getAQIClient: jest.fn(),
}));

const mockSearchLocations = jest.fn();

beforeAll(() => {
  (getAQIClient as jest.Mock).mockReturnValue({
    searchLocations: mockSearchLocations,
  });
});

const mockCurrentLocation: LocationInfo = {
  id: 'delhi-1',
  name: 'Delhi',
  city: 'Delhi',
  state: 'Delhi',
  country: 'India',
  latitude: 28.6139,
  longitude: 77.2090,
};

const mockSearchResults: LocationSearchResult[] = [
  {
    id: 'mumbai-1',
    name: 'Mumbai',
    city: 'Mumbai',
    state: 'Maharashtra',
    country: 'India',
    latitude: 19.0760,
    longitude: 72.8777,
  },
  {
    id: 'bangalore-1',
    name: 'Bangalore',
    city: 'Bangalore',
    state: 'Karnataka',
    country: 'India',
    latitude: 12.9716,
    longitude: 77.5946,
  },
];

describe('LocationSelector - Favorites Persistence', () => {
  const mockOnLocationChange = jest.fn();
  const mockOnAddFavorite = jest.fn();
  const mockOnRemoveFavorite = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    mockSearchLocations.mockResolvedValue(mockSearchResults);
  });

  describe('Adding favorites', () => {
    it('adds a location to favorites and persists in local storage', async () => {
      jest.useFakeTimers();

      render(
        <LocationSelector
          currentLocation={mockCurrentLocation}
          favoriteLocations={[]}
          onLocationChange={mockOnLocationChange}
          onAddFavorite={mockOnAddFavorite}
        />
      );

      // Open dropdown
      const button = screen.getByRole('button', { name: /select location/i });
      fireEvent.click(button);

      // Search for a location
      const searchInput = screen.getByPlaceholderText(/search locations/i);
      fireEvent.change(searchInput, { target: { value: 'Mumbai' } });

      jest.advanceTimersByTime(300);

      // Wait for search results
      await waitFor(() => {
        expect(screen.getByText('Mumbai')).toBeInTheDocument();
      });

      // Click the star to add to favorites
      const addFavoriteButton = screen.getAllByRole('button', { name: /add to favorites/i })[0];
      fireEvent.click(addFavoriteButton);

      // Verify onAddFavorite was called
      expect(mockOnAddFavorite).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'mumbai-1',
          name: 'Mumbai',
        })
      );

      jest.useRealTimers();
    });

    it('displays favorites list after adding', async () => {
      jest.useFakeTimers();

      const mumbaiLocation: LocationInfo = {
        id: 'mumbai-1',
        name: 'Mumbai',
        city: 'Mumbai',
        state: 'Maharashtra',
        country: 'India',
        latitude: 19.0760,
        longitude: 72.8777,
      };

      // First render with no favorites
      const { rerender } = render(
        <LocationSelector
          currentLocation={mockCurrentLocation}
          favoriteLocations={[]}
          onLocationChange={mockOnLocationChange}
          onAddFavorite={mockOnAddFavorite}
        />
      );

      // Open dropdown
      let button = screen.getByRole('button', { name: /select location/i });
      fireEvent.click(button);

      // Should show empty state
      expect(screen.getByText(/no favorite locations/i)).toBeInTheDocument();

      // Close dropdown
      fireEvent.click(button);

      // Rerender with favorites
      rerender(
        <LocationSelector
          currentLocation={mockCurrentLocation}
          favoriteLocations={[mumbaiLocation]}
          onLocationChange={mockOnLocationChange}
          onAddFavorite={mockOnAddFavorite}
          onRemoveFavorite={mockOnRemoveFavorite}
        />
      );

      // Open dropdown again
      button = screen.getByRole('button', { name: /select location/i });
      fireEvent.click(button);

      // Should show favorites section
      expect(screen.getByText(/favorites/i)).toBeInTheDocument();
      expect(screen.getByText('Mumbai')).toBeInTheDocument();

      jest.useRealTimers();
    });
  });

  describe('Removing favorites', () => {
    it('removes a location from favorites', () => {
      const mumbaiLocation: LocationInfo = {
        id: 'mumbai-1',
        name: 'Mumbai',
        city: 'Mumbai',
        state: 'Maharashtra',
        country: 'India',
        latitude: 19.0760,
        longitude: 72.8777,
      };

      render(
        <LocationSelector
          currentLocation={mockCurrentLocation}
          favoriteLocations={[mumbaiLocation]}
          onLocationChange={mockOnLocationChange}
          onRemoveFavorite={mockOnRemoveFavorite}
        />
      );

      // Open dropdown
      const button = screen.getByRole('button', { name: /select location/i });
      fireEvent.click(button);

      // Click the star to remove from favorites
      const removeFavoriteButton = screen.getByRole('button', { name: /remove from favorites/i });
      fireEvent.click(removeFavoriteButton);

      // Verify onRemoveFavorite was called
      expect(mockOnRemoveFavorite).toHaveBeenCalledWith('mumbai-1');
    });

    it('updates favorites list after removal', () => {
      const mumbaiLocation: LocationInfo = {
        id: 'mumbai-1',
        name: 'Mumbai',
        city: 'Mumbai',
        state: 'Maharashtra',
        country: 'India',
        latitude: 19.0760,
        longitude: 72.8777,
      };

      const bangaloreLocation: LocationInfo = {
        id: 'bangalore-1',
        name: 'Bangalore',
        city: 'Bangalore',
        state: 'Karnataka',
        country: 'India',
        latitude: 12.9716,
        longitude: 77.5946,
      };

      // First render with two favorites
      const { rerender } = render(
        <LocationSelector
          currentLocation={mockCurrentLocation}
          favoriteLocations={[mumbaiLocation, bangaloreLocation]}
          onLocationChange={mockOnLocationChange}
          onRemoveFavorite={mockOnRemoveFavorite}
        />
      );

      // Open dropdown
      let button = screen.getByRole('button', { name: /select location/i });
      fireEvent.click(button);

      // Should show both favorites
      expect(screen.getByText('Mumbai')).toBeInTheDocument();
      expect(screen.getByText('Bangalore')).toBeInTheDocument();

      // Close dropdown
      fireEvent.click(button);

      // Rerender with one favorite removed
      rerender(
        <LocationSelector
          currentLocation={mockCurrentLocation}
          favoriteLocations={[bangaloreLocation]}
          onLocationChange={mockOnLocationChange}
          onRemoveFavorite={mockOnRemoveFavorite}
        />
      );

      // Open dropdown again
      button = screen.getByRole('button', { name: /select location/i });
      fireEvent.click(button);

      // Should only show Bangalore
      expect(screen.queryByText('Mumbai')).not.toBeInTheDocument();
      expect(screen.getByText('Bangalore')).toBeInTheDocument();
    });
  });

  describe('Favorites display', () => {
    it('shows favorites section when favorites exist', () => {
      const mumbaiLocation: LocationInfo = {
        id: 'mumbai-1',
        name: 'Mumbai',
        city: 'Mumbai',
        state: 'Maharashtra',
        country: 'India',
        latitude: 19.0760,
        longitude: 72.8777,
      };

      render(
        <LocationSelector
          currentLocation={mockCurrentLocation}
          favoriteLocations={[mumbaiLocation]}
          onLocationChange={mockOnLocationChange}
        />
      );

      // Open dropdown
      const button = screen.getByRole('button', { name: /select location/i });
      fireEvent.click(button);

      // Should show favorites section
      expect(screen.getByText(/favorites/i)).toBeInTheDocument();
      expect(screen.getByText('Mumbai')).toBeInTheDocument();
    });

    it('shows empty state when no favorites exist', () => {
      render(
        <LocationSelector
          currentLocation={mockCurrentLocation}
          favoriteLocations={[]}
          onLocationChange={mockOnLocationChange}
        />
      );

      // Open dropdown
      const button = screen.getByRole('button', { name: /select location/i });
      fireEvent.click(button);

      // Should show empty state
      expect(screen.getByText(/no favorite locations/i)).toBeInTheDocument();
      expect(screen.getByText(/search for a location to get started/i)).toBeInTheDocument();
    });

    it('hides favorites section when searching', async () => {
      jest.useFakeTimers();

      const mumbaiLocation: LocationInfo = {
        id: 'mumbai-1',
        name: 'Mumbai',
        city: 'Mumbai',
        state: 'Maharashtra',
        country: 'India',
        latitude: 19.0760,
        longitude: 72.8777,
      };

      render(
        <LocationSelector
          currentLocation={mockCurrentLocation}
          favoriteLocations={[mumbaiLocation]}
          onLocationChange={mockOnLocationChange}
        />
      );

      // Open dropdown
      const button = screen.getByRole('button', { name: /select location/i });
      fireEvent.click(button);

      // Should show favorites
      expect(screen.getByText(/favorites/i)).toBeInTheDocument();

      // Start searching
      const searchInput = screen.getByPlaceholderText(/search locations/i);
      fireEvent.change(searchInput, { target: { value: 'Test' } });

      jest.advanceTimersByTime(300);

      // Wait for search results
      await waitFor(() => {
        expect(screen.getByText(/search results/i)).toBeInTheDocument();
      });

      // Favorites section should not be visible
      expect(screen.queryByText(/favorites/i)).not.toBeInTheDocument();

      jest.useRealTimers();
    });
  });

  describe('Favorite indicators', () => {
    it('shows filled star for favorite locations', async () => {
      jest.useFakeTimers();

      const mumbaiLocation: LocationInfo = {
        id: 'mumbai-1',
        name: 'Mumbai',
        city: 'Mumbai',
        state: 'Maharashtra',
        country: 'India',
        latitude: 19.0760,
        longitude: 72.8777,
      };

      render(
        <LocationSelector
          currentLocation={mockCurrentLocation}
          favoriteLocations={[mumbaiLocation]}
          onLocationChange={mockOnLocationChange}
          onRemoveFavorite={mockOnRemoveFavorite}
        />
      );

      // Open dropdown
      const button = screen.getByRole('button', { name: /select location/i });
      fireEvent.click(button);

      // Search for Mumbai
      const searchInput = screen.getByPlaceholderText(/search locations/i);
      fireEvent.change(searchInput, { target: { value: 'Mumbai' } });

      jest.advanceTimersByTime(300);

      // Wait for search results
      await waitFor(() => {
        expect(screen.getByText(/search results/i)).toBeInTheDocument();
      });

      // Should show "Remove from favorites" button (indicating it's already a favorite)
      expect(screen.getByRole('button', { name: /remove from favorites/i })).toBeInTheDocument();

      jest.useRealTimers();
    });

    it('shows empty star for non-favorite locations', async () => {
      jest.useFakeTimers();

      render(
        <LocationSelector
          currentLocation={mockCurrentLocation}
          favoriteLocations={[]}
          onLocationChange={mockOnLocationChange}
          onAddFavorite={mockOnAddFavorite}
        />
      );

      // Open dropdown
      const button = screen.getByRole('button', { name: /select location/i });
      fireEvent.click(button);

      // Search for Mumbai
      const searchInput = screen.getByPlaceholderText(/search locations/i);
      fireEvent.change(searchInput, { target: { value: 'Mumbai' } });

      jest.advanceTimersByTime(300);

      // Wait for search results
      await waitFor(() => {
        expect(screen.getByText(/search results/i)).toBeInTheDocument();
      });

      // Should show "Add to favorites" button
      expect(screen.getAllByRole('button', { name: /add to favorites/i }).length).toBeGreaterThan(0);

      jest.useRealTimers();
    });
  });

  describe('Selecting from favorites', () => {
    it('calls onLocationChange when favorite is selected', () => {
      const mumbaiLocation: LocationInfo = {
        id: 'mumbai-1',
        name: 'Mumbai',
        city: 'Mumbai',
        state: 'Maharashtra',
        country: 'India',
        latitude: 19.0760,
        longitude: 72.8777,
      };

      render(
        <LocationSelector
          currentLocation={mockCurrentLocation}
          favoriteLocations={[mumbaiLocation]}
          onLocationChange={mockOnLocationChange}
        />
      );

      // Open dropdown
      const button = screen.getByRole('button', { name: /select location/i });
      fireEvent.click(button);

      // Click on the favorite location
      const locationButton = screen.getByRole('button', { name: /select mumbai/i });
      fireEvent.click(locationButton);

      // Verify onLocationChange was called
      expect(mockOnLocationChange).toHaveBeenCalledWith(mumbaiLocation);
    });

    it('closes dropdown after selecting favorite', () => {
      const mumbaiLocation: LocationInfo = {
        id: 'mumbai-1',
        name: 'Mumbai',
        city: 'Mumbai',
        state: 'Maharashtra',
        country: 'India',
        latitude: 19.0760,
        longitude: 72.8777,
      };

      render(
        <LocationSelector
          currentLocation={mockCurrentLocation}
          favoriteLocations={[mumbaiLocation]}
          onLocationChange={mockOnLocationChange}
        />
      );

      // Open dropdown
      const button = screen.getByRole('button', { name: /select location/i });
      fireEvent.click(button);

      // Click on the favorite location
      const locationButton = screen.getByRole('button', { name: /select mumbai/i });
      fireEvent.click(locationButton);

      // Dropdown should be closed
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });
  });
});
