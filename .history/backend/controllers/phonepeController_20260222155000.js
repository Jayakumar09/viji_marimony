/**
 * PhonePe Payment Controller
 * 
 * Handles all PhonePe payment-related HTTP requests:
 * - Payment initiation
 * - Payment status check
 * - Callback handling
 * - Bank transfer requests
 * 
 * @version 1.0.0
 */

const phonepeService = require('../services/phonepeService');
const phonepeConfig = require('../config/phonepeConfig');
const { prisma } = require('../utils/database');

/**
 * GET /api/phonepe/config
 * Get PhonePe configuration for frontend
 */
const getConfig = async (req, res) => {
  try {
    res.json({
      success: true,
      config: {
        isConfigured: phonepeConfig.isConfigured(),
        environment: phonepeConfig.environment,
        paymentModes: Object.values(phonepeConfig.paymentModes),
        plans: Object.values(phonepeConfig.plans),
        verificationPricing: Object.values(phonepeConfig.verificationPricing),
        frontendUrl: phonepeConfig.frontendUrl
      }
    });
  } catch (error) {
    console.error('Get PhonePe config error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get PhonePe configuration' 
    });
  }
};

/**
 * GET /api/phonepe/plans
 * Get available subscription plans
 */
const getPlans = async (req, res) => {
  try {
    res.json({
      success: true,
      plans: Object.values(phonepeConfig.plans)
    });
  } catch (error) {
    console.error('Get PhonePe plans error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get plans' 
    });
  }
};

/**
 * POST /api/phonepe/initiate
 * Initiate a PhonePe payment
 * 
 * Request body:
 * - plan: Plan ID (BASIC, PRO, PREMIUM) or verification type (BASIC_AI, ADVANCED_AI)
 * - paymentMode: Payment mode (PAY_PAGE, UPI, CARD, WALLET, NET_BANKING, BANK_TRANSFER)
 * - type: Payment type (SUBSCRIPTION or VERIFICATION)
 */
const initiatePayment = async (req, res) => {
  try {
    const { plan, paymentMode = 'PAY_PAGE', type = 'SUBSCRIPTION' } = req.body;
    const userId = req.user.id;

    console.log('=== PhonePe Payment Initiation ===');
    console.log('User ID:', userId);
    console.log('Plan:', plan);
    console.log('Payment Mode:', paymentMode);
    console.log('Type:', type);

    // Validate plan
    let amount;
    let planId = plan;

    if (type === 'SUBSCRIPTION') {
      const planConfig = phonepeConfig.plans[plan];
      if (!planConfig) {
        return res.status(400).json({
          success: false,
          error: 'Invalid plan. Available plans: BASIC, PRO, PREMIUM'
        });
      }
      amount = planConfig.price;
    } else if (type === 'VERIFICATION') {
      const verificationConfig = phonepeConfig.verificationPricing[plan];
      if (!verificationConfig) {
        return res.status(400).json({
          success: false,
          error: 'Invalid verification type. Available types: BASIC_AI, ADVANCED_AI'
        });
      }
      amount = verificationConfig.price;
    } else {
      return res.status(400).json({
        success: false,
        error: 'Invalid type. Use SUBSCRIPTION or VERIFICATION'
      });
    }

    // Handle bank transfer separately
    if (paymentMode === 'BANK_TRANSFER') {
      const result = await phonepeService.getBankTransferDetails({
        userId,
        amount,
        planId
      });

      return res.json(result);
    }

    // Get user's mobile number
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { phone: true }
    });

    const mobileNumber = user?.phone?.replace('+91', '').replace(/\D/g, '') || '9999999999';

    // Initiate PhonePe payment
    const result = await phonepeService.initiatePayment({
      userId,
      amount,
      planId,
      paymentMode,
      mobileNumber,
      type
    });

    res.json(result);
  } catch (error) {
    console.error('PhonePe payment initiation error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to initiate payment'
    });
  }
};

/**
 * GET /api/phonepe/status/:orderId
 * Check payment status
 */
