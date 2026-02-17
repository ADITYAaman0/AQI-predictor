# Environment Configuration Setup Guide

This guide explains how to set up and use environment variables in the Glassmorphic AQI Dashboard.

## Overview

The dashboard uses environment variables to configure API endpoints, feature flags, and other settings across different environments (local, development, staging, production).

## Environment Files

### Available Files

- **`.env.local`** - Local development overrides (not committed to git)
- **`.env.development`** - Development environment configuration
- **`.env.staging`** - Staging environment configuration
- **`.env.production`** - Production environment configuration
- **`.env.example`** - Template with all available variables

### File Priority

Next.js loads environment files in this order (later files override earlier ones):

1. `.env` (if exists)
2. `.env.local` (local overrides, not committed)
3. `.env.development` / `.env.staging` / `.env.production` (based on NODE_ENV)
4. `.env.development.local` / `.env.staging.local` / `.env.production.local`

## Quick Start

### 1. Initial Setup

The `.env.local` file is already created with default values. If you need to recreate it:

```bash
# Copy the example file
cp .env.example .env.local

# Edit with your values
# On Windows: notepad .env.local
# On Mac/Linux: nano .env.local
```

### 2. Configure Required Variables

Edit `.env.local` and set these required variables:

```bash
# API Configuration (REQUIRED)
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
NEXT_PUBLIC_API_VERSION=v1
NEXT_PUBLIC_ENVIRONMENT=local
```

### 3. Verify Configuration

Run the verification script:

```bash
# Simple verification
node test-env-simple.js

# Detailed verification
node scripts/verify-env-config.mjs

# Full validation with dotenv
npx tsx scripts/test-env-with-dotenv.ts
```

### 4. Start Development Server

```bash
npm run dev
```

The dashboard will automatically load environment variables and validate them on startup.

## Environment Variables Reference

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_BASE_URL` | Backend API base URL | `http://localhost:8000` |
| `NEXT_PUBLIC_API_VERSION` | API version | `v1` |
| `NEXT_PUBLIC_ENVIRONMENT` | Current environment | `local`, `development`, `staging`, `production` |

### API Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_API_TIMEOUT` | `30000` | API request timeout (ms) |

### WebSocket Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_WS_URL` | - | WebSocket URL for real-time updates |
| `NEXT_PUBLIC_WS_RECONNECT_ATTEMPTS` | `5` | Max reconnection attempts |
| `NEXT_PUBLIC_WS_RECONNECT_DELAY` | `1000` | Delay between reconnects (ms) |

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

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_REFRESH_INTERVAL_CURRENT` | `300000` | Current AQI refresh (5 minutes) |
| `NEXT_PUBLIC_REFRESH_INTERVAL_FORECAST` | `3600000` | Forecast refresh (1 hour) |
| `NEXT_PUBLIC_REFRESH_INTERVAL_HISTORICAL` | `86400000` | Historical data refresh (24 hours) |

### Cache Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_CACHE_CURRENT_AQI` | `300000` | Current AQI cache duration (5 minutes) |
| `NEXT_PUBLIC_CACHE_FORECAST` | `3600000` | Forecast cache duration (1 hour) |
| `NEXT_PUBLIC_CACHE_HISTORICAL` | `86400000` | Historical cache duration (24 hours) |

### External Services

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_MAPBOX_TOKEN` | - | Mapbox API token for maps |
| `NEXT_PUBLIC_ANALYTICS_ID` | - | Analytics tracking ID |

### Debug Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_DEBUG_MODE` | `false` | Enable debug logging |
| `NEXT_PUBLIC_LOG_LEVEL` | `info` | Log level: `debug`, `info`, `warn`, `error` |

## Environment-Specific Configuration

### Local Development

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
NEXT_PUBLIC_ENVIRONMENT=local
NEXT_PUBLIC_DEBUG_MODE=true
NEXT_PUBLIC_LOG_LEVEL=debug
```

### Development

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
NEXT_PUBLIC_ENVIRONMENT=development
NEXT_PUBLIC_DEBUG_MODE=true
NEXT_PUBLIC_LOG_LEVEL=debug
```

### Staging

```bash
NEXT_PUBLIC_API_BASE_URL=https://staging-api.aqi-predictor.com
NEXT_PUBLIC_ENVIRONMENT=staging
NEXT_PUBLIC_ENABLE_WEBSOCKET=true
NEXT_PUBLIC_ENABLE_MAPS=true
NEXT_PUBLIC_DEBUG_MODE=false
NEXT_PUBLIC_LOG_LEVEL=info
```

