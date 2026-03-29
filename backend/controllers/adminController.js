const { prisma } = require('../utils/database');

// Admin middleware
const adminMiddleware = async (req, res, next) => {
  try {
    const jwt = require('jsonwebtoken');
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    // Verify token with correct secret
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'boyar-matrimony-super-secret-key-change-in-production-2024');
    } catch (err) {
      // Try with fallback secret
      try {
        decoded = jwt.verify(token, 'admin-secret-key');
      } catch (err2) {
        return res.status(401).json({ error: 'Invalid or expired token' });
      }
    }
    
    if (!decoded || (!decoded.id && !decoded.adminId)) {
      return res.status(401).json({ error: 'Invalid token payload' });
    }
    
    // Use either id or adminId from decoded token
    const adminId = decoded.id || decoded.adminId;
    
    const admin = await prisma.admin.findUnique({
      where: { id: adminId }
    });
    
    if (!admin || !admin.isActive) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    req.admin = admin;
    next();
  } catch (error) {
    console.error('Admin middleware error:', error);
    res.status(500).json({ error: 'Server error in admin authentication' });
  }
};

// ============ PHOTO VERIFICATION ============

// Get pending photo verifications
const getPendingVerifications = async (req, res) => {
  try {
    const { page = 1, limit = 10, status = 'PENDING' } = req.query;
    const skip = (page - 1) * limit;
    
    const photos = await prisma.photoVerification.findMany({
      where: { status },
      skip,
      take: parseInt(limit),
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            city: true,
            state: true
          }
        }
      }
    });
    
    const total = await prisma.photoVerification.count({
      where: { status }
    });
    
    res.json({
      photos,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get pending verifications error:', error);
    res.status(500).json({ error: 'Failed to fetch verifications' });
  }
};

// Approve photo
const approvePhoto = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.admin.id;
    
    const photo = await prisma.photoVerification.findUnique({
      where: { id }
    });
    
    if (!photo) {
      return res.status(404).json({ error: 'Photo not found' });
    }
    
    await prisma.photoVerification.update({
      where: { id },
      data: {
        status: 'APPROVED',
        reviewedBy: adminId,
        reviewedAt: new Date()
      }
    });
    
    // Check if all photos for this user are approved
    await checkPhotoVerificationStatus(photo.userId);
    
    res.json({ message: 'Photo approved successfully' });
  } catch (error) {
    console.error('Approve photo error:', error);
    res.status(500).json({ error: 'Failed to approve photo' });
  }
};

// Reject photo
const rejectPhoto = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const adminId = req.admin.id;
    
    if (!reason) {
      return res.status(400).json({ error: 'Rejection reason is required' });
    }
    
    const photo = await prisma.photoVerification.findUnique({
      where: { id }
    });
    
    if (!photo) {
      return res.status(404).json({ error: 'Photo not found' });
    }
    
    await prisma.photoVerification.update({
      where: { id },
      data: {
        status: 'REJECTED',
        rejectedReason: reason,
        reviewedBy: adminId,
        reviewedAt: new Date()
      }
    });
    
    res.json({ message: 'Photo rejected' });
  } catch (error) {
    console.error('Reject photo error:', error);
    res.status(500).json({ error: 'Failed to reject photo' });
  }
};

// ============ USER MANAGEMENT ============

