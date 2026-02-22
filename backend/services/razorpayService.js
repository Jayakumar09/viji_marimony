/**
 * Razorpay Service
 * 
 * Handles all Razorpay payment operations including:
 * - Order creation
 * - Payment verification
 * - Signature validation
 * - Webhook handling
 * - QR code generation for UPI
 * 
 * @version 1.0.0
 */

const Razorpay = require('razorpay');
const crypto = require('crypto');
const paymentConfig = require('../config/payments');

// Initialize Razorpay instance
let razorpayInstance = null;

/**
 * Get or create Razorpay instance
 * @returns {Razorpay|null} Razorpay instance or null if not configured
 */
const getRazorpayInstance = () => {
  if (razorpayInstance) {
    return razorpayInstance;
  }

  if (!paymentConfig.razorpay.keyId || !paymentConfig.razorpay.keySecret) {
    console.warn('Razorpay credentials not configured. Payment features will be limited.');
    return null;
  }

  razorpayInstance = new Razorpay({
    key_id: paymentConfig.razorpay.keyId,
    key_secret: paymentConfig.razorpay.keySecret
  });

  return razorpayInstance;
};

/**
 * Check if Razorpay is configured
 * @returns {boolean}
 */
const isConfigured = () => {
  return !!(paymentConfig.razorpay.keyId && paymentConfig.razorpay.keySecret);
};

/**
 * Create a Razorpay order
 * @param {Object} params - Order parameters
 * @param {number} params.amount - Amount in INR (will be converted to paise)
 * @param {string} params.currency - Currency code (default: INR)
 * @param {string} params.receipt - Receipt ID or order reference
 * @param {Object} params.notes - Additional notes for the order
 * @returns {Promise<Object>} Created order details
 */
const createOrder = async (params) => {
  const razorpay = getRazorpayInstance();
  
  if (!razorpay) {
    throw new Error('Razorpay is not configured');
  }

  const { amount, currency = 'INR', receipt, notes = {} } = params;

  // Validate amount
  if (!amount || amount < paymentConfig.validation.minAmount) {
    throw new Error(`Amount must be at least ₹${paymentConfig.validation.minAmount}`);
  }

  if (amount > paymentConfig.validation.maxAmount) {
    throw new Error(`Amount cannot exceed ₹${paymentConfig.validation.maxAmount}`);
  }

  // Convert amount to paise (Razorpay expects amount in smallest currency unit)
  const amountInPaise = Math.round(amount * 100);

  const orderOptions = {
    amount: amountInPaise,
    currency,
    receipt: receipt || `receipt_${Date.now()}`,
    notes,
    payment_capture: 1 // Auto capture payment
  };

  try {
    const order = await razorpay.orders.create(orderOptions);
    
    return {
      success: true,
      order: {
        id: order.id,
        amount: order.amount / 100, // Convert back to rupees
        currency: order.currency,
        receipt: order.receipt,
        status: order.status,
        createdAt: order.created_at
      }
    };
  } catch (error) {
    console.error('Razorpay order creation error:', error);
    throw new Error(error.message || 'Failed to create order');
  }
};

/**
 * Verify payment signature
 * @param {string} orderId - Razorpay order ID
 * @param {string} paymentId - Razorpay payment ID
 * @param {string} signature - Razorpay signature
 * @returns {boolean} Whether signature is valid
 */
const verifySignature = (orderId, paymentId, signature) => {
  if (!paymentConfig.razorpay.keySecret) {
    console.error('Razorpay key secret not configured');
    return false;
  }

  // Create the expected signature
  const body = orderId + '|' + paymentId;
  const expectedSignature = crypto
    .createHmac('sha256', paymentConfig.razorpay.keySecret)
    .update(body.toString())
    .digest('hex');

  // Compare signatures
  return expectedSignature === signature;
};

/**
 * Verify webhook signature
 * @param {string} payload - Raw request body as string
 * @param {string} signature - X-Razorpay-Signature header value
 * @returns {boolean} Whether webhook signature is valid
 */
const verifyWebhookSignature = (payload, signature) => {
  if (!paymentConfig.razorpay.webhookSecret) {
    console.error('Razorpay webhook secret not configured');
    return false;
  }

  const expectedSignature = crypto
    .createHmac('sha256', paymentConfig.razorpay.webhookSecret)
    .update(payload)
    .digest('hex');

  return expectedSignature === signature;
};

/**
 * Fetch payment details from Razorpay
 * @param {string} paymentId - Razorpay payment ID
 * @returns {Promise<Object>} Payment details
 */
const fetchPayment = async (paymentId) => {
  const razorpay = getRazorpayInstance();
  
  if (!razorpay) {
    throw new Error('Razorpay is not configured');
  }

  try {
    const payment = await razorpay.payments.fetch(paymentId);
    
    return {
      success: true,
      payment: {
        id: payment.id,
        orderId: payment.order_id,
        amount: payment.amount / 100,
        currency: payment.currency,
        status: payment.status,
        method: payment.method,
        email: payment.email,
        contact: payment.contact,
        createdAt: payment.created_at
      }
    };
  } catch (error) {
    console.error('Razorpay fetch payment error:', error);
    throw new Error(error.message || 'Failed to fetch payment');
  }
};

/**
 * Fetch order details from Razorpay
 * @param {string} orderId - Razorpay order ID
 * @returns {Promise<Object>} Order details
 */
