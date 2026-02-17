# Design Document: Glassmorphic AQI Dashboard

## Overview

The Glassmorphic AQI Dashboard is a modern, production-ready web application that provides real-time air quality monitoring, predictions, and health recommendations through a visually stunning glassmorphic interface. The dashboard will be built as a single-page application (SPA) using React/Next.js with TypeScript, integrating seamlessly with the existing FastAPI backend.

### Key Design Goals

1. **Visual Excellence**: Implement glassmorphism design with frosted glass effects, dynamic backgrounds, and smooth animations
2. **Performance**: Achieve sub-500ms API response times and maintain 60fps animations
3. **Accessibility**: Ensure WCAG AA compliance with keyboard navigation and screen reader support
4. **Responsiveness**: Provide optimal experience across desktop (1440px+), tablet (768-1439px), and mobile (<768px)
5. **Real-time Updates**: Display current air quality data with automatic refresh every 5 minutes
6. **Integration**: Leverage existing backend APIs, ML models, and data pipelines

### Technology Stack

**Frontend Framework:**
- Next.js 14+ with React 18+ (App Router)
- TypeScript for type safety
- Tailwind CSS with custom design tokens

**State Management:**
- React Context API for global state
- TanStack Query (React Query) for server state management and caching

**Data Visualization:**
- Recharts for charts (lightweight, React-native)
- Framer Motion for animations
- D3.js for advanced visualizations (if needed)

**Maps:**
- Mapbox GL JS for geographic visualizations

**Real-time Communication:**
- WebSocket client for live updates
- Fallback to polling for compatibility

**PWA:**
- Next.js PWA plugin
- Workbox for service worker management

## Architecture

### Component Hierarchy

```
App
├── Layout
│   ├── TopNavigation
│   │   ├── SegmentedControl (Real-time | Forecast | Insights | Sensors)
│   │   ├── NotificationBell
│   │   └── UserProfile
│   ├── Sidebar
│   │   ├── DashboardIcon
│   │   ├── DarkModeToggle
│   │   ├── FavoritesIcon
│   │   └── SettingsIcon
│   └── BottomNavigation (Mobile only)
├── Pages
│   ├── RealTimePage
│   │   ├── HeroAQISection
│   │   │   ├── CircularAQIMeter
│   │   │   ├── LocationSelector
│   │   │   └── LastUpdatedTimestamp
│   │   ├── PollutantMetricsGrid
│   │   │   └── PollutantCard (×6)
│   │   ├── WeatherBadges
│   │   ├── HealthRecommendationsCard
│   │   └── SourceAttributionCard
│   ├── ForecastPage
│   │   ├── PredictionGraph (24-48h)
│   │   ├── HourlyForecastList
│   │   └── ConfidenceIntervalDisplay
│   ├── InsightsPage
│   │   ├── HistoricalTrendsChart
│   │   ├── CalendarHeatmap
│   │   └── ComparativeAnalysis
│   └── SensorsPage
│       ├── ConnectedDevicesList
│       ├── DeviceCard
│       └── AddDeviceButton
└── Providers
    ├── ThemeProvider (Light/Dark mode)
    ├── LocationProvider (Current location state)
    ├── WebSocketProvider (Real-time updates)
    └── QueryClientProvider (API caching)
```

### Data Flow

```
User Interaction
    ↓
React Component
    ↓
TanStack Query Hook
    ↓
API Client (axios)
    ↓
FastAPI Backend (/api/v1/*)
    ↓
Response Processing
    ↓
Cache Update (React Query)
    ↓
Component Re-render
    ↓
Framer Motion Animation
```

### State Management Strategy

**Server State (TanStack Query):**
- Current AQI data (5-minute cache)
- 24-hour forecast (1-hour cache)
- Historical data (24-hour cache)
- User alerts (no cache, always fresh)

**Client State (React Context):**
- Current location selection
- Dark mode preference
- User preferences (alert thresholds, favorite locations)
- UI state (sidebar collapsed, modal open, etc.)

**Local Storage:**
- Favorite locations
- Dark mode preference
- Alert configuration
- Last viewed location

## Components and Interfaces

### Core Components

#### 1. HeroAQISection Component

**Purpose**: Display the current AQI value prominently with circular meter animation.

**Props:**
```typescript
interface HeroAQISectionProps {
  aqi: number;
  category: AQICategory;
  categoryLabel: string;
  dominantPollutant: string;
  color: string;
  healthMessage: string;
  location: LocationInfo;
  lastUpdated: string;
  isLoading: boolean;
}
```

**Behavior:**
- Animate circular progress ring from 0 to AQI value on mount (1.5s ease-out)
- Apply gradient stroke matching AQI category color
- Display pulsing animation when data is updating
- Show skeleton loader while fetching data

**Styling:**
- 240px diameter circular meter
- 72px font size for AQI value (weight 700)
- Glassmorphic card background
- Dynamic gradient background based on AQI level

#### 2. PollutantCard Component

**Purpose**: Display individual pollutant metrics with visual indicators.

