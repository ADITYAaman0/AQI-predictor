# Testing Quick Reference

Quick reference guide for running tests in the AQI Dashboard project.

## 🚀 Quick Start

```bash
# Run all tests
npm run test:all

# Verify testing checklist status
npm run test:checklist
```

## 📋 Test Categories

### Unit Tests
```bash
# Run all unit tests
npm test

# Watch mode (auto-rerun on changes)
npm run test:watch

# With coverage report
npm run test:coverage

# Specific test file
npm test -- __tests__/accessibility.test.tsx

# Silent mode
npm test -- --silent
```

### Property-Based Tests (46 Properties)
```bash
# Run all property tests
npm run test:properties

# Generate property test report
npm run test:property-report
```

### Integration Tests
```bash
# Run integration tests only
npm run test:integration

# Specific integration test
npm test -- __tests__/integration/api-integration.test.tsx
```

### E2E Tests (Playwright)
```bash
# Run all E2E tests
npm run test:e2e

# Interactive UI mode
npm run test:e2e:ui

# With browser visible
npm run test:e2e:headed

# Debug mode
npm run test:e2e:debug

# Specific browser
npm run test:e2e:chromium
npm run test:e2e:firefox
npm run test:e2e:webkit

# Mobile tests only
npm run test:e2e:mobile

# View last test report
npm run test:e2e:report
```

### Visual Regression Tests
```bash
# Run visual tests
npm run test:visual

# Update baselines (when UI intentionally changed)
npm run test:visual:update

# Chromium only
npm run test:visual:chromium

# Responsive layouts only
npm run test:visual:responsive

# Review visual diffs
npm run test:visual:review

# Approve changes
npm run test:visual:approve

# Reject and cleanup
npm run test:visual:reject
```

### Accessibility Tests
```bash
# Run accessibility tests
npm test -- __tests__/accessibility.test.tsx

# With coverage
npm run test:coverage -- __tests__/accessibility.test.tsx
```

### Performance Tests
```bash
# Run performance tests
npm test -- __tests__/performance.test.tsx

# Lighthouse audit (if configured)
npx lighthouse http://localhost:3000 --view
```

## 🔍 Test Status & Reports

```bash
# Verify testing checklist
npm run test:checklist

# View coverage report
npm run test:coverage
# Then open: coverage/lcov-report/index.html

# View E2E report
npm run test:e2e:report

# View property test results
cat PROPERTY_TEST_RESULTS.md

# View testing checklist status
cat TESTING_CHECKLIST_STATUS.md
```

## 🐛 Debugging Tests

### Unit/Integration Tests
```bash
# Run with verbose output
npm test -- --verbose

# Run specific test by name
npm test -- -t "should render component"

# Debug in VS Code
# Add breakpoint, then use "Jest: Debug" in command palette
```

### E2E Tests
```bash
# Debug mode (pauses at breakpoint)
npm run test:e2e:debug

# Headed mode (see browser)
npm run test:e2e:headed

# UI mode (interactive)
npm run test:e2e:ui

# Generate trace
npm run test:e2e -- --trace on

# View trace
npx playwright show-trace trace.zip
```

## 📊 Coverage Goals

- **Overall:** 80%+ code coverage
- **Critical paths:** 100% coverage
- **Components:** 90%+ coverage
- **Utilities:** 95%+ coverage

Check current coverage:
```bash
npm run test:coverage
```

## 🎯 Testing Checklist Status

Current implementation status:

- ✅ **46/46** Property-based tests
- ✅ **7/7** E2E critical flows
- ✅ **5/5** Unit test categories
- ✅ **4/4** Integration test categories
- ✅ **5/5** Visual regression checks
- ✅ **5/5** Accessibility checks
- ✅ **5/5** Performance checks

**Total: 77/77 (100%)**

## 🔄 CI/CD Testing

Tests run automatically in CI/CD:

```bash
# Pre-flight check for CI
npm run ci:preflight

# Full CI test suite (what GitHub Actions runs)
npm run test:all
npm run test:e2e
npm run test:visual
```

## 📝 Test File Locations

```
dashboard/
├── __tests__/                          # Top-level tests
│   ├── integration/                    # Integration tests
│   ├── *.test.tsx                      # Unit tests
│   ├── *.property.test.tsx             # Property tests
│   ├── accessibility.test.tsx          # Accessibility
│   ├── animations.test.tsx             # Animation tests
│   ├── dark-mode.test.tsx              # Dark mode
│   ├── error-handling.test.ts          # Error handling
│   ├── performance.test.tsx            # Performance
│   ├── pwa.test.tsx                    # PWA features
│   └── responsive-design.test.tsx      # Responsive
├── components/*/__ tests__/            # Component tests
├── e2e/                                # E2E tests
│   ├── critical-flows.spec.ts          # Critical flows
│   ├── mobile.spec.ts                  # Mobile tests
│   ├── offline.spec.ts                 # Offline tests
│   ├── visual-regression.spec.ts       # Visual tests
│   └── visual-responsive.spec.ts       # Responsive visual
└── lib/*/__ tests__/                   # Library tests
```

## 🛠️ Common Tasks

### After UI Changes
```bash
# Update visual baselines
npm run test:visual:update

# Verify changes
npm run test:visual
```

### After Adding New Feature
```bash
# Write tests first (TDD)
# Then verify all pass
npm run test:all
npm run test:checklist
```

### Before Committing
```bash
# Run quick tests
npm test

# Run full suite
npm run test:all

# Check coverage
npm run test:coverage
```

### Before Deploying
```bash
# Full test suite
npm run test:all

# Verify checklist
npm run test:checklist

# Run E2E on staging
npm run test:e2e -- --base-url=https://staging.example.com
```

## 📖 Documentation

- **Full Implementation:** [TESTING_CHECKLIST_IMPLEMENTATION.md](TESTING_CHECKLIST_IMPLEMENTATION.md)
- **Current Status:** [TESTING_CHECKLIST_STATUS.md](TESTING_CHECKLIST_STATUS.md)
- **Property Results:** [PROPERTY_TEST_RESULTS.md](PROPERTY_TEST_RESULTS.md)
- **Visual Testing:** [VISUAL_TESTING_QUICK_REFERENCE.md](VISUAL_TESTING_QUICK_REFERENCE.md)

## 🎓 Tips

1. **Use watch mode** during development: `npm run test:watch`
2. **Run specific tests** to save time: `npm test -- -t "test name"`
3. **Check coverage** regularly: `npm run test:coverage`
4. **Update visuals** when UI changes intentionally: `npm run test:visual:update`
5. **Use UI mode** for E2E debugging: `npm run test:e2e:ui`
6. **Verify checklist** before PRs: `npm run test:checklist`

## ❓ Need Help?

- Run `npm run test:checklist` to see current status
- Check test output for detailed error messages
- View test reports in browser (coverage, E2E)
- Consult implementation docs for detailed info

---

**Quick Commands Summary:**

| Task | Command |
|------|---------|
| Run all tests | `npm run test:all` |
| Unit tests | `npm test` |
| E2E tests | `npm run test:e2e` |
| Visual tests | `npm run test:visual` |
| Coverage report | `npm run test:coverage` |
| Check status | `npm run test:checklist` |
| Watch mode | `npm run test:watch` |
| Debug E2E | `npm run test:e2e:debug` |

---

**Status:** ✅ 100% Testing Coverage  
**Last Updated:** February 16, 2026
