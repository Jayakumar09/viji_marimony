import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
  CircularProgress
} from '@mui/material';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';
import PasswordField from '../components/PasswordField';

const Register = () => {
  const navigate = useNavigate();
  const { register: registerUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { register, handleSubmit, watch, formState: { errors } } = useForm();

  const onSubmit = async (data) => {
    setLoading(true);
    setError('');

    try {
      const result = await registerUser({
        ...data,
        dateOfBirth: data.dateOfBirth,
        country: 'India',
        community: 'Boyar'
      });

      if (result.success) {
        toast.success('Registration successful!');
        navigate('/dashboard');
      } else {
        setError(result.error);
      }
    } catch (error) {
      setError('Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm" style={{ marginTop: '2rem' }}>
      <Paper elevation={3} style={{ padding: '2rem' }}>
        <Typography variant="h4" align="center" gutterBottom style={{ color: '#8B5CF6' }}>
          Register for Vijayalakshmi Boyar Matrimony
        </Typography>
        
        <Typography variant="body2" align="center" color="textSecondary" paragraph>
          Join our community to find your perfect life partner
        </Typography>

        {error && (
          <Alert severity="error" style={{ marginBottom: '1rem' }}>
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit(onSubmit)}>
          <Grid container spacing={3}>
            {/* Email */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Email Address"
                type="email"
                {...register('email', { 
                  required: 'Email is required',
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: 'Invalid email address'
                  }
                })}
                error={!!errors.email}
                helperText={errors.email?.message}
              />
            </Grid>

            {/* Password */}
            <Grid item xs={12}>
              <Typography variant="subtitle1" gutterBottom>
                Password *
              </Typography>
              <PasswordField
                name="password"
                register={register('password', { 
                  required: 'Password is required',
                  minLength: {
                    value: 8,
                    message: 'Password must be at least 8 characters'
                  },
                  pattern: {
                    value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/,
                    message: 'Password must contain uppercase, lowercase, number, and special character'
                  }
                })}
                error={!!errors.password}
                helperText={errors.password?.message}
                label="Password"
                showGenerator={true}
              />
            </Grid>

            {/* Name */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="First Name"
                {...register('firstName', { required: 'First name is required' })}
                error={!!errors.firstName}
                helperText={errors.firstName?.message}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Last Name"
                {...register('lastName', { required: 'Last name is required' })}
                error={!!errors.lastName}
                helperText={errors.lastName?.message}
              />
            </Grid>

            {/* Phone */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Phone Number"
                placeholder="+91XXXXXXXXXX"
                {...register('phone', { 
                  required: 'Phone number is required',
                  pattern: {
                    value: /^\+?[1-9]\d{9,14}$/,
                    message: 'Invalid phone number'
                  }
                })}
                error={!!errors.phone}
                helperText={errors.phone?.message}
              />
            </Grid>

            {/* Gender */}
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth error={!!errors.gender}>
                <InputLabel>Gender</InputLabel>
                <Select
                  {...register('gender', { required: 'Gender is required' })}
                  defaultValue=""
                >
                  <MenuItem value="">Select Gender</MenuItem>
                  <MenuItem value="MALE">Male</MenuItem>
                  <MenuItem value="FEMALE">Female</MenuItem>
                </Select>
                {errors.gender && (
                  <Typography variant="caption" color="error">
                    {errors.gender.message}
                  </Typography>
                )}
              </FormControl>
            </Grid>

            {/* Date of Birth */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Date of Birth"
                type="date"
                InputLabelProps={{ shrink: true }}
                {...register('dateOfBirth', { required: 'Date of birth is required' })}
                error={!!errors.dateOfBirth}
                helperText={errors.dateOfBirth?.message}
              />
            </Grid>

            {/* Location */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="City"
                {...register('city', { required: 'City is required' })}
                error={!!errors.city}
                helperText={errors.city?.message}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="State"
                {...register('state', { required: 'State is required' })}
                error={!!errors.state}
                helperText={errors.state?.message}
              />
            </Grid>

            {/* Marital Status */}
            <Grid item xs={12}>
              <FormControl fullWidth error={!!errors.maritalStatus}>
                <InputLabel>Marital Status</InputLabel>
                <Select
                  {...register('maritalStatus', { required: 'Marital status is required' })}
                  defaultValue=""
                >
                  <MenuItem value="">Select Marital Status</MenuItem>
                  <MenuItem value="SINGLE">Single</MenuItem>
                  <MenuItem value="DIVORCED">Divorced</MenuItem>
                  <MenuItem value="WIDOWED">Widowed</MenuItem>
                  <MenuItem value="SEPARATED">Separated</MenuItem>
                </Select>
                {errors.maritalStatus && (
                  <Typography variant="caption" color="error">
                    {errors.maritalStatus.message}
                  </Typography>
                )}
              </FormControl>
            </Grid>

            {/* Sub Caste */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Sub Caste (Optional)"
                placeholder="e.g., Kapu, Reddy, etc."
                {...register('subCaste')}
              />
            </Grid>

            {/* Submit Button */}
            <Grid item xs={12}>
              <Box display="flex" flexDirection="column" alignItems="center" gap={2}>
                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  size="large"
                  disabled={loading}
                  style={{ minWidth: '200px' }}
                >
                  {loading ? <CircularProgress size={24} /> : 'Register'}
                </Button>

                <Typography variant="body2">
                  Already have an account?{' '}
                  <Link to="/login" style={{ color: '#8B5CF6', textDecoration: 'none' }}>
                    Login here
                  </Link>
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </form>
      </Paper>
    </Container>
  );
};

export default Register;