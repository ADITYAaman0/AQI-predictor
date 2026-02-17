# Auto-Refresh Implementation

## Overview

This document describes the implementation of the auto-refresh functionality for the Glassmorphic AQI Dashboard (Task 8.4).

## Features Implemented

### 1. Automatic Data Refresh (5-minute interval)

The dashboard automatically refreshes AQI data every 5 minutes using TanStack Query's built-in `refetchInterval` feature.

**Configuration:**
- Location: `dashboard/lib/api/hooks/useCurrentAQI.ts`
- Refresh interval: 300,000ms (5 minutes)
- Stale time: 240,000ms (4 minutes)
- Cache time: 600,000ms (10 minutes)

**How it works:**
```typescript
const { data, refetch, isFetching } = useCurrentAQI({ 
  location: 'Delhi',
  refetchInterval: 5 * 60 * 1000, // 5 minutes
});
```

TanStack Query automatically:
- Refetches data every 5 minutes
- Maintains cache for 10 minutes
- Marks data as stale after 4 minutes
- Retries failed requests with exponential backoff

### 2. Manual Refresh Button

A glassmorphic refresh button allows users to manually trigger data refresh.

**Component:** `dashboard/components/common/RefreshButton.tsx`

**Features:**
- Glassmorphic styling with backdrop blur
- Spinning animation during refresh
- Disabled state when offline or already refreshing
- Keyboard accessible (Tab, Enter)
- Prevents multiple simultaneous refreshes
- Configurable size (small, medium, large)
- Optional label text

**Usage:**
```tsx
<RefreshButton
  onRefresh={handleRefresh}
  disabled={!isOnline || isFetching}
  size="medium"
  showLabel={false}
/>
```

**Props:**
- `onRefresh`: Callback function to trigger refresh
- `disabled`: Whether the button is disabled
- `size`: Button size variant ('small' | 'medium' | 'large')
- `showLabel`: Show label text next to icon
- `className`: Additional CSS classes

### 3. Data Freshness Indicator

A real-time indicator showing when data was last updated and countdown to next refresh.

**Component:** `dashboard/components/common/DataFreshnessIndicator.tsx`

**Features:**
- Real-time countdown to next refresh
- Relative time display (e.g., "2 minutes ago", "just now")
- Visual freshness indicator (green/yellow/red dot)
- Offline mode indicator
- Refreshing state display
- Updates every second

**Freshness Levels:**
- **Fresh** (green): Data updated within last 2.5 minutes
- **Stale** (yellow): Data updated 2.5-5 minutes ago
- **Old** (red): Data updated more than 5 minutes ago

**Usage:**
```tsx
<DataFreshnessIndicator
  lastUpdated={aqiData.lastUpdated}
  refreshInterval={5 * 60 * 1000}
  isOffline={!isOnline}
  isRefreshing={isFetching}
  showCountdown={true}
/>
```

**Props:**
- `lastUpdated`: Timestamp of last data update (ISO string or Date)
- `refreshInterval`: Refresh interval in milliseconds (default: 5 minutes)
- `isOffline`: Whether the app is offline
- `isRefreshing`: Whether data is currently being fetched
- `showCountdown`: Show countdown to next refresh
- `className`: Additional CSS classes

## Integration

### Dashboard Page (`dashboard/app/page.tsx`)

The auto-refresh functionality is integrated into the main dashboard page:

```tsx
export default function DashboardHome() {
  const defaultLocation = 'Delhi';
  const isOnline = useOnlineStatus();

  // Get query result for manual refresh and data freshness
  const { data: aqiData, refetch, isFetching } = useCurrentAQI({ 
    location: defaultLocation 
  });

  // Manual refresh handler
  const handleRefresh = async () => {
    await refetch();
  };

  return (
    <div>
      {/* Dashboard content */}
      
      {/* Data Freshness Indicator and Refresh Button */}
      <div className="flex items-center justify-center gap-4">
        {aqiData?.lastUpdated && (
          <DataFreshnessIndicator
            lastUpdated={aqiData.lastUpdated}
            refreshInterval={5 * 60 * 1000}
            isOffline={!isOnline}
            isRefreshing={isFetching}
            showCountdown={true}
          />
        )}
        
        <RefreshButton
          onRefresh={handleRefresh}
          disabled={!isOnline || isFetching}
          size="medium"
        />
      </div>
    </div>
  );
}
```

## Testing

### Unit Tests

