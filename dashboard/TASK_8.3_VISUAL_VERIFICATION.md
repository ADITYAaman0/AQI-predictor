# Task 8.3: Error Handling - Visual Verification Guide

## How to Verify Error Handling Implementation

This guide helps you visually verify that all error handling features are working correctly.

## 1. Error Boundary Verification

### Test: Component Error Handling

**Steps**:
1. Start the development server: `npm run dev`
2. Navigate to `http://localhost:3000`
3. Open browser DevTools Console
4. Temporarily modify a component to throw an error:
   ```tsx
   // In any component
   throw new Error('Test error');
   ```
5. Refresh the page

**Expected Result**:
- ✅ Error boundary catches the error
- ✅ Displays "Something went wrong" message
- ✅ Shows error icon in glassmorphic card
- ✅ "Try Again" button is visible
- ✅ In development mode, error details are shown
- ✅ Rest of the app continues to work

**Visual Check**:
```
┌─────────────────────────────────────┐
│  🔴 Something went wrong            │
│                                     │
│  We encountered an unexpected      │
│  error. Please try refreshing      │
│  the page.                         │
│                                     │
│  [Error Details (Dev Only)]        │
│                                     │
│  [ 🔄 Try Again ]                  │
└─────────────────────────────────────┘
```

## 2. Network Error Verification

### Test: Offline Mode

**Steps**:
1. Start the development server
2. Open browser DevTools
3. Go to Network tab
4. Select "Offline" from throttling dropdown
5. Refresh the page or wait for auto-refresh

**Expected Result**:
- ✅ Orange "You are offline" banner appears at top
- ✅ Error displays show "Connection Error" with WiFi icon
- ✅ Message: "Unable to connect. Please check your internet connection."
- ✅ "Try Again" or "Retry Connection" button visible
- ✅ Data freshness indicator shows "Showing cached data"
- ✅ Cached data is displayed if available

**Visual Check**:
```
┌─────────────────────────────────────┐
│ 📡 You are offline - Showing cached │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  📶 No Connection                   │
│                                     │
│  Unable to connect to the server.  │
│  Please check your internet        │
│  connection.                       │
│                                     │
│  [ 🔄 Retry Connection ]           │
└─────────────────────────────────────┘
```

### Test: Network Error Recovery

**Steps**:
1. While offline, click "Retry Connection" button
2. Go back online (disable offline mode in DevTools)
3. Click "Retry Connection" again

**Expected Result**:
- ✅ Offline banner disappears
- ✅ Data loads successfully
- ✅ Error displays are replaced with actual data
- ✅ Loading states show briefly during fetch
- ✅ Success state displays with fresh data

## 3. API Error Verification

### Test: Server Error (500)

**Steps**:
1. Temporarily modify API client to simulate 500 error:
   ```typescript
   // In lib/api/client.ts
   throw new APIError('Server error', 500);
   ```
2. Refresh the page

**Expected Result**:
- ✅ Displays "Server Error" with server icon
- ✅ Message: "Server error. Please try again later."
- ✅ "Try Again" button visible
- ✅ Glassmorphic styling maintained

**Visual Check**:
```
┌─────────────────────────────────────┐
│  🖥️ Server Error                    │
│                                     │
│  Server error. Please try again    │
│  later.                            │
│                                     │
│  [ 🔄 Try Again ]                  │
└─────────────────────────────────────┘
```

### Test: Timeout Error (408)

**Steps**:
1. Simulate timeout by modifying API client:
   ```typescript
   throw new APIError('Request timeout', 408);
   ```
2. Refresh the page

**Expected Result**:
- ✅ Displays "Request Timeout" with clock icon
- ✅ Message: "Request timed out. Please try again."
- ✅ "Try Again" button visible

**Visual Check**:
```
┌─────────────────────────────────────┐
│  ⏰ Request Timeout                 │
│                                     │
│  Request timed out. Please try     │
│  again.                            │
│                                     │
│  [ 🔄 Try Again ]                  │
└─────────────────────────────────────┘
```

### Test: Not Found Error (404)

**Steps**:
1. Simulate 404 by modifying API client:
   ```typescript
   throw new APIError('Location not found', 404);
   ```
2. Refresh the page

**Expected Result**:
- ✅ Displays "Not Found" with X icon
- ✅ Message: "Location not found."
- ✅ Appropriate error styling

### Test: Rate Limit Error (429)

