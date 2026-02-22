/**
 * Payment Service
 * 
 * Handles all payment-related API calls:
 * - Razorpay order creation and verification
 * - Bank transfer handling
 * - Payment status checks
 */

import api from './api';

const PAYMENT_URL = '/payments';

// Subscription plan prices (should match backend config)
export const SUBSCRIPTION_PLANS = [
  {
    id: 'FREE',
    name: 'Free',
    price: 0,
    duration: 0,
    successFee: 0,
    features: ['Basic profile creation', 'Limited searches', '5 interests per day']
  },
  {
    id: 'STANDARD',
    name: 'Standard',
    price: 999,
    duration: 30,
    successFee: 5000, // 5% represented in rupees for display
    features: ['Unlimited searches', '20 interests per day', 'View contact details', 'Basic support']
  },
  {
    id: 'PREMIUM',
    name: 'Premium',
    price: 2499,
    duration: 90,
    successFee: 3000, // 3%
    features: ['All Standard features', 'Unlimited interests', 'Priority listing', 'AI verification included', 'Priority support']
  },
  {
    id: 'ELITE',
    name: 'Elite',
    price: 4999,
    duration: 180,
    successFee: 2000, // 2%
    features: ['All Premium features', 'Profile highlighting', 'Dedicated relationship manager', 'Advanced AI verification', 'VIP support']
  }
];

// Verification pricing
export const VERIFICATION_PRICING = {
  BASIC_AI: {
    id: 'BASIC_AI',
    name: 'Basic AI Verification',
    price: 199,
    features: ['Document format validation', 'Basic face matching', 'Tamper detection', 'AI recommendation']
  },
  ADVANCED_AI: {
    id: 'ADVANCED_AI',
    name: 'Advanced AI Verification',
    price: 499,
    features: ['Document format validation', 'Advanced face matching (AWS Rekognition)', 'Tamper detection', 'AI recommendation', 'Priority processing', 'Detailed verification report']
  }
};

/**
 * Get payment configuration (Razorpay key, etc.)
 */
const getPaymentConfig = async () => {
  const response = await api.get(`${PAYMENT_URL}/config`);
  return response.data;
};

/**
 * Get pricing information
 */
const getPricing = async () => {
  const response = await api.get(`${PAYMENT_URL}/pricing`);
  return response.data;
};

/**
 * Get current user's payment status
 */
const getPaymentStatus = async () => {
  const response = await api.get(`${PAYMENT_URL}/status`);
  return response.data;
};

/**
 * Get payment history
 */
const getPaymentHistory = async () => {
  const response = await api.get(`${PAYMENT_URL}/history`);
  return response.data;
};

/**
 * Create a Razorpay order for subscription payment
 * @param {string} planId - The subscription plan ID (STANDARD, PREMIUM, ELITE)
 * @param {string} currency - Currency code (default: INR)
 */
const createSubscriptionOrder = async (planId, currency = 'INR') => {
  const response = await api.post(`${PAYMENT_URL}/create-order`, {
    type: 'SUBSCRIPTION',
    planId,
    currency
  });
  return response.data;
};

/**
 * Create a Razorpay order for verification payment
 * @param {string} verificationType - BASIC_AI or ADVANCED_AI
 * @param {string} currency - Currency code (default: INR)
 */
const createVerificationOrder = async (verificationType, currency = 'INR') => {
  const response = await api.post(`${PAYMENT_URL}/create-order`, {
    type: 'VERIFICATION',
    verificationType,
    currency
  });
  return response.data;
};

/**
 * Verify Razorpay payment
 * @param {object} paymentData - Payment details from Razorpay
 */
const verifyPayment = async (paymentData) => {
  const response = await api.post(`${PAYMENT_URL}/verify`, paymentData);
  return response.data;
};

/**
 * Initiate bank transfer payment
 * @param {object} data - Payment details
 */
const initiateBankTransfer = async (data) => {
  const response = await api.post(`${PAYMENT_URL}/bank-transfer`, data);
  return response.data;
};

