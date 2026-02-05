const { prisma } = require('../utils/database');
const { extractPublicId, deleteImage } = require('../utils/upload');

const getProfile = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        phone: true,
        firstName: true,
        lastName: true,
        gender: true,
        dateOfBirth: true,
        age: true,
        community: true,
        subCaste: true,
        city: true,
        state: true,
        country: true,
        education: true,
        profession: true,
        income: true,
        maritalStatus: true,
        height: true,
        weight: true,
        complexion: true,
        profilePhoto: true,
        photos: true,
        bio: true,
        familyValues: true,
        aboutFamily: true,
        isVerified: true,
        isPremium: true,
        emailVerified: true,
        phoneVerified: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const updateProfile = async (req, res) => {
  try {
    const {
      phone,
      education,
      profession,
      income,
      height,
      weight,
      complexion,
      bio,
      familyValues,
      aboutFamily,
      subCaste
    } = req.body;

    const updateData = {};
    
    // Only include fields that are provided
    if (phone !== undefined) updateData.phone = phone;
    if (education !== undefined) updateData.education = education;
    if (profession !== undefined) updateData.profession = profession;
    if (income !== undefined) updateData.income = income;
    if (height !== undefined) updateData.height = height;
    if (weight !== undefined) updateData.weight = weight;
    if (complexion !== undefined) updateData.complexion = complexion;
    if (bio !== undefined) updateData.bio = bio;
    if (familyValues !== undefined) updateData.familyValues = familyValues;
    if (aboutFamily !== undefined) updateData.aboutFamily = aboutFamily;
    if (subCaste !== undefined) updateData.subCaste = subCaste;

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: updateData,
      select: {
        id: true,
        email: true,
        phone: true,
        firstName: true,
        lastName: true,
        gender: true,
        education: true,
        profession: true,
        income: true,
        height: true,
        weight: true,
        complexion: true,
        bio: true,
        familyValues: true,
        aboutFamily: true,
        subCaste: true,
        updatedAt: true
      }
    });

    res.json({
      message: 'Profile updated successfully',
      user: updatedUser
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Internal server error during profile update' });
  }
};

const uploadProfilePhoto = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No photo uploaded' });
    }

    // Get current user to delete old profile photo if exists
    const currentUser = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { profilePhoto: true }
    });

    // Delete old profile photo from Cloudinary if it exists
    if (currentUser.profilePhoto) {
      const oldPublicId = extractPublicId(currentUser.profilePhoto);
      if (oldPublicId) {
        await deleteImage(oldPublicId);
      }
    }

    // Update user with new profile photo URL
    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: { profilePhoto: req.file.path },
      select: {
        id: true,
        profilePhoto: true,
        updatedAt: true
      }
    });

    res.json({
      message: 'Profile photo uploaded successfully',
      profilePhoto: updatedUser.profilePhoto
    });

  } catch (error) {
    console.error('Upload profile photo error:', error);
    res.status(500).json({ error: 'Internal server error during photo upload' });
  }
};

const uploadGalleryPhotos = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No photos uploaded' });
    }

    // Get current user photos
    const currentUser = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { photos: true }
    });

    // Extract new photo URLs
    const newPhotos = req.files.map(file => file.path);
    
    // Combine existing photos with new ones (max 6 photos)
    let updatedPhotos = [];
    if (currentUser.photos && currentUser.photos.length > 0) {
      updatedPhotos = [...currentUser.photos, ...newPhotos].slice(0, 6);
    } else {
      updatedPhotos = newPhotos.slice(0, 6);
    }

    // Update user with new photos array
    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: { photos: updatedPhotos },
      select: {
        id: true,
        photos: true,
        updatedAt: true
      }
    });

    res.json({
      message: 'Gallery photos uploaded successfully',
      photos: updatedUser.photos
    });

  } catch (error) {
    console.error('Upload gallery photos error:', error);
    res.status(500).json({ error: 'Internal server error during photo upload' });
  }
};

const deletePhoto = async (req, res) => {
  try {
    const { photoUrl } = req.body;

    if (!photoUrl) {
      return res.status(400).json({ error: 'Photo URL is required' });
    }

    // Get current user
    const currentUser = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { photos: true, profilePhoto: true }
    });

    // Check if photo exists in user's photos
    if (!currentUser.photos.includes(photoUrl)) {
      return res.status(404).json({ error: 'Photo not found in your gallery' });
    }

    // Delete photo from Cloudinary
    const publicId = extractPublicId(photoUrl);
    if (publicId) {
      await deleteImage(publicId);
    }

    // Remove photo from user's photos array
    const updatedPhotos = currentUser.photos.filter(photo => photo !== photoUrl);

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: { photos: updatedPhotos },
      select: {
        id: true,
        photos: true,
        updatedAt: true
      }
    });

    res.json({
      message: 'Photo deleted successfully',
      photos: updatedUser.photos
    });

  } catch (error) {
    console.error('Delete photo error:', error);
    res.status(500).json({ error: 'Internal server error during photo deletion' });
  }
};

module.exports = {
  getProfile,
  updateProfile,
  uploadProfilePhoto,
  uploadGalleryPhotos,
  deletePhoto
};