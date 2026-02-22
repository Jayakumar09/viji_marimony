/**
 * PhonePe Payment Gateway Configuration
 * 
 * Configuration for PhonePe Checkout v2 API integration
 * Supports both sandbox (testing) and production environments
 * 
 * @version 1.0.0
 */

module.exports = {
  // PhonePe API Credentials
  merchantId: process.env.PHONEPE_MERCHANT_ID,
  clientId: process.env.PHONEPE_CLIENT_ID,
  clientSecret: process.env.PHONEPE_CLIENT_SECRET,
  clientVersion: process.env.PHONEPE_CLIENT_VERSION || '1',

  // Environment Configuration
  environment: process.env.PHONEPE_ENVIRONMENT || 'sandbox', // 'sandbox' or 'production'

  // API URLs
  getBaseUrl() {
    return this.environment === 'production'
      ? 'https://api.phonepe.com/apis/pg'
      : 'https://api-preprod.phonepe.com/apis/pg-sandbox';
  },

  // Checkout URL (PhonePe checkout page domain)
  // Note: PhonePe checkout uses checkout.phonepe.com for both sandbox and production
  // The environment is determined by the merchant account configuration
  getCheckoutUrl() {
    return 'https://checkout.phonepe.com/v2/pay';
  },

  // Application URLs
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  backendUrl: process.env.BACKEND_URL || 'http://localhost:5000',

  // OAuth Configuration
  oauth: {
    tokenUrl: '/v1/oauth/token',
    grantType: 'client_credentials',
    // Token cache duration (slightly less than actual expiry for safety)
    tokenCacheDuration: 55 * 60 * 1000 // 55 minutes in milliseconds
  },

  // Payment API Endpoints
  endpoints: {
    createPayment: '/checkout/v2/pay',
    checkStatus: '/checkout/v2/order', // Will append /{orderId}/status
    refund: '/v2/refund'
  },

  // Payment Modes supported by PhonePe
  paymentModes: {
    PAY_PAGE: {
      id: 'PAY_PAGE',
      name: 'All Payment Methods',
      type: 'ONLINE',
      description: 'Pay using any method - UPI, Card, Net Banking, Wallet'
    },
    UPI: {
      id: 'UPI',
      name: 'UPI',
      type: 'ONLINE',
      description: 'Pay using UPI apps like GPay, PhonePe, Paytm'
    },
    CARD: {
      id: 'CARD',
      name: 'Card Payment',
      type: 'ONLINE',
      description: 'Pay using Credit or Debit Card'
    },
    WALLET: {
      id: 'WALLET',
      name: 'Wallet',
      type: 'ONLINE',
      description: 'Pay using PhonePe Wallet or other wallets'
    },
    NET_BANKING: {
      id: 'NET_BANKING',
      name: 'Net Banking',
      type: 'ONLINE',
      description: 'Pay using your bank account'
    },
    BANK_TRANSFER: {
      id: 'BANK_TRANSFER',
      name: 'Direct Bank Transfer',
      type: 'OFFLINE',
      description: 'Transfer directly to bank account'
    }
  },

  // Subscription Plans for PhonePe
  plans: {
    BASIC: {
      id: 'BASIC',
      name: 'Basic Plan',
      price: 19900, // Amount in paise (₹199)
      currency: 'INR',
      validity: 30, // days
      features: [
        'Basic profile visibility',
        '10 interests per day',
        'View contact details'
      ]
    },
    PRO: {
      id: 'PRO',
      name: 'Pro Plan',
      price: 49900, // Amount in paise (₹499)
      currency: 'INR',
      validity: 90, // days
      features: [
        'All Basic features',
        'Unlimited interests',
        'Priority listing',
        'AI verification included'
      ]
    },
    PREMIUM: {
      id: 'PREMIUM',
      name: 'Premium Plan',
      price: 99900, // Amount in paise (₹999)
      currency: 'INR',
      validity: 180, // days
      features: [
        'All Pro features',
        'Profile highlighting',
        'Dedicated support',
        'Advanced AI verification'
      ]
    }
  },

  // Verification Pricing (matching existing config)
  verificationPricing: {
    BASIC_AI: {
      id: 'BASIC_AI',
      name: 'Basic AI Verification',
      price: 19900, // Amount in paise (₹199)
      currency: 'INR',
      features: [
        'Document format validation',
        'Basic face matching',
        'Tamper detection',
        'AI recommendation'
      ]
    },
    ADVANCED_AI: {
      id: 'ADVANCED_AI',
      name: 'Advanced AI Verification',
      price: 49900, // Amount in paise (₹499)
      currency: 'INR',
      features: [
        'Document format validation',
        'Advanced face matching (AWS Rekognition)',
        'Tamper detection',
        'AI recommendation',
        'Priority processing',
        'Detailed verification report'
      ]
    }
  },

  // Callback Configuration
  callback: {
    path: '/api/phonepe/callback',
    redirectPath: '/payment/success',
    redirectMode: 'GET'
  },

  // Validation Settings
  validation: {
    minAmount: 100, // Minimum amount in paise (₹1)
    maxAmount: 10000000, // Maximum amount in paise (₹1,00,000)
    currencyPrecision: 2
  },

  // Payment Status Mapping
  statusMapping: {
    COMPLETED: 'SUCCESS',
    FAILED: 'FAILED',
    CANCELLED: 'CANCELLED',
    PENDING: 'PENDING',
    PROCESSING: 'PENDING',
    'PAYMENT_SUCCESS': 'SUCCESS',
    'PAYMENT_ERROR': 'FAILED',
    'PAYMENT_PENDING': 'PENDING'
  },

  // Test Configuration (only available in sandbox environment)
  test: process.env.PHONEPE_ENVIRONMENT === 'sandbox' ? {
    successUpiId: 'success@ybl',
    failureUpiId: 'failure@ybl'
  } : {},

  // Bank Transfer Details (from environment variables for security)
  bankDetails: {
    accountHolderName: process.env.BANK_ACCOUNT_HOLDER_NAME || 'Account Holder',
    bankName: process.env.BANK_NAME || 'Bank Name',
    accountNumber: process.env.BANK_ACCOUNT_NUMBER || 'XXXXXXXXXXX',
    ifscCode: process.env.BANK_IFSC_CODE || 'XXXX0000000',
    branch: process.env.BANK_BRANCH || 'Branch',
    pinCode: process.env.BANK_PIN_CODE || '000000'
  },

  // Check if PhonePe is configured
  isConfigured() {
    return !!(this.merchantId && this.clientId && this.clientSecret);
  },

  // Get full callback URL
  getCallbackUrl() {
    return `${this.backendUrl}${this.callback.path}`;
  },

  // Get redirect URL for success page
  getRedirectUrl() {
    return `${this.frontendUrl}${this.callback.redirectPath}`;
  }
};
