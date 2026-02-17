# Deployment Scripts

This directory contains scripts for deployment automation, verification, and monitoring.

## 📁 Scripts Overview

### Deployment Scripts

#### `pre-deployment-check.js`
**Purpose:** Runs comprehensive checks before deployment  
**Usage:** 
```bash
node scripts/pre-deployment-check.js [staging|production]
npm run check:deployment:staging
npm run check:deployment:production
```

**Checks:**
- Required files exist
- Environment variables configured
- Code quality (TypeScript, ESLint)
- All tests passing
- Dependencies up to date
- Security audit
- Production build succeeds

**Exit Codes:**
- `0` - All checks passed
- `1` - One or more checks failed

---

#### `deploy-staging.js`
**Purpose:** Automates staging deployment with verification  
**Usage:**
```bash
node scripts/deploy-staging.js [--skip-checks] [--yes]
npm run deploy:staging
```

**Options:**
- `--skip-checks` - Skip pre-deployment checks (not recommended)
- `--yes` - Auto-confirm deployment (for CI/CD)

**Process:**
1. Confirm deployment
2. Run pre-deployment checks
3. Build application
4. Deploy to Vercel staging
5. Run smoke tests
6. Display summary

**Exit Codes:**
- `0` - Deployment successful
- `1` - Deployment failed

---

#### `deploy-production.js`
**Purpose:** Automates production deployment with safety checks  
**Usage:**
```bash
node scripts/deploy-production.js [--skip-checks] [--yes]
npm run deploy:production
```

**Options:**
- `--skip-checks` - Skip pre-deployment checks (NOT RECOMMENDED)
- `--yes` - Auto-confirm deployment (use with caution)

**Process:**
1. Confirm deployment (double confirmation)
2. Run pre-deployment checks
3. Create backup
4. Build application
5. Deploy to Vercel production
6. Run smoke tests
7. Verify deployment manually
8. Display summary

**Exit Codes:**
- `0` - Deployment successful
- `1` - Deployment failed or not verified

**Safety Features:**
- Double confirmation required
- Backup creation
- Comprehensive verification
- Manual verification step

---

### Verification Scripts

#### `smoke-test.js`
**Purpose:** Runs critical smoke tests after deployment  
**Usage:**
```bash
node scripts/smoke-test.js [staging|production]
npm run test:smoke:staging
npm run test:smoke:production
```

**Tests:**
- Home page loads (200 OK)
- Valid HTML content
- Required meta tags present
- API connectivity
- Static assets load
- Security headers present
- HTTPS enabled
- Response time acceptable (<2s)

**Exit Codes:**
- `0` - All tests passed or passed with warnings
- `1` - One or more tests failed

---

#### `post-deployment-monitor.js`
**Purpose:** Monitors deployment health in real-time  
**Usage:**
```bash
node scripts/post-deployment-monitor.js [staging|production] [--duration 60]
npm run monitor:staging
npm run monitor:production
npm run monitor:production:long
```

**Options:**
- `--duration` - Monitoring duration in seconds (default: 60)

**Monitors:**
- Site availability
- Response times (min, max, avg, p50, p95, p99)
- HTTP status codes
- Error rates
- Success rate

**Displays:**
- Real-time health status
- Response time per check
- Success/failure counts
- Final statistics and summary

**Exit Codes:**
- `0` - No issues detected (success rate ≥99%)
- `1` - Issues detected (success rate <99%)

---

## 🚀 Common Workflows

### Deploy to Staging

```bash
# Full deployment with all checks
npm run deploy:staging

# Or step by step:
npm run check:deployment:staging
npm run build
vercel deploy --yes
npm run test:smoke:staging
npm run monitor:staging
```

### Deploy to Production

```bash
# Full deployment with all checks
npm run deploy:production

# Or step by step:
npm run check:deployment:production
mkdir -p backups
npm run build
vercel deploy --prod --yes
npm run test:smoke:production
npm run monitor:production:long
```

### Pre-Deployment Verification

```bash
# Check staging readiness
npm run check:deployment:staging

# Check production readiness
npm run check:deployment:production
```

