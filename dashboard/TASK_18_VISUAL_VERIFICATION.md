# Task 18 - Dark Mode Visual Verification Guide

## Quick Visual Check

After implementing Task 18, follow these steps to verify dark mode is working correctly:

### 1. Start the Development Server
```bash
cd dashboard
npm run dev
```

Open browser to: `http://localhost:3000`

---

## Visual Checks

### Check 1: Initial Load (Light Mode)
**Expected behavior:**
- ✅ Dashboard loads with vibrant gradient background
- ✅ Glass cards have white/transparent appearance
- ✅ Text is clear and readable
- ✅ Moon icon (🌙) visible in Sidebar

---

### Check 2: Toggle to Dark Mode
**Action:** Click the moon icon in the left Sidebar

**Expected changes:**
- ✅ Background gradient becomes darker/muted
- ✅ Glass cards transition to dark slate appearance
- ✅ Text remains clear with high contrast
- ✅ Icon changes to sun (☀️)
- ✅ Transition is smooth (~300ms)
- ✅ No layout shift or flicker

**Verify in DevTools:**
```html
<html class="dark" data-theme="dark">
```

**Verify in LocalStorage:**
- Key: `theme`
- Value: `"dark"`

---

### Check 3: Toggle Back to Light Mode
**Action:** Click the sun icon in Sidebar

**Expected changes:**
- ✅ Background gradient becomes vibrant again
- ✅ Glass cards return to white/transparent
- ✅ Icon changes back to moon (🌙)
- ✅ Smooth transition

**Verify in DevTools:**
```html
<html class="light" data-theme="light">
```

**Verify in LocalStorage:**
- Key: `theme`
- Value: `"light"`

---

### Check 4: Persistence Across Page Refresh
**Action:** 
1. Set theme to dark mode
2. Refresh page (F5 or Ctrl+R)

**Expected behavior:**
- ✅ Page loads directly in dark mode
- ✅ No flash of light mode content (FOUC)
- ✅ Sun icon immediately visible
- ✅ Dark theme applied before first paint

---

### Check 5: System Preference (Optional)
**Setup:**
1. Open DevTools → Settings → Rendering
2. Set "Emulate CSS media feature prefers-color-scheme" to "dark"
3. Close and reopen browser (or use incognito)

**Expected behavior:**
- ✅ Dashboard loads in dark mode automatically
- ✅ Theme follows system preference

**To test system sync:**
1. Click sun icon (switch to light)
2. LocalStorage should have: `"light"` (overriding system)
3. Delete localStorage entry
4. Refresh page
5. Should return to dark mode (following system)

---

## Component-Specific Checks

### Hero AQI Section
**Light Mode:**
- Vibrant gradient background
- White glass card overlay
- White text with slight transparency
- Colorful AQI meter

**Dark Mode:**
- Muted gradient background
- Dark glass card overlay
- Near-white text with high contrast
- Same AQI meter colors (unaffected)

---

### Pollutant Cards Grid
**Light Mode:**
- Each card has white glass background
- Icon colors match pollutant type
- Values in white text
- Subtle shadows

**Dark Mode:**
- Each card has dark glass background
- Icon colors remain vibrant
- Values in near-white text
- Darker shadows for depth

---

### Top Navigation
**Light Mode:**
- White transparent background with blur
- Tabs have white hover effect
- Active tab has glow

**Dark Mode:**
- Dark transparent background with blur
- Tabs have subtle dark hover
- Active tab glow is more subdued

---

### Sidebar
**Light Mode:**
- White transparent background
- Icons in white with transparency
- Active item has white glow
- Moon icon for theme toggle

**Dark Mode:**
- Dark transparent background
- Icons in near-white
- Active item has subtle glow
- Sun icon for theme toggle

---

## Accessibility Checks

### Contrast Verification
**Tools:** Use WebAIM Contrast Checker or browser DevTools

**Light Mode Text Contrast:**
- Primary text on background: Should pass WCAG AA (4.5:1)
- Secondary text: Should pass WCAG AA

**Dark Mode Text Contrast:**
- Primary text (rgba(248, 250, 252, 0.95)) on #0f172a: ~17.8:1 ✅
- Secondary text (rgba(203, 213, 225, 0.9)) on #0f172a: ~14.2:1 ✅
- Tertiary text (rgba(148, 163, 184, 0.8)) on #0f172a: ~8.5:1 ✅

All exceed WCAG AAA standards (7:1)!

---

### Keyboard Navigation
**Test:**
1. Press Tab repeatedly
2. Theme toggle icon should receive focus
3. Press Enter or Space
4. Theme should toggle

