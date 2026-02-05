import api from './api';

export const profileService = {
  // Get user profile
  getProfile: async () => {
    const response = await api.get('/profile');
    return response.data;
  },

  // Update profile
  updateProfile: async (profileData) => {
    const response = await api.put('/profile', profileData);
    return response.data;
  },

  // Upload profile photo
  uploadProfilePhoto: async (file) => {
    const formData = new FormData();
    formData.append('photo', file);
    
    const response = await api.post('/profile/photo', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Upload gallery photos
  uploadGalleryPhotos: async (files) => {
    const formData = new FormData();
    files.forEach((file, index) => {
      formData.append('photos', file);
    });
    
    const response = await api.post('/profile/photos', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Delete photo
  deletePhoto: async (photoUrl) => {
    const response = await api.delete('/profile/photo', {
      data: { photoUrl }
    });
    return response.data;
  }
};

export default profileService;