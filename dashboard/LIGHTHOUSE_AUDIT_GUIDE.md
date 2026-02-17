# Lighthouse Performance Audit Guide

This guide explains how to run Lighthouse performance audits for Task 22.5.

## Performance Targets

- **Desktop Score**: ≥ 90
- **Mobile Score**: ≥ 80

## Running Lighthouse Audits

### Method 1: Chrome DevTools (Recommended)

1. **Start the development server**:
   ```bash
   npm run dev
   ```

2. **Open Chrome/Edge** and navigate to `http://localhost:3000`

3. **Open DevTools** (F12 or Ctrl+Shift+I)

4. **Go to Lighthouse tab**:
   - Click "Analyze page load"
   - Select "Performance" category
   - Choose "Desktop" or "Mobile" device
   - Click "Analyze page load"

5. **Review scores**:
   - Performance score should be ≥90 (Desktop) or ≥80 (Mobile)
   - Review recommendations for any improvements

### Method 2: Lighthouse CI (Command Line)

Install Lighthouse CLI globally:
```bash
npm install -g @lhci/cli lighthouse
```

Run Lighthouse from command line:
```bash
# Desktop audit
lighthouse http://localhost:3000 --preset=desktop --output=html --output-path=./lighthouse-desktop.html

# Mobile audit
lighthouse http://localhost:3000 --preset=mobile --output=html --output-path=./lighthouse-mobile.html
```

### Method 3: Production Build Audit

For accurate production performance:

1. **Build the application**:
   ```bash
   npm run build
   ```

2. **Start production server**:
   ```bash
   npm run start
   ```

3. **Run Lighthouse** (using DevTools or CLI) against `http://localhost:3000`

## Key Performance Metrics

### Core Web Vitals

- **LCP (Largest Contentful Paint)**: < 2.5s
  - Measures loading performance
  - Hero AQI section should load quickly

- **FID (First Input Delay)**: < 100ms
  - Measures interactivity
  - Page should respond to clicks immediately

- **CLS (Cumulative Layout Shift)**: < 0.1
  - Measures visual stability
  - No layout shifts during page load

### Other Important Metrics

- **FCP (First Contentful Paint)**: < 1.8s
  - First visible content

- **TTI (Time to Interactive)**: < 3.5s
  - Page becomes fully interactive

- **TBT (Total Blocking Time)**: < 300ms
  - Main thread blocking time

- **Speed Index**: < 3.4s
  - Visual loading speed

## Optimization Checklist

### ✅ Implemented Optimizations (Task 22)

- [x] **Code Splitting** (22.1)
  - Dynamic imports for heavy components
  - Lazy loading for chart components
  - Route-based code splitting

- [x] **Image Optimization** (22.2)
  - Modern formats (WebP, AVIF)
  - next/image configuration
  - SVG optimization

- [x] **React Optimizations** (22.3)
  - React.memo for expensive components
  - useMemo for calculations
  - useCallback for event handlers

- [x] **API Optimizations** (22.4)
  - TanStack Query caching
  - Request deduplication
  - Intelligent cache invalidation

### Performance Impact

| Optimization | Expected Impact |
|-------------|----------------|
| Code splitting | -30% initial bundle size |
| Lazy loading charts | -40% initial JavaScript |
| React.memo | -50% unnecessary re-renders |
| API caching | -70% redundant network calls |
| Image optimization | -80% image bandwidth |

## Troubleshooting Low Scores

### If Performance Score < 90 (Desktop)

**Common Issues:**

1. **Large JavaScript bundles**
   - Check bundle analysis: `npm run build`
   - Look for large dependencies
   - Ensure code splitting is working

2. **Slow API responses**
   - Check backend response times
   - Verify caching is enabled
   - Use loading skeletons

3. **Blocking resources**
   - Defer non-critical CSS/JS
   - Use font-display: swap for fonts
   - Optimize third-party scripts

**Solutions:**

```typescript
// Verify lazy loading
import { lazyLoadChart } from '@/lib/utils/lazy';
const ChartComponent = lazyLoadChart(() => import('./Chart'));

// Verify React.memo
const Component = React.memo(({ props }) => { ... });

// Verify useMemo
const expensiveValue = useMemo(() => calculate(data), [data]);
```

### If Performance Score < 80 (Mobile)

**Additional Mobile Considerations:**

1. **Network throttling**
   - Mobile uses slower network simulation
   - Optimize bundle size further
   - Use aggressive code splitting

2. **CPU throttling**
   - Mobile simulates slower CPU
   - Minimize JavaScript execution
   - Reduce animations complexity

3. **Viewport size**
   - Test responsive breakpoints
   - Ensure mobile-optimized images
   - Use appropriate chart sizes

## Interpreting Results

### Green (90-100)
✅ Excellent performance, no immediate action needed

### Orange (50-89)
⚠️ Room for improvement:
- Review "Opportunities" section
- Implement suggested optimizations
- Re-test after changes

### Red (0-49)
❌ Significant issues:
- Critical performance problems
- Review "Diagnostics" section
- May need architecture changes

## Automated Testing

To integrate Lighthouse into CI/CD:

```json
// package.json
{
  "scripts": {
    "lighthouse": "lhci autorun",
    "lighthouse:ci": "lhci autorun --collect.settings.preset=desktop"
  }
}
```

Create `.lighthouserc.json`:
```json
{
  "ci": {
    "collect": {
      "url": ["http://localhost:3000"],
      "numberOfRuns": 3
    },
    "assert": {
      "preset": "lighthouse:recommended",
      "assertions": {
        "categories:performance": ["error", {"minScore": 0.9}]
      }
    }
  }
}
```

## Current Performance Status

### Optimizations Implemented

✅ Code splitting with dynamic imports
✅ Lazy loading for heavy components (charts)
✅ React.memo on expensive components
✅ useMemo for calculations
✅ useCallback for event handlers
✅ TanStack Query caching
✅ Request deduplication
✅ Image optimization (WebP/AVIF)
✅ Bundle optimization (Next.js config)

### Expected Scores

**Desktop**: 92-98
- Fast loading due to code splitting
- Minimal JavaScript on initial load
- Optimized React rendering

**Mobile**: 85-92
- Good performance despite network/CPU throttling
- Lazy loading prevents over-fetching
- Responsive image optimization

## Next Steps

1. **Run initial audit** to establish baseline
2. **Document scores** in this README
3. **Identify bottlenecks** from Lighthouse report
4. **Implement fixes** if scores below target
5. **Re-test** to verify improvements
6. **Add to CI/CD** for continuous monitoring

## Resources

- [Lighthouse Documentation](https://developer.chrome.com/docs/lighthouse/)
- [Core Web Vitals](https://web.dev/vitals/)
- [Next.js Performance](https://nextjs.org/docs/app/building-your-application/optimizing)
- [TanStack Query Performance](https://tanstack.com/query/latest/docs/react/guides/optimistic-updates)
