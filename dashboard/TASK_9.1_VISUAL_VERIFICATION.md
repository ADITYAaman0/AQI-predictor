# Task 9.1 Visual Verification Guide

## Overview

This guide helps you visually verify that the PredictionGraph component is working correctly.

## Quick Start

1. **Start the development server:**
   ```bash
   cd dashboard
   npm run dev
   ```

2. **Navigate to the test page:**
   ```
   http://localhost:3000/test-prediction-graph
   ```

## What to Verify

### 1. Component Renders
- [ ] Page loads without errors
- [ ] Multiple chart instances are visible
- [ ] Charts are contained within glassmorphic cards

### 2. Default Configuration
- [ ] Chart displays with blue line
- [ ] X-axis shows "Hours Ahead" label
- [ ] Y-axis shows "AQI" label
- [ ] Grid lines are visible (dashed, subtle)
- [ ] Chart fills the container width
- [ ] Chart height is approximately 280px

### 3. With Confidence Intervals
- [ ] Second chart shows shaded area around the line
- [ ] Shaded area is semi-transparent
- [ ] Shaded area represents confidence bounds

### 4. Custom Height
- [ ] Third chart is taller than the default
- [ ] Chart maintains proper proportions
- [ ] All elements scale appropriately

### 5. Empty Data
- [ ] Fourth chart renders without crashing
- [ ] Empty chart shows axes and grid
- [ ] No error messages displayed

### 6. Short Forecast
- [ ] Fifth chart shows only 6 data points
- [ ] Chart adapts to fewer data points
- [ ] Spacing is appropriate

### 7. Responsive Behavior
- [ ] Resize browser window
- [ ] Charts adapt to container width
- [ ] Charts maintain aspect ratio
- [ ] No horizontal scrolling

### 8. Interactive Features
- [ ] Hover over chart line
- [ ] Tooltip appears with data
- [ ] Tooltip shows AQI value and hour
- [ ] Tooltip follows cursor

### 9. Animation (on page load)
- [ ] Line draws from left to right
- [ ] Animation takes approximately 2 seconds
- [ ] Animation is smooth (no jank)

### 10. Styling
- [ ] Charts have proper glassmorphic background
- [ ] Text is readable (white/light color)
- [ ] Grid lines are subtle
- [ ] Line color is blue (#60A5FA)
- [ ] Gradient fill under line is visible

## Expected Appearance

### Chart Structure
```
┌─────────────────────────────────────────┐
│ AQI                                     │
│  │                                      │
│  │        ╱╲                            │
│  │       ╱  ╲      ╱╲                   │
│  │      ╱    ╲    ╱  ╲                  │
│  │     ╱      ╲  ╱    ╲                 │
│  │────╱────────╲╱──────╲────────────    │
│  └────────────────────────────────────  │
│           Hours Ahead                   │
└─────────────────────────────────────────┘
```

### Color Scheme
- **Background:** Gradient (blue-900 → purple-900 → pink-900)
- **Cards:** Glassmorphic (semi-transparent white with blur)
- **Line:** Blue (#60A5FA)
- **Fill:** Blue gradient (0.8 → 0.1 opacity)
- **Grid:** White with 0.1 opacity
- **Text:** White with 0.7-0.9 opacity

## Common Issues

### Chart Not Rendering
- **Symptom:** Empty space where chart should be
- **Solution:** Check browser console for errors
- **Likely Cause:** Recharts not installed or import error

### Animation Not Working
- **Symptom:** Line appears instantly
- **Solution:** Refresh the page
- **Note:** Animation only plays on initial mount

### Tooltip Not Appearing
- **Symptom:** No tooltip on hover
- **Solution:** Ensure you're hovering over the line or data points
- **Note:** Tooltip styling may be subtle

### Responsive Issues
- **Symptom:** Chart doesn't resize
- **Solution:** Check ResponsiveContainer is wrapping the chart
- **Note:** May need to refresh after resize

## Browser Compatibility

Test in the following browsers:
- [ ] Chrome/Edge (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Mobile Safari (iOS)
- [ ] Chrome Mobile (Android)

## Performance Check

### Frame Rate
1. Open browser DevTools
2. Go to Performance tab
3. Start recording
4. Scroll through the page
5. Stop recording
6. Check for 60fps during animations

### Load Time
1. Open browser DevTools
2. Go to Network tab
3. Refresh the page
4. Check total load time
5. Should be < 2 seconds on fast connection

## Accessibility Check

### Keyboard Navigation
- [ ] Tab through interactive elements
- [ ] Focus indicators are visible
- [ ] Can interact with chart using keyboard

### Screen Reader
- [ ] Enable screen reader (NVDA, JAWS, VoiceOver)
- [ ] Navigate to chart
- [ ] Verify chart is announced
- [ ] Verify data is accessible

### Color Contrast
- [ ] Text is readable against background
- [ ] Meets WCAG AA standards (4.5:1)
- [ ] Use browser DevTools to check contrast

## Screenshot Checklist

Take screenshots of:
1. [ ] Full page view
2. [ ] Default configuration chart
3. [ ] Chart with confidence intervals
4. [ ] Custom height chart
5. [ ] Empty data chart
6. [ ] Tooltip on hover
7. [ ] Mobile view (responsive)

## Sign-Off

- [ ] All visual checks passed
- [ ] No console errors
- [ ] Responsive behavior works
- [ ] Animations are smooth
- [ ] Tooltips work correctly
- [ ] Accessibility features present
- [ ] Performance is acceptable

**Verified By:** _________________  
**Date:** _________________  
**Browser/Version:** _________________  
**Notes:** _________________

## Next Steps

After verification:
1. Proceed to Task 9.2 (Implement line drawing with animation)
2. Enhance animation features
3. Add gradient stroke matching AQI zones
4. Improve gradient fill under line

## Support

If you encounter issues:
1. Check browser console for errors
2. Verify all dependencies are installed (`npm install`)
3. Clear browser cache and refresh
4. Check that dev server is running
5. Review component code in `components/forecast/PredictionGraph.tsx`

## Additional Resources

- **Component Code:** `dashboard/components/forecast/PredictionGraph.tsx`
- **Test Page:** `dashboard/app/test-prediction-graph/page.tsx`
- **Unit Tests:** `dashboard/components/forecast/__tests__/PredictionGraph.test.tsx`
- **Documentation:** `dashboard/components/forecast/README.md`
- **Design Spec:** `.kiro/specs/glassmorphic-dashboard/design.md`
- **Recharts Docs:** https://recharts.org/
