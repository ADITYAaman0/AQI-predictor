# CI/CD Pipeline Documentation

## Overview

This document describes the CI/CD pipeline for the AQI Dashboard, implementing Task 29 from the glassmorphic dashboard implementation plan.

## Pipeline Architecture

The dashboard CI/CD pipeline is defined in `.github/workflows/dashboard-ci.yml` and consists of 10 jobs that run in parallel and sequence:

### Pipeline Jobs

```
┌─────────────────────────────────────────────────────────┐
│                    On Push/PR/Manual                      │
└────────────────────┬────────────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
        ▼                         ▼
┌──────────────┐          ┌──────────────┐
│   Quality    │          │     Test     │
│  (Linting &  │          │ (Unit & Prop │
│ Type Check)  │          │  Based Tests)│
└──────┬───────┘          └──────┬───────┘
       │                         │
       └─────────┬───────────────┘
                 │
        ┌────────┴────────┐
        │      Build      │
        │  (Dev/Stg/Prod) │
        └────────┬────────┘
                 │
     ┌───────────┼───────────┬──────────────┐
     │           │           │              │
     ▼           ▼           ▼              ▼
┌─────────┐ ┌─────────┐ ┌──────────┐ ┌──────────┐
│   E2E   │ │Lighthouse│ │ Visual   │ │ Security │
│ Tests   │ │   CI     │ │Regression│ │   Scan   │
└────┬────┘ └────┬────┘ └────┬─────┘ └──────────┘
     │           │           │
     └─────┬─────┴─────┬─────┘
           │           │
           ▼           ▼
    ┌──────────┐  ┌──────────┐
    │  Deploy  │  │  Deploy  │
    │ Staging  │  │Production│
    └──────────┘  └──────────┘
```

## Job Details

### 1. Quality Check (`quality`)
**Runs:** Every push/PR  
**Purpose:** Ensure code quality and TypeScript correctness

- ESLint for code linting
- TypeScript type checking
- Fast feedback on code quality issues

**Success Criteria:**
- No linting errors
- No TypeScript errors

### 2. Unit & Property Tests (`test`)
**Runs:** Every push/PR  
**Purpose:** Verify component functionality and correctness properties

- Jest unit tests
- Property-based tests (fast-check)
- Code coverage reporting (Codecov)

**Success Criteria:**
- All tests pass
- Coverage thresholds met

**Artifacts:**
- `test-results`: Coverage reports and property test results
- Uploaded to Codecov for tracking

### 3. E2E Tests (`e2e`)
**Runs:** Every push/PR  
**Purpose:** Test full user workflows across browsers

**Matrix Strategy:**
- Chromium
- Firefox  
- WebKit

**Success Criteria:**
- All E2E tests pass in all browsers
- No visual regressions

**Artifacts:**
- `playwright-report-{browser}`: HTML test reports
- `playwright-results-{browser}`: JSON results
- Screenshots on failure

### 4. Visual Regression (`visual-regression`)
**Runs:** Every push/PR  
**Purpose:** Catch unintended visual changes

- Screenshot comparison using Playwright
- Tests responsive layouts (mobile, tablet, desktop)
- Verifies glassmorphic styling consistency

**Success Criteria:**
- No pixel differences from baseline
- All snapshots match

**Artifacts:**
- `visual-diff`: Diff images on failure
- `visual-regression-report`: Detailed comparison report

### 5. Lighthouse CI (`lighthouse`)
**Runs:** Every push/PR  
**Purpose:** Enforce performance budgets

**Performance Budgets:**
- Performance Score: ≥90
- Accessibility Score: ≥95
- Best Practices: ≥90
- SEO: ≥90
- PWA: ≥80 (warning)

**Core Web Vitals:**
- FCP: <1.8s
- LCP: <2.5s
- CLS: <0.1
- TBT: <300ms
- Speed Index: <3s
- Time to Interactive: <3.8s

**Resource Budgets:**
- JavaScript: <400KB
- CSS: <100KB
- Images: <1MB (warning)
- Total: <2MB (warning)

**Success Criteria:**
- All budgets met
- No accessibility violations
- No vulnerable dependencies

**Artifacts:**
- `lighthouse-report`: Full Lighthouse reports

### 6. Security Scan (`security`)
**Runs:** Every push/PR  
**Purpose:** Identify vulnerable dependencies

- npm audit
- Snyk security scanning

