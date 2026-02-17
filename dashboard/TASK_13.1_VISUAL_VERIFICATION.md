# Task 13.1 Visual Verification Guide

## Task: Create Insights Page Layout

### Overview
This guide helps verify that the insights page layout has been implemented correctly with all required sections.

### Requirements Validated
- **Requirement 16.6**: Insights page with source attribution, historical trends, and comparative analysis

### What Was Implemented

1. **Complete Page Layout**
   - Page header with title and description
   - Date range selector (7 days, 30 days, 90 days)
   - Five main sections organized vertically
   - Back to dashboard navigation link

2. **Section 1: Source Attribution**
   - Displays pollution source breakdown
   - Uses SourceAttributionCardConnected component
   - Shows vehicular, industrial, biomass, and background percentages

3. **Section 2: Statistics Overview**
   - Displays key statistics (min, max, mean, median AQI)
   - Uses StatisticsGrid component
   - Only shown when historical data is available

4. **Section 3: Historical Trends**
   - Line chart showing AQI trends over time
   - Uses HistoricalTrendsChart component
   - Wrapped in glassmorphic card
   - Title updates based on selected date range

5. **Section 4: Calendar View**
   - Calendar heatmap showing daily AQI values
   - Uses CalendarHeatmap component
   - Color intensity based on pollution level
   - Wrapped in glassmorphic card

6. **Section 5: Comparative Analysis**
   - Current vs Average comparison card
   - Best vs Worst Days comparison card
   - Trend indicator (improving/worsening)
   - Responsive grid layout (1 column mobile, 2 columns desktop)

### Visual Verification Steps

#### 1. Start the Development Server
```bash
cd dashboard
npm run dev
```

#### 2. Navigate to Insights Page
- Open browser to `http://localhost:3000/insights`
- Or click "Insights" in the top navigation from the dashboard

#### 3. Verify Page Header
- [ ] Page title "Insights & Analytics" is displayed
- [ ] Subtitle mentions "Historical trends, source attribution, and comparative analysis for Delhi"
- [ ] Text is white and clearly visible against gradient background

#### 4. Verify Date Range Selector
- [ ] Three buttons are displayed: "7 Days", "30 Days", "90 Days"
- [ ] "30 Days" button is selected by default (has white/30 background)
- [ ] Clicking each button changes the selection
- [ ] Selected button has brighter background
- [ ] Unselected buttons have semi-transparent background

#### 5. Verify Source Attribution Section
- [ ] Section header "Source Attribution" is displayed
- [ ] SourceAttributionCardConnected component renders
- [ ] Shows donut/pie chart with pollution sources
- [ ] Displays percentages for each source

#### 6. Verify Statistics Overview Section
- [ ] Section header "Statistics Overview" is displayed
- [ ] StatisticsGrid component renders
- [ ] Shows min, max, mean, and median AQI values
- [ ] Statistics cards have glassmorphic styling

#### 7. Verify Historical Trends Section
- [ ] Section header "Historical Trends" is displayed
- [ ] HistoricalTrendsChart component renders inside glassmorphic card
- [ ] Chart title updates based on selected date range
- [ ] Line chart shows AQI trends over time
- [ ] Chart has proper glassmorphic background

#### 8. Verify Calendar View Section
- [ ] Section header "Calendar View" is displayed
- [ ] CalendarHeatmap component renders inside glassmorphic card
- [ ] Calendar shows daily AQI values
- [ ] Color intensity corresponds to pollution level
- [ ] Calendar has proper glassmorphic background

#### 9. Verify Comparative Analysis Section
- [ ] Section header "Comparative Analysis" is displayed
- [ ] Description text is displayed
- [ ] Two comparison cards are shown side by side on desktop
- [ ] Cards stack vertically on mobile

**Current vs Average Card:**
- [ ] Shows "Current AQI" value
- [ ] Shows "Period Average" value
- [ ] Shows "Trend" with arrow indicator
- [ ] Trend is green (↓ Improving) or red (↑ Worsening)

**Best vs Worst Days Card:**
- [ ] Shows "Best Day" in green
- [ ] Shows "Worst Day" in red
- [ ] Shows "Range" in white
- [ ] All values are calculated correctly

