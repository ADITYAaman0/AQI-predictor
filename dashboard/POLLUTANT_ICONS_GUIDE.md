# Pollutant Icons & Color Coding Guide

## Overview

This guide documents the icon set and color coding system for pollutant cards in the Glassmorphic AQI Dashboard.

---

## Pollutant Icons

### PM2.5 - Fine Particulate Matter
```
Icon: Multiple small dots (9 circles)
Rationale: Represents fine particles ≤2.5 micrometers
Visual Pattern: Dense, scattered small particles
```
**Description**: Fine particulate matter that can penetrate deep into lungs. Primary sources include combustion processes, vehicle emissions, and industrial activities.

### PM10 - Coarse Particulate Matter
```
Icon: Fewer, larger dots (5 circles)
Rationale: Represents coarse particles ≤10 micrometers
Visual Pattern: Sparser, larger particles
```
**Description**: Coarse particulate matter from dust, pollen, and mold. Can irritate airways and cause respiratory issues.

### O₃ - Ozone
```
Icon: Sun with rays (circle + 8 radiating lines)
Rationale: Ozone forms when sunlight reacts with pollutants
Visual Pattern: Sun-like representation
```
**Description**: Ground-level ozone formed by photochemical reactions. Not emitted directly but created by reactions between NOx and VOCs in sunlight.

### NO₂ - Nitrogen Dioxide
```
Icon: Wave patterns (6 curved paths)
Rationale: Represents gaseous emissions
Visual Pattern: Flowing, wave-like smoke
```
**Description**: Reddish-brown gas from combustion processes. Primary sources include vehicles, power plants, and industrial facilities.

### SO₂ - Sulfur Dioxide
```
Icon: Factory with smoke stacks
Rationale: Primary source is industrial emissions
Visual Pattern: Building with emissions
```
**Description**: Colorless gas with pungent odor. Primarily from fossil fuel combustion at power plants and industrial facilities.

### CO - Carbon Monoxide
```
Icon: Vehicle/exhaust system
Rationale: Primary source is vehicle emissions
Visual Pattern: Simplified vehicle with exhaust
```
**Description**: Colorless, odorless gas from incomplete combustion. Primary sources include vehicles, especially in urban areas.

---

## Color Coding System

### AQI Categories and Colors

| AQI Range | Category | Color | Hex Code | Health Implications |
|-----------|----------|-------|----------|---------------------|
| 0-50 | Good | 🟢 Green | `#4ADE80` | Air quality is satisfactory |
| 51-100 | Moderate | 🟡 Yellow | `#FCD34D` | Acceptable for most people |
| 101-150 | Unhealthy for Sensitive | 🟠 Orange | `#FB923C` | Sensitive groups may experience effects |
| 151-200 | Unhealthy | 🔴 Red | `#EF4444` | Everyone may begin to experience effects |
| 201-300 | Very Unhealthy | 🔴 Dark Red | `#B91C1C` | Health alert: everyone may experience serious effects |
| 301+ | Hazardous | 🟤 Brown | `#7C2D12` | Health warning: emergency conditions |

### Color Application

Colors are applied to multiple elements for consistency:

1. **Card Border** (2px)
   - Provides clear visual boundary
   - Immediately indicates severity

2. **Icon Color**
   - SVG stroke color matches category
   - Reinforces visual association

3. **Status Label**
   - Text color matches category
   - Provides textual confirmation

4. **Progress Bar**
   - Gradient fill using category color
   - Shows relative level within category

---

## Usage Examples

### Basic Usage
```tsx
import { PollutantCard } from '@/components/dashboard/PollutantCard';

// Good air quality
<PollutantCard
  pollutant="pm25"
  value={25}
  unit="μg/m³"
  aqi={40}
  status="good"
/>

// Hazardous air quality
<PollutantCard
  pollutant="pm25"
  value={250}
  unit="μg/m³"
  aqi={400}
  status="hazardous"
/>
```

### Custom Icon
```tsx
import { PollutantCard } from '@/components/dashboard/PollutantCard';
import CustomIcon from './CustomIcon';

<PollutantCard
  pollutant="pm25"
  value={50}
  unit="μg/m³"
  aqi={75}
  status="moderate"
  icon={<CustomIcon />}
/>
```

---

## Design Principles

### Icon Design
1. **Simplicity**: Icons are simple and recognizable at small sizes
2. **Distinctiveness**: Each icon is visually unique
3. **Meaning**: Icons relate to the pollutant's source or nature
4. **Scalability**: SVG format ensures crisp rendering at any size
5. **Accessibility**: All icons have descriptive ARIA labels

### Color Design
1. **Consistency**: Colors match established AQI standards
2. **Contrast**: Colors are distinct and easily differentiated
3. **Accessibility**: Colors meet WCAG AA contrast requirements
4. **Universality**: Color scheme is internationally recognized
5. **Redundancy**: Color is not the only indicator (icons + text)

---

## Accessibility

### Screen Readers
- Icons have `aria-label` attributes
- Status labels provide textual information
- Card has `role="article"` for semantic structure

### Color Blindness
- Icons provide shape-based differentiation
- Status labels provide text-based information
- Multiple visual cues (border, icon, text, progress bar)

### Keyboard Navigation
- Cards are focusable
- Hover states work with keyboard focus
- Tooltips accessible via keyboard

---

## Testing

### Visual Test Page
Navigate to `/test-pollutant-icons` to see:
- All pollutants at moderate level
- PM2.5 at all AQI levels
- Complete color coding matrix
- Icon design details
- AQI color reference

### Automated Tests
Run tests with:
```bash
npm test -- PollutantCard.icons-colors.test.tsx
```

Tests cover:
- Icon rendering for all pollutants
- Color coding for all AQI categories
- Integration of icons and colors
- Edge cases and boundary values

---

## Browser Support

### Icon Rendering
- ✅ Chrome/Edge (Chromium)
- ✅ Firefox
- ✅ Safari
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)

### Color Display
- ✅ All modern browsers support hex colors
- ✅ Colors are consistent across devices
- ✅ No browser-specific color adjustments needed

---

## Performance

### Icon Performance
- **Size**: < 1KB per icon (inline SVG)
- **Rendering**: Instant (no HTTP requests)
- **Scalability**: Vector-based, no quality loss

### Color Performance
- **Calculation**: O(1) complexity
- **Memory**: Static hex values
- **Updates**: Instant color changes

---

## Maintenance

### Adding New Pollutants
1. Add pollutant type to `PollutantType` in `types.ts`
2. Add icon case to `getDefaultIcon()` function
3. Add display name to `getPollutantName()` function
4. Add test cases to test file
5. Update this guide

### Modifying Colors
1. Update `getColorFromAQI()` function
2. Update color reference in this guide
3. Update test expectations
4. Verify WCAG contrast compliance

---

## References

### AQI Standards
- [EPA AQI Guide](https://www.airnow.gov/aqi/aqi-basics/)
- [WHO Air Quality Guidelines](https://www.who.int/news-room/fact-sheets/detail/ambient-(outdoor)-air-quality-and-health)

### Design Resources
- [Material Design Icons](https://material.io/design/iconography)
- [Accessible Color Palettes](https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html)

---

## Version History

### v1.0.0 (Current)
- Initial icon set for 6 pollutants
- 6-tier color coding system
- Full accessibility support
- Comprehensive test coverage

---

**Last Updated**: Task 6.2 Completion
**Maintained By**: Dashboard Development Team
