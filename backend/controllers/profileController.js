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

    // Normalize profile photo path if it's a local file path
    if (user.profilePhoto && !user.profilePhoto.startsWith('http') && !user.profilePhoto.startsWith('/')) {
      user.profilePhoto = `/${user.profilePhoto}`;
    }

    // Normalize photos array paths (parse JSON string first)
    let photosArray = [];
    if (user.photos) {
      try {
        photosArray = JSON.parse(user.photos);
      } catch (e) {
        photosArray = [];
      }
    }
    if (Array.isArray(photosArray)) {
      user.photos = photosArray.map(photo => {
        if (!photo.startsWith('http') && !photo.startsWith('/')) {
          return `/${photo}`;
        }
        return photo;
      });
    } else {
      user.photos = [];
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
      gender,
      dateOfBirth,
      age,
      city,
      state,
      country,
      education,
      profession,
      income,
      maritalStatus,
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
    if (gender !== undefined) updateData.gender = gender;
    if (dateOfBirth !== undefined) updateData.dateOfBirth = new Date(dateOfBirth);
    if (age !== undefined) updateData.age = parseInt(age);
    if (city !== undefined) updateData.city = city;
    if (state !== undefined) updateData.state = state;
    if (country !== undefined) updateData.country = country;
    if (education !== undefined) updateData.education = education;
    if (profession !== undefined) updateData.profession = profession;
    if (income !== undefined) updateData.income = income;
    if (maritalStatus !== undefined) updateData.maritalStatus = maritalStatus;
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
        dateOfBirth: true,
        age: true,
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
      console.error('Upload profile photo: No file received');
      return res.status(400).json({ error: 'No photo uploaded' });
    }

    if (!req.user || !req.user.id) {
      console.error('Upload profile photo: No user found in request');
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Get current user to delete old profile photo if exists
    const currentUser = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { profilePhoto: true }
    });

    if (!currentUser) {
      console.error('Upload profile photo: User not found in database');
      return res.status(404).json({ error: 'User not found' });
    }

    // Delete old profile photo from Cloudinary if it exists
    if (currentUser.profilePhoto) {
      const oldPublicId = extractPublicId(currentUser.profilePhoto);
      if (oldPublicId) {
        try {
          await deleteImage(oldPublicId);
        } catch (deleteErr) {
          console.warn('Warning: Could not delete old profile photo:', deleteErr);
          // Continue anyway, don't let this block the upload
        }
      }
    }

    // Update user with new profile photo URL (always use HTTP path)
    let photoUrl;
    if (req.file.path && req.file.path.startsWith('http')) {
      // Cloudinary URL
      photoUrl = req.file.path;
    } else {
      // Local storage - construct HTTP URL
      photoUrl = `/uploads/${req.file.filename}`;
    }
    
    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: { profilePhoto: photoUrl },
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
    res.status(500).json({ error: 'Internal server error during photo upload', details: error.message });
  }
};

const uploadGalleryPhotos = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      console.error('Upload gallery photos: No files received');
      return res.status(400).json({ error: 'No photos uploaded' });
    }

    if (!req.user || !req.user.id) {
      console.error('Upload gallery photos: No user found in request');
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Get current user photos
    const currentUser = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { photos: true }
    });

    if (!currentUser) {
      console.error('Upload gallery photos: User not found in database');
      return res.status(404).json({ error: 'User not found' });
    }

    // Extract new photo URLs (always use HTTP paths)
    const newPhotos = req.files.map(file => {
      if (file.path && file.path.startsWith('http')) {
        return file.path; // Cloudinary URL
      } else {
        return `/uploads/${file.filename}`; // Local storage HTTP path
      }
    });
    
    // Parse current photos from JSON string to array
    let currentPhotosArray = [];
    if (currentUser.photos) {
      try {
        currentPhotosArray = JSON.parse(currentUser.photos);
      } catch (e) {
        currentPhotosArray = [];
      }
    }
    
    // Extract filenames from current photos for duplicate check
    const currentFilenames = currentPhotosArray.map(photo => {
      const parts = photo.split('/');
      return parts[parts.length - 1];
    });
    
    // Filter out duplicates: remove photos that already exist
    const uniqueNewPhotos = newPhotos.filter(newPhoto => {
      const parts = newPhoto.split('/');
      const filename = parts[parts.length - 1];
      return !currentFilenames.includes(filename);
    });
    
    // Combine existing photos with new unique ones (max 9 photos)
    let updatedPhotos = [];
    if (Array.isArray(currentPhotosArray) && currentPhotosArray.length > 0) {
      updatedPhotos = [...currentPhotosArray, ...uniqueNewPhotos].slice(0, 9);
    } else {
      updatedPhotos = uniqueNewPhotos.slice(0, 9);
    }

    // Update user with new photos array (stored as JSON string)
    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: { photos: JSON.stringify(updatedPhotos) },
      select: {
        id: true,
        photos: true,
        updatedAt: true
      }
    });

    res.json({
      message: 'Gallery photos uploaded successfully',
      photos: updatedPhotos
    });

  } catch (error) {
    console.error('Upload gallery photos error:', error);
    res.status(500).json({ error: 'Internal server error during photo upload', details: error.message });
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

    // Parse photos from JSON string to array
    let photosArray = [];
    if (currentUser.photos) {
      try {
        photosArray = JSON.parse(currentUser.photos);
      } catch (e) {
        photosArray = [];
      }
    }

    // Check if photo exists in user's photos
    if (!Array.isArray(photosArray) || !photosArray.includes(photoUrl)) {
      return res.status(404).json({ error: 'Photo not found in your gallery' });
    }

    // Delete photo from Cloudinary
    const publicId = extractPublicId(photoUrl);
    if (publicId) {
      await deleteImage(publicId);
    }

    // Remove photo from user's photos array
    const updatedPhotos = photosArray.filter(photo => photo !== photoUrl);

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: { photos: JSON.stringify(updatedPhotos) },
      select: {
        id: true,
        photos: true,
        updatedAt: true
      }
    });

    res.json({
      message: 'Photo deleted successfully',
      photos: updatedPhotos
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