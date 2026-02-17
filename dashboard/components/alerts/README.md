# Alert Components

This directory contains components for alert configuration and management in the Glassmorphic AQI Dashboard.

## Components

### AlertConfigurationCard

A comprehensive form component for configuring air quality alerts.

**Features:**
- Location selection with search and favorites
- AQI threshold slider (0-500)
- Dynamic category display with color coding
- Above/Below condition toggle
- Notification channel selection (Email, SMS, Push)
- Glassmorphic styling
- Full accessibility support

**Usage:**
```typescript
import { AlertConfigurationCard } from '@/components/alerts';

<AlertConfigurationCard
  initialLocation={currentLocation}
  favoriteLocations={favorites}
  onCreateAlert={(alert) => {
    // Handle alert creation
    console.log('Creating alert:', alert);
  }}
  onCancel={() => {
    // Handle cancellation
    console.log('Cancelled');
  }}
/>
```

**Props:**
- `onCreateAlert?: (alert: CreateAlertRequest) => void` - Callback when alert is created
- `onCancel?: () => void` - Callback when form is cancelled
- `initialLocation?: LocationInfo` - Initial location for the alert
- `favoriteLocations?: LocationInfo[]` - List of favorite locations
- `className?: string` - Additional CSS classes

**Output Data Structure:**
```typescript
{
  location: string;           // Location name
  threshold: number;          // AQI threshold (0-500)
  condition: 'above' | 'below'; // Alert condition
  notificationChannels: NotificationChannel[]; // Selected channels
}
```

## Testing

Run tests:
```bash
npm test -- AlertConfigurationCard.test.tsx
```

Visual testing:
```bash
npm run dev
# Visit http://localhost:3000/test-alert-configuration
```

## Requirements

This component implements:
- **Requirement 18.1**: Alert Configuration UI
- **Requirement 18.2**: Alert Threshold Configuration

## Accessibility

- Full keyboard navigation support
- ARIA labels and attributes
- Screen reader compatible
- WCAG AA compliant
- High contrast support

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Future Components

Planned components for this directory:
- `AlertsList` - Display and manage existing alerts
- `AlertNotification` - Show alert notifications
- `AlertHistoryCard` - Display alert history
- `AlertPreferencesCard` - Manage alert preferences

## Related Components

- `LocationSelector` - Used for location selection
- `ErrorDisplay` - For error handling (future)
- `LoadingSpinner` - For loading states (future)

## Documentation

- [Task 15.2 Completion Summary](../../TASK_15.2_COMPLETION_SUMMARY.md)
- [Visual Verification Guide](../../TASK_15.2_VISUAL_VERIFICATION.md)
- [Design Document](../../../.kiro/specs/glassmorphic-dashboard/design.md)
- [Requirements Document](../../../.kiro/specs/glassmorphic-dashboard/requirements.md)
