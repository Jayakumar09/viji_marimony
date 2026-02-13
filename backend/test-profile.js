const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const express = require('express');
const cors = require('cors');

const prisma = new PrismaClient();
const app = express();
app.use(cors());
app.use(express.json());

// Mock admin auth middleware
const adminAuth = async (req, res, next) => {
  // For testing, skip auth
  req.admin = { id: 'test-admin', role: 'ADMIN' };
  next();
};

// Get user profile
app.get('/api/admin/users/:id/profile', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        photoVerifications: { orderBy: { createdAt: 'desc' } },
        userPhotos: { where: { isProfilePhoto: true }, orderBy: { uploadedAt: 'desc' }, take: 1 },
        userGallery: { orderBy: { uploadedAt: 'desc' } },
        documents: { orderBy: { uploadedAt: 'desc' } },
        userDocuments: { orderBy: { uploadedAt: 'desc' } },
        verifications: { orderBy: { createdAt: 'desc' }, take: 1 },
        subscriptions: { where: { status: 'ACTIVE' }, orderBy: { createdAt: 'desc' }, take: 1 },
        _count: { select: { sentInterests: true, receivedInterests: true, sentMessages: true, receivedMessages: true } }
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Parse photos from users table
    let userGalleryPhotos = [];
    try {
      if (user.photos) {
        const parsedPhotos = typeof user.photos === 'string' ? JSON.parse(user.photos) : user.photos;
        userGalleryPhotos = parsedPhotos.map((url, index) => ({
          id: `gallery_${index}`,
          url: url,
          isFromUsersTable: true
        }));
      }
    } catch (e) {
      console.error('Error parsing photos JSON:', e);
    }

    const usersProfilePhoto = user.profilePhoto ? {
      id: 'profile_from_users',
      url: user.profilePhoto,
      isFromUsersTable: true
    } : null;

    const profilePhoto = user.photoVerifications.find(photo => photo.photoType === 'PROFILE') || null;
    const galleryPhotos = user.photoVerifications.filter(photo => photo.photoType === 'PHOTO_GALLERY');
    const newProfilePhoto = user.userPhotos.length > 0 ? user.userPhotos[0] : null;
    const newGalleryPhotos = user.userGallery.map(photo => ({
      id: photo.id,
      url: photo.imageUrl,
      caption: photo.caption,
      isPrivate: photo.isPrivate,
      isApproved: photo.isApproved,
      uploadedAt: photo.uploadedAt
    }));

    const finalProfilePhoto = usersProfilePhoto || (newProfilePhoto ? {
      id: newProfilePhoto.id,
      url: newProfilePhoto.photoUrl,
      isProfilePhoto: newProfilePhoto.isProfilePhoto,
      isApproved: newProfilePhoto.isApproved,
      uploadedAt: newProfilePhoto.uploadedAt
    } : profilePhoto);

    const finalGalleryPhotos = userGalleryPhotos.length > 0
      ? userGalleryPhotos
      : (newGalleryPhotos.length > 0
          ? newGalleryPhotos
          : galleryPhotos.map(photo => ({
              id: photo.id,
              url: photo.photoUrl,
              status: photo.status,
              createdAt: photo.createdAt
            })));

    res.json({
      success: true,
      data: {
        personalDetails: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone || 'Not provided',
          gender: user.gender
        },
        profilePhoto: finalProfilePhoto,
        galleryPhotos: finalGalleryPhotos
      }
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

const PORT = 5002;
app.listen(PORT, async () => {
  console.log(`Test server running on port ${PORT}`);
  
  // Test with Dharsini Yuvaraj
  const user = await prisma.user.findFirst({
    where: { OR: [{ firstName: { contains: 'Dharsini' } }, { lastName: { contains: 'Yuvaraj' } }] }
  });
  
  if (user) {
    console.log('\n=== Testing API for user:', user.firstName, user.lastName, '===');
    
    // Simulate API call
    const http = require('http');
    http.get(`http://localhost:${PORT}/api/admin/users/${user.id}/profile`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const response = JSON.parse(data);
        console.log('\n=== API Response ===');
        console.log('Profile Photo:', response.data?.profilePhoto);
        console.log('Gallery Photos Count:', response.data?.galleryPhotos?.length);
        console.log('Gallery Photos:', response.data?.galleryPhotos);
        process.exit(0);
      });
    }).on('error', (e) => {
      console.error('API Error:', e);
      process.exit(1);
    });
  } else {
    console.log('User not found');
    process.exit(1);
  }
});
