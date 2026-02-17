# Environment Configuration - Quick Reference

## Quick Start

```bash
# 1. Environment files are already set up
# 2. Verify configuration
npm run test:env

# 3. Start development
npm run dev
```

## Test Commands

```bash
npm run test:env        # Quick check
npm run test:env:full   # Full validation
npm run verify:env      # Comprehensive verification
```

## Required Variables

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
NEXT_PUBLIC_API_VERSION=v1
NEXT_PUBLIC_ENVIRONMENT=local
```

## Usage in Code

```typescript
import { env } from '@/lib/env';

// API
env.api.baseUrl          // http://localhost:8000
env.api.version          // v1
env.api.fullUrl          // http://localhost:8000/api/v1
env.api.timeout          // 30000

// Features
env.features.websocket   // boolean
env.features.maps        // boolean
env.features.pwa         // boolean
env.features.darkMode    // boolean

// Environment
env.environment          // 'local' | 'development' | 'staging' | 'production'
env.isDevelopment()      // boolean
env.isProduction()       // boolean
env.isStaging()          // boolean

// Refresh Intervals
env.refreshIntervals.current     // 300000 (5 min)
env.refreshIntervals.forecast    // 3600000 (1 hour)
env.refreshIntervals.historical  // 86400000 (24 hours)

// Cache
env.cache.currentAqi     // 300000 (5 min)
env.cache.forecast       // 3600000 (1 hour)
env.cache.historical     // 86400000 (24 hours)

// Debug
env.debug.enabled        // boolean
env.debug.logLevel       // 'debug' | 'info' | 'warn' | 'error'
```

## Environment Files

| File | Purpose | Committed |
|------|---------|-----------|
| `.env.local` | Local overrides | ❌ No |
| `.env.development` | Development | ✅ Yes |
| `.env.staging` | Staging | ✅ Yes |
| `.env.production` | Production | ✅ Yes |
| `.env.example` | Template | ✅ Yes |

## Common Issues

### Environment not loading?
```bash
# Stop server (Ctrl+C)
# Clear cache
rm -rf .next
# Restart
npm run dev
```

### Missing variables?
```bash
# Check .env.local exists
npm run test:env

# Verify all required variables
npm run test:env:full
```

### TypeScript errors?
```typescript
// ❌ Don't use process.env directly
const url = process.env.NEXT_PUBLIC_API_BASE_URL;

// ✅ Use the env module
import { env } from '@/lib/env';
const url = env.api.baseUrl;
```

## Documentation

- Full guide: [ENV_SETUP_GUIDE.md](./ENV_SETUP_GUIDE.md)
- Configuration: [ENV_CONFIG.md](./ENV_CONFIG.md)
- Task summary: [TASK_1.5_COMPLETION_SUMMARY.md](./TASK_1.5_COMPLETION_SUMMARY.md)
