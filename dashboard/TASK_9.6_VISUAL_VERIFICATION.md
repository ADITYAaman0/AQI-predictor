# Task 9.6 Visual Verification Guide

## Overview
This guide helps you visually verify that Task 9.6 (Connect to forecast API) is working correctly.

## Prerequisites
1. Backend API must be running (FastAPI server)
2. Frontend dev server must be running (`npm run dev`)
3. Backend should have forecast data available for test locations

## Test Page Location
Navigate to: **http://localhost:3000/test-forecast-api**

## What to Verify

### 1. Initial Load
**Expected Behavior:**
- Page loads with a gradient background (blue → purple → pink)
- Title: "Forecast API Integration Test"
- Green checkmark badge: "✓ Task 9.6: Connect to forecast API"
- Controls section with location dropdown and confidence interval toggle
- Chart section with title "24-Hour Forecast for Delhi"

**What to Check:**
- ✅ No console errors
- ✅ Loading spinner appears briefly
- ✅ Chart renders with forecast data
- ✅ X-axis shows "Hours Ahead" (0-23)
- ✅ Y-axis shows "AQI" values
- ✅ Line/area chart displays with gradient fill

### 2. Location Switching
**Test Steps:**
1. Click the location dropdown
2. Select "Mumbai"
3. Wait for data to load

**Expected Behavior:**
- Loading spinner appears briefly
- Chart updates with Mumbai forecast data
- Title changes to "24-Hour Forecast for Mumbai"
- Chart line/area updates with new AQI values

**What to Check:**
- ✅ Smooth transition between locations
- ✅ No errors in console
- ✅ Chart data changes appropriately
- ✅ Loading state is visible during fetch

### 3. Confidence Intervals
**Test Steps:**
1. Click the confidence interval toggle switch
2. Observe the chart

**Expected Behavior:**
- Toggle switch turns green
- Text changes to "Enabled"
- Chart displays shaded confidence interval areas
- Upper and lower confidence bound lines appear (dashed)

**What to Check:**
- ✅ Confidence interval shading is visible
- ✅ Shaded area is semi-transparent
- ✅ Upper and lower bound lines are dashed
- ✅ Tooltip shows confidence interval values when hovering

### 4. Interactive Tooltips
**Test Steps:**
1. Hover over different points on the chart line
2. Move mouse along the chart

**Expected Behavior:**
- Tooltip appears on hover
- Tooltip shows:
  - AQI value (large, color-coded)
  - AQI category (e.g., "Good", "Moderate")
  - Formatted timestamp (e.g., "Jan 1, 3:00 PM")
  - Confidence interval (if enabled)
- 8px circle appears at the hovered data point
- Vertical cursor line follows mouse

**What to Check:**
- ✅ Tooltip appears smoothly
- ✅ AQI value is color-coded correctly
- ✅ Timestamp is formatted properly
- ✅ Confidence values appear when enabled
- ✅ Circle indicator appears at data point
- ✅ Console logs hover events (check browser console)

### 5. Chart Animations
**Test Steps:**
1. Switch to a different location
2. Watch the chart as it loads

**Expected Behavior:**
- Line draws from left to right (2-second animation)
- Smooth ease-out animation
- Gradient fill animates with the line

**What to Check:**
- ✅ Animation is smooth (60fps)
- ✅ No flickering or jumps
- ✅ Animation completes in ~2 seconds

### 6. AQI Threshold Lines
**What to Check:**
- ✅ Horizontal dashed lines at AQI thresholds:
  - 50 (green) - Good/Moderate boundary
  - 100 (yellow) - Moderate/Unhealthy for Sensitive boundary
  - 150 (orange) - Unhealthy for Sensitive/Unhealthy boundary
  - 200 (red) - Unhealthy/Very Unhealthy boundary
  - 300 (dark red) - Very Unhealthy/Hazardous boundary
- ✅ Threshold values labeled on the right side
- ✅ Lines are subtle and don't overpower the data

