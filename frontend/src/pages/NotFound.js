import React from 'react';
import { Box, Typography, Button, Container } from '@material-ui/core';
import { Home } from '@material-ui/icons';
import { useNavigate } from 'react-router-dom';

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <Container maxWidth="sm">
      <Box 
        display="flex" 
        flexDirection="column" 
        alignItems="center" 
        justifyContent="center" 
        minHeight="60vh"
        textAlign="center"
      >
        <Typography variant="h1" style={{ fontSize: '6rem', color: '#8B5CF6', fontWeight: 'bold' }}>
          404
        </Typography>
        <Typography variant="h4" gutterBottom>
          Page Not Found
        </Typography>
        <Typography variant="body1" color="textSecondary" paragraph>
          The page you're looking for doesn't exist or has been moved.
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<Home />}
          onClick={() => navigate('/')}
          style={{ marginTop: '1rem' }}
        >
          Go Home
        </Button>
      </Box>
    </Container>
  );
};

export default NotFound;