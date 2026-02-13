import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Box,
  Alert,
  CircularProgress
} from '@mui/material';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';
import PasswordField from '../components/PasswordField';

const ADMIN_EMAIL = 'vijayalakshmijayakumar45@gmail.com';

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { register, handleSubmit, formState: { errors } } = useForm();

  const onSubmit = async (data) => {
    setLoading(true);
    setError('');

    try {
      // Check if admin login
      if (data.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
        // Admin login
        const response = await fetch('/api/auth/admin/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: data.email, password: data.password })
        });
        
        const result = await response.json();
        
        if (response.ok) {
          localStorage.setItem('adminToken', result.token);
          localStorage.setItem('adminUser', JSON.stringify(result.admin));
          toast.success('Admin login successful!');
          navigate('/admin');
        } else {
          setError(result.error || 'Admin login failed');
        }
      } else {
        // Regular user login
        const result = await login(data.email, data.password);

        if (result.success) {
          toast.success('Login successful!');
          navigate('/dashboard');
        } else {
          setError(result.error);
        }
      }
    } catch (error) {
      setError('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm" style={{ marginTop: '4rem' }}>
      <Paper elevation={3} style={{ padding: '3rem' }}>
        <Box textAlign="center" mb={3}>
          <Typography variant="h4" gutterBottom style={{ color: '#8B5CF6', fontWeight: 'bold' }}>
            🏛️ Vijayalakshmi Boyar Matrimony
          </Typography>
          <Typography variant="h6" color="textSecondary">
            Welcome Back
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" style={{ marginBottom: '2rem' }}>
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit(onSubmit)}>
          <Box display="flex" flexDirection="column" gap={3}>
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
              variant="outlined"
              size="large"
            />

            <Typography variant="subtitle1" gutterBottom>
              Password *
            </Typography>
            <PasswordField
              name="password"
              register={register('password', { required: 'Password is required' })}
              error={!!errors.password}
              helperText={errors.password?.message}
              label="Password"
              showGenerator={false}
            />

            <Button
              type="submit"
              variant="contained"
              color="primary"
              size="large"
              disabled={loading}
              style={{ 
                padding: '1rem',
                fontSize: '1.1rem',
                fontWeight: 'bold'
              }}
            >
              {loading ? (
                <CircularProgress size={24} color="inherit" />
              ) : (
                'Login'
              )}
            </Button>

            <Box textAlign="center">
              <Typography variant="body2" color="textSecondary">
                Don't have an account?{' '}
                <Link 
                  to="/register" 
                  style={{ 
                    color: '#8B5CF6', 
                    textDecoration: 'none',
                    fontWeight: 'bold'
                  }}
                >
                  Register here
                </Link>
              </Typography>
            </Box>
          </Box>
        </form>

        <Box mt={4} p={2} bgcolor="#FAF7FF" borderRadius={2}>
          <Typography variant="body2" color="textSecondary" align="center">
            <strong>Contact Support:</strong><br />
            📧 info@vijayalakshmiboyarmatrimony.com<br />
            📞 +91 7639150271
          </Typography>
          <Box mt={2} p={2} bgcolor="#E8F5E9" borderRadius={2} border="1px solid #4CAF50">
            <Typography variant="subtitle2" color="#2E7D32" align="center" fontWeight="bold">
              🗝️ ADMIN LOGIN
            </Typography>
            <Typography variant="caption" color="textSecondary" display="block" textAlign="center" mt={1}>
              Email: vijayalakshmijayakumar45@gmail.com<br />
              Password: Admin@2061979
            </Typography>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
};

export default Login;