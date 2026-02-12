const express = require('express');
const router = express.Router();
const { 
  adminMiddleware,
  getPendingVerifications,
  approvePhoto,
  rejectPhoto,
  getAllUsers,
  updateUserVerification,
  getDashboardStats,
  createSubscription,
  syncUserSubscription
} = require('../controllers/adminController');

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
      process.env.JWT_SECRET || 'admin-secret-key',
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

// Subscription management
router.post('/subscriptions', createSubscription);
router.put('/subscriptions/sync/:userId', syncUserSubscription);

module.exports = router;
