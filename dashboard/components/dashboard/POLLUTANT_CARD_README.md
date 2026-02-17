# PollutantCard Component

A glassmorphic card component for displaying individual air pollutant metrics with visual indicators.

## Features

- 🎨 **Glassmorphic Design**: Frosted glass effect with backdrop blur
- 🎯 **Color-Coded**: Dynamic colors based on AQI sub-index
- 📊 **Progress Bar**: Animated gradient-filled progress indicator
- 🖱️ **Interactive**: Hover effects with lift animation and detailed tooltip
- ♿ **Accessible**: Full ARIA support and keyboard navigation
- 📱 **Responsive**: Fixed dimensions optimized for grid layouts

## Usage

```typescript
import { PollutantCard } from '@/components/dashboard/PollutantCard';

<PollutantCard
  pollutant="pm25"
  value={85.5}
  unit="μg/m³"
  aqi={120}
  status="unhealthy"
/>
```

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `pollutant` | `PollutantType` | Yes | Pollutant type: 'pm25', 'pm10', 'o3', 'no2', 'so2', 'co' |
| `value` | `number` | Yes | Numeric value of the pollutant |
| `unit` | `string` | Yes | Unit of measurement (e.g., 'μg/m³', 'mg/m³') |
| `aqi` | `number` | Yes | AQI sub-index for this pollutant (0-500) |
| `status` | `string` | Yes | Status label: 'good', 'moderate', 'unhealthy', etc. |
| `icon` | `React.ReactNode` | No | Custom icon (default icons provided) |
| `percentage` | `number` | No | Progress bar percentage (0-100, calculated from AQI if not provided) |

## Pollutant Types

The component supports 6 pollutant types with default icons:

- **PM2.5**: Fine particulate matter (< 2.5 μm)
- **PM10**: Coarse particulate matter (< 10 μm)
- **O₃**: Ozone
- **NO₂**: Nitrogen dioxide
- **SO₂**: Sulfur dioxide
- **CO**: Carbon monoxide

## Color Coding

Colors are automatically applied based on AQI sub-index:

| AQI Range | Color | Status |
|-----------|-------|--------|
| 0-50 | Green | Good |
| 51-100 | Yellow | Moderate |
| 101-150 | Orange | Unhealthy |
| 151-200 | Red | Very Unhealthy |
| 201+ | Brown | Hazardous |

## Styling

The component uses:
- **Dimensions**: 200px × 180px
- **Border**: 2px solid (color matches AQI level)
- **Background**: Glassmorphic with backdrop blur
- **Font Size**: 48px for value (700 weight)
- **Progress Bar**: 8px height with gradient fill

## Interactions

### Hover Effect
- Card lifts 4px with enhanced shadow
- Tooltip appears with detailed information
- Smooth transition (300ms)

### Tooltip Content
- Pollutant name
- Exact value with unit
- AQI sub-index
- Status label

## Accessibility

- `role="article"` for semantic structure
- `aria-label` describing the card
- Progress bar with proper ARIA attributes
- Icon labels for screen readers
- Keyboard navigation support

## Examples

### Basic Usage
```typescript
<PollutantCard
  pollutant="pm25"
  value={35.4}
  unit="μg/m³"
  aqi={75}
  status="moderate"
/>
```

### With Custom Percentage
```typescript
<PollutantCard
  pollutant="o3"
  value={85.7}
  unit="μg/m³"
  aqi={120}
  status="unhealthy"
  percentage={65}
/>
```

### With Custom Icon
```typescript
<PollutantCard
  pollutant="pm25"
  value={12.5}
  unit="μg/m³"
  aqi={45}
  status="good"
  icon={<CustomPM25Icon />}
/>
```

### Grid Layout
```typescript
<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
  <PollutantCard pollutant="pm25" value={35.4} unit="μg/m³" aqi={75} status="moderate" />
  <PollutantCard pollutant="pm10" value={55.3} unit="μg/m³" aqi={80} status="moderate" />
  <PollutantCard pollutant="o3" value={85.7} unit="μg/m³" aqi={120} status="unhealthy" />
  <PollutantCard pollutant="no2" value={125.4} unit="μg/m³" aqi={175} status="very_unhealthy" />
  <PollutantCard pollutant="so2" value={250.8} unit="μg/m³" aqi={350} status="hazardous" />
  <PollutantCard pollutant="co" value={8.5} unit="mg/m³" aqi={95} status="moderate" />
</div>
```

## Testing

Run unit tests:
```bash
npm test -- PollutantCard.test.tsx
```

Visual testing:
```bash
npm run dev
# Navigate to: http://localhost:3000/test-pollutant-card
```

## Design Specifications

- **Requirements**: 3.1, 3.2
- **Design Document**: `.kiro/specs/glassmorphic-dashboard/design.md`
- **Task**: 6.1 Create PollutantCard component

## Related Components

- `HeroAQISection`: Main AQI display
- `PollutantMetricsGrid`: Grid container for multiple cards (Task 6.5)
- `CircularAQIMeter`: Circular progress indicator

## Notes

- Progress bar animates on mount (1s ease-out)
- Hover effects use CSS transitions for smooth animations
- Component is fully typed with TypeScript
- Default icons are SVG-based for scalability
- Follows design tokens from `globals.css`
