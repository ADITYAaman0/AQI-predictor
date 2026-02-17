# Glassmorphic Dashboard - Design Tokens

This document describes all custom design tokens and utility classes available in the glassmorphic AQI dashboard.

## Overview

The design system is built on Tailwind CSS v4 with custom CSS variables and utility classes defined in `app/globals.css`. All tokens follow a 4px base unit system for consistent spacing and sizing.

## ✅ Verification Status

**All 98 design tokens and utility classes verified and working!**

Run `node verify-design-tokens.js` to verify all tokens are available.

---

## 🎨 Color Tokens

### AQI Category Colors

These colors represent different air quality levels according to the AQI scale:

| Token | Value | Usage | CSS Variable |
|-------|-------|-------|--------------|
| Good | `#4ADE80` | AQI 0-50 | `--color-aqi-good` |
| Moderate | `#FCD34D` | AQI 51-100 | `--color-aqi-moderate` |
| Unhealthy | `#FB923C` | AQI 101-150 | `--color-aqi-unhealthy` |
| Very Unhealthy | `#EF4444` | AQI 151-200 | `--color-aqi-very-unhealthy` |
| Hazardous | `#7C2D12` | AQI 201+ | `--color-aqi-hazardous` |

**Utility Classes:**
- Text: `.text-aqi-good`, `.text-aqi-moderate`, `.text-aqi-unhealthy`, `.text-aqi-very-unhealthy`, `.text-aqi-hazardous`
- Background: `.bg-aqi-good`, `.bg-aqi-moderate`, `.bg-aqi-unhealthy`, `.bg-aqi-very-unhealthy`, `.bg-aqi-hazardous`
- Border: `.border-aqi-good`, `.border-aqi-moderate`, `.border-aqi-unhealthy`, `.border-aqi-very-unhealthy`, `.border-aqi-hazardous`

### Glassmorphism Colors

| Token | Value | Usage | CSS Variable |
|-------|-------|-------|--------------|
| Glass Light | `rgba(255, 255, 255, 0.1)` | Light mode card backgrounds | `--color-glass-light` |
| Glass Border | `rgba(255, 255, 255, 0.18)` | Card borders | `--color-glass-border` |
| Glass Dark | `rgba(0, 0, 0, 0.3)` | Dark mode card backgrounds | `--color-glass-dark` |

---

## 📐 Spacing Tokens

Based on a 4px base unit system:

| Token | Value | CSS Variable | Utility Classes |
|-------|-------|--------------|-----------------|
| xs | 4px | `--spacing-xs` | `.space-xs`, `.gap-xs` |
| sm | 8px | `--spacing-sm` | `.space-sm`, `.gap-sm` |
| md | 16px | `--spacing-md` | `.space-md`, `.gap-md` |
| lg | 24px | `--spacing-lg` | `.space-lg`, `.gap-lg` |
| xl | 32px | `--spacing-xl` | `.space-xl`, `.gap-xl` |
| 2xl | 48px | `--spacing-2xl` | `.space-2xl`, `.gap-2xl` |
| 3xl | 64px | `--spacing-3xl` | `.space-3xl`, `.gap-3xl` |

---

## 📝 Typography Tokens

### Font Families

| Token | Value | CSS Variable |
|-------|-------|--------------|
| Sans | Inter, system fonts | `--font-family-sans` |
| Mono | SF Mono, monospace fonts | `--font-family-mono` |

### Type Scale

| Level | Size | Line Height | Weight | Utility Class | CSS Variables |
|-------|------|-------------|--------|---------------|---------------|
| Display | 72px | 1.0 | 700 | `.text-display` | `--font-size-display`, `--line-height-display`, `--font-weight-display` |
| H1 | 32px | 1.2 | 600 | `.text-h1` | `--font-size-h1`, `--line-height-h1`, `--font-weight-h1` |
| H2 | 20px | 1.3 | 600 | `.text-h2` | `--font-size-h2`, `--line-height-h2`, `--font-weight-h2` |
| H3 | 16px | 1.4 | 500 | `.text-h3` | `--font-size-h3`, `--line-height-h3`, `--font-weight-h3` |
| Body | 14px | 1.5 | 400 | `.text-body` | `--font-size-body`, `--line-height-body`, `--font-weight-body` |
| Caption | 12px | 1.4 | 400 | `.text-caption` | `--font-size-caption`, `--line-height-caption`, `--font-weight-caption` |
| Micro | 10px | 1.2 | 500 | `.text-micro` | `--font-size-micro`, `--line-height-micro`, `--font-weight-micro` |

