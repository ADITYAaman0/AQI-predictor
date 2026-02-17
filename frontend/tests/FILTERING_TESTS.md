# Filtering Functionality Property Tests

## Overview

This document describes the property-based tests for the filtering functionality in the Leaflet.js integration. These tests validate **Property 10: Filtering Functionality** which ensures that district-based filtering works correctly using existing city/state data from the Backend API.

## Property 10: Filtering Functionality

**Description:** For any district-based filter selection, the Leaflet Frontend should correctly filter displayed data using existing city/state data from the Backend API.

**Validates:** Requirement 4.5

## Test Coverage

The filtering property tests cover three main scenarios:

### 1. District/City/State Filtering (Property 10a)
- Tests filtering by district, city, state, and AQI category
- Verifies that filters are correctly applied and stored
- Validates that `hasActiveFilters()` returns correct state
- Tests filter clearing functionality
- Ensures filtered data matches expected results

### 2. AQI Range Filtering (Property 10b)
- Tests filtering by minimum and maximum AQI values
- Verifies that AQI range filters are correctly applied
- Validates that data within the specified range is displayed
- Tests edge cases with various AQI ranges

### 3. Combined Filters (Property 10c)
- Tests applying multiple filters simultaneously
- Verifies that all filters work together correctly
- Tests combinations of district, city, and AQI range filters
- Validates that combined filter logic is correct

## Running the Tests

### Option 1: Browser Test Runner (Recommended)

1. Open `frontend/tests/test-runner.html` in a web browser
2. Click the "▶️ Run Filtering Tests" button
3. View the test results in the output panel

### Option 2: Standalone Test Runner

```bash
cd frontend/tests
node run-filtering-tests.js
```

### Option 3: Run All Tests

To run all property tests including filtering:

1. Open `frontend/tests/test-runner.html` in a web browser
2. Click the "🚀 Run All Tests" button

## Test Data Generation

The tests use property-based testing with randomly generated data:

- **Station Count:** 30-100 stations per test
- **Districts:** Random selection from predefined list
- **Cities:** Random selection from predefined list
- **States:** Random selection from predefined list
- **AQI Values:** Random values from 0-500
- **Filter Types:** Random selection of district, city, state, or category filters

## Test Iterations

- **Property 10a (District/City/State):** 30 iterations
- **Property 10b (AQI Range):** 30 iterations
- **Property 10c (Combined Filters):** 20 iterations

Total: 80 test cases with randomly generated data

## Expected Results

All tests should pass, indicating that:

✅ District-based filtering works correctly
✅ City-based filtering works correctly
✅ State-based filtering works correctly
✅ Category-based filtering works correctly
✅ AQI range filtering works correctly
✅ Combined filters work correctly
✅ Filter clearing works correctly
✅ Filter state management is accurate

## Test Failures

If tests fail, the output will show:

- The iteration number where the failure occurred
- The input data that caused the failure
- The specific error message
- Details about what went wrong

Use this information to debug and fix the filtering implementation.

## Implementation Files

The filtering functionality is implemented in:

- `frontend/js/components/filter-controller.js` - Main filtering logic
- `frontend/js/components/layer-manager.js` - Layer filtering application
- `frontend/tests/test-filtering-properties.js` - Property tests

## Requirements Validation

These tests validate **Requirement 4.5** from the requirements document:

> THE Leaflet_Frontend SHALL support district-based filtering using existing city/state data from Backend_API

By passing these tests, we ensure that the filtering functionality meets the specified requirements and works correctly across a wide range of scenarios.
