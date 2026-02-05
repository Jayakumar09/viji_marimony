import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
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
  DialogActions
} from '@mui/material';
import {
  CloudUpload,
  Delete,
  Edit,
  Person,
  Save,
  CameraAlt
} from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';
import profileService from '../services/profileService';
import toast from 'react-hot-toast';
import { compressImage, blobToFile } from '../utils/imageCompression';
import { STATES, getCitiesForState, MAX_GALLERY_IMAGES } from '../data/indianLocations';

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
      setProfileData(response.user);
      reset(response.user);
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
      setProfileData(response.user);
      setEditing(false);
      setSuccess('Profile updated successfully!');
      toast.success('Profile updated successfully!');
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to update profile');
    } finally {
      setUploading(false);
    }
  };

  const handleProfilePhotoUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      setUploading(true);
      setError('');
      
      // Compress image to less than 50KB
      const compressedBlob = await compressImage(file, 50 * 1024);
      const compressedFile = blobToFile(compressedBlob, file.name);
      
      const response = await profileService.uploadProfilePhoto(compressedFile);
      setProfileData(prev => ({ ...prev, profilePhoto: response.profilePhoto }));
      updateUser({ ...user, profilePhoto: response.profilePhoto });
      toast.success('Profile photo uploaded successfully!');
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

    // Check total photos won't exceed 9
    const currentPhotos = profileData?.photos || [];
    if (currentPhotos.length + files.length > MAX_GALLERY_IMAGES) {
      setError(`Maximum ${MAX_GALLERY_IMAGES} photos allowed in gallery. You have ${currentPhotos.length}.`);
      return;
    }

    try {
      setUploading(true);
      setError('');
      
      // Compress all files before upload
      const compressedFiles = [];
      for (const file of files) {
        const compressedBlob = await compressImage(file, 50 * 1024);
        const compressedFile = blobToFile(compressedBlob, file.name);
        compressedFiles.push(compressedFile);
      }
      
      const response = await profileService.uploadGalleryPhotos(compressedFiles);
      setProfileData(prev => ({ ...prev, photos: response.photos }));
      updateUser({ ...user, photos: response.photos });
      toast.success('Gallery photos uploaded successfully!');
    } catch (error) {
      console.error('Gallery upload error:', error);
      setError(error.response?.data?.error || 'Failed to upload photos');
      toast.error('Failed to upload photos');
    } finally {
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
                <Avatar
                  src={profileData.profilePhoto}
                  alt={profileData.firstName}
                  style={{
                    width: 150,
                    height: 150,
                    margin: '0 auto',
                    border: '4px solid #8B5CF6'
                  }}
                />
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
              onChange={handleProfilePhotoUpload}
            />
            <label htmlFor="profile-photo-upload">
              <Button
                variant="contained"
                color="primary"
                component="span"
                startIcon={<CameraAlt />}
                disabled={uploading}
                fullWidth
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
                color="primary"
                startIcon={editing ? <Save /> : <Edit />}
                onClick={() => {
                  if (editing) {
                    handleSubmit(handleUpdateProfile)();
                  } else {
                    setEditing(true);
                  }
                }}
                disabled={uploading}
              >
                {editing ? 'Save' : 'Edit'}
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
                onChange={handleGalleryUpload}
              />
              <label htmlFor="gallery-upload">
                <Button
                  variant="contained"
                  color="primary"
                  component="span"
                  startIcon={<CloudUpload />}
                  disabled={uploading || (profileData?.photos?.length >= MAX_GALLERY_IMAGES)}
                >
                  Add Photos
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
                        image={photo}
                        alt={`Gallery photo ${index + 1}`}
                        style={{ objectFit: 'cover' }}
                      />
                      <CardActions>
                        <IconButton
                          color="secondary"
                          onClick={() => handleDeletePhoto(photo)}
                          disabled={uploading}
                        >
                          <Delete />
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
          <Button onClick={() => setDeleteDialog(false)} color="default">
            Cancel
          </Button>
          <Button onClick={confirmDeletePhoto} color="secondary" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Profile;