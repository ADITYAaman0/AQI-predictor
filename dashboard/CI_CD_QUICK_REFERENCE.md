# CI/CD Quick Reference

## 🚀 Quick Commands

### Run CI Checks Locally

```bash
cd dashboard

# Full CI check
npm run lint && npx tsc --noEmit && npm test && npm run test:e2e

# Individual checks
npm run lint              # ESLint
npx tsc --noEmit         # Type check
npm test                 # Unit tests
npm run test:properties  # Property-based tests
npm run test:e2e         # E2E tests
npm run test:visual      # Visual regression
```

### Lighthouse CI

```bash
# Run Lighthouse locally
npm run build
npm run start &
npx @lhci/cli@0.13.x autorun
```

### Update Visual Snapshots

```bash
# Update all snapshots
npm run test:visual:update

# Review changes
npm run test:visual:review

# Approve changes
npm run test:visual:approve
```

## 🔧 Pipeline Triggers

| Event | Branch | Jobs Run | Deploys To |
|-------|--------|----------|------------|
| Push | `develop` | All except prod deployment | Staging |
| Push | `main` | All | Production (with approval) |
| PR | Any | All except deployment | - |
| Manual | - | All | Staging or Production |

## ✅ Success Criteria

### Quality
- ✓ No ESLint errors
- ✓ No TypeScript errors

### Tests
- ✓ All unit tests pass
- ✓ All property tests pass
- ✓ Code coverage >80%

### E2E
- ✓ Pass in Chromium, Firefox, WebKit
- ✓ No visual regressions

### Performance
- ✓ Performance score ≥90
- ✓ Accessibility score ≥95
- ✓ FCP <1.8s, LCP <2.5s, CLS <0.1
- ✓ JS bundle <400KB

## 📊 Performance Budgets

| Metric | Max |
|--------|-----|
| Performance Score | 90 |
| Accessibility Score | 95 |
| JavaScript | 400KB |
| CSS | 100KB |
| FCP | 1.8s |
| LCP | 2.5s |
| CLS | 0.1 |
| TBT | 300ms |

## 🔑 Required Secrets

```bash
VERCEL_TOKEN          # Vercel deployment
VERCEL_ORG_ID         # Vercel organization
VERCEL_PROJECT_ID     # Vercel project
CODECOV_TOKEN         # Code coverage
SNYK_TOKEN           # Security scanning
LHCI_GITHUB_APP_TOKEN # Lighthouse CI
SLACK_WEBHOOK        # Notifications
```

## 🐛 Troubleshooting

### Build Fails
```bash
# Check locally
npm ci
npm run build

# Clear cache
rm -rf .next node_modules package-lock.json
npm install
```

### E2E Timeout
```bash
# Increase timeout in playwright.config.ts
timeout: 60000
```

### Visual Diff
```bash
# If changes are intentional
npm run test:visual:update
git add e2e/__screenshots__
git commit -m "Update snapshots"
```

### Lighthouse Fail
```bash
# Check bundle size
npm run build
npx @next/bundle-analyzer

# Review report
npx @lhci/cli@0.13.x autorun
```

## 🔄 Deployment Flow

### Staging
1. Push to `develop`
2. CI runs all checks
3. Auto-deploys to staging
4. Test at staging URL

### Production
1. Merge to `main`
2. CI runs all checks
3. **Manual approval required**
4. Deploys to production
5. Creates GitHub release

## 📝 Pre-Push Checklist

- [ ] Run linter
- [ ] Run tests
- [ ] Check types
- [ ] Test build locally
- [ ] Update snapshots if needed
- [ ] Write descriptive commit message

## 🎯 Job Dependencies

```
quality ──┐
          ├─▶ build ──┬─▶ e2e ────────┐
test ────┘            │               │
                      ├─▶ lighthouse ─┤
                      │               ├─▶ deploy-staging
                      └─▶ visual ─────┤
                                      └─▶ deploy-production
```

## 📚 More Info

See [CI_CD_PIPELINE_GUIDE.md](./CI_CD_PIPELINE_GUIDE.md) for detailed documentation.
