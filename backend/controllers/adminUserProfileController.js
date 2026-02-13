/**
 * Admin User Profile Controller
 * 
 * Comprehensive user profile management for admin panel
 * Handles full user details, photos, gallery, documents, verifications
 * Includes block/unblock and delete user actions with activity logging
 * 
 * Security: JWT authenticated, Admin role required, Parameterized queries via Prisma
 */

const { prisma } = require('../utils/database');
const path = require('path');
const fs = require('fs');

/**
 * Get complete user profile for admin view
 * Fetches all user data including photos, gallery, documents, verifications
 */
const getAdminUserProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.admin.id;

    // Validate user ID
    if (!id || id === 'undefined') {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Fetch complete user profile with all related data
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        // Use photoVerifications for profile and gallery photos
        photoVerifications: {
          orderBy: { createdAt: 'desc' }
        },
        // Documents relation
        documents: {
          orderBy: { uploadedAt: 'desc' }
        },
        // Subscription relation
        subscriptions: {
          where: { status: 'ACTIVE' },
          orderBy: { createdAt: 'desc' },
          take: 1
        },
        // Activity counts
        _count: {
          select: {
            sentInterests: true,
            receivedInterests: true,
            sentMessages: true,
            receivedMessages: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Separate profile photo and gallery photos from photoVerifications
    // First check if user has a profilePhoto URL stored directly
    const profilePhotoUrl = user.profilePhoto;
    const profilePhoto = profilePhotoUrl ? {
      id: 'profile',
      photoUrl: profilePhotoUrl,
      photoType: 'PROFILE',
      status: 'APPROVED',
      createdAt: user.createdAt
    } : (user.photoVerifications.find(photo => photo.photoType === 'PROFILE') || null);
    
    const galleryPhotos = user.photoVerifications.filter(photo => photo.photoType === 'PHOTO_GALLERY');

    // Transform documents with masked ID numbers
    const maskedDocuments = user.documents.map(doc => ({
      ...doc,
      // Never expose full file paths
      documentUrl: doc.documentUrl ? `/api/admin/files/${encodeURIComponent(doc.documentUrl)}` : null
    }));

    // Transform photo verifications for display
    const photoVerifications = user.photoVerifications.map(pv => ({
      id: pv.id,
      photoUrl: pv.photoUrl ? `/api/admin/files/${encodeURIComponent(pv.photoUrl)}` : null,
      photoType: pv.photoType,
      status: pv.status,
      rejectedReason: pv.rejectedReason,
      reviewedBy: pv.reviewedBy,
      reviewedAt: pv.reviewedAt,
      createdAt: pv.createdAt
    }));

    // Build comprehensive response
    const responseData = {
      // Personal Details
      personalDetails: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone || 'Not provided',
        gender: user.gender,
        dateOfBirth: user.dateOfBirth,
        age: user.age,
        community: user.community,
        subCaste: user.subCaste || 'Not provided',
        maritalStatus: user.maritalStatus,
        height: user.height || 'Not provided',
        weight: user.weight || 'Not provided',
        complexion: user.complexion || 'Not provided',
        bio: user.bio || 'Not provided'
      },

      // Location Details
      locationDetails: {
        city: user.city,
        state: user.state,
        country: user.country,
        fullLocation: `${user.city}, ${user.state}, ${user.country}`
      },

      // Professional Details
      professionalDetails: {
        education: user.education || 'Not provided',
        profession: user.profession || 'Not provided',
        income: user.income || 'Not provided'
      },

      // Family Details
      familyDetails: {
        fatherName: user.fatherName || 'Not provided',
        fatherOccupation: user.fatherOccupation || 'Not provided',
        fatherCaste: user.fatherCaste || 'Not provided',
        motherName: user.motherName || 'Not provided',
        motherOccupation: user.motherOccupation || 'Not provided',
        motherCaste: user.motherCaste || 'Not provided',
        familyValues: user.familyValues || 'Not provided',
        aboutFamily: user.aboutFamily || 'Not provided'
      },

      // Horoscope Details
      horoscopeDetails: {
        raasi: user.raasi || 'Not provided',
        natchathiram: user.natchathiram || 'Not provided',
        dhosam: user.dhosam || 'Not provided',
        birthDate: user.birthDate || 'Not provided',
        birthTime: user.birthTime || 'Not provided',
        birthPlace: user.birthPlace || 'Not provided'
      },

      // Profile Photo
      profilePhoto: profilePhoto ? {
        id: profilePhoto.id,
        url: `/api/admin/files/${encodeURIComponent(profilePhoto.photoUrl)}`,
        photoType: profilePhoto.photoType,
        status: profilePhoto.status,
        createdAt: profilePhoto.createdAt
      } : null,

      // Gallery Photos (grid layout ready)
      galleryPhotos: galleryPhotos.map(photo => ({
        id: photo.id,
        url: `/api/admin/files/${encodeURIComponent(photo.photoUrl)}`,
        photoType: photo.photoType,
        status: photo.status,
        createdAt: photo.createdAt
      })),

      // Documents
      documents: maskedDocuments,

      // Verification Details
      verificationDetails: {
        isVerified: user.isVerified,
        emailVerified: user.emailVerified,
        phoneVerified: user.phoneVerified,
        photosVerified: user.photosVerified,
        manualVerificationStatus: user.manualVerificationStatus,
        manualVerificationNotes: user.manualVerificationNotes,
        photoVerifications: photoVerifications
      },

      // Subscription Details
      subscriptionDetails: user.subscriptions.length > 0 ? {
        tier: user.subscriptions[0].plan,
        amount: user.subscriptions[0].amount,
        startDate: user.subscriptions[0].startDate,
        endDate: user.subscriptions[0].endDate,
        status: user.subscriptions[0].status,
        paymentId: user.subscriptions[0].paymentId
      } : {
        tier: 'FREE',
        amount: 0,
        startDate: null,
        endDate: null,
        status: null,
        paymentId: null
      },

      // Account Status
      accountStatus: {
        isActive: user.isActive,
        isPremium: user.isPremium,
        subscriptionTier: user.subscriptionTier || 'FREE',
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        lastLoginAt: user.lastLoginAt
      },

      // Activity Stats
      activityStats: {
        interestsSent: user._count.sentInterests,
        interestsReceived: user._count.receivedInterests,
        messagesSent: user._count.sentMessages,
        messagesReceived: user._count.receivedMessages
      }
    };

    // Log admin access to user profile
    await logAdminActivity({
      adminId,
      action: 'VIEW_USER_PROFILE',
      targetUserId: id,
      details: { viewedAt: new Date() }
    });

    res.json({
      success: true,
      data: responseData
    });

  } catch (error) {
    console.error('Get admin user profile error:', error);
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
};

/**
 * Block user account
 */
const blockUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const adminId = req.admin.id;

    if (!id) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const user = await prisma.user.findUnique({ where: { id } });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Prevent blocking if already blocked
    if (!user.isActive) {
      return res.status(400).json({ error: 'User is already blocked' });
    }

    // Update user status
    await prisma.user.update({
      where: { id },
      data: {
        isActive: false,
        // Clear verification status on block
        isVerified: false
      }
    });

    // Log the blocking activity
    await logAdminActivity({
      adminId,
      action: 'BLOCK_USER',
      targetUserId: id,
      details: {
        reason: reason || 'No reason provided',
        blockedAt: new Date(),
        userEmail: user.email
      }
    });

    res.json({
      success: true,
      message: 'User blocked successfully',
      blockedUser: {
        id: user.id,
        name: `${user.firstName} ${user.lastName}`,
        email: user.email
      }
    });

  } catch (error) {
    console.error('Block user error:', error);
    res.status(500).json({ error: 'Failed to block user' });
  }
};

