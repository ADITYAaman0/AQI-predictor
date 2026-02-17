# Backend Alert Integration Guide for Dashboard

## Overview

This guide helps frontend developers integrate the enhanced alert system into the glassmorphic dashboard.

## Available Endpoints

### Base URL
```
http://localhost:8000/api/v1/alerts
```

## 1. User Alert Preferences

### Get User Preferences

```typescript
// API call
const getAlertPreferences = async (token: string) => {
  const response = await fetch('http://localhost:8000/api/v1/alerts/preferences/detailed', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch preferences');
  }
  
  return await response.json();
};

// TypeScript interface
interface UserAlertPreferences {
  id: string;
  user_id: string;
  default_channels: string[];
  quiet_hours_start: number | null;
  quiet_hours_end: number | null;
  quiet_hours_enabled: boolean;
  max_alerts_per_day: number;
  min_alert_interval_minutes: number;
  alert_on_good: boolean;
  alert_on_moderate: boolean;
  alert_on_unhealthy_sensitive: boolean;
  alert_on_unhealthy: boolean;
  alert_on_very_unhealthy: boolean;
  alert_on_hazardous: boolean;
  enable_daily_digest: boolean;
  daily_digest_time: number | null;
  created_at: string;
  updated_at: string;
}
```

### Update User Preferences

```typescript
interface UpdatePreferencesRequest {
  default_channels?: string[];
  quiet_hours_start?: number;
  quiet_hours_end?: number;
  quiet_hours_enabled?: boolean;
  max_alerts_per_day?: number;
  min_alert_interval_minutes?: number;
  alert_on_good?: boolean;
  alert_on_moderate?: boolean;
  alert_on_unhealthy_sensitive?: boolean;
  alert_on_unhealthy?: boolean;
  alert_on_very_unhealthy?: boolean;
  alert_on_hazardous?: boolean;
  enable_daily_digest?: boolean;
  daily_digest_time?: number;
}

const updateAlertPreferences = async (
  token: string,
  preferences: UpdatePreferencesRequest
) => {
  const response = await fetch('http://localhost:8000/api/v1/alerts/preferences/detailed', {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(preferences)
  });
  
  if (!response.ok) {
    throw new Error('Failed to update preferences');
  }
  
  return await response.json();
};
```

## 2. Push Notification Tokens

### Register Push Token

```typescript
interface PushTokenRequest {
  token: string;
  device_type: 'ios' | 'android' | 'web';
  device_name?: string;
}

interface PushTokenResponse {
  id: string;
  token: string;
  device_type: string;
  device_name: string | null;
  is_active: boolean;
  last_used_at: string | null;
  created_at: string;
}

const registerPushToken = async (
  authToken: string,
  pushToken: PushTokenRequest
) => {
  const response = await fetch('http://localhost:8000/api/v1/alerts/push-tokens', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(pushToken)
  });
  
  if (!response.ok) {
    throw new Error('Failed to register push token');
  }
  
  return await response.json() as PushTokenResponse;
};
```

### Get User's Push Tokens

```typescript
const getPushTokens = async (
  token: string,
  activeOnly: boolean = true
) => {
  const url = new URL('http://localhost:8000/api/v1/alerts/push-tokens');
  url.searchParams.append('active_only', activeOnly.toString());
  
  const response = await fetch(url.toString(), {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch push tokens');
  }
  
  return await response.json() as PushTokenResponse[];
};
```

### Delete Push Token

