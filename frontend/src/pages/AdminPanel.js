import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import {
  Box, Drawer, AppBar, Toolbar, Typography, List, ListItem, ListItemButton,
  ListItemIcon, ListItemText, Card, CardContent, CardMedia, Grid, Button,
  Chip, TextField, InputAdornment, IconButton, Avatar, Badge, Divider,
  Dialog, DialogTitle, DialogContent, DialogActions, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Paper, LinearProgress,
  Alert, Snackbar, Tabs, Tab, Menu, MenuItem, Select, FormControl,
  InputLabel, Tooltip, Switch, FormControlLabel
} from '@mui/material';
import {
  Dashboard as DashboardIcon, PhotoCamera, People, TrendingUp, Settings,
  Logout, Search, Visibility, CheckCircle, Cancel, Refresh, FilterList,
  MoreVert, Block, Check, Close, Star, Email, Phone, LocationOn,
  CalendarToday, VerifiedUser,PendingActions, History, AttachMoney
} from '@mui/icons-material';
import api from '../services/api';
import { useAuth } from '../hooks/useAuth';
import AdminUserProfile from './AdminUserProfile';
import toast from 'react-hot-toast';

// Sidebar width
const DRAWER_WIDTH = 280;

// Admin Panel Component
const AdminPanel = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Check for admin access
  const adminUser = JSON.parse(localStorage.getItem('adminUser') || 'null');
  const isAdmin = user?.email === 'vijayalakshmijayakumar45@gmail.com' ||
                  adminUser?.email === 'vijayalakshmijayakumar45@gmail.com';

  const [mobileOpen, setMobileOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [pendingPhotoCount, setPendingPhotoCount] = useState(0);
  const [pendingPaymentCount, setPendingPaymentCount] = useState(0);

  // Fetch pending photo count for badge
  const fetchPendingPhotoCount = async () => {
    try {
      const response = await api.get('/admin/dashboard');
      setPendingPhotoCount(response.data.pendingPhotoVerifications || 0);
    } catch (error) {
      console.error('Failed to fetch pending photo count:', error);
    }
  };

  // Fetch pending payment count for badge
  const fetchPendingPaymentCount = async () => {
    try {
      const response = await api.get('/payments/admin/stats');
      setPendingPaymentCount(response.pendingVerification || 0);
    } catch (error) {
      console.error('Failed to fetch pending payment count:', error);
    }
  };

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (isAdmin) {
      fetchPendingPhotoCount();
      fetchPendingPaymentCount();
      // Refresh count every 30 seconds
      const interval = setInterval(() => {
        fetchPendingPhotoCount();
        fetchPendingPaymentCount();
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [isAdmin]);

  if (!isAdmin) {
    return (
      <Box sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: '#f5f5f5'
      }}>
        <Card sx={{ maxWidth: 400, p: 4, textAlign: 'center' }}>
          <Avatar sx={{ width: 80, height: 80, bgcolor: '#ef4444', mx: 'auto', mb: 2 }}>
            <Close sx={{ fontSize: 40 }} />
          </Avatar>
          <Typography variant="h5" gutterBottom color="error">Access Denied</Typography>
          <Typography color="textSecondary">
            You do not have admin privileges to access this panel.
          </Typography>
        </Card>
      </Box>
    );
  }

  const menuItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/admin' },
    { text: 'Photo Approvals', icon: <PhotoCamera />, path: '/admin/photos', badge: true },
    { text: 'Profile Verifications', icon: <VerifiedUser />, path: '/admin/profile-verifications', badge: true },
    { text: 'User Management', icon: <People />, path: '/admin/users' },
    { text: 'Subscriptions', icon: <AttachMoney />, path: '/admin/subscriptions', paymentBadge: true },
    { text: 'Activity Logs', icon: <History />, path: '/admin/logs' },
    { text: 'Settings', icon: <Settings />, path: '/admin/settings' },
  ];

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Logo Section */}
      <Box sx={{
        p: 3,
        bgcolor: '#8B5CF6',
        color: 'white',
        textAlign: 'center'
      }}>
        <Avatar sx={{ width: 60, height: 60, bgcolor: 'white', mx: 'auto', mb: 1 }}>
          <Typography variant="h4" color="#8B5CF6" fontWeight="bold">V</Typography>
        </Avatar>
        <Typography variant="h6" fontWeight="bold">Admin Panel</Typography>
        <Typography variant="caption" sx={{ opacity: 0.8 }}>
          Vijayalakshmi Matrimony
        </Typography>
      </Box>

      {/* Navigation */}
      <List sx={{ flex: 1, px: 2, py: 2 }}>
        {menuItems.map((item) => (
          <ListItem key={item.text} disablePadding sx={{ mb: 0.5 }}>
            <ListItemButton
              onClick={() => {
                navigate(item.path);
                setMobileOpen(false);
              }}
              sx={{
                borderRadius: 2,
                bgcolor: location.pathname === item.path ? '#8B5CF6' : 'transparent',
                color: location.pathname === item.path ? 'white' : 'text.primary',
                '&:hover': {
                  bgcolor: location.pathname === item.path ? '#7C3AED' : 'rgba(139, 92, 246, 0.08)',
                },
                transition: 'all 0.2s ease'
              }}
            >
              <ListItemIcon sx={{
                color: location.pathname === item.path ? 'white' : '#8B5CF6',
                minWidth: 40
              }}>
                {item.badge ? (
                  <Badge badgeContent={pendingPhotoCount} color="error" showZero={false}>
                    {item.icon}
                  </Badge>
                ) : item.paymentBadge ? (
                  <Badge badgeContent={pendingPaymentCount} color="error" showZero={false}>
                    {item.icon}
                  </Badge>
                ) : item.icon}
              </ListItemIcon>
              <ListItemText
                primary={item.text}
                primaryTypographyProps={{
                  fontWeight: location.pathname === item.path ? 600 : 400,
                  fontSize: '0.9rem'
                }}
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>

      {/* Admin Info */}
      <Box sx={{ p: 2, borderTop: '1px solid rgba(0,0,0,0.1)' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Avatar sx={{ bgcolor: '#8B5CF6', mr: 1.5 }}>
            {adminUser?.name?.charAt(0) || 'A'}
          </Avatar>
          <Box sx={{ overflow: 'hidden' }}>
            <Typography variant="body2" fontWeight="bold" noWrap>
              {adminUser?.name || 'Admin'}
            </Typography>
            <Typography variant="caption" color="textSecondary" noWrap>
              {adminUser?.email || 'admin@matrimony.com'}
            </Typography>
          </Box>
        </Box>
        <Button
          fullWidth
          variant="outlined"
          color="error"
          size="small"
          startIcon={<Logout />}
          onClick={() => {
            localStorage.removeItem('adminToken');
            localStorage.removeItem('adminUser');
            navigate('/login');
          }}
        >
          Logout
        </Button>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#f8fafc' }}>
      {/* AppBar */}
      <AppBar
        position="fixed"
        sx={{
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          ml: { md: `${DRAWER_WIDTH}px` },
          bgcolor: 'white',
          color: 'text.primary',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { md: 'none' } }}
          >
            <DashboardIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            {menuItems.find(item => item.path === location.pathname)?.text || 'Dashboard'}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Chip
              icon={<CalendarToday sx={{ fontSize: 16 }} />}
              label={currentTime.toLocaleDateString('en-IN', {
                weekday: 'short',
                year: 'numeric',
                month: 'short',
                day: 'numeric'
              })}
              size="small"
              sx={{ bgcolor: '#f0f0f0' }}
            />
            <Chip
              label={currentTime.toLocaleTimeString('en-IN')}
              size="small"
              sx={{ bgcolor: '#8B5CF6', color: 'white' }}
            />
          </Box>
        </Toolbar>
      </AppBar>

      {/* Drawer */}
      <Box
        component="nav"
        sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box' },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': {
              width: DRAWER_WIDTH,
              boxSizing: 'border-box',
              borderRight: '1px solid rgba(0,0,0,0.08)'
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          mt: 8
        }}
      >
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/photos" element={<PhotoApprovals />} />
          <Route path="/profile-verifications" element={<ProfileVerifications />} />
          <Route path="/users" element={<UserManagement />} />
          <Route path="/users/:id" element={<AdminUserProfile />} />
          <Route path="/subscriptions" element={<SubscriptionManagement />} />
          <Route path="/logs" element={<ActivityLogs />} />
          <Route path="/settings" element={<AdminSettings />} />
        </Routes>
      </Box>
    </Box>
  );
};

// Dashboard Component
const Dashboard = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    verifiedUsers: 0,
    pendingPhotoVerifications: 0,
    newUsersToday: 0,
    premiumUsers: 0,
    messagesToday: 0
  });
  const [loading, setLoading] = useState(true);
  const [recentUsers, setRecentUsers] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await api.get('/admin/dashboard');
      setStats(response.data);
      if (response.data.recentUsers) {
        setRecentUsers(response.data.recentUsers);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      // Use mock data for demo
      setStats({
        totalUsers: 156,
        verifiedUsers: 89,
        pendingPhotoVerifications: 12,
        newUsersToday: 8,
        premiumUsers: 34,
        messagesToday: 45
      });
      setRecentUsers([
        { id: 1, firstName: 'Rama', lastName: 'Krishna', city: 'Hyderabad', createdAt: new Date() },
        { id: 2, firstName: 'Sowmya', lastName: 'Reddy', city: 'Bangalore', createdAt: new Date() },
        { id: 3, firstName: 'Venkatesh', lastName: 'Rao', city: 'Chennai', createdAt: new Date() },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ title, value, icon, color, trend, subtitle }) => (
    <Card sx={{
      height: '100%',
      borderRadius: 3,
      transition: 'transform 0.2s ease, box-shadow 0.2s ease',
      '&:hover': {
        transform: 'translateY(-4px)',
        boxShadow: '0 8px 24px rgba(0,0,0,0.12)'
      }
    }}>
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography variant="body2" color="textSecondary" gutterBottom>
              {title}
            </Typography>
            <Typography variant="h3" fontWeight="bold" sx={{ mb: 1 }}>
              {loading ? '...' : value.toLocaleString()}
            </Typography>
            {subtitle && (
              <Typography variant="caption" color="textSecondary">
                {subtitle}
              </Typography>
            )}
            {trend && (
              <Chip
                label={trend > 0 ? `+${trend}%` : `${trend}%`}
                size="small"
                sx={{
                  mt: 1,
                  bgcolor: trend > 0 ? '#dcfce7' : '#fee2e2',
                  color: trend > 0 ? '#16a34a' : '#dc2626',
                  fontWeight: 600
                }}
              />
            )}
          </Box>
          <Avatar sx={{ bgcolor: `${color}.light`, color: `${color}.main`, width: 56, height: 56 }}>
            {icon}
          </Avatar>
        </Box>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <LinearProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Welcome Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          Welcome Back, Admin! 👋
        </Typography>
        <Typography variant="body1" color="textSecondary">
          Here's what's happening with your matrimony platform today.
        </Typography>
      </Box>

      {/* Stats Grid */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={4} lg={3}>
          <StatCard
            title="Total Users"
            value={stats.totalUsers}
            icon={<People />}
            color="primary"
            trend={12}
            subtitle="Registered members"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={3}>
          <StatCard
            title="Verified Users"
            value={stats.verifiedUsers}
            icon={<VerifiedUser />}
            color="success"
            trend={8}
            subtitle={`${Math.round((stats.verifiedUsers / stats.totalUsers) * 100)}% verification rate`}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={3}>
          <StatCard
            title="Pending Photos"
            value={stats.pendingPhotoVerifications}
            icon={<PendingActions />}
            color="warning"
            subtitle="Awaiting review"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={3}>
          <StatCard
            title="New Today"
            value={stats.newUsersToday}
            icon={<TrendingUp />}
            color="info"
            subtitle="Joined today"
          />
        </Grid>
      </Grid>

      {/* Quick Actions & Recent Users */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Card sx={{ borderRadius: 3 }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Recent Registrations
              </Typography>
              <Divider sx={{ mb: 2 }} />
              {recentUsers.length === 0 ? (
                <Typography color="textSecondary" textAlign="center" py={4}>
                  No recent registrations
                </Typography>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {recentUsers.map((user, index) => (
                    <Box
                      key={user.id}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        p: 2,
                        borderRadius: 2,
                        bgcolor: index % 2 === 0 ? '#f8fafc' : 'transparent',
                        transition: 'background-color 0.2s',
                        '&:hover': { bgcolor: '#f1f5f9' }
                      }}
                    >
                      <Avatar sx={{ bgcolor: '#8B5CF6', mr: 2 }}>
                        {user.firstName?.charAt(0)}
                      </Avatar>
                      <Box sx={{ flex: 1 }}>
                        <Typography fontWeight="600">
                          {user.firstName} {user.lastName}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          {user.city}
                        </Typography>
                      </Box>
                      <Chip
                        label={new Date(user.createdAt).toLocaleTimeString()}
                        size="small"
                        sx={{ bgcolor: '#f0f0f0' }}
                      />
                    </Box>
                  ))}
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card sx={{ borderRadius: 3, height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Quick Actions
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Button
                  variant="contained"
                  startIcon={<PhotoCamera />}
                  href="/admin/photos"
                  sx={{ borderRadius: 2, py: 1.5 }}
                >
                  Review Photos ({stats.pendingPhotoVerifications})
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<People />}
                  href="/admin/users"
                  sx={{ borderRadius: 2, py: 1.5 }}
                >
                  Manage Users
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<Settings />}
                  href="/admin/settings"
                  sx={{ borderRadius: 2, py: 1.5 }}
                >
                  Platform Settings
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

// Photo Approvals Component
const PhotoApprovals = () => {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rejectDialog, setRejectDialog] = useState({ open: false, photoId: null, reason: '' });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [filter, setFilter] = useState('pending');
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });

  useEffect(() => {
    fetchPhotos();
  }, [pagination.page, filter]);

  const fetchPhotos = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/admin/photos/${filter}?page=${pagination.page}&limit=12`);
      setPhotos(response.data.photos || []);
      setPagination(prev => ({
        ...prev,
        pages: response.data.pagination?.pages || 1,
        total: response.data.pagination?.total || 0
      }));
    } catch (error) {
      console.error('Failed to fetch photos:', error);
      // Mock data for demo
      setPhotos([
        {
          id: '1',
          photoUrl: 'https://via.placeholder.com/150',
          user: { firstName: 'Rama', lastName: 'Krishna', email: 'rama@example.com', city: 'Hyderabad' },
          photoType: 'profile',
          createdAt: new Date()
        },
        {
          id: '2',
          photoUrl: 'https://via.placeholder.com/150',
          user: { firstName: 'Sowmya', lastName: 'Reddy', email: 'sowmya@example.com', city: 'Bangalore' },
          photoType: 'horoscope',
          createdAt: new Date()
        },
      ]);
      setPagination({ page: 1, pages: 1, total: 2 });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (photoId) => {
    try {
      await api.put(`/admin/photos/${photoId}/approve`);
      setSnackbar({ open: true, message: 'Photo approved successfully!', severity: 'success' });
      fetchPhotos();
    } catch (error) {
      setSnackbar({ open: true, message: 'Failed to approve photo', severity: 'error' });
    }
  };

  const handleReject = async () => {
    if (!rejectDialog.reason.trim()) {
      setSnackbar({ open: true, message: 'Please provide a rejection reason', severity: 'warning' });
      return;
    }
    try {
      await api.put(`/admin/photos/${rejectDialog.photoId}/reject`, {
        reason: rejectDialog.reason
      });
      setRejectDialog({ open: false, photoId: null, reason: '' });
      setSnackbar({ open: true, message: 'Photo rejected', severity: 'success' });
      fetchPhotos();
    } catch (error) {
      setSnackbar({ open: true, message: 'Failed to reject photo', severity: 'error' });
    }
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight="bold">Photo Approvals</Typography>
          <Typography variant="body2" color="textSecondary">
            Review and verify user photos
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <Select
              value={filter}
              onChange={(e) => {
                setFilter(e.target.value);
                setPagination(prev => ({ ...prev, page: 1 }));
              }}
              startAdornment={<FilterList sx={{ mr: 1, color: 'text.secondary' }} />}
            >
              <MenuItem value="pending">Pending</MenuItem>
              <MenuItem value="approved">Approved</MenuItem>
              <MenuItem value="rejected">Rejected</MenuItem>
            </Select>
          </FormControl>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={fetchPhotos}
          >
            Refresh
          </Button>
        </Box>
      </Box>

      {/* Photo Grid */}
      {loading ? (
        <LinearProgress />
      ) : photos.length === 0 ? (
        <Card sx={{ p: 6, textAlign: 'center' }}>
          <PhotoCamera sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="textSecondary">
            No photos to review
          </Typography>
          <Typography variant="body2" color="textSecondary">
            All pending photos have been reviewed
          </Typography>
        </Card>
      ) : (
        <>
          <Grid container spacing={3}>
            {photos.map((photo) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={photo.id}>
                <Card sx={{
                  borderRadius: 3,
                  overflow: 'hidden',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.12)'
                  }
                }}>
                  <CardMedia
                    component="img"
                    height="200"
                    image={photo.photoUrl || 'https://via.placeholder.com/300x200'}
                    alt="Verification photo"
                    sx={{ objectFit: 'cover' }}
                  />
                  <CardContent sx={{ p: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <Avatar sx={{ width: 32, height: 32, bgcolor: '#8B5CF6', mr: 1, fontSize: 14 }}>
                        {photo.user?.firstName?.charAt(0)}
                      </Avatar>
                      <Box sx={{ overflow: 'hidden' }}>
                        <Typography variant="body2" fontWeight="600" noWrap>
                          {photo.user?.firstName} {photo.user?.lastName}
                        </Typography>
                        <Typography variant="caption" color="textSecondary" noWrap>
                          {photo.user?.city}
                        </Typography>
                      </Box>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 0.5, mb: 2 }}>
                      <Chip
                        label={photo.photoType}
                        size="small"
                        sx={{ bgcolor: '#f0f0f0', textTransform: 'capitalize' }}
                      />
                      <Chip
                        label={new Date(photo.createdAt).toLocaleDateString()}
                        size="small"
                        sx={{ bgcolor: '#f0f0f0' }}
                      />
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button
                        fullWidth
                        variant="contained"
                        color="success"
                        size="small"
                        startIcon={<Check />}
                        onClick={() => handleApprove(photo.id)}
                        sx={{ borderRadius: 2 }}
                      >
                        Approve
                      </Button>
                      <Button
                        fullWidth
                        variant="outlined"
                        color="error"
                        size="small"
                        startIcon={<Close />}
                        onClick={() => setRejectDialog({ open: true, photoId: photo.id, reason: '' })}
                        sx={{ borderRadius: 2 }}
                      >
                        Reject
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4, gap: 1 }}>
              <Button
                variant="outlined"
                disabled={pagination.page === 1}
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
              >
                Previous
              </Button>
              <Chip label={`Page ${pagination.page} of ${pagination.pages}`} sx={{ alignSelf: 'center' }} />
              <Button
                variant="outlined"
                disabled={pagination.page === pagination.pages}
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
              >
                Next
              </Button>
            </Box>
          )}
        </>
      )}

      {/* Reject Dialog */}
      <Dialog
        open={rejectDialog.open}
        onClose={() => setRejectDialog({ ...rejectDialog, open: false })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Reject Photo</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
            Please provide a reason for rejecting this photo. This will be shown to the user.
          </Typography>
          <TextField
            autoFocus
            multiline
            rows={4}
            fullWidth
            placeholder="Enter rejection reason..."
            value={rejectDialog.reason}
            onChange={(e) => setRejectDialog({ ...rejectDialog, reason: e.target.value })}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setRejectDialog({ ...rejectDialog, open: false })}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleReject}
            disabled={!rejectDialog.reason.trim()}
          >
            Reject Photo
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

// Profile Verifications Component - Users awaiting admin review
const ProfileVerifications = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [rejectDialog, setRejectDialog] = useState({ open: false, userId: null, userName: '', reason: '' });

  useEffect(() => {
    fetchPendingVerifications();
  }, [pagination.page]);

  const fetchPendingVerifications = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/admin/profile-verifications/pending?page=${pagination.page}&limit=10`);
      setUsers(response.data.users || []);
      setPagination(prev => ({
        ...prev,
        pages: response.data.pagination?.pages || 1,
        total: response.data.pagination?.total || 0
      }));
    } catch (error) {
      console.error('Failed to fetch pending profile verifications:', error);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (userId) => {
    try {
      await api.put(`/admin/profile-verifications/${userId}/approve`);
      setSnackbar({ open: true, message: 'Profile verified successfully!', severity: 'success' });
      fetchPendingVerifications();
    } catch (error) {
      setSnackbar({ open: true, message: 'Failed to approve profile verification', severity: 'error' });
    }
  };

  const handleReject = async () => {
    if (!rejectDialog.reason.trim()) {
      setSnackbar({ open: true, message: 'Please provide a rejection reason', severity: 'warning' });
      return;
    }
    try {
      await api.put(`/admin/profile-verifications/${rejectDialog.userId}/reject`, {
        reason: rejectDialog.reason
      });
      setRejectDialog({ open: false, userId: null, userName: '', reason: '' });
      setSnackbar({ open: true, message: 'Profile verification rejected', severity: 'success' });
      fetchPendingVerifications();
    } catch (error) {
      setSnackbar({ open: true, message: 'Failed to reject profile verification', severity: 'error' });
    }
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight="bold">Profile Verifications</Typography>
          <Typography variant="body2" color="textSecondary">
            Users who completed email & phone verification - Awaiting admin review
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={fetchPendingVerifications}
        >
          Refresh
        </Button>
      </Box>

      {/* Info Card */}
      <Card sx={{ mb: 3, bgcolor: '#E8F5E9', border: '1px solid #4CAF50' }}>
        <CardContent sx={{ py: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <VerifiedUser color="success" />
            <Typography variant="body2">
              <strong>Verification Flow:</strong> Users who have completed both Email and Phone verification 
              appear here for admin review. After approval, their profile becomes visible to other members.
            </Typography>
          </Box>
        </CardContent>
      </Card>

      {/* Users Table */}
      {loading ? (
        <LinearProgress />
      ) : users.length === 0 ? (
        <Card sx={{ p: 6, textAlign: 'center' }}>
          <VerifiedUser sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="textSecondary">
            No pending profile verifications
          </Typography>
          <Typography variant="body2" color="textSecondary">
            All users with completed email & phone verification have been reviewed
          </Typography>
        </Card>
      ) : (
        <>
          <TableContainer component={Paper} sx={{ borderRadius: 2, overflow: 'hidden' }}>
            <Table>
              <TableHead sx={{ bgcolor: '#f5f5f5' }}>
                <TableRow>
                  <TableCell>User</TableCell>
                  <TableCell>Contact</TableCell>
                  <TableCell>Location</TableCell>
                  <TableCell>Age/Gender</TableCell>
                  <TableCell>Verification Status</TableCell>
                  <TableCell>Registered</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar 
                          src={user.profilePhoto} 
                          sx={{ bgcolor: '#8B5CF6' }}
                        >
                          {user.firstName?.charAt(0)}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight="600">
                            {user.firstName} {user.lastName}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            ID: {user.id.slice(-8)}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Email sx={{ fontSize: 14, color: 'success.main' }} />
                          <Typography variant="caption">{user.email}</Typography>
                          {user.emailVerified && (
                            <CheckCircle sx={{ fontSize: 14, color: 'success.main' }} />
                          )}
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Phone sx={{ fontSize: 14, color: 'success.main' }} />
                          <Typography variant="caption">{user.phone}</Typography>
                          {user.phoneVerified && (
                            <CheckCircle sx={{ fontSize: 14, color: 'success.main' }} />
                          )}
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <LocationOn sx={{ fontSize: 14, color: 'text.secondary' }} />
                        <Typography variant="caption">
                          {user.city}, {user.state}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption">
                        {user.age} yrs / {user.gender}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={user.profileVerificationStatus || 'Pending'} 
                        size="small"
                        color={user.profileVerificationStatus === 'Under Admin Review' ? 'warning' : 'default'}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                        <Tooltip title="View Profile">
                          <IconButton 
                            size="small" 
                            onClick={() => navigate(`/admin/users/${user.id}`)}
                          >
                            <Visibility fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Approve">
                          <IconButton 
                            size="small" 
                            color="success"
                            onClick={() => handleApprove(user.id)}
                          >
                            <Check fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Reject">
                          <IconButton 
                            size="small" 
                            color="error"
                            onClick={() => setRejectDialog({ 
                              open: true, 
                              userId: user.id, 
                              userName: `${user.firstName} ${user.lastName}`,
                              reason: '' 
                            })}
                          >
                            <Close fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
              <Button
                disabled={pagination.page === 1}
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
              >
                Previous
              </Button>
              <Typography sx={{ px: 3, py: 1 }}>
                Page {pagination.page} of {pagination.pages}
              </Typography>
              <Button
                disabled={pagination.page === pagination.pages}
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
              >
                Next
              </Button>
            </Box>
          )}
        </>
      )}

      {/* Reject Dialog */}
      <Dialog open={rejectDialog.open} onClose={() => setRejectDialog({ open: false, userId: null, userName: '', reason: '' })}>
        <DialogTitle>Reject Profile Verification</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Rejecting verification for: <strong>{rejectDialog.userName}</strong>
          </Typography>
          <TextField
            autoFocus
            margin="dense"
            label="Rejection Reason"
            fullWidth
            multiline
            rows={3}
            value={rejectDialog.reason}
            onChange={(e) => setRejectDialog(prev => ({ ...prev, reason: e.target.value }))}
            placeholder="Please provide a reason for rejection..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectDialog({ open: false, userId: null, userName: '', reason: '' })}>
            Cancel
          </Button>
          <Button onClick={handleReject} color="error" variant="contained">
            Reject
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

// User Management Component
const UserManagement = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [selectedUser, setSelectedUser] = useState(null);
  const [actionMenu, setActionMenu] = useState({ anchor: null, userId: null });

  useEffect(() => {
    fetchUsers();
  }, [pagination.page, search, statusFilter]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await api.get(
        `/admin/users?page=${pagination.page}&limit=20&search=${search}&status=${statusFilter}`
      );
      setUsers(response.data.users || []);
      setPagination(prev => ({
        ...prev,
        pages: response.data.pagination?.pages || 1,
        total: response.data.pagination?.total || 0
      }));
    } catch (error) {
      console.error('Failed to fetch users:', error);
      // Mock data
      setUsers([
        {
          id: '1', firstName: 'Rama', lastName: 'Krishna', email: 'rama@example.com',
          phone: '+91 9876543210', city: 'Hyderabad', state: 'Telangana',
          isVerified: true, isPremium: true, isActive: true, createdAt: new Date()
        },
        {
          id: '2', firstName: 'Sowmya', lastName: 'Reddy', email: 'sowmya@example.com',
          phone: '+91 9876543211', city: 'Bangalore', state: 'Karnataka',
          isVerified: true, isPremium: false, isActive: true, createdAt: new Date()
        },
        {
          id: '3', firstName: 'Venkatesh', lastName: 'Rao', email: 'venkat@example.com',
          phone: '+91 9876543212', city: 'Chennai', state: 'Tamil Nadu',
          isVerified: false, isPremium: true, isActive: true, createdAt: new Date()
        },
      ]);
      setPagination({ page: 1, pages: 1, total: 3 });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (userId, currentStatus) => {
    try {
      await api.put(`/admin/users/${userId}/status`, { isActive: !currentStatus });
      setSnackbar({ open: true, message: 'User status updated', severity: 'success' });
      fetchUsers();
    } catch (error) {
      setSnackbar({ open: true, message: 'Failed to update status', severity: 'error' });
    }
  };

  const handleVerifyUser = async (userId) => {
    try {
      await api.put(`/admin/users/${userId}/verify`);
      setSnackbar({ open: true, message: 'User verified successfully!', severity: 'success' });
      fetchUsers();
    } catch (error) {
      console.error('Failed to verify user:', error);
      setSnackbar({ open: true, message: 'Failed to verify user', severity: 'error' });
    }
  };

  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight="bold">User Management</Typography>
          <Typography variant="body2" color="textSecondary">
            {pagination.total} total users
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<Refresh />} onClick={fetchUsers}>
          Refresh
        </Button>
      </Box>

      {/* Search & Filters */}
      <Card sx={{ mb: 3, p: 2, borderRadius: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              placeholder="Search by name, email, or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search color="action" />
                  </InputAdornment>
                ),
              }}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth size="small">
              <InputLabel>Status Filter</InputLabel>
              <Select
                value={statusFilter}
                label="Status Filter"
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPagination(prev => ({ ...prev, page: 1 }));
                }}
                sx={{ borderRadius: 2 }}
              >
                <MenuItem value="all">All Users</MenuItem>
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="inactive">Inactive</MenuItem>
                <MenuItem value="verified">Verified</MenuItem>
                <MenuItem value="premium">Premium</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Card>

      {/* Users Table */}
      {loading ? (
        <LinearProgress />
      ) : (
        <Card sx={{ borderRadius: 3, overflow: 'hidden' }}>
          <TableContainer>
            <Table>
              <TableHead sx={{ bgcolor: '#f8fafc' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>User</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Contact</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Location</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Joined</TableCell>
                  <TableCell sx={{ fontWeight: 600 }} align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map((user) => (
                  <TableRow
                    key={user.id}
                    hover
                    sx={{ '&:hover': { bgcolor: '#f8fafc' } }}
                  >
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Avatar sx={{ bgcolor: '#8B5CF6', mr: 2 }}>
                          {user.firstName?.charAt(0)}
                        </Avatar>
                        <Box>
                          <Typography fontWeight="600">
                            {user.firstName} {user.lastName}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            ID: {user.id.slice(-6)}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{user.email}</Typography>
                      <Typography variant="caption" color="textSecondary">
                        {user.phone || 'No phone'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{user.city}</Typography>
                      <Typography variant="caption" color="textSecondary">
                        {user.state}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                        <Chip
                          label={user.isVerified ? 'Verified' : 'Unverified'}
                          size="small"
                          color={user.isVerified ? 'success' : 'default'}
                          sx={{ borderRadius: 1 }}
                        />
                        {user.isPremium && (
                          <Chip
                            label="Premium"
                            size="small"
                            sx={{
                              bgcolor: '#fef3c7',
                              color: '#d97706',
                              fontWeight: 600,
                              borderRadius: 1
                            }}
                            icon={<Star sx={{ fontSize: 14 }} />}
                          />
                        )}
                        {!user.isActive && (
                          <Chip
                            label="Blocked"
                            size="small"
                            color="error"
                            sx={{ borderRadius: 1 }}
                          />
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {new Date(user.createdAt).toLocaleDateString('en-IN')}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {new Date(user.createdAt).toLocaleTimeString('en-IN', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        onClick={(e) => setActionMenu({ anchor: e.currentTarget, userId: user.id })}
                      >
                        <MoreVert />
                      </IconButton>
                      <Menu
                        anchorEl={actionMenu.anchor}
                        open={Boolean(actionMenu.anchor) && actionMenu.userId === user.id}
                        onClose={() => setActionMenu({ anchor: null, userId: null })}
                      >
                        <MenuItem onClick={() => { navigate(`/admin/users/${user.id}`); setActionMenu({ anchor: null, userId: null }); }}>
                          <Visibility sx={{ mr: 1, fontSize: 20 }} /> View Full Profile
                        </MenuItem>
                        {!user.isVerified && (
                          <MenuItem 
                            onClick={() => { handleVerifyUser(user.id); setActionMenu({ anchor: null, userId: null }); }}
                            sx={{ color: 'success.main' }}
                          >
                            <VerifiedUser sx={{ mr: 1, fontSize: 20 }} /> Verify User
                          </MenuItem>
                        )}
                        <MenuItem onClick={() => { handleToggleStatus(user.id, user.isActive); setActionMenu({ anchor: null, userId: null }); }}>
                          {user.isActive ? (
                            <><Block sx={{ mr: 1, fontSize: 20, color: 'error.main' }} /> Block User</>
                          ) : (
                            <><Check sx={{ mr: 1, fontSize: 20, color: 'success.main' }} /> Unblock User</>
                          )}
                        </MenuItem>
                      </Menu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
              <Button
                variant="outlined"
                disabled={pagination.page === 1}
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                sx={{ mr: 2 }}
              >
                Previous
              </Button>
              <Chip label={`Page ${pagination.page} of ${pagination.pages}`} sx={{ alignSelf: 'center' }} />
              <Button
                variant="outlined"
                disabled={pagination.page === pagination.pages}
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                sx={{ ml: 2 }}
              >
                Next
              </Button>
            </Box>
          )}
        </Card>
      )}

      {/* User Details Dialog */}
      <Dialog
        open={Boolean(selectedUser)}
        onClose={() => setSelectedUser(null)}
        maxWidth="sm"
        fullWidth
      >
        {selectedUser && (
          <>
            <DialogTitle sx={{ pb: 0 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ width: 56, height: 56, bgcolor: '#8B5CF6' }}>
                  {selectedUser.firstName?.charAt(0)}
                </Avatar>
                <Box>
                  <Typography variant="h6">
                    {selectedUser.firstName} {selectedUser.lastName}
                  </Typography>
                  <Chip
                    label={selectedUser.isPremium ? 'Premium User' : 'Free User'}
                    size="small"
                    sx={{
                      bgcolor: selectedUser.isPremium ? '#fef3c7' : '#f0f0f0',
                      color: selectedUser.isPremium ? '#d97706' : 'text.secondary'
                    }}
                  />
                </Box>
              </Box>
            </DialogTitle>
            <DialogContent sx={{ mt: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Email color="action" fontSize="small" />
                    <Typography>{selectedUser.email}</Typography>
                  </Box>
                </Grid>
                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Phone color="action" fontSize="small" />
                    <Typography>{selectedUser.phone || 'Not provided'}</Typography>
                  </Box>
                </Grid>
                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <LocationOn color="action" fontSize="small" />
                    <Typography>{selectedUser.city}, {selectedUser.state}</Typography>
                  </Box>
                </Grid>
                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CalendarToday color="action" fontSize="small" />
                    <Typography>Joined: {new Date(selectedUser.createdAt).toLocaleDateString()}</Typography>
                  </Box>
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
              <Button onClick={() => setSelectedUser(null)}>Close</Button>
              <Button
                variant={selectedUser.isActive ? 'outlined' : 'contained'}
                color={selectedUser.isActive ? 'error' : 'success'}
                onClick={() => {
                  handleToggleStatus(selectedUser.id, selectedUser.isActive);
                  setSelectedUser(null);
                }}
              >
                {selectedUser.isActive ? 'Block User' : 'Unblock User'}
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

// Payment Messages Chat Component
const PaymentMessagesChat = ({ paymentId }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (paymentId) {
      fetchMessages();
    }
  }, [paymentId]);

  const fetchMessages = async () => {
    try {
      // Use admin-specific endpoint for fetching messages
      const response = await api.get(`/payments/admin/${paymentId}/messages`);
      setMessages(response.data?.messages || response.messages || []);
    } catch (error) {
      console.error('Failed to fetch messages:', error);
      // Try fallback endpoint
      try {
        const fallbackResponse = await api.get(`/payments/${paymentId}/messages`);
        setMessages(fallbackResponse.data?.messages || fallbackResponse.messages || []);
      } catch (fallbackError) {
        console.error('Fallback also failed:', fallbackError);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;
    
    try {
      await api.post(`/payments/admin/${paymentId}/messages`, {
        message: newMessage.trim()
      });
      setNewMessage('');
      fetchMessages();
    } catch (error) {
      toast.error('Failed to send message');
    }
  };

  if (loading) {
    return <Typography variant="body2" color="textSecondary">Loading messages...</Typography>;
  }

  return (
    <Box>
      {messages.length === 0 ? (
        <Typography variant="body2" color="textSecondary" textAlign="center">
          No messages yet
        </Typography>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {messages.map((msg) => (
            <Box
              key={msg.id}
              sx={{
                p: 1.5,
                borderRadius: 2,
                bgcolor: msg.senderType === 'ADMIN' ? '#dbeafe' : '#dcfce7',
                alignSelf: msg.senderType === 'ADMIN' ? 'flex-end' : 'flex-start',
                maxWidth: '80%'
              }}
            >
              <Typography variant="caption" color="textSecondary" fontWeight="bold">
                {msg.senderType === 'ADMIN' ? 'Admin' : 'User'}
              </Typography>
              <Typography variant="body2">{msg.message}</Typography>
              <Typography variant="caption" color="textSecondary" display="block">
                {new Date(msg.createdAt).toLocaleString()}
              </Typography>
            </Box>
          ))}
        </Box>
      )}
      <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
        <TextField
          size="small"
          fullWidth
          placeholder="Type a message..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
        />
        <Button variant="contained" size="small" onClick={handleSendMessage}>
          Send
        </Button>
      </Box>
    </Box>
  );
};

// Subscription Management Component with Payment Verification
const SubscriptionManagement = () => {
  const [subscriptions, setSubscriptions] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, active: 0, revenue: 0, pendingVerification: 0 });
  const [tabValue, setTabValue] = useState(0);
  const [proofDialog, setProofDialog] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [rejectDialog, setRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [adminNotes, setAdminNotes] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      console.log('Fetching payment data...');
      
      // Fetch payment stats
      const statsRes = await api.get('/payments/admin/stats');
      console.log('Stats response:', statsRes);
      setStats(statsRes.data || statsRes);
      
      // Fetch pending payments
      const paymentsRes = await api.get('/payments/admin/all?status=PENDING_VERIFICATION');
      console.log('Payments response:', paymentsRes);
      setPayments(paymentsRes.data?.payments || paymentsRes.payments || []);
      
      // Fetch subscriptions
      const subRes = await api.get('/admin/subscriptions');
      setSubscriptions(subRes.data?.subscriptions || []);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast.error('Failed to fetch payment data: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleApprovePayment = async (paymentId) => {
    try {
      await api.post(`/payments/admin/${paymentId}/approve`, { notes: adminNotes });
      toast.success('Payment approved successfully!');
      fetchData();
      setProofDialog(false);
      setSelectedPayment(null);
      setAdminNotes('');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to approve payment');
    }
  };

  const handleRejectPayment = async () => {
    if (!rejectReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }
    try {
      await api.post(`/payments/admin/${selectedPayment.id}/reject`, { reason: rejectReason });
      toast.success('Payment rejected');
      fetchData();
      setRejectDialog(false);
      setSelectedPayment(null);
      setRejectReason('');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to reject payment');
    }
  };

  const viewPaymentProof = (payment) => {
    setSelectedPayment(payment);
    setProofDialog(true);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight="bold" gutterBottom>Subscription & Payment Management</Typography>
          <Typography variant="body2" color="textSecondary">
            Manage subscriptions and verify manual payments
          </Typography>
        </Box>
        <Button 
          variant="outlined" 
          startIcon={<Refresh />}
          onClick={fetchData}
          disabled={loading}
        >
          Refresh
        </Button>
      </Box>

      {/* Stats */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={3}>
          <Card sx={{ borderRadius: 3, textAlign: 'center', p: 3 }}>
            <Typography variant="h2" fontWeight="bold" color="primary">
              {stats.total}
            </Typography>
            <Typography color="textSecondary">Total Payments</Typography>
          </Card>
        </Grid>
        <Grid item xs={12} sm={3}>
          <Card sx={{ borderRadius: 3, textAlign: 'center', p: 3 }}>
            <Typography variant="h2" fontWeight="bold" color="warning.main">
              {stats.pendingVerification}
            </Typography>
            <Typography color="textSecondary">Pending Verification</Typography>
          </Card>
        </Grid>
        <Grid item xs={12} sm={3}>
          <Card sx={{ borderRadius: 3, textAlign: 'center', p: 3 }}>
            <Typography variant="h2" fontWeight="bold" color="success.main">
              {stats.successful}
            </Typography>
            <Typography color="textSecondary">Successful</Typography>
          </Card>
        </Grid>
        <Grid item xs={12} sm={3}>
          <Card sx={{ borderRadius: 3, textAlign: 'center', p: 3 }}>
            <Typography variant="h2" fontWeight="bold" color="info.main">
              ₹{(stats.totalRevenue || 0).toLocaleString()}
            </Typography>
            <Typography color="textSecondary">Total Revenue</Typography>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)} sx={{ mb: 3 }}>
        <Tab 
          label={`Pending Verification (${payments.length})`} 
          icon={<PendingActions />}
          iconPosition="start"
        />
        <Tab label="All Subscriptions" />
      </Tabs>

      {loading ? (
        <LinearProgress />
      ) : (
        <>
          {/* Pending Payments Tab */}
          {tabValue === 0 && (
            <Card sx={{ borderRadius: 3 }}>
              {payments.length === 0 ? (
                <Box sx={{ p: 4, textAlign: 'center' }}>
                  <CheckCircle sx={{ fontSize: 60, color: 'success.main', mb: 2 }} />
                  <Typography>No pending payments to verify</Typography>
                </Box>
              ) : (
                <TableContainer>
                  <Table>
                    <TableHead sx={{ bgcolor: '#f8fafc' }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 600 }}>Order ID</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>User</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Plan</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Amount</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Method</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Transaction ID</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {payments.map((payment) => (
                        <TableRow key={payment.id} hover>
                          <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                            {payment.orderId}
                          </TableCell>
                          <TableCell>
                            <Typography fontWeight="600">
                              {payment.user?.firstName} {payment.user?.lastName}
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                              {payment.user?.email}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={payment.planName || payment.planId}
                              size="small"
                              color="primary"
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell>₹{payment.amount}</TableCell>
                          <TableCell>
                            <Chip
                              label={payment.method}
                              size="small"
                              sx={{
                                bgcolor: payment.method === 'UPI' ? '#dcfce7' : '#dbeafe',
                                color: payment.method === 'UPI' ? '#166534' : '#1e40af'
                              }}
                            />
                          </TableCell>
                          <TableCell sx={{ fontFamily: 'monospace' }}>
                            {payment.transactionId || '-'}
                          </TableCell>
                          <TableCell>
                            {new Date(payment.createdAt).toLocaleDateString('en-IN')}
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', gap: 1 }}>
                              <Button
                                size="small"
                                variant="contained"
                                color="primary"
                                startIcon={<Visibility />}
                                onClick={() => viewPaymentProof(payment)}
                              >
                                View
                              </Button>
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Card>
          )}

          {/* All Subscriptions Tab */}
          {tabValue === 1 && (
            <Card sx={{ borderRadius: 3 }}>
              <TableContainer>
                <Table>
                  <TableHead sx={{ bgcolor: '#f8fafc' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>User</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Plan</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Amount</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Expires</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {subscriptions.map((sub) => (
                      <TableRow key={sub.id} hover>
                        <TableCell>
                          <Typography fontWeight="600">
                            {sub.user?.firstName} {sub.user?.lastName}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={sub.plan}
                            sx={{
                              bgcolor: sub.plan === 'PREMIUM' ? '#fef3c7' : '#dbeafe',
                              color: sub.plan === 'PREMIUM' ? '#d97706' : '#1d4ed8',
                              fontWeight: 600
                            }}
                          />
                        </TableCell>
                        <TableCell>₹{(sub.amount || 0).toLocaleString()}</TableCell>
                        <TableCell>
                          <Chip
                            label={sub.status}
                            color={sub.status === 'ACTIVE' ? 'success' : 'error'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          {sub.endDate ? new Date(sub.endDate).toLocaleDateString('en-IN') : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Card>
          )}
        </>
      )}

      {/* Payment Proof Dialog */}
      <Dialog 
        open={proofDialog} 
        onClose={() => setProofDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Payment Verification
          <IconButton
            onClick={() => setProofDialog(false)}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {selectedPayment && (
            <Box>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="textSecondary">Order ID</Typography>
                  <Typography variant="body1" sx={{ fontFamily: 'monospace', mb: 2 }}>
                    {selectedPayment.orderId}
                  </Typography>
                  
                  <Typography variant="subtitle2" color="textSecondary">User</Typography>
                  <Typography variant="body1" sx={{ mb: 2 }}>
                    {selectedPayment.user?.firstName} {selectedPayment.user?.lastName}
                    <br />
                    <Typography variant="caption">{selectedPayment.user?.email}</Typography>
                  </Typography>
                  
                  <Typography variant="subtitle2" color="textSecondary">Plan</Typography>
                  <Typography variant="body1" sx={{ mb: 2 }}>{selectedPayment.planName}</Typography>
                  
                  <Typography variant="subtitle2" color="textSecondary">Amount</Typography>
                  <Typography variant="h5" color="primary" sx={{ mb: 2 }}>
                    ₹{selectedPayment.amount}
                  </Typography>
                  
                  <Typography variant="subtitle2" color="textSecondary">Transaction ID</Typography>
                  <Typography variant="body1" sx={{ fontFamily: 'monospace', mb: 2 }}>
                    {selectedPayment.transactionId || 'Not provided'}
                  </Typography>
                  
                  <Typography variant="subtitle2" color="textSecondary">Payment Method</Typography>
                  <Chip 
                    label={selectedPayment.method} 
                    size="small"
                    sx={{ mb: 2 }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                    Payment Proof
                  </Typography>
                  {selectedPayment.paymentProof ? (
                    <Box
                      component="img"
                      src={selectedPayment.paymentProof}
                      alt="Payment Proof"
                      sx={{
                        width: '100%',
                        borderRadius: 2,
                        border: '1px solid #e0e0e0',
                        maxHeight: 400,
                        objectFit: 'contain'
                      }}
                    />
                  ) : (
                    <Alert severity="warning">No payment proof uploaded</Alert>
                  )}
                </Grid>
              </Grid>
              
              <Divider sx={{ my: 3 }} />
              
              <TextField
                fullWidth
                label="Admin Notes (Optional)"
                multiline
                rows={2}
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Add any notes about this payment verification..."
              />

              {/* Payment Messages/Chat Section */}
              <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                  Messages with User
                </Typography>
                <Paper sx={{ maxHeight: 200, overflow: 'auto', p: 2, bgcolor: '#f8fafc', mb: 2 }}>
                  <PaymentMessagesChat paymentId={selectedPayment.id} />
                </Paper>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setProofDialog(false)}>Cancel</Button>
          <Button 
            color="error" 
            variant="outlined"
            onClick={() => {
              setRejectDialog(true);
            }}
          >
            Reject
          </Button>
          <Button 
            variant="contained" 
            color="success"
            startIcon={<CheckCircle />}
            onClick={() => handleApprovePayment(selectedPayment?.id)}
          >
            Approve & Activate
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialog} onClose={() => setRejectDialog(false)}>
        <DialogTitle>Reject Payment</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            This will reject the payment and notify the user.
          </Alert>
          <TextField
            fullWidth
            label="Rejection Reason *"
            multiline
            rows={3}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Please provide a reason for rejection..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectDialog(false)}>Cancel</Button>
          <Button 
            color="error" 
            variant="contained"
            onClick={handleRejectPayment}
          >
            Reject Payment
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

// Activity Logs Component
const ActivityLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const response = await api.get('/admin/logs');
      setLogs(response.data.logs || []);
    } catch (error) {
      // Mock data
      setLogs([
        { id: '1', action: 'User Registered', user: 'rama@example.com', timestamp: new Date(), details: 'New user registration' },
        { id: '2', action: 'Photo Approved', user: 'admin', timestamp: new Date(Date.now() - 3600000), details: 'Profile photo verified' },
        { id: '3', action: 'Subscription Created', user: 'sowmya@example.com', timestamp: new Date(Date.now() - 7200000), details: 'Premium plan activated' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Typography variant="h5" fontWeight="bold" gutterBottom>Activity Logs</Typography>
      <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
        Track all platform activities
      </Typography>

      {loading ? (
        <LinearProgress />
      ) : (
        <Card sx={{ borderRadius: 3 }}>
          <List>
            {logs.map((log, index) => (
              <Box key={log.id}>
                <ListItem sx={{ py: 2 }}>
                  <ListItemIcon>
                    <Avatar sx={{ bgcolor: '#8B5CF6', width: 40, height: 40 }}>
                      <History sx={{ fontSize: 20 }} />
                    </Avatar>
                  </ListItemIcon>
                  <ListItemText
                    primary={log.action}
                    secondary={
                      <>
                        <Typography variant="body2" component="span">
                          {log.user}
                        </Typography>
                        <Typography variant="caption" display="block" color="textSecondary">
                          {log.details}
                        </Typography>
                      </>
                    }
                  />
                  <Chip
                    label={new Date(log.timestamp).toLocaleString()}
                    size="small"
                    sx={{ bgcolor: '#f0f0f0' }}
                  />
                </ListItem>
                {index < logs.length - 1 && <Divider />}
              </Box>
            ))}
          </List>
        </Card>
      )}
    </Box>
  );
};

// Admin Settings Component
const AdminSettings = () => {
  const [settings, setSettings] = useState({
    emailNotifications: true,
    photoApprovalAlerts: true,
    userSignupAlerts: true,
    maintenanceMode: false
  });

  return (
    <Box>
      <Typography variant="h5" fontWeight="bold" gutterBottom>Admin Settings</Typography>
      <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
        Configure admin panel preferences
      </Typography>

      <Card sx={{ borderRadius: 3, p: 3 }}>
        <Typography variant="h6" gutterBottom>Notifications</Typography>
        <Divider sx={{ mb: 2 }} />
        
        <FormControlLabel
          control={
            <Switch
              checked={settings.emailNotifications}
              onChange={(e) => setSettings({ ...settings, emailNotifications: e.target.checked })}
            />
          }
          label="Email Notifications"
        />
        <FormControlLabel
          control={
            <Switch
              checked={settings.photoApprovalAlerts}
              onChange={(e) => setSettings({ ...settings, photoApprovalAlerts: e.target.checked })}
            />
          }
          label="Photo Approval Alerts"
        />
        <FormControlLabel
          control={
            <Switch
              checked={settings.userSignupAlerts}
              onChange={(e) => setSettings({ ...settings, userSignupAlerts: e.target.checked })}
            />
          }
          label="New User Signup Alerts"
        />
      </Card>

      <Card sx={{ borderRadius: 3, p: 3, mt: 3 }}>
        <Typography variant="h6" gutterBottom>Platform Settings</Typography>
        <Divider sx={{ mb: 2 }} />
        
        <FormControlLabel
          control={
            <Switch
              checked={settings.maintenanceMode}
              onChange={(e) => setSettings({ ...settings, maintenanceMode: e.target.checked })}
              color="warning"
            />
          }
          label="Maintenance Mode"
        />
        <Typography variant="caption" color="textSecondary" display="block" sx={{ mt: 1 }}>
          When enabled, regular users will see a maintenance message
        </Typography>
      </Card>

      <Box sx={{ mt: 3 }}>
        <Button variant="contained" color="primary">
          Save Settings
        </Button>
      </Box>
    </Box>
  );
};

export default AdminPanel;
