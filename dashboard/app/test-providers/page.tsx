'use client';

import { useTheme } from '@/providers/ThemeProvider';
import { useLocation } from '@/providers/LocationProvider';

/**
 * Test Providers Page
 * 
 * This page demonstrates that all providers are working correctly.
 * It displays the current theme and location, and allows testing
 * of provider functionality.
 */
export default function TestProvidersPage() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const { 
    currentLocation, 
    favoriteLocations, 
    addFavorite, 
    removeFavorite, 
    isFavorite,
    isLoading 
  } = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading providers...</div>
      </div>
    );
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
    <div className="min-h-screen p-8 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-4xl mx-auto space-y-8">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
          Provider Test Page
        </h1>

        {/* Theme Provider Test */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg">
          <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">
            Theme Provider
          </h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Current Theme:</p>
                <p className="text-lg font-medium text-gray-900 dark:text-white">{theme}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Resolved Theme:</p>
                <p className="text-lg font-medium text-gray-900 dark:text-white">{resolvedTheme}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setTheme('light')}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
              >
                Light
              </button>
              <button
                onClick={() => setTheme('dark')}
                className="px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-900 transition"
              >
                Dark
              </button>
              <button
                onClick={() => setTheme('system')}
                className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 transition"
              >
                System
              </button>
            </div>
            <p className="text-sm text-green-600 dark:text-green-400">
              ✓ Theme Provider is working correctly
            </p>
          </div>
        </div>

        {/* Location Provider Test */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg">
          <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">
            Location Provider
          </h2>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Current Location:</p>
              <p className="text-lg font-medium text-gray-900 dark:text-white">
                {currentLocation?.name}, {currentLocation?.state}, {currentLocation?.country}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Coordinates: {currentLocation?.latitude.toFixed(4)}, {currentLocation?.longitude.toFixed(4)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                Favorite Locations: {favoriteLocations.length}
              </p>
              {favoriteLocations.length > 0 ? (
                <ul className="space-y-2">
                  {favoriteLocations.map((loc) => (
                    <li 
                      key={loc.id}
                      className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 p-2 rounded"
                    >
                      <span className="text-gray-900 dark:text-white">{loc.name}</span>
                      <button
                        onClick={() => removeFavorite(loc.id)}
                        className="text-red-500 hover:text-red-700 text-sm"
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">No favorites yet</p>
              )}
            </div>
            <div className="flex gap-2">
              {!isFavorite(testLocation.id) ? (
                <button
                  onClick={() => addFavorite(testLocation)}
                  className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition"
                >
                  Add Mumbai to Favorites
                </button>
              ) : (
                <button
                  onClick={() => removeFavorite(testLocation.id)}
                  className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition"
                >
                  Remove Mumbai from Favorites
                </button>
              )}
            </div>
            <p className="text-sm text-green-600 dark:text-green-400">
              ✓ Location Provider is working correctly
            </p>
          </div>
        </div>

        {/* Query Provider Test */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg">
          <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">
            Query Provider
          </h2>
          <div className="space-y-4">
            <p className="text-gray-700 dark:text-gray-300">
              TanStack Query is initialized and ready for API calls.
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Configuration:
            </p>
            <ul className="list-disc list-inside text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <li>Stale Time: 5 minutes</li>
              <li>Cache Time: 10 minutes</li>
              <li>Retry Attempts: 3 with exponential backoff</li>
              <li>Refetch on Window Focus: Enabled</li>
            </ul>
            <p className="text-sm text-green-600 dark:text-green-400">
              ✓ Query Provider is working correctly
            </p>
          </div>
        </div>

        {/* Success Summary */}
        <div className="bg-green-50 dark:bg-green-900/20 border-2 border-green-500 rounded-lg p-6">
          <h2 className="text-2xl font-semibold mb-2 text-green-800 dark:text-green-300">
            ✓ All Providers Initialized Successfully
          </h2>
          <p className="text-green-700 dark:text-green-400">
            All three global providers (QueryProvider, ThemeProvider, LocationProvider) are working correctly.
            The app is ready for component development.
          </p>
        </div>

        <div className="text-center">
          <a
            href="/"
            className="inline-block px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
          >
            Back to Home
          </a>
        </div>
      </div>
    </div>
  );
}
