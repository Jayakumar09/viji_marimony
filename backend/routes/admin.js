const express = require('express');
const router = express.Router();
const { 
  adminMiddleware,
  getPendingVerifications,
  approvePhoto,
  rejectPhoto,
  getAllUsers,
  updateUserVerification,
  verifyUser,
  getUserDetails,
  getDashboardStats,
  createSubscription,
  syncUserSubscription
} = require('../controllers/adminController');
const {
  getAdminUserProfile,
  blockUser,
  unblockUser,
  deleteUser,
  getUserActivityLogs,
  manualVerifyUser,
  updateSubscription,
  verifyUserPhoto
} = require('../controllers/adminUserProfileController');

// Admin authentication routes (simplified for demo)
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  
  try {
    const admin = await require('../utils/database').prisma.admin.findUnique({
      where: { email }
    });
    
    if (!admin) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const bcrypt = require('bcryptjs');
    const validPassword = await bcrypt.compare(password, admin.password);
    
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
      { id: admin.id, role: admin.role },
      process.env.JWT_SECRET || 'boyar-matrimony-super-secret-key-change-in-production-2024',
      { expiresIn: '24h' }
    );
    
    res.json({ 
      token, 
      admin: { id: admin.id, name: admin.name, email: admin.email, role: admin.role }
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// All admin routes require authentication
router.use(adminMiddleware);

// Dashboard
router.get('/dashboard', getDashboardStats);

// Photo verification routes
router.get('/photos/pending', getPendingVerifications);
router.put('/photos/:id/approve', approvePhoto);
router.put('/photos/:id/reject', rejectPhoto);

// User management
router.get('/users', getAllUsers);
router.put('/users/:id/verification', updateUserVerification);
router.put('/users/:id/verify', verifyUser);
router.get('/users/:id', getUserDetails);

// Admin User Profile - Full detailed view
router.get('/users/:id/profile', getAdminUserProfile);

// User status management
router.put('/users/:id/block', blockUser);
router.put('/users/:id/unblock', unblockUser);
router.delete('/users/:id', deleteUser);

// User verification
router.put('/users/:id/manual-verify', manualVerifyUser);

// Photo verification for user photos (profile and gallery)
router.post('/users/:userId/photos/verify', verifyUserPhoto);

// User activity logs
router.get('/users/:id/activity-logs', getUserActivityLogs);

// Subscription management
router.post('/subscriptions', createSubscription);
router.put('/subscriptions/sync/:userId', syncUserSubscription);
router.put('/subscriptions/:id', updateSubscription);

module.exports = router;
