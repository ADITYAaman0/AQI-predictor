# Integration Tests - README

## Overview

This directory contains comprehensive integration tests for the Leaflet.js AQI Predictor frontend. The tests validate complete data flow, user workflows, and performance optimization across the entire system.

## Test Suites

### 1. End-to-End Integration Tests
**File:** `test-e2e-integration.js`  
**Runner:** `test-e2e-runner.html`

Tests the complete data flow from backend through integration layer to frontend components.

**Tests Included:**
- Component initialization chain
- Data flow from API router to data transformer
- Frontend component integration
- Complete data pipeline with multiple stations
- Error handling integration
- View switching integration
- Caching integration
- Filter integration

**Run:** Open `test-e2e-runner.html` in your browser

### 2. User Workflow Tests
**File:** `test-user-workflows.js`  
**Runner:** `test-user-workflows-runner.html`

Tests complete user interaction patterns and workflows.

**Workflows Tested:**
- Viewing current AQI data
- Forecast animation (play/pause/scrub)
- Mobile usage and touch gestures
- Error handling and graceful degradation
- Authentication flow
- Filtering and district selection
- Visualization mode switching

**Run:** Open `test-user-workflows-runner.html` in your browser

### 3. Performance Tests
**File:** `test-performance-integration.js`  
**Runner:** `test-performance-runner.html`

Tests loading times, caching effectiveness, and concurrent user scenarios.

**Performance Metrics:**
- Component initialization time
- Data transformation speed (1000 stations)
- Cache performance (read/write operations)
- Layer rendering time (markers and heatmap)
- Animation frame switching speed
- Concurrent operations handling
- Memory usage tracking
- 3G connection simulation

**Run:** Open `test-performance-runner.html` in your browser

### 4. Complete Test Suite
**File:** `test-integration-suite.html`

Unified test runner that executes all test suites and provides overall statistics.

**Features:**
- Run all tests with one click
- Individual suite execution
- Overall success rate calculation
- Visual status indicators
- Detailed results breakdown

**Run:** Open `test-integration-suite.html` in your browser

## Quick Start

### Running Tests Locally

1. **Start the development server:**
   ```bash
   cd frontend
   python serve-dev.py
   ```

2. **Open test runner in browser:**
   ```
   http://localhost:8080/tests/test-integration-suite.html
   ```

3. **Click "Run All Test Suites"** to execute all tests

### Running Individual Test Suites

Navigate to any of these URLs:
- E2E Tests: `http://localhost:8080/tests/test-e2e-runner.html`
- Workflow Tests: `http://localhost:8080/tests/test-user-workflows-runner.html`
- Performance Tests: `http://localhost:8080/tests/test-performance-runner.html`

### Running Without Server

You can also open the HTML files directly in your browser:
1. Navigate to `frontend/tests/` directory
2. Double-click any `*-runner.html` file
3. Click the "Run Tests" button

## Test Results Interpretation

### Success Indicators
- ✓ Green checkmarks indicate passed tests
- Success rate should be 100% for production readiness
- Performance metrics should meet target thresholds

### Failure Indicators
- ✗ Red X marks indicate failed tests
- Check console output for detailed error messages
- Review failing test assertions

### Performance Thresholds

| Metric | Target | Critical |
|--------|--------|----------|
| Component Initialization | <1000ms | <2000ms |
| Data Transformation (1000 stations) | <500ms | <1000ms |
| Cache Write (100 items) | <100ms | <200ms |
| Cache Read (100 items) | <50ms | <100ms |
| Cache Hit Rate | ≥95% | ≥90% |
| Marker Layer (500 stations) | <1000ms | <2000ms |
| Heatmap Layer (500 points) | <500ms | <1000ms |
| Animation Frame Switch | <50ms | <100ms |
| Concurrent Operations (100) | <200ms | <500ms |
| Memory Increase | <10MB | <20MB |
| 3G Connection Load | <3000ms | <5000ms |

## Test Architecture

### Mock Environment
Tests use a mock Leaflet environment to avoid full map initialization overhead:
- Mock map objects with essential methods
- Mock layer groups and markers
- Mock tile layers and controls

