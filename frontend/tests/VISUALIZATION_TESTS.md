# Visualization Property Tests

This document describes the property-based tests for the Map Controller and Layer Manager components.

## Overview

The visualization tests validate two key properties:

### Property 8: Visualization Mode Switching
**Validates Requirements:** 4.1, 4.2, 4.4

**Description:** For any visualization mode change (markers to heatmap or current to forecast), the Leaflet Frontend should correctly render the new visualization with proper data display and interactive functionality.

**Test Coverage:**
- Switching from markers to heatmap visualization
- Switching from heatmap to markers visualization
- Switching between current and forecast views
- Data preservation during mode switches
- Layer creation and rendering
- Map state management

### Property 9: Interactive Feature Completeness
**Validates Requirements:** 4.3

**Description:** For any station marker click interaction, the Leaflet Frontend should display a detailed popup containing all required information (pollutant levels, weather, and source attribution).

**Test Coverage:**
- Marker creation with correct styling
- Popup content completeness
- Required field validation (station name, district, AQI, category)
- Pollutant information display
- Weather information display
- Source attribution display
- Tooltip functionality
- Color coding based on AQI values

## Running the Tests

### Option 1: Browser-Based Testing (Recommended)

1. Start the frontend development server:
   ```bash
   cd frontend
   python serve-dev.py
   ```

2. Open the test runner in your browser:
   ```
   http://localhost:8080/tests/test-runner.html
   ```

3. Click the "▶️ Run Visualization Tests" button to run both Property 8 and Property 9 tests.

4. Or click "🚀 Run All Tests" to run all property tests including visualization tests.

### Option 2: Individual Test Execution

You can also run the tests programmatically by importing the test module:

```javascript
import { runVisualizationTests } from './test-visualization-properties.js';

// Run all visualization tests
const success = await runVisualizationTests();
console.log(`Tests ${success ? 'passed' : 'failed'}`);
```

## Test Configuration

The tests use the following configuration:

- **Iterations per property:** 50 test cases
- **Test data:** Randomly generated GeoJSON features with realistic AQI values
- **Map container:** Temporary off-screen div elements (automatically cleaned up)
- **Timeout:** 1 second per map initialization

## Test Data Generation

The tests use property-based testing with randomly generated data:

### GeoJSON Feature Generation
- Random coordinates around Delhi (28.6139, 77.2090)
- Random AQI values (0-500)
- Random pollutant concentrations (PM2.5, PM10, NO2)
- Random weather data (temperature, humidity, wind speed)
- Random source attribution percentages
- Random forecast values

### Visualization Mode Scenarios
- Random mode switches (markers ↔ heatmap)
- Random view switches (current ↔ forecast)
- Random feature counts (5-20 stations per test)

## Expected Results

### Property 8: Visualization Mode Switching
✅ **Pass Criteria:**
- Map initializes successfully
- Initial layer is created and added to map
- Visualization mode changes correctly
- New layer is created after mode switch
- Data is preserved during mode switch
- Layer statistics match expected values

❌ **Failure Scenarios:**
- Map fails to initialize
- Layer creation fails
- Mode switch doesn't update state
- Data loss during mode switch
- Layer not added to map

### Property 9: Interactive Feature Completeness
✅ **Pass Criteria:**
- Marker is created successfully
- Marker has popup attached
- Popup contains all required fields:
  - Station name
  - District
  - AQI value
  - Category
  - Pollutant information
  - Weather information (if present)
- Marker has tooltip with station name and AQI
- Marker has correct color based on AQI value

❌ **Failure Scenarios:**
- Marker creation fails
- Popup is missing
- Required fields missing from popup
- Tooltip is missing
- Incorrect color coding

## Debugging Failed Tests

If tests fail, check the following:

1. **Browser Console:** Look for JavaScript errors
2. **Test Output:** Review the failure details in the test runner
3. **Network Tab:** Check if Leaflet libraries are loading correctly
4. **Map Container:** Verify the test container is being created and cleaned up

### Common Issues

**Issue:** Map initialization timeout
**Solution:** Increase the timeout in the test or check if Leaflet is loaded

**Issue:** Layer creation fails
**Solution:** Verify GeoJSON data format is correct

**Issue:** Popup content missing
**Solution:** Check if all required properties are present in the feature data

## Test Maintenance

When updating the Map Controller or Layer Manager:

1. Run the visualization tests to ensure no regressions
2. Update test data generators if new fields are added
3. Add new test cases for new functionality
4. Update this documentation with any changes

## Performance Considerations

The tests create and destroy map instances for each test case. This is intentional to ensure test isolation but may be slow. Each test iteration:

1. Creates a temporary DOM container
2. Initializes a Leaflet map
3. Creates layer manager
4. Performs test operations
5. Cleans up map and container

Total test time: ~30-60 seconds for 100 iterations (50 per property)

## Integration with CI/CD

These tests can be integrated into CI/CD pipelines using headless browsers:

```bash
# Example using Playwright or Puppeteer
npx playwright test frontend/tests/test-visualization-properties.js
```

## Related Files

- `frontend/js/components/map-controller.js` - Map Controller implementation
- `frontend/js/components/layer-manager.js` - Layer Manager implementation
- `frontend/tests/test-visualization-properties.js` - Test implementation
- `frontend/tests/test-runner.html` - Browser-based test runner
- `.kiro/specs/leaflet-integration/design.md` - Property definitions
- `.kiro/specs/leaflet-integration/requirements.md` - Requirements

## References

- [Leaflet Documentation](https://leafletjs.com/reference.html)
- [Property-Based Testing](https://en.wikipedia.org/wiki/Property_testing)
- [GeoJSON Specification](https://geojson.org/)
