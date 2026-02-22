/**
 * Payment Success Page
 * 
 * Displayed after successful PhonePe payment
 * Shows transaction details and subscription info
 * 
 * @version 1.0.0
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Chip,
  Paper
} from '@mui/material';
import {
  CheckCircle,
  Error,
  HourglassEmpty,
  Receipt
} from '@mui/icons-material';
import phonepeService from '../services/phonepeService';

const PaymentSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [paymentDetails, setPaymentDetails] = useState(null);
  const [error, setError] = useState(null);

  const orderId = searchParams.get('orderId');
  const status = searchParams.get('status');
  const transactionId = searchParams.get('transactionId');

  useEffect(() => {
    if (orderId) {
      verifyPayment();
    } else {
      setLoading(false);
    }
  }, [orderId]);

  const verifyPayment = async () => {
    try {
      setLoading(true);
      const result = await phonepeService.checkPaymentStatus(orderId);
      setPaymentDetails(result);
    } catch (err) {
      console.error('Failed to verify payment:', err);
      setError('Failed to verify payment status. Please contact support.');
    } finally {
      setLoading(false);
    }
  };

  const getPaymentModeDisplay = (mode) => {
    const modeMap = {
      'PAY_PAGE': 'All Payment Methods',
      'UPI': 'UPI',
      'CARD': 'Card Payment',
      'WALLET': 'Wallet',
      'NET_BANKING': 'Net Banking',
      'BANK_TRANSFER': 'Direct Bank Transfer'
    };
    return modeMap[mode] || mode || 'Online';
  };

  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: '#FAF7FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Box sx={{ textAlign: 'center' }}>
          <CircularProgress size={60} sx={{ color: '#8B5CF6', mb: 2 }} />
          <Typography color="text.secondary">Verifying payment...</Typography>
        </Box>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: '#FAF7FF', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2 }}>
        <Card sx={{ maxWidth: 400, width: '100%', textAlign: 'center', p: 3 }}>
          <Box sx={{ width: 64, height: 64, bgcolor: '#FEE2E2', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2 }}>
            <Error sx={{ fontSize: 32, color: 'error.main' }} />
          </Box>
          <Typography variant="h5" fontWeight="bold" gutterBottom>Verification Failed</Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>{error}</Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Button variant="contained" fullWidth onClick={() => navigate('/subscription')} sx={{ bgcolor: '#8B5CF6', '&:hover': { bgcolor: '#7C3AED' } }}>
              Try Again
            </Button>
            <Button variant="outlined" fullWidth component={Link} to="/dashboard">
              Go to Dashboard
            </Button>
          </Box>
        </Card>
      </Box>
    );
  }

  const isSuccess = paymentDetails?.status === 'SUCCESS' || status === 'SUCCESS';

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#FAF7FF', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2 }}>
      <Card sx={{ maxWidth: 400, width: '100%', overflow: 'hidden' }}>
        {/* Status Header */}
        <Box sx={{ bgcolor: isSuccess ? '#22C55E' : '#EAB308', p: 3, textAlign: 'center' }}>
          <Box sx={{ width: 80, height: 80, bgcolor: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2 }}>
            {isSuccess ? (
              <CheckCircle sx={{ fontSize: 40, color: 'success.main' }} />
            ) : (
              <HourglassEmpty sx={{ fontSize: 40, color: 'warning.main' }} />
            )}
          </Box>
          <Typography variant="h5" fontWeight="bold" color="white">
            {isSuccess ? 'Payment Successful!' : 'Payment Processing'}
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)', mt: 0.5 }}>
            {isSuccess ? 'Your subscription is now active' : 'Your payment is being processed'}
          </Typography>
        </Box>

        {/* Payment Details */}
        <CardContent sx={{ p: 3 }}>
          {paymentDetails ? (
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1.5, borderBottom: '1px solid #f0f0f0' }}>
                <Typography variant="body2" color="text.secondary">Transaction ID</Typography>
                <Typography variant="body2" fontWeight="medium">
                  {paymentDetails.transactionId || transactionId || 'Processing...'}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1.5, borderBottom: '1px solid #f0f0f0' }}>
                <Typography variant="body2" color="text.secondary">Order ID</Typography>
                <Typography variant="body2" fontWeight="medium">{paymentDetails.orderId || orderId}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1.5, borderBottom: '1px solid #f0f0f0' }}>
                <Typography variant="body2" color="text.secondary">Amount</Typography>
                <Typography variant="h6" fontWeight="bold">₹{paymentDetails.amount}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1.5, borderBottom: '1px solid #f0f0f0' }}>
                <Typography variant="body2" color="text.secondary">Payment Mode</Typography>
                <Typography variant="body2" fontWeight="medium">
                  {getPaymentModeDisplay(paymentDetails.paymentMode)}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1.5 }}>
                <Typography variant="body2" color="text.secondary">Status</Typography>
                <Chip
                  label={paymentDetails.status}
                  size="small"
                  color={paymentDetails.status === 'SUCCESS' ? 'success' : 'warning'}
                />
              </Box>
            </Box>
          ) : (
            <Box sx={{ textAlign: 'center', py: 2 }}>
              <Typography color="text.secondary">No payment details available</Typography>
            </Box>
          )}
        </CardContent>

        {/* Actions */}
        <Box sx={{ px: 3, pb: 3, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <Button variant="contained" fullWidth onClick={() => navigate('/dashboard')} sx={{ bgcolor: '#8B5CF6', '&:hover': { bgcolor: '#7C3AED' } }}>
            Go to Dashboard
          </Button>
          <Button variant="outlined" fullWidth component={Link} to="/profile">
            View Profile
          </Button>
        </Box>

        {/* Support Info */}
        <Paper sx={{ bgcolor: '#f5f5f5', p: 2, textAlign: 'center', borderRadius: 0 }}>
          <Typography variant="caption" color="text.secondary">
            Need help? Contact us at{' '}
            <a href="mailto:support@boyarmatrimony.com" style={{ color: '#8B5CF6' }}>
              support@boyarmatrimony.com
            </a>
          </Typography>
        </Paper>
      </Card>
    </Box>
  );
};

export default PaymentSuccess;
