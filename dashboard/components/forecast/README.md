# Forecast Components

This directory contains components related to air quality forecasting and prediction visualization.

## Components

### PredictionGraph

A line/area chart component that displays hourly AQI predictions for 24-48 hours.

**Location:** `components/forecast/PredictionGraph.tsx`

**Requirements:** 4.1, 4.2

**Features:**
- Recharts LineChart/AreaChart integration
- Animated line drawing on mount (2s ease-out)
- Gradient fill under the line
- Horizontal grid lines at AQI thresholds
- Interactive tooltips with exact values
- Optional confidence interval visualization
- Responsive container
- Configurable height

**Props:**

```typescript
interface PredictionGraphProps {
  forecasts: HourlyForecastData[];      // Array of hourly forecast data
  showConfidenceInterval?: boolean;      // Show confidence interval shading (default: false)
  height?: number;                       // Chart height in pixels (default: 280)
  onHover?: (forecast: HourlyForecastData | null) => void;  // Hover callback
}
```

**Usage:**

```tsx
import { PredictionGraph } from '@/components/forecast';

function ForecastPage() {
  const forecasts = [
    {
      timestamp: '2024-01-01T00:00:00Z',
      forecastHour: 0,
      aqi: {
        value: 50,
        category: 'good',
        categoryLabel: 'Good',
        color: '#4ADE80',
        confidenceLower: 45,
        confidenceUpper: 55,
      },
      pollutants: {},
      weather: { ... },
      confidence: { ... },
    },
    // ... more forecast data
  ];

  return (
    <PredictionGraph
      forecasts={forecasts}
      showConfidenceInterval={true}
      height={280}
    />
  );
}
```

**Testing:**

Run unit tests:
```bash
npm test -- components/forecast/__tests__/PredictionGraph.test.tsx
```

View test page:
```bash
npm run dev
# Navigate to http://localhost:3000/test-prediction-graph
```

**Implementation Status:**

- [x] Task 9.1: Create PredictionGraph component
  - [x] Create `components/forecast/PredictionGraph.tsx`
  - [x] Set up Recharts LineChart
  - [x] Configure axes and grid
  - [x] Test: Empty chart renders
  - [x] Requirements: 4.1, 4.2

**Next Steps:**

- [ ] Task 9.2: Implement line drawing with animation
- [ ] Task 9.3: Add confidence interval visualization
- [ ] Task 9.4: Implement interactive tooltips
- [ ] Task 9.5: Add threshold grid lines
- [ ] Task 9.6: Connect to forecast API
- [ ] Task 9.7: Write PredictionGraph tests

## Design Specifications

### Chart Configuration

**Dimensions:**
- Default height: 280px
- Width: 100% (responsive)
- Line thickness: 3px

**Colors:**
- Grid lines: rgba(255, 255, 255, 0.1)
- Axis labels: rgba(255, 255, 255, 0.7)
- Line stroke: #60A5FA (blue)
- Gradient fill: #60A5FA with opacity gradient

**Animation:**
- Line drawing: 2s ease-out
- Stagger reveals: 0.1s delay between elements

**Grid Lines:**
- Horizontal lines at AQI thresholds: 50, 100, 150, 200, 300
- Dashed pattern: 3 3
- No vertical lines

**Axes:**
- X-axis: Hours ahead (0-24 or 0-48)
- Y-axis: AQI values (0-auto)
- Font size: 12px
- Tick color: rgba(255, 255, 255, 0.7)

**Tooltip:**
- Background: rgba(0, 0, 0, 0.8)
- Border: 1px solid rgba(255, 255, 255, 0.2)
- Border radius: 8px
- Padding: 8px 12px
- Font size: 12px

### Data Structure

The component expects an array of `HourlyForecastData` objects:

```typescript
interface HourlyForecastData {
  timestamp: string;           // ISO 8601 timestamp
  forecastHour: number;        // Hours ahead (0-24 or 0-48)
  aqi: {
    value: number;             // AQI value (0-500)
    category: string;          // AQI category
    categoryLabel: string;     // Human-readable label
    color: string;             // Hex color for category
    confidenceLower: number;   // Lower confidence bound
    confidenceUpper: number;   // Upper confidence bound
  };
  pollutants: Record<string, PollutantReading>;
  weather: WeatherData;
  confidence: {
    score: number;             // Confidence score (0-1)
    modelWeights: Record<string, number>;
  };
}
```

## File Structure

```
components/forecast/
├── README.md                           # This file
├── index.ts                            # Barrel export
├── PredictionGraph.tsx                 # Main component
└── __tests__/
    └── PredictionGraph.test.tsx        # Unit tests
```

## Related Files

- **API Types:** `lib/api/types.ts` - TypeScript interfaces for forecast data
- **API Client:** `lib/api/client.ts` - Methods for fetching forecast data
- **Test Page:** `app/test-prediction-graph/page.tsx` - Visual testing page
- **Design Doc:** `.kiro/specs/glassmorphic-dashboard/design.md` - Component specifications
- **Tasks:** `.kiro/specs/glassmorphic-dashboard/tasks.md` - Implementation tasks

## Dependencies

- **recharts** (^3.7.0): Chart library for React
- **react** (19.2.3): React framework
- **@/lib/api/types**: TypeScript interfaces

## Notes

- The component uses Recharts' `AreaChart` instead of `LineChart` to support gradient fills
- Animation is handled by Recharts' built-in `animationDuration` and `animationEasing` props
- The component is fully responsive using `ResponsiveContainer`
- Confidence intervals are optional and can be toggled via props
- The component is designed to work with both 24-hour and 48-hour forecasts
- Grid lines at AQI thresholds will be added in Task 9.5
- Interactive tooltips with enhanced features will be added in Task 9.4
- API integration will be added in Task 9.6

## Accessibility

- Chart elements have proper ARIA labels (to be added in Task 9.4)
- Tooltips are keyboard accessible (to be added in Task 9.4)
- Color is not the only indicator of AQI levels (patterns/icons to be added)
- Focus indicators for interactive elements (to be added in Task 9.4)

## Performance

- Lazy loading: Component can be lazy loaded for below-the-fold placement
- Animation performance: 60fps target maintained
- Data transformation: Minimal overhead, O(n) complexity
- Re-render optimization: Uses React.memo (to be added if needed)
