/**
 * Payment Configuration
 * 
 * Contains all payment-related settings including:
 * - Razorpay configuration
 * - Bank transfer details
 * - Verification pricing
 * - International payment settings
 * - QR code support for UPI payments
 */

module.exports = {
  // Razorpay Configuration
  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID,
    keySecret: process.env.RAZORPAY_KEY_SECRET,
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET,
    // Razorpay supports these payment methods
    paymentMethods: {
      card: true,           // Credit Card, Debit Card
      upi: true,            // UPI (includes QR code)
      netbanking: true,     // Net Banking
      wallet: true,         // Wallets (Paytm, PhonePe, etc.)
      emi: false,           // EMI (disabled for verification payments)
      paylater: false       // Pay Later (disabled)
    },
    // QR Code settings for UPI
    qrCode: {
      enabled: true,
      type: 'upi_qr',       // UPI QR code type
      usage: 'single_use'   // Single use for security
    }
  },

  // Direct Bank Transfer Details (from environment variables for security)
  bankDetails: {
    accountHolderName: process.env.BANK_ACCOUNT_HOLDER_NAME || 'Account Holder',
    bankName: process.env.BANK_NAME || 'Bank Name',
    accountNumber: process.env.BANK_ACCOUNT_NUMBER || 'XXXXXXXXXXX',
    ifscCode: process.env.BANK_IFSC_CODE || 'XXXX0000000',
    branch: process.env.BANK_BRANCH || 'Branch',
    pinCode: process.env.BANK_PIN_CODE || '000000',
    paymentMode: 'Direct Bank Transfer'
  },

  // AI Verification Pricing (in INR)
  verificationPricing: {
    BASIC_AI: {
      id: 'BASIC_AI',
      name: 'Basic AI Verification',
      description: 'Document validation and basic face matching',
      price: 199,
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
      description: 'Comprehensive verification with AWS Rekognition',
      price: 499,
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

  // Subscription Plans (in INR)
  subscriptionPlans: {
    FREE: {
      id: 'FREE',
      name: 'Free',
      price: 0,
      duration: 0, // Unlimited
      features: ['Basic profile creation', 'Limited searches', '5 interests per day']
    },
    STANDARD: {
      id: 'STANDARD',
      name: 'Standard',
      price: 999,
      duration: 30, // days
      successFee: 0.05, // 5%
      features: ['Unlimited searches', '20 interests per day', 'View contact details', 'Basic support']
    },
    PREMIUM: {
      id: 'PREMIUM',
      name: 'Premium',
      price: 2499,
      duration: 90, // days
      successFee: 0.03, // 3%
      features: ['All Standard features', 'Unlimited interests', 'Priority listing', 'AI verification included', 'Priority support']
    },
    ELITE: {
      id: 'ELITE',
      name: 'Elite',
      price: 4999,
      duration: 180, // days
      successFee: 0.02, // 2%
      features: ['All Premium features', 'Profile highlighting', 'Dedicated relationship manager', 'Advanced AI verification', 'VIP support']
    }
  },

  // International Payment Settings
  international: {
    enabled: process.env.INTERNATIONAL_PAYMENTS_ENABLED === 'true' || true,
    commissionPercentage: parseFloat(process.env.PAYMENT_COMMISSION_PERCENTAGE) || 4, // 4% commission
    supportedCurrencies: ['USD', 'EUR', 'GBP', 'AED', 'SGD'],
    defaultCurrency: 'USD',
    // Exchange rate API configuration
    exchangeRateApi: {
      url: process.env.EXCHANGE_RATE_API_URL || 'https://api.exchangerate-api.com/v4/latest',
      apiKey: process.env.EXCHANGE_RATE_API_KEY,
      cacheDuration: 3600000 // 1 hour in milliseconds
    }
  },

  // Payment Status Constants
  paymentStatus: {
    PENDING: 'PENDING',
    SUCCESS: 'SUCCESS',
    FAILED: 'FAILED',
    PENDING_MANUAL: 'PENDING_MANUAL', // For bank transfers awaiting admin approval
    CANCELLED: 'CANCELLED',
    REFUNDED: 'REFUNDED'
  },

  // Payment Methods
  paymentMethods: {
    RAZORPAY: 'RAZORPAY',
    BANK_TRANSFER: 'BANK_TRANSFER'
  },

  // Verification Types
  verificationTypes: {
    BASIC_AI: 'BASIC_AI',
    ADVANCED_AI: 'ADVANCED_AI'
  },

  // Reference ID Configuration
  referenceId: {
    prefix: 'VBM', // Vijayalakshmi Boyar Matrimony
    format: 'VBM-YYYYMMDD-XXXXX' // Format: VBM-20260216-ABC12
  },

  // Payment Validation Settings
  validation: {
    minAmount: 1, // Minimum amount in INR
    maxAmount: 100000, // Maximum amount in INR (1 lakh)
    currencyPrecision: 2 // Decimal places for currency
  },

  // Webhook Events to Handle
  webhookEvents: {
    PAYMENT_CAPTURED: 'payment.captured',
    PAYMENT_FAILED: 'payment.failed',
    ORDER_PAID: 'order.paid',
    REFUND_CREATED: 'refund.created',
    REFUND_PROCESSED: 'refund.processed'
  },

  // Error Codes
  errorCodes: {
    PAY001: 'Payment required',
    PAY002: 'Payment verification failed',
    PAY003: 'Payment already processed',
    PAY004: 'Invalid payment method',
    PAY005: 'Exchange rate unavailable',
    PAY006: 'Webhook verification failed',
    PAY007: 'Invalid signature',
    PAY008: 'Order not found',
    PAY009: 'Payment proof required',
    PAY010: 'Admin approval required'
  },

  // Refund Policy (RBI Compliance)
  refund: {
    maxDays: 7, // Refund within 7 days as per RBI guidelines
    autoRefundOnFailure: true,
    refundReasons: [
      'Service not provided',
      'Duplicate payment',
      'Technical error',
      'User request'
    ]
  },

  // Audit Settings
  audit: {
    logAllPayments: true,
    logWebhooks: true,
    logAdminActions: true,
    retentionDays: 2555 // 7 years as per RBI requirement
  }
};