const checkStatus = async (req, res) => {
  try {
    const { orderId } = req.params;

    console.log('=== PhonePe Status Check ===');
    console.log('Order ID:', orderId);

    if (!orderId) {
      return res.status(400).json({
        success: false,
        error: 'Order ID is required'
      });
    }

    const result = await phonepeService.checkPaymentStatus(orderId);
    res.json(result);
  } catch (error) {
    console.error('PhonePe status check error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to check payment status'
    });
  }
};

/**
 * POST /api/phonepe/callback
 * Handle PhonePe callback webhook
 */
const handleCallback = async (req, res) => {
  try {
    console.log('=== PhonePe Callback ===');
    console.log('Headers:', JSON.stringify(req.headers, null, 2));
    console.log('Body:', JSON.stringify(req.body, null, 2));

    const callbackData = req.body;
    
    // Get signature from headers (PhonePe uses 'x-verify' header)
    const signature = req.headers['x-verify'] || req.headers['x-Verify'];
    
    // Get raw body for signature verification
    // Note: This requires express.json() to be configured with verify callback
    // or use express.raw() for this route
    const rawPayload = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);

    // Process callback with signature verification
    const result = await phonepeService.handleCallback(callbackData, rawPayload, signature);

    // Always return 200 to PhonePe
    res.status(200).json({
      success: true,
      message: 'Callback processed'
    });
  } catch (error) {
    console.error('PhonePe callback error:', error);
    // Still return 200 to avoid retries, but log the error
    res.status(200).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * GET /api/phonepe/redirect
 * Handle redirect from PhonePe after payment
 */
const handleRedirect = async (req, res) => {
  try {
    const { orderId, transactionId, state } = req.query;

    console.log('=== PhonePe Redirect ===');
    console.log('Order ID:', orderId);
    console.log('Transaction ID:', transactionId);
    console.log('State:', state);

    // Check payment status
    let paymentStatus = null;
    if (orderId) {
      try {
        paymentStatus = await phonepeService.checkPaymentStatus(orderId);
      } catch (error) {
        console.error('Failed to check payment status on redirect:', error);
      }
    }

    // Redirect to frontend success page with parameters
    const frontendUrl = phonepeConfig.frontendUrl;
    const redirectUrl = `${frontendUrl}/payment/success?orderId=${orderId || ''}&status=${paymentStatus?.status || state || 'PENDING'}&transactionId=${transactionId || ''}`;

    res.redirect(redirectUrl);
  } catch (error) {
    console.error('PhonePe redirect error:', error);
    res.redirect(`${phonepeConfig.frontendUrl}/payment/failure?error=redirect_error`);
  }
};

/**
 * POST /api/phonepe/bank-transfer
 * Initiate bank transfer payment
 */
const initiateBankTransfer = async (req, res) => {
  try {
    const { plan, type = 'SUBSCRIPTION' } = req.body;
    const userId = req.user.id;

    console.log('=== Bank Transfer Initiation ===');
    console.log('User ID:', userId);
    console.log('Plan:', plan);
    console.log('Type:', type);

    // Validate plan and get amount
    let amount;
    let planId = plan;

    if (type === 'SUBSCRIPTION') {
      const planConfig = phonepeConfig.plans[plan];
      if (!planConfig) {
        return res.status(400).json({
          success: false,
          error: 'Invalid plan'
        });
      }
      amount = planConfig.price;
    } else if (type === 'VERIFICATION') {
      const verificationConfig = phonepeConfig.verificationPricing[plan];
      if (!verificationConfig) {
        return res.status(400).json({
          success: false,
          error: 'Invalid verification type'
        });
      }
      amount = verificationConfig.price;
    }

    const result = await phonepeService.getBankTransferDetails({
      userId,
      amount,
      planId
    });

    res.json(result);
  } catch (error) {
    console.error('Bank transfer initiation error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to initiate bank transfer'
    });
  }
};

/**
 * GET /api/phonepe/payment-modes
 * Get available payment modes
 */
const getPaymentModes = async (req, res) => {
  try {
    res.json({
      success: true,
      paymentModes: Object.values(phonepeConfig.paymentModes)
    });
  } catch (error) {
    console.error('Get payment modes error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get payment modes'
    });
  }
};

module.exports = {
  getConfig,
  getPlans,
  initiatePayment,
  checkStatus,
  handleCallback,
  handleRedirect,
  initiateBankTransfer,
  getPaymentModes
};
