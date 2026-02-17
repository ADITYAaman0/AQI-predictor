# Task 8.5: Dashboard Integration Tests - Testing Guide

## Quick Start

### Run All Integration Tests
```bash
cd dashboard
npm test -- app/__tests__/page.integration.test.tsx
```

### Run with Coverage
```bash
npm test -- app/__tests__/page.integration.test.tsx --coverage
```

### Run in Watch Mode
```bash
npm test:watch -- app/__tests__/page.integration.test.tsx
```

## Test Suites Overview

### 1. Complete Data Flow Tests
**Purpose**: Verify data flows correctly from API to UI

**Test Cases**:
- ✅ Fetch data from API and display all components
- ✅ Pass data correctly through component hierarchy
- ✅ Handle data transformation correctly

**What to Look For**:
- API client is called with correct location
- All components receive and display data
- Values are formatted correctly (AQI, pollutants, weather)

### 2. Loading States Tests
**Purpose**: Verify loading skeletons display correctly

**Test Cases**:
- ✅ Display loading skeletons while fetching
- ✅ Show hero section skeleton
- ✅ Show pollutant cards skeleton (6 cards)
- ✅ Show weather section skeleton
- ✅ Transition from loading to loaded state

**What to Look For**:
- Skeleton elements have `animate-pulse` class
- Correct number of skeleton elements
- Skeletons disappear when data loads

### 3. Error Handling Tests
**Purpose**: Verify errors are handled gracefully

**Test Cases**:
- ✅ Display error message on API failure
- ✅ Show error boundary for component errors
- ✅ Display retry button on error
- ✅ Handle network timeout errors
- ✅ Handle 404 errors gracefully
- ✅ Handle 500 server errors

**What to Look For**:
- User-friendly error messages
- Retry button is present
- Error boundaries catch component errors

### 4. Auto-Refresh Tests
**Purpose**: Verify auto-refresh functionality

**Test Cases**:
- ✅ Display data freshness indicator
- ✅ Display manual refresh button
- ✅ Show auto-refresh info text

**What to Look For**:
- "Just now" or relative time display
- Refresh button is clickable
- Info text about 5-minute refresh

### 5. Offline Behavior Tests
**Purpose**: Verify offline mode works correctly

**Test Cases**:
- ✅ Display offline banner when offline
- ✅ Disable refresh button when offline
- ✅ Show offline indicator in freshness display

**What to Look For**:
- Offline banner appears
- Refresh button is disabled
- "Offline" text is displayed

### 6. Responsive Layout Tests
**Purpose**: Verify responsive design

**Test Cases**:
- ✅ Render navigation components
- ✅ Render all main sections
- ✅ Apply correct responsive classes

**What to Look For**:
- Navigation elements present
- Main content grid structure
- Responsive padding classes (px-4, md:px-8, xl:px-12)

### 7. Component Integration Tests
**Purpose**: Verify components work together

**Test Cases**:
- ✅ Integrate all layout components
- ✅ Integrate hero section with pollutant grid
- ✅ Integrate weather section with health recommendations
- ✅ Wrap components in error boundaries

**What to Look For**:
- All major components render
- Data flows between components
- Error boundaries are in place

### 8. Data Consistency Tests
**Purpose**: Verify data consistency across components

**Test Cases**:
- ✅ Use same data across all components
- ✅ Update all components when data changes

**What to Look For**:
- API called only once
- Same data displayed in all components
- All components update together

## Running Specific Test Suites

### Run Only Data Flow Tests
```bash
npm test -- app/__tests__/page.integration.test.tsx -t "Complete Data Flow"
```

### Run Only Loading Tests
```bash
npm test -- app/__tests__/page.integration.test.tsx -t "Loading States"
```

### Run Only Error Tests
```bash
npm test -- app/__tests__/page.integration.test.tsx -t "Error Handling"
```

### Run Only Offline Tests
```bash
npm test -- app/__tests__/page.integration.test.tsx -t "Offline Behavior"
```

## Debugging Failed Tests

### Test Fails: "Unable to find element"
**Cause**: Component not rendering or data not loading

**Solution**:
1. Check if mock data is set up correctly
2. Verify `waitFor` is used for async operations
3. Check component selectors (text, role, etc.)

### Test Fails: "Timeout waiting for element"
**Cause**: Async operation taking too long

**Solution**:
1. Increase timeout in `waitFor`
2. Check if mock is resolving correctly
3. Verify API client mock is set up

### Test Fails: "Mock function not called"
**Cause**: Mock not triggered or wrong mock

**Solution**:
1. Verify mock is set up before render
2. Check if component is actually calling the function
3. Ensure mock is not cleared prematurely

### Test Fails: "Element is not in the document"
**Cause**: Element removed or never rendered

**Solution**:
1. Check if error boundary caught an error
2. Verify component conditional rendering logic
3. Check if element is hidden by CSS

## Coverage Report

### Generate Coverage Report
```bash
npm test -- app/__tests__/page.integration.test.tsx --coverage
```

### Expected Coverage
- **Statements**: >80%
- **Branches**: >75%
- **Functions**: >80%
- **Lines**: >80%

### Coverage Report Location
```
dashboard/coverage/lcov-report/index.html
```

Open in browser to see detailed coverage.

## Test Data

