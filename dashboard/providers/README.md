# Global Providers

This directory contains all global context providers for the AQI Dashboard application.

## Providers

### QueryProvider
**File:** `QueryProvider.tsx`

Provides TanStack Query (React Query) context for server state management and API caching.

**Configuration:**
- Stale time: 5 minutes (default)
- Cache time: 10 minutes
- Retry attempts: 3 with exponential backoff
- Refetch on window focus: enabled

**Usage:**
```typescript
import { useQuery } from '@tanstack/react-query';

const { data, isLoading } = useQuery({
  queryKey: ['aqi', location],
  queryFn: () => fetchAQI(location),
});
```

### ThemeProvider
**File:** `ThemeProvider.tsx`

Manages light/dark mode theme state with localStorage persistence.

**Features:**
- Theme options: 'light', 'dark', 'system'
- Persists to localStorage
- Respects system preference
- Prevents FOUC (Flash of Unstyled Content)

**Usage:**
```typescript
import { useTheme } from '@/providers';

const { theme, setTheme, resolvedTheme } = useTheme();

// Set theme
setTheme('dark'); // or 'light' or 'system'

// Get current theme
console.log(resolvedTheme); // 'light' or 'dark'
```

### LocationProvider
**File:** `LocationProvider.tsx`

Manages current location and favorite locations with localStorage persistence.

**Features:**
- Current location state
- Favorite locations management
- Default location: Delhi, India
- localStorage persistence

**Usage:**
```typescript
import { useLocation } from '@/providers';

const { 
  currentLocation, 
  setCurrentLocation,
  favoriteLocations,
  addFavorite,
  removeFavorite,
  isFavorite 
} = useLocation();

// Set current location
setCurrentLocation({
  id: 'mumbai-india',
  name: 'Mumbai',
  city: 'Mumbai',
  state: 'Maharashtra',
  country: 'India',
  latitude: 19.0760,
  longitude: 72.8777,
});

// Manage favorites
addFavorite(location);
removeFavorite('mumbai-india');
const isFav = isFavorite('mumbai-india');
```

## Provider Order

Providers are nested in `app/layout.tsx` in this order:

```typescript
<QueryProvider>
  <ThemeProvider>
    <LocationProvider>
      {children}
    </LocationProvider>
  </ThemeProvider>
</QueryProvider>
```

This ensures:
1. React Query is available to all components
2. Theme context is available before location
3. Location can potentially use React Query in the future

## Testing

Run provider tests:
```bash
npm test -- providers.test.tsx
```

Visit test page:
```bash
npm run dev
# Navigate to http://localhost:3000/test-providers
```

## localStorage Keys

The providers use these localStorage keys:
- `theme` - Current theme preference
- `aqi-dashboard-current-location` - Current location
- `aqi-dashboard-favorite-locations` - Array of favorite locations

## Error Handling

All providers include error handling:
- Hooks throw errors if used outside their provider
- localStorage errors are caught and logged
- Fallback to defaults on initialization errors

## TypeScript Types

All providers are fully typed with TypeScript:
- `Theme` - 'light' | 'dark' | 'system'
- `LocationInfo` - Complete location interface
- Context types exported for use in components
