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
  CardContent,
  CardMedia,
  CardActions,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Slider,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Divider
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
  ZoomOut,
  Verified,
  Star,
  Description,
  CheckCircle,
  Payment
} from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';
import profileService from '../services/profileService';
import paymentService from '../services/paymentService';
import toast from 'react-hot-toast';
import { compressImage, blobToFile } from '../utils/imageCompression';
import { STATES, getCitiesForState, MAX_GALLERY_IMAGES } from '../data/indianLocations';
import { getImageUrl } from '../utils/imageUrl';
import {
  RAASI_CHOICES,
  NATCHATHIRAM_CHOICES,
  DHOSAM_CHOICES,
  getNatchathiramForRasi,
  SUBSCRIPTION_TIERS
} from '../data/horoscopeData';

const DOCUMENT_TYPES = [
  { id: 'GOVERNMENT_ID', label: 'Government ID (Aadhaar, PAN, etc.)', required: true },
  { id: 'ADDRESS_PROOF', label: 'Proof of Current Address', required: true },
  { id: 'FINANCIAL_PROOF', label: 'Financial Verification (Bank Statement/ITR)', required: true },
  { id: 'PHOTO_ID', label: 'Photo ID Proof', required: true },
  { id: 'BIRTH_CERTIFICATE', label: 'Birth Certificate', required: false },
  { id: 'EDUCATION_CERTIFICATE', label: 'Education Certificate', required: false },
  { id: 'OTHER', label: 'Other Documents', required: false }
];

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

  // Tab state for profile sections
  const [activeTab, setActiveTab] = useState(0);

  // Editing states for different sections
  const [editingHoroscope, setEditingHoroscope] = useState(false);
  const [editingFamily, setEditingFamily] = useState(false);
  const [editingSubscription, setEditingSubscription] = useState(false);
  const [editingDocuments, setEditingDocuments] = useState(false);

  // Document upload dialog
  const [documentDialog, setDocumentDialog] = useState(false);
  const [selectedDocType, setSelectedDocType] = useState('');
  const [documentUploading, setDocumentUploading] = useState(false);
  const documentInputRef = useRef(null);

  // Cropper states
  const [imageToCrop, setImageToCrop] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [isCropDialogOpen, setIsCropDialogOpen] = useState(false);

  // Profile photo zoom/pan adjustment states
  const [isEditingPhoto, setIsEditingPhoto] = useState(false);
  const [photoScale, setPhotoScale] = useState(1);
  const [photoPosX, setPhotoPosX] = useState(0);
  const [photoPosY, setPhotoPosY] = useState(0);
  const [photoWrapper, setPhotoWrapper] = useState(null);
  const [photoImg, setPhotoImg] = useState(null);

  const { register, handleSubmit, reset, watch, control, formState: { errors }, setValue } = useForm();
  
  // Watch state and rasi fields for dependent dropdowns
  const selectedState = watch('state');
  const selectedRasi = watch('raasi');

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

  // Update natchathiram when rasi changes
  useEffect(() => {
    if (selectedRasi) {
      // Keep the current natchathiram if it belongs to the new rasi
      const currentNatchathiram = watch('natchathiram');
      const availableNatchathiram = getNatchathiramForRasi(selectedRasi);
      const isValidNatchathiram = availableNatchathiram.some(n => n.value === currentNatchathiram);
      if (!isValidNatchathiram) {
        setValue('natchathiram', '');
      }
    }
  }, [selectedRasi, setValue, watch]);

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
      normalized.gender = GENDER_MAP[apiUser.gender] || (apiUser.gender || '');
      normalized.maritalStatus = MARITAL_MAP[apiUser.maritalStatus] || (apiUser.maritalStatus || '');
      normalized.dateOfBirth = formatDateToInput(apiUser.dateOfBirth);
      
      // Ensure subscriptionTier defaults to FREE if null/undefined
      normalized.subscriptionTier = apiUser.subscriptionTier || 'FREE';

      ['income', 'complexion', 'familyValues', 'education', 'profession', 'country', 'city', 'state', 'bio', 'aboutFamily', 'raasi', 'natchathiram', 'dhosam', 'birthDate', 'birthTime', 'birthPlace'].forEach(key => {
        if (normalized[key] === null || typeof normalized[key] === 'undefined') normalized[key] = '';
      });

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
      
      const formatDateToInput = (d) => {
        if (!d) return '';
        const dt = new Date(d);
        if (isNaN(dt.getTime())) return '';
        const yyyy = dt.getFullYear();
        const mm = String(dt.getMonth() + 1).padStart(2, '0');
        const dd = String(dt.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
      };
      
      const normalized = { ...response.user };
      normalized.dateOfBirth = formatDateToInput(response.user.dateOfBirth);
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

  // ============ HOROSCOPE ============
  const handleUpdateHoroscope = async (data) => {
    try {
      setUploading(true);
      setError('');
      const response = await profileService.updateHoroscope(data);
      const updatedUser = response.user;
      setProfileData(prev => ({ ...prev, ...updatedUser }));
      setEditingHoroscope(false);
      setSuccess('Horoscope details updated successfully!');
      toast.success('Horoscope details updated!');
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to update horoscope');
    } finally {
      setUploading(false);
    }
  };

  // ============ FAMILY BACKGROUND ============
  const handleUpdateFamily = async (data) => {
    try {
      setUploading(true);
      setError('');
      const response = await profileService.updateFamilyBackground(data);
      const updatedUser = response.user;
      setProfileData(prev => ({ ...prev, ...updatedUser }));
      setEditingFamily(false);
      setSuccess('Family background updated successfully!');
      toast.success('Family background updated!');
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to update family background');
    } finally {
      setUploading(false);
    }
  };

  // ============ SUBSCRIPTION ============
  const handleUpdateSubscription = async (tier) => {
    // Free tier doesn't require payment
    if (tier === 'FREE') {
      try {
        setUploading(true);
        setError('');
        const response = await profileService.updateSubscription({ subscriptionTier: tier });
        const updatedUser = response.user;
        setProfileData(prev => ({ ...prev, ...updatedUser }));
        setSuccess(`Subscription updated to ${tier} successfully!`);
        toast.success(`Subscription updated to ${tier}!`);
      } catch (error) {
        setError(error.response?.data?.error || 'Failed to update subscription');
      } finally {
        setUploading(false);
      }
      return;
    }

    // For paid plans, redirect to PhonePe payment page
    navigate(`/subscription?plan=${tier}`);
  };

  // ============ DOCUMENTS ============
  const handleDocumentUpload = async (event) => {
    const file = event.target.files[0];
    if (!file || !selectedDocType) return;

    try {
      setDocumentUploading(true);
      const response = await profileService.uploadDocument(file, selectedDocType);
      setProfileData(prev => ({
        ...prev,
        documents: [...(prev.documents || []), response.document]
      }));
      setDocumentDialog(false);
      setSelectedDocType('');
      toast.success('Document uploaded successfully!');
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to upload document');
    } finally {
      setDocumentUploading(false);
    }
  };

  const handleDeleteDocument = async (docId) => {
    try {
      await profileService.deleteDocument(docId);
      setProfileData(prev => ({
        ...prev,
        documents: prev.documents.filter(d => d.id !== docId)
      }));
      toast.success('Document deleted successfully!');
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to delete document');
    }
  };

  // Cropper helpers
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

    ctx.drawImage(image, pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height, 0, 0, pixelCrop.width, pixelCrop.height);
    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), 'image/jpeg');
    });
  }, []);

  const onCropComplete = useCallback((_area, pixels) => {
    setCroppedAreaPixels(pixels);
  }, []);

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

  const handleConfirmCrop = async () => {
    if (!croppedAreaPixels) {
      toast.error('Please adjust the crop area');
      return;
    }

    try {
      setUploading(true);
      const croppedImageBlob = await getCroppedImg(imageToCrop, croppedAreaPixels);
      const compressedBlob = await compressImage(croppedImageBlob, 500 * 1024);
      const compressedFile = blobToFile(compressedBlob, 'profile.jpg');
      
      const response = await profileService.uploadProfilePhoto(compressedFile);
      setProfileData(prev => ({ ...prev, profilePhoto: response.profilePhoto }));
      updateUser({ ...user, profilePhoto: response.profilePhoto });
      
      setIsCropDialogOpen(false);
      setImageToCrop(null);
      setIsEditingPhoto(true);
      setPhotoScale(1);
      setPhotoPosX(0);
      setPhotoPosY(0);
      toast.success('Profile photo updated! Adjust zoom and position as needed.');
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to upload photo');
      toast.error('Failed to upload photo');
    } finally {
      setUploading(false);
    }
  };

  // ============ PROFILE PHOTO ZOOM/PAN ADJUSTMENTS ============
  const minScale = 0.5;
  const maxScale = 5;
  const zoomIntensity = 0.1;
  
  let isDragging = false;
  let startX = 0;
  let startY = 0;

  const handleZoomIn = () => {
    setPhotoScale(prev => Math.min(prev + zoomIntensity, maxScale));
  };

  const handleZoomOut = () => {
    setPhotoScale(prev => Math.max(prev - zoomIntensity, minScale));
  };

  const handleWheel = (e) => {
    if (!isEditingPhoto) return;
    e.preventDefault();
    
    const rect = photoWrapper.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const prevScale = photoScale;
    let newScale = photoScale;
    
    if (e.deltaY < 0) {
      newScale = Math.min(photoScale + zoomIntensity, maxScale);
    } else {
      newScale = Math.max(photoScale - zoomIntensity, minScale);
    }
    
    const scaleFactor = newScale / prevScale;
    
    setPhotoPosX(prevX => mouseX - (mouseX - prevX) * scaleFactor);
    setPhotoPosY(prevY => mouseY - (mouseY - prevY) * scaleFactor);
    setPhotoScale(newScale);
  };

  const handleMouseDown = (e) => {
    if (!isEditingPhoto) return;
    isDragging = true;
    startX = e.clientX - photoPosX;
    startY = e.clientY - photoPosY;
  };

  const handleMouseMove = (e) => {
    if (!isDragging || !isEditingPhoto) return;
    setPhotoPosX(e.clientX - startX);
    setPhotoPosY(e.clientY - startY);
  };

  const handleMouseUp = () => {
    isDragging = false;
  };

  const resetPhotoAdjustments = () => {
    setPhotoScale(1);
    setPhotoPosX(0);
    setPhotoPosY(0);
  };

  const savePhotoAdjustments = async () => {
    try {
      setUploading(true);
      const response = await profileService.saveProfilePhotoAdjustments({
        scale: photoScale,
        x: photoPosX,
        y: photoPosY
      });
      
      setProfileData(prev => ({
        ...prev,
        profilePhotoScale: response.user.profilePhotoScale,
        profilePhotoX: response.user.profilePhotoX,
        profilePhotoY: response.user.profilePhotoY
      }));
      
      setIsEditingPhoto(false);
      toast.success('Photo adjustments saved successfully!');
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to save adjustments');
      toast.error('Failed to save adjustments');
    } finally {
      setUploading(false);
    }
  };

  // Initialize photo adjustments from profile data
  useEffect(() => {
    if (profileData?.profilePhotoScale !== undefined) {
      setPhotoScale(profileData.profilePhotoScale || 1);
    }
    if (profileData?.profilePhotoX !== undefined) {
      setPhotoPosX(profileData.profilePhotoX || 0);
    }
    if (profileData?.profilePhotoY !== undefined) {
      setPhotoPosY(profileData.profilePhotoY || 0);
    }
  }, [profileData]);

  // Add/remove event listeners for photo editing
  useEffect(() => {
    if (photoWrapper) {
      if (isEditingPhoto) {
        photoWrapper.addEventListener('wheel', handleWheel, { passive: false });
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
      } else {
        photoWrapper.removeEventListener('wheel', handleWheel);
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      }
    }
    
    return () => {
      if (photoWrapper) {
        photoWrapper.removeEventListener('wheel', handleWheel);
      }
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isEditingPhoto, photoWrapper, photoPosX, photoPosY, photoScale]);

  // Handle photo upload - enable editing mode
  const handleNewPhotoUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImageToCrop(e.target.result);
        setCrop({ x: 0, y: 0 });
        setZoom(1);
        setIsCropDialogOpen(true);
      };
      reader.readAsDataURL(file);
    }
  };

  // Override handleProfilePhotoSelect to enable editing mode after upload
  const handleProfilePhotoSelectWrapper = (event) => {
    handleNewPhotoUpload(event);
  };

  const handleGalleryUpload = async (event) => {
    const files = Array.from(event.target.files);
    if (!files.length) return;

    if (isUploadingRef.current) return;

    const currentPhotos = profileData?.photos || [];
    if (currentPhotos.length + files.length > MAX_GALLERY_IMAGES) {
      setError(`Maximum ${MAX_GALLERY_IMAGES} photos allowed in gallery.`);
      return;
    }

    try {
      isUploadingRef.current = true;
      setUploading(true);
      setError('');
      
      const compressedFiles = [];
      for (const file of files) {
        const compressedBlob = await compressImage(file, 500 * 1024);
        const compressedFile = blobToFile(compressedBlob, file.name);
        compressedFiles.push(compressedFile);
      }
      
      const response = await profileService.uploadGalleryPhotos(compressedFiles);
      setProfileData(prev => ({ ...prev, photos: response.photos }));
      updateUser({ ...user, photos: response.photos });
      toast.success('Gallery photos uploaded successfully!');
      
      if (galleryInputRef.current) {
        galleryInputRef.current.value = '';
      }
    } catch (error) {
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

  const tabSections = [
    { label: 'Basic Info', icon: <Person /> },
    { label: 'Horoscope', icon: <Star /> },
    { label: 'Family', icon: <Person /> },
    { label: 'Subscription', icon: <Verified /> },
    { label: 'Documents', icon: <Description /> }
  ];

  return (
    <Container maxWidth="lg" style={{ marginTop: '2rem' }}>
      <Typography variant="h4" gutterBottom style={{ color: '#8B5CF6', fontWeight: 'bold' }}>
        My Profile
      </Typography>

      {error && (
        <Alert severity="error" style={{ marginBottom: '1rem' }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" style={{ marginBottom: '1rem' }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      {/* Tab Navigation */}
      <Paper elevation={3} style={{ marginBottom: '1rem' }}>
        <Tabs
          value={activeTab}
          onChange={(_, newValue) => setActiveTab(newValue)}
          variant="scrollable"
          scrollButtons="auto"
        >
          {tabSections.map((section, index) => (
            <Tab
              key={index}
              label={section.label}
              icon={section.icon}
              iconPosition="start"
            />
          ))}
        </Tabs>
      </Paper>

      <Grid container spacing={4}>
        {/* Profile Photo Section */}
        <Grid item xs={12} md={4}>
          <Paper elevation={3} style={{ padding: '2rem', textAlign: 'center' }}>
            <Typography variant="h6" gutterBottom>Profile Photo</Typography>
            
            <Box mb={2}>
              {profileData?.profilePhoto ? (
                <Box
                  id="photo-wrapper"
                  ref={setPhotoWrapper}
                  sx={{
                    width: 180,
                    height: 180,
                    margin: '0 auto',
                    borderRadius: '50%',
                    border: '4px solid #8B5CF6',
                    overflow: 'hidden',
                    bgcolor: '#f5f5f5',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: isEditingPhoto ? 'grab' : 'default',
                    position: 'relative',
                    '&:active': {
                      cursor: isEditingPhoto ? 'grabbing' : 'default'
                    }
                  }}
                >
                  <img
                    id="profileImage"
                    ref={setPhotoImg}
                    src={getImageUrl(profileData.profilePhoto)}
                    alt={profileData.firstName}
                    style={{
                      maxWidth: 'none',
                      transformOrigin: '0 0',
                      transform: `translate(${photoPosX}px, ${photoPosY}px) scale(${photoScale})`
                    }}
                    draggable={false}
                  />
                </Box>
              ) : (
                <Avatar
                  style={{ width: 150, height: 150, margin: '0 auto', backgroundColor: '#E0E0E0', fontSize: '4rem' }}
                >
                  <Person style={{ fontSize: '4rem', color: '#757575' }} />
                </Avatar>
              )}
            </Box>

            {/* Zoom Controls - Only visible when editing */}
            {isEditingPhoto && (
              <Box mb={2} display="flex" justifyContent="center" gap={1}>
                <IconButton 
                  onClick={() => handleZoomOut()}
                  size="small"
                  sx={{ bgcolor: '#8B5CF6', color: 'white', '&:hover': { bgcolor: '#7C3AED' } }}
                >
                  <ZoomOut />
                </IconButton>
                <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center' }}>
                  {Math.round(photoScale * 100)}%
                </Typography>
                <IconButton 
                  onClick={() => handleZoomIn()}
                  size="small"
                  sx={{ bgcolor: '#8B5CF6', color: 'white', '&:hover': { bgcolor: '#7C3AED' } }}
                >
                  <ZoomIn />
                </IconButton>
              </Box>
            )}

            <input
              accept="image/*"
              id="profile-photo-upload"
              type="file"
              hidden
              onChange={handleProfilePhotoSelectWrapper}
            />
            {!isEditingPhoto ? (
              <label htmlFor="profile-photo-upload">
                <Button
                  variant="contained"
                  component="span"
                  startIcon={uploading ? <CircularProgress size={20} color="inherit" /> : <CameraAlt />}
                  fullWidth
                  sx={{ bgcolor: '#8B5CF6', '&:hover': { bgcolor: '#7C3AED' } }}
                  disabled={uploading}
                >
                  {uploading ? 'Uploading...' : 'Change Photo'}
                </Button>
              </label>
            ) : (
              <Button
                variant="outlined"
                fullWidth
                onClick={() => {
                  setIsEditingPhoto(false);
                  // Reset to saved values from profileData
                  if (profileData?.profilePhotoScale !== undefined) {
                    setPhotoScale(profileData.profilePhotoScale || 1);
                  }
                  if (profileData?.profilePhotoX !== undefined) {
                    setPhotoPosX(profileData.profilePhotoX || 0);
                  }
                  if (profileData?.profilePhotoY !== undefined) {
                    setPhotoPosY(profileData.profilePhotoY || 0);
                  }
                }}
                disabled={uploading}
              >
                Cancel
              </Button>
            )}

            {/* Save/Reset Buttons - Only visible when editing */}
            {isEditingPhoto && (
              <Box mt={2} display="flex" gap={1}>
                <Button
                  variant="outlined"
                  fullWidth
                  onClick={resetPhotoAdjustments}
                  size="small"
                >
                  Reset
                </Button>
                <Button
                  variant="contained"
                  fullWidth
                  onClick={savePhotoAdjustments}
                  disabled={uploading}
                  sx={{ bgcolor: '#8B5CF6', '&:hover': { bgcolor: '#7C3AED' } }}
                  startIcon={uploading ? <CircularProgress size={16} color="inherit" /> : <Save />}
                >
                  {uploading ? 'Saving...' : 'Save'}
                </Button>
              </Box>
            )}

            {/* Verification Status */}
            <Box mt={3}>
              <Typography variant="subtitle2" gutterBottom>Verification Status</Typography>
              <Box display="flex" flexDirection="column" gap={1}>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Typography variant="body2">Email</Typography>
                  {profileData?.emailVerified ? (
                    <CheckCircle color="success" fontSize="small" />
                  ) : (
                    <Typography variant="body2" color="warning.main">Pending</Typography>
                  )}
                </Box>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Typography variant="body2">Phone</Typography>
                  {profileData?.phoneVerified ? (
                    <CheckCircle color="success" fontSize="small" />
                  ) : (
                    <Typography variant="body2" color="warning.main">Pending</Typography>
                  )}
                </Box>
              </Box>
            </Box>
          </Paper>
        </Grid>

        {/* Tab Content */}
        <Grid item xs={12} md={8}>
          {/* Basic Information Tab */}
          {activeTab === 0 && (
            <Paper elevation={3} style={{ padding: '2rem' }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h6">Profile Information</Typography>
                <Button
                  variant={editing ? "contained" : "outlined"}
                  startIcon={editing ? (uploading ? <CircularProgress size={20} color="inherit" /> : <Save />) : <Edit />}
                  onClick={() => editing ? handleSubmit(handleUpdateProfile)() : setEditing(true)}
                  sx={{ bgcolor: editing ? '#8B5CF6' : 'inherit', '&:hover': { bgcolor: editing ? '#7C3AED' : 'inherit' } }}
                  disabled={uploading}
                >
                  {uploading ? 'Saving...' : (editing ? 'Save' : 'Edit')}
                </Button>
              </Box>

              <form onSubmit={handleSubmit(handleUpdateProfile)}>
                <Grid container spacing={3}>
                  <Grid item xs={12} sm={6}>
                    <TextField fullWidth label="First Name" value={profileData?.firstName || ''} disabled variant={editing ? "outlined" : "filled"} />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField fullWidth label="Last Name" value={profileData?.lastName || ''} disabled variant={editing ? "outlined" : "filled"} />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth disabled={!editing}>
                      <InputLabel>Gender</InputLabel>
                      <Controller name="gender" control={control} defaultValue={profileData?.gender || ''} render={({ field }) => (
                        <Select {...field} label="Gender">
                          <MenuItem value="Male">Male</MenuItem>
                          <MenuItem value="Female">Female</MenuItem>
                          <MenuItem value="Other">Other</MenuItem>
                        </Select>
                      )} />
                    </FormControl>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <TextField fullWidth label="Date of Birth" type="date" {...register('dateOfBirth')} disabled={!editing} variant={editing ? "outlined" : "filled"} InputLabelProps={{ shrink: true }} defaultValue={profileData?.dateOfBirth || ''} />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <TextField fullWidth label="Email" value={profileData?.email || ''} disabled variant="filled" />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField fullWidth label="Phone" {...register('phone')} disabled={!editing} variant={editing ? "outlined" : "filled"} defaultValue={profileData?.phone || ''} />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth disabled={!editing}>
                      <InputLabel>State</InputLabel>
                      <Controller name="state" control={control} defaultValue={profileData?.state || ''} render={({ field }) => (
                        <Select {...field} label="State">
                          <MenuItem value="">Select State</MenuItem>
                          {STATES.map(state => <MenuItem key={state} value={state}>{state}</MenuItem>)}
                        </Select>
                      )} />
                    </FormControl>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth disabled={!editing || !selectedState}>
                      <InputLabel>City</InputLabel>
                      <Controller name="city" control={control} defaultValue={profileData?.city || ''} render={({ field }) => (
                        <Select {...field} label="City">
                          <MenuItem value="">Select City</MenuItem>
                          {availableCities.map(city => <MenuItem key={city} value={city}>{city}</MenuItem>)}
                        </Select>
                      )} />
                    </FormControl>
                  </Grid>

                  <Grid item xs={12}>
                    <TextField fullWidth label="Country" {...register('country')} disabled={!editing} variant={editing ? "outlined" : "filled"} defaultValue={profileData?.country || 'India'} />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth disabled={!editing}>
                      <InputLabel>Marital Status</InputLabel>
                      <Controller name="maritalStatus" control={control} defaultValue={profileData?.maritalStatus || ''} render={({ field }) => (
                        <Select {...field} label="Marital Status">
                          <MenuItem value="Never Married">Never Married</MenuItem>
                          <MenuItem value="Divorced">Divorced</MenuItem>
                          <MenuItem value="Widowed">Widowed</MenuItem>
                          <MenuItem value="Separated">Separated</MenuItem>
                        </Select>
                      )} />
                    </FormControl>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <TextField fullWidth label="Education" {...register('education')} disabled={!editing} variant={editing ? "outlined" : "filled"} placeholder="e.g., B.Tech Computer Science" defaultValue={profileData?.education || ''} />
                  </Grid>

                  <Grid item xs={12}>
                    <TextField fullWidth label="Profession" {...register('profession')} disabled={!editing} variant={editing ? "outlined" : "filled"} placeholder="e.g., Software Engineer" defaultValue={profileData?.profession || ''} />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth disabled={!editing}>
                      <InputLabel>Annual Income</InputLabel>
                      <Controller name="income" control={control} defaultValue={profileData?.income || ''} render={({ field }) => (
                        <Select {...field} label="Annual Income">
                          <MenuItem value="Below 3 Lakhs">Below 3 Lakhs</MenuItem>
                          <MenuItem value="3-6 Lakhs">3-6 Lakhs</MenuItem>
                          <MenuItem value="6-10 Lakhs">6-10 Lakhs</MenuItem>
                          <MenuItem value="10-15 Lakhs">10-15 Lakhs</MenuItem>
                          <MenuItem value="15-25 Lakhs">15-25 Lakhs</MenuItem>
                          <MenuItem value="Above 25 Lakhs">Above 25 Lakhs</MenuItem>
                        </Select>
                      )} />
                    </FormControl>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <TextField fullWidth label="Height (cm)" type="number" {...register('height')} disabled={!editing} variant={editing ? "outlined" : "filled"} defaultValue={profileData?.height || ''} />
                  </Grid>

                  <Grid item xs={12}>
                    <TextField fullWidth label="Bio" {...register('bio')} disabled={!editing} variant={editing ? "outlined" : "filled"} multiline rows={3} placeholder="Tell us about yourself..." defaultValue={profileData?.bio || ''} />
                  </Grid>

                  <Grid item xs={12}>
                    <TextField fullWidth label="About Family" {...register('aboutFamily')} disabled={!editing} variant={editing ? "outlined" : "filled"} multiline rows={3} placeholder="Tell us about your family..." defaultValue={profileData?.aboutFamily || ''} />
                  </Grid>
                </Grid>
              </form>
            </Paper>
          )}

          {/* Horoscope Tab */}
          {activeTab === 1 && (
            <Paper elevation={3} style={{ padding: '2rem' }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h6">Horoscope Details</Typography>
                <Button
                  variant={editingHoroscope ? "contained" : "outlined"}
                  startIcon={editingHoroscope ? (uploading ? <CircularProgress size={20} color="inherit" /> : <Save />) : <Edit />}
                  onClick={() => editingHoroscope ? handleSubmit(handleUpdateHoroscope)() : setEditingHoroscope(true)}
                  sx={{ bgcolor: editingHoroscope ? '#8B5CF6' : 'inherit', '&:hover': { bgcolor: editingHoroscope ? '#7C3AED' : 'inherit' } }}
                  disabled={uploading}
                >
                  {uploading ? 'Saving...' : (editingHoroscope ? 'Save' : 'Edit')}
                </Button>
              </Box>

              <form onSubmit={handleSubmit(handleUpdateHoroscope)}>
                <Grid container spacing={3}>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth disabled={!editingHoroscope}>
                      <InputLabel>Raasi (Moon Sign)</InputLabel>
                      <Controller name="raasi" control={control} defaultValue={profileData?.raasi || ''} render={({ field }) => (
                        <Select {...field} label="Raasi (Moon Sign)">
                          <MenuItem value="">Select Raasi</MenuItem>
                          {RAASI_CHOICES.map(rasi => (
                            <MenuItem key={rasi.value} value={rasi.value}>{rasi.label}</MenuItem>
                          ))}
                        </Select>
                      )} />
                    </FormControl>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth disabled={!editingHoroscope || !selectedRasi}>
                      <InputLabel>Natchathiram (Star)</InputLabel>
                      <Controller name="natchathiram" control={control} defaultValue={profileData?.natchathiram || ''} render={({ field }) => (
                        <Select {...field} label="Natchathiram (Star)">
                          <MenuItem value="">Select Natchathiram</MenuItem>
                          {getNatchathiramForRasi(selectedRasi || profileData?.raasi).map(n => (
                            <MenuItem key={n.value} value={n.value}>{n.label}</MenuItem>
                          ))}
                        </Select>
                      )} />
                    </FormControl>
                  </Grid>

                  

                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth disabled={!editingHoroscope}>
                      <InputLabel>Dhosam</InputLabel>
                      <Controller name="dhosam" control={control} defaultValue={profileData?.dhosam || ''} render={({ field }) => (
                        <Select {...field} label="Dhosam">
                          <MenuItem value="">Select Dhosam</MenuItem>
                          {DHOSAM_CHOICES.map(d => (
                            <MenuItem key={d.value} value={d.value}>{d.label}</MenuItem>
                          ))}
                        </Select>
                      )} />
                    </FormControl>
                  </Grid>

                  <Grid item xs={12} sm={4}>
                    <TextField fullWidth label="Birth Date" type="date" {...register('birthDate')} disabled={!editingHoroscope} variant={editingHoroscope ? "outlined" : "filled"} InputLabelProps={{ shrink: true }} defaultValue={profileData?.birthDate || ''} />
                  </Grid>

                  <Grid item xs={12} sm={4}>
                    <TextField fullWidth label="Birth Time" type="time" {...register('birthTime')} disabled={!editingHoroscope} variant={editingHoroscope ? "outlined" : "filled"} InputLabelProps={{ shrink: true }} defaultValue={profileData?.birthTime || ''} />
                  </Grid>

                  <Grid item xs={12} sm={4}>
                    <TextField fullWidth label="Birth Place" {...register('birthPlace')} disabled={!editingHoroscope} variant={editingHoroscope ? "outlined" : "filled"} defaultValue={profileData?.birthPlace || ''} />
                  </Grid>
                </Grid>
              </form>
            </Paper>
          )}

          {/* Family Background Tab */}
          {activeTab === 2 && (
            <Paper elevation={3} style={{ padding: '2rem' }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h6">Family Background</Typography>
                <Button
                  variant={editingFamily ? "contained" : "outlined"}
                  startIcon={editingFamily ? (uploading ? <CircularProgress size={20} color="inherit" /> : <Save />) : <Edit />}
                  onClick={() => editingFamily ? handleSubmit(handleUpdateFamily)() : setEditingFamily(true)}
                  sx={{ bgcolor: editingFamily ? '#8B5CF6' : 'inherit', '&:hover': { bgcolor: editingFamily ? '#7C3AED' : 'inherit' } }}
                  disabled={uploading}
                >
                  {uploading ? 'Saving...' : (editingFamily ? 'Save' : 'Edit')}
                </Button>
              </Box>

              <form onSubmit={handleSubmit(handleUpdateFamily)}>
                <Typography variant="subtitle1" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>Father's Details</Typography>
                <Grid container spacing={3}>
                  <Grid item xs={12} sm={4}>
                    <TextField fullWidth label="Father's Name" {...register('fatherName')} disabled={!editingFamily} variant={editingFamily ? "outlined" : "filled"} defaultValue={profileData?.fatherName || ''} />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField fullWidth label="Father's Occupation" {...register('fatherOccupation')} disabled={!editingFamily} variant={editingFamily ? "outlined" : "filled"} defaultValue={profileData?.fatherOccupation || ''} />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField fullWidth label="Father's Caste" {...register('fatherCaste')} disabled={!editingFamily} variant={editingFamily ? "outlined" : "filled"} defaultValue={profileData?.fatherCaste || ''} />
                  </Grid>
                </Grid>

                <Typography variant="subtitle1" gutterBottom sx={{ mt: 3, fontWeight: 'bold' }}>Mother's Details</Typography>
                <Grid container spacing={3}>
                  <Grid item xs={12} sm={4}>
                    <TextField fullWidth label="Mother's Name" {...register('motherName')} disabled={!editingFamily} variant={editingFamily ? "outlined" : "filled"} defaultValue={profileData?.motherName || ''} />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField fullWidth label="Mother's Occupation" {...register('motherOccupation')} disabled={!editingFamily} variant={editingFamily ? "outlined" : "filled"} defaultValue={profileData?.motherOccupation || ''} />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField fullWidth label="Mother's Caste" {...register('motherCaste')} disabled={!editingFamily} variant={editingFamily ? "outlined" : "filled"} defaultValue={profileData?.motherCaste || ''} />
                  </Grid>
                </Grid>
              </form>
            </Paper>
          )}

          {/* Subscription Tab */}
          {activeTab === 3 && (
            <Paper elevation={3} style={{ padding: '2rem' }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h6">Subscription Plans</Typography>
                <Chip 
                  label={`Current: ${profileData?.subscriptionTier || 'FREE'}`} 
                  color="success" 
                  size="small" 
                  icon={<CheckCircle />}
                  variant="outlined"
                />
              </Box>

              {profileData?.subscriptionEnd && profileData?.subscriptionTier !== 'FREE' && (
                <Alert severity="success" sx={{ mb: 3 }}>
                  Your <strong>{profileData.subscriptionTier}</strong> plan is active until {new Date(profileData.subscriptionEnd).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}.
                </Alert>
              )}

              <Alert severity="info" sx={{ mb: 3 }}>
                Success fee is applicable only when marriage is fixed through our platform. This follows the guidelines set by the Government of India for matrimonial services.
              </Alert>

              <Grid container spacing={3}>
                {SUBSCRIPTION_TIERS.map((plan, index) => {
                  const isCurrentPlan = (profileData?.subscriptionTier || 'FREE') === plan.id;
                  const planNumber = index + 1;
                  return (
                    <Grid item xs={12} sm={6} key={plan.id}>
                      <Card 
                        elevation={isCurrentPlan ? 8 : 2}
                        sx={{ 
                          border: isCurrentPlan ? '3px solid #4CAF50' : '1px solid #e0e0e0',
                          position: 'relative',
                          overflow: 'visible',
                          transition: 'all 0.3s ease',
                          transform: isCurrentPlan ? 'scale(1.02)' : 'scale(1)',
                          '&:hover': {
                            transform: 'scale(1.02)',
                            boxShadow: 6
                          }
                        }}
                      >
                        {isCurrentPlan && (
                          <Box
                            sx={{
                              position: 'absolute',
                              top: -12,
                              right: 16,
                              bgcolor: '#4CAF50',
                              color: 'white',
                              px: 2,
                              py: 0.5,
                              borderRadius: 2,
                              fontSize: '0.75rem',
                              fontWeight: 'bold',
                              boxShadow: 2,
                              zIndex: 1
                            }}
                          >
                            CURRENT PLAN
                          </Box>
                        )}
                        <CardContent sx={{ pt: isCurrentPlan ? 3 : 2 }}>
                          <Box display="flex" alignItems="center" gap={1}>
                            <Box
                              sx={{
                                width: 32,
                                height: 32,
                                borderRadius: '50%',
                                bgcolor: isCurrentPlan ? '#4CAF50' : '#8B5CF6',
                                color: 'white',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 'bold',
                                fontSize: '0.875rem',
                                mr: 1
                              }}
                            >
                              {planNumber}
                            </Box>
                            <Typography 
                              variant="h5" 
                              fontWeight="bold"
                              color={isCurrentPlan ? 'success.main' : 'inherit'}
                            >
                              {plan.name}
                            </Typography>
                            {isCurrentPlan && <CheckCircle color="success" />}
                          </Box>
                          <Typography variant="h4" fontWeight="bold" sx={{ mt: 1, ml: 5 }}>
                            ₹{plan.price}
                            <Typography component="span" variant="body2" color="textSecondary" fontWeight="normal">/year</Typography>
                          </Typography>
                          <Typography variant="body2" color="textSecondary" sx={{ ml: 5 }}>
                            Success Fee: ₹{plan.successFee.toLocaleString()}
                          </Typography>
                          <Divider sx={{ my: 2 }} />
                          <Box>
                            {plan.features.map((feature, idx) => (
                              <Typography key={idx} variant="body2" display="flex" alignItems="center" gap={1} sx={{ mb: 0.5 }}>
                                <CheckCircle fontSize="small" color="success" /> {feature}
                              </Typography>
                            ))}
                          </Box>
                          <Button
                            fullWidth
                            variant={isCurrentPlan ? "contained" : "outlined"}
                            color={isCurrentPlan ? "success" : "primary"}
                            sx={{ 
                              mt: 2,
                              py: 1.5,
                              bgcolor: isCurrentPlan ? '#4CAF50' : undefined,
                              '&:hover': {
                                bgcolor: isCurrentPlan ? '#388E3C' : undefined
                              }
                            }}
                            onClick={() => handleUpdateSubscription(plan.id)}
                            disabled={uploading || isCurrentPlan}
                            startIcon={uploading ? <CircularProgress size={20} color="inherit" /> : (isCurrentPlan ? <CheckCircle /> : null)}
                          >
                            {uploading ? 'Updating...' : (isCurrentPlan ? 'Current Plan' : 'Select Plan')}
                          </Button>
                        </CardContent>
                      </Card>
                    </Grid>
                  );
                })}
              </Grid>
            </Paper>
          )}

          {/* Documents Tab */}
          {activeTab === 4 && (
            <Paper elevation={3} style={{ padding: '2rem' }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h6">Mandatory Documents</Typography>
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={() => setDocumentDialog(true)}
                  sx={{ bgcolor: '#8B5CF6', '&:hover': { bgcolor: '#7C3AED' } }}
                >
                  Upload Document
                </Button>
              </Box>

              <Alert severity="info" sx={{ mb: 3 }}>
                Please upload the following documents for verification. All documents are kept confidential and never shared.
              </Alert>

              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Document Type</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Uploaded</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {DOCUMENT_TYPES.map((docType) => {
                      const uploadedDoc = profileData?.documents?.find(d => d.documentType === docType.id);
                      return (
                        <TableRow key={docType.id}>
                          <TableCell>
                            {docType.label}
                            {docType.required && <Typography variant="caption" color="error" display="block">Required</Typography>}
                          </TableCell>
                          <TableCell>
                            {uploadedDoc ? (
                              <Box display="flex" alignItems="center" gap={1}>
                                {uploadedDoc.status === 'APPROVED' ? (
                                  <CheckCircle color="success" fontSize="small" />
                                ) : uploadedDoc.status === 'REJECTED' ? (
                                  <Typography color="error" variant="body2">Rejected</Typography>
                                ) : (
                                  <Typography color="warning.main" variant="body2">Pending</Typography>
                                )}
                              </Box>
                            ) : (
                              <Typography variant="body2" color="textSecondary">Not uploaded</Typography>
                            )}
                          </TableCell>
                          <TableCell>{uploadedDoc ? new Date(uploadedDoc.uploadedAt).toLocaleDateString() : '-'}</TableCell>
                          <TableCell align="right">
                            {uploadedDoc ? (
                              <Button size="small" color="error" onClick={() => handleDeleteDocument(uploadedDoc.id)}>
                                Delete
                              </Button>
                            ) : (
                              <Button size="small" color="primary" onClick={() => { setSelectedDocType(docType.id); setDocumentDialog(true); }}>
                                Upload
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          )}
        </Grid>

        {/* Photo Gallery */}
        <Grid item xs={12}>
          <Paper elevation={3} style={{ padding: '2rem' }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
              <Typography variant="h6">Photo Gallery ({profileData?.photos?.length || 0}/{MAX_GALLERY_IMAGES})</Typography>
              <input accept="image/*" id="gallery-upload" type="file" multiple hidden ref={galleryInputRef} onChange={handleGalleryUpload} />
              <label htmlFor="gallery-upload">
                <Button variant="contained" component="span" startIcon={uploading ? <CircularProgress size={20} color="inherit" /> : <CloudUpload />} sx={{ bgcolor: '#8B5CF6', '&:hover': { bgcolor: '#7C3AED' } }} disabled={profileData?.photos?.length >= MAX_GALLERY_IMAGES}>
                  {uploading ? 'Uploading...' : 'Add Photos'}
                </Button>
              </label>
            </Box>

            {profileData?.photos?.length > 0 ? (
              <Grid container spacing={2}>
                {profileData.photos.map((photo, index) => (
                  <Grid item xs={12} sm={6} md={4} lg={3} key={index}>
                    <Card>
                      <CardMedia component="img" height="200" image={getImageUrl(photo)} alt={`Gallery photo ${index + 1}`} style={{ objectFit: 'cover' }} />
                      <CardActions>
                        <IconButton color="secondary" onClick={() => handleDeletePhoto(photo)} disabled={uploading}>
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
                <Typography variant="h6" color="textSecondary">No photos in gallery</Typography>
                <Typography variant="body2" color="textSecondary">Upload photos to showcase your personality</Typography>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Delete Photo Dialog */}
      <Dialog open={deleteDialog} onClose={() => setDeleteDialog(false)}>
        <DialogTitle>Delete Photo</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to delete this photo?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog(false)}>Cancel</Button>
          <Button onClick={confirmDeletePhoto} variant="contained" sx={{ bgcolor: '#EC4899', '&:hover': { bgcolor: '#DB2777' } }}>Delete</Button>
        </DialogActions>
      </Dialog>

      {/* Document Upload Dialog */}
      <Dialog open={documentDialog} onClose={() => setDocumentDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Upload Document</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Document Type</InputLabel>
            <Select value={selectedDocType} onChange={(e) => setSelectedDocType(e.target.value)} label="Document Type">
              {DOCUMENT_TYPES.map(doc => (
                <MenuItem key={doc.id} value={doc.id}>
                  {doc.label}
                  {doc.required && <Typography component="span" color="error" ml={1}>(Required)</Typography>}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <input accept="image/*,.pdf" id="document-upload" type="file" hidden ref={documentInputRef} onChange={handleDocumentUpload} />
          <label htmlFor="document-upload">
            <Button fullWidth variant="outlined" component="div" sx={{ mt: 3, py: 2, borderStyle: 'dashed' }}>
              {documentUploading ? <CircularProgress size={24} /> : 'Click to Upload Document'}
            </Button>
          </label>
          <Typography variant="caption" color="textSecondary" display="block" textAlign="center" mt={1}>
            Supported formats: Images (JPG, PNG) and PDF
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDocumentDialog(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>

      {/* Photo Cropper Dialog */}
      <Dialog open={isCropDialogOpen} onClose={() => setIsCropDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Adjust Profile Photo</DialogTitle>
        <DialogContent>
          <Box sx={{ position: 'relative', height: 400, bgcolor: '#1a1a1a', borderRadius: 1, overflow: 'hidden' }}>
            <Cropper image={imageToCrop} crop={crop} zoom={zoom} aspect={1} onCropChange={setCrop} onZoomChange={setZoom} onCropComplete={onCropComplete} cropShape="round" showGrid={false} />
          </Box>
          
          <Box sx={{ px: 2, mt: 2 }}>
            <Box display="flex" alignItems="center" gap={1}>
              <ZoomOut sx={{ color: '#666' }} />
              <Slider value={zoom} min={1} max={3} step={0.1} onChange={(e, newValue) => setZoom(newValue)} sx={{ color: '#8B5CF6' }} />
              <ZoomIn sx={{ color: '#666' }} />
            </Box>
            <Typography variant="caption" color="textSecondary" display="block" textAlign="center">Scroll or drag slider to zoom</Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setIsCropDialogOpen(false); setImageToCrop(null); }}>Cancel</Button>
          <Button onClick={handleConfirmCrop} variant="contained" disabled={uploading} sx={{ bgcolor: '#8B5CF6', '&:hover': { bgcolor: '#7C3AED' } }}>
            {uploading ? <CircularProgress size={24} color="inherit" /> : 'Save & Upload'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Profile;