/**
 * Upload payment proof for bank transfer
 * @param {FormData} formData - Form data with proof file
 */
const uploadPaymentProof = async (formData) => {
  const response = await api.post(`${PAYMENT_URL}/bank-transfer/proof`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
  return response.data;
};

/**
 * Get exchange rates for international payments
 */
const getExchangeRates = async () => {
  const response = await api.get(`${PAYMENT_URL}/exchange-rates`);
  return response.data;
};

/**
 * Convert currency for international payments
 * @param {string} from - Source currency
 * @param {string} to - Target currency
 * @param {number} amount - Amount to convert
 */
const convertCurrency = async (from, to, amount) => {
  const response = await api.post(`${PAYMENT_URL}/convert`, { from, to, amount });
  return response.data;
};

/**
 * Load Razorpay SDK dynamically
 */
const loadRazorpaySDK = () => {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) {
      resolve(window.Razorpay);
      return;
    }

    const script = document.createElement('script');
    // Use the older stable checkout API
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.setAttribute('data-cfasync', 'false');
    script.onload = () => {
      console.log('Razorpay SDK loaded successfully');
      resolve(window.Razorpay);
    };
    script.onerror = () => {
      reject(new Error('Failed to load Razorpay SDK'));
    };
    document.body.appendChild(script);
  });
};

/**
 * Open Razorpay checkout for subscription
 * @param {object} order - Order data from backend
 * @param {object} user - Current user data
 * @param {function} onSuccess - Success callback
 * @param {function} onFailure - Failure callback
 */
const openRazorpayCheckout = async (order, user, onSuccess, onFailure) => {
  try {
    console.log('=== Razorpay Checkout Debug ===');
    console.log('Order data:', JSON.stringify(order, null, 2));
    console.log('User data:', JSON.stringify(user, null, 2));
    
    const Razorpay = await loadRazorpaySDK();
    const config = await getPaymentConfig();
    
    console.log('Razorpay config:', JSON.stringify(config.config, null, 2));
    console.log('Amount (paise):', Math.round(order.amount * 100));
    console.log('Order ID:', order.orderId);

    const options = {
      key: config.config.razorpayKeyId,
      amount: Math.round(order.amount * 100), // Convert rupees to paise
      currency: order.currency,
      order_id: order.orderId,
      name: 'Vijayalakshmi Boyar Matrimony',
      description: order.description || 'Subscription Payment',
      prefill: {
        name: user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : '',
        email: user.email || '',
        contact: user.phone ? user.phone.replace('+91', '') : '' // Remove country code for Indian numbers
      },
      notes: {
        userId: user.id,
        type: order.type,
        planId: order.planId || ''
      },
      theme: {
        color: '#8B5CF6'
      },
      // Disable international cards - only accept domestic Indian cards
      _: {
        integration: 'custom',
        integration_type: 'custom',
        integration_name: 'Vijayalakshmi Matrimony',
        integration_version: '1.0.0'
      },
      handler: async (response) => {
        try {
          const verificationData = {
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
            orderId: order.id
          };
          
          const result = await verifyPayment(verificationData);
          if (onSuccess) onSuccess(result);
        } catch (error) {
          if (onFailure) onFailure(error);
        }
      },
      modal: {
        ondismiss: () => {
          if (onFailure) onFailure(new Error('Payment cancelled by user'));
        }
      }
    };

    const rzp = new Razorpay(options);
    rzp.open();
  } catch (error) {
    if (onFailure) onFailure(error);
  }
};

export default {
  SUBSCRIPTION_PLANS,
  VERIFICATION_PRICING,
  getPaymentConfig,
  getPricing,
  getPaymentStatus,
  getPaymentHistory,
  createSubscriptionOrder,
  createVerificationOrder,
  verifyPayment,
  initiateBankTransfer,
  uploadPaymentProof,
  getExchangeRates,
  convertCurrency,
  loadRazorpaySDK,
  openRazorpayCheckout
};
