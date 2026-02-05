import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
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
} from '@material-ui/core';
import {
  CloudUpload,
  Delete,
  Edit,
  Person,
  Save,
  CameraAlt
} from '@material-ui/icons';
import { useAuth } from '../hooks/useAuth';
import profileService from '../services/profileService';
import toast from 'react-hot-toast';

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

  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    fetchProfile();
  }, [user, navigate]);

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

    if (file.size > 5 * 1024 * 1024) {
      setError('Photo size must be less than 5MB');
      return;
    }

    try {
      setUploading(true);
      const response = await profileService.uploadProfilePhoto(file);
      setProfileData(prev => ({ ...prev, profilePhoto: response.profilePhoto }));
      updateUser({ ...user, profilePhoto: response.profilePhoto });
      toast.success('Profile photo uploaded successfully!');
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to upload photo');
    } finally {
      setUploading(false);
    }
  };

  const handleGalleryUpload = async (event) => {
    const files = Array.from(event.target.files);
    if (!files.length) return;

    // Check total photos won't exceed 6
    const currentPhotos = profileData?.photos || [];
    if (currentPhotos.length + files.length > 6) {
      setError('Maximum 6 photos allowed in gallery');
      return;
    }

    try {
      setUploading(true);
      const response = await profileService.uploadGalleryPhotos(files);
      setProfileData(prev => ({ ...prev, photos: response.photos }));
      updateUser({ ...user, photos: response.photos });
      toast.success('Gallery photos uploaded successfully!');
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to upload photos');
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
                  />
                </Grid>

                {/* Location */}
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="City"
                    value={profileData?.city || ''}
                    disabled
                    variant="filled"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="State"
                    value={profileData?.state || ''}
                    disabled
                    variant="filled"
                  />
                </Grid>

                {/* Professional Details */}
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Education"
                    {...register('education')}
                    disabled={!editing}
                    variant={editing ? "outlined" : "filled"}
                    placeholder="e.g., B.Tech Computer Science"
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Profession"
                    {...register('profession')}
                    disabled={!editing}
                    variant={editing ? "outlined" : "filled"}
                    placeholder="e.g., Software Engineer"
                  />
                </Grid>
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>Annual Income</InputLabel>
                    <Select
                      {...register('income')}
                      disabled={!editing}
                      value={profileData?.income || ''}
                      onChange={(e) => {
                        if (editing) {
                          setProfileData(prev => ({ ...prev, income: e.target.value }));
                        }
                      }}
                    >
                      <MenuItem value="">Select Income Range</MenuItem>
                      <MenuItem value="Below 3 Lakhs">Below 3 Lakhs</MenuItem>
                      <MenuItem value="3-6 Lakhs">3-6 Lakhs</MenuItem>
                      <MenuItem value="6-10 Lakhs">6-10 Lakhs</MenuItem>
                      <MenuItem value="10-15 Lakhs">10-15 Lakhs</MenuItem>
                      <MenuItem value="15-25 Lakhs">15-25 Lakhs</MenuItem>
                      <MenuItem value="Above 25 Lakhs">Above 25 Lakhs</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                {/* Physical Details */}
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label="Height (cm)"
                    {...register('height')}
                    disabled={!editing}
                    variant={editing ? "outlined" : "filled"}
                    placeholder="e.g., 175"
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label="Weight (kg)"
                    {...register('weight')}
                    disabled={!editing}
                    variant={editing ? "outlined" : "filled"}
                    placeholder="e.g., 72"
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <FormControl fullWidth>
                    <InputLabel>Complexion</InputLabel>
                    <Select
                      {...register('complexion')}
                      disabled={!editing}
                      value={profileData?.complexion || ''}
                      onChange={(e) => {
                        if (editing) {
                          setProfileData(prev => ({ ...prev, complexion: e.target.value }));
                        }
                      }}
                    >
                      <MenuItem value="">Select Complexion</MenuItem>
                      <MenuItem value="Very Fair">Very Fair</MenuItem>
                      <MenuItem value="Fair">Fair</MenuItem>
                      <MenuItem value="Wheatish">Wheatish</MenuItem>
                      <MenuItem value="Wheatish Brown">Wheatish Brown</MenuItem>
                      <MenuItem value="Dark">Dark</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                {/* Community Details */}
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Sub-Caste"
                    {...register('subCaste')}
                    disabled={!editing}
                    variant={editing ? "outlined" : "filled"}
                    placeholder="e.g., Kapu, Reddy, etc."
                  />
                </Grid>

                {/* Personal Information */}
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
                  />
                </Grid>

                {/* Family Information */}
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>Family Values</InputLabel>
                    <Select
                      {...register('familyValues')}
                      disabled={!editing}
                      value={profileData?.familyValues || ''}
                      onChange={(e) => {
                        if (editing) {
                          setProfileData(prev => ({ ...prev, familyValues: e.target.value }));
                        }
                      }}
                    >
                      <MenuItem value="">Select Family Values</MenuItem>
                      <MenuItem value="Traditional">Traditional</MenuItem>
                      <MenuItem value="Moderate">Moderate</MenuItem>
                      <MenuItem value="Liberal">Liberal</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

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
                Photo Gallery ({profileData?.photos?.length || 0}/6)
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
                  disabled={uploading || (profileData?.photos?.length >= 6)}
                >
                  Add Photos
                </Button>
              </label>
            </Box>

            {profileData?.photos?.length > 0 ? (
              <Grid container spacing={2}>
                {profileData.photos.map((photo, index) => (
                  <Grid item xs={12} sm={6} md={4} key={index}>
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
                  Upload up to 6 photos to showcase your personality
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