**Props:**
```typescript
interface PollutantCardProps {
  pollutant: PollutantType; // 'pm25' | 'pm10' | 'o3' | 'no2' | 'so2' | 'co'
  value: number;
  unit: string;
  aqi: number;
  status: string; // 'good' | 'moderate' | 'unhealthy' | etc.
  icon: React.ReactNode;
  percentage: number; // 0-100, for progress bar
}
```

**Behavior:**
- Animate progress bar fill on mount
- Lift card 4px on hover with enhanced shadow (0.3s ease)
- Display tooltip with detailed information on hover
- Color-code based on AQI sub-index

**Styling:**
- 200×180px card dimensions
- 48px font size for value (weight 700)
- 8px height progress bar with gradient fill
- 32×32px icon size

#### 3. PredictionGraph Component

**Purpose**: Visualize 24-48 hour AQI predictions with confidence intervals.

**Props:**
```typescript
interface PredictionGraphProps {
  forecasts: HourlyForecast[];
  showConfidenceInterval: boolean;
  height: number; // default 280px
  onHover?: (forecast: HourlyForecast | null) => void;
}

interface HourlyForecast {
  timestamp: string;
  aqi: number;
  aqiLower: number;
  aqiUpper: number;
  category: string;
  temperature: number;
  humidity: number;
  windSpeed: number;
  confidence: number;
}
```

**Behavior:**
- Animate line drawing from left to right (2s on mount)
- Display tooltip on hover with exact values
- Show 8px circles at data points on hover
- Render confidence interval as shaded area
- Support zoom and pan interactions

**Styling:**
- 280px height
- 3px line thickness
- Gradient fill under line matching AQI zones
- Horizontal grid lines at AQI thresholds (50, 100, 150, 200, 300)

#### 4. LocationSelector Component

**Purpose**: Allow users to search and select locations for AQI monitoring.

**Props:**
```typescript
interface LocationSelectorProps {
  currentLocation: LocationInfo;
  favoriteLocations: LocationInfo[];
  onLocationChange: (location: LocationInfo) => void;
  onAddFavorite: (location: LocationInfo) => void;
  onRemoveFavorite: (locationId: string) => void;
}

interface LocationInfo {
  id: string;
  name: string;
  city: string;
  state: string;
  country: string;
  latitude: number;
  longitude: number;
}
```

**Behavior:**
- Debounce search input (300ms)
- Display autocomplete suggestions
- Show mini map preview (optional)
- Request geolocation permission on first use
- Save favorites to local storage

**Styling:**
- Dropdown/modal with glassmorphic background
- Search input with icon
- List of favorite locations with remove button

#### 5. WeatherBadges Component

**Purpose**: Display current weather conditions affecting air quality.

**Props:**
```typescript
interface WeatherBadgesProps {
  temperature: number;
  humidity: number;
  windSpeed: number;
  windDirection: number;
  pressure: number;
}
```

**Behavior:**
- Update when AQI data refreshes
- Animate value changes smoothly
- Display wind direction as compass or degrees

**Styling:**
- 56px diameter circular badges
- 20px icon size
- 14px value font, 10px unit font
- 12px horizontal gap between badges

#### 6. HealthRecommendationsCard Component

**Purpose**: Provide contextual health advice based on current AQI.

**Props:**
```typescript
interface HealthRecommendationsCardProps {
  aqi: number;
  category: AQICategory;
  recommendations: string[];
  learnMoreUrl?: string;
}
```

**Behavior:**
- Update recommendations based on AQI level
- Color-code by urgency (green, yellow, orange, red)
- Link to detailed health information

**Styling:**
- Glassmorphic card with medical icon
- Bulleted list of 3-4 recommendations
- "Learn more" link at bottom

#### 7. DeviceCard Component

**Purpose**: Display connected air quality sensor information.

**Props:**
```typescript
interface DeviceCardProps {
  device: SensorDevice;
  onViewDetails: (deviceId: string) => void;
  onRemove: (deviceId: string) => void;
}

interface SensorDevice {
  id: string;
  name: string;
  status: 'connected' | 'disconnected' | 'low_battery';
  location: string;
  batteryLevel: number;
  lastReading: {
    timestamp: string;
    aqi: number;
  };
}
```

**Behavior:**
- Show colored status dot (green/yellow/red)
- Scale slightly on hover with glow effect
- Open details modal on "View Details" click
- Confirm before removing device

**Styling:**
- Glassmorphic card
- Device icon or image
- Status indicator dot
- Battery level indicator

### API Client Interface

