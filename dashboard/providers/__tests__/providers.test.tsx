/**
 * Provider Tests
 * 
 * Tests for global providers to ensure they initialize correctly
 * and provide the expected context to child components.
 */

import { render, screen, waitFor, act } from '@testing-library/react';
import { QueryProvider } from '../QueryProvider';
import { ThemeProvider, useTheme } from '../ThemeProvider';
import { LocationProvider, useLocation } from '../LocationProvider';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

describe('QueryProvider', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  it('should render children', () => {
    render(
      <QueryProvider>
        <div>Test Child</div>
      </QueryProvider>
    );

    expect(screen.getByText('Test Child')).toBeInTheDocument();
  });

  it('should provide QueryClient context', () => {
    const TestComponent = () => {
      // If QueryClient is not provided, this would throw an error
      return <div>QueryClient Available</div>;
    };

    render(
      <QueryProvider>
        <TestComponent />
      </QueryProvider>
    );

    expect(screen.getByText('QueryClient Available')).toBeInTheDocument();
  });
});

describe('ThemeProvider', () => {
  beforeEach(() => {
    localStorageMock.clear();
    document.documentElement.className = '';
    document.documentElement.removeAttribute('data-theme');
  });

  it('should render children after mounting', async () => {
    render(
      <ThemeProvider>
        <div>Test Child</div>
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Test Child')).toBeInTheDocument();
    });
  });

  it('should provide theme context', async () => {
    const TestComponent = () => {
      const { theme, resolvedTheme } = useTheme();
      return (
        <div>
          <span>Theme: {theme}</span>
          <span>Resolved: {resolvedTheme}</span>
        </div>
      );
    };

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/Theme:/)).toBeInTheDocument();
      expect(screen.getByText(/Resolved:/)).toBeInTheDocument();
    });
  });

  it('should initialize with system theme by default', async () => {
    const TestComponent = () => {
      const { theme } = useTheme();
      return <div>Theme: {theme}</div>;
    };

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Theme: system')).toBeInTheDocument();
    });
  });

  it('should persist theme to localStorage', async () => {
    const TestComponent = () => {
      const { theme, setTheme } = useTheme();
      return (
        <div>
          <span>Theme: {theme}</span>
          <button onClick={() => setTheme('dark')}>Set Dark</button>
        </div>
      );
    };

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/Theme:/)).toBeInTheDocument();
    });

    const button = screen.getByText('Set Dark');
    act(() => {
      button.click();
    });

    await waitFor(() => {
      expect(localStorageMock.getItem('theme')).toBe('dark');
    });
  });

  it('should throw error when useTheme is used outside provider', () => {
    const TestComponent = () => {
      useTheme();
      return <div>Test</div>;
    };

    // Suppress console.error for this test
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    expect(() => {
      render(<TestComponent />);
    }).toThrow('useTheme must be used within a ThemeProvider');

    consoleSpy.mockRestore();
  });
});