### Mock AQI Data Structure
```typescript
{
  location: {
    id: 'delhi-1',
    name: 'Delhi',
    city: 'Delhi',
    state: 'Delhi',
    country: 'India',
    latitude: 28.6139,
    longitude: 77.2090,
  },
  aqi: {
    value: 156,
    category: 'unhealthy',
    categoryLabel: 'Unhealthy',
    dominantPollutant: 'PM2.5',
    color: '#FB923C',
    healthMessage: 'Everyone should limit prolonged outdoor exertion',
  },
  pollutants: {
    pm25: { value: 89.5, unit: 'μg/m³', aqi: 156, status: 'Unhealthy' },
    pm10: { value: 145.2, unit: 'μg/m³', aqi: 98, status: 'Moderate' },
    o3: { value: 45.3, unit: 'μg/m³', aqi: 42, status: 'Good' },
    no2: { value: 38.7, unit: 'μg/m³', aqi: 35, status: 'Good' },
    so2: { value: 12.4, unit: 'μg/m³', aqi: 18, status: 'Good' },
    co: { value: 1.2, unit: 'mg/m³', aqi: 12, status: 'Good' },
  },
  weather: {
    temperature: 28.5,
    humidity: 65,
    windSpeed: 12.5,
    windDirection: 180,
    pressure: 1013,
  },
  // ... more fields
}
```

## Common Issues

### Issue: Tests Pass Locally but Fail in CI
**Solution**:
- Ensure all dependencies are installed
- Check Node.js version compatibility
- Verify environment variables are set

### Issue: Flaky Tests (Sometimes Pass, Sometimes Fail)
**Solution**:
- Use `waitFor` for all async operations
- Avoid hardcoded timeouts
- Clean up mocks between tests

### Issue: Slow Test Execution
**Solution**:
- Use fake timers for time-based tests
- Mock heavy dependencies
- Run tests in parallel

### Issue: Mock Not Working
**Solution**:
- Ensure mock is set up before import
- Use `jest.mock()` at top of file
- Clear mocks in `beforeEach`

## Best Practices

### 1. Test Naming
✅ **Good**: "should display error message when API call fails"
❌ **Bad**: "test error"

### 2. Test Structure
```typescript
it('should do something', async () => {
  // Arrange: Set up test data and mocks
  const mockData = { ... };
  mockFunction.mockResolvedValue(mockData);

  // Act: Render component and trigger action
  render(<Component />);
  fireEvent.click(screen.getByRole('button'));

  // Assert: Verify expected outcome
  await waitFor(() => {
    expect(screen.getByText('Expected')).toBeInTheDocument();
  });
});
```

### 3. Async Handling
✅ **Good**: Use `waitFor` for async operations
```typescript
await waitFor(() => {
  expect(screen.getByText('Data')).toBeInTheDocument();
});
```

❌ **Bad**: Use arbitrary timeouts
```typescript
await new Promise(resolve => setTimeout(resolve, 1000));
```

### 4. Mock Cleanup
✅ **Good**: Clean up in `beforeEach`
```typescript
beforeEach(() => {
  jest.clearAllMocks();
});
```

❌ **Bad**: No cleanup between tests

### 5. Assertions
✅ **Good**: Specific assertions
```typescript
expect(screen.getByText('156')).toBeInTheDocument();
expect(screen.getByRole('button')).toBeDisabled();
```

❌ **Bad**: Generic assertions
```typescript
expect(element).toBeTruthy();
```

## Continuous Integration

### GitHub Actions Example
```yaml
name: Integration Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm ci
      - run: npm test -- app/__tests__/page.integration.test.tsx --coverage
      - uses: codecov/codecov-action@v2
        with:
          files: ./coverage/lcov.info
```

## Maintenance

### When to Update Tests

1. **Component Changes**: Update tests when component structure changes
2. **API Changes**: Update mocks when API responses change
3. **New Features**: Add tests for new functionality
4. **Bug Fixes**: Add tests to prevent regression

### Test Review Checklist

- [ ] All tests pass
- [ ] Coverage meets threshold (>80%)
- [ ] No flaky tests
- [ ] Test names are descriptive
- [ ] Mocks are properly cleaned up
- [ ] Async operations use `waitFor`
- [ ] Error cases are tested
- [ ] Loading states are tested

## Resources

### Documentation
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [TanStack Query Testing](https://tanstack.com/query/latest/docs/react/guides/testing)

### Tools
- [Jest](https://jestjs.io/) - Test framework
- [React Testing Library](https://testing-library.com/) - Component testing
- [jest-dom](https://github.com/testing-library/jest-dom) - Custom matchers

## Support

### Getting Help
1. Check test output for error messages
2. Review this guide for common issues
3. Check component implementation
4. Review mock setup

### Reporting Issues
When reporting test failures, include:
- Test name
- Error message
- Test output
- Environment details (Node version, OS)
- Steps to reproduce

## Conclusion

This test suite provides comprehensive coverage of the dashboard integration, ensuring:
- ✅ Data flows correctly from API to UI
- ✅ Loading states work properly
- ✅ Errors are handled gracefully
- ✅ Auto-refresh functions correctly
- ✅ Offline mode works as expected
- ✅ Components integrate properly

Run the tests regularly to catch regressions early and maintain code quality.
