# CI/CD Pipeline Setup Guide

## Quick Setup (5 minutes)

This guide will help you set up the CI/CD pipeline for the AQI Dashboard.

## Prerequisites

- GitHub repository with admin access
- Vercel account (free tier is fine)
- (Optional) Codecov account for coverage tracking
- (Optional) Snyk account for security scanning

## Step 1: Configure GitHub Secrets

Navigate to your repository settings: `Settings > Secrets and variables > Actions`

### Required Secrets

Click "New repository secret" and add:

1. **VERCEL_TOKEN**
   - Get from: https://vercel.com/account/tokens
   - Click "Create Token"
   - Copy and save

2. **VERCEL_ORG_ID**
   - Get from: https://vercel.com/[your-team]/settings
   - Copy "Team ID"

3. **VERCEL_PROJECT_ID**
   - Import your project to Vercel first
   - Get from project settings
   - Copy "Project ID"

### Optional Secrets

4. **CODECOV_TOKEN** (for coverage tracking)
   - Get from: https://codecov.io/
   - Add repository and get token

5. **SNYK_TOKEN** (for security scanning)
   - Get from: https://snyk.io/
   - Navigate to Account Settings > API Token

6. **LHCI_GITHUB_APP_TOKEN** (for Lighthouse CI GitHub App)
   - Install: https://github.com/apps/lighthouse-ci
   - Get token from app settings

7. **SLACK_WEBHOOK** (for notifications)
   - Create incoming webhook in Slack
   - Copy webhook URL

## Step 2: Configure GitHub Environments

Navigate to: `Settings > Environments`

### Create Staging Environment

1. Click "New environment"
2. Name: `staging`
3. Add deployment branch rule:
   - Pattern type: "Protected branches" or "Selected branches"
   - Add: `develop`, `staging`
4. Environment URL: `https://staging.aqi-dashboard.example.com`
5. Click "Save protection rules"

### Create Production Environment

1. Click "New environment"
2. Name: `production`
3. Check "Required reviewers"
   - Add at least 1 reviewer
4. Add deployment branch rule:
   - Pattern type: "Protected branches" or "Selected branches"
   - Add: `main`
5. Environment URL: `https://aqi-dashboard.example.com`
6. Click "Save protection rules"

## Step 3: Deploy to Vercel

### First-time Setup

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Link project
cd dashboard
vercel link

# Deploy staging
vercel deploy

# Deploy production
vercel deploy --prod
```

### Configure Vercel Project

1. Go to Vercel dashboard
2. Select your project
3. Go to Settings > Environment Variables
4. Add:
   - `NEXT_PUBLIC_API_BASE_URL`: Your API URL
   - `NEXT_PUBLIC_APP_VERSION`: `1.0.0`
5. Set different values for Preview, Development, Production

## Step 4: Test the Pipeline

### Test Locally First

```bash
cd dashboard

# Run pre-flight check
npm run ci:preflight
```

This should pass all checks.

### Test on GitHub

1. Create a new branch:
   ```bash
   git checkout -b test/ci-pipeline
   ```

2. Make a small change (e.g., update README)

3. Commit and push:
   ```bash
   git add .
   git commit -m "test: verify CI pipeline"
   git push origin test/ci-pipeline
   ```

4. Go to GitHub Actions tab - you should see the workflow running

5. Create a PR to `develop` branch

6. Verify all checks pass

## Step 5: Verify Deployment

### Staging Deployment

1. Merge PR to `develop` branch
2. Check Actions tab - should see deployment job
3. Once complete, visit staging URL
4. Verify dashboard loads correctly

### Production Deployment

1. Merge `develop` to `main` (or create PR)
2. Check Actions tab - should see all checks running
3. Once complete, manual approval dialog appears
4. Review and approve deployment
5. Once deployed, visit production URL
6. Verify dashboard loads correctly

## Troubleshooting

### Workflow Not Triggering

**Problem:** Workflow doesn't run on push  
**Solution:** 
- Check file paths in `on.push.paths`
- Ensure changes are in `dashboard/` directory
- Check branch names match workflow configuration

### Secrets Not Found

**Problem:** `Error: Input required and not supplied: ...`  
**Solution:**
- Double-check secret names match exactly (case-sensitive)
- Verify secrets are set at repository level, not environment level (for most secrets)
- Re-enter secrets to ensure no extra spaces

### Build Fails

**Problem:** Build job fails  
**Solution:**
```bash
# Test build locally
cd dashboard
npm ci
npm run build

# Check for TypeScript errors
npx tsc --noEmit

# Check for linting errors
npm run lint
```

### E2E Tests Timeout

**Problem:** Playwright tests timeout  
**Solution:**
- Check if server is starting correctly
- Review workflow logs for server startup
- Increase timeout in `playwright.config.ts` if needed

### Lighthouse Fails

**Problem:** Performance score below threshold  
**Solution:**
```bash
# Run Lighthouse locally
npm run build
npm run start &
npx @lhci/cli@0.13.x autorun

# Review detailed report
# Optimize as needed
```

### Deployment Fails

**Problem:** Deployment to Vercel fails  
**Solution:**
- Verify Vercel tokens are correct
- Check Vercel project is linked
- Ensure build artifacts exist
- Review Vercel logs in dashboard

## Verification Checklist

After setup, verify:

- [ ] GitHub secrets configured
- [ ] GitHub environments created
- [ ] Vercel project linked
- [ ] Staging deployment works
- [ ] Production requires approval
- [ ] All tests pass in CI
- [ ] Lighthouse scores meet thresholds
- [ ] Visual regression tests work
- [ ] Notifications work (if configured)

## Next Steps

Once setup is complete:

1. **Document your specific URLs**
   - Update URLs in workflow and documentation
   - Update environment-specific settings

2. **Customize performance budgets**
   - Review thresholds in `lighthouserc.js`
   - Adjust based on your requirements

3. **Set up monitoring**
   - Configure error tracking (Sentry, etc.)
   - Set up performance monitoring
   - Enable uptime monitoring

4. **Create runbooks**
   - Document deployment procedures
   - Create rollback procedures
   - Document incident response

## Maintenance

### Weekly

- [ ] Review failed builds
- [ ] Check for dependency updates
- [ ] Review performance trends

### Monthly

- [ ] Update dependencies
- [ ] Review and adjust budgets
- [ ] Archive old artifacts

### Quarterly

- [ ] Audit secrets and tokens
- [ ] Review workflow efficiency
- [ ] Update documentation

## Resources

- **Full Documentation:** [CI_CD_PIPELINE_GUIDE.md](./CI_CD_PIPELINE_GUIDE.md)
- **Quick Reference:** [CI_CD_QUICK_REFERENCE.md](./CI_CD_QUICK_REFERENCE.md)
- **Completion Summary:** [TASK_29_COMPLETION_SUMMARY.md](./TASK_29_COMPLETION_SUMMARY.md)
- **GitHub Actions Docs:** https://docs.github.com/actions
- **Vercel Docs:** https://vercel.com/docs
- **Lighthouse CI:** https://github.com/GoogleChrome/lighthouse-ci

## Support

If you encounter issues:

1. Check this setup guide
2. Review CI_CD_PIPELINE_GUIDE.md
3. Check workflow logs on GitHub
4. Review Vercel deployment logs
5. Create an issue with details

---

**Ready to ship! 🚀**
