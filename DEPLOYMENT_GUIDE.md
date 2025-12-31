# Kitabu Connect - Railway Deployment Guide

This guide will walk you through deploying Kitabu Connect to Railway step-by-step.

## Prerequisites

Before you begin, ensure you have:
- A GitHub account with your Kitabu Connect repository
- A Railway account (sign up at https://railway.app)
- All required third-party service accounts set up:
  - Cloudinary (for image uploads)
  - Paystack (for payments)
  - Twilio (for SMS/OTP) - Optional but recommended

## Step 1: Prepare Your Repository

1. **Commit all changes** to your repository:
   ```bash
   git add .
   git commit -m "Prepare for Railway deployment"
   git push origin main
   ```

2. **Verify these files exist** in your repository:
   - `railway.json` ✅
   - `nixpacks.toml` ✅
   - `Procfile` ✅
   - `.railwayignore` ✅
   - `package.json` with build script ✅

## Step 2: Create a Railway Project

1. Go to https://railway.app and sign in
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Authorize Railway to access your GitHub account
5. Select your **Kitabu Connect** repository
6. Railway will automatically detect your configuration

## Step 3: Add MySQL Database

1. In your Railway project, click **"New"** → **"Database"** → **"Add MySQL"**
2. Railway will:
   - Provision a MySQL database
   - Auto-generate connection credentials
   - Set `DATABASE_URL` environment variable automatically
3. Wait for the database to be provisioned (takes ~30 seconds)

## Step 4: Configure Environment Variables

1. Click on your **web service** (not the database)
2. Go to the **"Variables"** tab
3. Click **"New Variable"** and add each variable below:

### Required Variables:

```bash
NODE_ENV=production
PORT=5000
JWT_SECRET=<generate-a-strong-random-secret>
CLOUDINARY_CLOUD_NAME=<your-cloudinary-cloud-name>
CLOUDINARY_API_KEY=<your-cloudinary-api-key>
CLOUDINARY_API_SECRET=<your-cloudinary-api-secret>
PAYSTACK_SECRET_KEY=<your-paystack-secret-key>
PAYSTACK_PUBLIC_KEY=<your-paystack-public-key>
FRONTEND_URL=<will-be-your-railway-url>
```

### Optional but Recommended:

```bash
TWILIO_ACCOUNT_SID=<your-twilio-sid>
TWILIO_AUTH_TOKEN=<your-twilio-token>
TWILIO_PHONE_NUMBER=<your-twilio-number>
VITE_PUBLIC_POSTHOG_KEY=<your-posthog-key>
VITE_PUBLIC_POSTHOG_HOST=https://app.posthog.com
```

**Note:** The `DATABASE_URL` variable is automatically set by Railway when you add the MySQL database.

### How to Generate JWT_SECRET:

**On Linux/Mac:**
```bash
openssl rand -base64 64
```

**On Windows PowerShell:**
```powershell
[Convert]::ToBase64String((1..64 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))
```

4. After adding all variables, Railway will automatically trigger a deployment

## Step 5: Get Your Deployment URL

1. Go to the **"Settings"** tab
2. Scroll to **"Domains"**
3. Click **"Generate Domain"**
4. Copy the generated URL (e.g., `https://kitabu-connect-production.up.railway.app`)
5. Go back to **"Variables"** tab
6. Update the `FRONTEND_URL` variable with your Railway URL
7. Save the change (this will trigger a redeploy)

## Step 6: Run Database Migrations

After the first deployment completes:

### Option 1: Via Railway Dashboard (Recommended)

1. Go to your web service in Railway
2. Click the **"..."** menu → **"View Logs"**
3. Click **"Deployments"** tab
4. Find the latest successful deployment
5. Click **"..."** → **"Deploy Shell"**
6. In the shell, run:
   ```bash
   npm run db:push
   ```
7. Wait for migrations to complete

### Option 2: Via Railway CLI

1. Install Railway CLI:
   ```bash
   npm install -g @railway/cli
   ```

2. Login and link to your project:
   ```bash
   railway login
   railway link
   ```

3. Run migrations:
   ```bash
   railway run npm run db:push
   ```

## Step 7: Seed Initial Data (Optional)

If you want to seed your database with initial data:

```bash
railway run npm run db:seed
```

## Step 8: Configure Third-Party Services

### Cloudinary Setup
1. Go to https://cloudinary.com/console
2. Verify your account settings
3. Test by uploading an image through your deployed app

### Paystack Setup
1. Go to https://dashboard.paystack.com
2. Navigate to **Settings** → **API Keys & Webhooks**
3. Set your webhook URL to:
   ```
   https://your-railway-url.up.railway.app/api/webhooks/paystack
   ```
4. Set your callback URL to:
   ```
   https://your-railway-url.up.railway.app/dashboard
   ```
5. Save changes

### Twilio Setup (if using)
1. Go to https://console.twilio.com
2. Verify your phone number is configured
3. Ensure account has sufficient balance
4. Test by sending an OTP from your app

## Step 9: Verify Deployment

1. **Check Health Endpoint:**
   Visit: `https://your-railway-url.up.railway.app/api/health`

   Should return:
   ```json
   {
     "status": "ok",
     "timestamp": "2024-01-XX...",
     "uptime": 123.45
   }
   ```

2. **Check Application:**
   Visit: `https://your-railway-url.up.railway.app`

   You should see your app's homepage

3. **Test Core Features:**
   - [ ] User registration with OTP
   - [ ] Login/logout
   - [ ] Browse books
   - [ ] Upload a book listing with images
   - [ ] Make a test payment (use Paystack test card)
   - [ ] Check that images are uploading to Cloudinary

## Step 10: Set Up Custom Domain (Optional)

1. Purchase a domain (e.g., from Namecheap, Google Domains)
2. In Railway:
   - Go to **Settings** → **Domains**
   - Click **"Custom Domain"**
   - Enter your domain (e.g., `kitabuconnect.com`)
3. Add DNS records as instructed by Railway
4. Wait for DNS propagation (5-60 minutes)
5. Update `FRONTEND_URL` and Paystack webhook URLs to use your custom domain

## Step 11: Monitor Your Deployment

### View Logs
1. Go to your service in Railway
2. Click **"Deployments"** tab
3. View real-time logs to monitor requests and errors

### Set Up Alerts (Recommended)
1. Go to **Settings** → **Notifications**
2. Configure alerts for:
   - Deployment failures
   - High memory usage
   - High CPU usage
   - Crash alerts

## Troubleshooting

### Deployment Fails
**Check the build logs:**
1. Go to **Deployments** tab
2. Click on the failed deployment
3. Read the error messages
4. Common issues:
   - Missing environment variables
   - Build script errors
   - Database connection issues

### Database Connection Errors
**Verify:**
- DATABASE_URL is set correctly
- MySQL service is running in Railway
- Migrations have been run

### Images Not Uploading
**Check:**
- Cloudinary credentials are correct
- Cloudinary account is not over quota
- Check Railway logs for upload errors

### Payments Not Working
**Verify:**
- Paystack keys are for the correct environment (test vs live)
- Webhook URL is configured in Paystack dashboard
- FRONTEND_URL matches your actual Railway URL
- Check Paystack dashboard for webhook delivery logs

### App is Slow or Unresponsive
**Check:**
- Railway metrics for CPU/memory usage
- Database query performance in logs
- Consider upgrading Railway plan if needed

### SMS/OTP Not Sending
**Verify:**
- Twilio credentials are correct
- Twilio account has balance
- Phone numbers are verified in Twilio
- Check Twilio logs for delivery status

## Updating Your Deployment

Whenever you push changes to your GitHub repository:

1. **Push to GitHub:**
   ```bash
   git add .
   git commit -m "Your changes"
   git push origin main
   ```

2. **Railway Auto-Deploy:**
   - Railway automatically detects the push
   - Triggers a new build and deployment
   - Monitor progress in the Deployments tab

3. **If migrations are needed:**
   ```bash
   railway run npm run db:push
   ```

## Railway Plans and Pricing

- **Free Trial:** $5 credit (good for initial testing)
- **Hobby Plan:** $5/month base + usage
- **Pro Plan:** $20/month base + usage

**Estimated monthly cost for Kitabu Connect:**
- Small scale (< 1000 users): ~$5-15/month
- Medium scale (1000-10000 users): ~$20-50/month

Monitor your usage in Railway dashboard under **Metrics**.

## Performance Optimization Tips

1. **Enable Caching:**
   - Use Railway's built-in CDN
   - Implement Redis for session storage

2. **Optimize Database:**
   - Add indexes for frequently queried fields
   - Use connection pooling

3. **Monitor Performance:**
   - Set up PostHog analytics
   - Monitor Railway metrics dashboard
   - Use Railway's built-in APM

4. **Scale When Needed:**
   - Upgrade Railway plan if hitting limits
   - Consider horizontal scaling for high traffic

## Security Checklist

- [ ] All environment variables are set correctly
- [ ] JWT_SECRET is a strong random string
- [ ] Using HTTPS (Railway provides this automatically)
- [ ] Database is only accessible from your Railway service
- [ ] API keys are kept secret (never committed to git)
- [ ] Paystack is using correct keys (test vs live)
- [ ] CORS is properly configured
- [ ] Rate limiting is enabled (if implemented)

## Backup Strategy

1. **Database Backups:**
   Railway automatically backs up your MySQL database daily

2. **Manual Backups:**
   ```bash
   # Export database
   railway run mysqldump -u root database_name > backup.sql
   ```

3. **Environment Variables Backup:**
   Export your variables from Railway dashboard periodically

## Support and Resources

- **Railway Documentation:** https://docs.railway.app
- **Railway Discord:** https://discord.gg/railway
- **Railway Status:** https://status.railway.app
- **This Project's Issues:** [Your GitHub Issues URL]

## Success! 🎉

Your Kitabu Connect application should now be live on Railway!

Visit your app at: `https://your-railway-url.up.railway.app`

---

**Need Help?**
- Check Railway logs first
- Review this guide's troubleshooting section
- Check Railway's documentation
- Ask in Railway Discord community