**Note:** Micro text includes `letter-spacing: 0.5px` and is uppercase by default.

---

## 🎭 Shadow Tokens

| Token | Value | CSS Variable | Usage |
|-------|-------|--------------|-------|
| Glass | `0 8px 32px 0 rgba(31, 38, 135, 0.37)` | `--shadow-glass` | Glassmorphic cards |
| Level 1 | `0 2px 8px rgba(0, 0, 0, 0.1)` | `--shadow-level-1` | Subtle elevation |
| Level 2 | `0 4px 16px rgba(0, 0, 0, 0.15)` | `--shadow-level-2` | Medium elevation |
| Level 3 | `0 8px 32px rgba(0, 0, 0, 0.2)` | `--shadow-level-3` | High elevation |
| Glow | `0 0 20px rgba(245, 158, 11, 0.5)` | `--shadow-glow` | Emphasis/alerts |

---

## 🌫️ Blur Tokens

| Token | Value | CSS Variable | Usage |
|-------|-------|--------------|-------|
| Glass | 20px | `--blur-glass` | Backdrop blur for glassmorphism |

---

## ⏱️ Animation Tokens

### Durations

| Token | Value | CSS Variable |
|-------|-------|--------------|
| Fast | 0.1s | `--duration-fast` |
| Normal | 0.3s | `--duration-normal` |
| Slow | 0.4s | `--duration-slow` |
| Animation | 1.5s | `--duration-animation` |
| Draw | 2s | `--duration-draw` |

### Timing Functions

| Token | Value | CSS Variable |
|-------|-------|--------------|
| Default | `cubic-bezier(0.4, 0, 0.2, 1)` | `--ease-default` |
| In | `cubic-bezier(0.4, 0, 1, 1)` | `--ease-in` |
| Out | `cubic-bezier(0, 0, 0.2, 1)` | `--ease-out` |
| In-Out | `cubic-bezier(0.4, 0, 0.2, 1)` | `--ease-in-out` |

### Animation Keyframes

Available keyframes:
- `@keyframes fadeIn` - Fade from 0 to 1 opacity
- `@keyframes slideUp` - Slide up 10px with fade
- `@keyframes drawLine` - SVG line drawing effect
- `@keyframes pulseGlow` - Pulsing glow effect
- `@keyframes spin` - 360° rotation

**Utility Classes:**
- `.animate-fade-in` - Fade in animation (0.4s)
- `.animate-slide-up` - Slide up animation (0.4s)
- `.animate-draw-line` - Line drawing animation (2s)
- `.animate-pulse-glow` - Pulsing glow animation (infinite)
- `.animate-spin` - Spinning animation (infinite)

---

## 🎴 Glassmorphic Card Classes

### `.glass-card`

Light mode glassmorphic card with:
- Background: `rgba(255, 255, 255, 0.1)`
- Backdrop blur: 20px
- Border: 1px solid `rgba(255, 255, 255, 0.18)`
- Border radius: 16px
- Box shadow: Glass shadow

**Usage:**
```jsx
<div className="glass-card p-lg">
  Card content
</div>
```

### `.glass-card-dark`

Dark mode glassmorphic card with:
- Background: `rgba(0, 0, 0, 0.3)`
- Backdrop blur: 20px
- Border: 1px solid `rgba(255, 255, 255, 0.1)`
- Border radius: 16px
- Box shadow: Glass shadow

---

## 🌈 Background Gradient Classes

Dynamic gradients that change based on AQI levels:

| Class | Gradient | AQI Level |
|-------|----------|-----------|
| `.bg-gradient-good` | Blue-Purple (667eea → 764ba2) | 0-50 |
| `.bg-gradient-moderate` | Pink-Red (f093fb → f5576c) | 51-100 |
| `.bg-gradient-unhealthy` | Blue-Cyan (4facfe → 00f2fe) | 101-150 |
| `.bg-gradient-very-unhealthy` | Pink-Yellow (fa709a → fee140) | 151-200 |
| `.bg-gradient-hazardous` | Cyan-Purple (30cfd0 → 330867) | 201+ |

**Usage:**
```jsx
<div className="bg-gradient-good min-h-screen">
  Dashboard content
</div>
```

---

## 🖱️ Interactive Classes