### Post-Deployment Testing

```bash
# Run smoke tests
npm run test:smoke:staging
npm run test:smoke:production

# Monitor deployment
npm run monitor:staging
npm run monitor:production

# Extended monitoring (5 minutes)
npm run monitor:production:long

# Custom duration monitoring
node scripts/post-deployment-monitor.js production --duration 300
```

## 🔧 Configuration

### Environment Variables

Scripts use these environment variables:

**URLs:**
```bash
STAGING_URL=https://staging.aqi-dashboard.example.com
PRODUCTION_URL=https://aqi-dashboard.example.com
NEXT_PUBLIC_API_BASE_URL_STAGING=https://staging-api.example.com
NEXT_PUBLIC_API_BASE_URL_PROD=https://api.example.com
```

**Vercel:**
```bash
VERCEL_TOKEN=your_token
VERCEL_ORG_ID=your_org_id
VERCEL_PROJECT_ID=your_project_id
```

### Customization

**Modify check parameters:**
- Edit `pre-deployment-check.js` to add/remove checks
- Adjust timeout values in deployment scripts
- Configure smoke test endpoints in `smoke-test.js`
- Set monitoring intervals in `post-deployment-monitor.js`

## 📊 Exit Codes

All scripts follow a consistent exit code pattern:

| Code | Meaning |
|------|---------|
| `0`  | Success (may have warnings) |
| `1`  | Failure or critical issues |

## 🐛 Troubleshooting

### Pre-Deployment Check Fails

**Issue:** TypeScript errors  
**Solution:** Run `npx tsc --noEmit` and fix errors

**Issue:** Tests failing  
**Solution:** Run `npm test` and fix failing tests

**Issue:** Build fails  
**Solution:** Check build logs, verify environment variables

### Deployment Fails

**Issue:** Vercel authentication error  
**Solution:** Verify `VERCEL_TOKEN` is set correctly

**Issue:** Build timeout  
**Solution:** Increase timeout in deployment script

**Issue:** Deployment hangs  
**Solution:** Check Vercel status, try manual deployment

### Smoke Tests Fail

**Issue:** Site not accessible  
**Solution:** Wait longer for deployment, check DNS

**Issue:** API connectivity fails  
**Solution:** Verify API URL, check API health

**Issue:** Timeout errors  
**Solution:** Network issues, try again after a few minutes

### Monitoring Issues

**Issue:** High error rate  
**Solution:** Check logs, investigate errors, consider rollback

**Issue:** Slow response times  
**Solution:** Check server resources, investigate performance

**Issue:** Connection errors  
**Solution:** Network issues, check site accessibility

## 🔐 Security

**Sensitive Information:**
- Never commit API keys or tokens
- Use environment variables for secrets
- Store sensitive data in CI/CD secrets
- Review logs before sharing

**Access Control:**
- Limit who can run production deployments
- Use GitHub environment protection rules
- Require approvals for production
- Audit deployment logs

## 📚 Additional Resources

- [Deployment Checklist](../DEPLOYMENT_CHECKLIST.md) - Complete deployment guide
- [Deployment Quick Reference](../DEPLOYMENT_QUICK_REFERENCE.md) - Quick commands
- [CI/CD Pipeline Guide](../CI_CD_PIPELINE_GUIDE.md) - GitHub Actions workflow
- [Environment Setup Guide](../ENV_SETUP_GUIDE.md) - Environment configuration

## 🤝 Contributing

When adding new scripts:

1. Follow existing naming conventions
2. Include comprehensive error handling
3. Use consistent exit codes
4. Add clear usage documentation
5. Include examples in this README
6. Test thoroughly before committing

## 📞 Support

**Issues with scripts:**
- Check script output for error messages
- Review logs in detail
- Consult the troubleshooting section
- Contact DevOps team if needed

**Questions:**
- Review documentation first
- Check GitHub Actions logs
- Ask in team chat
- Create an issue if bug found

---

**Last Updated:** 2026-02-16  
**Maintained by:** DevOps Team