**Steps**:
1. Simulate rate limit:
   ```typescript
   throw new APIError('Too many requests', 429);
   ```
2. Refresh the page

**Expected Result**:
- ✅ Displays "Too Many Requests"
- ✅ Message: "Too many requests. Please wait a moment."
- ✅ "Try Again" button visible

## 4. Retry Functionality Verification

### Test: Manual Retry

**Steps**:
1. Trigger any error state (offline, server error, etc.)
2. Click the "Try Again" or "Retry" button
3. Observe the behavior

**Expected Result**:
- ✅ Button shows loading state (optional)
- ✅ New request is made
- ✅ If successful, error is replaced with data
- ✅ If failed, error persists with updated message
- ✅ Button remains clickable for multiple retries

### Test: Automatic Retry (Exponential Backoff)

**Steps**:
1. Open browser DevTools Console
2. Trigger a retryable error (500, 503, network error)
3. Watch console logs for retry attempts

**Expected Result**:
- ✅ Console shows retry attempts: "Attempt 1/5", "Attempt 2/5", etc.
- ✅ Delays increase exponentially: 1s, 2s, 4s, 8s, 16s
- ✅ Maximum 5 retry attempts
- ✅ After max retries, error is displayed to user

**Console Output Example**:
```
[API Retry] Attempt 1/5 after 1000ms
[API Retry] Attempt 2/5 after 2000ms
[API Retry] Attempt 3/5 after 4000ms
[API Retry] Attempt 4/5 after 8000ms
[API Retry] Attempt 5/5 after 16000ms
[API Error] Max retries exceeded
```

## 5. Component-Specific Error Verification

### Test: HeroAQISection Error

**Steps**:
1. Navigate to dashboard home
2. Trigger an error in HeroAQISectionLive
3. Observe the hero section

**Expected Result**:
- ✅ Hero section shows error in glassmorphic card
- ✅ Error icon displayed (warning triangle)
- ✅ Title: "Unable to Load AQI Data"
- ✅ Error message displayed
- ✅ "Try Again" button visible and functional
- ✅ Rest of dashboard continues to work

**Visual Check**:
```
┌─────────────────────────────────────┐
│                                     │
│         ⚠️                          │
│                                     │
│    Unable to Load AQI Data         │
│                                     │
│    Failed to fetch AQI data.       │
│    Please try again.               │
│                                     │
│    [ 🔄 Try Again ]                │
│                                     │
└─────────────────────────────────────┘
```

### Test: PollutantMetricsGrid Error

**Steps**:
1. Navigate to dashboard home
2. Trigger an error in PollutantMetricsGridLive
3. Observe the pollutant section

**Expected Result**:
- ✅ Pollutant grid shows error state
- ✅ Error icon displayed
- ✅ Title: "Failed to load pollutant data"
- ✅ Error message displayed
- ✅ "Try Again" button visible and functional

**Visual Check**:
```
┌─────────────────────────────────────┐
│                                     │
│         ⚠️                          │
│                                     │
│  Failed to load pollutant data     │
│                                     │
│  An error occurred while           │
│  fetching data                     │
│                                     │
│  [ Try Again ]                     │
│                                     │
└─────────────────────────────────────┘
```

## 6. Loading States Verification

### Test: Loading Skeleton

**Steps**:
1. Clear browser cache
2. Refresh the page
3. Observe loading states

**Expected Result**:
- ✅ Hero section shows circular skeleton loader
- ✅ Pollutant cards show skeleton loaders
- ✅ Weather badges show skeleton loaders
- ✅ All skeletons have pulse animation
- ✅ Glassmorphic styling maintained
- ✅ Smooth transition to actual data

**Visual Check**:
```
┌─────────────────────────────────────┐
│                                     │
│         ⭕ (pulsing)                │
│                                     │
│    ▬▬▬▬▬▬ (pulsing)                │
│    ▬▬▬▬ (pulsing)                  │
│                                     │
└─────────────────────────────────────┘
```

## 7. Cached Data Indicator Verification

### Test: Cached Data Display

**Steps**:
1. Load the dashboard with fresh data
2. Go offline
3. Refresh the page

**Expected Result**:
- ✅ Cached data is displayed
- ✅ "Showing cached data" indicator appears
- ✅ Last updated timestamp shown
- ✅ Data freshness indicator shows offline status
- ✅ Yellow/orange color scheme for cached indicator

