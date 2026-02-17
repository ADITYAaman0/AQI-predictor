# Deployment Checklist - Glassmorphic AQI Dashboard

This document provides a comprehensive checklist for deploying the glassmorphic AQI dashboard to staging and production environments.

## Table of Contents

1. [Pre-Deployment](#pre-deployment)
2. [Staging Deployment](#staging-deployment)
3. [Production Deployment](#production-deployment)
4. [Post-Deployment](#post-deployment)
5. [Rollback Procedures](#rollback-procedures)
6. [Verification Scripts](#verification-scripts)

---

## Pre-Deployment

### Code Quality & Testing

- [ ] **All tests passing**
  ```bash
  npm test -- --coverage --passWithNoTests
  ```
  - Unit tests: ✅ Pass
  - Integration tests: ✅ Pass
  - E2E tests: ✅ Pass
  - Coverage: ≥80%

- [ ] **Code reviewed**
  - All PRs reviewed and approved
  - No pending review comments
  - Code follows style guidelines
  - TypeScript strict mode enabled

- [ ] **Lint and format checks**
  ```bash
  npm run lint
  npm run format:check
  ```
  - No ESLint errors
  - Code formatted with Prettier

- [ ] **Type checking**
  ```bash
  npm run type-check
  ```
  - No TypeScript errors
  - All types properly defined

### Documentation

- [ ] **Documentation complete**
  - README.md updated
  - API documentation current
  - Environment variables documented
  - Deployment guide reviewed
  - Change log updated

- [ ] **Comments and documentation**
  - Complex logic documented
  - Public APIs have JSDoc comments
  - Configuration files explained

### Environment Configuration

- [ ] **Environment variables configured**
  - [ ] `.env.staging` verified
  - [ ] `.env.production` verified
  - [ ] All required variables present
  - [ ] No hardcoded secrets in code
  - [ ] Environment validation script passes
  
  **Run verification:**
  ```bash
  node scripts/verify-env.js staging
  node scripts/verify-env.js production
  ```

- [ ] **API endpoints verified**
  - [ ] Staging API URL correct
  - [ ] Production API URL correct
  - [ ] API health check endpoints working
  - [ ] Authentication configured

### Security

- [ ] **SSL certificates ready**
  - [ ] Staging SSL certificate valid
  - [ ] Production SSL certificate valid
  - [ ] Certificate expiry dates checked
  - [ ] Auto-renewal configured

- [ ] **Security scan completed**
  ```bash
  npm audit
  npm audit fix
  ```
  - No critical vulnerabilities
  - High-risk vulnerabilities addressed
  - Dependencies up to date

- [ ] **Secrets management**
  - [ ] API keys secured
  - [ ] Environment variables in vault
  - [ ] No secrets in git history
  - [ ] Access controls configured

### Performance

- [ ] **Performance testing**
  ```bash
  npm run lighthouse
  ```
  - [ ] Lighthouse Desktop Score ≥90
  - [ ] Lighthouse Mobile Score ≥80
  - [ ] Initial load time <2s
  - [ ] Time to Interactive <3s

- [ ] **Bundle size optimized**
  ```bash
  npm run build
  npm run analyze
  ```
  - [ ] Total bundle size reviewed
  - [ ] Code splitting implemented
  - [ ] Dynamic imports used
  - [ ] Images optimized

### Infrastructure

- [ ] **CDN configured** (if using)
  - [ ] CDN endpoints set up
  - [ ] Cache policies configured
  - [ ] Origin server configured
  - [ ] SSL/TLS on CDN

- [ ] **Database ready** (if needed)
  - [ ] Database migrations run
  - [ ] Backups configured
  - [ ] Connection pools sized
  - [ ] Monitoring enabled

- [ ] **Deployment platform ready**
  - [ ] Vercel project configured
  - [ ] Build settings verified
  - [ ] Domain names configured
  - [ ] DNS records set up

---

## Staging Deployment

### Pre-Staging Checks

- [ ] **Create deployment branch**
  ```bash
  git checkout -b release/v<version>
  git push origin release/v<version>
  ```

- [ ] **Version bump**
  - [ ] Update version in `package.json`
  - [ ] Update `CHANGELOG.md`
  - [ ] Tag commit with version

- [ ] **Build verification**
  ```bash
  npm run build
  ```
  - [ ] Build completes successfully
  - [ ] No build warnings (critical)
  - [ ] Production optimizations applied

### Deploy to Staging

- [ ] **Trigger staging deployment**
  ```bash
  # Via GitHub Actions
  git push origin develop
  
  # Or manual deployment
  npm run deploy:staging
  ```

- [ ] **Monitor deployment**
  - [ ] Deployment started
  - [ ] Build logs clean
  - [ ] Deployment completed
  - [ ] Staging URL accessible

### Staging Verification

- [ ] **Run smoke tests**
  ```bash
  npm run test:smoke -- --env staging
  ```
  - [ ] Home page loads
  - [ ] API connectivity works
  - [ ] Authentication works (if applicable)
  - [ ] Critical user flows functional

- [ ] **Test all features**
  - [ ] **Hero AQI Section**
    - [ ] Current AQI displays correctly
    - [ ] Category color matches AQI value
    - [ ] Category text correct
    - [ ] Last updated time shows
  
  - [ ] **Pollutant Cards**
    - [ ] All 6 pollutants display
    - [ ] Values update from API
    - [ ] Progress bars accurate
    - [ ] Thresholds color-coded
  
  - [ ] **Prediction Graph**
    - [ ] 7-day forecast loads
    - [ ] Data points accurate
    - [ ] Confidence intervals show
    - [ ] Tooltips work on hover
  
  - [ ] **Weather Integration**
    - [ ] Current weather displays
    - [ ] Temperature unit toggle
    - [ ] Weather forecast shows
  
  - [ ] **Health Recommendations**
    - [ ] Recommendations match AQI
    - [ ] Activity suggestions appropriate
    - [ ] Risk groups identified
  
  - [ ] **Location Management**
    - [ ] Location search works
    - [ ] Map markers display
    - [ ] Location switching works
  
  - [ ] **Device Management**
    - [ ] Device list displays
    - [ ] Device details load
    - [ ] Device switching works
  
  - [ ] **Alerts**
    - [ ] Alert creation works
    - [ ] Notifications trigger
    - [ ] Alert management functional
  
  - [ ] **Historical Data**
    - [ ] Historical charts load
    - [ ] Date range selection works
    - [ ] Data export functions
  
  - [ ] **Dark Mode**
    - [ ] Theme toggle works
    - [ ] Colors appropriate in dark mode
    - [ ] Preference persists
    - [ ] System preference respected
  
  - [ ] **PWA Features**
    - [ ] Install prompt shows
    - [ ] Service worker registers
    - [ ] Offline mode works
    - [ ] Push notifications work

- [ ] **Test on multiple devices**
  - [ ] Desktop (Chrome, Firefox, Safari, Edge)
  - [ ] Tablet (iPad, Android tablet)
  - [ ] Mobile (iOS, Android)
  - [ ] Different screen sizes (320px to 2560px)

- [ ] **Test responsive design**
  - [ ] Mobile layout correct
  - [ ] Tablet layout correct
  - [ ] Desktop layout correct
  - [ ] Touch interactions work
  - [ ] Keyboard navigation works

- [ ] **Accessibility testing**
  ```bash
  npm run test:a11y -- --url https://staging.example.com
  ```
  - [ ] No axe violations
  - [ ] Keyboard navigation works
  - [ ] Screen reader compatible
  - [ ] Color contrast compliant
  - [ ] Focus indicators visible

- [ ] **Performance testing**
  ```bash
  npm run lighthouse -- --url https://staging.example.com
  ```
  - [ ] Lighthouse scores meet targets
  - [ ] Core Web Vitals pass
  - [ ] No performance regressions

- [ ] **Security testing**
  - [ ] HTTPS enforced
  - [ ] Security headers present
  - [ ] XSS protection enabled
  - [ ] CSRF protection works
  - [ ] No exposed secrets

- [ ] **Load testing** (if applicable)
  - [ ] Site handles expected load
  - [ ] No memory leaks
  - [ ] Response times acceptable

### Staging Sign-off

- [ ] **Stakeholder approval**
  - [ ] Product owner reviewed
  - [ ] QA team approved
  - [ ] Tech lead signed off
  - [ ] Known issues documented

---

## Production Deployment

### Pre-Production Checks

- [ ] **Final verification**
  - [ ] All staging tests passed
  - [ ] No critical bugs
  - [ ] Stakeholder approval received
  - [ ] Deployment window scheduled

- [ ] **Create backup**
  - [ ] Database backup (if applicable)
  - [ ] Configuration backup
  - [ ] Previous deployment assets saved
  - [ ] Rollback plan documented

- [ ] **Communication**
  - [ ] Deployment scheduled with team
  - [ ] Maintenance window communicated (if needed)
  - [ ] Stakeholders notified
  - [ ] On-call engineer assigned

- [ ] **Merge to main**
  ```bash
  git checkout main
  git merge release/v<version>
  git push origin main
  git tag -a v<version> -m "Release v<version>"
  git push origin v<version>
  ```

### Deploy to Production

- [ ] **Trigger production deployment**
  ```bash
  # Via GitHub Actions (with approval)
  git push origin main
  
  # Or manual deployment
  npm run deploy:production
  ```

- [ ] **Monitor deployment**
  - [ ] Deployment started
  - [ ] Build logs reviewed
  - [ ] Deployment completed
  - [ ] Production URL accessible

### Production Verification

- [ ] **Immediate checks** (within 5 minutes)
  - [ ] Site is accessible
  - [ ] Home page loads
  - [ ] No JavaScript errors in console
  - [ ] API connectivity works
  - [ ] Authentication works

- [ ] **Critical path testing** (within 15 minutes)
  ```bash
  npm run test:smoke -- --env production
  ```
  - [ ] User can view AQI data
  - [ ] User can search locations
  - [ ] User can view forecasts
  - [ ] User can view historical data
  - [ ] Alerts work correctly

- [ ] **Performance verification**
  - [ ] Page load times acceptable
  - [ ] API response times normal
  - [ ] No 500 errors
  - [ ] No client-side errors

- [ ] **Feature verification**
  - [ ] All major features working
  - [ ] Data displaying correctly
  - [ ] Real-time updates functioning
  - [ ] PWA features work

### Production Sign-off

- [ ] **Verify all features work**
  - [ ] Core functionality verified
  - [ ] Edge cases tested
  - [ ] No regression bugs

- [ ] **Update documentation**
  - [ ] Deployment notes recorded
  - [ ] Known issues documented
  - [ ] Support team notified

- [ ] **Close deployment**
  - [ ] Deployment success confirmed
  - [ ] Team notified
  - [ ] Maintenance window closed (if applicable)

---

## Post-Deployment

### Monitoring (First 24 hours)

- [ ] **Monitor error rates**
  - [ ] Check error tracking (Sentry/etc)
    - [ ] Error rate < 0.1%
    - [ ] No critical errors
    - [ ] No new error patterns
  - [ ] Review browser console errors
  - [ ] Check API error logs

- [ ] **Monitor performance**
  - [ ] Check Core Web Vitals
    - [ ] LCP < 2.5s
    - [ ] FID < 100ms
    - [ ] CLS < 0.1
  - [ ] Monitor API response times
  - [ ] Check server resource usage
  - [ ] Review CDN performance

- [ ] **Monitor business metrics**
  - [ ] Page views normal
  - [ ] User engagement stable
  - [ ] Conversion rates stable
  - [ ] No user complaints

- [ ] **Check analytics**
  - [ ] Traffic patterns normal
  - [ ] User behavior expected
  - [ ] No unusual bounce rates
  - [ ] Device distribution normal

### Collect Feedback

- [ ] **User feedback**
  - [ ] Monitor support tickets
  - [ ] Review user comments
  - [ ] Check social media mentions
  - [ ] Survey key users (if applicable)

- [ ] **Internal feedback**
  - [ ] Team retrospective
  - [ ] Document lessons learned
  - [ ] Identify improvements
  - [ ] Update runbook

### Plan Next Iteration

- [ ] **Post-mortem** (if issues occurred)
  - [ ] Document what happened
  - [ ] Identify root causes
  - [ ] Create action items
  - [ ] Update procedures

- [ ] **Continuous improvement**
  - [ ] Review deployment process
  - [ ] Identify bottlenecks
  - [ ] Update automation
  - [ ] Enhance monitoring

---

## Rollback Procedures

### When to Rollback

Rollback immediately if:
- Critical features are broken
- Site is inaccessible
- Data corruption detected
- Security vulnerability exposed
- Error rate > 5%
- Performance degraded > 50%

### Rollback Process

1. **Initiate rollback**
   ```bash
   # Via Vercel
   vercel rollback <deployment-url>
   
   # Or via GitHub Actions
   # Trigger rollback workflow
   ```

2. **Verify rollback**
   - [ ] Previous version deployed
   - [ ] Site is accessible
   - [ ] Core features working
   - [ ] Error rates normal

3. **Communicate rollback**
   - [ ] Notify team
   - [ ] Update status page
   - [ ] Inform stakeholders
   - [ ] Document reason

4. **Post-rollback**
   - [ ] Investigate root cause
   - [ ] Fix issues in staging
   - [ ] Re-test thoroughly
   - [ ] Plan redeployment

---

## Verification Scripts

### Script Locations

All deployment scripts are located in `dashboard/scripts/`:

- `verify-env.js` - Verify environment variables
- `pre-deployment-check.js` - Pre-deployment verification
- `smoke-test.js` - Post-deployment smoke tests
- `health-check.js` - System health verification
- `performance-check.js` - Performance metrics check

### Usage

```bash
# Pre-deployment verification
npm run check:deployment

# Environment verification
npm run check:env -- staging
npm run check:env -- production

# Smoke tests
npm run test:smoke -- --env staging
npm run test:smoke -- --env production

# Health check
npm run check:health -- --url https://staging.example.com

# Performance check
npm run check:performance -- --url https://example.com
```

---

## Deployment Commands Quick Reference

```bash
# Install dependencies
npm ci

# Run all tests
npm test

# Build for production
npm run build

# Deploy to staging
npm run deploy:staging

# Deploy to production
npm run deploy:production

# Run smoke tests
npm run test:smoke

# Check deployment health
npm run check:health

# Rollback (Vercel)
vercel rollback <url>
```

---

## Success Criteria Summary

### Functionality ✅
- All 46 correctness properties pass
- All critical user flows work
- Real-time data displays correctly
- Forecasts are accurate
- Alerts trigger correctly
- Offline mode works

### Performance ✅
- Lighthouse Desktop ≥90
- Lighthouse Mobile ≥80
- Initial load <2s
- API responses <500ms
- Animations ≥60fps

### Accessibility ✅
- WCAG AA compliance
- Zero axe violations
- Keyboard navigation works
- Screen reader compatible
- Color contrast compliant

### Quality ✅
- 80%+ code coverage
- All tests passing
- No critical bugs
- Documentation complete
- Code reviewed

### User Experience ✅
- Intuitive navigation
- Fast and responsive
- Works on all devices
- Works offline
- Visually appealing

---

## Contacts

- **Tech Lead**: [Name] - [Email]
- **DevOps**: [Name] - [Email]
- **Product Owner**: [Name] - [Email]
- **On-Call Engineer**: [Rotation Link]

---

## Additional Resources

- [CI/CD Pipeline Guide](./CI_CD_PIPELINE_GUIDE.md)
- [Environment Setup Guide](./ENV_SETUP_GUIDE.md)
- [Testing Checklist](./TESTING_CHECKLIST_IMPLEMENTATION.md)
- [Performance Optimization](../PERFORMANCE_OPTIMIZATION_SUMMARY.md)
- [Main Deployment Guide](../DEPLOYMENT_GUIDE.md)

---

**Last Updated**: 2026-02-16  
**Version**: 1.0.0  
**Owner**: DevOps Team
