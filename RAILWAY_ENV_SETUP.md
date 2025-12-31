# Railway Environment Variables Setup Guide

This document lists all environment variables you need to configure in Railway for Kitabu Connect.

## Required Environment Variables

### 1. Server Configuration
```
NODE_ENV=production
PORT=5000
```

### 2. Database Configuration (MySQL)
Railway will auto-provide these when you add a MySQL database service:
```
DATABASE_URL=mysql://user:password@host:port/database
DB_HOST=<auto-provided-by-railway>
DB_USER=<auto-provided-by-railway>
DB_PASSWORD=<auto-provided-by-railway>
DB_NAME=<auto-provided-by-railway>
```

**Note:** Railway provides `DATABASE_URL` automatically. You can use it directly or extract individual components.

### 3. JWT Configuration
```
JWT_SECRET=<generate-a-strong-random-secret>
```

**How to generate a strong JWT secret:**
```bash
# On Linux/Mac:
openssl rand -base64 64

# On Windows PowerShell:
[Convert]::ToBase64String((1..64 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))

# Or use an online generator (ensure it's at least 32 characters)
```

### 4. Cloudinary Configuration (Image Storage)
Sign up at https://cloudinary.com (Free tier: 25GB storage, 25GB bandwidth)

```
CLOUDINARY_CLOUD_NAME=<your_cloud_name>
CLOUDINARY_API_KEY=<your_api_key>
CLOUDINARY_API_SECRET=<your_api_secret>
```

**Where to find these:**
1. Go to https://cloudinary.com/console
2. Cloud Name is displayed at the top
3. API Key and API Secret are in the "API Keys" section

### 5. Paystack Configuration (Payment Gateway)
Sign up at https://paystack.com
Get your keys from: Dashboard > Settings > API Keys & Webhooks

```
PAYSTACK_SECRET_KEY=sk_live_your_secret_key_here
PAYSTACK_PUBLIC_KEY=pk_live_your_public_key_here
```

**Important:** Use **TEST keys** for staging and **LIVE keys** for production:
- Test keys: `sk_test_...` and `pk_test_...`
- Live keys: `sk_live_...` and `pk_live_...`

### 6. Twilio Configuration (SMS/OTP) - Optional but Recommended
Sign up at https://www.twilio.com/try-twilio

```
TWILIO_ACCOUNT_SID=<your_twilio_account_sid>
TWILIO_AUTH_TOKEN=<your_twilio_auth_token>
TWILIO_PHONE_NUMBER=<your_twilio_phone_number>
```

**Where to find these:**
1. Go to https://console.twilio.com
2. Account SID and Auth Token are on the dashboard
3. Phone Number: Go to Phone Numbers > Manage > Active numbers

### 7. Frontend URL
```
FRONTEND_URL=https://your-app-name.up.railway.app
```

**Important:** This will be your Railway deployment URL. You can:
1. Use the auto-generated Railway URL (e.g., `https://kitabu-connect-production.up.railway.app`)
2. Set up a custom domain later and update this value

### 8. PostHog Analytics (Optional)
```
VITE_PUBLIC_POSTHOG_KEY=<your_posthog_project_api_key>
VITE_PUBLIC_POSTHOG_HOST=https://app.posthog.com
```

## Setting Environment Variables in Railway

### Method 1: Via Railway Dashboard (Recommended)
1. Go to your Railway project
2. Click on your service
3. Navigate to the "Variables" tab
4. Click "New Variable" for each variable
5. Enter the variable name and value
6. Click "Add" or press Enter
7. Railway will automatically redeploy your service

### Method 2: Via Railway CLI
```bash
# Install Railway CLI
npm i -g @railway/cli

# Login to Railway
railway login

# Link to your project
railway link

# Set variables one by one
railway variables set NODE_ENV=production
railway variables set JWT_SECRET=your-secret-here
# ... etc

# Or set multiple at once from a .env file
railway variables set < .env.production
```

### Method 3: Bulk Import from File
1. Create a file with your variables (one per line):
```
NODE_ENV=production
JWT_SECRET=your-secret
CLOUDINARY_CLOUD_NAME=your-cloud
```
2. In Railway Dashboard, click "Raw Editor" in the Variables tab
3. Paste all variables
4. Click "Update Variables"

## Post-Deployment Checklist

After setting all environment variables:

- [ ] Verify `FRONTEND_URL` matches your Railway deployment URL
- [ ] Confirm Cloudinary credentials work by uploading a test image
- [ ] Test Paystack integration with a test transaction
- [ ] Verify Twilio SMS by sending a test OTP
- [ ] Check database connection is working
- [ ] Run database migrations (see DEPLOYMENT_GUIDE.md)
- [ ] Test the health endpoint: `https://your-app.up.railway.app/api/health`

## Security Best Practices

1. **Never commit `.env` files** to version control
2. **Use different credentials** for staging and production
3. **Rotate secrets periodically**, especially:
   - JWT_SECRET (every 90 days)
   - API keys if exposed
   - Database passwords
4. **Use Paystack test keys** during development
5. **Enable 2FA** on all third-party services (Cloudinary, Paystack, Twilio)
6. **Monitor Railway logs** for any credential leaks or errors

## Troubleshooting

### Database connection fails
- Verify `DATABASE_URL` is set correctly
- Check that Railway MySQL service is running
- Ensure migrations have been run

### Images not uploading
- Verify Cloudinary credentials
- Check Cloudinary dashboard for quota limits
- Ensure `CLOUDINARY_CLOUD_NAME`, `API_KEY`, and `API_SECRET` are correct

### Payment webhook failures
- Verify `FRONTEND_URL` is correct and publicly accessible
- Check Paystack webhook URL is configured correctly
- Ensure Railway app is not sleeping (use a cron job to keep alive)

### SMS/OTP not sending
- Verify Twilio credentials
- Check Twilio account balance
- Ensure phone number is verified in Twilio
- Check Twilio logs for delivery failures
