import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import Cropper from 'react-easy-crop';
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Alert,
  CircularProgress,
  Avatar,
  IconButton,
  Card,
  CardMedia,
  CardActions,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Slider
} from '@mui/material';
import {
  CloudUpload,
  Delete,
  Edit,
  Person,
  Save,
  CameraAlt,
  Add,
  ZoomIn,
  ZoomOut
} from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';
import profileService from '../services/profileService';
import toast from 'react-hot-toast';
import { compressImage, blobToFile } from '../utils/imageCompression';
import { STATES, getCitiesForState, MAX_GALLERY_IMAGES } from '../data/indianLocations';
import { getImageUrl } from '../utils/imageUrl';

const Profile = () => {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [profileData, setProfileData] = useState(null);
  const [editing, setEditing] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [photoToDelete, setPhotoToDelete] = useState('');
  const [availableCities, setAvailableCities] = useState([]);
  const galleryInputRef = useRef(null);
  const isUploadingRef = useRef(false);

  // Cropper states
  const [imageToCrop, setImageToCrop] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [isCropDialogOpen, setIsCropDialogOpen] = useState(false);

  const { register, handleSubmit, reset, watch, control, formState: { errors } } = useForm();
  
  // Watch state field to update cities
  const selectedState = watch('state');

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    fetchProfile();
  }, [user, navigate]);

  // Update available cities when state changes
  useEffect(() => {
    if (selectedState) {
      setAvailableCities(getCitiesForState(selectedState));
    }
  }, [selectedState]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await profileService.getProfile();
      const apiUser = response.user || {};

      const GENDER_MAP = { MALE: 'Male', FEMALE: 'Female', OTHER: 'Other', male: 'Male', female: 'Female' };
      const MARITAL_MAP = { SINGLE: 'Never Married', NEVER_MARRIED: 'Never Married', DIVORCED: 'Divorced', WIDOWED: 'Widowed', SEPARATED: 'Separated' };

      const formatDateToInput = (d) => {
        if (!d) return '';
        const dt = new Date(d);
        if (isNaN(dt.getTime())) return '';
        const yyyy = dt.getFullYear();
        const mm = String(dt.getMonth() + 1).padStart(2, '0');
        const dd = String(dt.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
      };

      const normalized = { ...apiUser };
      // normalize enumerations and nulls to values the UI expects
      normalized.gender = GENDER_MAP[apiUser.gender] || (apiUser.gender || '');
      normalized.maritalStatus = MARITAL_MAP[apiUser.maritalStatus] || (apiUser.maritalStatus || '');
      normalized.dateOfBirth = formatDateToInput(apiUser.dateOfBirth);

      // ensure other nullable selects/texts are empty strings instead of null
      ['income', 'complexion', 'familyValues', 'education', 'profession', 'country', 'city', 'state', 'bio', 'aboutFamily'].forEach(key => {
        if (normalized[key] === null || typeof normalized[key] === 'undefined') normalized[key] = '';
      });

      // prepare city options immediately so Select has the option available
      const stateForCities = normalized.state || apiUser.state || '';
      const citiesForState = stateForCities ? getCitiesForState(stateForCities) : [];
      if (apiUser.city && apiUser.city !== '' && !citiesForState.includes(apiUser.city)) {
        citiesForState.unshift(apiUser.city);
      }
      setAvailableCities(citiesForState);

      setProfileData(normalized);
      reset(normalized);
    } catch (error) {
      setError('Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (data) => {
    try {
      setUploading(true);
      setError('');
      setSuccess('');

      const response = await profileService.updateProfile(data);
      updateUser(response.user);
      // normalize updated user for consistent UI state
      const apiUser = response.user || {};
      const formatDateToInput = (d) => {
        if (!d) return '';
        const dt = new Date(d);
        if (isNaN(dt.getTime())) return '';
        const yyyy = dt.getFullYear();
        const mm = String(dt.getMonth() + 1).padStart(2, '0');
        const dd = String(dt.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
      };
      const normalized = { ...apiUser };
      normalized.dateOfBirth = formatDateToInput(apiUser.dateOfBirth);
      ['income', 'complexion', 'familyValues', 'education', 'profession', 'country', 'city', 'state', 'bio', 'aboutFamily', 'maritalStatus', 'gender'].forEach(key => {
        if (normalized[key] === null || typeof normalized[key] === 'undefined') normalized[key] = '';
      });
      setProfileData(normalized);
      setEditing(false);
      setSuccess('Profile updated successfully!');
      toast.success('Profile updated successfully!');
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to update profile');
    } finally {
      setUploading(false);
    }
  };

  // Helper function to create the cropped image
  const getCroppedImg = useCallback(async (imageSrc, pixelCrop) => {
    const image = await new Promise((resolve) => {
      const img = new Image();
      img.src = imageSrc;
      img.onload = () => resolve(img);
    });

    const canvas = document.createElement('canvas');
    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;
    const ctx = canvas.getContext('2d');

    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      pixelCrop.width,
      pixelCrop.height
    );

    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), 'image/jpeg');
    });
  }, []);

  // Handle crop complete
  const onCropComplete = useCallback((_area, pixels) => {
    setCroppedAreaPixels(pixels);
  }, []);

  // Handle profile photo selection - opens cropper
  const handleProfilePhotoSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        setImageToCrop(reader.result);
        setCrop({ x: 0, y: 0 });
        setZoom(1);
        setIsCropDialogOpen(true);
      };
    }
  };

  // Handle confirm crop and upload
  const handleConfirmCrop = async () => {
    if (!croppedAreaPixels) {
      toast.error('Please adjust the crop area');
      return;
    }

    try {
      setUploading(true);
      
      // Get the cropped image
      const croppedImageBlob = await getCroppedImg(imageToCrop, croppedAreaPixels);
      
      // Compress the cropped image
      const compressedBlob = await compressImage(croppedImageBlob, 500 * 1024);
      const compressedFile = blobToFile(compressedBlob, 'profile.jpg');
      
      // Upload
      const response = await profileService.uploadProfilePhoto(compressedFile);
      setProfileData(prev => ({ ...prev, profilePhoto: response.profilePhoto }));
      updateUser({ ...user, profilePhoto: response.profilePhoto });
      
      setIsCropDialogOpen(false);
      setImageToCrop(null);
      toast.success('Profile photo updated successfully!');
    } catch (error) {
      console.error('Photo upload error:', error);
      setError(error.response?.data?.error || 'Failed to upload photo');
      toast.error('Failed to upload photo');
    } finally {
      setUploading(false);
    }
  };

  const handleGalleryUpload = async (event) => {
    const files = Array.from(event.target.files);
    if (!files.length) return;

    // Prevent duplicate uploads
    if (isUploadingRef.current) {
      console.log('Upload already in progress, ignoring...');
      return;
    }

    // Check total photos won't exceed 9
    const currentPhotos = profileData?.photos || [];
    if (currentPhotos.length + files.length > MAX_GALLERY_IMAGES) {
      setError(`Maximum ${MAX_GALLERY_IMAGES} photos allowed in gallery. You have ${currentPhotos.length}.`);
      return;
    }

    try {
      isUploadingRef.current = true;
      setUploading(true);
      setError('');
      
      // Compress all files before upload
      const compressedFiles = [];
      for (const file of files) {
        const compressedBlob = await compressImage(file, 500 * 1024);
        const compressedFile = blobToFile(compressedBlob, file.name);
        compressedFiles.push(compressedFile);
      }
      
      const response = await profileService.uploadGalleryPhotos(compressedFiles);
      setProfileData(prev => ({ ...prev, photos: response.photos }));
      // Update user state without triggering cache invalidation
      updateUser({ ...user, photos: response.photos });
      toast.success('Gallery photos uploaded successfully!');
      
      // Clear the file input to prevent duplicate uploads
      if (galleryInputRef.current) {
        galleryInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Gallery upload error:', error);
      setError(error.response?.data?.error || 'Failed to upload photos');
      toast.error('Failed to upload photos');
    } finally {
      isUploadingRef.current = false;
      setUploading(false);
    }
  };

  const handleDeletePhoto = async (photoUrl) => {
    setPhotoToDelete(photoUrl);
    setDeleteDialog(true);
  };

  const confirmDeletePhoto = async () => {
    try {
      await profileService.deletePhoto(photoToDelete);
      const updatedPhotos = profileData.photos.filter(photo => photo !== photoToDelete);
      setProfileData(prev => ({ ...prev, photos: updatedPhotos }));
      updateUser({ ...user, photos: updatedPhotos });
      toast.success('Photo deleted successfully!');
      setDeleteDialog(false);
      setPhotoToDelete('');
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to delete photo');
    }
  };

  if (loading && !profileData) {
    return (
      <Container maxWidth="md" style={{ marginTop: '2rem' }}>
        <Box display="flex" justifyContent="center" alignItems="center" height="60vh">
          <CircularProgress size={60} />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" style={{ marginTop: '2rem' }}>
      <Typography variant="h4" gutterBottom style={{ color: '#8B5CF6', fontWeight: 'bold' }}>
        My Profile
      </Typography>

      {error && (
        <Alert severity="error" style={{ marginBottom: '1rem' }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" style={{ marginBottom: '1rem' }}>
          {success}
        </Alert>
      )}

      <Grid container spacing={4}>
        {/* Profile Photo Section */}
        <Grid item xs={12} md={4}>
          <Paper elevation={3} style={{ padding: '2rem', textAlign: 'center' }}>
            <Typography variant="h6" gutterBottom>
              Profile Photo
            </Typography>
            
            <Box mb={2}>
              {profileData?.profilePhoto ? (
                <Box
                  sx={{
                    width: 150,
                    height: 150,
                    margin: '0 auto',
                    borderRadius: '50%',
                    border: '4px solid #8B5CF6',
                    overflow: 'hidden',
                    bgcolor: '#f5f5f5',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <img
                    src={getImageUrl(profileData.profilePhoto)}
                    alt={profileData.firstName}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      objectPosition: 'center'
                    }}
                  />
                </Box>
              ) : (
                <Avatar
                  style={{
                    width: 150,
                    height: 150,
                    margin: '0 auto',
                    backgroundColor: '#E0E0E0',
                    fontSize: '4rem'
                  }}
                >
                  <Person style={{ fontSize: '4rem', color: '#757575' }} />
                </Avatar>
              )}
            </Box>

            <input
              accept="image/*"
              id="profile-photo-upload"
              type="file"
              hidden
              onChange={handleProfilePhotoSelect}
            />
            <label htmlFor="profile-photo-upload">
              <Button
                variant="contained"
                component="span"
                startIcon={uploading ? <CircularProgress size={20} color="inherit" /> : <CameraAlt />}
                fullWidth
                sx={{ bgcolor: '#8B5CF6', '&:hover': { bgcolor: '#7C3AED' } }}
              >
                {uploading ? 'Uploading...' : 'Change Photo'}
              </Button>
            </label>
          </Paper>
        </Grid>

        {/* Profile Information Section */}
        <Grid item xs={12} md={8}>
          <Paper elevation={3} style={{ padding: '2rem' }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
              <Typography variant="h6">
                Profile Information
              </Typography>
              <Button
                variant={editing ? "contained" : "outlined"}
                startIcon={editing ? (uploading ? <CircularProgress size={20} color="inherit" /> : <Save />) : <Edit />}
                onClick={() => {
                  if (editing) {
                    handleSubmit(handleUpdateProfile)();
                  } else {
                    setEditing(true);
                  }
                }}
                sx={{ 
                  bgcolor: editing ? '#8B5CF6' : 'inherit', 
                  '&:hover': { bgcolor: editing ? '#7C3AED' : 'inherit' },
                  '&.Mui-disabled': {
                    bgcolor: editing ? '#8B5CF6' : 'inherit',
                    opacity: editing ? 0.7 : 1
                  }
                }}
                disabled={uploading}
              >
                {uploading ? 'Saving...' : (editing ? 'Save' : 'Edit')}
              </Button>
            </Box>

            <form onSubmit={handleSubmit(handleUpdateProfile)}>
              <Grid container spacing={3}>
                {/* Basic Information */}
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="First Name"
                    value={profileData?.firstName || ''}
                    disabled
                    variant={editing ? "outlined" : "filled"}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Last Name"
                    value={profileData?.lastName || ''}
                    disabled
                    variant={editing ? "outlined" : "filled"}
                  />
                </Grid>

                {/* Gender */}
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth disabled={!editing}>
                    <InputLabel>Gender</InputLabel>
                    <Controller
                      name="gender"
                      control={control}
                      rules={{ required: editing && 'Gender is required' }}
                      defaultValue={profileData?.gender || ''}
                      render={({ field }) => (
                        <Select {...field} label="Gender">
                          <MenuItem value="">Select Gender</MenuItem>
                          <MenuItem value="Male">Male</MenuItem>
                          <MenuItem value="Female">Female</MenuItem>
                          <MenuItem value="Other">Other</MenuItem>
                        </Select>
                      )}
                    />
                  </FormControl>
                </Grid>

                {/* Date of Birth */}
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Date of Birth"
                    type="date"
                    {...register('dateOfBirth')}
                    disabled={!editing}
                    variant={editing ? "outlined" : "filled"}
                    InputLabelProps={{ shrink: true }}
                    defaultValue={profileData?.dateOfBirth || ''}
                  />
                </Grid>

                {/* Age */}
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Age"
                    type="number"
                    {...register('age')}
                    disabled={!editing}
                    variant={editing ? "outlined" : "filled"}
                    defaultValue={profileData?.age || ''}
                  />
                </Grid>

                {/* Email & Phone */}
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Email"
                    value={profileData?.email || ''}
                    disabled
                    variant="filled"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Phone"
                    {...register('phone')}
                    disabled={!editing}
                    variant={editing ? "outlined" : "filled"}
                    error={!!errors.phone}
                    helperText={errors.phone?.message}
                    defaultValue={profileData?.phone || ''}
                  />
                </Grid>

                {/* Location - State */}
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth disabled={!editing}>
                    <InputLabel>State</InputLabel>
                    <Controller
                      name="state"
                      control={control}
                      defaultValue={profileData?.state || ''}
                      render={({ field }) => (
                        <Select {...field} label="State">
                          <MenuItem value="">Select State</MenuItem>
                          {STATES.map(state => (
                            <MenuItem key={state} value={state}>{state}</MenuItem>
                          ))}
                        </Select>
                      )}
                    />
                  </FormControl>
                </Grid>

                {/* Location - City */}
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth disabled={!editing || !selectedState}>
                    <InputLabel>City</InputLabel>
                    <Controller
                      name="city"
                      control={control}
                      defaultValue={profileData?.city || ''}
                      render={({ field }) => (
                        <Select {...field} label="City">
                          <MenuItem value="">Select City</MenuItem>
                          {availableCities.map(city => (
                            <MenuItem key={city} value={city}>{city}</MenuItem>
                          ))}
                        </Select>
                      )}
                    />
                  </FormControl>
                </Grid>

                {/* Country */}
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Country"
                    {...register('country')}
                    disabled={!editing}
                    variant={editing ? "outlined" : "filled"}
                    defaultValue={profileData?.country || 'India'}
                  />
                </Grid>

                {/* Marital Status */}
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth disabled={!editing}>
                    <InputLabel>Marital Status</InputLabel>
                    <Controller
                      name="maritalStatus"
                      control={control}
                      defaultValue={profileData?.maritalStatus || ''}
                      render={({ field }) => (
                        <Select {...field} label="Marital Status">
                          <MenuItem value="">Select Status</MenuItem>
                          <MenuItem value="Never Married">Never Married</MenuItem>
                          <MenuItem value="Divorced">Divorced</MenuItem>
                          <MenuItem value="Widowed">Widowed</MenuItem>
                          <MenuItem value="Separated">Separated</MenuItem>
                        </Select>
                      )}
                    />
                  </FormControl>
                </Grid>

                {/* Education */}
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Education"
                    {...register('education')}
                    disabled={!editing}
                    variant={editing ? "outlined" : "filled"}
                    placeholder="e.g., B.Tech Computer Science"
                    defaultValue={profileData?.education || ''}
                  />
                </Grid>

                {/* Profession */}
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Profession"
                    {...register('profession')}
                    disabled={!editing}
                    variant={editing ? "outlined" : "filled"}
                    placeholder="e.g., Software Engineer"
                    defaultValue={profileData?.profession || ''}
                  />
                </Grid>

                {/* Annual Income */}
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth disabled={!editing}>
                    <InputLabel>Annual Income</InputLabel>
                    <Controller
                      name="income"
                      control={control}
                      defaultValue={profileData?.income || ''}
                      render={({ field }) => (
                        <Select {...field} label="Annual Income">
                          <MenuItem value="">Select Income Range</MenuItem>
                          <MenuItem value="Below 3 Lakhs">Below 3 Lakhs</MenuItem>
                          <MenuItem value="3-6 Lakhs">3-6 Lakhs</MenuItem>
                          <MenuItem value="6-10 Lakhs">6-10 Lakhs</MenuItem>
                          <MenuItem value="10-15 Lakhs">10-15 Lakhs</MenuItem>
                          <MenuItem value="15-25 Lakhs">15-25 Lakhs</MenuItem>
                          <MenuItem value="Above 25 Lakhs">Above 25 Lakhs</MenuItem>
                        </Select>
                      )}
                    />
                  </FormControl>
                </Grid>

                {/* Height */}
                <Grid item xs={12} sm={3}>
                  <TextField
                    fullWidth
                    label="Height (cm)"
                    type="number"
                    {...register('height')}
                    disabled={!editing}
                    variant={editing ? "outlined" : "filled"}
                    placeholder="e.g., 175"
                    defaultValue={profileData?.height || ''}
                  />
                </Grid>

                {/* Weight */}
                <Grid item xs={12} sm={3}>
                  <TextField
                    fullWidth
                    label="Weight (kg)"
                    type="number"
                    {...register('weight')}
                    disabled={!editing}
                    variant={editing ? "outlined" : "filled"}
                    placeholder="e.g., 72"
                    defaultValue={profileData?.weight || ''}
                  />
                </Grid>

                {/* Complexion */}
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth disabled={!editing}>
                    <InputLabel>Complexion</InputLabel>
                    <Controller
                      name="complexion"
                      control={control}
                      defaultValue={profileData?.complexion || ''}
                      render={({ field }) => (
                        <Select {...field} label="Complexion">
                          <MenuItem value="">Select Complexion</MenuItem>
                          <MenuItem value="Very Fair">Very Fair</MenuItem>
                          <MenuItem value="Fair">Fair</MenuItem>
                          <MenuItem value="Wheatish">Wheatish</MenuItem>
                          <MenuItem value="Wheatish Brown">Wheatish Brown</MenuItem>
                          <MenuItem value="Dark">Dark</MenuItem>
                        </Select>
                      )}
                    />
                  </FormControl>
                </Grid>

                {/* Bio */}
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Bio"
                    {...register('bio')}
                    disabled={!editing}
                    variant={editing ? "outlined" : "filled"}
                    multiline
                    rows={3}
                    placeholder="Tell us about yourself..."
                    defaultValue={profileData?.bio || ''}
                  />
                </Grid>

                {/* Family Values */}
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth disabled={!editing}>
                    <InputLabel>Family Values</InputLabel>
                    <Controller
                      name="familyValues"
                      control={control}
                      defaultValue={profileData?.familyValues || ''}
                      render={({ field }) => (
                        <Select {...field} label="Family Values">
                          <MenuItem value="">Select Family Values</MenuItem>
                          <MenuItem value="Traditional">Traditional</MenuItem>
                          <MenuItem value="Moderate">Moderate</MenuItem>
                          <MenuItem value="Liberal">Liberal</MenuItem>
                        </Select>
                      )}
                    />
                  </FormControl>
                </Grid>

                {/* About Family */}
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="About Family"
                    {...register('aboutFamily')}
                    disabled={!editing}
                    variant={editing ? "outlined" : "filled"}
                    multiline
                    rows={3}
                    placeholder="Tell us about your family..."
                    defaultValue={profileData?.aboutFamily || ''}
                  />
                </Grid>
              </Grid>
            </form>
          </Paper>
        </Grid>

        {/* Photo Gallery */}
        <Grid item xs={12}>
          <Paper elevation={3} style={{ padding: '2rem' }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
              <Typography variant="h6">
                Photo Gallery ({profileData?.photos?.length || 0}/{MAX_GALLERY_IMAGES})
              </Typography>
              <input
                accept="image/*"
                id="gallery-upload"
                type="file"
                multiple
                hidden
                ref={galleryInputRef}
                onChange={handleGalleryUpload}
              />
              <label htmlFor="gallery-upload">
                <Button
                  variant="contained"
                  component="span"
                  startIcon={uploading ? <CircularProgress size={20} color="inherit" /> : <CloudUpload />}
                  disabled={profileData?.photos?.length >= MAX_GALLERY_IMAGES}
                  sx={{ bgcolor: '#8B5CF6', '&:hover': { bgcolor: '#7C3AED' } }}
                >
                  {uploading ? 'Uploading...' : 'Add Photos'}
                </Button>
              </label>
            </Box>

            {profileData?.photos?.length > 0 ? (
              <Grid container spacing={2}>
                {profileData.photos.map((photo, index) => (
                  <Grid item xs={12} sm={6} md={4} lg={3} key={index}>
                    <Card>
                      <CardMedia
                        component="img"
                        height="200"
                        image={getImageUrl(photo)}
                        alt={`Gallery photo ${index + 1}`}
                        style={{ objectFit: 'cover' }}
                      />
                      <CardActions>
                        <IconButton
                          color="secondary"
                          onClick={() => handleDeletePhoto(photo)}
                          disabled={uploading}
                        >
                          {uploading ? <CircularProgress size={24} /> : <Delete />}
                        </IconButton>
                      </CardActions>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            ) : (
              <Box textAlign="center" py={4}>
                <CloudUpload style={{ fontSize: 60, color: '#E0E0E0' }} />
                <Typography variant="h6" color="textSecondary" gutterBottom>
                  No photos in gallery
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Upload up to {MAX_GALLERY_IMAGES} photos to showcase your personality
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Delete Photo Dialog */}
      <Dialog open={deleteDialog} onClose={() => setDeleteDialog(false)}>
        <DialogTitle>Delete Photo</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this photo? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setDeleteDialog(false)} 
            sx={{ color: '#666' }}
          >
            Cancel
          </Button>
          <Button 
            onClick={confirmDeletePhoto} 
            variant="contained"
            sx={{ bgcolor: '#EC4899', '&:hover': { bgcolor: '#DB2777' } }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Photo Cropper Dialog */}
      <Dialog 
        open={isCropDialogOpen} 
        onClose={() => setIsCropDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Adjust Profile Photo</DialogTitle>
        <DialogContent>
          <Box 
            sx={{ 
              position: 'relative', 
              height: 400, 
              bgcolor: '#1a1a1a',
              borderRadius: 1,
              overflow: 'hidden'
            }}
          >
            <Cropper
              image={imageToCrop}
              crop={crop}
              zoom={zoom}
              aspect={1}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
              cropShape="round"
              showGrid={false}
            />
          </Box>
          
          {/* Zoom Controls */}
          <Box sx={{ px: 2, mt: 2 }}>
            <Box display="flex" alignItems="center" gap={1}>
              <ZoomOut sx={{ color: '#666' }} />
              <Slider
                value={zoom}
                min={1}
                max={3}
                step={0.1}
                onChange={(e, newValue) => setZoom(newValue)}
                sx={{ color: '#8B5CF6' }}
              />
              <ZoomIn sx={{ color: '#666' }} />
            </Box>
            <Typography variant="caption" color="textSecondary" display="block" textAlign="center">
              Scroll or drag slider to zoom • Drag image to position
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => {
              setIsCropDialogOpen(false);
              setImageToCrop(null);
            }}
            sx={{ color: '#666' }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleConfirmCrop} 
            variant="contained"
            disabled={uploading}
            sx={{ bgcolor: '#8B5CF6', '&:hover': { bgcolor: '#7C3AED' } }}
          >
            {uploading ? <CircularProgress size={24} color="inherit" /> : 'Save & Upload'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Profile;
