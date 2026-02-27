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
  syncUserSubscription,
  getPendingProfileVerifications,
  approveProfileVerification,
  rejectProfileVerification
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

// Photo verification for user photos (profile and gallery) - MUST be before /users/:id routes
router.post('/users/:userId/photos/verify', verifyUserPhoto);

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

// User activity logs
router.get('/users/:id/activity-logs', getUserActivityLogs);

// Subscription management
router.get('/subscriptions', async (req, res) => {
  try {
    const { prisma } = require('../utils/database');
    const subscriptions = await prisma.subscription.findMany({
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 50
    });
    res.json({ subscriptions });
  } catch (error) {
    console.error('Get subscriptions error:', error);
    res.status(500).json({ error: 'Failed to fetch subscriptions' });
  }
});
router.post('/subscriptions', createSubscription);
router.put('/subscriptions/sync/:userId', syncUserSubscription);
router.put('/subscriptions/:id', updateSubscription);

// Profile verification workflow routes
router.get('/profile-verifications/pending', getPendingProfileVerifications);
router.put('/profile-verifications/:userId/approve', approveProfileVerification);
router.put('/profile-verifications/:userId/reject', rejectProfileVerification);

// Share profile via email
router.post('/share-profile-email', async (req, res) => {
  try {
    const { pdf, email, profileName, shareType } = req.body;
    
    // For now, we'll just return success since the frontend handles the email client fallback
    // In production, you would integrate with an email service like SendGrid, Mailgun, etc.
    
    console.log('Profile share request:', {
      email,
      profileName,
      shareType,
      pdfSize: pdf ? 'PDF attached' : 'No PDF'
    });
    
    res.json({ 
      success: true, 
      message: 'Email endpoint ready. In production, this would send the PDF via email service.' 
    });
  } catch (error) {
    console.error('Share profile email error:', error);
    res.status(500).json({ error: 'Failed to send email' });
  }
});

module.exports = router;
