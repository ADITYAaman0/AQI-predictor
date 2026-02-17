# Deployment Quick Reference Guide

Quick reference for deploying the glassmorphic AQI dashboard.

## 🚀 Quick Commands

### Pre-Deployment
```bash
# Check if ready to deploy
npm run check:deployment:staging
npm run check:deployment:production

# Run all tests
npm test -- --coverage
npm run test:e2e
npm run test:properties
```

### Staging Deployment
```bash
# Deploy to staging (with checks)
npm run deploy:staging

# Deploy to staging (skip checks - use with caution)
npm run deploy:staging:skip-checks

# Test staging deployment
npm run test:smoke:staging

# Monitor staging
npm run monitor:staging
```

### Production Deployment
```bash
# Deploy to production (with checks)
npm run deploy:production

# Deploy to production (skip checks - NOT RECOMMENDED)
npm run deploy:production:skip-checks

# Test production deployment
npm run test:smoke:production

# Monitor production
npm run monitor:production

# Monitor production (5 minutes)
npm run monitor:production:long
```

### Rollback
```bash
# Rollback to previous deployment
vercel rollback <deployment-url>
```

## 📋 Pre-Deployment Checklist

Quick checklist before deploying:

- [ ] All tests passing
- [ ] Code reviewed and approved
- [ ] Environment variables configured
- [ ] No security vulnerabilities
- [ ] Documentation updated
- [ ] Stakeholders notified

## 🔄 Deployment Flow

### Staging Deployment Flow

1. **Merge to `develop` branch**
   ```bash
   git checkout develop
   git merge feature/your-feature
   git push origin develop
   ```

2. **GitHub Actions automatically:**
   - Runs all tests
   - Builds application
   - Runs pre-deployment checks
   - Deploys to staging
   - Runs smoke tests
   - Monitors deployment

3. **Manual verification:**
   - Test critical features
   - Check on multiple devices/browsers
   - Verify performance
   - Check for errors

### Production Deployment Flow

1. **Merge to `main` branch**
   ```bash
   git checkout main
   git merge develop
   git tag -a v1.0.0 -m "Release v1.0.0"
   git push origin main --tags
   ```

2. **GitHub Actions automatically:**
   - Runs all tests
   - Builds application
   - Runs pre-deployment checks
   - Creates backup
   - Deploys to production
   - Runs smoke tests
   - Monitors deployment
   - Notifies team

3. **Manual verification:**
   - Verify critical features work
   - Monitor error rates
   - Check performance metrics
   - Monitor user feedback

## 🔍 Verification Commands

```bash
# Check environment configuration
npm run verify:env

# Run smoke tests
npm run test:smoke:staging
npm run test:smoke:production

# Monitor deployment
npm run monitor:staging
npm run monitor:production
```

## 📊 Monitoring

### What to Monitor

**First 5 minutes:**
- Site is accessible
- No JavaScript errors
- Core features work
- API connectivity

**First hour:**
- Error rates
- Response times
- User reports
- API health

**First 24 hours:**
- Performance metrics
- Error patterns
- User engagement
- Server resources

### Monitoring Commands

```bash
# Real-time monitoring (60 seconds)
npm run monitor:production

# Extended monitoring (5 minutes)
npm run monitor:production:long

# Custom duration (10 minutes)
node scripts/post-deployment-monitor.js production --duration 600
```

## 🚨 Troubleshooting

### Deployment Failed

1. Check GitHub Actions logs
2. Review error messages
3. Verify environment variables
4. Check build logs
5. Contact DevOps if needed

### Smoke Tests Failed

1. Check deployment URL accessibility
2. Verify API connectivity
3. Review browser console errors
4. Test manually
5. Consider rollback if critical

### Performance Issues

1. Check Lighthouse scores
2. Review network requests
3. Check API response times
4. Monitor server resources
5. Investigate slow queries

## 🔙 Rollback Procedure

### When to Rollback

Rollback immediately if:
- Critical features broken
- Site inaccessible
- Data corruption detected
- Security vulnerability exposed
- Error rate > 5%
- Performance degraded > 50%

### How to Rollback

1. **Via Vercel CLI:**
   ```bash
   vercel rollback <deployment-url>
   ```

2. **Via GitHub Actions:**
   - Revert the merge commit
   - Push to trigger new deployment

3. **Verify Rollback:**
   ```bash
   npm run test:smoke:production
   npm run monitor:production
   ```

## 📞 Contacts

- **Tech Lead:** [Name] - [Email]
- **DevOps:** [Name] - [Email]
- **On-Call:** [Rotation Link]

## 📚 Resources

- [Full Deployment Checklist](./DEPLOYMENT_CHECKLIST.md)
- [CI/CD Pipeline Guide](./CI_CD_PIPELINE_GUIDE.md)
- [Environment Setup Guide](./ENV_SETUP_GUIDE.md)
- [Testing Guide](./TESTING_CHECKLIST_IMPLEMENTATION.md)

## 🎯 Success Criteria

✅ **All checks pass:**
- Build success
- All tests passing
- No security vulnerabilities
- Lighthouse scores meet targets

✅ **Deployment successful:**
- Site accessible
- No errors
- Core features work
- Performance acceptable

✅ **Post-deployment healthy:**
- Error rate < 0.1%
- Response time < 2s
- No user complaints
- Metrics stable

---

**Need help?** Check the [Full Deployment Checklist](./DEPLOYMENT_CHECKLIST.md) for detailed instructions.