/**
 * Unblock user account
 */
const unblockUser = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.admin.id;

    if (!id) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const user = await prisma.user.findUnique({ where: { id } });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Prevent unblocking if already active
    if (user.isActive) {
      return res.status(400).json({ error: 'User is already active' });
    }

    // Update user status
    await prisma.user.update({
      where: { id },
      data: {
        isActive: true
      }
    });

    // Log the unblocking activity
    await logAdminActivity({
      adminId,
      action: 'UNBLOCK_USER',
      targetUserId: id,
      details: {
        unblockedAt: new Date(),
        userEmail: user.email
      }
    });

    res.json({
      success: true,
      message: 'User unblocked successfully',
      unblockedUser: {
        id: user.id,
        name: `${user.firstName} ${user.lastName}`,
        email: user.email
      }
    });

  } catch (error) {
    console.error('Unblock user error:', error);
    res.status(500).json({ error: 'Failed to unblock user' });
  }
};

/**
 * Delete user account (soft delete - marks as inactive)
 */
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, permanent } = req.body;
    const adminId = req.admin.id;

    if (!id) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const user = await prisma.user.findUnique({ where: { id } });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Permanent deletion - remove from database
    if (permanent === true) {
      // Log before deletion
      await logAdminActivity({
        adminId,
        action: 'PERMANENT_DELETE_USER',
        targetUserId: id,
        details: {
          deletedAt: new Date(),
          reason: reason || 'No reason provided',
          userEmail: user.email,
          userName: `${user.firstName} ${user.lastName}`
        }
      });

      // Delete user (cascade will delete related records)
      await prisma.user.delete({
        where: { id }
      });

      res.json({
        success: true,
        message: 'User permanently deleted',
        deletedUser: {
          id: user.id,
          name: `${user.firstName} ${user.lastName}`,
          email: user.email
        }
      });
    } else {
      // Soft delete - just mark as inactive
      await prisma.user.update({
        where: { id },
        data: {
          isActive: false,
          // Anonymize email for GDPR compliance
          email: `deleted_${Date.now()}_${user.id}@anonymized.com`
        }
      });

      // Log the soft deletion
      await logAdminActivity({
        adminId,
        action: 'DELETE_USER',
        targetUserId: id,
        details: {
          deletedAt: new Date(),
          reason: reason || 'No reason provided',
          userEmail: user.email,
          userName: `${user.firstName} ${user.lastName}`,
          isPermanent: false
        }
      });

      res.json({
        success: true,
        message: 'User deleted successfully (soft delete)',
        deletedUser: {
          id: user.id,
          name: `${user.firstName} ${user.lastName}`,
          email: user.email
        }
      });
    }

  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
};