```typescript
const deletePushToken = async (
  authToken: string,
  tokenId: string
) => {
  const response = await fetch(
    `http://localhost:8000/api/v1/alerts/push-tokens/${tokenId}`,
    {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    }
  );
  
  if (!response.ok) {
    throw new Error('Failed to delete push token');
  }
  
  return await response.json();
};
```

### Send Test Notification

```typescript
const sendTestNotification = async (token: string) => {
  const response = await fetch('http://localhost:8000/api/v1/alerts/push-tokens/test', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  
  if (!response.ok) {
    throw new Error('Failed to send test notification');
  }
  
  return await response.json();
};
```

## 3. React Hooks for Alert Management

### useAlertPreferences Hook

```typescript
// hooks/useAlertPreferences.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export const useAlertPreferences = (token: string) => {
  const queryClient = useQueryClient();
  
  // Fetch preferences
  const { data: preferences, isLoading, error } = useQuery({
    queryKey: ['alertPreferences'],
    queryFn: () => getAlertPreferences(token),
    enabled: !!token
  });
  
  // Update preferences
  const updateMutation = useMutation({
    mutationFn: (updates: UpdatePreferencesRequest) => 
      updateAlertPreferences(token, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alertPreferences'] });
    }
  });
  
  return {
    preferences,
    isLoading,
    error,
    updatePreferences: updateMutation.mutate,
    isUpdating: updateMutation.isPending
  };
};
```

### usePushTokens Hook

```typescript
// hooks/usePushTokens.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export const usePushTokens = (token: string) => {
  const queryClient = useQueryClient();
  
  // Fetch tokens
  const { data: tokens, isLoading, error } = useQuery({
    queryKey: ['pushTokens'],
    queryFn: () => getPushTokens(token),
    enabled: !!token
  });
  
  // Register token
  const registerMutation = useMutation({
    mutationFn: (pushToken: PushTokenRequest) => 
      registerPushToken(token, pushToken),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pushTokens'] });
    }
  });
  
  // Delete token
  const deleteMutation = useMutation({
    mutationFn: (tokenId: string) => 
      deletePushToken(token, tokenId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pushTokens'] });
    }
  });
  
  // Test notification
  const testMutation = useMutation({
    mutationFn: () => sendTestNotification(token)
  });
  
  return {
    tokens,
    isLoading,
    error,
    registerToken: registerMutation.mutate,
    deleteToken: deleteMutation.mutate,
    sendTestNotification: testMutation.mutate,
    isRegistering: registerMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isTesting: testMutation.isPending
  };
};
```

## 4. Example Components

### Alert Preferences Form

```typescript
// components/alerts/AlertPreferencesForm.tsx
import { useAlertPreferences } from '@/hooks/useAlertPreferences';

export const AlertPreferencesForm = ({ token }: { token: string }) => {
  const { preferences, updatePreferences, isUpdating } = useAlertPreferences(token);
  
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    updatePreferences({
      quiet_hours_enabled: formData.get('quietHoursEnabled') === 'on',
      quiet_hours_start: parseInt(formData.get('quietHoursStart') as string),
      quiet_hours_end: parseInt(formData.get('quietHoursEnd') as string),
      max_alerts_per_day: parseInt(formData.get('maxAlertsPerDay') as string),
      alert_on_moderate: formData.get('alertOnModerate') === 'on',
      alert_on_unhealthy_sensitive: formData.get('alertOnUnhealthySensitive') === 'on',
      alert_on_unhealthy: formData.get('alertOnUnhealthy') === 'on',
      alert_on_very_unhealthy: formData.get('alertOnVeryUnhealthy') === 'on',
      alert_on_hazardous: formData.get('alertOnHazardous') === 'on'
    });
  };
  
  if (!preferences) return <div>Loading...</div>;
  
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Quiet Hours */}
      <div>
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            name="quietHoursEnabled"
            defaultChecked={preferences.quiet_hours_enabled}
          />
          <span>Enable Quiet Hours</span>
        </label>
        
        <div className="flex space-x-4 mt-2">
          <input
            type="number"
            name="quietHoursStart"
            min="0"
            max="23"
            defaultValue={preferences.quiet_hours_start || 22}
            className="input"
          />
          <span>to</span>
          <input
            type="number"
            name="quietHoursEnd"
            min="0"
            max="23"
            defaultValue={preferences.quiet_hours_end || 7}
            className="input"
          />
        </div>
      </div>
      
      {/* Alert Severity Filters */}
      <div>
        <h3>Alert on AQI Levels:</h3>
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            name="alertOnModerate"
            defaultChecked={preferences.alert_on_moderate}
          />
          <span>Moderate (51-100)</span>
        </label>
        
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            name="alertOnUnhealthySensitive"
            defaultChecked={preferences.alert_on_unhealthy_sensitive}
          />
          <span>Unhealthy for Sensitive Groups (101-150)</span>
        </label>
        
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            name="alertOnUnhealthy"
            defaultChecked={preferences.alert_on_unhealthy}
          />
          <span>Unhealthy (151-200)</span>
        </label>
        
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            name="alertOnVeryUnhealthy"
            defaultChecked={preferences.alert_on_very_unhealthy}
          />
          <span>Very Unhealthy (201-300)</span>
        </label>
        
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            name="alertOnHazardous"
            defaultChecked={preferences.alert_on_hazardous}
          />
          <span>Hazardous (301+)</span>
        </label>
      </div>
      
      {/* Rate Limiting */}
      <div>
        <label>
          Max Alerts Per Day:
          <input
            type="number"
            name="maxAlertsPerDay"
            min="1"
            max="100"
            defaultValue={preferences.max_alerts_per_day}
            className="input ml-2"
          />
        </label>
      </div>
      
      <button
        type="submit"
        disabled={isUpdating}
        className="btn btn-primary"
      >
        {isUpdating ? 'Saving...' : 'Save Preferences'}
      </button>
    </form>
  );
};
```

### Push Token Manager

```typescript
// components/alerts/PushTokenManager.tsx
import { usePushTokens } from '@/hooks/usePushTokens';