```typescript
class AQIDashboardAPIClient {
  private baseURL: string;
  private authToken: string | null;
  
  constructor(baseURL: string) {
    this.baseURL = baseURL;
    this.authToken = null;
  }
  
  // Authentication
  async login(username: string, password: string): Promise<AuthResponse>;
  async logout(): Promise<void>;
  setAuthToken(token: string): void;
  
  // Current AQI
  async getCurrentAQI(location: string): Promise<CurrentAQIResponse>;
  
  // Forecasts
  async get24HourForecast(location: string): Promise<ForecastResponse>;
  async get48HourForecast(location: string): Promise<ForecastResponse>;
  
  // Historical Data
  async getHistoricalData(
    location: string,
    startDate: string,
    endDate: string,
    parameter?: string
  ): Promise<HistoricalDataResponse>;
  
  // Alerts
  async getAlerts(): Promise<Alert[]>;
  async createAlert(alert: CreateAlertRequest): Promise<Alert>;
  async updateAlert(alertId: string, alert: UpdateAlertRequest): Promise<Alert>;
  async deleteAlert(alertId: string): Promise<void>;
  
  // Devices
  async getDevices(): Promise<SensorDevice[]>;
  async addDevice(device: AddDeviceRequest): Promise<SensorDevice>;
  async removeDevice(deviceId: string): Promise<void>;
  
  // Spatial Data
  async getSpatialForecast(bounds: BoundingBox, resolution: number): Promise<SpatialForecastResponse>;
}
```

### WebSocket Interface

```typescript
class AQIWebSocketClient {
  private ws: WebSocket | null;
  private reconnectAttempts: number;
  private maxReconnectAttempts: number;
  
  constructor(url: string) {
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
  }
  
  connect(): void;
  disconnect(): void;
  
  // Subscribe to location updates
  subscribeToLocation(location: string, callback: (data: AQIUpdate) => void): void;
  unsubscribeFromLocation(location: string): void;
  
  // Subscribe to alerts
  subscribeToAlerts(callback: (alert: Alert) => void): void;
  
  // Handle reconnection
  private reconnect(): void;
  private handleError(error: Event): void;
}
```

## Data Models

### TypeScript Interfaces

```typescript
// AQI Data Models
interface AQIData {
  value: number;
  category: AQICategory;
  categoryLabel: string;
  dominantPollutant: string;
  color: string;
  healthMessage: string;
}

type AQICategory = 'good' | 'moderate' | 'unhealthy_sensitive' | 'unhealthy' | 'very_unhealthy' | 'hazardous';

interface PollutantReading {
  value: number;
  unit: string;
  aqi: number;
  status: string;
}

interface CurrentAQIResponse {
  location: LocationInfo;
  timestamp: string;
  aqi: AQIData;
  pollutants: {
    pm25: PollutantReading;
    pm10: PollutantReading;
    o3: PollutantReading;
    no2: PollutantReading;
    so2: PollutantReading;
    co: PollutantReading;
  };
  weather: WeatherData;
  sourceAttribution: SourceAttribution;
  confidence: ConfidenceData;
  dataSources: string[];
  lastUpdated: string;
  modelVersion: string;
}

interface WeatherData {
  temperature: number;
  humidity: number;
  windSpeed: number;
  windDirection: number;
  pressure: number;
}

interface SourceAttribution {
  vehicular: number;
  industrial: number;
  biomass: number;
  background: number;
}

interface ConfidenceData {
  pm25Lower: number;
  pm25Upper: number;
  level: 'high' | 'medium' | 'low';
  score: number;
  modelWeights: Record<string, number>;
}

// Forecast Models
interface ForecastResponse {
  location: LocationInfo;
  forecastType: '24_hour' | '48_hour';
  generatedAt: string;
  forecasts: HourlyForecastData[];
  metadata: ForecastMetadata;
}

interface HourlyForecastData {
  timestamp: string;
  forecastHour: number;
  aqi: {
    value: number;
    category: string;
    categoryLabel: string;
    color: string;
    confidenceLower: number;
    confidenceUpper: number;
  };
  pollutants: Record<string, PollutantReading>;
  weather: WeatherData;
  confidence: {
    score: number;
    modelWeights: Record<string, number>;
  };
}

interface ForecastMetadata {
  modelVersion: string;
  confidenceLevel: number;
  dataSources: string[];
  spatialResolution: string;
  updateFrequency: string;
  ensembleInfo: {
    modelsUsed: string[];
    dynamicWeighting: boolean;
    confidenceIntervals: boolean;
  };
}

// Alert Models
interface Alert {
  id: string;
  userId: string;
  location: LocationInfo;
  threshold: number;
  condition: 'above' | 'below';
  enabled: boolean;
  notificationChannels: ('push' | 'email' | 'sms')[];
  createdAt: string;
  lastTriggered?: string;
}

interface CreateAlertRequest {
  location: string;
  threshold: number;
  condition: 'above' | 'below';
  notificationChannels: ('push' | 'email' | 'sms')[];
}

// Historical Data Models
interface HistoricalDataResponse {
  location: LocationInfo;
  parameter: string;
  startDate: string;
  endDate: string;
  data: HistoricalDataPoint[];
  statistics: {
    min: number;
    max: number;
    mean: number;
    median: number;
  };
}

interface HistoricalDataPoint {
  timestamp: string;
  value: number;
  aqi: number;
  category: string;
}
```

### Design Tokens (Tailwind Config)