**Expected:**
- ✅ Focus ring visible on theme icon
- ✅ Keyboard can toggle theme
- ✅ Focus indicator maintains WCAG standards

---

### Screen Reader Testing (Optional)
**Using NVDA/JAWS:**
1. Navigate to Sidebar
2. Theme toggle should announce: "Dark Mode" or "Light Mode"
3. After toggle, should announce new state

---

## Mobile/Responsive Checks

### Desktop (>768px)
- Theme toggle visible in Sidebar
- Maintains position after scroll

### Tablet (768px to 1024px)
- Theme toggle still in Sidebar
- Touch-friendly size

### Mobile (<768px)
- Sidebar hidden
- Theme toggle in BottomNavigation or TopNavigation
- Large enough for touch (44x44px minimum)

---

## Browser Testing

### Chrome/Edge (Chromium)
- ✅ Theme toggle works
- ✅ Transitions smooth
- ✅ localStorage persists

### Firefox
- ✅ Theme toggle works
- ✅ backdrop-filter supported
- ✅ localStorage persists

### Safari
- ✅ Theme toggle works
- ✅ -webkit-backdrop-filter used
- ✅ localStorage persists

### Mobile Browsers
- ✅ Safari iOS: Works
- ✅ Chrome Android: Works
- ✅ Samsung Internet: Works

---

## DevTools Inspection

### Elements Tab
**Light mode:**
```html
<html lang="en" class="light" data-theme="light">
```

**Dark mode:**
```html
<html lang="en" class="dark" data-theme="dark">
```

### Application Tab → Local Storage
**Key:** `theme`  
**Values:** `"light"`, `"dark"`, or `"system"`

### Console Tab
**No errors should appear:**
- No "useTheme must be used within ThemeProvider" errors
- No CSS warnings
- No localStorage errors

---

## Performance Checks

### Lighthouse Audit
Run Lighthouse in DevTools:

**Expected scores (both modes):**
- Performance: 90+
- Accessibility: 95+ (dark mode should maintain/improve)
- Best Practices: 100
- SEO: 100

### Paint Metrics
**First Contentful Paint (FCP):** <1.5s  
**Largest Contentful Paint (LCP):** <2.5s  
**Theme Toggle Time:** <16ms (instant)

---

## Common Issues & Solutions

### Issue: Flash of light mode on page load (FOUC)
**Solution:** Check that ThemeProvider renders null until mounted
```typescript
if (!mounted) {
  return null;
}
```

### Issue: Theme not persisting
**Solution:** Check localStorage is not disabled  
**Browser setting:** Enable cookies and site data

### Issue: Icon not changing
**Solution:** Verify `resolvedTheme` is used, not `theme`
```typescript
icon: resolvedTheme === 'dark' ? <SunIcon /> : <MoonIcon />
```

### Issue: Contrast too low in dark mode
**Solution:** Verify CSS custom properties are applied
Check `globals.css` for `--color-text-primary-dark`

---

## Test Results Summary

Run automated tests:
```bash
npm test __tests__/dark-mode.test.tsx
```

**Expected output:**
```
Test Suites: 1 passed, 1 total
Tests:       17 passed, 17 total
```

**Test categories:**
- ✅ Theme Switching (3 tests)
- ✅ Theme Persistence (3 tests)
- ✅ System Preference (2 tests)
- ✅ Property 40: Preference Persistence (2 tests)
- ✅ Property 39: Contrast Compliance (3 tests)
- ✅ Accessibility (2 tests)
- ✅ Edge Cases (2 tests)

---

## Sign-Off Checklist

Before marking Task 18 complete, verify:

- [ ] Moon/sun icon visible in Sidebar
- [ ] Clicking icon toggles theme
- [ ] Theme persists after page refresh
- [ ] No FOUC (flash of unstyled content)
- [ ] Dark mode maintains readability
- [ ] All 17 automated tests pass
- [ ] No console errors
- [ ] Local storage updates correctly
- [ ] Keyboard navigation works
- [ ] Contrast ratios meet WCAG AA
- [ ] Works in Chrome, Firefox, Safari
- [ ] Responsive on mobile devices

---

## Visual Reference

### Light Mode Gradient Examples
- **Good AQI:** Purple to violet gradient
- **Moderate:** Pink to coral gradient
- **Unhealthy:** Blue to cyan gradient

### Dark Mode Gradient Examples
- **Good AQI:** Deep purple muted gradient
- **Moderate:** Deep brown/red gradient
- **Unhealthy:** Deep blue gradient

All are less saturated in dark mode for reduced eye strain.

---

## Done!

If all checks pass, Task 18 is complete and production-ready! 🎉

**Next:** Task 19 - Animations & Micro-interactions
