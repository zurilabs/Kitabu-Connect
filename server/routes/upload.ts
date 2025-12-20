import { Router } from 'express';
import multer from 'multer';
import { uploadImage, deleteImage } from '../config/cloudinary';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

// Configure multer to store files in memory
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Only allow image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

/**
 * Upload single book image
 * POST /api/upload/book-image
 * Protected route - requires authentication
 */
router.post('/book-image', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    console.log('[Upload] Received image upload request');

    if (!req.file) {
      console.log('[Upload] No file in request');
      return res.status(400).json({ error: 'No image file provided' });
    }

    console.log('[Upload] File details:', {
      filename: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
    });

    // Upload to Cloudinary
    console.log('[Upload] Uploading to Cloudinary...');
    const result = await uploadImage(req.file, 'kitabu-connect/books');
    console.log('[Upload] Upload successful:', result.url);

    res.json({
      success: true,
      url: result.url,
      publicId: result.publicId,
    });
  } catch (error) {
    console.error('[Upload] Image upload error:', error);
    console.error('[Upload] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    res.status(500).json({
      error: 'Failed to upload image',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Upload multiple book images
 * POST /api/upload/book-images
 * Protected route - requires authentication
 */
router.post('/book-images', authenticateToken, upload.array('images', 5), async (req, res) => {
  try {
    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No image files provided' });
    }

    // Upload all images to Cloudinary
    const uploadPromises = files.map(file => uploadImage(file, 'kitabu-connect/books'));
    const results = await Promise.all(uploadPromises);

    res.json({
      success: true,
      images: results.map(r => ({
        url: r.url,
        publicId: r.publicId,
      })),
    });
  } catch (error) {
    console.error('Images upload error:', error);
    res.status(500).json({
      error: 'Failed to upload images',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Upload profile picture
 * POST /api/upload/profile-picture
 * Protected route - requires authentication
 */
router.post('/profile-picture', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    console.log('[Upload] Received profile picture upload request');

    if (!req.file) {
      console.log('[Upload] No file in request');
      return res.status(400).json({ error: 'No image file provided' });
    }

    console.log('[Upload] File details:', {
      filename: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
    });

    // Upload to Cloudinary
    console.log('[Upload] Uploading to Cloudinary...');
    const result = await uploadImage(req.file, 'kitabu-connect/profiles');
    console.log('[Upload] Upload successful:', result.url);

    res.json({
      success: true,
      url: result.url,
      publicId: result.publicId,
    });
  } catch (error) {
    console.error('[Upload] Profile picture upload error:', error);
    console.error('[Upload] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    res.status(500).json({
      error: 'Failed to upload profile picture',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Delete an image
 * DELETE /api/upload/image/:publicId
 * Protected route - requires authentication
 */
router.delete('/image/:publicId(*)', authenticateToken, async (req, res) => {
  try {
    const publicId = req.params.publicId;

    if (!publicId) {
      return res.status(400).json({ error: 'Public ID is required' });
    }

    await deleteImage(publicId);

    res.json({
      success: true,
      message: 'Image deleted successfully',
    });
  } catch (error) {
    console.error('Image deletion error:', error);
    res.status(500).json({
      error: 'Failed to delete image',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
