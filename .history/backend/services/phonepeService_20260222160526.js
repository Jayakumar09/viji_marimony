/**
 * PhonePe Payment Service
 * 
 * Handles all PhonePe payment operations including:
 * - OAuth token management
 * - Payment initiation (Checkout v2)
 * - Payment status verification
 * - Callback handling
 * 
 * @version 1.0.0
 */

const axios = require('axios');
const crypto = require('crypto');
const phonepeConfig = require('../config/phonepeConfig');
const { prisma } = require('../utils/database');

// Token cache
let cachedToken = null;
let tokenExpiry = null;
let tokenPromise = null; // For race condition protection

/**
 * Get OAuth access token from PhonePe
 * Uses client credentials flow with race condition protection
 * @returns {Promise<string>} Access token
 */
const getAccessToken = async () => {
  // Check if we have a valid cached token
  if (cachedToken && tokenExpiry && Date.now() < tokenExpiry) {
    console.log('Using cached PhonePe token');
    return cachedToken;
  }

  // Race condition protection: if a request is already in progress, wait for it
  if (tokenPromise) {
    console.log('Waiting for existing token request');
    return tokenPromise;
  }

  const baseUrl = phonepeConfig.getBaseUrl();
  const tokenUrl = `${baseUrl}${phonepeConfig.oauth.tokenUrl}`;

  console.log('Requesting new PhonePe token from:', tokenUrl);

  // Create the promise and store it
  tokenPromise = (async () => {
    try {
      const params = new URLSearchParams();
      params.append('client_id', phonepeConfig.clientId);
      params.append('client_secret', phonepeConfig.clientSecret);
      params.append('client_version', phonepeConfig.clientVersion);
      params.append('grant_type', phonepeConfig.oauth.grantType);

      const response = await axios.post(tokenUrl, params, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      const { access_token, expires_in } = response.data;

      if (!access_token) {
        throw new Error('No access token in response');
      }

      // Cache the token
      cachedToken = access_token;
      tokenExpiry = Date.now() + (expires_in * 1000) - 60000; // Subtract 1 minute for safety

      console.log('PhonePe token obtained successfully, expires in:', expires_in, 'seconds');

      return access_token;
    } catch (error) {
      console.error('PhonePe OAuth error:', error.response?.data || error.message);
      throw new Error(`Failed to get PhonePe access token: ${error.message}`);
    } finally {
      // Clear the promise so future requests can make new calls
      tokenPromise = null;
    }
  })();

  return tokenPromise;
};

/**
 * Initiate a PhonePe payment
 * @param {Object} params - Payment parameters
 * @param {string} params.userId - User ID
 * @param {number} params.amount - Amount in paise
 * @param {string} params.planId - Plan ID (BASIC, PRO, PREMIUM)
 * @param {string} params.paymentMode - Payment mode (PAY_PAGE, UPI, CARD, etc.)
 * @param {string} params.mobileNumber - User's mobile number
 * @param {string} params.type - Payment type (SUBSCRIPTION or VERIFICATION)
 * @returns {Promise<Object>} Payment details with checkout URL
 */
const initiatePayment = async (params) => {
  const { userId, amount, planId, paymentMode = 'PAY_PAGE', mobileNumber, type = 'SUBSCRIPTION' } = params;

  // Validate configuration
  if (!phonepeConfig.isConfigured()) {
    throw new Error('PhonePe is not configured. Please set environment variables.');
  }

  // Validate amount
  if (amount < phonepeConfig.validation.minAmount || amount > phonepeConfig.validation.maxAmount) {
    throw new Error(`Amount must be between ₹${phonepeConfig.validation.minAmount / 100} and ₹${phonepeConfig.validation.maxAmount / 100}`);
  }

  // Generate unique order ID
  const merchantOrderId = `ORD_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const merchantUserId = `USER_${userId.substring(0, 10)}`;

  // Get access token
  const accessToken = await getAccessToken();

  // Build payment payload
  const payload = {
    merchantId: phonepeConfig.merchantId,
    merchantOrderId: merchantOrderId,
    merchantUserId: merchantUserId,
    amount: amount,
    redirectUrl: phonepeConfig.getRedirectUrl(),
    redirectMode: phonepeConfig.callback.redirectMode,
    callbackUrl: phonepeConfig.getCallbackUrl(),
    mobileNumber: mobileNumber || '9999999999',
    paymentInstrument: {
      type: paymentMode
    }
  };

  console.log('PhonePe payment payload:', JSON.stringify(payload, null, 2));

  try {
    const baseUrl = phonepeConfig.getBaseUrl();
    const response = await axios.post(
      `${baseUrl}${phonepeConfig.endpoints.createPayment}`,
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `O-Bearer ${accessToken}`
        }
      }
    );

    const { orderId, state } = response.data;

    if (!orderId) {
      throw new Error('No orderId in PhonePe response');
    }

    // Construct checkout URL
    const checkoutUrl = `${phonepeConfig.getCheckoutUrl()}?orderId=${orderId}`;

    console.log('PhonePe payment initiated:', { orderId, merchantOrderId, checkoutUrl });

    // Store payment record in database
    const payment = await prisma.payments.create({
      data: {
        userId,
        orderId: merchantOrderId,
        amountINR: amount / 100, // Convert paise to rupees
        currency: 'INR',
        paymentMethod: 'PHONEPE',
        paymentStatus: 'PENDING',
        notes: JSON.stringify({
          phonepeOrderId: orderId,
          planId,
          paymentMode,
          type
        })
      }
    });

    return {
      success: true,
      orderId: merchantOrderId,
      phonepeOrderId: orderId,
      checkoutUrl,
      state,
      paymentId: payment.id
    };
  } catch (error) {
    console.error('PhonePe payment initiation error:', error.response?.data || error.message);
    throw new Error(`Failed to initiate PhonePe payment: ${error.response?.data?.message || error.message}`);
  }
};

/**
 * Check payment status from PhonePe
 * @param {string} orderId - Merchant order ID or PhonePe order ID
 * @returns {Promise<Object>} Payment status details
 */
const checkPaymentStatus = async (orderId) => {
  if (!phonepeConfig.isConfigured()) {
    throw new Error('PhonePe is not configured');
  }

  const accessToken = await getAccessToken();
  const baseUrl = phonepeConfig.getBaseUrl();

  try {
    const response = await axios.get(
      `${baseUrl}${phonepeConfig.endpoints.checkStatus}/${orderId}/status`,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `O-Bearer ${accessToken}`
        }
      }
    );

    const { orderId: phonepeOrderId, state, amount, paymentMode, transactionId } = response.data;

    console.log('PhonePe payment status:', { orderId, state, amount, transactionId });

    // Map PhonePe status to our status
    const mappedStatus = phonepeConfig.statusMapping[state] || state;

    return {
      success: true,
      orderId,
      phonepeOrderId,
      state,
      status: mappedStatus,
      amount: amount / 100, // Convert paise to rupees
      paymentMode,
      transactionId
    };
  } catch (error) {
    console.error('PhonePe status check error:', error.response?.data || error.message);
    throw new Error(`Failed to check payment status: ${error.response?.data?.message || error.message}`);
  }
};

/**
 * Verify PhonePe callback signature
 * PhonePe sends a signature in the headers that we need to verify
 * @param {string} payload - Raw request body as string
 * @param {string} signature - Signature from PhonePe headers (x-verify)
 * @returns {boolean} Whether the signature is valid
 */
const verifyCallbackSignature = (payload, signature) => {
  if (!signature) {
    console.error('No signature provided in PhonePe callback');
    return false;
  }

  try {
    // PhonePe uses SHA256 with the client secret as the key
    const clientSecret = phonepeConfig.clientSecret;
    if (!clientSecret) {
      console.error('PhonePe client secret not configured for signature verification');
      return false;
    }

    // Generate the expected signature
    const expectedSignature = crypto
      .createHmac('sha256', clientSecret)
      .update(payload)
      .digest('base64');

    // Compare signatures (constant-time comparison to prevent timing attacks)
    const isValid = crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );

    if (!isValid) {
      console.error('PhonePe callback signature mismatch');
    }

    return isValid;
  } catch (error) {
    console.error('Error verifying PhonePe signature:', error.message);
    return false;
  }
};

/**
 * Handle PhonePe callback webhook
 * @param {Object} callbackData - Callback data from PhonePe
 * @param {string} rawPayload - Raw request body for signature verification
 * @param {string} signature - Signature from PhonePe headers
 * @returns {Promise<Object>} Processing result
 */
const handleCallback = async (callbackData, rawPayload = null, signature = null) => {
  console.log('PhonePe callback received:', JSON.stringify(callbackData, null, 2));

  // Always require signature verification for security
  if (!rawPayload || !signature) {
    console.error('PhonePe callback missing signature - rejecting');
    throw new Error('Missing signature - cannot verify callback authenticity');
  }

  const isValid = verifyCallbackSignature(rawPayload, signature);
  if (!isValid) {
    throw new Error('Invalid callback signature - potential fraud attempt');
  }
  console.log('PhonePe callback signature verified successfully');

  const { orderId, state, amount, transactionId, paymentMode } = callbackData;

  if (!orderId) {
    throw new Error('No orderId in callback data');
  }

  // Map status
  const mappedStatus = phonepeConfig.statusMapping[state] || state;

  // Find payment by PhonePe order ID (stored in notes)
  const payment = await prisma.payments.findFirst({
    where: {
      notes: {
        contains: orderId
      }
    }
  });

  if (!payment) {
    console.error('Payment not found for PhonePe order:', orderId);
    // Try to find by merchant order ID
    const paymentByMerchantId = await prisma.payments.findFirst({
      where: { orderId: orderId }
    });

    if (!paymentByMerchantId) {
      throw new Error('Payment record not found');
    }

    // Update this payment instead
    const updatedPayment = await prisma.payments.update({
      where: { id: paymentByMerchantId.id },
      data: {
        paymentId: transactionId,
        paymentStatus: mappedStatus
      }
    });

    return {
      success: true,
      paymentId: updatedPayment.id,
      status: mappedStatus
    };
  }

  // Update payment status
  const updatedPayment = await prisma.payments.update({
    where: { id: payment.id },
    data: {
      paymentId: transactionId,
      paymentStatus: mappedStatus
    }
  });

  // If payment successful, update subscription
  if (mappedStatus === 'SUCCESS') {
    const notes = payment.notes ? JSON.parse(payment.notes) : {};
    
    if (notes.type === 'SUBSCRIPTION') {
      // Create or update subscription
      const plan = phonepeConfig.plans[notes.planId];
      if (plan) {
        const startDate = new Date();
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + plan.validity);

        await prisma.subscription.upsert({
          where: { paymentId: payment.id },
          create: {
            userId: payment.userId,
            plan: notes.planId,
            status: 'ACTIVE',
            startDate,
            endDate,
            paymentId: payment.id
          },
          update: {
            status: 'ACTIVE',
            startDate,
            endDate
          }
        });

        // Update user subscription tier
        await prisma.user.update({
          where: { id: payment.userId },
          data: {
            subscriptionTier: notes.planId,
            subscriptionStart: startDate,
            subscriptionEnd: endDate,
            isPremium: true
          }
        });
      }
    }
  }

  return {
    success: true,
    paymentId: updatedPayment.id,
    status: mappedStatus
  };
};

/**
 * Get bank transfer details for offline payment
 * @param {Object} params - Parameters
 * @param {string} params.userId - User ID
 * @param {number} params.amount - Amount in paise
 * @param {string} params.planId - Plan ID
 * @returns {Promise<Object>} Bank transfer details
 */
const getBankTransferDetails = async (params) => {
  const { userId, amount, planId } = params;

  // Generate reference ID
  const referenceId = `VBM-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

  // Create pending payment record
  const payment = await prisma.payments.create({
    data: {
      userId,
      orderId: referenceId,
      amountINR: amount / 100,
      currency: 'INR',
      paymentMethod: 'BANK_TRANSFER',
      paymentStatus: 'PENDING_MANUAL',
      referenceId,
      notes: JSON.stringify({
        planId,
        type: 'SUBSCRIPTION'
      })
    }
  });

  return {
    success: true,
    paymentId: payment.id,
    referenceId,
    amount: amount / 100,
    bankDetails: {
      accountHolderName: phonepeConfig.bankDetails.accountHolderName,
      bankName: phonepeConfig.bankDetails.bankName,
      accountNumber: phonepeConfig.bankDetails.accountNumber,
      ifscCode: phonepeConfig.bankDetails.ifscCode,
      branch: phonepeConfig.bankDetails.branch
    },
    instructions: [
      `Transfer ₹${amount / 100} to the bank account above`,
      `Use Reference ID: ${referenceId} as payment reference`,
      'Upload payment proof (screenshot/receipt) after transfer',
      'Admin will verify and approve within 24-48 hours'
    ]
  };
};

/**
 * Clear cached token (useful for testing)
 */
const clearTokenCache = () => {
  cachedToken = null;
  tokenExpiry = null;
  tokenPromise = null;
};

module.exports = {
  getAccessToken,
  initiatePayment,
  checkPaymentStatus,
  handleCallback,
  getBankTransferDetails,
  clearTokenCache,
  verifyCallbackSignature
};