### Assertion Framework
Simple assertion framework with:
- Pass/fail tracking
- Test result aggregation
- Console output capture
- Visual result display

### Performance Measurement
Uses `performance.now()` for high-resolution timing:
- Synchronous operation timing
- Asynchronous operation timing
- Memory usage tracking (when available)
- Metrics aggregation and display

## Troubleshooting

### Tests Not Running
1. **Check browser console** for JavaScript errors
2. **Verify file paths** are correct
3. **Ensure modules load** properly (check network tab)
4. **Try different browser** (Chrome, Firefox, Edge)

### Performance Tests Failing
1. **Close other applications** to free up resources
2. **Run tests individually** instead of all at once
3. **Check browser performance** settings
4. **Verify no background processes** are consuming resources

### Module Import Errors
1. **Ensure dev server is running** for proper CORS handling
2. **Check file paths** in import statements
3. **Verify all files exist** in expected locations
4. **Use modern browser** with ES6 module support

## Continuous Integration

### CI/CD Integration
To integrate these tests into your CI/CD pipeline:

1. **Install dependencies:**
   ```bash
   npm install -g puppeteer
   ```

2. **Create test runner script:**
   ```javascript
   // ci-test-runner.js
   const puppeteer = require('puppeteer');
   
   (async () => {
     const browser = await puppeteer.launch();
     const page = await browser.newPage();
     
     await page.goto('http://localhost:8080/tests/test-integration-suite.html');
     await page.click('#run-all-btn');
     
     // Wait for tests to complete
     await page.waitForSelector('.overall-results.visible', { timeout: 60000 });
     
     // Extract results
     const results = await page.evaluate(() => {
       return {
         total: document.getElementById('overall-total').textContent,
         passed: document.getElementById('overall-passed').textContent,
         failed: document.getElementById('overall-failed').textContent,
         rate: document.getElementById('overall-rate').textContent
       };
     });
     
     console.log('Test Results:', results);
     
     await browser.close();
     
     // Exit with error code if tests failed
     process.exit(parseInt(results.failed) > 0 ? 1 : 0);
   })();
   ```

3. **Add to CI pipeline:**
   ```yaml
   # .github/workflows/frontend-tests.yml
   name: Frontend Integration Tests
   
   on: [push, pull_request]
   
   jobs:
     test:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v2
         - name: Setup Node.js
           uses: actions/setup-node@v2
           with:
             node-version: '18'
         - name: Install dependencies
           run: npm install -g puppeteer
         - name: Start dev server
           run: |
             cd frontend
             python serve-dev.py &
             sleep 5
         - name: Run tests
           run: node ci-test-runner.js
   ```

## Best Practices

### Writing New Tests
1. **Follow existing patterns** for consistency
2. **Use descriptive test names** that explain what is being tested
3. **Keep tests focused** on single functionality
4. **Mock external dependencies** to isolate test scope
5. **Clean up resources** after tests complete

### Maintaining Tests
1. **Update tests** when features change
2. **Keep performance thresholds** realistic and achievable
3. **Document test failures** and their resolutions
4. **Review test coverage** regularly
5. **Refactor duplicate code** into shared utilities

### Running Tests
1. **Run tests before commits** to catch issues early
2. **Run full suite** before releases
3. **Monitor performance trends** over time
4. **Investigate failures** immediately
5. **Keep test environment clean** (clear cache, restart browser)

## Contributing

When adding new tests:
1. Create test file in `frontend/tests/`
2. Follow naming convention: `test-[feature]-[type].js`
3. Create corresponding HTML runner: `test-[feature]-runner.html`
4. Add test suite to `test-integration-suite.html`
5. Update this README with test description
6. Document expected behavior and thresholds

## Support

For issues or questions:
1. Check console output for detailed error messages
2. Review test implementation for expected behavior
3. Verify all dependencies are properly loaded
4. Test in different browsers to isolate issues
5. Check network tab for failed resource loads

## License

These tests are part of the AQI Predictor project and follow the same license.
