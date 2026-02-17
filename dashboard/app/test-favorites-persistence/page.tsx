'use client';

import React from 'react';
import { LocationSelector, LocationInfo } from '@/components/common/LocationSelector';
import { useFavoriteLocations } from '@/lib/hooks/useFavoriteLocations';

const mockCurrentLocation: LocationInfo = {
  id: 'delhi-1',
  name: 'Delhi',
  city: 'Delhi',
  state: 'Delhi',
  country: 'India',
  latitude: 28.6139,
  longitude: 77.2090,
};

export default function TestFavoritesPersistencePage() {
  const [currentLocation, setCurrentLocation] = React.useState<LocationInfo>(mockCurrentLocation);
  const { favorites, isLoaded, addFavorite, removeFavorite } = useFavoriteLocations();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-8">
          Favorites Persistence Test
        </h1>

        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl p-8 mb-8">
          <h2 className="text-2xl font-semibold text-white mb-4">
            Location Selector with Favorites
          </h2>
          
          <div className="mb-6">
            <LocationSelector
              currentLocation={currentLocation}
              favoriteLocations={favorites}
              onLocationChange={setCurrentLocation}
              onAddFavorite={addFavorite}
              onRemoveFavorite={removeFavorite}
            />
          </div>

          <div className="text-white/80 text-sm">
            <p className="mb-2">
              <strong>Current Location:</strong> {currentLocation.name}
            </p>
            <p>
              <strong>Favorites Loaded:</strong> {isLoaded ? 'Yes' : 'Loading...'}
            </p>
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl p-8 mb-8">
          <h2 className="text-2xl font-semibold text-white mb-4">
            Favorite Locations ({favorites.length})
          </h2>
          
          {favorites.length === 0 ? (
            <p className="text-white/60">
              No favorite locations yet. Search for a location and click the star to add it to favorites.
            </p>
          ) : (
            <div className="space-y-3">
              {favorites.map((location) => (
                <div
                  key={location.id}
                  className="flex items-center justify-between bg-white/10 rounded-lg p-4"
                >
                  <div>
                    <div className="text-white font-medium">{location.name}</div>
                    <div className="text-white/60 text-sm">
                      {location.city}, {location.state}, {location.country}
                    </div>
                  </div>
                  <button
                    onClick={() => removeFavorite(location.id)}
                    className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded-lg text-red-200 text-sm transition-colors"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl p-8">
          <h2 className="text-2xl font-semibold text-white mb-4">
            Testing Instructions
          </h2>
          
          <ol className="text-white/80 space-y-3 list-decimal list-inside">
            <li>
              Click on the location selector above and search for a location (e.g., "Mumbai", "Bangalore")
            </li>
            <li>
              Click the star icon next to a search result to add it to favorites
            </li>
            <li>
              The location should appear in the "Favorite Locations" section below
            </li>
            <li>
              <strong>Refresh the page</strong> - your favorites should persist!
            </li>
            <li>
              Click "Remove" to remove a location from favorites
            </li>
            <li>
              Open the browser's Developer Tools → Application → Local Storage to see the stored data
            </li>
          </ol>

          <div className="mt-6 p-4 bg-blue-500/20 border border-blue-500/30 rounded-lg">
            <p className="text-blue-200 text-sm">
              <strong>Note:</strong> Favorites are stored in your browser's local storage under the key 
              <code className="mx-1 px-2 py-1 bg-black/20 rounded">aqi-dashboard-favorite-locations</code>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