### Production

```bash
NEXT_PUBLIC_API_BASE_URL=https://api.aqi-predictor.com
NEXT_PUBLIC_ENVIRONMENT=production
NEXT_PUBLIC_ENABLE_WEBSOCKET=true
NEXT_PUBLIC_ENABLE_MAPS=true
NEXT_PUBLIC_ENABLE_ANALYTICS=true
NEXT_PUBLIC_DEBUG_MODE=false
NEXT_PUBLIC_LOG_LEVEL=error
```

## Using Environment Variables in Code

### Import the env module

```typescript
import { env } from '@/lib/env';

// Access configuration
const apiUrl = env.api.fullUrl; // http://localhost:8000/api/v1
const timeout = env.api.timeout; // 30000

// Check feature flags
if (env.features.websocket) {
  // Initialize WebSocket
}

// Check environment
if (env.isDevelopment()) {
  console.log('Running in development mode');
}
```

### Type-Safe Configuration

The `env` object is fully typed and provides:

- **API Configuration**: `env.api.baseUrl`, `env.api.version`, `env.api.fullUrl`, `env.api.timeout`
- **WebSocket**: `env.websocket.url`, `env.websocket.reconnectAttempts`, `env.websocket.reconnectDelay`
- **Feature Flags**: `env.features.websocket`, `env.features.maps`, etc.
- **Refresh Intervals**: `env.refreshIntervals.current`, `env.refreshIntervals.forecast`, etc.
- **Cache Settings**: `env.cache.currentAqi`, `env.cache.forecast`, etc.
- **Debug**: `env.debug.enabled`, `env.debug.logLevel`
- **Helpers**: `env.isDevelopment()`, `env.isProduction()`, `env.isStaging()`

## Validation

### Automatic Validation

Environment variables are automatically validated when the app starts:

1. **Required variables** - Must be present
2. **URL format** - Must be valid URLs
3. **Boolean values** - Must be 'true' or 'false'
4. **Numeric values** - Must be valid numbers

### Manual Validation

Run validation scripts:

```bash
# Quick check
node test-env-simple.js

# Comprehensive validation
node scripts/verify-env-config.mjs

# Full validation with type checking
npx tsx scripts/test-env-with-dotenv.ts
```

## Troubleshooting

### Missing Environment Variables

**Error**: `Missing required environment variables`

**Solution**: 
1. Check if `.env.local` exists
2. Verify all required variables are set
3. Restart the development server

### Invalid URL Format

**Error**: `API URL is invalid`

**Solution**: 
- Ensure URL includes protocol: `http://` or `https://`
- Check for typos in the URL
- Verify the URL is accessible

### Environment Not Loading

**Problem**: Changes to `.env.local` not taking effect

**Solution**:
1. Stop the development server (Ctrl+C)
2. Clear Next.js cache: `rm -rf .next`
3. Restart: `npm run dev`

### TypeScript Errors

**Problem**: TypeScript can't find environment variables

**Solution**:
- Use the `env` module instead of `process.env`
- Import: `import { env } from '@/lib/env'`
- This provides full type safety

## Security Best Practices

### DO ✅

- Use `.env.local` for local development secrets
- Keep `.env.local` out of version control (already in .gitignore)
- Use different values for each environment
- Rotate API keys and tokens regularly
- Use environment variables for all configuration

### DON'T ❌

- Commit `.env.local` to git
- Put real API keys in `.env.example`
- Use production credentials in development
- Hardcode sensitive values in code
- Share `.env.local` files via email or chat

## Next Steps

1. ✅ Environment files are created
2. ✅ Validation is set up
3. ✅ Configuration module is ready
4. 🔄 Configure your API endpoint in `.env.local`
5. 🔄 Add Mapbox token if using maps
6. 🔄 Run `npm run dev` to start development

## Additional Resources

- [Next.js Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)
- [Environment Variables Best Practices](https://12factor.net/config)
- [API Documentation](../README.md)

## Support

If you encounter issues:

1. Check this guide
2. Run validation scripts
3. Check the console for error messages
4. Review the [ENV_CONFIG.md](./ENV_CONFIG.md) for detailed configuration
