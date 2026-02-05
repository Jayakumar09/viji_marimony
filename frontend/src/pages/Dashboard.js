import React from 'react';
import { Box, Typography, Container, Paper, Grid, Button } from '@mui/material';
import { Person, Search, Message, FavoriteBorder } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const quickActions = [
    {
      icon: <Search style={{ fontSize: 40, color: '#8B5CF6' }} />,
      title: 'Search Profiles',
      description: 'Find compatible matches',
      action: () => navigate('/search')
    },
    {
      icon: <Person style={{ fontSize: 40, color: '#8B5CF6' }} />,
      title: 'My Profile',
      description: 'Update your profile',
      action: () => navigate('/profile')
    },
    {
      icon: <FavoriteBorder style={{ fontSize: 40, color: '#8B5CF6' }} />,
      title: 'Interests',
      description: 'View received interests',
      action: () => navigate('/interests')
    },
    {
      icon: <Message style={{ fontSize: 40, color: '#8B5CF6' }} />,
      title: 'Messages',
      description: 'Chat with matches',
      action: () => navigate('/messages')
    }
  ];

  const profileCompletion = () => {
    const fields = ['education', 'profession', 'bio', 'height', 'weight'];
    const completedFields = fields.filter(field => user?.[field]);
    return Math.round((completedFields.length / fields.length) * 100);
  };

  return (
    <Container maxWidth="lg" style={{ marginTop: '2rem' }}>
      <Typography variant="h4" gutterBottom style={{ color: '#8B5CF6', fontWeight: 'bold' }}>
        Welcome back, {user?.firstName}! 👋
      </Typography>

      <Grid container spacing={4}>
        {/* Profile Summary */}
        <Grid item xs={12} md={4}>
          <Paper elevation={3} style={{ padding: '2rem', textAlign: 'center' }}>
            <Typography variant="h6" gutterBottom>
              Profile Summary
            </Typography>
            <Box 
              width={120}
              height={120}
              borderRadius="50%"
              bgcolor="#FAF7FF"
              display="flex"
              alignItems="center"
              justifyContent="center"
              margin="0 auto 1rem"
            >
              <Person style={{ fontSize: 60, color: '#8B5CF6' }} />
            </Box>
            <Typography variant="h5" gutterBottom>
              {user?.firstName} {user?.lastName}
            </Typography>
            <Typography variant="body2" color="textSecondary" paragraph>
              {user?.city}, {user?.state}
            </Typography>
            <Typography variant="body2" color="textSecondary" paragraph>
              {user?.age} years • {user?.gender === 'MALE' ? 'Male' : 'Female'}
            </Typography>
            <Typography variant="body2" color="textSecondary" paragraph>
              Community: {user?.community}
            </Typography>
            <Button
              variant="contained"
              color="primary"
              onClick={() => navigate('/profile')}
              fullWidth
            >
              View Profile
            </Button>
          </Paper>
        </Grid>

        {/* Quick Actions */}
        <Grid item xs={12} md={8}>
          <Paper elevation={3} style={{ padding: '2rem' }}>
            <Typography variant="h6" gutterBottom>
              Quick Actions
            </Typography>
            <Grid container spacing={3}>
              {quickActions.map((action, index) => (
                <Grid item xs={12} sm={6} key={index}>
                  <Paper
                    elevation={2}
                    style={{
                      padding: '1.5rem',
                      textAlign: 'center',
                      cursor: 'pointer',
                      transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                    }}
                    onClick={action.action}
                    onMouseOver={(e) => {
                      e.currentTarget.style.transform = 'translateY(-5px)';
                      e.currentTarget.style.boxShadow = '0 8px 16px rgba(139, 92, 246, 0.2)';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
                    }}
                  >
                    <Box mb={1}>{action.icon}</Box>
                    <Typography variant="h6" gutterBottom>
                      {action.title}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      {action.description}
                    </Typography>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </Paper>
        </Grid>

        {/* Profile Completion */}
        <Grid item xs={12} md={6}>
          <Paper elevation={3} style={{ padding: '2rem' }}>
            <Typography variant="h6" gutterBottom>
              Profile Completion
            </Typography>
            <Typography variant="body2" color="textSecondary" paragraph>
              Complete your profile to get better matches
            </Typography>
            <Box 
              height={20}
              borderRadius={10}
              bgcolor="#E0E0E0"
              overflow="hidden"
              mb={1}
            >
              <Box 
                height="100%"
                width={`${profileCompletion()}%`}
                bgcolor="#8B5CF6"
                transition="width 0.3s ease"
              />
            </Box>
            <Typography variant="body2" align="center">
              {profileCompletion()}% Complete
            </Typography>
            <Button
              variant="text"
              color="primary"
              onClick={() => navigate('/profile')}
              style={{ marginTop: '1rem' }}
            >
              Complete Profile
            </Button>
          </Paper>
        </Grid>

        {/* Status */}
        <Grid item xs={12} md={6}>
          <Paper elevation={3} style={{ padding: '2rem' }}>
            <Typography variant="h6" gutterBottom>
              Account Status
            </Typography>
            <Box display="flex" flexDirection="column" gap={1}>
              <Box display="flex" justifyContent="space-between">
                <Typography variant="body2">Email Verified:</Typography>
                <Typography 
                  variant="body2" 
                  style={{ color: user?.emailVerified ? '#4CAF50' : '#FF9800' }}
                >
                  {user?.emailVerified ? '✅ Verified' : '⏳ Pending'}
                </Typography>
              </Box>
              <Box display="flex" justifyContent="space-between">
                <Typography variant="body2">Phone Verified:</Typography>
                <Typography 
                  variant="body2" 
                  style={{ color: user?.phoneVerified ? '#4CAF50' : '#FF9800' }}
                >
                  {user?.phoneVerified ? '✅ Verified' : '⏳ Pending'}
                </Typography>
              </Box>
              <Box display="flex" justifyContent="space-between">
                <Typography variant="body2">Profile Verified:</Typography>
                <Typography 
                  variant="body2" 
                  style={{ color: user?.isVerified ? '#4CAF50' : '#FF9800' }}
                >
                  {user?.isVerified ? '✅ Verified' : '⏳ Pending'}
                </Typography>
              </Box>
              <Box display="flex" justifyContent="space-between">
                <Typography variant="body2">Premium Member:</Typography>
                <Typography 
                  variant="body2" 
                  style={{ color: user?.isPremium ? '#4CAF50' : '#757575' }}
                >
                  {user?.isPremium ? '👑 Premium' : 'Free'}
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default Dashboard;