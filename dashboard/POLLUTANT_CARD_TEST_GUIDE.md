# PollutantCard Component - Testing Guide

## Overview
This guide provides information about the comprehensive test suite for the PollutantCard component.

## Test Files

### 1. PollutantCard.test.tsx
**Purpose**: Basic unit tests covering core functionality  
**Tests**: 55  
**Focus Areas**:
- Basic rendering
- Color coding
- Progress bar
- Status display
- Hover interactions
- Styling
- Accessibility

### 2. PollutantCard.icons-colors.test.tsx
**Purpose**: Detailed tests for icons and color coding (Task 6.2)  
**Tests**: 51  
**Focus Areas**:
- Pollutant-specific icons
- Icon uniqueness and accessibility
- AQI-based color coding
- Color consistency across elements
- Threshold boundaries
- Edge cases

### 3. PollutantCard.comprehensive.test.tsx
**Purpose**: Comprehensive test suite consolidating all requirements (Task 6.7)  
**Tests**: 51  
**Focus Areas**:
- All pollutant types
- Complete color coding logic
- Hover interactions
- Progress bar functionality
- Styling and layout
- Accessibility
- Custom icon support
- Edge cases
- Component integration

## Total Test Coverage

```
Test Suites: 3
Total Tests: 106
Status: ALL PASSING ✅
Execution Time: ~10 seconds
```

## Running Tests

### Run All PollutantCard Tests
```bash
cd dashboard
npm test -- PollutantCard
```

### Run Specific Test File
```bash
# Basic tests
npm test -- PollutantCard.test

# Icons and colors tests
npm test -- PollutantCard.icons-colors

# Comprehensive tests
npm test -- PollutantCard.comprehensive
```

### Run Tests in Watch Mode
```bash
npm test -- PollutantCard --watch
```

### Run Tests with Coverage
```bash
npm test -- PollutantCard --coverage
```

## Test Categories

### ✅ Rendering Tests
- All 6 pollutant types (PM2.5, PM10, O₃, NO₂, SO₂, CO)
- Pollutant name formatting
- Value formatting (1 decimal place)
- Unit display
- Icon rendering
- All required elements present

### ✅ Color Coding Tests
- Good (0-50): #4ADE80 (Green)
- Moderate (51-100): #FCD34D (Yellow)
- Unhealthy for Sensitive (101-150): #FB923C (Orange)
- Unhealthy (151-200): #EF4444 (Red)
- Very Unhealthy (201-300): #B91C1C (Dark Red)
- Hazardous (301+): #7C2D12 (Brown)
- Color consistency (border, icon, status, progress bar)
- Threshold boundaries
- Dynamic color updates

### ✅ Hover Interaction Tests
- Tooltip display on hover
- Tooltip content validation
- Tooltip styling
- Multiple hover interactions
- Hover-lift CSS class

### ✅ Progress Bar Tests
- Percentage display
- Animation (0 to target, 1s ease-out)
- Height (8px)
- Gradient fill
- AQI-based percentage calculation
- 100% cap
- ARIA attributes

### ✅ Styling Tests
- Card dimensions (200×180px)
- Glassmorphic styling
- Border width (2px)
- Font sizes
- Transition classes

### ✅ Accessibility Tests
- ARIA roles
- ARIA labels
- Icon accessibility
- Progress bar accessibility
- Data attributes

### ✅ Edge Case Tests
- Zero values
- Very large values
- Very small decimals
- Negative AQI
- Extremely high AQI (>500)
- Empty status
- Boundary percentages (0%, 100%)

### ✅ Integration Tests
- All elements working together
- Props updates
- State management during interactions

## Component Props

```typescript
interface PollutantCardProps {
  pollutant: PollutantType;  // 'pm25' | 'pm10' | 'o3' | 'no2' | 'so2' | 'co'
  value: number;              // Numeric value
  unit: string;               // 'μg/m³' | 'mg/m³' | etc.
  aqi: number;                // AQI sub-index (0-500+)
  status: string;             // 'good' | 'moderate' | 'unhealthy' | etc.
  icon?: React.ReactNode;     // Optional custom icon
  percentage?: number;        // Optional progress percentage (0-100)
}
```

## Test Data Examples

### All Pollutants
```typescript
const pollutants = [
  { type: 'pm25', name: 'PM2.5', unit: 'μg/m³' },
  { type: 'pm10', name: 'PM10', unit: 'μg/m³' },
  { type: 'o3', name: 'O₃', unit: 'μg/m³' },
  { type: 'no2', name: 'NO₂', unit: 'μg/m³' },
  { type: 'so2', name: 'SO₂', unit: 'μg/m³' },
  { type: 'co', name: 'CO', unit: 'mg/m³' },
];
```

