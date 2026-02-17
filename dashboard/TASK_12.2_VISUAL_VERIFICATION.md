# Task 12.2 Visual Verification Guide: CalendarHeatmap Component

## Quick Start

1. **Start the development server**:
   ```bash
   cd dashboard
   npm run dev
   ```

2. **Open the test page**:
   Navigate to: `http://localhost:3000/test-calendar-heatmap`

## Visual Checklist

### ✅ Calendar Grid Layout
- [ ] Calendar displays in a 7-column grid (Sun-Sat)
- [ ] Weekday headers are visible and properly labeled
- [ ] Days are arranged in proper week rows
- [ ] Current month days are fully visible
- [ ] Previous/next month days are dimmed (if visible)

### ✅ Color Intensity Mapping
Verify that colors match AQI levels:
- [ ] **Green (#4ADE80)**: AQI 0-50 (Good)
- [ ] **Yellow (#FCD34D)**: AQI 51-100 (Moderate)
- [ ] **Orange (#FB923C)**: AQI 101-150 (Unhealthy for Sensitive Groups)
- [ ] **Red (#EF4444)**: AQI 151-200 (Unhealthy)
- [ ] **Dark Red (#B91C1C)**: AQI 201-300 (Very Unhealthy)
- [ ] **Brown (#7C2D12)**: AQI 301+ (Hazardous)

### ✅ Interactive Features
- [ ] Hover over a day with data shows tooltip
- [ ] Tooltip displays:
  - Full date (e.g., "Jan 15, 2024")
  - AQI value with colored dot
  - Category label (e.g., "Good", "Unhealthy")
- [ ] Tooltip disappears when mouse leaves
- [ ] Days without data don't show tooltips
- [ ] Clicking a day with data triggers callback (check console or selected date display)
- [ ] Hover effect scales up the day cell slightly

### ✅ Month Navigation
- [ ] Previous month button (left arrow) works
- [ ] Next month button (right arrow) works
- [ ] Current month label updates correctly
- [ ] Calendar grid updates to show new month
- [ ] Navigation buttons have hover effects

### ✅ Day Cell Display
- [ ] Day number is visible on all cells
- [ ] AQI value is displayed on cells with data
- [ ] Text is readable (white on colored background)
- [ ] Cells are properly sized and spaced

### ✅ Glassmorphic Styling
- [ ] Card has frosted glass effect
- [ ] Background is semi-transparent
- [ ] Border is subtle and visible
- [ ] Shadow provides depth
- [ ] Consistent with other dashboard components

### ✅ Legend
- [ ] All 6 AQI categories are shown
- [ ] Color squares match the actual colors used
- [ ] Labels are clear and readable
- [ ] AQI ranges are displayed correctly

### ✅ Loading State
- [ ] Toggle "Show Loading State" button
- [ ] Skeleton loaders appear
- [ ] Animation is smooth (pulse effect)
- [ ] Layout is preserved during loading

### ✅ Empty State
- [ ] Scroll to "Empty Data" section
- [ ] Calendar grid still displays
- [ ] Days are visible but without AQI values
- [ ] No errors in console

### ✅ Responsive Design
Test at different screen sizes:
- [ ] **Desktop (1440px+)**: Full layout with proper spacing
- [ ] **Tablet (768-1439px)**: Adjusted spacing, still readable
- [ ] **Mobile (<768px)**: Compact layout, still functional

### ✅ Accessibility
- [ ] Navigation buttons have aria-labels
- [ ] Can tab through interactive elements
- [ ] Focus indicators are visible
- [ ] Screen reader announces content (if testing with screen reader)

## Test Scenarios

### Scenario 1: Default Calendar
1. View the "Default Calendar Heatmap" section
2. Verify current month is displayed
3. Hover over several days with different AQI levels
4. Verify colors match the legend
5. Click on a day and verify selected date info updates

### Scenario 2: Month Navigation
1. Click "Previous Month" button multiple times
2. Verify month label updates
3. Verify calendar grid updates
4. Click "Next Month" to return
5. Verify navigation is smooth

### Scenario 3: Custom Title
1. View the "Custom Title" section
2. Verify title displays "Air Quality History - Delhi"
3. Verify functionality is the same as default

### Scenario 4: Empty Data
1. View the "Empty Data" section
2. Verify calendar grid displays
3. Verify no AQI values are shown
4. Verify no tooltips appear on hover
5. Verify no errors in console

### Scenario 5: Specific Month
1. View the "Specific Month (January 2024)" section
2. Verify it displays January 2024
3. Verify navigation works from this starting point

### Scenario 6: Loading State
1. Click "Show Loading State" button
2. Verify all calendars show skeleton loaders
3. Click "Hide Loading State" button
4. Verify calendars return to normal

## Color Verification

Use the "Color Legend Reference" section at the bottom of the page to verify colors:

1. Compare the large color squares with the calendar day cells
2. Verify the colors match exactly
3. Check that the color intensity is appropriate for each AQI level

## Performance Checks

- [ ] Calendar renders quickly (< 1 second)
- [ ] Month navigation is instant
- [ ] Hover effects are smooth (60fps)
- [ ] No lag when interacting with multiple calendars
- [ ] No console errors or warnings

## Browser Testing

Test in multiple browsers:
- [ ] Chrome/Edge (Chromium)
- [ ] Firefox
- [ ] Safari (if on macOS)

## Common Issues to Check

1. **Colors not displaying**: Check if inline styles are applied to buttons
2. **Tooltips not showing**: Verify hover state management
3. **Month navigation not working**: Check state updates
4. **Layout issues**: Verify CSS Grid support
5. **Glassmorphism not visible**: Check backdrop-filter support

## Expected Behavior Summary

The CalendarHeatmap component should:
1. Display a calendar grid with proper week structure
2. Show AQI values with color-coded intensity
3. Provide interactive tooltips with detailed information
4. Allow month navigation
5. Handle loading and empty states gracefully
6. Maintain glassmorphic styling throughout
7. Be fully responsive across all screen sizes
8. Be accessible via keyboard and screen readers

## Screenshots to Capture

For documentation purposes, capture:
1. Full calendar view with data
2. Tooltip on hover
3. Month navigation in action
4. Loading state
5. Empty state
6. Mobile view
7. Color legend

## Sign-off

Once all items are verified:
- [ ] All visual checks passed
- [ ] All interactive features work
- [ ] All test scenarios completed
- [ ] No console errors
- [ ] Performance is acceptable
- [ ] Responsive design works
- [ ] Accessibility features present

**Verified by**: _________________
**Date**: _________________
**Notes**: _________________

---

## Next Steps After Verification

1. Integrate into Insights page (Task 13.1)
2. Connect to historical data API (Task 12.3)
3. Add statistics calculation (Task 12.4)
4. Write property-based tests (Task 12.5)