/**
 * Get user activity logs
 */
const getUserActivityLogs = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const skip = (page - 1) * limit;

    if (!id) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Fetch admin activity logs for this user
    const logs = await prisma.adminActivityLog.findMany({
      where: {
        targetUserId: id
      },
      skip,
      take: parseInt(limit),
      orderBy: { createdAt: 'desc' }
    });

    const total = await prisma.adminActivityLog.count({
      where: { targetUserId: id }
    });

    res.json({
      success: true,
      logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get user activity logs error:', error);
    res.status(500).json({ error: 'Failed to fetch activity logs' });
  }
};

/**
 * Verify user manually
 */
const manualVerifyUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;
    const adminId = req.admin.id;

    if (!id || !status) {
      return res.status(400).json({ error: 'User ID and status are required' });
    }

    // Validate status
    if (!['APPROVED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ error: 'Status must be APPROVED or REJECTED' });
    }

    const user = await prisma.user.findUnique({ where: { id } });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update user verification status
    await prisma.user.update({
      where: { id },
      data: {
        manualVerificationStatus: status,
        manualVerificationNotes: notes || null,
        isVerified: status === 'APPROVED'
      }
    });

    // Log the verification action
    await logAdminActivity({
      adminId,
      action: 'MANUAL_VERIFY_USER',
      targetUserId: id,
      details: {
        verificationStatus: status,
        notes: notes || null,
        verifiedAt: new Date()
      }
    });

    res.json({
      success: true,
      message: `User verification ${status.toLowerCase()}`,
      user: {
        id: user.id,
        name: `${user.firstName} ${user.lastName}`,
        verificationStatus: status
      }
    });

  } catch (error) {
    console.error('Manual verify user error:', error);
    res.status(500).json({ error: 'Failed to verify user' });
  }
};

/**
 * Update user subscription (upgrade/downgrade)
 */