```typescript
// tailwind.config.ts
const config = {
  theme: {
    extend: {
      colors: {
        aqi: {
          good: '#4ADE80',
          moderate: '#FCD34D',
          unhealthy: '#FB923C',
          veryUnhealthy: '#EF4444',
          hazardous: '#7C2D12',
        },
        glass: {
          light: 'rgba(255, 255, 255, 0.1)',
          border: 'rgba(255, 255, 255, 0.18)',
        },
      },
      spacing: {
        xs: '4px',
        sm: '8px',
        md: '16px',
        lg: '24px',
        xl: '32px',
        '2xl': '48px',
        '3xl': '64px',
      },
      fontSize: {
        display: ['72px', { lineHeight: '1', fontWeight: '700' }],
        h1: ['32px', { lineHeight: '1.2', fontWeight: '600' }],
        h2: ['20px', { lineHeight: '1.3', fontWeight: '600' }],
        h3: ['16px', { lineHeight: '1.4', fontWeight: '500' }],
        body: ['14px', { lineHeight: '1.5', fontWeight: '400' }],
        caption: ['12px', { lineHeight: '1.4', fontWeight: '400' }],
        micro: ['10px', { lineHeight: '1.2', fontWeight: '500', letterSpacing: '0.5px' }],
      },
      boxShadow: {
        glass: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
        level1: '0 2px 8px rgba(0, 0, 0, 0.1)',
        level2: '0 4px 16px rgba(0, 0, 0, 0.15)',
        level3: '0 8px 32px rgba(0, 0, 0, 0.2)',
        glow: '0 0 20px rgba(245, 158, 11, 0.5)',
      },
      backdropBlur: {
        glass: '20px',
      },
      animation: {
        'fade-in': 'fadeIn 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        'slide-up': 'slideUp 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        'draw-line': 'drawLine 2s ease-out',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        drawLine: {
          '0%': { strokeDashoffset: '1000' },
          '100%': { strokeDashoffset: '0' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(245, 158, 11, 0.3)' },
          '50%': { boxShadow: '0 0 30px rgba(245, 158, 11, 0.6)' },
        },
      },
    },
  },
  plugins: [],
};
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*


### Property 1: Glassmorphic Styling Consistency
*For any* card component in the dashboard, the computed styles should include rgba(255, 255, 255, 0.1) background, backdrop-filter blur(20px), and 1px border with rgba(255, 255, 255, 0.18)
**Validates: Requirements 1.1**

### Property 2: Dynamic Background Matching
*For any* AQI value, the dashboard background gradient should match the expected gradient for that AQI category (good: blue-purple, moderate: pink-red, unhealthy: blue-cyan, hazardous: dark)
**Validates: Requirements 1.2**

### Property 3: Hero Ring Color Matching
*For any* AQI value, the circular progress ring stroke color should match the AQI category color
**Validates: Requirements 2.5**

### Property 4: Health Message Appropriateness
*For any* AQI value, the displayed health message should be appropriate for that AQI level's category
**Validates: Requirements 2.7, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6**

### Property 5: Pollutant Card Completeness
*For any* pollutant data, the rendered pollutant card should contain pollutant name with icon, numeric value with unit, progress bar, and status label
**Validates: Requirements 3.2**

### Property 6: Pollutant Color Coding
*For any* pollutant with an AQI sub-index, the card color should match the appropriate AQI category color for that sub-index value
**Validates: Requirements 3.6**

### Property 7: Forecast Data Completeness
*For any* forecast data array, the prediction graph should display all hourly predictions without omitting data points
**Validates: Requirements 4.1**

### Property 8: Forecast Gradient Matching
*For any* AQI value in the prediction graph, the gradient fill color should match the AQI zone color for that value
**Validates: Requirements 4.3**

### Property 9: Forecast Tooltip Completeness
*For any* data point in the prediction graph, hovering should display a tooltip containing AQI value, timestamp, and confidence interval
**Validates: Requirements 4.5**

### Property 10: Confidence Interval Visualization
*For any* forecast with confidence data (upper and lower bounds), the graph should display shaded areas representing the confidence interval
**Validates: Requirements 4.8**

### Property 11: Weather Data Synchronization
*For any* AQI data update, weather data should also be updated in the same refresh cycle
**Validates: Requirements 5.5**

### Property 12: Health Recommendation Color Coding
*For any* AQI level, the health recommendation card color should match the urgency level for that AQI category
**Validates: Requirements 6.8**

### Property 13: Mobile Touch Target Sizing
*For any* interactive element on mobile viewport (<768px), the touch target size should be at least 44x44px
**Validates: Requirements 7.6**

### Property 14: Responsive Chart Adaptation
*For any* screen size, charts should adjust their proportions and data point density appropriately
**Validates: Requirements 7.7**

### Property 15: API Endpoint Correctness
*For any* data request (current AQI, forecast, historical, alerts), the dashboard should call the correct API endpoint with proper parameters
**Validates: Requirements 9.1, 15.1, 15.2, 15.3, 15.4, 19.7**

### Property 16: Threshold Crossing Animation
*For any* AQI value that crosses a critical threshold (50, 100, 150, 200, 300), the Hero Section should apply a flash/glow effect
**Validates: Requirements 9.4**

### Property 17: Location Search Format Support
*For any* valid location input format (city name, coordinates, or address), the location search should successfully find and return results
**Validates: Requirements 10.3**

### Property 18: Favorite Location Persistence
*For any* location marked as favorite, it should be saved to local storage and retrievable on subsequent visits
**Validates: Requirements 10.4**

### Property 19: Device Card Completeness
*For any* connected sensor device, the device card should display device name, connection status, location, and battery level
**Validates: Requirements 11.1**

### Property 20: Device Status Color Coding
*For any* device status (connected, low_battery, disconnected), the status indicator dot color should match the status (green, yellow, red respectively)
**Validates: Requirements 11.4**

### Property 21: Card Hover Animation
*For any* card component, hovering should lift the card by 4px and enhance the shadow
**Validates: Requirements 12.1**

### Property 22: Button Click Animation
*For any* button element, clicking should scale it down to 0.95 then back to 1.0
**Validates: Requirements 12.2**

### Property 23: Numeric Value Animation
*For any* numeric value change, the dashboard should animate from the old value to the new value over 1.5 seconds
**Validates: Requirements 12.4**

### Property 24: Text Contrast Compliance
*For any* text element, the contrast ratio between text and background should be at least 4.5:1 (WCAG AA)
**Validates: Requirements 13.1**

### Property 25: Keyboard Navigation Support
*For any* interactive element, it should be reachable and operable using keyboard navigation (Tab, Enter, Esc)
**Validates: Requirements 13.2**

### Property 26: Focus Indicator Visibility
*For any* interactive element, when focused, a visible focus indicator (outline or glow) should be displayed
**Validates: Requirements 13.3**

### Property 27: ARIA Label Presence
*For any* icon or complex visual element, an appropriate ARIA label should be present for screen reader accessibility
**Validates: Requirements 13.4**

### Property 28: Dynamic Content Announcement
*For any* dynamic content update (AQI value change, new alert), the update should be announced to screen readers using ARIA live regions
**Validates: Requirements 13.5**

### Property 29: Color-Independent AQI Indication
*For any* AQI level indication, patterns or icons should be used in addition to color to ensure accessibility for color-blind users
**Validates: Requirements 13.6**

### Property 30: Safe Animation Flash Rate
*For any* animation in the dashboard, the flash rate should not exceed safe thresholds (no more than 3 flashes per second)
**Validates: Requirements 13.8**

### Property 31: Lazy Loading Implementation
*For any* heavy component below the fold (charts, maps), it should not be loaded until the user scrolls to that section
**Validates: Requirements 14.3**

### Property 32: Authentication Header Inclusion
*For any* authenticated API request, the Authorization header should include the authentication token
**Validates: Requirements 15.5**

### Property 33: API Error Handling
*For any* API error response, the dashboard should display a user-friendly error message (not raw error details)
**Validates: Requirements 15.6**

### Property 34: Exponential Backoff Retry
*For any* failed API request, retry attempts should follow exponential backoff timing (e.g., 1s, 2s, 4s, 8s)
**Validates: Requirements 15.7**

### Property 35: Confidence Interval Display
*For any* prediction with confidence data, both the prediction value and confidence interval should be displayed
**Validates: Requirements 15.8**

### Property 36: Source Attribution Display
*For any* AQI data with source attribution information, the attribution percentages should be displayed
**Validates: Requirements 15.9**

### Property 37: Heatmap Color Intensity
*For any* historical data point in the calendar heatmap, the color intensity should correspond to the pollution level
**Validates: Requirements 16.5**

### Property 38: Chart Tooltip Display
*For any* chart element, hovering should display a tooltip with exact values
**Validates: Requirements 16.8**

### Property 39: Dark Mode Contrast Compliance
*For any* text element in dark mode, the contrast ratio should maintain WCAG AA compliance (4.5:1)
**Validates: Requirements 17.3**

### Property 40: Dark Mode Preference Persistence
*For any* dark mode toggle action, the preference should be saved to local storage and restored on next visit
**Validates: Requirements 17.5**

### Property 41: Alert Threshold Notification
*For any* AQI value that crosses a user-defined alert threshold, a push notification should be displayed
**Validates: Requirements 18.3**

### Property 42: Alert Message Completeness
*For any* alert, the alert message should contain timestamp, location, AQI value, and recommended actions
**Validates: Requirements 18.5**

### Property 43: Alert API Integration
*For any* alert management action (create, update, delete), the dashboard should call the /api/v1/alerts endpoint
**Validates: Requirements 18.7**

### Property 44: Historical Statistics Calculation
*For any* selected time period, the dashboard should calculate and display average, minimum, and maximum AQI values
**Validates: Requirements 19.3**

### Property 45: Offline Asset Caching
*For any* essential asset (HTML, CSS, JS, fonts), it should be cached by the service worker for offline access
**Validates: Requirements 20.3**

### Property 46: Offline Request Queueing
*For any* data refresh request made while offline, it should be queued and synced when connection is restored
**Validates: Requirements 20.7**


## Error Handling

### API Error Handling

**Network Errors:**
- Display user-friendly message: "Unable to connect. Please check your internet connection."
- Show cached data with "Offline" indicator
- Implement exponential backoff retry (1s, 2s, 4s, 8s, 16s)
- Queue requests for sync when connection restored

**HTTP Error Responses:**
- 400 Bad Request: "Invalid location. Please try a different search."
- 401 Unauthorized: Redirect to login page
- 403 Forbidden: "You don't have permission to access this resource."
- 404 Not Found: "Location not found. Please try a different search."
- 429 Too Many Requests: "Too many requests. Please wait a moment."
- 500 Server Error: "Server error. We're working on it. Please try again later."
- 503 Service Unavailable: "Service temporarily unavailable. Please try again in a few minutes."

**Timeout Handling:**
- Set 30-second timeout for API requests
- Display: "Request timed out. Please try again."
- Automatically retry with exponential backoff

### Data Validation Errors

**Invalid AQI Values:**
- If AQI < 0 or AQI > 500: Display "Invalid data received" and use cached data
- Log error to monitoring service

**Missing Required Fields:**
- If critical fields missing (aqi, location, timestamp): Display error and use cached data
- Gracefully degrade: Show available data with warning indicator

**Malformed Responses:**
- Validate response schema before processing
- If validation fails: Display "Data format error" and use cached data
- Log error with response details for debugging

### UI Error States

**Loading Failures:**
- Display skeleton loaders with error overlay
- Provide "Retry" button
- Show last successful data timestamp

**Chart Rendering Errors:**
- Catch rendering exceptions
- Display: "Unable to display chart. Data may be incomplete."
- Provide fallback to table view

**Map Loading Errors:**
- If Mapbox fails to load: Display static image or text-based location info
- Provide link to open in external map service

### Geolocation Errors

**Permission Denied:**
- Display: "Location access denied. Please enter your location manually."
- Show location search input

**Position Unavailable:**
- Display: "Unable to determine your location. Please enter it manually."
- Fall back to IP-based location detection

**Timeout:**
- Display: "Location detection timed out. Please enter your location manually."

### WebSocket Error Handling

**Connection Failed:**
- Fall back to polling (every 5 minutes)
- Display: "Real-time updates unavailable. Using periodic refresh."

**Connection Dropped:**
- Attempt reconnection with exponential backoff
- Display: "Reconnecting..." indicator
- Maximum 5 reconnection attempts before falling back to polling

**Message Parsing Errors:**
- Log error and ignore malformed message
- Continue processing subsequent messages

### Local Storage Errors

**Quota Exceeded:**
- Clear old cached data (keep only last 24 hours)
- Display: "Storage limit reached. Some data may not be saved."

**Access Denied:**
- Disable caching features
- Display: "Unable to save preferences. Changes will not persist."

### Browser Compatibility

**Unsupported Features:**
- Detect feature support (WebSocket, Service Worker, etc.)
- Provide graceful degradation
- Display: "Some features unavailable in your browser. Consider upgrading."

**CSS Feature Detection:**
- Use @supports for glassmorphism effects
- Provide fallback styles for unsupported browsers

## Testing Strategy

### Unit Testing

**Component Testing (Jest + React Testing Library):**
- Test each component in isolation
- Mock API responses and external dependencies
- Test props, state, and event handlers
- Verify correct rendering for different data states

**Example Unit Tests:**
```typescript
// HeroAQISection.test.tsx
describe('HeroAQISection', () => {
  it('displays AQI value with correct styling', () => {
    const { getByText } = render(<HeroAQISection aqi={120} category="unhealthy" />);
    const aqiValue = getByText('120');
    expect(aqiValue).toHaveStyle({ fontSize: '72px', fontWeight: '700' });
  });
  
  it('shows appropriate health message for AQI level', () => {
    const { getByText } = render(<HeroAQISection aqi={120} category="unhealthy" />);
    expect(getByText(/limit prolonged outdoor exertion/i)).toBeInTheDocument();
  });
  
  it('animates circular ring on mount', () => {
    const { container } = render(<HeroAQISection aqi={120} category="unhealthy" />);
    const ring = container.querySelector('.circular-ring');
    expect(ring).toHaveStyle({ animation: expect.stringContaining('1.5s') });
  });
});

