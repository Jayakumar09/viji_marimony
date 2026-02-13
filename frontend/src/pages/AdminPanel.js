import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { 
  Box, Tabs, Tab, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Button, Chip, TextField, Dialog, DialogTitle, DialogContent, DialogActions,
  Card, CardContent, Typography, Grid, IconButton, Avatar
} from '@mui/material';
import { CheckCircle, Cancel, Visibility, Refresh } from '@mui/icons-material';
import api from '../services/api';
import { useAuth } from '../hooks/useAuth';

const AdminPanel = () => {
  const [tab, setTab] = useState(0);
  const { user } = useAuth();
  const navigate = useNavigate();

  // Simple admin check - in production, this should be server-side verified
  // Only vijayalakshmijayakumar45@gmail.com is the admin
  const isAdmin = user?.email === 'vijayalakshmijayakumar45@gmail.com';

  if (!isAdmin) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="h5" color="error">Access Denied</Typography>
        <Typography>You do not have admin privileges.</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#f5f5f5' }}>
      {/* Sidebar */}
      <Box sx={{ width: 240, bgcolor: '#8B5CF6', color: 'white', p: 2 }}>
        <Typography variant="h6" sx={{ mb: 3, fontWeight: 'bold' }}>
          Admin Panel
        </Typography>
        <Button
          fullWidth
          sx={{ justifyContent: 'flex-start', mb: 1, color: 'white' }}
          onClick={() => navigate('/admin/dashboard')}
        >
          📊 Dashboard
        </Button>
        <Button
          fullWidth
          sx={{ justifyContent: 'flex-start', mb: 1, color: 'white' }}
          onClick={() => navigate('/admin/photos')}
        >
          📷 Photo Approvals
        </Button>
        <Button
          fullWidth
          sx={{ justifyContent: 'flex-start', mb: 1, color: 'white' }}
          onClick={() => navigate('/admin/users')}
        >
          👥 Users
        </Button>
      </Box>

      {/* Main Content */}
      <Box sx={{ flex: 1, p: 3 }}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/photos" element={<PhotoApprovals />} />
          <Route path="/users" element={<UserManagement />} />
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
    verificationRate: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await api.get('/admin/dashboard');
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>Admin Dashboard</Typography>
      
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>Total Users</Typography>
              <Typography variant="h4">{stats.totalUsers}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>Verified Users</Typography>
              <Typography variant="h4">{stats.verifiedUsers}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>Pending Photos</Typography>
              <Typography variant="h4" color="warning.main">{stats.pendingPhotoVerifications}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>New Today</Typography>
              <Typography variant="h4">{stats.newUsersToday}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="h6">Verification Rate</Typography>
          <Box sx={{ mt: 2 }}>
            <Box sx={{ 
              height: 30, 
              bgcolor: '#e0e0e0', 
              borderRadius: 15,
              overflow: 'hidden'
            }}>
              <Box sx={{ 
                width: `${stats.verificationRate}%`, 
                height: '100%', 
                bgcolor: '#4CAF50',
                transition: 'width 0.5s'
              }} />
            </Box>
            <Typography sx={{ mt: 1 }}>{stats.verificationRate}% of users are verified</Typography>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

// Photo Approvals Component
const PhotoApprovals = () => {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rejectDialog, setRejectDialog] = useState({ open: false, photoId: null, reason: '' });
  const [pagination, setPagination] = useState({ page: 1, pages: 1 });

  useEffect(() => {
    fetchPhotos();
  }, [pagination.page]);

  const fetchPhotos = async () => {
    try {
      const response = await api.get(`/admin/photos/pending?page=${pagination.page}&limit=10`);
      setPhotos(response.data.photos);
      setPagination(prev => ({ ...prev, ...response.data.pagination }));
    } catch (error) {
      console.error('Failed to fetch photos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (photoId) => {
    try {
      await api.put(`/admin/photos/${photoId}/approve`);
      fetchPhotos();
    } catch (error) {
      console.error('Failed to approve photo:', error);
    }
  };

  const handleReject = async () => {
    try {
      await api.put(`/admin/photos/${rejectDialog.photoId}/reject`, {
        reason: rejectDialog.reason
      });
      setRejectDialog({ open: false, photoId: null, reason: '' });
      fetchPhotos();
    } catch (error) {
      console.error('Failed to reject photo:', error);
    }
  };

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>Photo Verification</Typography>
      
      {loading ? (
        <Typography>Loading...</Typography>
      ) : photos.length === 0 ? (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="h6" color="textSecondary">No pending photos to review</Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                <TableCell>User</TableCell>
                <TableCell>Photo</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Submitted</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {photos.map((photo) => (
                <TableRow key={photo.id}>
                  <TableCell>
                    <Box>
                      <Typography variant="body2" fontWeight="bold">
                        {photo.user.firstName} {photo.user.lastName}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {photo.user.email}
                      </Typography>
                      <Typography variant="caption" color="textSecondary" display="block">
                        {photo.user.city}, {photo.user.state}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <img 
                      src={photo.photoUrl} 
                      alt="Verification photo"
                      style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8 }}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip label={photo.photoType} size="small" />
                  </TableCell>
                  <TableCell>
                    {new Date(photo.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <IconButton 
                        color="success" 
                        onClick={() => handleApprove(photo.id)}
                        title="Approve"
                      >
                        <CheckCircle />
                      </IconButton>
                      <IconButton 
                        color="error" 
                        onClick={() => setRejectDialog({ open: true, photoId: photo.id, reason: '' })}
                        title="Reject"
                      >
                        <Cancel />
                      </IconButton>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Pagination */}
      {pagination.pages > 1 && (
        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center', gap: 1 }}>
          <Button 
            disabled={pagination.page === 1}
            onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
          >
            Previous
          </Button>
          <Typography sx={{ alignSelf: 'center' }}>
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

      {/* Reject Dialog */}
      <Dialog open={rejectDialog.open} onClose={() => setRejectDialog({ ...rejectDialog, open: false })}>
        <DialogTitle>Reject Photo</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Rejection Reason"
            fullWidth
            multiline
            rows={3}
            value={rejectDialog.reason}
            onChange={(e) => setRejectDialog({ ...rejectDialog, reason: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectDialog({ ...rejectDialog, open: false })}>Cancel</Button>
          <Button onClick={handleReject} color="error" variant="contained">
            Reject
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

// User Management Component
const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState({ page: 1, pages: 1 });

  useEffect(() => {
    fetchUsers();
  }, [pagination.page, search]);

  const fetchUsers = async () => {
    try {
      const response = await api.get(`/admin/users?page=${pagination.page}&limit=20&search=${search}`);
      setUsers(response.data.users);
      setPagination(prev => ({ ...prev, ...response.data.pagination }));
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>User Management</Typography>
      
      <TextField
        fullWidth
        placeholder="Search users..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        sx={{ mb: 3 }}
      />

      {loading ? (
        <Typography>Loading...</Typography>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                <TableCell>Name</TableCell>
                <TableCell>Contact</TableCell>
                <TableCell>Location</TableCell>
                <TableCell>Verification</TableCell>
                <TableCell>Joined</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <Typography variant="body2" fontWeight="bold">
                      {user.firstName} {user.lastName}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{user.email}</Typography>
                    <Typography variant="caption" color="textSecondary">{user.phone || 'No phone'}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{user.city}</Typography>
                    <Typography variant="caption" color="textSecondary">{user.state}</Typography>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                      <Chip 
                        label={user.emailVerified ? 'Email ✅' : 'Email ❌'} 
                        size="small"
                        color={user.emailVerified ? 'success' : 'default'}
                      />
                      <Chip 
                        label={user.phoneVerified ? 'Phone ✅' : 'Phone ❌'} 
                        size="small"
                        color={user.phoneVerified ? 'success' : 'default'}
                      />
                      <Chip 
                        label={user.isVerified ? 'Verified ✅' : 'Not Verified'} 
                        size="small"
                        color={user.isVerified ? 'success' : 'default'}
                      />
                    </Box>
                  </TableCell>
                  <TableCell>
                    {new Date(user.createdAt).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
};

export default AdminPanel;
