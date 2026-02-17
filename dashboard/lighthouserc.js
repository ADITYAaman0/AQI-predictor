/**
 * Lighthouse CI Configuration
 * 
 * Implements Task 29.4 - Add Lighthouse CI
 * 
 * This configuration sets performance budgets and thresholds for the dashboard.
 * The CI pipeline will fail if any of these budgets are exceeded.
 * 
 * Features:
 * - Performance budgets for Core Web Vitals
 * - Accessibility requirements (WCAG 2.1 AA)
 * - Best practices enforcement
 * - SEO optimization checks
 * 
 * Requirements: 14.6 (Performance optimization)
 * Related Tasks: 29.1, 29.4, 22.6
 */

module.exports = {
  ci: {
    collect: {
      // Run Lighthouse against the built Next.js app
      startServerCommand: 'npm run start',
      startServerReadyPattern: 'ready on',
      startServerReadyTimeout: 30000,
      url: [
        'http://localhost:3000',
        'http://localhost:3000/?location=delhi',
        'http://localhost:3000/?location=mumbai',
      ],
      numberOfRuns: 3,
      settings: {
        // Run in headless mode
        chromeFlags: '--no-sandbox --disable-gpu --disable-dev-shm-usage',
        // Simulate mobile devices
        preset: 'desktop',
        throttling: {
          rttMs: 40,
          throughputKbps: 10240,
          cpuSlowdownMultiplier: 1,
        },
      },
    },
    
    assert: {
      assertions: {
        // Performance thresholds
        'categories:performance': ['error', { minScore: 0.9 }],
        'categories:accessibility': ['error', { minScore: 0.95 }],
        'categories:best-practices': ['error', { minScore: 0.9 }],
        'categories:seo': ['error', { minScore: 0.9 }],
        'categories:pwa': ['warn', { minScore: 0.8 }],
        
        // Core Web Vitals - Performance budgets
        'first-contentful-paint': ['error', { maxNumericValue: 1800 }],
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
        'total-blocking-time': ['error', { maxNumericValue: 300 }],
        'speed-index': ['error', { maxNumericValue: 3000 }],
        'interactive': ['error', { maxNumericValue: 3800 }],
        
        // Accessibility requirements
        'color-contrast': 'error',
        'heading-order': 'error',
        'html-has-lang': 'error',
        'meta-viewport': 'error',
        'document-title': 'error',
        'aria-valid-attr': 'error',
        'aria-required-attr': 'error',
        'button-name': 'error',
        'image-alt': 'error',
        'link-name': 'error',
        'label': 'error',
        
        // Best practices
        'errors-in-console': 'warn',
        'uses-https': 'error',
        'uses-http2': 'warn',
        'no-vulnerable-libraries': 'error',
        
        // Resource budgets
        'resource-summary:script:size': ['error', { maxNumericValue: 400000 }], // 400KB
        'resource-summary:stylesheet:size': ['error', { maxNumericValue: 100000 }], // 100KB
        'resource-summary:image:size': ['warn', { maxNumericValue: 1000000 }], // 1MB
        'resource-summary:font:size': ['warn', { maxNumericValue: 200000 }], // 200KB
        'resource-summary:total:size': ['warn', { maxNumericValue: 2000000 }], // 2MB
        
        // Network requests
        'resource-summary:script:count': ['warn', { maxNumericValue: 20 }],
        'resource-summary:third-party:count': ['warn', { maxNumericValue: 10 }],
        
        // Performance optimizations
        'uses-text-compression': 'error',
        'uses-optimized-images': 'warn',
        'modern-image-formats': 'warn',
        'offscreen-images': 'warn',
        'unused-javascript': ['warn', { maxLength: 1 }],
        'unused-css-rules': ['warn', { maxLength: 1 }],
        'uses-responsive-images': 'warn',
        'efficient-animated-content': 'warn',
        
        // Caching
        'uses-long-cache-ttl': 'warn',
        
        // Next.js specific
        'preload-lcp-image': 'warn',
        'prioritize-lcp-image': 'warn',
      },
      
      // Preset configurations
      preset: 'lighthouse:recommended',
      
      // How to handle assertion failures
      level: 'error',
    },
    
    upload: {
      // Upload results to temporary public storage
      target: 'temporary-public-storage',
      
      // Optional: Upload to LHCI server
      // Uncomment and configure if you have a Lighthouse CI server
      // serverBaseUrl: 'https://lhci.example.com',
      // token: process.env.LHCI_TOKEN,
    },
    
    server: {
      // Optional: LHCI server configuration
      // Uncomment if running your own LHCI server
      // port: 9001,
      // storage: {
      //   storageMethod: 'sql',
      //   sqlDialect: 'postgres',
      //   sqlConnectionUrl: process.env.LHCI_DB_URL,
      // },
    },
  },
};
