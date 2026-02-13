/**
 * Admin User Profile Controller
 * 
 * Comprehensive user profile management for admin panel
 * Handles full user details, photos, gallery, documents, verifications
 * Includes block/unblock and delete user actions with activity logging
 * 
 * Security: JWT authenticated, Admin role required, Parameterized queries via mssql
 */

const { sql, poolPromise } = require('../config/db');
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

    const pool = await poolPromise;

    // Fetch complete user profile with all related data
    const userResult = await pool.request()
      .input('UserId', sql.VarChar(50), id)
      .query(`
        SELECT 
          id, firstName, lastName, email, phone, gender, dateOfBirth, age,
          community, subCaste, maritalStatus, height, weight, complexion, bio,
          city, state, country, education, profession, income,
          fatherName, fatherOccupation, fatherCaste, motherName, motherOccupation, motherCaste,
          familyValues, aboutFamily, raasi, natchathiram, dhosam, birthDate, birthTime, birthPlace,
          isVerified, emailVerified, phoneVerified, photosVerified,
          manualVerificationStatus, manualVerificationNotes,
          isActive, isPremium, subscriptionTier, profilePhoto,
          createdAt, updatedAt, lastLoginAt
        FROM Users
        WHERE id = @UserId
      `);

    const user = userResult.recordset[0];

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Fetch profile photo (IsProfilePhoto = 1)
    const profilePhotoResult = await pool.request()
      .input('UserId', sql.VarChar(50), id)
      .query(`
        SELECT TOP 1 PhotoPath, Status, UploadedAt
        FROM UserPhotos
        WHERE UserId = @UserId AND IsProfilePhoto = 1
        ORDER BY UploadedAt DESC
      `);

    // Fetch gallery images
    const galleryResult = await pool.request()
      .input('UserId', sql.VarChar(50), id)
      .query(`
        SELECT ImagePath, Status, UploadedAt
        FROM UserGallery
        WHERE UserId = @UserId
        ORDER BY UploadedAt DESC
      `);

    // Fetch documents
    const documentsResult = await pool.request()
      .input('UserId', sql.VarChar(50), id)
      .query(`
        SELECT DocumentType, DocumentPath, Status, UploadedAt
        FROM UserDocuments
        WHERE UserId = @UserId
        ORDER BY UploadedAt DESC
      `);

    // Fetch subscription
    const subscriptionResult = await pool.request()
      .input('UserId', sql.VarChar(50), id)
      .query(`
        SELECT TOP 1 Plan, Amount, StartDate, EndDate, Status, PaymentId
        FROM Subscriptions
        WHERE UserId = @UserId AND Status = 'ACTIVE'
        ORDER BY CreatedAt DESC
      `);

    // Fetch activity counts
    const activityResult = await pool.request()
      .input('UserId', sql.VarChar(50), id)
      .query(`
        SELECT 
          (SELECT COUNT(*) FROM Interests WHERE SenderId = @UserId) as interestsSent,
          (SELECT COUNT(*) FROM Interests WHERE ReceiverId = @UserId) as interestsReceived,
          (SELECT COUNT(*) FROM Messages WHERE SenderId = @UserId) as messagesSent,
          (SELECT COUNT(*) FROM Messages WHERE ReceiverId = @UserId) as messagesReceived
      `);

    // Transform profile photo
    const profilePhoto = profilePhotoResult.recordset[0] ? {
      id: 'profile',
      url: profilePhotoResult.recordset[0].PhotoPath,
      status: profilePhotoResult.recordset[0].Status || 'APPROVED',
      createdAt: profilePhotoResult.recordset[0].UploadedAt
    } : null;

    // Transform gallery photos
    const galleryPhotos = galleryResult.recordset.map((photo, index) => ({
      id: `gallery_${index}`,
      url: photo.ImagePath,
      status: photo.Status || 'PENDING',
      createdAt: photo.UploadedAt
    }));

    // Transform documents with masked paths
    const documents = documentsResult.recordset.map((doc, index) => ({
      id: `doc_${index}`,
      documentType: doc.DocumentType,
      documentUrl: doc.DocumentPath,
      status: doc.Status || 'PENDING',
      uploadedAt: doc.UploadedAt
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
        fullLocation: `${user.city || ''}, ${user.state || ''}, ${user.country || ''}`
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
      profilePhoto: profilePhoto,

      // Gallery Photos (grid layout ready)
      galleryPhotos: galleryPhotos,

      // Documents
      documents: documents,

      // Verification Details
      verificationDetails: {
        isVerified: user.isVerified || false,
        emailVerified: user.emailVerified || false,
        phoneVerified: user.phoneVerified || false,
        photosVerified: user.photosVerified || false,
        manualVerificationStatus: user.manualVerificationStatus || null,
        manualVerificationNotes: user.manualVerificationNotes || null,
        photoVerifications: []
      },

      // Subscription Details
      subscriptionDetails: subscriptionResult.recordset.length > 0 ? {
        tier: subscriptionResult.recordset[0].Plan,
        amount: subscriptionResult.recordset[0].Amount,
        startDate: subscriptionResult.recordset[0].StartDate,
        endDate: subscriptionResult.recordset[0].EndDate,
        status: subscriptionResult.recordset[0].Status,
        paymentId: subscriptionResult.recordset[0].PaymentId
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
        interestsSent: activityResult.recordset[0].interestsSent,
        interestsReceived: activityResult.recordset[0].interestsReceived,
        messagesSent: activityResult.recordset[0].messagesSent,
        messagesReceived: activityResult.recordset[0].messagesReceived
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
 * Get user photos (profile + gallery)
 */
const getUserPhotos = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || id === 'undefined') {
      return res.status(400).json({ message: 'Invalid user ID' });
    }

    const pool = await poolPromise;

    // Get profile photo
    const profilePhotoResult = await pool.request()
      .input('UserId', sql.VarChar(50), id)
      .query(`
        SELECT TOP 1 PhotoPath, Status, UploadedAt
        FROM UserPhotos
        WHERE UserId = @UserId AND IsProfilePhoto = 1
        ORDER BY UploadedAt DESC
      `);

    // Get gallery images
    const galleryResult = await pool.request()
      .input('UserId', sql.VarChar(50), id)
      .query(`
        SELECT ImagePath, Status, UploadedAt
        FROM UserGallery
        WHERE UserId = @UserId
        ORDER BY UploadedAt DESC
      `);

    res.json({
      success: true,
      data: {
        profilePhoto: profilePhotoResult.recordset[0] || null,
        gallery: galleryResult.recordset
      }
    });

  } catch (error) {
    console.error('Get user photos error:', error);
    res.status(500).json({ message: 'Server error' });
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

    const pool = await poolPromise;

    // Check if user exists
    const userResult = await pool.request()
      .input('UserId', sql.VarChar(50), id)
      .query('SELECT * FROM Users WHERE id = @UserId');

    const user = userResult.recordset[0];

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Prevent blocking if already blocked
    if (!user.isActive) {
      return res.status(400).json({ error: 'User is already blocked' });
    }

    // Update user status
    await pool.request()
      .input('UserId', sql.VarChar(50), id)
      .input('IsActive', sql.Bit, 0)
      .input('IsVerified', sql.Bit, 0)
      .query(`
        UPDATE Users
        SET isActive = @IsActive, isVerified = @IsVerified
        WHERE id = @UserId
      `);

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

    const pool = await poolPromise;

    // Check if user exists
    const userResult = await pool.request()
      .input('UserId', sql.VarChar(50), id)
      .query('SELECT * FROM Users WHERE id = @UserId');

    const user = userResult.recordset[0];

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Prevent unblocking if already active
    if (user.isActive) {
      return res.status(400).json({ error: 'User is already active' });
    }

    // Update user status
    await pool.request()
      .input('UserId', sql.VarChar(50), id)
      .input('IsActive', sql.Bit, 1)
      .query(`
        UPDATE Users
        SET isActive = @IsActive
        WHERE id = @UserId
      `);

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

    const pool = await poolPromise;

    // Check if user exists
    const userResult = await pool.request()
      .input('UserId', sql.VarChar(50), id)
      .query('SELECT * FROM Users WHERE id = @UserId');

    const user = userResult.recordset[0];

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
      await pool.request()
        .input('UserId', sql.VarChar(50), id)
        .query('DELETE FROM Users WHERE id = @UserId');

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
      // Soft delete - just mark as inactive and anonymize email
      const anonymizedEmail = `deleted_${Date.now()}_${user.id}@anonymized.com`;

      await pool.request()
        .input('UserId', sql.VarChar(50), id)
        .input('Email', sql.VarChar(255), anonymizedEmail)
        .input('IsActive', sql.Bit, 0)
        .query(`
          UPDATE Users
          SET email = @Email, isActive = @IsActive
          WHERE id = @UserId
        `);

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

    if (!id) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const pool = await poolPromise;
    const offset = (page - 1) * limit;

    // Fetch admin activity logs for this user
    const logsResult = await pool.request()
      .input('UserId', sql.VarChar(50), id)
      .input('Limit', sql.Int, parseInt(limit))
      .input('Offset', sql.Int, offset)
      .query(`
        SELECT *
        FROM AdminActivityLog
        WHERE targetUserId = @UserId
        ORDER BY createdAt DESC
        OFFSET @Offset ROWS FETCH NEXT @Limit ROWS ONLY
      `);

    const totalResult = await pool.request()
      .input('UserId', sql.VarChar(50), id)
      .query(`
        SELECT COUNT(*) as total
        FROM AdminActivityLog
        WHERE targetUserId = @UserId
      `);

    res.json({
      success: true,
      logs: logsResult.recordset,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalResult.recordset[0].total,
        pages: Math.ceil(totalResult.recordset[0].total / limit)
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

    if (!id) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const pool = await poolPromise;

    // Update user verification status
    await pool.request()
      .input('UserId', sql.VarChar(50), id)
      .input('IsVerified', sql.Bit, status === 'APPROVED')
      .input('ManualStatus', sql.VarChar(50), status)
      .input('ManualNotes', sql.Text, notes || null)
      .input('ReviewedBy', sql.VarChar(50), adminId)
      .query(`
        UPDATE Users
        SET isVerified = @IsVerified, 
            manualVerificationStatus = @ManualStatus,
            manualVerificationNotes = @ManualNotes,
            reviewedBy = @ReviewedBy,
            reviewedAt = GETDATE()
        WHERE id = @UserId
      `);

    // Log the verification action
    await logAdminActivity({
      adminId,
      action: 'MANUAL_VERIFY_USER',
      targetUserId: id,
      details: {
        status: status,
        notes: notes,
        verifiedAt: new Date()
      }
    });

    res.json({
      success: true,
      message: `User verification ${status.toLowerCase()} successfully`
    });

  } catch (error) {
    console.error('Manual verify user error:', error);
    res.status(500).json({ error: 'Failed to verify user' });
  }
};

/**
 * Update user subscription
 */
const updateSubscription = async (req, res) => {
  try {
    const { id } = req.params;
    const { plan } = req.body;
    const adminId = req.admin.id;

    if (!id) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const pool = await poolPromise;

    // Get plan amount
    const planAmounts = {
      'FREE': 0,
      'STANDARD': 999,
      'PREMIUM': 1999,
      'ELITE': 3999
    };

    const amount = planAmounts[plan] || 0;
    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + (plan === 'FREE' ? 0 : 3));

    // Deactivate old subscription
    await pool.request()
      .input('UserId', sql.VarChar(50), id)
      .query(`
        UPDATE Subscriptions
        SET status = 'INACTIVE'
        WHERE UserId = @UserId AND status = 'ACTIVE'
      `);

    // Create new subscription
    await pool.request()
      .input('UserId', sql.VarChar(50), id)
      .input('Plan', sql.VarChar(50), plan)
      .input('Amount', sql.Decimal(10, 2), amount)
      .input('StartDate', sql.DateTime, startDate)
      .input('EndDate', sql.DateTime, endDate)
      .input('Status', sql.VarChar(50), 'ACTIVE')
      .input('PaymentId', sql.VarChar(100), `ADMIN_${Date.now()}`)
      .query(`
        INSERT INTO Subscriptions (UserId, Plan, Amount, StartDate, EndDate, Status, PaymentId, CreatedAt)
        VALUES (@UserId, @Plan, @Amount, @StartDate, @EndDate, @Status, @PaymentId, GETDATE())
      `);

    // Update user subscription tier
    const isPremium = plan !== 'FREE';
    await pool.request()
      .input('UserId', sql.VarChar(50), id)
      .input('IsPremium', sql.Bit, isPremium)
      .input('SubscriptionTier', sql.VarChar(50), plan)
      .query(`
        UPDATE Users
        SET isPremium = @IsPremium, subscriptionTier = @SubscriptionTier
        WHERE id = @UserId
      `);

    // Log the subscription update
    await logAdminActivity({
      adminId,
      action: 'UPDATE_SUBSCRIPTION',
      targetUserId: id,
      details: {
        plan: plan,
        amount: amount,
        updatedAt: new Date()
      }
    });

    res.json({
      success: true,
      message: 'Subscription updated successfully',
      subscription: {
        plan: plan,
        amount: amount,
        startDate: startDate,
        endDate: endDate
      }
    });

  } catch (error) {
    console.error('Update subscription error:', error);
    res.status(500).json({ error: 'Failed to update subscription' });
  }
};

/**
 * Log admin activity
 */
const logAdminActivity = async ({ adminId, action, targetUserId, details }) => {
  try {
    const pool = await poolPromise;
    await pool.request()
      .input('AdminId', sql.VarChar(50), adminId)
      .input('Action', sql.VarChar(100), action)
      .input('TargetUserId', sql.VarChar(50), targetUserId)
      .input('Details', sql.Text, JSON.stringify(details))
      .query(`
        INSERT INTO AdminActivityLog (adminId, action, targetUserId, details, createdAt)
        VALUES (@AdminId, @Action, @TargetUserId, @Details, GETDATE())
      `);
  } catch (error) {
    console.error('Log admin activity error:', error);
  }
};

module.exports = {
  getAdminUserProfile,
  getUserPhotos,
  blockUser,
  unblockUser,
  deleteUser,
  getUserActivityLogs,
  manualVerifyUser,
  updateSubscription
};