**Success Criteria:**
- No high-severity vulnerabilities
- Warnings allowed (doesn't fail build)

### 7. Build (`build`)
**Runs:** After quality and test pass  
**Purpose:** Create production-ready builds

**Matrix Strategy:**
- Development
- Staging
- Production

Each environment uses its respective `.env.{environment}` file.

**Success Criteria:**
- Next.js build succeeds
- No build warnings
- Bundle size within limits

**Artifacts:**
- `build-{environment}`: Optimized Next.js build output

### 8. Deploy Staging (`deploy-staging`)
**Runs:** On `develop` or `staging` branch, after build + tests  
**Purpose:** Deploy to staging environment for testing

**Deployment Target:** Vercel (Staging)  
**URL:** `https://staging.aqi-dashboard.example.com`

**Environment Variables Required:**
- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

**Success Criteria:**
- Deployment succeeds
- Staging URL accessible
- PR comment with deployment URL

### 9. Deploy Production (`deploy-production`)
**Runs:** On `main` branch, after all tests pass  
**Purpose:** Deploy to production

**Deployment Target:** Vercel (Production)  
**URL:** `https://aqi-dashboard.example.com`

**Manual Approval:** Required via GitHub Environments

**Environment Variables Required:**
- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

**Success Criteria:**
- Deployment succeeds
- Production URL accessible
- GitHub release created (if tagged)

### 10. Notify Failure (`notify-failure`)
**Runs:** On any job failure  
**Purpose:** Alert team of failures

- Sends Slack notification to `#ci-notifications`

**Environment Variables Required:**
- `SLACK_WEBHOOK`

## Triggers

### Automatic Triggers

1. **Push to main/develop/staging**
   - Only when dashboard files change
   - Runs full pipeline
   - Deploys to staging/production

2. **Pull Requests to main/develop**
   - Runs all checks except production deployment
   - Comments deployment URL on PR

### Manual Trigger

```bash
# Via GitHub Actions UI
# 1. Go to Actions tab
# 2. Select "Dashboard CI/CD Pipeline"
# 3. Click "Run workflow"
# 4. Choose environment (staging/production)
```

## Environment Setup

### GitHub Secrets Required

```bash
# Vercel
VERCEL_TOKEN=<vercel-deployment-token>
VERCEL_ORG_ID=<vercel-org-id>
VERCEL_PROJECT_ID=<vercel-project-id>

# Code Coverage
CODECOV_TOKEN=<codecov-token>

# Security Scanning
SNYK_TOKEN=<snyk-api-token>

# Lighthouse CI (optional)
LHCI_GITHUB_APP_TOKEN=<lhci-token>

# Notifications
SLACK_WEBHOOK=<slack-webhook-url>
```

### Setting up GitHub Secrets

```bash
# Navigate to repository settings
Settings > Secrets and variables > Actions > New repository secret
```

## Environment Configuration

### GitHub Environments

Create these environments in GitHub:

1. **staging**
   - URL: `https://staging.aqi-dashboard.example.com`
   - Deployment branch: `develop`, `staging`
   - No approval required

2. **production**
   - URL: `https://aqi-dashboard.example.com`
   - Deployment branch: `main` only
   - **Approval required**: 1 reviewer

### Setting up Environments

```bash
# Navigate to repository settings
Settings > Environments > New environment
```

## Local Testing

### Run CI checks locally before pushing

```bash
cd dashboard

# 1. Quality checks
npm run lint
npx tsc --noEmit

# 2. Unit and property tests
npm test
npm run test:properties

# 3. Build
npm run build

# 4. E2E tests (requires build)
npm run test:e2e

# 5. Visual regression
npm run test:visual

# 6. Lighthouse (requires running server)
npm run start &
npx @lhci/cli@0.13.x autorun
```

## Performance Budgets

### Core Web Vitals Targets

| Metric | Target | Max Allowed |
|--------|--------|-------------|
| FCP | <1.0s | 1.8s |
| LCP | <2.0s | 2.5s |
| CLS | <0.05 | 0.1 |
| TBT | <200ms | 300ms |
| Speed Index | <2.0s | 3.0s |
| TTI | <3.0s | 3.8s |

### Bundle Size Budgets

| Resource | Target | Max Allowed |
|----------|--------|-------------|
| JavaScript | <300KB | 400KB |
| CSS | <50KB | 100KB |
| Images | <500KB | 1MB |
| Fonts | <100KB | 200KB |
| Total | <1MB | 2MB |

### Score Targets

| Category | Target | Min Allowed |
|----------|--------|-------------|
| Performance | 95+ | 90 |
| Accessibility | 100 | 95 |
| Best Practices | 95+ | 90 |
| SEO | 95+ | 90 |
| PWA | 90+ | 80 |

## Monitoring and Debugging

### View Pipeline Status

```bash
# Check Actions tab on GitHub
https://github.com/{owner}/{repo}/actions

# Check specific workflow run
https://github.com/{owner}/{repo}/actions/runs/{run_id}
```

### Download Artifacts

```bash
# Via GitHub UI: Actions > Workflow Run > Artifacts
# Or via CLI:
gh run download {run_id}
```

### Debugging Failures

#### Quality/Test Failures
```bash
# Check test output in job logs
# Re-run locally to reproduce
npm test
```

#### E2E Failures
```bash
# Download playwright-report artifact
# Open HTML report: playwright-report/index.html
# Check screenshots in report
```

#### Lighthouse Failures
```bash
# Download lighthouse-report artifact
# Review performance metrics
# Check resource budgets
# Optimize as needed
```

#### Visual Regression Failures
```bash
# Download visual-diff artifact
# Review *-diff.png images
# If intended: approve changes
npm run test:visual:update
# Commit updated snapshots
```

## Deployment Process

### Staging Deployment

1. Push to `develop` or `staging` branch
2. Pipeline runs automatically
3. On success, deploys to staging
4. PR comment includes staging URL
5. Test on staging environment

### Production Deployment

1. Merge PR to `main` branch
2. Pipeline runs all checks
3. Manual approval required (GitHub Environment)
4. On approval, deploys to production
5. Creates GitHub release (if tagged)
6. Monitors production metrics

### Rollback Strategy

#### Quick Rollback (Vercel)
```bash
# Via Vercel dashboard
# Select previous deployment
# Promote to production
```

#### Git Rollback
```bash
# Revert merge commit
git revert -m 1 {merge-commit-hash}
git push origin main

# Or create hotfix from previous tag
git checkout {previous-tag}
git checkout -b hotfix/rollback
git push origin hotfix/rollback
```

## Troubleshooting

### Common Issues

#### 1. Build Failures

**Symptom:** Build job fails  
**Causes:**
- TypeScript errors
- Missing dependencies
- Environment variable issues

**Solution:**
```bash
# Check TypeScript
npx tsc --noEmit

# Verify dependencies
npm ci

# Check environment variables
npm run verify:env
```

#### 2. E2E Test Timeouts

**Symptom:** Playwright tests timeout  
**Causes:**
- Server not starting
- Slow API responses
- Network issues

**Solution:**
```bash
# Increase timeout in playwright.config.ts
timeout: 60000

# Check server startup
npm run build
npm run start
```

#### 3. Visual Regression Failures

**Symptom:** Screenshots don't match  
**Causes:**
- Intentional UI changes
- Font rendering differences
- Timing issues

**Solution:**
```bash
# If changes are intended
npm run test:visual:update
git add e2e/__screenshots__
git commit -m "Update visual snapshots"
```

#### 4. Lighthouse Score Drop

**Symptom:** Performance score below threshold  
**Causes:**
- Increased bundle size
- Unoptimized images
- Render-blocking resources

**Solution:**
```bash
# Analyze bundle
npm run build
npx @next/bundle-analyzer

# Check images
# Optimize with next/image

# Review Lighthouse report
npx @lhci/cli@0.13.x autorun
```

## Best Practices

### Before Pushing

1. Run linter: `npm run lint`
2. Run tests: `npm test`
3. Check types: `npx tsc --noEmit`
4. Test locally: `npm run build && npm start`

### When Creating PR

1. Write clear description
2. Link related issues
3. Include screenshots for UI changes
4. Wait for CI to pass
5. Request reviews

### After Merge

1. Monitor staging deployment
2. Test on staging
3. Check Lighthouse scores
4. Review error logs
5. Verify production deployment

## Continuous Improvement

### Metrics to Track

1. **Build Times**
   - Target: <10 minutes
   - Monitor trends

2. **Test Coverage**
   - Target: >80%
   - Track in Codecov

3. **Performance Scores**
   - Target: >90
   - Trending in Lighthouse CI

4. **Deployment Frequency**
   - Target: Multiple per day
   - Track via GitHub Insights

5. **Failure Rate**
   - Target: <10%
   - Monitor and address patterns

### Regular Maintenance

- [ ] Weekly: Review failed builds
- [ ] Monthly: Update dependencies
- [ ] Quarterly: Review and adjust budgets
- [ ] As needed: Optimize slow tests

## Resources

- [GitHub Actions Documentation](https://docs.github.com/actions)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Vercel Platform](https://vercel.com/docs)
- [Lighthouse CI](https://github.com/GoogleChrome/lighthouse-ci)
- [Playwright Documentation](https://playwright.dev/)
- [Jest Documentation](https://jestjs.io/)

## Related Tasks

- Task 29.1: ✅ GitHub Actions workflow
- Task 29.2: ✅ Automated testing in CI
- Task 29.3: ✅ E2E tests in CI
- Task 29.4: ✅ Lighthouse CI
- Task 29.5: ✅ Visual regression in CI
- Task 29.6: ✅ Deployment pipeline

## Support

For issues or questions:
1. Check this documentation
2. Review workflow logs
3. Check existing issues
4. Create new issue with details
