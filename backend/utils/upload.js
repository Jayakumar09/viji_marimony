const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Check if Cloudinary is properly configured
const isCloudinaryConfigured = () => {
  return process.env.CLOUDINARY_CLOUD_NAME && 
         process.env.CLOUDINARY_API_KEY && 
         process.env.CLOUDINARY_API_SECRET &&
         process.env.CLOUDINARY_API_SECRET !== 'CLOUDINARY_secret_here';
};

// Try to use Cloudinary storage, fallback to local storage
let storage;
if (isCloudinaryConfigured()) {
  storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
      folder: 'boyar-matrimony',
      allowed_formats: ['jpg', 'jpeg', 'png', 'gif'],
      transformation: [
        { width: 1500, height: 1500, crop: 'limit' }, // Max dimensions
        { quality: 'auto:good' }, // Compress to ~500KB max
        { fetch_format: 'auto' }
      ],
    },
  });
} else {
  storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const userId = req.user?.id || 'unknown';
      const timestamp = Date.now();
      const ext = path.extname(file.originalname);
      // Use random suffix for uniqueness
      const randomSuffix = Math.random().toString(36).substring(2, 8);
      cb(null, `user_${userId}_${timestamp}_${randomSuffix}${ext}`);
    },
  });
}

// Multer upload middleware - 1MB limit for images
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 1 * 1024 * 1024, // 1MB limit per file
  },
  fileFilter: (req, file, cb) => {
    // Check file type
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  },
});

// Error handler for multer
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum size is 1MB.' });
    }
    return res.status(400).json({ error: err.message });
  } else if (err) {
    return res.status(400).json({ error: err.message });
  }
  next();
};

// Upload single file (profile photo)
const uploadSingle = upload.single('photo');

// Upload multiple files (gallery photos) - maximum 9 images
const uploadMultiple = upload.array('photos', 9);

// Delete image from Cloudinary or local storage
const deleteImage = async (publicIdOrPath) => {
  try {
    if (isCloudinaryConfigured()) {
      // Delete from Cloudinary
      const result = await cloudinary.uploader.destroy(publicIdOrPath);
      console.log('Deleted from Cloudinary:', result);
      return result;
    } else {
      // Delete from local storage
      const filePath = path.join(uploadDir, publicIdOrPath);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log('Deleted local file:', publicIdOrPath);
        return { result: 'ok' };
      }
      return { result: 'file_not_found' };
    }
  } catch (error) {
    console.error('Error deleting image:', error);
    throw error;
  }
};

// Extract public ID from URL (works for both Cloudinary URLs and local paths)
const extractPublicId = (url) => {
  if (!url) return null;
  
  // If it's a local file path, extract just the filename
  if (url.startsWith('/uploads/') || !url.includes('cloudinary')) {
    return path.basename(url);
  }
  
  // For Cloudinary URLs, extract the public ID
  const parts = url.split('/');
  const filename = parts[parts.length - 1];
  return filename.split('.')[0];
};

module.exports = {
  uploadSingle,
  uploadMultiple,
  deleteImage,
  extractPublicId,
  handleMulterError,
  cloudinary
};