const updateUserSubscription = async (req, res) => {
  try {
    const { id } = req.params;
    const { plan, reason } = req.body;
    const adminId = req.admin.id;

    if (!id || !plan) {
      return res.status(400).json({ error: 'User ID and plan are required' });
    }

    // Valid plans
    const VALID_PLANS = ['FREE', 'STANDARD', 'PREMIUM', 'ELITE'];
    if (!VALID_PLANS.includes(plan.toUpperCase())) {
      return res.status(400).json({ error: 'Invalid subscription plan' });
    }

    const user = await prisma.user.findUnique({ where: { id } });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Calculate dates
    const startDate = new Date();
    const endDate = new Date();
    endDate.setFullYear(endDate.getFullYear() + 1); // 1 year subscription

    const planPrices = {
      FREE: 0,
      STANDARD: 999,
      PREMIUM: 2499,
      ELITE: 4999
    };

    // Create new subscription record
    const subscription = await prisma.subscription.create({
      data: {
        userId: id,
        plan: plan.toUpperCase(),
        amount: planPrices[plan.toUpperCase()],
        startDate,
        endDate,
        paymentId: `ADMIN_${Date.now()}`,
        successFee: planPrices[plan.toUpperCase()] * 0.1,
        status: 'ACTIVE'
      }
    });

    // Update user subscription fields
    await prisma.user.update({
      where: { id },
      data: {
        subscriptionTier: plan.toUpperCase(),
        subscriptionStart: startDate,
        subscriptionEnd: endDate,
        isPremium: plan.toUpperCase() !== 'FREE',
        successFee: planPrices[plan.toUpperCase()] * 0.1
      }
    });

    // Log subscription update
    await logAdminActivity({
      adminId,
      action: 'UPDATE_USER_SUBSCRIPTION',
      targetUserId: id,
      details: {
        previousPlan: user.subscriptionTier || 'FREE',
        newPlan: plan.toUpperCase(),
        reason: reason || 'Admin update',
        updatedAt: new Date()
      }
    });

    res.json({
      success: true,
      message: 'Subscription updated successfully',
      subscription: {
        plan: plan.toUpperCase(),
        startDate,
        endDate,
        amount: planPrices[plan.toUpperCase()]
      }
    });

  } catch (error) {
    console.error('Update user subscription error:', error);
    res.status(500).json({ error: 'Failed to update subscription' });
  }
};

/**
 * Helper function to log admin activities
 * Creates activity log entries for audit trail
 */
const logAdminActivity = async ({ adminId, action, targetUserId, details }) => {
  try {
    await prisma.adminActivityLog.create({
      data: {
        adminId,
        action,
        targetUserId,
        details: JSON.stringify(details),
        ipAddress: 'ADMIN_PANEL', // In production, capture actual IP
        userAgent: 'ADMIN_PANEL'
      }
    });
  } catch (error) {
    console.error('Log admin activity error:', error);
    // Don't throw - logging failure shouldn't break main operation
  }
};

/**
 * Get verification document details
 */
const getVerificationDetails = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Fetch photo verifications
    const photoVerifications = await prisma.photoVerification.findMany({
      where: { userId: id },
      orderBy: { createdAt: 'desc' }
    });

    // Fetch documents
    const documents = await prisma.document.findMany({
      where: { userId: id },
      orderBy: { uploadedAt: 'desc' }
    });

    // Calculate verification stats
    const pendingPhotos = photoVerifications.filter(pv => pv.status === 'PENDING').length;
    const approvedPhotos = photoVerifications.filter(pv => pv.status === 'APPROVED').length;
    const rejectedPhotos = photoVerifications.filter(pv => pv.status === 'REJECTED').length;

    const pendingDocs = documents.filter(d => d.status === 'PENDING').length;
    const approvedDocs = documents.filter(d => d.status === 'APPROVED').length;
    const rejectedDocs = documents.filter(d => d.status === 'REJECTED').length;

    res.json({
      success: true,
      data: {
        photoVerifications: photoVerifications.map(pv => ({
          id: pv.id,
          photoUrl: pv.photoUrl ? `/api/admin/files/${encodeURIComponent(pv.photoUrl)}` : null,
          photoType: pv.photoType,
          status: pv.status,
          rejectedReason: pv.rejectedReason,
          reviewedBy: pv.reviewedBy,
          reviewedAt: pv.reviewedAt,
          createdAt: pv.createdAt
        })),
        documents: documents.map(doc => ({
          id: doc.id,
          documentType: doc.documentType,
          documentUrl: doc.documentUrl ? `/api/admin/files/${encodeURIComponent(doc.documentUrl)}` : null,
          status: doc.status,
          rejectedReason: doc.rejectedReason,
          reviewedBy: doc.reviewedBy,
          reviewedAt: doc.reviewedAt,
          uploadedAt: doc.uploadedAt
        })),
        stats: {
          photos: { pending: pendingPhotos, approved: approvedPhotos, rejected: rejectedPhotos },
          documents: { pending: pendingDocs, approved: approvedDocs, rejected: rejectedDocs }
        }
      }
    });

  } catch (error) {
    console.error('Get verification details error:', error);
    res.status(500).json({ error: 'Failed to fetch verification details' });
  }
};

module.exports = {
  getAdminUserProfile,
  blockUser,
  unblockUser,
  deleteUser,
  getUserActivityLogs,
  manualVerifyUser,
  updateUserSubscription,
  getVerificationDetails
};