describe('LocationProvider', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  it('should render children', () => {
    render(
      <LocationProvider>
        <div>Test Child</div>
      </LocationProvider>
    );

    expect(screen.getByText('Test Child')).toBeInTheDocument();
  });

  it('should provide location context', async () => {
    const TestComponent = () => {
      const { currentLocation, isLoading } = useLocation();
      
      if (isLoading) {
        return <div>Loading...</div>;
      }
      
      return (
        <div>
          <span>Location: {currentLocation?.name}</span>
        </div>
      );
    };

    render(
      <LocationProvider>
        <TestComponent />
      </LocationProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/Location:/)).toBeInTheDocument();
    });
  });

  it('should initialize with default location (Delhi)', async () => {
    const TestComponent = () => {
      const { currentLocation, isLoading } = useLocation();
      
      if (isLoading) {
        return <div>Loading...</div>;
      }
      
      return <div>Location: {currentLocation?.name}</div>;
    };

    render(
      <LocationProvider>
        <TestComponent />
      </LocationProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Location: Delhi')).toBeInTheDocument();
    });
  });

  it('should manage favorite locations', async () => {
    const TestComponent = () => {
      const { favoriteLocations, addFavorite, removeFavorite, isFavorite, isLoading } = useLocation();
      
      if (isLoading) {
        return <div>Loading...</div>;
      }

      const testLocation = {
        id: 'mumbai-india',
        name: 'Mumbai',
        city: 'Mumbai',
        state: 'Maharashtra',
        country: 'India',
        latitude: 19.0760,
        longitude: 72.8777,
      };

      return (
        <div>
          <span>Favorites: {favoriteLocations.length}</span>
          <span>Is Favorite: {isFavorite('mumbai-india') ? 'Yes' : 'No'}</span>
          <button onClick={() => addFavorite(testLocation)}>Add Favorite</button>
          <button onClick={() => removeFavorite('mumbai-india')}>Remove Favorite</button>
        </div>
      );
    };

    render(
      <LocationProvider>
        <TestComponent />
      </LocationProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Favorites: 0')).toBeInTheDocument();
      expect(screen.getByText('Is Favorite: No')).toBeInTheDocument();
    });

    // Add favorite
    const addButton = screen.getByText('Add Favorite');
    act(() => {
      addButton.click();
    });

    await waitFor(() => {
      expect(screen.getByText('Favorites: 1')).toBeInTheDocument();
      expect(screen.getByText('Is Favorite: Yes')).toBeInTheDocument();
    });

    // Remove favorite
    const removeButton = screen.getByText('Remove Favorite');
    act(() => {
      removeButton.click();
    });

    await waitFor(() => {
      expect(screen.getByText('Favorites: 0')).toBeInTheDocument();
      expect(screen.getByText('Is Favorite: No')).toBeInTheDocument();
    });
  });

  it('should persist current location to localStorage', async () => {
    const TestComponent = () => {
      const { setCurrentLocation, isLoading } = useLocation();
      
      if (isLoading) {
        return <div>Loading...</div>;
      }

      const newLocation = {
        id: 'bangalore-india',
        name: 'Bangalore',
        city: 'Bangalore',
        state: 'Karnataka',
        country: 'India',
        latitude: 12.9716,
        longitude: 77.5946,
      };

      return (
        <button onClick={() => setCurrentLocation(newLocation)}>
          Set Location
        </button>
      );
    };

    render(
      <LocationProvider>
        <TestComponent />
      </LocationProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Set Location')).toBeInTheDocument();
    });

    const button = screen.getByText('Set Location');
    act(() => {
      button.click();
    });

    await waitFor(() => {
      const stored = localStorageMock.getItem('aqi-dashboard-current-location');
      expect(stored).toBeTruthy();
      const parsed = JSON.parse(stored!);
      expect(parsed.name).toBe('Bangalore');
    });
  });

  it('should throw error when useLocation is used outside provider', () => {
    const TestComponent = () => {
      useLocation();
      return <div>Test</div>;
    };

    // Suppress console.error for this test
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    expect(() => {
      render(<TestComponent />);
    }).toThrow('useLocation must be used within a LocationProvider');

    consoleSpy.mockRestore();
  });
});

describe('Provider Integration', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  it('should work when all providers are nested', async () => {
    const TestComponent = () => {
      const { theme } = useTheme();
      const { currentLocation, isLoading } = useLocation();
      
      if (isLoading) {
        return <div>Loading...</div>;
      }

      return (
        <div>
          <span>Theme: {theme}</span>
          <span>Location: {currentLocation?.name}</span>
        </div>
      );
    };

    render(
      <QueryProvider>
        <ThemeProvider>
          <LocationProvider>
            <TestComponent />
          </LocationProvider>
        </ThemeProvider>
      </QueryProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/Theme:/)).toBeInTheDocument();
      expect(screen.getByText(/Location:/)).toBeInTheDocument();
    });
  });
});
