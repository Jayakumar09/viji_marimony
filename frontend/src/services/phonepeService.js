/**
 * PhonePe Payment Service
 * 
 * Handles all PhonePe payment-related API calls:
 * - Payment initiation
 * - Payment status check
 * - Bank transfer handling
 * 
 * @version 1.0.0
 */

import api from './api';

const PHONEPE_URL = '/phonepe';

// Subscription plans (matching backend config)
export const PHONEPE_PLANS = [
  {
    id: 'BASIC',
    name: 'Basic Plan',
    price: 199,
    validity: 30,
    features: [
      'Basic profile visibility',
      '10 interests per day',
      'View contact details'
    ]
  },
  {
    id: 'PRO',
    name: 'Pro Plan',
    price: 499,
    validity: 90,
    features: [
      'All Basic features',
      'Unlimited interests',
      'Priority listing',
      'AI verification included'
    ]
  },
  {
    id: 'PREMIUM',
    name: 'Premium Plan',
    price: 999,
    validity: 180,
    features: [
      'All Pro features',
      'Profile highlighting',
      'Dedicated support',
      'Advanced AI verification'
    ]
  }
];

// Payment modes
export const PAYMENT_MODES = [
  {
    id: 'PAY_PAGE',
    name: 'All Payment Methods',
    type: 'ONLINE',
    description: 'Pay using any method - UPI, Card, Net Banking, Wallet',
    icon: '💳'
  },
  {
    id: 'UPI',
    name: 'UPI',
    type: 'ONLINE',
    description: 'Pay using UPI apps like GPay, PhonePe, Paytm',
    icon: '📱'
  },
  {
    id: 'CARD',
    name: 'Card Payment',
    type: 'ONLINE',
    description: 'Pay using Credit or Debit Card',
    icon: '💳'
  },
  {
    id: 'WALLET',
    name: 'Wallet',
    type: 'ONLINE',
    description: 'Pay using PhonePe Wallet or other wallets',
    icon: '👛'
  },
  {
    id: 'NET_BANKING',
    name: 'Net Banking',
    type: 'ONLINE',
    description: 'Pay using your bank account',
    icon: '🏦'
  },
  {
    id: 'BANK_TRANSFER',
    name: 'Direct Bank Transfer',
    type: 'OFFLINE',
    description: 'Transfer directly to bank account',
    icon: '🏦'
  }
];

/**
 * Get PhonePe configuration
 */
const getConfig = async () => {
  const response = await api.get(`${PHONEPE_URL}/config`);
  return response.data;
};

/**
 * Get available subscription plans
 */
const getPlans = async () => {
  const response = await api.get(`${PHONEPE_URL}/plans`);
  return response.data;
};

/**
 * Get available payment modes
 */
const getPaymentModes = async () => {
  const response = await api.get(`${PHONEPE_URL}/payment-modes`);
  return response.data;
};

/**
 * Initiate a PhonePe payment
 * @param {Object} params - Payment parameters
 * @param {string} params.plan - Plan ID (BASIC, PRO, PREMIUM)
 * @param {string} params.paymentMode - Payment mode
 * @param {string} params.type - Payment type (SUBSCRIPTION or VERIFICATION)
 */
const initiatePayment = async (params) => {
  const response = await api.post(`${PHONEPE_URL}/initiate`, params);
  return response.data;
};

/**
 * Check payment status
 * @param {string} orderId - Order ID
 */
const checkPaymentStatus = async (orderId) => {
  const response = await api.get(`${PHONEPE_URL}/status/${orderId}`);
  return response.data;
};

/**
 * Initiate bank transfer payment
 * @param {Object} params - Payment parameters
 */
const initiateBankTransfer = async (params) => {
  const response = await api.post(`${PHONEPE_URL}/bank-transfer`, params);
  return response.data;
};

/**
 * Redirect to PhonePe checkout
 * @param {string} checkoutUrl - PhonePe checkout URL
 */
const redirectToCheckout = (checkoutUrl) => {
  window.location.href = checkoutUrl;
};

/**
 * Open PhonePe checkout in new window
 * @param {string} checkoutUrl - PhonePe checkout URL
 */
const openCheckoutInNewWindow = (checkoutUrl) => {
  window.open(checkoutUrl, '_blank');
};

export default {
  PHONEPE_PLANS,
  PAYMENT_MODES,
  getConfig,
  getPlans,
  getPaymentModes,
  initiatePayment,
  checkPaymentStatus,
  initiateBankTransfer,
  redirectToCheckout,
  openCheckoutInNewWindow
};