const fetchOrder = async (orderId) => {
  const razorpay = getRazorpayInstance();
  
  if (!razorpay) {
    throw new Error('Razorpay is not configured');
  }

  try {
    const order = await razorpay.orders.fetch(orderId);
    
    return {
      success: true,
      order: {
        id: order.id,
        amount: order.amount / 100,
        currency: order.currency,
        status: order.status,
        receipt: order.receipt,
        createdAt: order.created_at
      }
    };
  } catch (error) {
    console.error('Razorpay fetch order error:', error);
    throw new Error(error.message || 'Failed to fetch order');
  }
};

/**
 * Create a QR code for UPI payment
 * @param {Object} params - QR code parameters
 * @param {number} params.amount - Amount in INR
 * @param {string} params.orderId - Order ID for reference
 * @param {string} params.customerName - Customer name
 * @param {string} params.description - Payment description
 * @returns {Promise<Object>} QR code details
 */
const createQrCode = async (params) => {
  const razorpay = getRazorpayInstance();
  
  if (!razorpay) {
    throw new Error('Razorpay is not configured');
  }

  const { amount, orderId, customerName, description } = params;

  const qrOptions = {
    type: paymentConfig.razorpay.qrCode.type,
    name: `Payment for ${customerName || 'Customer'}`,
    usage: paymentConfig.razorpay.qrCode.usage,
    customer_id: orderId, // Use orderId as reference
    payments: {
      amount: Math.round(amount * 100), // Convert to paise
      currency: 'INR',
      description: description || 'Verification Payment'
    }
  };

  try {
    const qrCode = await razorpay.qrCode.create(qrOptions);
    
    return {
      success: true,
      qrCode: {
        id: qrCode.id,
        image: qrCode.image_url,
        deepLink: qrCode.image_url, // UPI deep link
        amount: amount,
        currency: 'INR'
      }
    };
  } catch (error) {
    console.error('Razorpay QR code creation error:', error);
    // QR code creation might fail, but order can still proceed
    return {
      success: false,
      error: error.message || 'Failed to create QR code'
    };
  }
};

/**
 * Initiate refund for a payment
 * @param {string} paymentId - Razorpay payment ID
 * @param {number} amount - Refund amount in INR (optional, defaults to full refund)
 * @param {string} reason - Refund reason
 * @returns {Promise<Object>} Refund details
 */
const initiateRefund = async (paymentId, amount = null, reason = '') => {
  const razorpay = getRazorpayInstance();
  
  if (!razorpay) {
    throw new Error('Razorpay is not configured');
  }

  const refundOptions = {
    notes: {
      reason: reason || 'User requested refund'
    }
  };

  // If amount specified, convert to paise
  if (amount) {
    refundOptions.amount = Math.round(amount * 100);
  }

  try {
    const refund = await razorpay.payments.refund(paymentId, refundOptions);
    
    return {
      success: true,
      refund: {
        id: refund.id,
        paymentId: refund.payment_id,
        amount: refund.amount / 100,
        status: refund.status,
        createdAt: refund.created_at
      }
    };
  } catch (error) {
    console.error('Razorpay refund error:', error);
    throw new Error(error.message || 'Failed to initiate refund');
  }
};

/**
 * Get payment methods available for an order
 * @param {string} orderId - Razorpay order ID
 * @returns {Promise<Object>} Available payment methods
 */
const getPaymentMethods = async (orderId) => {
  const razorpay = getRazorpayInstance();
  
  if (!razorpay) {
    throw new Error('Razorpay is not configured');
  }

  try {
    // Get available payment methods for the order
    const methods = await razorpay.orders.fetchPayments(orderId);
    
    return {
      success: true,
      methods: {
        card: paymentConfig.razorpay.paymentMethods.card,
        upi: paymentConfig.razorpay.paymentMethods.upi,
        netbanking: paymentConfig.razorpay.paymentMethods.netbanking,
        wallet: paymentConfig.razorpay.paymentMethods.wallet
      }
    };
  } catch (error) {
    console.error('Razorpay get payment methods error:', error);
    // Return default methods even on error
    return {
      success: true,
      methods: paymentConfig.razorpay.paymentMethods
    };
  }
};

/**
 * Capture a payment (for authorized payments)
 * @param {string} paymentId - Razorpay payment ID
 * @param {number} amount - Amount to capture in INR
 * @returns {Promise<Object>} Captured payment details
 */
const capturePayment = async (paymentId, amount) => {
  const razorpay = getRazorpayInstance();
  
  if (!razorpay) {
    throw new Error('Razorpay is not configured');
  }

  try {
    const payment = await razorpay.payments.capture(
      paymentId,
      Math.round(amount * 100) // Convert to paise
    );
    
    return {
      success: true,
      payment: {
        id: payment.id,
        orderId: payment.order_id,
        amount: payment.amount / 100,
        currency: payment.currency,
        status: payment.status,
        method: payment.method
      }
    };
  } catch (error) {
    console.error('Razorpay capture payment error:', error);
    throw new Error(error.message || 'Failed to capture payment');
  }
};

module.exports = {
  isConfigured,
  getRazorpayInstance,
  createOrder,
  verifySignature,
  verifyWebhookSignature,
  fetchPayment,
  fetchOrder,
  createQrCode,
  initiateRefund,
  getPaymentMethods,
  capturePayment
};