### 7. Gradient Fill Colors
**What to Check:**
- ✅ Line color matches AQI category:
  - Green (#4ADE80) for Good (0-50)
  - Yellow (#FCD34D) for Moderate (51-100)
  - Orange (#FB923C) for Unhealthy for Sensitive (101-150)
  - Red (#EF4444) for Unhealthy (151-200)
  - Dark Red (#DC2626) for Very Unhealthy (201-300)
  - Maroon (#7C2D12) for Hazardous (301+)
- ✅ Gradient fill under line matches line color
- ✅ Gradient fades from opaque at top to transparent at bottom

### 8. Error Handling (Optional)
**Test Steps:**
1. Stop the backend API server
2. Switch to a different location
3. Observe the error state

**Expected Behavior:**
- Loading spinner appears
- After timeout, error message displays:
  - ⚠️ icon
  - "Failed to load forecast data"
  - Error message (e.g., "Unable to connect...")
  - "Retry" button
- Clicking "Retry" attempts to fetch data again

**What to Check:**
- ✅ Error state is user-friendly
- ✅ No raw error details exposed
- ✅ Retry button works
- ✅ Error message is clear

### 9. Responsive Design
**Test Steps:**
1. Resize browser window to different widths
2. Test on mobile viewport (DevTools)

**Expected Behavior:**
- Chart adapts to container width
- Controls stack vertically on mobile
- Text remains readable at all sizes
- Touch targets are adequate on mobile

**What to Check:**
- ✅ Chart is responsive
- ✅ No horizontal scrolling
- ✅ Controls are usable on mobile
- ✅ Text doesn't overflow

### 10. Performance
**What to Check:**
- ✅ Initial load is fast (<2 seconds)
- ✅ Location switching is smooth
- ✅ No lag when hovering over chart
- ✅ Animations are smooth (60fps)
- ✅ No memory leaks (check DevTools Performance tab)

## Common Issues and Solutions

### Issue: Chart doesn't load
**Solution:**
- Check that backend API is running
- Verify API endpoint is accessible: `http://localhost:8000/api/v1/forecast/24h/Delhi`
- Check browser console for errors
- Verify environment variables are set correctly

### Issue: Loading spinner never disappears
**Solution:**
- Check network tab for failed requests
- Verify backend is responding
- Check for CORS errors
- Restart both frontend and backend servers

### Issue: Confidence intervals don't show
**Solution:**
- Ensure toggle is enabled (green)
- Check that backend returns confidence data
- Verify `showConfidenceInterval` prop is true
- Check console for errors

### Issue: Tooltips don't appear
**Solution:**
- Ensure you're hovering directly over the chart line
- Check that chart has data
- Verify no CSS issues blocking tooltips
- Check browser console for errors

### Issue: Animations are choppy
**Solution:**
- Close other browser tabs
- Check CPU usage
- Disable browser extensions
- Try a different browser

## Success Criteria

All of the following should be true:

- ✅ Chart loads with real forecast data
- ✅ Location switching works smoothly
- ✅ Confidence intervals display correctly
- ✅ Tooltips show accurate information
- ✅ Animations are smooth
- ✅ Error handling works properly
- ✅ No console errors
- ✅ Performance is acceptable
- ✅ Responsive design works on mobile

## Screenshots to Capture

For documentation purposes, capture screenshots of:

1. Initial page load with Delhi forecast
2. Chart with confidence intervals enabled
3. Tooltip showing AQI details
4. Different location (e.g., Mumbai)
5. Error state (if testing)
6. Mobile view

## Next Steps

After verification:
1. Mark Task 9.6 as complete ✅
2. Proceed to Task 9.7: Write PredictionGraph tests
3. Document any issues found
4. Update requirements if needed

---

**Last Updated:** 2024-01-01  
**Task:** 9.6 Connect to forecast API  
**Status:** ✅ COMPLETED
