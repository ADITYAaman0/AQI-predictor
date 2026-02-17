# Task 8.3: Error Handling and Fallbacks - Implementation Guide

## Overview

This document describes the comprehensive error handling and fallback system implemented for the glassmorphic AQI dashboard.

## Requirements Addressed

- **Requirement 15.6**: API error handling with user-friendly messages
- **Requirement 20.1**: PWA offline functionality
- Display user-friendly error messages
- Show cached data when offline
- Add retry functionality
- Test: Error states display correctly

## Components Implemented

### 1. ErrorBoundary Component

**Location**: `dashboard/components/common/ErrorBoundary.tsx`

**Purpose**: Catches JavaScript errors anywhere in the component tree and displays a fallback UI.

**Features**:
- Prevents entire app from crashing due to component errors
- Displays user-friendly error message
- Provides "Try Again" button to reset error state
- Shows technical details in development mode
- Supports custom fallback UI
- Calls optional onError callback for error logging

**Usage**:
```tsx
<ErrorBoundary>
  <MyComponent />
</ErrorBoundary>

// With custom fallback
<ErrorBoundary fallback={<CustomErrorUI />}>
  <MyComponent />
</ErrorBoundary>

// With error callback
<ErrorBoundary onError={(error, errorInfo) => logToService(error)}>
  <MyComponent />
</ErrorBoundary>
```

**HOC Wrapper**:
```tsx
const SafeComponent = withErrorBoundary(MyComponent);
```

### 2. ErrorDisplay Components

**Location**: `dashboard/components/common/ErrorDisplay.tsx`

#### ErrorDisplay
Full-featured error display with icon, title, message, and retry button.

**Features**:
- Automatically determines error type (network, timeout, server, etc.)
- Shows appropriate icon for each error type
- Displays user-friendly error messages
- Optional retry button
- Technical details in development mode

**Usage**:
```tsx
<ErrorDisplay 
  error={error} 
  onRetry={() => refetch()} 
  showDetails={true}
/>
```

#### CompactErrorDisplay
Inline error display for compact spaces.

**Usage**:
```tsx
<CompactErrorDisplay error={error} onRetry={() => refetch()} />
```

#### NetworkErrorDisplay
Specialized display for offline/network errors.

**Usage**:
```tsx
<NetworkErrorDisplay onRetry={() => refetch()} />
```

#### OfflineBanner
Fixed banner that appears at the top when the app is offline.

**Usage**:
```tsx
{!isOnline && <OfflineBanner />}
```

#### CachedDataIndicator
Shows when displaying cached/stale data.

**Usage**:
```tsx
<CachedDataIndicator lastUpdated="5 minutes ago" />
```

### 3. useOnlineStatus Hook

**Location**: `dashboard/lib/hooks/useOnlineStatus.ts`

**Purpose**: Detects and tracks the user's online/offline status.

**Features**:
- Listens to browser online/offline events
- Returns boolean indicating connection status
- Optional callbacks for status changes
- SSR-safe (checks for navigator availability)

**Usage**:
```tsx
function MyComponent() {
  const isOnline = useOnlineStatus();
  
  return (
    <div>
      {isOnline ? 'Connected' : 'Offline'}
    </div>
  );
}

// With callbacks
useOnlineStatusWithCallback(
  () => console.log('Back online!'),
  () => console.log('Gone offline!')
);
```

## Integration with Existing Components

### Dashboard Page (app/page.tsx)

**Changes**:
1. Added `ErrorBoundary` wrapper around all major sections
2. Added `OfflineBanner` that appears when offline
3. Added online status tracking with `useOnlineStatus`
4. Updated data freshness indicator to show offline status

**Example**:
```tsx
export default function DashboardHome() {
  const isOnline = useOnlineStatus();

  return (
    <div>
      {!isOnline && <OfflineBanner />}
      
      <ErrorBoundary>
        <TopNavigation />
      </ErrorBoundary>
      
      <ErrorBoundary>
        <Suspense fallback={<HeroSkeleton />}>
          <HeroAQISectionLive location={location} />
        </Suspense>
      </ErrorBoundary>
      
      {/* ... more components ... */}
    </div>
  );
}
```

