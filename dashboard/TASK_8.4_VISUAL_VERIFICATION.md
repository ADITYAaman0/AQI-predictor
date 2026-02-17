# Task 8.4 Visual Verification Guide

## Auto-Refresh Implementation

This guide helps you verify that the auto-refresh functionality is working correctly.

## What to Look For

### 1. Data Freshness Indicator

**Location:** Bottom center of the dashboard, below the pollutant cards

**Expected Behavior:**
- Shows a colored dot (green/yellow/red) indicating data freshness
- Displays relative time: "Updated just now", "Updated 2 minutes ago", etc.
- Shows countdown: "Next refresh in 4m 32s"
- Updates every second

**Visual States:**

#### Fresh Data (Green Dot)
```
🟢 Updated just now • Next refresh in 4m 59s
```
- Appears when data was updated within last 2.5 minutes
- Green dot indicates fresh data

#### Stale Data (Yellow Dot)
```
🟡 Updated 3 minutes ago • Next refresh in 1m 45s
```
- Appears when data is 2.5-5 minutes old
- Yellow dot indicates data is getting stale

#### Old Data (Red Dot)
```
🔴 Updated 6 minutes ago • Next refresh in 0s
```
- Appears when data is more than 5 minutes old
- Red dot indicates data needs refresh

#### Offline Mode
```
⚪ Offline - Showing cached data
```
- Gray dot when offline
- No countdown shown

#### Refreshing State
```
🟢 Refreshing...
```
- Dot pulses during refresh
- Text changes to "Refreshing..."

### 2. Manual Refresh Button

**Location:** Next to the data freshness indicator

**Expected Appearance:**
- Circular button with glassmorphic effect
- Refresh icon (circular arrows)
- Semi-transparent white background
- Subtle border and shadow

**Expected Behavior:**

#### Normal State
- Button is clickable
- Hover effect: lifts slightly, shadow enhances
- Click effect: scales down briefly

#### Refreshing State
- Icon spins continuously
- Button is disabled (can't click again)
- Lasts minimum 500ms for good UX

#### Offline State
- Button is disabled
- Appears grayed out
- Cursor shows "not-allowed"

### 3. Automatic Refresh

**Expected Behavior:**
- Data automatically refreshes every 5 minutes
- No page reload or jarring transitions
- Smooth value updates with animations
- Countdown resets to 5 minutes after refresh

**How to Test:**
1. Load the dashboard
2. Note the "Updated just now" timestamp
3. Wait and watch the countdown decrease
4. After 5 minutes, data should refresh automatically
5. Timestamp should reset to "just now"
6. Countdown should reset to "4m 59s"

## Testing Checklist

### Visual Tests

- [ ] Data freshness indicator is visible
- [ ] Refresh button is visible and styled correctly
- [ ] Green dot appears for fresh data
- [ ] Yellow dot appears for stale data (wait 3 minutes)
- [ ] Red dot appears for old data (wait 6 minutes)
- [ ] Countdown updates every second
- [ ] Relative time updates correctly

### Interaction Tests

- [ ] Click refresh button - icon spins
- [ ] Click refresh button - data updates
- [ ] Click refresh button - timestamp resets
- [ ] Hover refresh button - lift effect works
- [ ] Tab to refresh button - focus indicator visible
- [ ] Press Enter on focused button - triggers refresh
- [ ] Multiple rapid clicks - only one refresh happens

### Automatic Refresh Tests

- [ ] Wait 5 minutes - data refreshes automatically
- [ ] Countdown reaches 0 - refresh triggers
- [ ] After auto-refresh - timestamp resets
- [ ] After auto-refresh - countdown resets
- [ ] During auto-refresh - "Refreshing..." appears

### Offline Tests

- [ ] Disconnect network - offline indicator appears
- [ ] Offline mode - refresh button is disabled
- [ ] Offline mode - gray dot appears
- [ ] Offline mode - "Showing cached data" text appears
- [ ] Reconnect network - normal state resumes

### Responsive Tests

- [ ] Desktop (≥1440px) - components centered, side by side
- [ ] Tablet (768-1439px) - components centered, side by side
- [ ] Mobile (<768px) - components stacked or side by side

## Expected Layout

### Desktop/Tablet
```
┌─────────────────────────────────────────────────┐
│                                                 │
│              [Dashboard Content]                │
│                                                 │
├─────────────────────────────────────────────────┤
│                                                 │
│  🟢 Updated just now • Next refresh in 4m 32s  │
│                      [🔄]                       │
│                                                 │
│      Data refreshes automatically every 5       │
│                   minutes                       │
└─────────────────────────────────────────────────┘
```

### Mobile
```
┌──────────────────────┐
│                      │
│  [Dashboard Content] │
│                      │
├──────────────────────┤
│                      │
│  🟢 Updated just now │
│  Next refresh in 4m  │
│         [🔄]         │
│                      │
│  Auto-refresh: 5min  │
└──────────────────────┘
```

## Accessibility Verification

### Keyboard Navigation
1. Press Tab repeatedly until refresh button is focused
2. Verify focus indicator is visible (ring/glow)
3. Press Enter to trigger refresh
4. Verify refresh happens

### Screen Reader
1. Enable screen reader (NVDA, JAWS, VoiceOver)
2. Navigate to refresh button
3. Verify it announces: "Refresh data, button"
4. Verify disabled state announces: "Refresh data, button, disabled"
5. Verify freshness indicator text is announced

## Common Issues

### Issue: Countdown not updating
**Solution:** Check that JavaScript timers are working. Refresh the page.

### Issue: Refresh button does nothing
**Solution:** Check browser console for errors. Verify API is accessible.

### Issue: Auto-refresh not working
**Solution:** Check that TanStack Query is configured correctly. Verify `refetchInterval` is set.

### Issue: Timestamp shows wrong time
**Solution:** Check system clock. Verify `lastUpdated` value from API.

### Issue: Offline mode not detected
**Solution:** Check `useOnlineStatus` hook. Verify `navigator.onLine` API.

## Performance Verification

### Expected Performance
- Refresh button click response: <100ms
- Countdown update: Every 1 second
- Auto-refresh trigger: Exactly at 5 minutes
- Animation smoothness: 60fps
- No memory leaks after multiple refreshes

### How to Check
1. Open browser DevTools
2. Go to Performance tab
3. Record while clicking refresh button
4. Verify no long tasks or jank
5. Check memory usage doesn't grow over time

## Success Criteria

✅ All visual elements render correctly
✅ All interactions work as expected
✅ Automatic refresh works every 5 minutes
✅ Offline mode is handled gracefully
✅ Accessibility features work
✅ Performance is smooth (60fps)
✅ No console errors
✅ Responsive on all screen sizes

## Next Steps

After verification:
1. Test on different browsers (Chrome, Firefox, Safari, Edge)
2. Test on different devices (desktop, tablet, mobile)
3. Test with slow network connections
4. Test with intermittent connectivity
5. Gather user feedback on UX

## Notes

- The 5-minute interval is configurable in `useCurrentAQI` hook
- Countdown and freshness colors can be customized in components
- Glassmorphic styling matches the overall dashboard design
- All components are fully typed with TypeScript
- Comprehensive test coverage ensures reliability
