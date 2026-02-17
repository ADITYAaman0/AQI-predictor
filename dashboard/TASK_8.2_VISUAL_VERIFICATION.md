# Task 8.2: Visual Verification Guide

## Quick Visual Testing Guide

Use this guide to quickly verify the responsive layout is working correctly.

## Testing Steps

### 1. Desktop View (≥1440px)

**How to Test:**
1. Open browser to full screen on a desktop monitor
2. Navigate to `http://localhost:3000`
3. Ensure browser width is at least 1440px

**Expected Layout:**
- ✅ Sidebar visible on left side
- ✅ Hero AQI section takes up ~2/3 width (8 columns)
- ✅ Weather & Health panel on right side (~1/3 width, 4 columns)
- ✅ Pollutant grid below, full width (12 columns)
- ✅ Pollutant cards in 3 columns
- ✅ 48px margins on sides (xl:px-12)
- ✅ 24px gaps between grid items (xl:gap-6)
- ✅ Bottom navigation NOT visible

**Visual Check:**
```
┌──┬────────────────────────────────────┐
│  │     Top Navigation                 │
│S ├──────────────────┬─────────────────┤
│i │                  │                 │
│d │   Hero AQI       │  Weather        │
│e │   (Large)        │  Badges         │
│b │                  │                 │
│a │                  ├─────────────────┤
│r │                  │  Health         │
│  │                  │  Recs           │
│  ├──────────────────┴─────────────────┤
│  │  [Card] [Card] [Card]             │
│  │  [Card] [Card] [Card]             │
└──┴────────────────────────────────────┘
```

### 2. Tablet View (768-1439px)

**How to Test:**
1. Resize browser window to 1024px width
2. Or use browser DevTools responsive mode
3. Set viewport to iPad (768x1024 or 1024x768)

**Expected Layout:**
- ✅ Sidebar visible on left side (at 1024px+)
- ✅ Hero AQI section full width (8 columns)
- ✅ Weather & Health panel full width below hero (8 columns)
- ✅ Pollutant grid full width (8 columns)
- ✅ Pollutant cards in 2 columns
- ✅ 32px margins on sides (md:px-8)
- ✅ 16px gaps between grid items (gap-4)
- ✅ Bottom navigation visible below 1024px

**Visual Check:**
```
┌─────────────────────────────┐
│      Top Navigation         │
├─────────────────────────────┤
│                             │
│        Hero AQI             │
│        (Full Width)         │
│                             │
├─────────────────────────────┤
│      Weather Badges         │
├─────────────────────────────┤
│    Health Recommendations   │
├─────────────────────────────┤
│   [Card]      [Card]        │
│   [Card]      [Card]        │
│   [Card]      [Card]        │
└─────────────────────────────┘
```

### 3. Mobile View (<768px)

**How to Test:**
1. Resize browser window to 375px width
2. Or use browser DevTools responsive mode
3. Set viewport to iPhone (375x667 or similar)

**Expected Layout:**
- ✅ Sidebar NOT visible
- ✅ Hero AQI section full width (1 column)
- ✅ Weather badges full width below hero
- ✅ Health recommendations full width
- ✅ Pollutant grid full width (1 column)
- ✅ Pollutant cards in 1 column, centered
- ✅ 16px margins on sides (px-4)
- ✅ 16px gaps between grid items (gap-4)
- ✅ Bottom navigation visible at bottom

**Visual Check:**
```
┌─────────────────────┐
│   Top Navigation    │
├─────────────────────┤
│                     │
│    Hero AQI         │
│    (Full Width)     │
│                     │
├─────────────────────┤
│   Weather Badges    │
├─────────────────────┤
│  Health Recs        │
├─────────────────────┤
│      [Card]         │
│      [Card]         │
│      [Card]         │
│      [Card]         │
│      [Card]         │
│      [Card]         │
├─────────────────────┤
│  Bottom Navigation  │
└─────────────────────┘
```

## Browser DevTools Testing

### Chrome/Edge DevTools
1. Press `F12` or `Ctrl+Shift+I` (Windows) / `Cmd+Option+I` (Mac)
2. Click the device toolbar icon (or press `Ctrl+Shift+M`)
3. Select preset devices or enter custom dimensions:
   - Mobile: 375px
   - Tablet: 768px, 1024px
   - Desktop: 1440px, 1920px

### Firefox DevTools
1. Press `F12` or `Ctrl+Shift+I` (Windows) / `Cmd+Option+I` (Mac)
2. Click the responsive design mode icon (or press `Ctrl+Shift+M`)
3. Test with preset devices or custom dimensions

### Safari DevTools
1. Enable Developer menu: Safari > Preferences > Advanced > Show Develop menu
2. Develop > Enter Responsive Design Mode
3. Test with preset devices or custom dimensions

## Specific Elements to Check

### Margins and Padding
- **Mobile**: Look for 16px space on left/right edges
- **Tablet**: Look for 32px space on left/right edges
- **Desktop**: Look for 48px space on left/right edges

### Grid Gaps
- **Mobile/Tablet**: Measure space between cards (should be ~16px)
- **Desktop**: Measure space between cards (should be ~24px)

### Component Widths
- **Hero Section**: Should be ~66% width on desktop, full width on mobile/tablet
- **Side Panel**: Should be ~33% width on desktop, full width on mobile/tablet
- **Pollutant Cards**: Should maintain 200px width at all breakpoints

### Navigation
- **Sidebar**: Visible on desktop (≥1024px), hidden on mobile/tablet
- **Bottom Nav**: Visible on mobile/tablet (<1024px), hidden on desktop

## Common Issues to Watch For

### ❌ Layout Breaks
- Cards overlapping
- Text overflowing containers
- Horizontal scrollbar appearing
- Uneven spacing between elements

### ❌ Responsive Issues
- Layout not changing at breakpoints
- Components not stacking on mobile
- Sidebar visible on mobile
- Bottom nav visible on desktop

### ❌ Spacing Issues
- Inconsistent margins
- Uneven gaps between cards
- Content touching screen edges
- Too much or too little whitespace

## Performance Check

While testing, also verify:
- ✅ Smooth transitions when resizing
- ✅ No layout shift or jank
- ✅ Fast initial render
- ✅ Smooth scrolling

## Accessibility Check

- ✅ Tab through all interactive elements
- ✅ Verify focus indicators are visible
- ✅ Check touch targets are ≥44x44px on mobile
- ✅ Ensure logical reading order at all sizes

## Sign-off Checklist

- [ ] Desktop layout verified (≥1440px)
- [ ] Tablet layout verified (768-1439px)
- [ ] Mobile layout verified (<768px)
- [ ] Margins correct at all breakpoints
- [ ] Gaps correct at all breakpoints
- [ ] Navigation shows/hides correctly
- [ ] No horizontal scrolling
- [ ] No layout breaks or overlaps
- [ ] Smooth resize behavior
- [ ] Accessibility maintained

## Screenshots

Take screenshots at these key widths for documentation:
- 375px (Mobile - iPhone)
- 768px (Tablet - iPad Portrait)
- 1024px (Tablet - iPad Landscape)
- 1440px (Desktop)
- 1920px (Large Desktop)

## Next Steps

After verification:
1. ✅ Mark task 8.2 as complete
2. ✅ Document any issues found
3. ✅ Proceed to task 8.3 (Error handling and fallbacks)