### HeroAQISection Component

**Changes**:
1. Added `onRetry` prop for retry functionality
2. Enhanced error display with proper icon and styling
3. Added retry button in error state

**Error State**:
```tsx
if (error) {
  return (
    <div className="glass-card p-8 rounded-3xl">
      <div className="flex flex-col items-center">
        <div className="w-16 h-16 rounded-full bg-red-500/20">
          <AlertTriangle className="w-8 h-8 text-red-400" />
        </div>
        <h2>Unable to Load AQI Data</h2>
        <p>{error}</p>
        {onRetry && (
          <button onClick={onRetry}>
            <RefreshCw /> Try Again
          </button>
        )}
      </div>
    </div>
  );
}
```

### HeroAQISectionLive Component

**Changes**:
1. Passes `refetch` function to `onRetry` prop
2. Displays error with retry capability

```tsx
if (error) {
  return (
    <HeroAQISection
      error={error.message}
      onRetry={() => refetch()}
    />
  );
}
```

### PollutantMetricsGridLive Component

**Already Implemented**:
- Error state with retry button
- Loading state with spinner
- No data state
- Proper ARIA attributes for accessibility

## Error Types Handled

### 1. Network Errors
- **Cause**: No internet connection, server unreachable
- **Display**: "Connection Error" with WiFi icon
- **Message**: "Unable to connect. Please check your internet connection."
- **Action**: Retry button, show cached data

### 2. Timeout Errors (408, 504)
- **Cause**: Request took too long
- **Display**: "Request Timeout" with clock icon
- **Message**: "Request timed out. Please try again."
- **Action**: Retry button with exponential backoff

### 3. Server Errors (500, 502, 503)
- **Cause**: Backend server issues
- **Display**: "Server Error" with server icon
- **Message**: "Server error. Please try again later."
- **Action**: Retry button, show cached data