**RefreshButton Tests** (`dashboard/components/common/__tests__/RefreshButton.test.tsx`):
- ✅ Renders refresh button
- ✅ Calls onRefresh when clicked
- ✅ Shows spinning animation during refresh
- ✅ Disables button when disabled prop is true
- ✅ Does not call onRefresh when disabled
- ✅ Shows label when showLabel is true
- ✅ Applies different size classes
- ✅ Is keyboard accessible
- ✅ Prevents multiple simultaneous refreshes

**DataFreshnessIndicator Tests** (`dashboard/components/common/__tests__/DataFreshnessIndicator.test.tsx`):
- ✅ Renders freshness indicator
- ✅ Displays relative time correctly
- ✅ Shows countdown to next refresh
- ✅ Hides countdown when showCountdown is false
- ✅ Shows offline indicator when offline
- ✅ Shows refreshing state
- ✅ Updates time display every second
- ✅ Shows fresh indicator for recent data
- ✅ Shows stale indicator for older data
- ✅ Shows old indicator for very old data
- ✅ Accepts ISO string as lastUpdated
- ✅ Formats countdown correctly

### Integration Tests

**Auto-Refresh Integration Tests** (`dashboard/components/common/__tests__/AutoRefresh.integration.test.tsx`):
- ✅ Displays refresh button and freshness indicator together
- ✅ Manual refresh updates the freshness indicator
- ✅ Shows countdown to next refresh
- ✅ Disables refresh button when offline
- ✅ Shows refreshing state in both components
- ✅ Countdown updates every second
- ✅ Freshness indicator changes color based on data age

## Requirements Validation

### Requirement 19.1: Historical Data and Trends
✅ **Implemented**: Dashboard displays calendar heatmap and line charts with auto-refresh

### Requirement 19.2: Real-time Updates
✅ **Implemented**: Data refreshes automatically every 5 minutes

**Acceptance Criteria Met:**
- ✅ Dashboard updates AQI data every 5 minutes using polling
- ✅ Smooth transitions when new data arrives (1.5s animation)
- ✅ "Last updated" timestamp displayed in hero section
- ✅ Loading state with pulse animation while fetching
- ✅ Cached data indicator when backend unavailable
- ✅ Manual refresh button for on-demand updates

## User Experience

### Visual Feedback

1. **During Refresh:**
   - Refresh button shows spinning animation
   - Data freshness indicator shows "Refreshing..."
   - Freshness dot pulses

2. **After Refresh:**
   - Timestamp updates to "just now"
   - Countdown resets to 5 minutes
   - Freshness indicator turns green

3. **When Offline:**
   - Refresh button is disabled
   - Indicator shows "Offline - Showing cached data"
   - Freshness dot turns gray

### Accessibility

- ✅ Refresh button is keyboard accessible (Tab, Enter)
- ✅ ARIA labels for screen readers
- ✅ Focus indicators visible
- ✅ Disabled state clearly indicated
- ✅ Status updates announced to screen readers

## Performance

- **Minimal Re-renders**: Only components using the query data re-render
- **Efficient Updates**: TanStack Query handles caching and deduplication
- **Background Refresh**: Refresh happens in background without blocking UI
- **Optimistic Updates**: UI remains responsive during refresh

## Future Enhancements

1. **WebSocket Support**: Replace polling with WebSocket for true real-time updates
2. **Configurable Interval**: Allow users to customize refresh interval
3. **Smart Refresh**: Adjust refresh rate based on data volatility
4. **Refresh on Focus**: Automatically refresh when user returns to tab
5. **Network-Aware**: Adjust refresh strategy based on connection quality

## Files Modified/Created

### Created:
- `dashboard/components/common/RefreshButton.tsx`
- `dashboard/components/common/DataFreshnessIndicator.tsx`
- `dashboard/components/common/__tests__/RefreshButton.test.tsx`
- `dashboard/components/common/__tests__/DataFreshnessIndicator.test.tsx`
- `dashboard/components/common/__tests__/AutoRefresh.integration.test.tsx`
- `dashboard/AUTO_REFRESH_IMPLEMENTATION.md`

### Modified:
- `dashboard/components/common/index.ts` - Added exports for new components
- `dashboard/app/page.tsx` - Integrated refresh button and freshness indicator

## Conclusion

The auto-refresh functionality has been successfully implemented with:
- ✅ Automatic 5-minute refresh interval
- ✅ Manual refresh button with glassmorphic styling
- ✅ Real-time data freshness indicator with countdown
- ✅ Comprehensive test coverage
- ✅ Excellent user experience with visual feedback
- ✅ Full accessibility support
- ✅ Offline mode handling

The implementation meets all requirements and provides a polished, production-ready feature.
