import { v2 as cloudinary } from 'cloudinary';

// Debug: Log environment variables
console.log('[Cloudinary] Configuration check:');
console.log('[Cloudinary] CLOUD_NAME:', process.env.CLOUDINARY_CLOUD_NAME ? 'Set' : 'MISSING');
console.log('[Cloudinary] API_KEY:', process.env.CLOUDINARY_API_KEY ? 'Set' : 'MISSING');
console.log('[Cloudinary] API_SECRET:', process.env.CLOUDINARY_API_SECRET ? 'Set' : 'MISSING');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Upload image to Cloudinary with automatic optimization
 * @param file - File buffer from multer
 * @param folder - Cloudinary folder path
 * @returns Upload result with URL and public_id
 */
export async function uploadImage(
  file: any,
  folder: string = 'kitabu-connect/books'
): Promise<{ url: string; publicId: string }> {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'image',
        // Generate responsive breakpoints for different screen sizes
        responsive_breakpoints: {
          create_derived: true,
          bytes_step: 20000,
          min_width: 150,
          max_width: 800,
          max_images: 3,
        },
      },
      (error, result) => {
        if (error) return reject(error);
        if (!result) return reject(new Error('Upload failed'));

        resolve({
          url: result.secure_url,
          publicId: result.public_id,
        });
      }
    );

    uploadStream.end(file.buffer);
  });
}

/**
 * Delete image from Cloudinary
 * @param publicId - Cloudinary public_id of the image
 */
export async function deleteImage(publicId: string): Promise<void> {
  await cloudinary.uploader.destroy(publicId);
}

/**
 * Get optimized image URL with transformations
 * @param publicId - Cloudinary public_id
 * @param size - Size preset (thumbnail, card, detail)
 * @returns Transformed image URL
 */
export function getOptimizedImageUrl(
  publicId: string,
  size: 'thumbnail' | 'card' | 'detail' = 'card'
): string {
  const transformations = {
    thumbnail: {
      width: 150,
      height: 200,
      crop: 'fill',
      gravity: 'auto',
      fetch_format: 'auto',
      quality: 'auto',
    },
    card: {
      width: 400,
      height: 533,
      crop: 'fill',
      gravity: 'auto',
      fetch_format: 'auto',
      quality: 'auto',
    },
    detail: {
      width: 800,
      height: 1067,
      crop: 'limit',
      fetch_format: 'auto',
      quality: 'auto',
    },
  };

  const transform = transformations[size];

  return cloudinary.url(publicId, transform);
}

export default cloudinary;
