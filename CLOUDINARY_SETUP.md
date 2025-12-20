# Cloudinary Setup Guide

This guide will help you set up Cloudinary for image storage in Kitabu Connect.

## Why Cloudinary?

Cloudinary provides:
- **Free Tier**: 25GB storage + 25GB monthly bandwidth
- **Automatic Optimization**: Images are automatically compressed and converted to the best format (WebP, etc.)
- **Responsive Breakpoints**: Multiple image sizes generated automatically
- **Fast CDN**: Global content delivery network for quick image loading
- **Zero Data Consumption**: Optimized images reduce bandwidth costs

## Setup Instructions

### 1. Create a Cloudinary Account

1. Go to [https://cloudinary.com/users/register_free](https://cloudinary.com/users/register_free)
2. Sign up for a free account
3. Verify your email address

### 2. Get Your Credentials

1. After logging in, you'll be on the Dashboard
2. You'll see a section called **Account Details** with:
   - **Cloud Name**
   - **API Key**
   - **API Secret** (click "reveal" to see it)

### 3. Add Credentials to Your .env File

Copy your `.env.example` file to `.env` if you haven't already:

```bash
cp .env.example .env
```

Then update these values in your `.env` file:

```env
CLOUDINARY_CLOUD_NAME=your_cloud_name_here
CLOUDINARY_API_KEY=your_api_key_here
CLOUDINARY_API_SECRET=your_api_secret_here
```

### 4. Test the Integration

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Navigate to the "Sell Book" page: `http://localhost:5000/sell`

3. Go through the multistep form to the "Description & Photos" step

4. Upload a book cover image - it should:
   - Show a loading spinner while uploading
   - Upload to Cloudinary automatically
   - Display the uploaded image
   - Show a success toast notification

## How It Works

### Backend

1. **Upload Endpoint** (`/api/upload/book-image`):
   - Accepts image file via multipart form data
   - Validates file type and size (max 5MB)
   - Uploads to Cloudinary with automatic optimization
   - Returns the Cloudinary URL

2. **Cloudinary Configuration** (`server/config/cloudinary.ts`):
   - Configures Cloudinary with your credentials
   - Sets up automatic format optimization (`format: 'auto'`)
   - Sets up quality optimization (`quality: 'auto'`)
   - Generates responsive breakpoints (150px, 400px, 800px widths)

### Frontend

1. **ImageUpload Component** (`client/src/components/ui/image-upload.tsx`):
   - Shows instant preview when file is selected
   - Uploads to backend endpoint
   - Displays loading state during upload
   - Updates form with Cloudinary URL
   - Shows error messages if upload fails

2. **Book Listing Form** (`client/src/pages/sell.tsx`):
   - Uses ImageUpload component for book cover
   - Stores Cloudinary URL in `primaryPhotoUrl` field
   - Submits URL to backend when creating listing

## Image Optimization

Images are automatically optimized for different display sizes:

- **Thumbnail**: 150x200px (for cards in listings)
- **Card**: 400x533px (for marketplace cards)
- **Detail**: 800x1067px (for book detail page)

Cloudinary generates these sizes automatically when you upload an image, so you can request different sizes without re-uploading.

## Troubleshooting

### "Upload failed" error
- Check that your Cloudinary credentials in `.env` are correct
- Make sure you've restarted the server after adding credentials
- Check the browser console and server logs for detailed error messages

### Images not loading
- Verify the Cloudinary URL is being stored in the database
- Check that your Cloudinary account is active
- Ensure you haven't exceeded the free tier limits

### Slow uploads
- This is normal for larger images
- The free tier has rate limits - don't upload too many images at once
- Images are optimized during upload, which takes a few seconds

## Free Tier Limits

- **Storage**: 25GB
- **Bandwidth**: 25GB/month
- **Transformations**: 25 credits/month
- **Request rate**: 500 requests/hour

These limits are generous for development and small-scale production use. If you need more, Cloudinary has affordable paid plans.

## Next Steps

Once Cloudinary is set up and working:

1. ✅ Book cover images will be stored on Cloudinary
2. ✅ Images will be automatically optimized
3. ✅ Multiple sizes will be generated for responsive design
4. ✅ Global CDN will serve images quickly to users

You're all set! Start uploading book images and they'll be automatically optimized and stored in the cloud.
