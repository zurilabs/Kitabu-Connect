# Ngrok Setup Guide for Paystack Integration

This guide explains how to use ngrok to expose your local development server to the internet for Paystack webhook testing.

## Why Ngrok?

Paystack webhooks need a public HTTPS URL to send payment notifications. During development, your app runs on `localhost:5000`, which Paystack cannot reach. Ngrok creates a secure tunnel to your local server, giving you a public URL.

## Installation

### Option 1: NPM (Recommended)
```bash
npm install -g ngrok
```

### Option 2: Download Binary
1. Visit [ngrok.com/download](https://ngrok.com/download)
2. Download for your operating system
3. Extract and add to PATH

### Option 3: Chocolatey (Windows)
```bash
choco install ngrok
```

## Quick Start

### 1. Start Your Development Server
```bash
npm run dev
```

Your app should be running on `http://localhost:5000`

### 2. Start Ngrok (in a separate terminal)
```bash
ngrok http 5000
```

You'll see output like:
```
ngrok

Session Status                online
Account                       Free Account
Version                       3.x.x
Region                        United States (us)
Latency                       50ms
Web Interface                 http://127.0.0.1:4040
Forwarding                    https://abc123def456.ngrok-free.app -> http://localhost:5000

Connections                   ttl     opn     rt1     rt5     p50     p90
                             0       0       0.00    0.00    0.00    0.00
```

### 3. Copy the HTTPS URL

Copy the **Forwarding** HTTPS URL (e.g., `https://abc123def456.ngrok-free.app`)

### 4. Update Your .env File

```env
FRONTEND_URL=https://abc123def456.ngrok-free.app
```

**IMPORTANT**: Restart your development server after updating `.env`

### 5. Configure Paystack Dashboard

Go to [Paystack Dashboard](https://dashboard.paystack.com/) → Settings → API Keys & Webhooks

**Test Callback URL**:
```
https://abc123def456.ngrok-free.app/dashboard
```

**Test Webhook URL**:
```
https://abc123def456.ngrok-free.app/api/webhooks/paystack
```

## Testing the Integration

### Test Wallet Top-Up:

1. Go to your app: `http://localhost:5000`
2. Navigate to Dashboard
3. Click "Top Up" wallet
4. Enter amount and proceed
5. Complete payment on Paystack
6. You'll be redirected to: `https://abc123def456.ngrok-free.app/dashboard?reference=KITABU-xxx&status=success`
7. The payment should be verified and your wallet credited

### Monitor Webhook Events:

Ngrok provides a web interface to inspect traffic:

```
http://127.0.0.1:4040
```

Open this in your browser to see all HTTP requests, including webhook calls from Paystack.

## Important Notes

### Free Tier Limitations:

- **Random URLs**: Each time you restart ngrok, you get a new random URL
- **Solution**: Update `.env` with the new URL each time
- **Alternative**: Sign up for a free ngrok account to get a static subdomain

### Keep Ngrok Running:

Ngrok must stay running while testing. If you close it:
1. Paystack webhooks will fail
2. Callback redirects will fail
3. You'll need to restart ngrok and update Paystack settings

### URL Changes:

Every time you restart ngrok:
1. ✅ Copy the new HTTPS URL
2. ✅ Update `.env` file
3. ✅ Restart your development server
4. ✅ Update Paystack dashboard settings

## Advanced: Static Subdomain (Optional)

### Sign Up for Ngrok Account (Free):

1. Visit [ngrok.com](https://ngrok.com/)
2. Sign up for free account
3. Get your authtoken
4. Authenticate:
   ```bash
   ngrok authtoken YOUR_AUTHTOKEN
   ```

### Use Static Subdomain:

```bash
ngrok http 5000 --subdomain=kitabu-yourname
```

Your URL will always be: `https://kitabu-yourname.ngrok-free.app`

**Benefits**:
- No need to update `.env` every time
- No need to update Paystack settings every time
- More stable development experience

## Troubleshooting

### "ngrok: command not found"

**Solution**: ngrok is not installed or not in PATH
```bash
npm install -g ngrok
```

### "502 Bad Gateway" on ngrok URL

**Solution**: Your local development server is not running
```bash
npm run dev
```

### Paystack webhook not received

**Checks**:
1. ✅ Is ngrok running?
2. ✅ Is your dev server running?
3. ✅ Is the webhook URL correct in Paystack dashboard?
4. ✅ Check ngrok web interface (`http://127.0.0.1:4040`) for incoming requests

### Payment successful but wallet not credited

**Check**:
1. Browser console for errors
2. Server logs for webhook processing
3. Ngrok web interface for webhook delivery
4. Manually verify payment: Go to `/dashboard?reference=KITABU-xxx&status=success`

## Production Deployment

When deploying to production:

1. **Remove ngrok** - Not needed in production
2. **Set FRONTEND_URL** to your production domain:
   ```env
   FRONTEND_URL=https://yourdomain.com
   ```
3. **Update Paystack** to use production keys and URLs:
   - Callback URL: `https://yourdomain.com/dashboard`
   - Webhook URL: `https://yourdomain.com/api/webhooks/paystack`

## Summary

**Development Flow**:
```
1. npm run dev                          (Terminal 1)
2. ngrok http 5000                      (Terminal 2)
3. Copy ngrok HTTPS URL
4. Update .env: FRONTEND_URL=https://abc.ngrok-free.app
5. Restart dev server
6. Update Paystack dashboard URLs
7. Test payments
```

**Keep these running**:
- ✅ Development server (Terminal 1)
- ✅ Ngrok tunnel (Terminal 2)

That's it! You're now ready to test Paystack payments with webhook support in development.
