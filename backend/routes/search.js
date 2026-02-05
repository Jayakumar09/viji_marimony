const express = require('express');
const router = express.Router();
const { 
  searchProfiles, 
  getProfileById, 
  getSearchFilters,
  getRecommendedProfiles 
} = require('../controllers/searchController');
const { authMiddleware } = require('../middleware/auth');

// All routes are protected
router.use(authMiddleware);

// Search profiles with filters
router.get('/', searchProfiles);

// Get recommended profiles
router.get('/recommended', getRecommendedProfiles);

// Get search filter options
router.get('/filters', getSearchFilters);

// Get specific profile by ID
router.get('/:profileId', getProfileById);

module.exports = router;