// Get all users with verification status
const getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '', status = 'all' } = req.query;
    const skip = (page - 1) * limit;
    
    // Build where clause
    let where = {};
    
    // Search filter
    if (search) {
      where.OR = [
        { firstName: { contains: search } },
        { lastName: { contains: search } },
        { email: { contains: search } }
      ];
    }
    
    // Status filter
    if (status && status !== 'all') {
      switch (status) {
        case 'active':
          where.isActive = true;
          break;
        case 'inactive':
          where.isActive = false;
          break;
        case 'verified':
          where.isVerified = true;
          break;
        case 'premium':
          where.subscriptions = {
            some: {
              status: 'ACTIVE'
            }
          };
          break;
        default:
          break;
      }
    }
    
    // Fetch users with subscription data
    const users = await prisma.user.findMany({
      where,
      skip,
      take: parseInt(limit),
      orderBy: { createdAt: 'desc' },
      include: {
        subscriptions: {
          where: { status: 'ACTIVE' },
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });
    
    // Map users to include actual subscription plan from Subscription table
    const usersWithSubscription = users.map(user => {
      const activeSubscription = user.subscriptions && user.subscriptions.length > 0 
        ? user.subscriptions[0] 
        : null;
      
      // Use Subscription table plan as primary, fallback to User table
      const actualPlan = activeSubscription 
        ? activeSubscription.plan 
        : (user.subscriptionTier || 'FREE');
      
      // Update user table if subscription table has different value (sync)
      if (activeSubscription && user.subscriptionTier !== activeSubscription.plan) {
        await prisma.user.update({
          where: { id: user.id },
          data: { subscriptionTier: activeSubscription.plan }
        });
      }
      
      return {
        id: user.id,
        customId: user.customId,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        city: user.city,
        state: user.state,
        isVerified: user.isVerified,
        isPremium: user.isPremium,
        subscriptionTier: actualPlan,  // Use actual plan from Subscription table
        subscriptionPlan: actualPlan,
        subscriptionStart: activeSubscription?.startDate || user.subscriptionStart,
        subscriptionEnd: activeSubscription?.endDate || null,
        createdAt: user.createdAt,
        isActive: user.isActive
      };
    });
    
    const total = await prisma.user.count({ where });
    
    res.json({
      users: usersWithSubscription,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

// Approve/reject user profile manually
const updateUserVerification = async (req, res) => {
  try {
    const { id } = req.params;
    const { verified, photosVerified } = req.body;
    
    const user = await prisma.user.findUnique({ where: { id } });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    await prisma.user.update({
      where: { id },
      data: {
        isVerified: verified !== undefined ? verified : user.isVerified,
        photosVerified: photosVerified !== undefined ? photosVerified : user.photosVerified
      }
    });
    
    res.json({ message: 'User verification updated' });
  } catch (error) {
    console.error('Update user verification error:', error);
    res.status(500).json({ error: 'Failed to update verification' });
  }
};

// Quick verify user endpoint
const verifyUser = async (req, res) => {
  try {
    const { id } = req.params;
    
    const user = await prisma.user.findUnique({ where: { id } });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    await prisma.user.update({
      where: { id },
      data: {
        isVerified: true,
        photosVerified: true
      }
    });
    
    res.json({ 
      success: true, 
      message: 'User verified successfully',
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        isVerified: true
      }
    });
  } catch (error) {
    console.error('Verify user error:', error);
    res.status(500).json({ error: 'Failed to verify user' });
  }
};

// Get full user details
const getUserDetails = async (req, res) => {
  try {
    const { id } = req.params;
    
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        photos: {
          take: 5,
          orderBy: { createdAt: 'desc' }
        },
        subscription: {
          where: { status: 'ACTIVE' },
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ user });
  } catch (error) {
    console.error('Get user details error:', error);
    res.status(500).json({ error: 'Failed to fetch user details' });
  }
};

// ============ DASHBOARD STATS ============

const getDashboardStats = async (req, res) => {
  try {
    const totalUsers = await prisma.user.count();
    const verifiedUsers = await prisma.user.count({ where: { isVerified: true } });
    const pendingPhotoVerifications = await prisma.photoVerification.count({ 
      where: { status: 'PENDING' } 
    });
    const newUsersToday = await prisma.user.count({
      where: {
        createdAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0))
        }
      }
    });
    
    res.json({
      totalUsers,
      verifiedUsers,
      pendingPhotoVerifications,
      newUsersToday,
      verificationRate: totalUsers > 0 ? Math.round((verifiedUsers / totalUsers) * 100) : 0
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
};

// Helper function
const checkPhotoVerificationStatus = async (userId) => {
  const pendingPhotos = await prisma.photoVerification.count({
    where: { userId, status: 'PENDING' }
  });
  
  const rejectedPhotos = await prisma.photoVerification.count({
    where: { userId, status: 'REJECTED' }
  });
  
  const totalPhotos = await prisma.photoVerification.count({
    where: { userId }
  });
  
  // If no pending photos and at least one approved, mark as verified
  if (pendingPhotos === 0 && totalPhotos > 0 && rejectedPhotos < totalPhotos) {
    await prisma.user.update({
      where: { id: userId },
      data: { photosVerified: true }
    });
  }
};

// ============ SUBSCRIPTION MANAGEMENT ============

// Subscription plans configuration
const SUBSCRIPTION_PLANS = [
  { id: 'FREE', name: 'Free', price: 0, duration: 0 },
  { id: 'STANDARD', name: 'Standard', price: 999, duration: 365 },
  { id: 'PREMIUM', name: 'Premium', price: 2499, duration: 365 },
  { id: 'ELITE', name: 'Elite', price: 4999, duration: 365 }
];

// Create or update user subscription
const createSubscription = async (req, res) => {
  try {
    const { userId, plan, paymentId, successFee } = req.body;
    
    if (!userId || !plan) {
      return res.status(400).json({ error: 'User ID and plan are required' });
    }
    
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const planConfig = SUBSCRIPTION_PLANS.find(p => p.id === plan.toUpperCase());
    if (!planConfig) {
      return res.status(400).json({ error: 'Invalid subscription plan' });
    }
    
    // Calculate subscription dates
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + planConfig.duration);
    
    // Create subscription record
    const subscription = await prisma.subscription.create({
      data: {
        userId,
        plan: plan.toUpperCase(),
        amount: planConfig.price,
        startDate,
        endDate,
        paymentId: paymentId || 'ADMIN_' + Date.now(),
        successFee: successFee || planConfig.price * 0.1,
        status: 'ACTIVE'
      }
    });
    
    // Sync user table with subscription data
    await prisma.user.update({
      where: { id: userId },
      data: {
        subscriptionTier: plan.toUpperCase(),
        subscriptionStart: startDate,
        subscriptionEnd: endDate,
        isPremium: plan.toUpperCase() !== 'FREE',
        successFee: successFee || planConfig.price * 0.1
      }
    });
    
    res.json({
      message: 'Subscription created successfully',
      subscription,
      user: {
        id: user.id,
        subscriptionTier: plan.toUpperCase(),
        isPremium: plan.toUpperCase() !== 'FREE',
        subscriptionStart: startDate,
        subscriptionEnd: endDate
      }
    });
    
  } catch (error) {
    console.error('Create subscription error:', error);
    res.status(500).json({ error: 'Failed to create subscription' });
  }
};

// Sync user subscription status (fixes Premium Member sync issue)
const syncUserSubscription = async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Check for active subscriptions
    const activeSubscription = await prisma.subscription.findFirst({
      where: {
        userId,
        status: 'ACTIVE',
        endDate: { gte: new Date() }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    let isPremium = false;
    let subscriptionTier = user.subscriptionTier;
    
    if (activeSubscription) {
      isPremium = true;
      subscriptionTier = activeSubscription.plan.toUpperCase();
      
      // Sync user table
      await prisma.user.update({
        where: { id: userId },
        data: {
          subscriptionTier,
          subscriptionStart: activeSubscription.startDate,
          subscriptionEnd: activeSubscription.endDate,
          isPremium: true
        }
      });
    } else {
      // No active subscription - check if expired
      if (user.subscriptionEnd && new Date(user.subscriptionEnd) < new Date()) {
        await prisma.user.update({
          where: { id: userId },
          data: { isPremium: false }
        });
      }
    }
    
    res.json({
      message: 'Subscription synced successfully',
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        isPremium,
        subscriptionTier,
        subscriptionStart: user.subscriptionStart,
        subscriptionEnd: user.subscriptionEnd
      }
    });
    
  } catch (error) {
    console.error('Sync user subscription error:', error);
    res.status(500).json({ error: 'Failed to sync subscription' });
  }
};

// ============ PROFILE VERIFICATION WORKFLOW ============

// Get pending profile verifications (users with email + phone verified, awaiting admin review)
const getPendingProfileVerifications = async (req, res) => {
  try {
    const { page = 1, limit = 20, status = 'Under Admin Review' } = req.query;
    const skip = (page - 1) * limit;
    
    const users = await prisma.user.findMany({
      where: {
        profileVerificationStatus: status,
        emailVerified: true,
        phoneVerified: true
      },
      skip,
      take: parseInt(limit),
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        customId: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        city: true,
        state: true,
        gender: true,
        age: true,
        emailVerified: true,
        phoneVerified: true,
        profileVerificationStatus: true,
        profilePhoto: true,
        createdAt: true,
        updatedAt: true
      }
    });
    
    const total = await prisma.user.count({
      where: {
        profileVerificationStatus: status,
        emailVerified: true,
        phoneVerified: true
      }
    });
    
    res.json({
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get pending profile verifications error:', error);
    res.status(500).json({ error: 'Failed to fetch pending profile verifications' });
  }
};

// Approve profile verification
const approveProfileVerification = async (req, res) => {
  try {
    const { userId } = req.params;
    const adminId = req.admin.id;
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { 
        id: true, 
        firstName: true, 
        lastName: true,
        email: true,
        emailVerified: true, 
        phoneVerified: true,
        profileVerificationStatus: true 
      }
    });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    if (!user.emailVerified || !user.phoneVerified) {
      return res.status(400).json({ error: 'User has not completed email and phone verification' });
    }
    
    // Update user profile verification status
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        profileVerificationStatus: 'Profile Verified',
        profileVerified: true,
        isVerified: true
      }
    });
    
    // Log admin activity
    await prisma.adminActivityLog.create({
      data: {
        adminId,
        action: 'PROFILE_VERIFICATION_APPROVED',
        targetUserId: userId,
        details: JSON.stringify({
          previousStatus: user.profileVerificationStatus,
          newStatus: 'Profile Verified',
          userName: `${user.firstName} ${user.lastName}`
        })
      }
    });
    
    // Send approval email to user
    try {
      const nodemailer = require('nodemailer');
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        }
      });
      
      await transporter.sendMail({
        from: process.env.FROM_EMAIL || 'noreply@boyarmatrimony.com',
        to: user.email,
        subject: 'Profile Verified - Vijayalakshmi Boyar Matrimony',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #8B5CF6;">Profile Verified! 🎉</h2>
            <p>Dear ${user.firstName},</p>
            <p>Congratulations! Your profile has been verified by our admin team.</p>
            <p>Your profile is now visible to other members, and you can start receiving matches.</p>
            <p>Thank you for choosing Vijayalakshmi Boyar Matrimony!</p>
            <br>
            <p>Best regards,<br>Vijayalakshmi Boyar Matrimony Team</p>
          </div>
        `
      });
    } catch (emailError) {
      console.error('Failed to send approval email:', emailError.message);
    }
    
    res.json({
      message: 'Profile verification approved successfully',
      user: {
        id: updatedUser.id,
        profileVerificationStatus: updatedUser.profileVerificationStatus,
        profileVerified: updatedUser.profileVerified
      }
    });
  } catch (error) {
    console.error('Approve profile verification error:', error);
    res.status(500).json({ error: 'Failed to approve profile verification' });
  }
};

// Reject profile verification
const rejectProfileVerification = async (req, res) => {
  try {
    const { userId } = req.params;
    const { reason } = req.body;
    const adminId = req.admin.id;
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { 
        id: true, 
        firstName: true, 
        lastName: true,
        email: true,
        profileVerificationStatus: true 
      }
    });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Update user profile verification status
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        profileVerificationStatus: 'Rejected',
        profileVerified: false,
        isVerified: false,
        manualVerificationNotes: reason || 'Profile verification rejected by admin'
      }
    });
    
    // Log admin activity
    await prisma.adminActivityLog.create({
      data: {
        adminId,
        action: 'PROFILE_VERIFICATION_REJECTED',
        targetUserId: userId,
        details: JSON.stringify({
          previousStatus: user.profileVerificationStatus,
          newStatus: 'Rejected',
          reason: reason,
          userName: `${user.firstName} ${user.lastName}`
        })
      }
    });
    
    // Send rejection email to user
    try {
      const nodemailer = require('nodemailer');
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        }
      });
      
      await transporter.sendMail({
        from: process.env.FROM_EMAIL || 'noreply@boyarmatrimony.com',
        to: user.email,
        subject: 'Profile Verification Update - Vijayalakshmi Boyar Matrimony',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #8B5CF6;">Profile Verification Update</h2>
            <p>Dear ${user.firstName},</p>
            <p>We regret to inform you that your profile verification could not be completed at this time.</p>
            <p><strong>Reason:</strong> ${reason || 'Please contact support for more details.'}</p>
            <p>Please resolve the issue and submit again for verification.</p>
            <br>
            <p>Best regards,<br>Vijayalakshmi Boyar Matrimony Team</p>
          </div>
        `
      });
    } catch (emailError) {
      console.error('Failed to send rejection email:', emailError.message);
    }
    
    res.json({
      message: 'Profile verification rejected',
      user: {
        id: updatedUser.id,
        profileVerificationStatus: updatedUser.profileVerificationStatus,
        profileVerified: updatedUser.profileVerified
      }
    });
  } catch (error) {
    console.error('Reject profile verification error:', error);
    res.status(500).json({ error: 'Failed to reject profile verification' });
  }
};