export const PushTokenManager = ({ token }: { token: string }) => {
  const {
    tokens,
    deleteToken,
    sendTestNotification,
    isDeleting,
    isTesting
  } = usePushTokens(token);
  
  if (!tokens) return <div>Loading...</div>;
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3>Registered Devices</h3>
        <button
          onClick={() => sendTestNotification()}
          disabled={isTesting}
          className="btn btn-secondary"
        >
          {isTesting ? 'Sending...' : 'Test Notifications'}
        </button>
      </div>
      
      <div className="space-y-2">
        {tokens.map((token) => (
          <div
            key={token.id}
            className="flex justify-between items-center p-4 glass-card"
          >
            <div>
              <div className="font-semibold">
                {token.device_name || 'Unnamed Device'}
              </div>
              <div className="text-sm text-gray-500">
                {token.device_type} • {token.is_active ? 'Active' : 'Inactive'}
              </div>
              {token.last_used_at && (
                <div className="text-xs text-gray-400">
                  Last used: {new Date(token.last_used_at).toLocaleString()}
                </div>
              )}
            </div>
            
            <button
              onClick={() => deleteToken(token.id)}
              disabled={isDeleting}
              className="btn btn-danger"
            >
              Remove
            </button>
          </div>
        ))}
        
        {tokens.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            No devices registered for push notifications
          </div>
        )}
      </div>
    </div>
  );
};
```

## 5. Web Push Notification Setup

```typescript
// utils/webPush.ts
export const requestNotificationPermission = async () => {
  if (!('Notification' in window)) {
    throw new Error('This browser does not support notifications');
  }
  
  const permission = await Notification.requestPermission();
  return permission === 'granted';
};

export const registerServiceWorker = async (
  authToken: string,
  vapidPublicKey: string
) => {
  if (!('serviceWorker' in navigator)) {
    throw new Error('Service workers are not supported');
  }
  
  // Register service worker
  const registration = await navigator.serviceWorker.register('/sw.js');
  
  // Subscribe to push notifications
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
  });
  
  // Register with backend
  await registerPushToken(authToken, {
    token: JSON.stringify(subscription),
    device_type: 'web',
    device_name: navigator.userAgent
  });
  
  return subscription;
};

// Helper function
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');
  
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  
  return outputArray;
}
```

## 6. Environment Variables

Add to `.env.local`:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your_vapid_public_key_here
```

## Testing

Test the integration:

```bash
# Start the backend
cd ..
python -m uvicorn src.api.main:app --reload

# Start the dashboard
cd dashboard
npm run dev
```

## Error Handling

Always handle errors gracefully:

```typescript
try {
  await updateAlertPreferences(token, preferences);
  toast.success('Preferences updated successfully');
} catch (error) {
  console.error('Failed to update preferences:', error);
  toast.error('Failed to update preferences. Please try again.');
}
```

## Next Steps

1. Implement the UI components in the dashboard
2. Add push notification registration flow
3. Test with real devices
4. Configure push notification services (FCM, APNs, Web Push)

For more details, see `docs/ENHANCED_ALERTS_API.md`
