# Task 11.1 Visual Verification Guide

## SourceAttributionCard Component

### Quick Start

1. **Start the development server:**
   ```bash
   cd dashboard
   npm run dev
   ```

2. **Navigate to the test page:**
   ```
   http://localhost:3000/test-source-attribution
   ```

---

## Visual Verification Checklist

### 1. Chart Rendering ✓

**What to Check:**
- [ ] Donut chart renders with proper circular shape
- [ ] Inner radius creates donut hole (not a full pie)
- [ ] Chart segments are proportional to percentages
- [ ] Colors are distinct and match the legend

**Expected Behavior:**
- Chart should be centered in the container
- Segments should have small gaps (paddingAngle: 2)
- Percentages should be displayed on each segment

---

### 2. Color Coding ✓

**What to Check:**
- [ ] Vehicular: Blue (#3B82F6)
- [ ] Industrial: Red (#EF4444)
- [ ] Biomass: Amber (#F59E0B)
- [ ] Background: Gray (#6B7280)

**Expected Behavior:**
- Colors should be vibrant and easily distinguishable
- Each source should have a consistent color across all scenarios
- Colors should work well on the dark glassmorphic background

---

### 3. Legend Display ✓

**What to Check:**
- [ ] Legend items appear below the chart
- [ ] Each item shows: color dot + label + percentage
- [ ] Percentages match the chart segments
- [ ] Only non-zero sources are displayed

**Expected Behavior:**
- Legend should be aligned and well-spaced
- Color dots should be 16px circles
- Text should be readable (white/90 opacity)
- Percentages should be bold and prominent

---

### 4. Interactive Tooltips ✓

**What to Check:**
- [ ] Hover over chart segments shows tooltip
- [ ] Tooltip displays source name and percentage
- [ ] Tooltip has dark background with border
- [ ] Tooltip follows cursor smoothly

**Expected Behavior:**
- Tooltip should appear immediately on hover
- Background: rgba(0, 0, 0, 0.8)
- Border: 1px solid rgba(255, 255, 255, 0.2)
- Rounded corners (8px)

---

### 5. Loading State ✓

**What to Check:**
- [ ] Toggle loading state using the control button
- [ ] Skeleton animation appears
- [ ] Chart area shows circular skeleton
- [ ] Legend area shows line skeletons

**Expected Behavior:**
- Smooth pulse animation
- Maintains card dimensions
- Background: white/10 opacity
- No layout shift when loading completes

---

### 6. Empty State ✓

**What to Check:**
- [ ] View "Empty State (No Data)" scenario
- [ ] Icon and message are centered
- [ ] Message is clear and helpful
- [ ] No chart or legend is rendered

**Expected Behavior:**
- Icon: Bar chart icon (16x16)
- Message: "No source attribution data available"
- Text color: white/40 opacity
- Centered vertically and horizontally

---

### 7. Glassmorphic Styling ✓

**What to Check:**
- [ ] Card has frosted glass effect
- [ ] Background blur is visible
- [ ] Border is subtle (white/18 opacity)
- [ ] Consistent with other dashboard components

**Expected Behavior:**
- Background: rgba(255, 255, 255, 0.1)
- Backdrop blur: 20px
- Border: 1px solid rgba(255, 255, 255, 0.18)
- Rounded corners: 16px (rounded-2xl)
- Padding: 24px (p-6)

---

### 8. Responsive Behavior ✓

**What to Check:**
- [ ] Resize browser window
- [ ] Chart maintains aspect ratio
- [ ] Legend remains readable
- [ ] No horizontal scrolling

**Expected Behavior:**
- Chart uses ResponsiveContainer (100% width)
- Chart height: 256px (h-64)
- Legend stacks vertically on narrow screens
- Text doesn't overflow

---

### 9. Transitions and Animations ✓

**What to Check:**
- [ ] Card has transition-all class
- [ ] Duration: 300ms
- [ ] Smooth state changes
- [ ] No jarring movements

**Expected Behavior:**
- Hover effects should be smooth
- Loading state transition should be seamless
- Data updates should animate smoothly

---

### 10. Typography and Spacing ✓

**What to Check:**
- [ ] Title: 18px, semibold, white
- [ ] Description: 14px, white/60 opacity
- [ ] Legend labels: 14px, medium, white/90
- [ ] Legend values: 14px, semibold, white
- [ ] Info note: 12px, white/50

**Expected Behavior:**
- Consistent font sizes across all text
- Proper line heights for readability
- Adequate spacing between elements
- Hierarchy is clear

---

## Test Scenarios

### Scenario 1: Balanced Distribution
**Data:** Vehicular 45%, Industrial 25%, Biomass 20%, Background 10%

**Expected:**
- All four sources visible
- Chart segments proportional
- Legend shows all four items
- Colors distinct

### Scenario 2: Vehicular Dominant
**Data:** Vehicular 70%, Industrial 15%, Biomass 10%, Background 5%

**Expected:**
- Vehicular segment is largest (70%)
- Other segments are smaller but visible
- Percentages add up to 100%

### Scenario 3: Industrial Dominant
**Data:** Vehicular 20%, Industrial 60%, Biomass 15%, Background 5%

**Expected:**
- Industrial segment is largest (60%)
- Custom title displays correctly
- Red color is prominent

### Scenario 4: Two Sources Only
**Data:** Vehicular 60%, Industrial 40%, Biomass 0%, Background 0%

**Expected:**
- Only two segments in chart
- Only two items in legend
- Chart still looks balanced

### Scenario 5: Empty State
**Data:** All zeros

**Expected:**
- No chart rendered
- Empty state message displayed
- Icon visible
- Card maintains size

### Scenario 6: Loading State
**Always loading**

**Expected:**
- Skeleton animation visible
- Pulse effect smooth
- No content visible
- Card maintains size

---

## Common Issues and Solutions

### Issue: Chart not rendering
**Solution:** Check that Recharts is installed and ResponsiveContainer has proper dimensions

### Issue: Colors not matching
**Solution:** Verify SOURCE_COLORS constant matches design tokens

### Issue: Legend percentages wrong
**Solution:** Ensure data transformation logic correctly maps values

### Issue: Tooltip not appearing
**Solution:** Check that Tooltip component is properly configured in PieChart

### Issue: Loading state not showing
**Solution:** Verify isLoading prop is being passed correctly

---

## Browser Testing

### Desktop Browsers
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

### Mobile Browsers
- [ ] Chrome Mobile
- [ ] Safari iOS
- [ ] Samsung Internet

### Screen Sizes
- [ ] Desktop: 1920x1080
- [ ] Laptop: 1440x900
- [ ] Tablet: 768x1024
- [ ] Mobile: 375x667

---

## Accessibility Testing

### Keyboard Navigation
- [ ] Tab through interactive elements
- [ ] Focus indicators visible
- [ ] Logical tab order

### Screen Reader Testing
- [ ] Title is announced
- [ ] Description is announced
- [ ] Legend items are announced
- [ ] Percentages are announced

### Color Contrast
- [ ] Text meets WCAG AA (4.5:1)
- [ ] Colors are distinguishable
- [ ] Works in high contrast mode

---

## Performance Testing

### Metrics to Check
- [ ] Initial render < 100ms
- [ ] Smooth animations (60fps)
- [ ] No layout shifts
- [ ] No memory leaks

### Tools
- Chrome DevTools Performance tab
- React DevTools Profiler
- Lighthouse audit

---

## Sign-off Checklist

- [ ] All visual checks pass
- [ ] All test scenarios work correctly
- [ ] Responsive behavior verified
- [ ] Accessibility requirements met
- [ ] Performance is acceptable
- [ ] No console errors or warnings
- [ ] Component matches design mockups
- [ ] Ready for integration

---

**Verified By:** _________________
**Date:** _________________
**Notes:** _________________
