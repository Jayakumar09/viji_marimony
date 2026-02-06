import React from 'react';
import { AppBar, Toolbar, Typography, Button, Box, IconButton, Menu, MenuItem, Badge } from '@mui/material';
import { AccountCircle, Search, Message, FavoriteBorder, Verified, AdminPanelSettings } from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [anchorEl, setAnchorEl] = React.useState(null);

  // Simple admin check
  const isAdmin = user?.email?.toLowerCase().includes('admin') || 
                  user?.email === 'info@vijayalakshmiboyarmatrimony.com';

  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    logout();
    handleMenuClose();
    navigate('/');
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <AppBar position="fixed" style={{ backgroundColor: '#8B5CF6' }}>
      <Toolbar>
        <Typography 
          variant="h6" 
          style={{ flexGrow: 1, cursor: 'pointer' }}
          onClick={() => navigate('/')}
        >
          🏛️ Vijayalakshmi Boyar Matrimony
        </Typography>

        {user ? (
          <Box display="flex" alignItems="center" gap={2}>
            <Button 
              color="inherit" 
              startIcon={<Search />}
              onClick={() => navigate('/search')}
              style={{ backgroundColor: isActive('/search') ? 'rgba(255,255,255,0.2)' : 'transparent' }}
            >
              Search
            </Button>
            <Button 
              color="inherit" 
              startIcon={<FavoriteBorder />}
              onClick={() => navigate('/interests')}
              style={{ backgroundColor: isActive('/interests') ? 'rgba(255,255,255,0.2)' : 'transparent' }}
            >
              Interests
            </Button>
            <Button 
              color="inherit" 
              startIcon={<Message />}
              onClick={() => navigate('/messages')}
              style={{ backgroundColor: isActive('/messages') ? 'rgba(255,255,255,0.2)' : 'transparent' }}
            >
              Messages
            </Button>
            
            <IconButton 
              color="inherit" 
              onClick={handleMenuOpen}
              style={{ backgroundColor: anchorEl ? 'rgba(255,255,255,0.2)' : 'transparent' }}
            >
              <AccountCircle />
            </IconButton>
            <Menu
              anchorEl={anchorEl}
              keepMounted
              open={Boolean(anchorEl)}
              onClose={handleMenuClose}
            >
              <MenuItem onClick={() => { navigate('/dashboard'); handleMenuClose(); }}>
                Dashboard
              </MenuItem>
              <MenuItem onClick={() => { navigate('/profile'); handleMenuClose(); }}>
                My Profile
              </MenuItem>
              <MenuItem onClick={() => { navigate('/verification'); handleMenuClose(); }}>
                <Verified fontSize="small" style={{ marginRight: 8 }} />
                Verification
              </MenuItem>
              {isAdmin && (
                <MenuItem onClick={() => { navigate('/admin'); handleMenuClose(); }}>
                  <AdminPanelSettings fontSize="small" style={{ marginRight: 8 }} />
                  Admin Panel
                </MenuItem>
              )}
              <MenuItem onClick={handleLogout}>
                Logout
              </MenuItem>
            </Menu>
          </Box>
        ) : (
          <Box>
            <Button color="inherit" onClick={() => navigate('/login')}>
              Login
            </Button>
            <Button color="inherit" variant="outlined" onClick={() => navigate('/register')}>
              Register
            </Button>
          </Box>
        )}
      </Toolbar>
    </AppBar>
  );
};

export default Header;