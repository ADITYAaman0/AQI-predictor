# Device Components

This directory contains components for managing and displaying air quality sensor devices.

## Components

### DeviceCard

A glassmorphic card component that displays information about a connected air quality sensor device.

**Features:**
- Device name and status indicator (connected/low battery/disconnected)
- Location information
- Battery level display with visual indicators
- Last reading AQI value and timestamp
- Glassmorphic styling with hover effects
- Optional action buttons (View Details, Remove)

**Props:**
```typescript
interface DeviceCardProps {
  device: SensorDevice;
  onViewDetails?: (deviceId: string) => void;
  onRemove?: (deviceId: string) => void;
  className?: string;
}
```

**Usage:**
```tsx
import { DeviceCard } from '@/components/devices/DeviceCard';

<DeviceCard
  device={device}
  onViewDetails={(id) => console.log('View details:', id)}
  onRemove={(id) => console.log('Remove device:', id)}
/>
```

**Status Colors:**
- Connected: Green (#4ADE80) with pulsing animation
- Low Battery: Yellow (#FCD34D)
- Disconnected: Red (#EF4444)

**Requirements Satisfied:**
- Requirement 11.2: Display device name, status, location, and battery level
- Requirement 11.3: Show "View Details" link on each device card
- Requirement 11.4: Display status with colored dot indicator
- Requirement 12.1: Hover effect lifts card by 4px with enhanced shadow

## Testing

Run tests for device components:
```bash
npm test -- components/devices
```

## Visual Testing

View the DeviceCard component in isolation:
```
http://localhost:3000/test-device-card
```

## Accessibility

All device components follow WCAG AA accessibility guidelines:
- Proper ARIA labels for status indicators
- Keyboard navigation support
- Screen reader friendly
- Color-independent status indicators (icons + colors)
