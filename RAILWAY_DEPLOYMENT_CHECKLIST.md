# Railway Deployment Checklist

Use this checklist to ensure you've completed all steps for deploying Kitabu Connect to Railway.

## Pre-Deployment

- [ ] All code changes committed and pushed to GitHub
- [ ] `.env` file is NOT committed (should be in `.gitignore`)
- [ ] Build script works locally: `npm run build`
- [ ] Start script works locally: `npm run start`
- [ ] All required configuration files exist:
  - [ ] `railway.json`
  - [ ] `nixpacks.toml`
  - [ ] `Procfile`
  - [ ] `.railwayignore`

## Third-Party Services Setup

- [ ] Cloudinary account created and verified
  - [ ] Cloud Name obtained
  - [ ] API Key obtained
  - [ ] API Secret obtained

- [ ] Paystack account created and verified
  - [ ] Secret Key obtained (test or live)
  - [ ] Public Key obtained (test or live)

- [ ] Twilio account created (optional but recommended)
  - [ ] Account SID obtained
  - [ ] Auth Token obtained
  - [ ] Phone Number provisioned

- [ ] JWT Secret generated (strong random 64+ character string)

## Railway Setup

- [ ] Railway account created at https://railway.app
- [ ] New project created in Railway
- [ ] GitHub repository connected to Railway
- [ ] MySQL database added to project
- [ ] Database provisioned successfully (check status)

## Environment Variables

Add these in Railway Dashboard → Variables tab:

### Required
- [ ] `NODE_ENV=production`
- [ ] `PORT=5000`
- [ ] `DATABASE_URL` (auto-set by Railway MySQL)
- [ ] `JWT_SECRET`
- [ ] `CLOUDINARY_CLOUD_NAME`
- [ ] `CLOUDINARY_API_KEY`
- [ ] `CLOUDINARY_API_SECRET`
- [ ] `PAYSTACK_SECRET_KEY`
- [ ] `PAYSTACK_PUBLIC_KEY`
- [ ] `FRONTEND_URL`

### Optional
- [ ] `TWILIO_ACCOUNT_SID`
- [ ] `TWILIO_AUTH_TOKEN`
- [ ] `TWILIO_PHONE_NUMBER`
- [ ] `VITE_PUBLIC_POSTHOG_KEY`
- [ ] `VITE_PUBLIC_POSTHOG_HOST`

## Deployment

- [ ] Initial deployment triggered automatically
- [ ] Deployment succeeded (check Deployments tab)
- [ ] Generated Railway domain
- [ ] Updated `FRONTEND_URL` with Railway domain
- [ ] Re-deployed after updating `FRONTEND_URL`

## Database Setup

- [ ] Database migrations run: `railway run npm run db:push`
- [ ] Initial data seeded (optional): `railway run npm run db:seed`
- [ ] Database connection verified in logs

## Third-Party Service Configuration

### Cloudinary
- [ ] Dashboard verified at https://cloudinary.com/console
- [ ] Test image upload works from deployed app

### Paystack
- [ ] Webhook URL configured: `https://your-url.up.railway.app/api/webhooks/paystack`
- [ ] Callback URL configured: `https://your-url.up.railway.app/dashboard`
- [ ] Test payment made successfully (use test card if in test mode)

### Twilio (if using)
- [ ] Phone number verified
- [ ] Account has sufficient balance
- [ ] Test SMS sent successfully

## Verification

- [ ] Health endpoint accessible: `https://your-url.up.railway.app/api/health`
- [ ] Homepage loads: `https://your-url.up.railway.app`
- [ ] User registration works (OTP sent and verified)
- [ ] Login/logout works
- [ ] Book browsing works
- [ ] Book listing creation works
- [ ] Image upload works
- [ ] Payment flow works (end-to-end test)
- [ ] All API endpoints respond correctly

## Monitoring Setup

- [ ] Railway logs accessible and monitoring
- [ ] Deployment notifications enabled
- [ ] Resource usage metrics reviewed
- [ ] PostHog analytics configured (if using)

## Optional Enhancements

- [ ] Custom domain configured
- [ ] DNS records added
- [ ] SSL certificate verified (auto with Railway)
- [ ] `FRONTEND_URL` updated to custom domain
- [ ] Paystack URLs updated to custom domain

## Security Verification

- [ ] All secrets are set as environment variables (not hardcoded)
- [ ] `.env` files not committed to git
- [ ] HTTPS enabled (Railway does this automatically)
- [ ] Database only accessible from Railway network
- [ ] Strong JWT secret in use (64+ characters)
- [ ] Correct Paystack keys for environment (test/live)

## Performance

- [ ] Build time is reasonable (< 5 minutes)
- [ ] App startup time is acceptable (< 30 seconds)
- [ ] API response times are good (< 500ms for most endpoints)
- [ ] Database query performance is acceptable
- [ ] Image loading is optimized

## Documentation

- [ ] Environment variables documented
- [ ] Deployment process documented
- [ ] Team members have access to Railway project
- [ ] Credentials securely shared with team (use password manager)

## Post-Deployment

- [ ] Tested all critical user flows
- [ ] Monitored logs for errors in first 24 hours
- [ ] Set up backup/recovery strategy
- [ ] Documented any deployment issues encountered
- [ ] Shared deployment URL with team/stakeholders

---

## Quick Commands Reference

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Link to project
railway link

# Run migrations
railway run npm run db:push

# Seed database
railway run npm run db:seed

# View logs
railway logs

# Open Railway dashboard
railway open

# Run a command in Railway environment
railway run <command>
```

---

**Status:** ⬜ Not Started | ⏳ In Progress | ✅ Complete

**Deployment Date:** _______________

**Deployed By:** _______________

**Railway Project URL:** _______________

**Live App URL:** _______________