### 4. Not Found (404)
- **Cause**: Resource doesn't exist
- **Display**: "Not Found" with X icon
- **Message**: "Resource not found."
- **Action**: No retry (resource doesn't exist)

### 5. Too Many Requests (429)
- **Cause**: Rate limiting
- **Display**: "Too Many Requests" with warning icon
- **Message**: "Too many requests. Please wait a moment."
- **Action**: Retry button with longer delay

### 6. Component Errors
- **Cause**: JavaScript errors in components
- **Display**: Error boundary fallback
- **Message**: "Something went wrong"
- **Action**: Try Again button to reset error boundary

## Retry Logic

### API Client (lib/api/client.ts)

**Already Implemented**:
- Exponential backoff: 1s, 2s, 4s, 8s, 16s (max)
- Maximum 5 retry attempts
- Retryable status codes: 408, 429, 500, 502, 503, 504
- Network errors are automatically retried

**Configuration**:
```typescript
const DEFAULT_RETRY_CONFIG = {
  maxRetries: 5,
  retryDelay: 1000, // Initial delay
  retryableStatusCodes: [408, 429, 500, 502, 503, 504],
};
```

### TanStack Query (useCurrentAQI hook)

**Already Implemented**:
- 3 retry attempts
- Exponential backoff delay
- 5-minute auto-refresh
- 4-minute stale time
- 10-minute cache time

**Configuration**:
```typescript
useQuery({
  retry: 3,
  retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  refetchInterval: 5 * 60 * 1000,
  staleTime: 4 * 60 * 1000,
  cacheTime: 10 * 60 * 1000,
});
```

## Offline Support

### Detection
- Uses browser `navigator.onLine` API
- Listens to `online` and `offline` events
- Updates UI immediately when status changes

### Behavior When Offline
1. **OfflineBanner** appears at top of page
2. Data freshness indicator shows "Showing cached data"
3. TanStack Query serves cached data
4. Failed requests are queued (future PWA enhancement)
5. Retry buttons remain functional (will retry when online)

### Cached Data Display
- TanStack Query automatically serves cached data
- Cache persists for 10 minutes
- Stale data is marked with indicator
- Last updated timestamp is shown

## Testing

### Test File
**Location**: `dashboard/components/common/__tests__/ErrorHandling.test.tsx`

### Test Coverage

#### ErrorBoundary Tests
- ✅ Renders children when no error
- ✅ Renders error UI when child throws
- ✅ Renders custom fallback when provided
- ✅ Calls onError callback
- ✅ Resets error state on retry

#### ErrorDisplay Tests
- ✅ Displays generic error message
- ✅ Displays API error with status code
- ✅ Displays network error
- ✅ Displays timeout error
- ✅ Calls onRetry when clicked
- ✅ Hides retry button when not provided

#### CompactErrorDisplay Tests
- ✅ Displays compact error message
- ✅ Displays retry button

#### NetworkErrorDisplay Tests
- ✅ Displays network error message
- ✅ Calls onRetry when clicked

#### OfflineBanner Tests
- ✅ Displays offline banner

#### CachedDataIndicator Tests
- ✅ Displays cached data indicator
- ✅ Displays last updated time

#### Integration Tests
- ✅ Handles multiple error states
- ✅ Error boundary catches nested errors

### Running Tests

```bash
# Run all error handling tests
npm test -- ErrorHandling.test.tsx

# Run with coverage
npm test -- ErrorHandling.test.tsx --coverage

# Run in watch mode
npm test -- ErrorHandling.test.tsx --watch
```

## User Experience

### Error Message Guidelines

**DO**:
- ✅ Use clear, non-technical language
- ✅ Explain what happened
- ✅ Provide actionable next steps
- ✅ Show retry button when applicable
- ✅ Display appropriate icons
- ✅ Maintain glassmorphic styling

**DON'T**:
- ❌ Show raw error messages
- ❌ Display stack traces to users (except dev mode)
- ❌ Use technical jargon
- ❌ Leave users without options
- ❌ Break the visual design

### Accessibility

All error components include:
- Proper ARIA roles (`role="alert"`, `role="status"`)
- ARIA live regions (`aria-live="assertive"`, `aria-live="polite"`)
- Keyboard navigation support
- Screen reader announcements
- Sufficient color contrast (WCAG AA)
- Focus indicators on interactive elements

## Future Enhancements

### PWA Offline Queue (Task 23.4)
- Queue failed requests when offline
- Sync automatically when connection restored
- Show sync status to user
- Persist queue in IndexedDB

### Error Tracking Service
- Integrate Sentry or similar service
- Log errors with context
- Track error rates
- Alert on critical errors

### Advanced Retry Strategies
- Circuit breaker pattern
- Adaptive retry delays based on error type
- User-configurable retry behavior
- Bulk retry for multiple failed requests

### Enhanced Offline Experience
- Service worker for asset caching
- Background sync for data updates
- Offline-first architecture
- Progressive enhancement

## Verification Checklist

- [x] ErrorBoundary component created
- [x] ErrorDisplay components created
- [x] useOnlineStatus hook created
- [x] Dashboard page updated with error boundaries
- [x] HeroAQISection updated with retry
- [x] HeroAQISectionLive passes retry function
- [x] PollutantMetricsGridLive has error handling
- [x] OfflineBanner displays when offline
- [x] Cached data indicator implemented
- [x] Comprehensive tests written
- [x] User-friendly error messages
- [x] Retry functionality works
- [x] Accessibility features included
- [x] Documentation complete

## Conclusion

The error handling and fallback system is now fully implemented with:

1. **Comprehensive error catching** via ErrorBoundary
2. **User-friendly error displays** with appropriate icons and messages
3. **Retry functionality** with exponential backoff
4. **Offline detection** and cached data display
5. **Accessibility support** with ARIA attributes
6. **Extensive test coverage** for all error scenarios

All error states display correctly and provide users with clear information and actionable next steps.