**Visual Check**:
```
┌─────────────────────────────────────┐
│ ⏰ Showing cached data from         │
│    5 minutes ago                    │
└─────────────────────────────────────┘

Data refreshes automatically every 5 minutes
• Showing cached data
```

## 8. Accessibility Verification

### Test: Screen Reader Announcements

**Steps**:
1. Enable screen reader (NVDA, JAWS, or VoiceOver)
2. Trigger various error states
3. Listen to announcements

**Expected Result**:
- ✅ Error messages are announced
- ✅ ARIA live regions work correctly
- ✅ Role="alert" for critical errors
- ✅ Role="status" for informational messages
- ✅ Retry buttons are properly labeled

### Test: Keyboard Navigation

**Steps**:
1. Trigger an error state
2. Use Tab key to navigate
3. Press Enter on "Try Again" button

**Expected Result**:
- ✅ Retry button is focusable
- ✅ Focus indicator is visible
- ✅ Enter key triggers retry
- ✅ Focus management is logical

## 9. Styling Verification

### Test: Glassmorphic Styling

**Steps**:
1. Trigger various error states
2. Inspect visual styling

**Expected Result**:
- ✅ All error displays use glassmorphic cards
- ✅ Background: rgba(255, 255, 255, 0.1)
- ✅ Backdrop blur: 20px
- ✅ Border: 1px rgba(255, 255, 255, 0.18)
- ✅ Rounded corners maintained
- ✅ Shadow effects present
- ✅ Consistent with overall design system

### Test: Responsive Design

**Steps**:
1. Trigger error states
2. Resize browser window (mobile, tablet, desktop)
3. Observe error displays

**Expected Result**:
- ✅ Error displays adapt to screen size
- ✅ Text remains readable on mobile
- ✅ Buttons are touch-friendly (44x44px minimum)
- ✅ Layout doesn't break on small screens
- ✅ Icons scale appropriately

## 10. Integration Verification

### Test: Multiple Simultaneous Errors

**Steps**:
1. Trigger errors in multiple components simultaneously
2. Observe behavior

**Expected Result**:
- ✅ Each component shows its own error state
- ✅ Error boundaries isolate errors
- ✅ One component's error doesn't affect others
- ✅ All retry buttons work independently

### Test: Error Recovery

**Steps**:
1. Trigger an error
2. Fix the underlying issue (go online, fix API, etc.)
3. Click retry

**Expected Result**:
- ✅ Error state clears
- ✅ Loading state shows briefly
- ✅ Success state displays with data
- ✅ No residual error indicators
- ✅ Smooth transition between states

## Verification Checklist

Use this checklist to verify all error handling features:

### Error Boundary
- [ ] Catches component errors
- [ ] Displays fallback UI
- [ ] Shows "Try Again" button
- [ ] Resets on retry
- [ ] Shows dev details in development mode

### Network Errors
- [ ] Offline banner appears when offline
- [ ] Connection error displays correctly
- [ ] Retry button works
- [ ] Cached data is shown
- [ ] Recovery works when back online

### API Errors
- [ ] 500 Server Error displays correctly
- [ ] 408 Timeout Error displays correctly
- [ ] 404 Not Found displays correctly
- [ ] 429 Rate Limit displays correctly
- [ ] User-friendly messages shown

### Retry Functionality
- [ ] Manual retry button works
- [ ] Automatic retry with exponential backoff
- [ ] Maximum retry attempts respected
- [ ] Console logs show retry attempts

### Component Errors
- [ ] HeroAQISection error state works
- [ ] PollutantMetricsGrid error state works
- [ ] Error boundaries isolate errors
- [ ] Retry buttons functional

### Loading States
- [ ] Skeleton loaders display
- [ ] Pulse animations work
- [ ] Smooth transition to data

### Cached Data
- [ ] Cached data indicator shows
- [ ] Last updated timestamp displays
- [ ] Offline status shown

### Accessibility
- [ ] Screen reader announcements work
- [ ] Keyboard navigation functional
- [ ] ARIA attributes present
- [ ] Focus indicators visible

### Styling
- [ ] Glassmorphic styling maintained
- [ ] Responsive on all screen sizes
- [ ] Icons display correctly
- [ ] Colors and contrast appropriate

### Integration
- [ ] Multiple errors handled independently
- [ ] Error recovery works smoothly
- [ ] No memory leaks
- [ ] Performance not degraded

## Conclusion

All error handling features should be visually verified using the steps above. Each error state should display correctly with appropriate styling, messages, and retry functionality.
