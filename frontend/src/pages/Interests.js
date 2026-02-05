import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import {
  Container,
  Paper,
  Typography,
  Tabs,
  Tab,
  Box,
  Card,
  CardContent,
  CardMedia,
  Avatar,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Pagination,
  CircularProgress,
  Alert,
  Grid,
  Divider
} from '@material-ui/core';
import {
  Person,
  CheckCircle,
  Cancel,
  Send,
  Close,
  VerifiedUser,
  Star,
  LocationOn,
  Work,
  School
} from '@material-ui/icons';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import interestService from '../services/interestService';

const Interests = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState(0);
  const [respondDialog, setRespondDialog] = useState(false);
  const [selectedInterest, setSelectedInterest] = useState(null);
  const [responseMessage, setResponseMessage] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const tabLabels = ['Received Interests', 'Sent Interests'];

  // Fetch received interests
  const { 
    data: receivedData, 
    isLoading: loadingReceived,
    refetch: refetchReceived
  } = useQuery(
    ['receivedInterests', currentPage],
    () => interestService.getReceivedInterests({ page: currentPage }),
    {
      enabled: activeTab === 0,
      keepPreviousData: true,
    }
  );

  // Fetch sent interests
  const { 
    data: sentData, 
    isLoading: loadingSent,
    refetch: refetchSent
  } = useQuery(
    ['sentInterests', currentPage],
    () => interestService.getSentInterests({ page: currentPage }),
    {
      enabled: activeTab === 1,
      keepPreviousData: true,
    }
  );

  // Fetch interest stats
  const { data: stats } = useQuery(
    'interestStats',
    interestService.getInterestStats,
    {
      refetchInterval: 30000, // Refetch every 30 seconds
    }
  );

  // Respond to interest mutation
  const respondMutation = useMutation(
    ({ interestId, status }) => interestService.respondToInterest(interestId, status),
    {
      onSuccess: (data) => {
        toast.success(data.message);
        setRespondDialog(false);
        setSelectedInterest(null);
        queryClient.invalidateQueries(['receivedInterests']);
        queryClient.invalidateQueries(['sentInterests']);
        queryClient.invalidateQueries('interestStats');
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || 'Failed to respond to interest');
      }
    }
  );

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    setCurrentPage(1);
  };

  const handlePageChange = (event, value) => {
    setCurrentPage(value);
  };

  const handleRespondInterest = (interest, action) => {
    setSelectedInterest(interest);
    setResponseMessage('');
    setRespondDialog(true);
  };

  const confirmResponse = (status) => {
    respondMutation.mutate({
      interestId: selectedInterest.id,
      status,
      message: responseMessage.trim()
    });
  };

  const InterestCard = ({ interest, type }) => {
    const user = type === 'received' ? interest.sender : interest.receiver;
    const isPending = interest.status === 'PENDING';
    const isAccepted = interest.status === 'ACCEPTED';
    const isRejected = interest.status === 'REJECTED';

    return (
      <Card style={{ marginBottom: '1rem' }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            {/* Profile Info */}
            <Grid item xs={12} sm={8}>
              <Box display="flex" alignItems="center" gap={2}>
                {user.profilePhoto ? (
                  <Avatar
                    src={user.profilePhoto}
                    alt={`${user.firstName} ${user.lastName}`}
                    style={{ width: 60, height: 60 }}
                  />
                ) : (
                  <Avatar style={{ width: 60, height: 60 }}>
                    <Person />
                  </Avatar>
                )}
                
                <Box flex={1}>
                  <Typography variant="h6">
                    {user.firstName} {user.lastName}, {user.age}
                    {user.isPremium && (
                      <Star style={{ color: '#FFD700', marginLeft: '4px' }} />
                    )}
                    {user.isVerified && (
                      <VerifiedUser style={{ color: '#4CAF50', marginLeft: '4px' }} />
                    )}
                  </Typography>
                  
                  <Box display="flex" alignItems="center" gap={1} mb={1}>
                    <LocationOn style={{ fontSize: 16, color: '#666' }} />
                    <Typography variant="body2" color="textSecondary">
                      {user.city}, {user.state}
                    </Typography>
                  </Box>

                  <Box display="flex" alignItems="center" gap={1} mb={1}>
                    <Work style={{ fontSize: 16, color: '#666' }} />
                    <Typography variant="body2" color="textSecondary">
                      {user.profession || 'Not specified'}
                    </Typography>
                  </Box>

                  <Box display="flex" alignItems="center" gap={1}>
                    <School style={{ fontSize: 16, color: '#666' }} />
                    <Typography variant="body2" color="textSecondary">
                      {user.education || 'Not specified'}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </Grid>

            {/* Status and Actions */}
            <Grid item xs={12} sm={4}>
              <Box textAlign="right">
                <Chip
                  label={interest.status.replace('_', ' ')}
                  color={
                    isPending ? 'default' :
                    isAccepted ? 'primary' : 'secondary'
                  }
                  size="small"
                  style={{ marginBottom: '1rem' }}
                />
                
                {type === 'received' && isPending && (
                  <Box display="flex" gap={1} justifyContent="flex-end">
                    <Button
                      variant="contained"
                      color="primary"
                      startIcon={<CheckCircle />}
                      onClick={() => handleRespondInterest(interest, 'accept')}
                      disabled={respondMutation.isLoading}
                    >
                      Accept
                    </Button>
                    <Button
                      variant="outlined"
                      color="secondary"
                      startIcon={<Cancel />}
                      onClick={() => handleRespondInterest(interest, 'reject')}
                      disabled={respondMutation.isLoading}
                    >
                      Reject
                    </Button>
                  </Box>
                )}

                <Typography variant="caption" display="block" color="textSecondary">
                  {format(new Date(interest.createdAt), 'MMM dd, yyyy hh:mm a')}
                </Typography>
              </Box>
            </Grid>
          </Grid>

          {interest.message && (
            <>
              <Divider style={{ margin: '1rem 0' }} />
              <Typography variant="body2" color="textSecondary">
                <strong>Message:</strong> {interest.message}
              </Typography>
            </>
          )}
        </CardContent>
      </Card>
    );
  };

  const currentData = activeTab === 0 ? receivedData : sentData;
  const currentLoading = activeTab === 0 ? loadingReceived : loadingSent;

  return (
    <Container maxWidth="lg" style={{ marginTop: '2rem' }}>
      <Typography variant="h4" gutterBottom style={{ color: '#8B5CF6', fontWeight: 'bold' }}>
        Interests
      </Typography>

      {/* Interest Stats */}
      {stats && (
        <Grid container spacing={2} style={{ marginBottom: '2rem' }}>
          <Grid item xs={12} sm={6} md={3}>
            <Paper style={{ padding: '1rem', textAlign: 'center' }}>
              <Typography variant="h4" color="#8B5CF6">
                {stats.stats.received.pending}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Pending
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Paper style={{ padding: '1rem', textAlign: 'center' }}>
              <Typography variant="h4" color="#4CAF50">
                {stats.stats.received.accepted}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Accepted
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Paper style={{ padding: '1rem', textAlign: 'center' }}>
              <Typography variant="h4" color="#F44336">
                {stats.stats.received.rejected}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Rejected
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Paper style={{ padding: '1rem', textAlign: 'center' }}>
              <Typography variant="h4" color="#2196F3">
                {stats.stats.sent.total}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Sent
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* Tabs */}
      <Paper>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          centered
        >
          {tabLabels.map((label, index) => (
            <Tab 
              key={index} 
              label={label}
              badgeContent={
                index === 0 && stats?.stats.received.pending > 0 
                  ? stats.stats.received.pending 
                  : 0
              }
            />
          ))}
        </Tabs>

        <div style={{ padding: '2rem' }}>
          {currentLoading ? (
            <Box display="flex" justifyContent="center" py={4}>
              <CircularProgress size={60} />
            </Box>
          ) : currentData?.interests?.length > 0 ? (
            <>
              {currentData.interests.map((interest) => (
                <InterestCard
                  key={interest.id}
                  interest={interest}
                  type={activeTab === 0 ? 'received' : 'sent'}
                />
              ))}

              {/* Pagination */}
              {currentData.pagination.totalPages > 1 && (
                <Box display="flex" justifyContent="center" mt={3}>
                  <Pagination
                    count={currentData.pagination.totalPages}
                    page={currentPage}
                    onChange={handlePageChange}
                    color="primary"
                    showFirstButton
                    showLastButton
                  />
                </Box>
              )}
            </>
          ) : (
            <Box textAlign="center" py={4}>
              <Send style={{ fontSize: 80, color: '#E0E0E0' }} />
              <Typography variant="h6" color="textSecondary" gutterBottom>
                No {activeTab === 0 ? 'received' : 'sent'} interests
              </Typography>
              <Typography variant="body2" color="textSecondary">
                {activeTab === 0 
                  ? 'You haven\'t received any interests yet'
                  : 'You haven\'t sent any interests yet'
                }
              </Typography>
            </Box>
          )}
        </div>
      </Paper>

      {/* Response Dialog */}
      <Dialog 
        open={respondDialog} 
        onClose={() => setRespondDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">
              Respond to Interest
            </Typography>
            <IconButton onClick={() => setRespondDialog(false)}>
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        
        <DialogContent>
          <Typography variant="body1" paragraph>
            From: <strong>{selectedInterest?.sender?.firstName} {selectedInterest?.sender?.lastName}</strong>
          </Typography>
          
          {selectedInterest?.message && (
            <Typography variant="body2" color="textSecondary" paragraph>
              "{selectedInterest.message}"
            </Typography>
          )}

          <TextField
            fullWidth
            label="Optional Message"
            multiline
            rows={3}
            value={responseMessage}
            onChange={(e) => setResponseMessage(e.target.value)}
            placeholder="Add a personal message (optional)"
            variant="outlined"
            style={{ marginTop: '1rem' }}
          />
        </DialogContent>

        <DialogActions>
          <Button 
            onClick={() => setRespondDialog(false)} 
            color="default"
          >
            Cancel
          </Button>
          <Button 
            onClick={() => confirmResponse('REJECTED')} 
            color="secondary"
            variant="outlined"
            disabled={respondMutation.isLoading}
          >
            Reject
          </Button>
          <Button 
            onClick={() => confirmResponse('ACCEPTED')} 
            color="primary"
            variant="contained"
            disabled={respondMutation.isLoading}
            startIcon={respondMutation.isLoading ? <CircularProgress size={20} /> : <CheckCircle />}
          >
            Accept
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Interests;