// PollutantCard.test.tsx
describe('PollutantCard', () => {
  it('displays all required elements', () => {
    const { getByText, getByRole } = render(
      <PollutantCard pollutant="pm25" value={85} unit="μg/m³" aqi={120} status="unhealthy" />
    );
    expect(getByText('PM2.5')).toBeInTheDocument();
    expect(getByText('85')).toBeInTheDocument();
    expect(getByText('μg/m³')).toBeInTheDocument();
    expect(getByRole('progressbar')).toBeInTheDocument();
  });
  
  it('applies correct color based on AQI sub-index', () => {
    const { container } = render(
      <PollutantCard pollutant="pm25" value={85} unit="μg/m³" aqi={120} status="unhealthy" />
    );
    const card = container.firstChild;
    expect(card).toHaveStyle({ borderColor: expect.stringContaining('#FB923C') });
  });
});
```

**API Client Testing:**
- Test all API methods
- Mock fetch/axios responses
- Test error handling and retries
- Verify correct headers and parameters

**Utility Function Testing:**
- Test AQI calculation helpers
- Test date/time formatting
- Test data transformation functions
- Test validation functions

### Property-Based Testing (fast-check)

**Configuration:**
- Minimum 100 iterations per property test
- Use appropriate generators for test data
- Tag each test with feature name and property number

**Property Test Examples:**
```typescript
// glassmorphic-styling.property.test.tsx
import fc from 'fast-check';

