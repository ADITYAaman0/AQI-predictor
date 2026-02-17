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
const mockReverseGeocode = jest.fn();

beforeAll(() => {
  (getAQIClient as jest.Mock).mockReturnValue({
    searchLocations: mockSearchLocations,
    reverseGeocode: mockReverseGeocode,
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

const mockFavoriteLocations: LocationInfo[] = [
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

describe('LocationSelector', () => {
  const mockOnLocationChange = jest.fn();
  const mockOnAddFavorite = jest.fn();
  const mockOnRemoveFavorite = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mock response for search
    mockSearchLocations.mockResolvedValue([
      {
        id: 'test-1',
        name: 'Test City',
        city: 'Test City',
        state: 'State',
        country: 'Country',
        latitude: 0,
        longitude: 0,
      },
      {
        id: 'test-2',
        name: 'Test Downtown',
        city: 'Test',
        state: 'State',
        country: 'Country',
        latitude: 0,
        longitude: 0,
      },
      {
        id: 'test-3',
        name: 'Test Suburb',
        city: 'Test',
        state: 'State',
        country: 'Country',
        latitude: 0,
        longitude: 0,
      },
    ] as LocationSearchResult[]);
  });

  describe('Rendering', () => {
    it('displays current location', () => {
      render(
        <LocationSelector
          currentLocation={mockCurrentLocation}
          onLocationChange={mockOnLocationChange}
        />
      );

      expect(screen.getByText('Delhi')).toBeInTheDocument();
    });

    it('shows location icon', () => {
      render(
        <LocationSelector
          currentLocation={mockCurrentLocation}
          onLocationChange={mockOnLocationChange}
        />
      );

      const button = screen.getByRole('button', { name: /select location/i });
      expect(button).toBeInTheDocument();
    });

    it('applies custom className', () => {
      const { container } = render(
        <LocationSelector
          currentLocation={mockCurrentLocation}
          onLocationChange={mockOnLocationChange}
          className="custom-class"
        />
      );

      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  describe('Dropdown Interaction', () => {
    it('opens dropdown when clicked', () => {
      render(
        <LocationSelector
          currentLocation={mockCurrentLocation}
          onLocationChange={mockOnLocationChange}
        />
      );

      const button = screen.getByRole('button', { name: /select location/i });
      fireEvent.click(button);

      expect(screen.getByRole('listbox')).toBeInTheDocument();
    });

    it('closes dropdown when clicked again', () => {
      render(
        <LocationSelector
          currentLocation={mockCurrentLocation}
          onLocationChange={mockOnLocationChange}
        />
      );

      const button = screen.getByRole('button', { name: /select location/i });
      
      // Open
      fireEvent.click(button);
      expect(screen.getByRole('listbox')).toBeInTheDocument();

      // Close
      fireEvent.click(button);
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });

    it('closes dropdown when clicking outside', () => {
      render(
        <div>
          <div data-testid="outside">Outside</div>
          <LocationSelector
            currentLocation={mockCurrentLocation}
            onLocationChange={mockOnLocationChange}
          />
        </div>
      );

      const button = screen.getByRole('button', { name: /select location/i });
      fireEvent.click(button);
      expect(screen.getByRole('listbox')).toBeInTheDocument();

      // Click outside
      fireEvent.mouseDown(screen.getByTestId('outside'));
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });

    it('has correct ARIA attributes', () => {
      render(
        <LocationSelector
          currentLocation={mockCurrentLocation}
          onLocationChange={mockOnLocationChange}
        />
      );

      const button = screen.getByRole('button', { name: /select location/i });
      expect(button).toHaveAttribute('aria-expanded', 'false');
      expect(button).toHaveAttribute('aria-haspopup', 'listbox');

      fireEvent.click(button);
      expect(button).toHaveAttribute('aria-expanded', 'true');
    });
  });

  describe('Search Functionality', () => {
    it('displays search input when dropdown is open', () => {
      render(
        <LocationSelector
          currentLocation={mockCurrentLocation}
          onLocationChange={mockOnLocationChange}
        />
      );

      const button = screen.getByRole('button', { name: /select location/i });
      fireEvent.click(button);

      expect(screen.getByPlaceholderText(/search locations/i)).toBeInTheDocument();
    });

    it('focuses search input when dropdown opens', async () => {
      render(
        <LocationSelector
          currentLocation={mockCurrentLocation}
          onLocationChange={mockOnLocationChange}
        />
      );

      const button = screen.getByRole('button', { name: /select location/i });
      fireEvent.click(button);

      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText(/search locations/i);
        expect(searchInput).toHaveFocus();
      });
    });

    it('updates search query on input', () => {
      render(
        <LocationSelector
          currentLocation={mockCurrentLocation}
          onLocationChange={mockOnLocationChange}
        />
      );

      const button = screen.getByRole('button', { name: /select location/i });
      fireEvent.click(button);

      const searchInput = screen.getByPlaceholderText(/search locations/i);
      fireEvent.change(searchInput, { target: { value: 'Mumbai' } });

      expect(searchInput).toHaveValue('Mumbai');
    });

    it('shows clear button when search query exists', () => {
      render(
        <LocationSelector
          currentLocation={mockCurrentLocation}
          onLocationChange={mockOnLocationChange}
        />
      );

      const button = screen.getByRole('button', { name: /select location/i });
      fireEvent.click(button);

      const searchInput = screen.getByPlaceholderText(/search locations/i);
      fireEvent.change(searchInput, { target: { value: 'Mumbai' } });

      expect(screen.getByRole('button', { name: /clear search/i })).toBeInTheDocument();
    });

    it('clears search when clear button is clicked', () => {
      render(
        <LocationSelector
          currentLocation={mockCurrentLocation}
          onLocationChange={mockOnLocationChange}
        />
      );

      const button = screen.getByRole('button', { name: /select location/i });
      fireEvent.click(button);

      const searchInput = screen.getByPlaceholderText(/search locations/i);
      fireEvent.change(searchInput, { target: { value: 'Mumbai' } });

      const clearButton = screen.getByRole('button', { name: /clear search/i });
      fireEvent.click(clearButton);

      expect(searchInput).toHaveValue('');
    });

    it('debounces search input by 300ms', async () => {
      jest.useFakeTimers();

      render(
        <LocationSelector
          currentLocation={mockCurrentLocation}
          onLocationChange={mockOnLocationChange}
        />
      );

      const button = screen.getByRole('button', { name: /select location/i });
      fireEvent.click(button);

      const searchInput = screen.getByPlaceholderText(/search locations/i);
      fireEvent.change(searchInput, { target: { value: 'Test' } });

      // API should not be called immediately
      expect(mockSearchLocations).not.toHaveBeenCalled();

      // Fast-forward 299ms - still not called
      jest.advanceTimersByTime(299);
      expect(mockSearchLocations).not.toHaveBeenCalled();

      // Fast-forward 1ms more (total 300ms) - now it should be called
      jest.advanceTimersByTime(1);
      
      await waitFor(() => {
        expect(mockSearchLocations).toHaveBeenCalledWith('Test');
      });

      jest.useRealTimers();
    });

    it('calls API with search query', async () => {
      jest.useFakeTimers();

      render(
        <LocationSelector
          currentLocation={mockCurrentLocation}
          onLocationChange={mockOnLocationChange}
        />
      );

      const button = screen.getByRole('button', { name: /select location/i });
      fireEvent.click(button);

      const searchInput = screen.getByPlaceholderText(/search locations/i);
      fireEvent.change(searchInput, { target: { value: 'Delhi' } });

      jest.advanceTimersByTime(300);

      await waitFor(() => {
        expect(mockSearchLocations).toHaveBeenCalledWith('Delhi');
      });

      jest.useRealTimers();
    });

    it('displays search results from API', async () => {
      jest.useFakeTimers();

      render(
        <LocationSelector
          currentLocation={mockCurrentLocation}
          onLocationChange={mockOnLocationChange}
        />
      );

      const button = screen.getByRole('button', { name: /select location/i });
      fireEvent.click(button);

      const searchInput = screen.getByPlaceholderText(/search locations/i);
      fireEvent.change(searchInput, { target: { value: 'Test' } });

      jest.advanceTimersByTime(300);

      await waitFor(() => {
        expect(screen.getByText(/search results/i)).toBeInTheDocument();
        expect(screen.getByText('Test City')).toBeInTheDocument();
        expect(screen.getByText('Test Downtown')).toBeInTheDocument();
        expect(screen.getByText('Test Suburb')).toBeInTheDocument();
      });

      jest.useRealTimers();
    });

    it('shows searching state while API call is in progress', async () => {
      // Mock a delayed response
      mockSearchLocations.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve([]), 100))
      );

      render(
        <LocationSelector
          currentLocation={mockCurrentLocation}
          onLocationChange={mockOnLocationChange}
        />
      );

      const button = screen.getByRole('button', { name: /select location/i });
      fireEvent.click(button);

      const searchInput = screen.getByPlaceholderText(/search locations/i);
      fireEvent.change(searchInput, { target: { value: 'Test' } });

      await waitFor(() => {
        expect(screen.getByText(/searching/i)).toBeInTheDocument();
      });
    });

    it('shows "no locations found" when API returns empty results', async () => {
      mockSearchLocations.mockResolvedValue([]);
      jest.useFakeTimers();

      render(
        <LocationSelector
          currentLocation={mockCurrentLocation}
          onLocationChange={mockOnLocationChange}
        />
      );

      const button = screen.getByRole('button', { name: /select location/i });
      fireEvent.click(button);

      const searchInput = screen.getByPlaceholderText(/search locations/i);
      fireEvent.change(searchInput, { target: { value: 'NonexistentCity' } });

      jest.advanceTimersByTime(300);

      await waitFor(() => {
        expect(screen.getByText(/no locations found/i)).toBeInTheDocument();
      });

      jest.useRealTimers();
    });

    it('handles API errors gracefully', async () => {
      mockSearchLocations.mockRejectedValue(new Error('API Error'));
      jest.useFakeTimers();

      render(
        <LocationSelector
          currentLocation={mockCurrentLocation}
          onLocationChange={mockOnLocationChange}
        />
      );

      const button = screen.getByRole('button', { name: /select location/i });
      fireEvent.click(button);

      const searchInput = screen.getByPlaceholderText(/search locations/i);
      fireEvent.change(searchInput, { target: { value: 'Test' } });

      jest.advanceTimersByTime(300);

      await waitFor(() => {
        expect(screen.getByText(/no locations found/i)).toBeInTheDocument();
      });

      jest.useRealTimers();
    });

    it('does not call API with empty query', async () => {
      jest.useFakeTimers();

      render(
        <LocationSelector
          currentLocation={mockCurrentLocation}
          onLocationChange={mockOnLocationChange}
        />
      );

      const button = screen.getByRole('button', { name: /select location/i });
      fireEvent.click(button);

      const searchInput = screen.getByPlaceholderText(/search locations/i);
      fireEvent.change(searchInput, { target: { value: '   ' } });

      jest.advanceTimersByTime(300);

      await waitFor(() => {
        expect(mockSearchLocations).not.toHaveBeenCalled();
      });

      jest.useRealTimers();
    });
  });

  describe('Favorites', () => {
    it('displays favorite locations when no search query', () => {
      render(
        <LocationSelector
          currentLocation={mockCurrentLocation}
          favoriteLocations={mockFavoriteLocations}
          onLocationChange={mockOnLocationChange}
        />
      );

      const button = screen.getByRole('button', { name: /select location/i });
      fireEvent.click(button);

      expect(screen.getByText(/favorites/i)).toBeInTheDocument();
      expect(screen.getByText('Mumbai')).toBeInTheDocument();
      expect(screen.getByText('Bangalore')).toBeInTheDocument();
    });

    it('shows empty state when no favorites', () => {
      render(
        <LocationSelector
          currentLocation={mockCurrentLocation}
          favoriteLocations={[]}
          onLocationChange={mockOnLocationChange}
        />
      );

      const button = screen.getByRole('button', { name: /select location/i });
      fireEvent.click(button);

      expect(screen.getByText(/no favorite locations/i)).toBeInTheDocument();
    });

    it('highlights favorite locations with filled star', () => {
      render(
        <LocationSelector
          currentLocation={mockCurrentLocation}
          favoriteLocations={mockFavoriteLocations}
          onLocationChange={mockOnLocationChange}
        />
      );

      const button = screen.getByRole('button', { name: /select location/i });
      fireEvent.click(button);

      const favoriteButtons = screen.getAllByRole('button', { name: /remove from favorites/i });
      expect(favoriteButtons.length).toBeGreaterThan(0);
    });

    it('calls onAddFavorite when star is clicked on non-favorite', async () => {
      jest.useFakeTimers();

      render(
        <LocationSelector
          currentLocation={mockCurrentLocation}
          favoriteLocations={[]}
          onLocationChange={mockOnLocationChange}
          onAddFavorite={mockOnAddFavorite}
        />
      );

      const button = screen.getByRole('button', { name: /select location/i });
      fireEvent.click(button);

      const searchInput = screen.getByPlaceholderText(/search locations/i);
      fireEvent.change(searchInput, { target: { value: 'Test' } });

      jest.advanceTimersByTime(300);

      await waitFor(() => {
        const addFavoriteButton = screen.getAllByRole('button', { name: /add to favorites/i })[0];
        fireEvent.click(addFavoriteButton);
      });

      expect(mockOnAddFavorite).toHaveBeenCalled();

      jest.useRealTimers();
    });

    it('calls onRemoveFavorite when star is clicked on favorite', () => {
      render(
        <LocationSelector
          currentLocation={mockCurrentLocation}
          favoriteLocations={mockFavoriteLocations}
          onLocationChange={mockOnLocationChange}
          onRemoveFavorite={mockOnRemoveFavorite}
        />
      );

      const button = screen.getByRole('button', { name: /select location/i });
      fireEvent.click(button);

      const removeFavoriteButton = screen.getAllByRole('button', { name: /remove from favorites/i })[0];
      fireEvent.click(removeFavoriteButton);

      expect(mockOnRemoveFavorite).toHaveBeenCalledWith('mumbai-1');
    });
  });

  describe('Location Selection', () => {
    it('calls onLocationChange when location is selected', async () => {
      jest.useFakeTimers();

      render(
        <LocationSelector
          currentLocation={mockCurrentLocation}
          onLocationChange={mockOnLocationChange}
        />
      );

      const button = screen.getByRole('button', { name: /select location/i });
      fireEvent.click(button);

      const searchInput = screen.getByPlaceholderText(/search locations/i);
      fireEvent.change(searchInput, { target: { value: 'Test' } });

      jest.advanceTimersByTime(300);

      await waitFor(() => {
        const locationButton = screen.getByRole('button', { name: /select test city/i });
        fireEvent.click(locationButton);
      });

      expect(mockOnLocationChange).toHaveBeenCalled();

      jest.useRealTimers();
    });

    it('closes dropdown after location selection', async () => {
      jest.useFakeTimers();

      render(
        <LocationSelector
          currentLocation={mockCurrentLocation}
          onLocationChange={mockOnLocationChange}
        />
      );

      const button = screen.getByRole('button', { name: /select location/i });
      fireEvent.click(button);

      const searchInput = screen.getByPlaceholderText(/search locations/i);
      fireEvent.change(searchInput, { target: { value: 'Test' } });

      jest.advanceTimersByTime(300);

      await waitFor(() => {
        const locationButton = screen.getByRole('button', { name: /select test city/i });
        fireEvent.click(locationButton);
      });

      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();

      jest.useRealTimers();
    });

    it('clears search after location selection', async () => {
      jest.useFakeTimers();

      render(
        <LocationSelector
          currentLocation={mockCurrentLocation}
          onLocationChange={mockOnLocationChange}
        />
      );

      const button = screen.getByRole('button', { name: /select location/i });
      fireEvent.click(button);

      const searchInput = screen.getByPlaceholderText(/search locations/i);
      fireEvent.change(searchInput, { target: { value: 'Test' } });

      jest.advanceTimersByTime(300);

      await waitFor(() => {
        const locationButton = screen.getByRole('button', { name: /select test city/i });
        fireEvent.click(locationButton);
      });

      // Reopen dropdown
      fireEvent.click(button);

      const newSearchInput = screen.getByPlaceholderText(/search locations/i);
      expect(newSearchInput).toHaveValue('');

      jest.useRealTimers();
    });

    it('highlights selected location', () => {
      render(
        <LocationSelector
          currentLocation={mockCurrentLocation}
          favoriteLocations={mockFavoriteLocations}
          onLocationChange={mockOnLocationChange}
        />
      );

      const button = screen.getByRole('button', { name: /select location/i });
      fireEvent.click(button);

      // Current location should not be in favorites list in this test
      // but if it were, it would have aria-selected="true"
      const options = screen.getAllByRole('option');
      options.forEach(option => {
        if (option.textContent?.includes('Delhi')) {
          expect(option).toHaveAttribute('aria-selected', 'true');
        }
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels on search input', () => {
      render(
        <LocationSelector
          currentLocation={mockCurrentLocation}
          onLocationChange={mockOnLocationChange}
        />
      );

      const button = screen.getByRole('button', { name: /select location/i });
      fireEvent.click(button);

      const searchInput = screen.getByPlaceholderText(/search locations/i);
      expect(searchInput).toHaveAttribute('aria-label', 'Search locations');
      expect(searchInput).toHaveAttribute('aria-autocomplete', 'list');
      expect(searchInput).toHaveAttribute('aria-controls', 'location-results');
    });

    it('has proper role attributes on dropdown', () => {
      render(
        <LocationSelector
          currentLocation={mockCurrentLocation}
          onLocationChange={mockOnLocationChange}
        />
      );

      const button = screen.getByRole('button', { name: /select location/i });
      fireEvent.click(button);

      const listbox = screen.getByRole('listbox');
      expect(listbox).toHaveAttribute('aria-label', 'Location selector');
    });

    it('has proper role attributes on location items', () => {
      render(
        <LocationSelector
          currentLocation={mockCurrentLocation}
          favoriteLocations={mockFavoriteLocations}
          onLocationChange={mockOnLocationChange}
        />
      );

      const button = screen.getByRole('button', { name: /select location/i });
      fireEvent.click(button);

      const options = screen.getAllByRole('option');
      expect(options.length).toBeGreaterThan(0);
      options.forEach(option => {
        expect(option).toHaveAttribute('aria-selected');
      });
    });
  });

  describe('Styling', () => {
    it('applies glassmorphic styling to button', () => {
      render(
        <LocationSelector
          currentLocation={mockCurrentLocation}
          onLocationChange={mockOnLocationChange}
        />
      );

      const button = screen.getByRole('button', { name: /select location/i });
      expect(button).toHaveClass('bg-white/10', 'backdrop-blur-md', 'border-white/20');
    });

    it('applies glassmorphic styling to dropdown', () => {
      render(
        <LocationSelector
          currentLocation={mockCurrentLocation}
          onLocationChange={mockOnLocationChange}
        />
      );

      const button = screen.getByRole('button', { name: /select location/i });
      fireEvent.click(button);

      const listbox = screen.getByRole('listbox');
      expect(listbox).toHaveClass('bg-white/10', 'backdrop-blur-xl', 'border-white/20');
    });
  });

  describe('Geolocation', () => {
    const mockGeolocation = {
      getCurrentPosition: jest.fn(),
    };

    beforeEach(() => {
      // Mock navigator.geolocation
      Object.defineProperty(global.navigator, 'geolocation', {
        value: mockGeolocation,
        writable: true,
        configurable: true,
      });

      // Reset mocks
      mockGeolocation.getCurrentPosition.mockClear();
      mockReverseGeocode.mockClear();
    });

    it('displays "Use Current Location" button when dropdown is open', () => {
      render(
        <LocationSelector
          currentLocation={mockCurrentLocation}
          onLocationChange={mockOnLocationChange}
        />
      );

      const button = screen.getByRole('button', { name: /select location/i });
      fireEvent.click(button);

      expect(screen.getByRole('button', { name: /use current location/i })).toBeInTheDocument();
    });

    it('requests geolocation permission when button is clicked', async () => {
      const mockPosition = {
        coords: {
          latitude: 28.6139,
          longitude: 77.2090,
        },
      };

      mockGeolocation.getCurrentPosition.mockImplementation((success) => {
        success(mockPosition);
      });

      mockReverseGeocode.mockResolvedValue({
        id: 'delhi-1',
        name: 'Delhi',
        city: 'Delhi',
        state: 'Delhi',
        country: 'India',
        latitude: 28.6139,
        longitude: 77.2090,
      });

      render(
        <LocationSelector
          currentLocation={mockCurrentLocation}
          onLocationChange={mockOnLocationChange}
        />
      );

      const button = screen.getByRole('button', { name: /select location/i });
      fireEvent.click(button);

      const geoButton = screen.getByRole('button', { name: /use current location/i });
      fireEvent.click(geoButton);

      await waitFor(() => {
        expect(mockGeolocation.getCurrentPosition).toHaveBeenCalled();
      });
    });

    it('shows loading state while getting location', async () => {
      mockGeolocation.getCurrentPosition.mockImplementation(() => {
        // Don't call success or error - simulate pending state
      });

      render(
        <LocationSelector
          currentLocation={mockCurrentLocation}
          onLocationChange={mockOnLocationChange}
        />
      );

      const button = screen.getByRole('button', { name: /select location/i });
      fireEvent.click(button);

      const geoButton = screen.getByRole('button', { name: /use current location/i });
      fireEvent.click(geoButton);

      await waitFor(() => {
        expect(screen.getByText(/getting location/i)).toBeInTheDocument();
      });
    });

    it('calls reverseGeocode with coordinates', async () => {
      const mockPosition = {
        coords: {
          latitude: 19.0760,
          longitude: 72.8777,
        },
      };

      mockGeolocation.getCurrentPosition.mockImplementation((success) => {
        success(mockPosition);
      });

      mockReverseGeocode.mockResolvedValue({
        id: 'mumbai-1',
        name: 'Mumbai',
        city: 'Mumbai',
        state: 'Maharashtra',
        country: 'India',
        latitude: 19.0760,
        longitude: 72.8777,
      });

      render(
        <LocationSelector
          currentLocation={mockCurrentLocation}
          onLocationChange={mockOnLocationChange}
        />
      );

      const button = screen.getByRole('button', { name: /select location/i });
      fireEvent.click(button);

      const geoButton = screen.getByRole('button', { name: /use current location/i });
      fireEvent.click(geoButton);

      await waitFor(() => {
        expect(mockReverseGeocode).toHaveBeenCalledWith(19.0760, 72.8777);
      });
    });

    it('calls onLocationChange with reverse geocoded location', async () => {
      const mockPosition = {
        coords: {
          latitude: 12.9716,
          longitude: 77.5946,
        },
      };

      const mockLocation = {
        id: 'bangalore-1',
        name: 'Bangalore',
        city: 'Bangalore',
        state: 'Karnataka',
        country: 'India',
        latitude: 12.9716,
        longitude: 77.5946,
      };

      mockGeolocation.getCurrentPosition.mockImplementation((success) => {
        success(mockPosition);
      });

      mockReverseGeocode.mockResolvedValue(mockLocation);

      render(
        <LocationSelector
          currentLocation={mockCurrentLocation}
          onLocationChange={mockOnLocationChange}
        />
      );

      const button = screen.getByRole('button', { name: /select location/i });
      fireEvent.click(button);

      const geoButton = screen.getByRole('button', { name: /use current location/i });
      fireEvent.click(geoButton);

      await waitFor(() => {
        expect(mockOnLocationChange).toHaveBeenCalledWith(mockLocation);
      });
    });

    it('closes dropdown after successful geolocation', async () => {
      const mockPosition = {
        coords: {
          latitude: 28.6139,
          longitude: 77.2090,
        },
      };

      mockGeolocation.getCurrentPosition.mockImplementation((success) => {
        success(mockPosition);
      });

      mockReverseGeocode.mockResolvedValue({
        id: 'delhi-1',
        name: 'Delhi',
        city: 'Delhi',
        state: 'Delhi',
        country: 'India',
        latitude: 28.6139,
        longitude: 77.2090,
      });

      render(
        <LocationSelector
          currentLocation={mockCurrentLocation}
          onLocationChange={mockOnLocationChange}
        />
      );

      const button = screen.getByRole('button', { name: /select location/i });
      fireEvent.click(button);

      const geoButton = screen.getByRole('button', { name: /use current location/i });
      fireEvent.click(geoButton);

      await waitFor(() => {
        expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
      });
    });

    it('handles permission denied error', async () => {
      const mockError = {
        code: 1, // PERMISSION_DENIED
        message: 'User denied geolocation',
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3,
      };

      mockGeolocation.getCurrentPosition.mockImplementation((success, error) => {
        error(mockError);
      });

      render(
        <LocationSelector
          currentLocation={mockCurrentLocation}
          onLocationChange={mockOnLocationChange}
        />
      );

      const button = screen.getByRole('button', { name: /select location/i });
      fireEvent.click(button);

      const geoButton = screen.getByRole('button', { name: /use current location/i });
      fireEvent.click(geoButton);

      await waitFor(() => {
        expect(screen.getByText(/location access denied/i)).toBeInTheDocument();
      });
    });

    it('handles position unavailable error', async () => {
      const mockError = {
        code: 2, // POSITION_UNAVAILABLE
        message: 'Position unavailable',
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3,
      };

      mockGeolocation.getCurrentPosition.mockImplementation((success, error) => {
        error(mockError);
      });

      render(
        <LocationSelector
          currentLocation={mockCurrentLocation}
          onLocationChange={mockOnLocationChange}
        />
      );

      const button = screen.getByRole('button', { name: /select location/i });
      fireEvent.click(button);

      const geoButton = screen.getByRole('button', { name: /use current location/i });
      fireEvent.click(geoButton);

      await waitFor(() => {
        expect(screen.getByText(/unable to determine your location/i)).toBeInTheDocument();
      });
    });

    it('handles timeout error', async () => {
      const mockError = {
        code: 3, // TIMEOUT
        message: 'Timeout',
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3,
      };

      mockGeolocation.getCurrentPosition.mockImplementation((success, error) => {
        error(mockError);
      });

      render(
        <LocationSelector
          currentLocation={mockCurrentLocation}
          onLocationChange={mockOnLocationChange}
        />
      );

      const button = screen.getByRole('button', { name: /select location/i });
      fireEvent.click(button);

      const geoButton = screen.getByRole('button', { name: /use current location/i });
      fireEvent.click(geoButton);

      await waitFor(() => {
        expect(screen.getByText(/location request timed out/i)).toBeInTheDocument();
      });
    });

    it('handles reverse geocoding error', async () => {
      const mockPosition = {
        coords: {
          latitude: 28.6139,
          longitude: 77.2090,
        },
      };

      mockGeolocation.getCurrentPosition.mockImplementation((success) => {
        success(mockPosition);
      });

      mockReverseGeocode.mockRejectedValue(new Error('Reverse geocoding failed'));

      render(
        <LocationSelector
          currentLocation={mockCurrentLocation}
          onLocationChange={mockOnLocationChange}
        />
      );

      const button = screen.getByRole('button', { name: /select location/i });
      fireEvent.click(button);

      const geoButton = screen.getByRole('button', { name: /use current location/i });
      fireEvent.click(geoButton);

      await waitFor(() => {
        expect(screen.getByText(/failed to get location information/i)).toBeInTheDocument();
      });
    });

    it('shows error when geolocation is not supported', async () => {
      // Remove geolocation support
      Object.defineProperty(global.navigator, 'geolocation', {
        value: undefined,
        writable: true,
        configurable: true,
      });

      render(
        <LocationSelector
          currentLocation={mockCurrentLocation}
          onLocationChange={mockOnLocationChange}
        />
      );

      const button = screen.getByRole('button', { name: /select location/i });
      fireEvent.click(button);

      const geoButton = screen.getByRole('button', { name: /use current location/i });
      fireEvent.click(geoButton);

      await waitFor(() => {
        expect(screen.getByText(/geolocation is not supported/i)).toBeInTheDocument();
      });
    });

    it('disables button while getting location', async () => {
      mockGeolocation.getCurrentPosition.mockImplementation(() => {
        // Don't call success or error - simulate pending state
      });

      render(
        <LocationSelector
          currentLocation={mockCurrentLocation}
          onLocationChange={mockOnLocationChange}
        />
      );

      const button = screen.getByRole('button', { name: /select location/i });
      fireEvent.click(button);

      const geoButton = screen.getByRole('button', { name: /use current location/i });
      fireEvent.click(geoButton);

      await waitFor(() => {
        expect(geoButton).toBeDisabled();
      });
    });

    it('uses high accuracy and appropriate timeout options', async () => {
      const mockPosition = {
        coords: {
          latitude: 28.6139,
          longitude: 77.2090,
        },
      };

      mockGeolocation.getCurrentPosition.mockImplementation((success) => {
        success(mockPosition);
      });

      mockReverseGeocode.mockResolvedValue({
        id: 'delhi-1',
        name: 'Delhi',
        city: 'Delhi',
        state: 'Delhi',
        country: 'India',
        latitude: 28.6139,
        longitude: 77.2090,
      });

      render(
        <LocationSelector
          currentLocation={mockCurrentLocation}
          onLocationChange={mockOnLocationChange}
        />
      );

      const button = screen.getByRole('button', { name: /select location/i });
      fireEvent.click(button);

      const geoButton = screen.getByRole('button', { name: /use current location/i });
      fireEvent.click(geoButton);

      await waitFor(() => {
        expect(mockGeolocation.getCurrentPosition).toHaveBeenCalledWith(
          expect.any(Function),
          expect.any(Function),
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0,
          }
        );
      });
    });
  });
});
