const { prisma } = require('../utils/database');

// Admin middleware
const adminMiddleware = async (req, res, next) => {
  try {
    const admin = await prisma.admin.findUnique({
      where: { id: req.admin.id }
    });
    
    if (!admin || !admin.isActive) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    req.admin = admin;
    next();
  } catch (error) {
    console.error('Admin middleware error:', error);
    res.status(500).json({ error: 'Server error' });
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
    const { page = 1, limit = 20, search = '' } = req.query;
    const skip = (page - 1) * limit;
    
    const where = search ? {
      OR: [
        { firstName: { contains: search } },
        { lastName: { contains: search } },
        { email: { contains: search } }
      ]
    } : {};
    
    const users = await prisma.user.findMany({
      where,
      skip,
      take: parseInt(limit),
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        city: true,
        state: true,
        isVerified: true,
        photosVerified: true,
        emailVerified: true,
        phoneVerified: true,
        isActive: true,
        createdAt: true
      }
    });
    
    const total = await prisma.user.count({ where });
    
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

module.exports = {
  adminMiddleware,
  getPendingVerifications,
  approvePhoto,
  rejectPhoto,
  getAllUsers,
  updateUserVerification,
  getDashboardStats
};