describe('Feature: glassmorphic-dashboard, Property 1: Glassmorphic Styling Consistency', () => {
  it('all card components have glassmorphic styling', () => {
    fc.assert(
      fc.property(
        fc.record({
          aqi: fc.integer({ min: 0, max: 500 }),
          pollutant: fc.constantFrom('pm25', 'pm10', 'o3', 'no2', 'so2', 'co'),
          value: fc.float({ min: 0, max: 500 }),
        }),
        (data) => {
          const { container } = render(<PollutantCard {...data} />);
          const card = container.querySelector('.glass-card');
          const styles = window.getComputedStyle(card);
          
          expect(styles.background).toContain('rgba(255, 255, 255, 0.1)');
          expect(styles.backdropFilter).toContain('blur(20px)');
          expect(styles.border).toContain('1px');
        }
      ),
      { numRuns: 100 }
    );
  });
});

// dynamic-background.property.test.tsx
describe('Feature: glassmorphic-dashboard, Property 2: Dynamic Background Matching', () => {
  it('background gradient matches AQI category', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 500 }),
        (aqi) => {
          const { container } = render(<Dashboard initialAQI={aqi} />);
          const background = container.querySelector('.dashboard-background');
          const styles = window.getComputedStyle(background);
          
          const category = getAQICategory(aqi);
          const expectedGradient = getExpectedGradient(category);
          
          expect(styles.background).toContain(expectedGradient);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// health-message.property.test.tsx
describe('Feature: glassmorphic-dashboard, Property 4: Health Message Appropriateness', () => {
  it('health message matches AQI level', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 500 }),
        (aqi) => {
          const { getByTestId } = render(<HealthRecommendationsCard aqi={aqi} />);
          const message = getByTestId('health-message').textContent;
          
          const category = getAQICategory(aqi);
          const expectedMessages = getExpectedHealthMessages(category);
          
          expect(expectedMessages.some(msg => message.includes(msg))).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// api-endpoint.property.test.tsx
describe('Feature: glassmorphic-dashboard, Property 15: API Endpoint Correctness', () => {
  it('correct endpoint called for each data request type', () => {
    fc.assert(
      fc.property(
        fc.record({
          requestType: fc.constantFrom('current', 'forecast', 'historical', 'alerts'),
          location: fc.string({ minLength: 3, maxLength: 50 }),
        }),
        async (data) => {
          const mockFetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
          global.fetch = mockFetch;
          
          const client = new AQIDashboardAPIClient('http://api.test');
          
          switch (data.requestType) {
            case 'current':
              await client.getCurrentAQI(data.location);
              expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining(`/api/v1/forecast/current/${data.location}`),
                expect.any(Object)
              );
              break;
            case 'forecast':
              await client.get24HourForecast(data.location);
              expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining(`/api/v1/forecast/24h/${data.location}`),
                expect.any(Object)
              );
              break;
            // ... other cases
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

// keyboard-navigation.property.test.tsx
describe('Feature: glassmorphic-dashboard, Property 25: Keyboard Navigation Support', () => {
  it('all interactive elements are keyboard accessible', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('button', 'link', 'input', 'select'),
        (elementType) => {
          const { container } = render(<Dashboard />);
          const elements = container.querySelectorAll(elementType);
          
          elements.forEach(element => {
            // Should be focusable
            element.focus();
            expect(document.activeElement).toBe(element);
            
            // Should respond to Enter key
            const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' });
            element.dispatchEvent(enterEvent);
            // Verify appropriate action occurred
          });
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

### Integration Testing

**API Integration Tests:**
- Test complete data flow from API to UI
- Use MSW (Mock Service Worker) for API mocking
- Test error scenarios and edge cases
- Verify caching behavior

**WebSocket Integration Tests:**
- Test real-time update flow
- Test reconnection logic
- Test fallback to polling

**Local Storage Integration Tests:**
- Test data persistence
- Test quota handling
- Test data migration

### End-to-End Testing (Playwright)

**Critical User Flows:**
1. First-time user onboarding
2. Location selection and AQI viewing
3. Forecast viewing and interaction
4. Alert configuration
5. Device management
6. Dark mode toggle
7. Offline functionality

**Example E2E Tests:**
```typescript
// e2e/dashboard.spec.ts
test('user can view current AQI for their location', async ({ page }) => {
  await page.goto('/');
  
  // Grant geolocation permission
  await page.context().grantPermissions(['geolocation']);
  
  // Wait for AQI to load
  await page.waitForSelector('[data-testid="hero-aqi-value"]');
  
  // Verify AQI is displayed
  const aqiValue = await page.textContent('[data-testid="hero-aqi-value"]');
  expect(parseInt(aqiValue)).toBeGreaterThanOrEqual(0);
  expect(parseInt(aqiValue)).toBeLessThanOrEqual(500);
  
  // Verify category label is displayed
  const categoryLabel = await page.textContent('[data-testid="aqi-category"]');
  expect(['Good', 'Moderate', 'Unhealthy', 'Very Unhealthy', 'Hazardous']).toContain(categoryLabel);
});

test('user can switch locations', async ({ page }) => {
  await page.goto('/');
  
  // Click location selector
  await page.click('[data-testid="location-selector"]');
  
  // Search for a city
  await page.fill('[data-testid="location-search"]', 'Delhi');
  await page.waitForSelector('[data-testid="location-result"]');
  
  // Select first result
  await page.click('[data-testid="location-result"]:first-child');
  
  // Verify location changed
  await page.waitForSelector('[data-testid="current-location"]');
  const location = await page.textContent('[data-testid="current-location"]');
  expect(location).toContain('Delhi');
});

test('user can view 24-hour forecast', async ({ page }) => {
  await page.goto('/');
  
  // Navigate to forecast tab
  await page.click('[data-testid="nav-forecast"]');
  
  // Wait for forecast graph to load
  await page.waitForSelector('[data-testid="prediction-graph"]');
  
  // Hover over a data point
  await page.hover('[data-testid="forecast-point-12"]');
  
  // Verify tooltip appears
  await page.waitForSelector('[data-testid="forecast-tooltip"]');
  const tooltip = await page.textContent('[data-testid="forecast-tooltip"]');
  expect(tooltip).toContain('AQI');
  expect(tooltip).toContain('Confidence');
});
```

### Visual Regression Testing (Percy or Chromatic)

**Snapshot Tests:**
- Capture screenshots of all major components
- Test across different viewport sizes
- Test light and dark modes
- Test different AQI levels (color variations)
- Test loading and error states

### Performance Testing

**Lighthouse CI:**
- Run on every PR
- Enforce minimum scores: Desktop 90+, Mobile 80+
- Monitor bundle size
- Check for accessibility issues

**Custom Performance Tests:**
```typescript
// performance.test.ts
describe('Performance', () => {
  it('initial load completes within 2 seconds', async () => {
    const startTime = performance.now();
    render(<Dashboard />);
    await waitFor(() => expect(screen.getByTestId('hero-aqi-value')).toBeInTheDocument());
    const loadTime = performance.now() - startTime;
    expect(loadTime).toBeLessThan(2000);
  });
  
  it('maintains 60fps during animations', async () => {
    const { container } = render(<Dashboard />);
    const frameRates = [];
    
    // Monitor frame rate during animation
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        frameRates.push(1000 / entry.duration);
      }
    });
    observer.observe({ entryTypes: ['measure'] });
    
    // Trigger animation
    fireEvent.mouseEnter(container.querySelector('.pollutant-card'));
    
    await waitFor(() => expect(frameRates.length).toBeGreaterThan(0));
    const avgFrameRate = frameRates.reduce((a, b) => a + b) / frameRates.length;
    expect(avgFrameRate).toBeGreaterThanOrEqual(60);
  });
});
```

### Accessibility Testing

**Automated Testing (jest-axe):**
```typescript
import { axe, toHaveNoViolations } from 'jest-axe';
expect.extend(toHaveNoViolations);

describe('Accessibility', () => {
  it('has no accessibility violations', async () => {
    const { container } = render(<Dashboard />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
```

**Manual Testing Checklist:**
- [ ] Keyboard navigation works for all interactive elements
- [ ] Screen reader announces all important information
- [ ] Focus indicators are visible
- [ ] Color contrast meets WCAG AA
- [ ] Text can be resized to 200% without loss of functionality
- [ ] All images have alt text
- [ ] Forms have proper labels
- [ ] Error messages are clear and associated with inputs

### Test Coverage Goals

- Unit tests: 80%+ code coverage
- Property tests: All correctness properties implemented
- Integration tests: All API endpoints covered
- E2E tests: All critical user flows covered
- Visual regression: All major components and states
- Accessibility: Zero axe violations

### Continuous Integration

**GitHub Actions Workflow:**
1. Run unit tests and property tests
2. Run integration tests
3. Run E2E tests (Playwright)
4. Run Lighthouse CI
5. Run visual regression tests
6. Check bundle size
7. Generate coverage report
8. Block merge if tests fail or coverage drops