### AQI Categories
```typescript
const categories = [
  { range: '0-50', aqi: 30, status: 'good', color: '#4ADE80' },
  { range: '51-100', aqi: 75, status: 'moderate', color: '#FCD34D' },
  { range: '101-150', aqi: 125, status: 'unhealthy_sensitive', color: '#FB923C' },
  { range: '151-200', aqi: 175, status: 'unhealthy', color: '#EF4444' },
  { range: '201-300', aqi: 250, status: 'very_unhealthy', color: '#B91C1C' },
  { range: '301+', aqi: 400, status: 'hazardous', color: '#7C2D12' },
];
```

## Requirements Coverage

| Requirement | Description | Status |
|-------------|-------------|--------|
| 3.1 | Pollutant Cards Display | ✅ Fully Tested |
| 3.2 | Card Content | ✅ Fully Tested |
| 3.3 | Icons | ✅ Fully Tested |
| 3.4 | Progress Bar | ✅ Fully Tested |
| 3.5 | Hover Interactions | ✅ Fully Tested |
| 3.6 | Color Coding | ✅ Fully Tested |
| 3.7 | Grid Layout | ✅ Tested in Task 6.5 |
| 12.1 | Animations | ✅ Fully Tested |
| 13.1-13.5 | Accessibility | ✅ Fully Tested |

## Testing Best Practices

### 1. Test Organization
- Tests grouped by functionality
- Clear, descriptive test names
- Logical test suite structure

### 2. Test Isolation
- Each test is independent
- Proper cleanup between tests
- No shared state

### 3. Async Handling
```typescript
await waitFor(() => {
  expect(element).toHaveStyle({ width: '75%' });
}, { timeout: 200 });
```

### 4. User Interaction Testing
```typescript
fireEvent.mouseEnter(card);
expect(screen.getByTestId('pollutant-tooltip')).toBeInTheDocument();
```

### 5. Accessibility Validation
```typescript
expect(card).toHaveAttribute('aria-label', 'PM2.5 pollutant card');
expect(progressBar).toHaveAttribute('aria-valuenow', '75');
```

## Common Test Patterns

### Testing All Pollutants
```typescript
allPollutants.forEach(({ type, name }) => {
  render(<PollutantCard pollutant={type} {...otherProps} />);
  expect(screen.getByTestId('pollutant-name')).toHaveTextContent(name);
});
```

### Testing Color Coding
```typescript
aqiCategories.forEach(({ aqi, color }) => {
  const { container } = render(<PollutantCard aqi={aqi} {...otherProps} />);
  const card = container.querySelector('.pollutant-card');
  expect(card).toHaveStyle({ borderColor: color });
});
```

### Testing Animations
```typescript
const progressBar = screen.getByTestId('progress-bar-fill');
expect(progressBar).toHaveStyle({ width: '0%' }); // Initial

await waitFor(() => {
  expect(progressBar).toHaveStyle({ width: '75%' }); // After animation
});
```

## Debugging Tests

### View Test Output
```bash
npm test -- PollutantCard --verbose
```

### Run Single Test
```typescript
test.only('specific test name', () => {
  // Test implementation
});
```

### Debug in VS Code
Add breakpoint in test file and run:
```json
{
  "type": "node",
  "request": "launch",
  "name": "Jest Debug",
  "program": "${workspaceFolder}/node_modules/.bin/jest",
  "args": ["PollutantCard", "--runInBand"],
  "console": "integratedTerminal"
}
```

## Maintenance

### Adding New Tests
1. Identify the functionality to test
2. Choose appropriate test file
3. Follow existing patterns
4. Ensure test isolation
5. Add descriptive test name
6. Run tests to verify

### Updating Tests
1. Update tests when component changes
2. Maintain test coverage
3. Keep test data up to date
4. Verify all tests still pass

## Related Documentation

- [PollutantCard Component README](./components/dashboard/POLLUTANT_CARD_README.md)
- [Task 6.7 Completion Summary](./TASK_6.7_COMPLETION_SUMMARY.md)
- [Pollutant Icons Guide](./POLLUTANT_ICONS_GUIDE.md)
- [Progress Bar Visual Guide](./PROGRESS_BAR_VISUAL_GUIDE.md)
- [Hover Interactions Guide](./HOVER_INTERACTIONS_GUIDE.md)

## Support

For questions or issues with tests:
1. Check test output for specific failures
2. Review component implementation
3. Verify test data matches component expectations
4. Check for async timing issues
5. Ensure proper cleanup between tests

## Summary

The PollutantCard component has comprehensive test coverage with 106 tests across 3 test files, validating all functionality including rendering, color coding, hover interactions, progress bars, styling, accessibility, and edge cases. All tests pass consistently, providing confidence in the component's correctness and reliability.