// Get admin activity logs + user activities (registrations, logins, subscriptions)
const getAdminLogs = async (req, res) => {
  try {
    const { page = 1, limit = 50, action, type } = req.query;
    console.log('getAdminLogs called with:', { page, limit, action, type });
    const skip = (page - 1) * limit;
    const parsedLimit = parseInt(limit);
    
    let where = {};
    if (action && action !== 'all') {
      where.action = action;
    }
    
    // Get admin logs (no include since relation may not exist in all DBs)
    const adminLogs = await prisma.adminActivityLog.findMany({
      where,
      skip,
      take: parsedLimit,
      orderBy: { createdAt: 'desc' }
    });
    
    // Get recent user registrations (last 20 users)
    const recentUsers = await prisma.user.findMany({
      take: 20,
      orderBy: { createdAt: 'desc' },
      select: { id: true, firstName: true, lastName: true, email: true, createdAt: true, customId: true }
    });
    
    // Get recent subscriptions
    const recentSubscriptions = await prisma.subscription.findMany({
      take: 20,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true, customId: true } }
      }
    });
    
    // Build combined logs list
    let combinedLogs = [];
    
    // Create a map of userId to user info for quick lookup
    const userMap = new Map();
    recentUsers.forEach(user => {
      userMap.set(user.id, user);
    });
    recentSubscriptions.forEach(sub => {
      if (sub.user) userMap.set(sub.userId, sub.user);
    });
    
    // Add admin logs
    adminLogs.forEach(log => {
      // Parse details JSON for better display
      let details = log.details || '';
      
      // Get target user info if available
      const targetUser = log.targetUserId ? userMap.get(log.targetUserId) : null;
      const targetUserName = targetUser ? `${targetUser.firstName || ''} ${targetUser.lastName || ''}`.trim() : null;
      const targetUserCustomId = targetUser ? targetUser.customId : null;
      
      try {
        const parsed = JSON.parse(log.details);
        
        // Generate readable description based on action type
        switch (log.action) {
          case 'VIEW_USER_PROFILE':
            details = targetUserName 
              ? `Viewed profile of ${targetUserName} (${targetUserCustomId || log.targetUserId})`
              : targetUserCustomId
                ? `Viewed profile (${targetUserCustomId})`
                : 'Viewed user profile';
            break;
          case 'UPDATE_SUBSCRIPTION':
            details = parsed.plan ? `Updated ${targetUserName || 'user'} subscription to ${parsed.plan} plan` : 'Updated subscription';
            break;
          case 'VERIFY_USER':
            details = `Verified ${targetUserName || 'user'}'s profile`;
            break;
          case 'BLOCK_USER':
            details = `Blocked ${targetUserName || 'user'}`;
            break;
          case 'UNBLOCK_USER':
            details = `Unblocked ${targetUserName || 'user'}`;
            break;
          case 'DELETE_USER':
            details = `Deleted ${targetUserName || 'user'}'s profile`;
            break;
          default:
            // For other actions, show parsed details or original
            details = targetUserName ? `${log.action} - ${targetUserName}` : log.details;
        }
      } catch {
        // Keep original details if not valid JSON
      }
      
      combinedLogs.push({
        id: log.id,
        type: 'admin',
        action: log.action,
        user: 'Admin', // Admin relation not available in all DBs
        timestamp: log.createdAt,
        details: details,
        targetUserId: log.targetUserId
      });
    });
    
    // Add user registrations
    recentUsers.forEach(user => {
      combinedLogs.push({
        id: `reg_${user.id}`,
        type: 'user_registration',
        action: 'USER_REGISTERED',
        user: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
        timestamp: user.createdAt,
        details: `New user registered - ID: ${user.customId || user.id}`,
        targetUserId: user.id
      });
    });
    
    // Add subscriptions
    recentSubscriptions.forEach(sub => {
      combinedLogs.push({
        id: `sub_${sub.id}`,
        type: 'subscription',
        action: 'SUBSCRIPTION_CREATED',
        user: sub.user ? `${sub.user.firstName || ''} ${sub.user.lastName || ''}`.trim() || sub.user.email : 'Unknown',
        timestamp: sub.createdAt,
        details: `${sub.plan} plan - ₹${sub.amount} (${sub.status})`,
        targetUserId: sub.userId
      });
    });
    
    // Sort by timestamp descending
    combinedLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    // Filter by type if specified
    if (type && type !== 'all') {
      combinedLogs = combinedLogs.filter(log => log.type === type);
    }
    
    // Apply pagination
    const total = combinedLogs.length;
    const paginatedLogs = combinedLogs.slice(skip, skip + parsedLimit);
    
    res.json({
      logs: paginatedLogs,
      pagination: {
        page: parseInt(page),
        limit: parsedLimit,
        total,
        pages: Math.ceil(total / parsedLimit)
      }
    });
  } catch (error) {
    console.error('Get admin logs error:', error);
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
};

module.exports = {
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
};
