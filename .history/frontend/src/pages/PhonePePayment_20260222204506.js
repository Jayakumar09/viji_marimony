/**
 * PhonePe Payment Page
 * 
 * Subscription payment page with PhonePe integration
 * Supports multiple payment modes including bank transfer
 * 
 * @version 1.0.0
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Chip,
  Alert,
  CircularProgress,
  Divider,
  Paper,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  FormLabel
} from '@mui/material';
import {
  CheckCircle,
  CreditCard,
  AccountBalance,
  PhoneIphone,
  Wallet,
  Error as ErrorIcon,
  Star
} from '@mui/icons-material';
import phonepeService, { PHONEPE_PLANS, PAYMENT_MODES } from '../services/phonepeService';
import { useAuth } from '../hooks/useAuth';

const PhonePePayment = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  const [selectedPlan, setSelectedPlan] = useState('PRO');
  const [selectedPaymentMode, setSelectedPaymentMode] = useState('PAY_PAGE');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [bankTransferDetails, setBankTransferDetails] = useState(null);
  const [paymentConfig, setPaymentConfig] = useState(null);

  // Check for redirect from PhonePe or plan selection from Profile
  useEffect(() => {
    const orderId = searchParams.get('orderId');
    const status = searchParams.get('status');
    const transactionId = searchParams.get('transactionId');
    const planFromUrl = searchParams.get('plan');

    // If plan is specified in URL, select it
    if (planFromUrl && ['BASIC', 'PRO', 'PREMIUM'].includes(planFromUrl)) {
      setSelectedPlan(planFromUrl);
    }

    if (orderId && status) {
      // Handle redirect from PhonePe
      handlePaymentRedirect(orderId, status, transactionId);
    }
  }, [searchParams]);

  // Load PhonePe config
  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const config = await phonepeService.getConfig();
      setPaymentConfig(config.config);
    } catch (err) {
      console.error('Failed to load PhonePe config:', err);
    }
  };

  const handlePaymentRedirect = async (orderId, status, transactionId) => {
    setLoading(true);
    try {
      // Check actual payment status from backend
      const result = await phonepeService.checkPaymentStatus(orderId);
      
      if (result.status === 'SUCCESS') {
        navigate('/dashboard', {
          state: {
            message: 'Payment successful! Your subscription is now active.',
            type: 'success'
          }
        });
      } else {
        setError(`Payment status: ${result.status}. Please try again or contact support.`);
      }
    } catch (err) {
      console.error('Failed to verify payment:', err);
      setError('Failed to verify payment status. Please contact support.');
    } finally {
      setLoading(false);
    }
  };

  const handlePlanSelect = (planId) => {
    setSelectedPlan(planId);
    setBankTransferDetails(null);
    setError(null);
  };

  const handlePaymentModeSelect = (modeId) => {
    setSelectedPaymentMode(modeId);
    setBankTransferDetails(null);
    setError(null);
  };

  const handlePayment = async () => {
    setLoading(true);
    setError(null);
    setBankTransferDetails(null);

    try {
      const result = await phonepeService.initiatePayment({
        plan: selectedPlan,
        paymentMode: selectedPaymentMode,
        type: 'SUBSCRIPTION'
      });

      if (result.success) {
        if (selectedPaymentMode === 'BANK_TRANSFER') {
          // Show bank transfer details
          setBankTransferDetails(result);
        } else {
          // Use PhonePe SDK for checkout
          // The backend returns all necessary data for SDK integration
          const checkoutResult = phonepeService.redirectToCheckout({
            merchantId: result.merchantId,
            orderId: result.phonepeOrderId,
            amount: result.amount,
            redirectUrl: result.redirectUrl,
            callbackUrl: result.callbackUrl
          });
          
          if (checkoutResult.usePopup) {
            // Watch for popup close
            const checkClosed = setInterval(() => {
              if (checkoutResult.popup?.closed) {
                clearInterval(checkClosed);
                // Verify payment status
                handlePaymentRedirect(result.phonepeOrderId, 'PENDING');
              }
            }, 500);
          }
        }
      } else {
        setError(result.error || 'Failed to initiate payment');
      }
    } catch (err) {
      console.error('Payment initiation error:', err);
      setError(err.response?.data?.error || err.message || 'Failed to initiate payment');
    } finally {
      setLoading(false);
    }
  };

  const getSelectedPlanDetails = () => {
    return PHONEPE_PLANS.find(p => p.id === selectedPlan);
  };

  const getPaymentIcon = (modeId) => {
    switch (modeId) {
      case 'PAY_PAGE': return <CreditCard fontSize="small" />;
      case 'UPI': return <PhoneIphone fontSize="small" />;
      case 'CARD': return <CreditCard fontSize="small" />;
      case 'WALLET': return <Wallet fontSize="small" />;
      case 'NET_BANKING': return <AccountBalance fontSize="small" />;
      case 'BANK_TRANSFER': return <AccountBalance fontSize="small" />;
      default: return <CreditCard fontSize="small" />;
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#FAF7FF', py: 2, px: 2 }}>
      <Box sx={{ maxWidth: 500, mx: 'auto' }}>
        {/* Header */}
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Typography variant="h6" fontWeight="bold" color="text.primary">
            Choose Your Plan
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Select a plan and payment method
          </Typography>
        </Box>

        {/* Plans Section */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" fontWeight="-semibold" color="text.primary" sx={{ mb: 1.5 }}>
            Select Plan
          </Typography>
          <Grid container spacing={1.5}>
            {PHONEPE_PLANS.map((plan) => (
              <Grid item xs={4} key={plan.id}>
                <Card
                  onClick={() => handlePlanSelect(plan.id)}
                  sx={{
                    cursor: 'pointer',
                    border: selectedPlan === plan.id ? '2px solid #8B5CF6' : '1px solid #e0e0e0',
                    bgcolor: selectedPlan === plan.id ? '#F5F3FF' : 'white',
                    transition: 'all 0.2s',
                    height: '100%',
                    position: 'relative',
                    '&:hover': {
                      borderColor: '#8B5CF6'
                    }
                  }}
                >
                  {plan.id === 'PRO' && (
                    <Chip
                      label="POPULAR"
                      size="small"
                      sx={{
                        position: 'absolute',
                        top: -8,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        bgcolor: '#8B5CF6',
                        color: 'white',
                        fontSize: '0.6rem',
                        height: 18
                      }}
                    />
                  )}
                  <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                    <Typography variant="subtitle2" fontWeight="bold" noWrap>
                      {plan.name.replace(' Plan', '')}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
                      <Typography variant="h6" fontWeight="bold">
                        ₹{plan.price}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        /{plan.validity}d
                      </Typography>
                    </Box>
                    <Box sx={{ mt: 0.5 }}>
                      {plan.features.slice(0, 2).map((feature, idx) => (
                        <Box key={idx} sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5, mb: 0.25 }}>
                          <CheckCircle sx={{ fontSize: 12, color: 'success.main', mt: 0.25 }} />
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem', lineHeight: 1.2 }}>
                            {feature}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>

        {/* Payment Modes Section */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" fontWeight="-semibold" color="text.primary" sx={{ mb: 1.5 }}>
            Payment Method
          </Typography>
          <Grid container spacing={1}>
            {PAYMENT_MODES.map((mode) => (
              <Grid item xs={2} key={mode.id}>
                <Card
                  onClick={() => handlePaymentModeSelect(mode.id)}
                  sx={{
                    cursor: 'pointer',
                    border: selectedPaymentMode === mode.id ? '2px solid #8B5CF6' : '1px solid #e0e0e0',
                    bgcolor: selectedPaymentMode === mode.id ? '#F5F3FF' : 'white',
                    transition: 'all 0.2s',
                    textAlign: 'center',
                    '&:hover': {
                      borderColor: '#8B5CF6'
                    }
                  }}
                >
                  <CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
                    <Box sx={{ mb: 0.5 }}>
                      {getPaymentIcon(mode.id)}
                    </Box>
                    <Typography variant="caption" sx={{ fontSize: '0.6rem', display: 'block', lineHeight: 1.2 }}>
                      {mode.name.split(' ')[0]}
                    </Typography>
                    {mode.type === 'OFFLINE' && (
                      <Typography variant="caption" sx={{ fontSize: '0.5rem', color: 'orange' }}>
                        Offline
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>

        {/* Error Message */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} icon={<ErrorIcon fontSize="small" />}>
            <Typography variant="body2">{error}</Typography>
          </Alert>
        )}

        {/* Bank Transfer Details */}
        {bankTransferDetails && (
          <Paper sx={{ p: 2, mb: 2, bgcolor: '#E3F2FD' }}>
            <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1.5 }}>
              Bank Transfer Details
            </Typography>
            <Paper variant="outlined" sx={{ p: 1.5, mb: 1.5 }}>
              <Grid container spacing={1}>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Account Holder</Typography>
                  <Typography variant="body2" fontWeight="medium">{bankTransferDetails.bankDetails.accountHolderName}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Bank Name</Typography>
                  <Typography variant="body2" fontWeight="medium">{bankTransferDetails.bankDetails.bankName}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Account Number</Typography>
                  <Typography variant="body2" fontWeight="medium">{bankTransferDetails.bankDetails.accountNumber}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">IFSC Code</Typography>
                  <Typography variant="body2" fontWeight="medium">{bankTransferDetails.bankDetails.ifscCode}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Amount</Typography>
                  <Typography variant="body2" fontWeight="medium" color="success.main">₹{bankTransferDetails.amount}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Reference ID</Typography>
                  <Typography variant="body2" fontWeight="medium" color="primary">{bankTransferDetails.referenceId}</Typography>
                </Grid>
              </Grid>
            </Paper>
            <Alert severity="warning" sx={{ py: 0.5 }}>
              <Typography variant="caption" fontWeight="medium">Instructions:</Typography>
              <ul style={{ margin: 0, paddingLeft: 16, fontSize: '0.7rem' }}>
                {bankTransferDetails.instructions.map((instruction, index) => (
                  <li key={index}>{instruction}</li>
                ))}
              </ul>
            </Alert>
          </Paper>
        )}

        {/* Payment Summary */}
        <Paper sx={{ p: 2, mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="body2" color="text.secondary">
              {getSelectedPlanDetails()?.name}
            </Typography>
            <Typography variant="caption" color="text.disabled">
              {getSelectedPlanDetails()?.validity} days validity
            </Typography>
          </Box>
          <Typography variant="h6" fontWeight="bold" color="primary">
            ₹{getSelectedPlanDetails()?.price}
          </Typography>
        </Paper>

        {/* Pay Button */}
          <Button
            fullWidth
            variant="contained"
            size="large"
            onClick={handlePayment}
            disabled={loading}
            sx={{
              py: 1.5,
              bgcolor: '#8B5CF6',
              '&:hover': { bgcolor: '#7C3AED' },
              textTransform: 'none'
            }}
          >
            {loading ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CircularProgress size={20} color="inherit" />
                <Typography>Processing...</Typography>
              </Box>
            ) : (
              `Pay ₹${getSelectedPlanDetails()?.price}`
            )}
          </Button>

        {/* Security Note */}
        <Box sx={{ mt: 2, textAlign: 'center' }}>
          <Typography variant="caption" color="text.disabled" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
            <CheckCircle sx={{ fontSize: 14 }} />
            Secure payment by PhonePe
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default PhonePePayment;
