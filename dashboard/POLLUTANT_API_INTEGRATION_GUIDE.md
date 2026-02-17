# Pollutant API Integration Guide

## Quick Start

### Using the Live Component

```typescript
import { PollutantMetricsGridLive } from '@/components/dashboard/PollutantMetricsGridLive';

function MyDashboard() {
  return (
    <PollutantMetricsGridLive
      location="Delhi"
      onDataLoaded={() => console.log('Pollutant data loaded!')}
      onError={(error) => console.error('Failed to load:', error)}
    />
  );
}
```

### Using the Mapper Utility

```typescript
import { mapPollutantsToCards } from '@/lib/utils/pollutant-mapper';
import { useCurrentAQI } from '@/lib/api/hooks/useCurrentAQI';

function CustomComponent() {
  const { data } = useCurrentAQI({ location: 'Delhi' });
  
  if (data) {
    const pollutants = mapPollutantsToCards(data);
    // pollutants is now an array of 6 PollutantCardProps
    console.log(pollutants);
  }
}
```

## Data Transformation

### Input (API Response)
```json
{
  "pollutants": {
    "pm25": {
      "parameter": "pm25",
      "value": 65.5,
      "unit": "μg/m³",
      "aqi_value": 156,
      "category": "Unhealthy"
    },
    "pm10": { ... },
    "o3": { ... },
    "no2": { ... },
    "so2": { ... },
    "co": { ... }
  }
}
```

### Output (PollutantCardProps)
```typescript
[
  {
    pollutant: 'pm25',
    value: 65.5,
    unit: 'μg/m³',
    aqi: 156,
    status: 'Unhealthy',
    percentage: 31  // (156/500 * 100)
  },
  // ... 5 more pollutants
]
```

## Component States

### 1. Loading State
```
┌─────────────────────────────────┐
│                                 │
│         ⟳ Loading...            │
│   Loading pollutant data...     │
│                                 │
└─────────────────────────────────┘
```

### 2. Success State
```
┌─────────────────────────────────┐
│  PM2.5    PM10     O₃           │
│  [Card]   [Card]   [Card]       │
│                                 │
│  NO₂      SO₂      CO           │
│  [Card]   [Card]   [Card]       │
│                                 │
│  Last updated: 10:30:45 AM      │
└─────────────────────────────────┘
```

### 3. Error State
```
┌─────────────────────────────────┐
│           ⚠️                     │
│  Failed to load pollutant data  │
│  Network error                  │
│                                 │
│      [Try Again Button]         │
└─────────────────────────────────┘
```

## AQI to Status Mapping

| AQI Range | Status                           | Color   |
|-----------|----------------------------------|---------|
| 0-50      | Good                             | Green   |
| 51-100    | Moderate                         | Yellow  |
| 101-150   | Unhealthy for Sensitive Groups   | Orange  |
| 151-200   | Unhealthy                        | Red     |
| 201-300   | Very Unhealthy                   | Purple  |
| 301+      | Hazardous                        | Maroon  |

## Pollutant Units

| Pollutant | Unit    | Description                    |
|-----------|---------|--------------------------------|
| PM2.5     | μg/m³   | Fine particulate matter        |
| PM10      | μg/m³   | Coarse particulate matter      |
| O₃        | μg/m³   | Ozone                          |
| NO₂       | μg/m³   | Nitrogen dioxide               |
| SO₂       | μg/m³   | Sulfur dioxide                 |
| CO        | mg/m³   | Carbon monoxide                |

## API Endpoint

```
GET /api/v1/forecast/current/{location}
```

**Example Request:**
```bash
curl http://localhost:8000/api/v1/forecast/current/Delhi
```

**Example Response:**
```json
{
  "location": {
    "coordinates": { "latitude": 28.6139, "longitude": 77.209 },
    "name": "Delhi",
    "city": "Delhi",
    "country": "India"
  },
  "timestamp": "2024-01-15T10:00:00Z",
  "aqi": {
    "value": 156,
    "category": "unhealthy",
    "categoryLabel": "Unhealthy",
    "dominantPollutant": "pm25",
    "color": "#FB923C",
    "healthMessage": "Everyone should limit prolonged outdoor exertion"
  },
  "pollutants": {
    "pm25": {
      "parameter": "pm25",
      "value": 65.5,
      "unit": "μg/m³",
      "aqi_value": 156,
      "category": "Unhealthy"
    },
    "pm10": { ... },
    "o3": { ... },
    "no2": { ... },
    "so2": { ... },
    "co": { ... }
  },
  "weather": { ... },
  "sourceAttribution": { ... },
  "confidence": { ... },
  "dataSources": ["CPCB", "OpenAQ"],
  "lastUpdated": "2024-01-15T10:00:00Z",
  "modelVersion": "1.0.0"
}
```

## Error Handling

### Network Errors
```typescript
<PollutantMetricsGridLive
  location="Delhi"
  onError={(error) => {
    if (error.message.includes('Network')) {
      // Handle network error
      showNotification('Check your internet connection');
    }
  }}
/>
```

### API Errors
```typescript
<PollutantMetricsGridLive
  location="Delhi"
  onError={(error) => {
    if (error.statusCode === 404) {
      // Location not found
      showNotification('Location not found');
    } else if (error.statusCode === 500) {
      // Server error
      showNotification('Server error, please try again later');
    }
  }}
/>
```

## Testing

### Run Unit Tests
```bash
cd dashboard
npm test -- pollutant-mapper.test.ts
```

### Run Integration Tests
```bash
cd dashboard
npm test -- PollutantMetricsGridLive.test.tsx
```

### View Test Page
```bash
cd dashboard
npm run dev
# Navigate to http://localhost:3000/test-pollutant-grid-live
```

## Troubleshooting

### Issue: No data displays
**Solution:** Ensure backend is running on `http://localhost:8000`

### Issue: Loading state never ends
**Solution:** Check API endpoint is accessible and returns valid JSON

### Issue: Wrong pollutant values
**Solution:** Verify API response structure matches expected format

### Issue: Missing pollutants
**Solution:** Check if all 6 pollutants are present in API response

## Performance Tips

1. **Use React Query caching** - Data is cached for 5 minutes by default
2. **Debounce location changes** - Avoid rapid API calls when switching locations
3. **Lazy load component** - Use dynamic imports for code splitting
4. **Optimize re-renders** - Use React.memo if needed

## Accessibility

- ✅ ARIA labels for all states
- ✅ Loading state announced to screen readers
- ✅ Error state announced with assertive live region
- ✅ Success state has descriptive region label
- ✅ Keyboard navigation supported

## Browser Support

- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+

## Dependencies

- `@tanstack/react-query` - Data fetching and caching
- `axios` - HTTP client
- `react` - UI framework
- `next` - React framework

## Related Files

- `lib/utils/pollutant-mapper.ts` - Data transformation
- `components/dashboard/PollutantMetricsGridLive.tsx` - Live component
- `components/dashboard/PollutantMetricsGrid.tsx` - Presentational component
- `components/dashboard/PollutantCard.tsx` - Individual card
- `lib/api/hooks/useCurrentAQI.ts` - Data fetching hook
- `lib/api/aqi-client.ts` - API client

## Support

For issues or questions:
1. Check test page at `/test-pollutant-grid-live`
2. Review unit tests for expected behavior
3. Verify API response format
4. Check browser console for errors
