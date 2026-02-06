const express = require('express');
const router = express.Router();
const { 
  getProfile, 
  updateProfile, 
  uploadProfilePhoto, 
  uploadGalleryPhotos,
  deletePhoto 
} = require('../controllers/profileController');
const { authMiddleware } = require('../middleware/auth');
const { 
  validateProfileUpdate,
  handleValidationErrors 
} = require('../middleware/validation');
const { uploadSingle, uploadMultiple } = require('../utils/upload');

// All routes are protected
router.use(authMiddleware);

// Get user profile
router.get('/', getProfile);

// Update user profile
router.put('/', validateProfileUpdate, handleValidationErrors, updateProfile);

// Upload profile photo with error handling for multer
router.post('/photo', (req, res, next) => {
  uploadSingle(req, res, (err) => {
    if (err) {
      console.error('Multer error (profile photo):', err);
      return res.status(400).json({ 
        error: 'File upload failed', 
        details: err.message 
      });
    }
    next();
  });
}, uploadProfilePhoto);

// Upload gallery photos with error handling for multer
router.post('/photos', (req, res, next) => {
  uploadMultiple(req, res, (err) => {
    if (err) {
      console.error('Multer error (gallery photos):', err);
      return res.status(400).json({ 
        error: 'File upload failed', 
        details: err.message 
      });
    }
    next();
  });
}, uploadGalleryPhotos);

// Delete photo
router.delete('/photo', deletePhoto);

module.exports = router;