#### 10. Verify Responsive Design
**Desktop (≥1024px):**
- [ ] All sections are clearly visible
- [ ] Comparative analysis cards are side by side
- [ ] Proper spacing between sections
- [ ] Content is centered with max-width

**Tablet (768px - 1023px):**
- [ ] Layout adapts appropriately
- [ ] Comparative analysis cards may stack
- [ ] All content remains readable

**Mobile (<768px):**
- [ ] Single column layout
- [ ] Comparative analysis cards stack vertically
- [ ] Date range buttons remain horizontal
- [ ] All text is readable

#### 11. Verify Glassmorphic Styling
- [ ] All cards have semi-transparent white background
- [ ] Backdrop blur effect is visible
- [ ] White borders are subtle
- [ ] Shadow effects add depth
- [ ] Consistent styling across all sections

#### 12. Verify Navigation
- [ ] "Back to Dashboard" link is displayed at bottom
- [ ] Link has hover effect (scale and background change)
- [ ] Clicking link navigates to home page

#### 13. Verify Loading States
- [ ] Loading spinner shows while fetching historical data
- [ ] Components handle loading state gracefully
- [ ] No layout shift when data loads

#### 14. Verify Error Handling
To test error handling, you can temporarily modify the API hook to return an error:
- [ ] Error message displays when data fetch fails
- [ ] Error display has retry button
- [ ] Page remains functional even with errors

### Expected Behavior

1. **Initial Load**
   - Page loads with 30-day date range selected
   - All sections render with loading states
   - Data populates when API calls complete

2. **Date Range Selection**
   - Clicking different date ranges updates the data
   - Historical trends chart title updates
   - Statistics recalculate for new range
   - Calendar view updates to show relevant dates

3. **Data Display**
   - All sections show real data from API
   - Comparative analysis calculations are accurate
   - Trend indicators show correct direction
   - Color coding matches AQI levels

4. **Responsive Behavior**
   - Layout adapts smoothly to different screen sizes
   - No horizontal scrolling on mobile
   - Touch targets are appropriately sized
   - Text remains readable at all sizes

### Common Issues and Solutions

**Issue: Components not rendering**
- Solution: Check that all components are properly exported from `components/insights/index.ts`
- Solution: Verify imports in the page file

**Issue: Historical data not loading**
- Solution: Check that the API endpoint is accessible
- Solution: Verify the useHistoricalData hook is working correctly
- Solution: Check browser console for API errors

**Issue: Styling looks incorrect**
- Solution: Verify Tailwind CSS is properly configured
- Solution: Check that glassmorphic utility classes are defined
- Solution: Clear browser cache and rebuild

**Issue: Date range selector not working**
- Solution: Check that state is updating correctly
- Solution: Verify the date calculation logic
- Solution: Check that the API is being called with correct dates

### Test Results

Run the automated tests:
```bash
npm test -- app/insights/__tests__/page.test.tsx
```

Expected output:
- ✓ All 17 tests should pass
- ✓ No console errors or warnings
- ✓ Test coverage for all major functionality

### Completion Checklist

- [x] Page layout implemented with all 5 sections
- [x] Source attribution section integrated
- [x] Historical trends section integrated
- [x] Comparative analysis section implemented
- [x] Date range selector functional
- [x] Responsive design implemented
- [x] Glassmorphic styling applied
- [x] Error handling implemented
- [x] Loading states handled
- [x] Navigation links working
- [x] All automated tests passing
- [x] TypeScript compilation successful
- [x] No console errors

### Next Steps

After visual verification:
1. Test with real API data
2. Verify on multiple browsers (Chrome, Firefox, Safari, Edge)
3. Test on actual mobile devices
4. Verify accessibility with screen reader
5. Check performance with Lighthouse
6. Move to Task 13.2: Implement comparative analysis (if needed)

### Notes

- The comparative analysis section is already implemented in this task
- Task 13.2 may be redundant or can focus on additional analysis features
- Consider adding more advanced comparisons (week-over-week, month-over-month)
- Could add export functionality for insights data
