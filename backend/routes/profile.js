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

// Upload profile photo
router.post('/photo', uploadSingle, uploadProfilePhoto);

// Upload gallery photos
router.post('/photos', uploadMultiple, uploadGalleryPhotos);

// Delete photo
router.delete('/photo', deletePhoto);

module.exports = router;