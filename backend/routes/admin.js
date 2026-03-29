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
  rejectProfileVerification,
  getAdminLogs
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
const {
  approveDocument,
  rejectDocument
} = require('../controllers/profileController');

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

// Admin activity logs
router.get('/logs', getAdminLogs);

// Photo verification for user photos (profile and gallery) - MUST be before /users/:id routes
router.post('/users/:userId/photos/verify', verifyUserPhoto);

router.put('/users/:id/verification', updateUserVerification);
router.put('/users/:id/verify', verifyUser);

// Admin User Profile - Full detailed view - MUST be before /users/:id
router.get('/users/:id/profile', getAdminUserProfile);

// Get basic user details - AFTER more specific routes
router.get('/users/:id', getUserDetails);

// User status management - MUST be before /users/:id
router.put('/users/:id/block', blockUser);
router.put('/users/:id/unblock', unblockUser);
router.delete('/users/:id', deleteUser);

// User verification - MUST be before /users/:id
router.put('/users/:id/manual-verify', manualVerifyUser);

// User activity logs - MUST be before /users/:id
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

// Document approval routes
router.put('/documents/:id/approve', approveDocument);
router.put('/documents/:id/reject', rejectDocument);

// Share profile via email
const nodemailer = require('nodemailer');
const multer = require('multer');

// Configure multer for memory storage (to get the file buffer)
const upload = multer({ storage: multer.memoryStorage() });

// Create email transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER || 'vijayalakshmijayakumar45@gmail.com',
      pass: process.env.EMAIL_PASS || 'qjmc lyil hdwo wtiy'
    }
  });
};

// Middleware to handle multipart form data
const uploadFields = upload.fields([
  { name: 'pdf', maxCount: 1 },
  { name: 'email', maxCount: 1 },
  { name: 'profileName', maxCount: 1 },
  { name: 'shareType', maxCount: 1 },
  { name: 'message', maxCount: 1 }
]);

router.post('/share-profile-email', uploadFields, async (req, res) => {
  try {
    const { email, profileName, shareType, message } = req.body;
    const pdfFile = req.files?.pdf?.[0];
    
    if (!email || !profileName) {
      return res.status(400).json({ error: 'Email and profile name are required' });
    }
    
    console.log('Profile share request:', {
      to: email,
      profileName,
      shareType,
      hasPdf: !!pdfFile
    });
    
    // Create transporter
    const transporter = createTransporter();
    
    // Email content
    const subject = shareType === 'family' 
      ? `Profile Share: ${profileName} - Vijayalakshmi Boyar Matrimony`
      : `Profile Interest: ${profileName} - Vijayalakshmi Boyar Matrimony`;
    
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #8B5CF6; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">Vijayalakshmi Boyar Matrimony</h1>
        </div>
        <div style="padding: 20px; background: #f9f9f9;">
          <h2 style="color: #333;">Profile Shared With You</h2>
          <p style="color: #666;">Hello,</p>
          <p style="color: #666;">A profile has been shared with you via Vijayalakshmi Boyar Matrimony.</p>
          <div style="background: white; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #8B5CF6; margin: 0 0 10px 0;">${profileName}</h3>
            <p style="color: #666; margin: 5px 0;"><strong>Share Type:</strong> ${shareType === 'family' ? 'Family View' : 'Personal Interest'}</p>
            ${message ? `<p style="color: #666;"><strong>Message:</strong> ${message}</p>` : ''}
          </div>
          <p style="color: #666;">To view the complete profile, please visit our website and search for this profile.</p>
          <p style="color: #666;">Best regards,<br>Vijayalakshmi Boyar Matrimony Team</p>
        </div>
        <div style="background: #333; padding: 15px; text-align: center;">
          <p style="color: white; margin: 0; font-size: 12px;">
            This is an automated message from vijayalakshmiboyarmatrimony.com
          </p>
        </div>
      </div>
    `;
    
    // Prepare mail options
    const mailOptions = {
      from: process.env.EMAIL_USER || 'vijayalakshmijayakumar45@gmail.com',
      to: email,
      subject: subject,
      html: htmlContent
    };
    
    // Attach PDF if provided
    if (pdfFile) {
      mailOptions.attachments = [
        {
          filename: pdfFile.originalname || `${profileName.replace(/\s+/g, '_')}_Profile.pdf`,
          content: pdfFile.buffer
        }
      ];
    }
    
    // Send email
    await transporter.sendMail(mailOptions);
    
    console.log('Email sent successfully to:', email);
    
    res.json({ 
      success: true, 
      message: 'Profile shared successfully! The email has been sent.' 
    });
  } catch (error) {
    console.error('Share profile email error:', error);
    res.status(500).json({ error: 'Failed to send email: ' + error.message });
  }
});

module.exports = router;
