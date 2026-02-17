# Environment Configuration Guide

This document explains how to configure environment variables for the Glassmorphic AQI Dashboard.

## Quick Start

1. Copy the example environment file:
   ```bash
   cp .env.example .env.local
   ```

2. Update the values in `.env.local` with your configuration

3. Start the development server:
   ```bash
   npm run dev
   ```

## Environment Files

The dashboard uses different environment files for different deployment scenarios:

- **`.env.local`** - Local development (not committed to git)
- **`.env.development`** - Development environment (committed to git)
- **`.env.staging`** - Staging environment (committed to git)
- **`.env.production`** - Production environment (committed to git)
- **`.env.example`** - Example file with all available variables (committed to git)

### File Priority

Next.js loads environment files in this order (later files override earlier ones):

1. `.env` (all environments)
2. `.env.local` (all environments, not committed)
3. `.env.[environment]` (specific environment)
4. `.env.[environment].local` (specific environment, not committed)

## Required Variables

These variables **must** be set for the application to work:

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_BASE_URL` | Base URL of the FastAPI backend | `http://localhost:8000` |
| `NEXT_PUBLIC_API_VERSION` | API version to use | `v1` |
| `NEXT_PUBLIC_ENVIRONMENT` | Current environment | `development` |

## Optional Variables

### API Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_API_TIMEOUT` | `30000` | API request timeout in milliseconds |

### WebSocket Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_WS_URL` | `""` | WebSocket URL for real-time updates |
| `NEXT_PUBLIC_WS_RECONNECT_ATTEMPTS` | `5` | Number of reconnection attempts |
| `NEXT_PUBLIC_WS_RECONNECT_DELAY` | `1000` | Delay between reconnection attempts (ms) |

### Mapbox Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_MAPBOX_TOKEN` | `""` | Mapbox access token for map visualizations |

Get your Mapbox token from: https://account.mapbox.com/access-tokens/

### Feature Flags

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_ENABLE_WEBSOCKET` | `false` | Enable real-time WebSocket updates |
| `NEXT_PUBLIC_ENABLE_MAPS` | `false` | Enable map visualizations |
| `NEXT_PUBLIC_ENABLE_PWA` | `true` | Enable Progressive Web App features |
| `NEXT_PUBLIC_ENABLE_DARK_MODE` | `true` | Enable dark mode toggle |
| `NEXT_PUBLIC_ENABLE_NOTIFICATIONS` | `true` | Enable browser notifications |
| `NEXT_PUBLIC_ENABLE_LAZY_LOADING` | `true` | Enable lazy loading for components |
| `NEXT_PUBLIC_ENABLE_IMAGE_OPTIMIZATION` | `true` | Enable Next.js image optimization |
| `NEXT_PUBLIC_ENABLE_ANALYTICS` | `false` | Enable analytics tracking |

### Data Refresh Intervals

All intervals are in milliseconds:

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_REFRESH_INTERVAL_CURRENT` | `300000` | Current AQI refresh (5 minutes) |
| `NEXT_PUBLIC_REFRESH_INTERVAL_FORECAST` | `3600000` | Forecast refresh (1 hour) |
| `NEXT_PUBLIC_REFRESH_INTERVAL_HISTORICAL` | `86400000` | Historical data refresh (24 hours) |

### Cache Configuration

All cache durations are in milliseconds:

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_CACHE_CURRENT_AQI` | `300000` | Current AQI cache duration (5 minutes) |
| `NEXT_PUBLIC_CACHE_FORECAST` | `3600000` | Forecast cache duration (1 hour) |
| `NEXT_PUBLIC_CACHE_HISTORICAL` | `86400000` | Historical cache duration (24 hours) |

### Analytics

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_ANALYTICS_ID` | `""` | Analytics tracking ID (e.g., Google Analytics) |

### Debug Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_DEBUG_MODE` | `false` | Enable debug logging |
| `NEXT_PUBLIC_LOG_LEVEL` | `info` | Log level: `debug`, `info`, `warn`, `error` |

## Environment-Specific Configuration

### Local Development

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
NEXT_PUBLIC_ENVIRONMENT=local
NEXT_PUBLIC_DEBUG_MODE=true
NEXT_PUBLIC_LOG_LEVEL=debug
```

### Staging

```env
NEXT_PUBLIC_API_BASE_URL=https://staging-api.aqi-predictor.com
NEXT_PUBLIC_ENVIRONMENT=staging
NEXT_PUBLIC_ENABLE_WEBSOCKET=true
NEXT_PUBLIC_ENABLE_MAPS=true
NEXT_PUBLIC_DEBUG_MODE=false
NEXT_PUBLIC_LOG_LEVEL=info
```

### Production

```env
NEXT_PUBLIC_API_BASE_URL=https://api.aqi-predictor.com
NEXT_PUBLIC_ENVIRONMENT=production
NEXT_PUBLIC_ENABLE_WEBSOCKET=true
NEXT_PUBLIC_ENABLE_MAPS=true
NEXT_PUBLIC_ENABLE_ANALYTICS=true
NEXT_PUBLIC_DEBUG_MODE=false
NEXT_PUBLIC_LOG_LEVEL=error
```

## Using Environment Variables in Code

Import the validated configuration from `lib/env.ts`:

```typescript
import { env } from '@/lib/env';

// API Configuration
const apiUrl = env.api.fullUrl; // http://localhost:8000/api/v1
const timeout = env.api.timeout; // 30000

// Feature Flags
if (env.features.websocket) {
  // Initialize WebSocket connection
}

// Environment Checks
if (env.isDevelopment()) {
  console.log('Running in development mode');
}
```

## Validation

The `lib/env.ts` module automatically validates that all required environment variables are present when the application starts. If any required variables are missing, the application will throw an error with a helpful message.

To manually validate your environment configuration:

```typescript
import { validateEnv } from '@/lib/env';

try {
  validateEnv();
  console.log('Environment configuration is valid');
} catch (error) {
  console.error('Environment validation failed:', error);
}
```

## Security Best Practices

1. **Never commit `.env.local`** - This file contains local secrets and should be in `.gitignore`
2. **Use `NEXT_PUBLIC_` prefix** - Only variables with this prefix are exposed to the browser
3. **Keep secrets server-side** - API keys and secrets should not use the `NEXT_PUBLIC_` prefix
4. **Rotate tokens regularly** - Change API tokens and keys periodically
5. **Use different tokens per environment** - Don't reuse production tokens in development

## Troubleshooting

### Environment variables not loading

1. Restart the development server after changing `.env` files
2. Check that variable names start with `NEXT_PUBLIC_` for client-side access
3. Verify the file is in the correct location (`dashboard/.env.local`)

### Validation errors

If you see "Missing required environment variables" errors:

1. Check that all required variables are set in your `.env.local` file
2. Verify there are no typos in variable names
3. Ensure the file is properly formatted (no extra spaces, quotes, etc.)

### API connection issues

1. Verify `NEXT_PUBLIC_API_BASE_URL` points to the correct backend URL
2. Check that the backend server is running
3. Ensure there are no CORS issues (backend should allow requests from your frontend URL)

## Additional Resources

- [Next.js Environment Variables Documentation](https://nextjs.org/docs/basic-features/environment-variables)
- [Backend API Documentation](../README.md)
- [Deployment Guide](../DEPLOYMENT_GUIDE.md)