### Hover Effects

**`.hover-lift`**
- Lifts element 4px on hover
- Enhances shadow to level 3
- Transition: 0.3s ease

**`.hover-scale`**
- Scales to 0.95 on active/click
- Transition: 0.1s ease

**Usage:**
```jsx
<button className="glass-card hover-lift hover-scale">
  Click me
</button>
```

### Focus Indicators

**`.focus-glow`**
- Removes default outline
- Adds blue glow shadow on focus
- Box shadow: `0 0 0 3px rgba(66, 153, 225, 0.5)`

**`.focus-ring`**
- Adds 2px solid outline on focus
- Outline color: `#4299e1`
- Outline offset: 2px

**Usage:**
```jsx
<button className="glass-card focus-glow">
  Keyboard accessible
</button>
```

---

## ♿ Accessibility Features

### Reduced Motion

Automatically respects user's motion preferences:

```css
@media (prefers-reduced-motion: reduce) {
  /* All animations reduced to 0.01ms */
}
```

### High Contrast

Enhances borders in high contrast mode:

```css
@media (prefers-contrast: high) {
  .glass-card {
    border: 2px solid currentColor;
  }
}
```

---

## 📱 Responsive Design

The design system is fully responsive and works across:
- Desktop (1440px+): 12-column grid, 48px margins, 24px gutters
- Tablet (768-1439px): 8-column grid, 32px margins, 16px gutters
- Mobile (<768px): 4-column grid, 16px margins, 16px gutters

---

## 🧪 Testing

### Verify Design Tokens

Run the verification script to ensure all tokens are available:

```bash
cd dashboard
node verify-design-tokens.js
```

### Visual Testing

Visit the test page to see all design tokens in action:

```bash
npm run dev
# Open http://localhost:3000/test-design-tokens
```

---

## 📚 Usage Examples

### Example 1: Hero AQI Section

```jsx
<div className="glass-card p-2xl text-center">
  <div className="text-display text-aqi-good">42</div>
  <div className="text-h2 text-white mt-md">Good</div>
  <div className="text-body text-white/80 mt-sm">
    Air quality is satisfactory
  </div>
</div>
```

### Example 2: Pollutant Card

```jsx
<div className="glass-card p-lg hover-lift">
  <div className="text-h3 text-white mb-sm">PM2.5</div>
  <div className="text-display text-aqi-moderate">85</div>
  <div className="text-caption text-white/60">μg/m³</div>
  <div className="mt-md h-2 bg-white/20 rounded-full overflow-hidden">
    <div className="h-full bg-aqi-moderate" style={{ width: '60%' }}></div>
  </div>
</div>
```

### Example 3: Animated Button

```jsx
<button className="glass-card p-lg hover-lift hover-scale focus-glow animate-fade-in">
  <span className="text-body text-white">View Forecast</span>
</button>
```

---

## 🎯 Requirements Validation

This design token system validates the following requirements:

✅ **Requirement 1.1** - Glassmorphic effects with rgba(255, 255, 255, 0.1) background, backdrop-filter blur(20px), and 1px border  
✅ **Requirement 1.2** - Dynamic gradient backgrounds based on AQI levels  
✅ **Requirement 1.3** - AQI-specific color palette  
✅ **Requirement 1.4** - Inter font family for primary text  
✅ **Requirement 1.5** - 4px base unit spacing system  
✅ **Requirement 1.6** - Elevation shadows for depth  
✅ **Requirement 2.1** - Hero section styling support  
✅ **Requirement 2.2** - Pollutant card styling support  
✅ **Requirement 2.3** - Circular meter styling support  
✅ **Requirement 2.4** - Animation support  

---

## 🔄 Updates and Maintenance

When adding new design tokens:

1. Add the CSS variable to the `@theme` block in `app/globals.css`
2. Create utility classes if needed
3. Update this documentation
4. Add verification checks to `verify-design-tokens.js`
5. Run verification: `node verify-design-tokens.js`
6. Update the test page: `app/test-design-tokens/page.tsx`

---

## 📖 References

- [Tailwind CSS v4 Documentation](https://tailwindcss.com/docs)
- [Glassmorphism Design Principles](https://uxdesign.cc/glassmorphism-in-user-interfaces-1f39bb1308c9)
- [AQI Color Standards](https://www.airnow.gov/aqi/aqi-basics/)
- [WCAG Accessibility Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
