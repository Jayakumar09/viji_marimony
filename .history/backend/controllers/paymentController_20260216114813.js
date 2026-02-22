/**
 * Payment Controller
 * 
 * Handles all payment-related HTTP requests:
 * - Create verification payment orders
 * - Verify payments
 * - Bank transfers
 * - Webhooks
 * 
 * @version 1.0.0
 */

const paymentService = require('../services/paymentService');
const razorpayService = require('../services/razorpayService');
const exchangeRateService = require('../services/exchangeRateService');
const paymentUtils = require('../utils/paymentUtils');
const paymentConfig = require('../config/payments');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for payment proof uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/payment_proofs');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `proof-${req.user.id}-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, and PDF are allowed.'));
    }
  }
});

/**
 * GET /api/payments/config
 * Get payment configuration for frontend
 */
const getPaymentConfig = async (req, res) => {
  try {
    res.json({
      success: true,
      config: {
        razorpayKeyId: paymentConfig.razorpay.keyId,
        verificationPricing: paymentConfig.verificationPricing,
        bankDetails: {
          ...paymentConfig.bankDetails,
          accountNumber: paymentUtils.maskAccountNumber(paymentConfig.bankDetails.accountNumber)
        },
        supportedCurrencies: exchangeRateService.getSupportedCurrencies(),
        internationalEnabled: exchangeRateService.isInternationalPaymentsEnabled()
      }
    });
  } catch (error) {
    console.error('Get payment config error:', error);
    res.status(500).json({ error: 'Failed to get payment configuration' });
  }
};

/**
 * GET /api/payments/exchange-rates
 * Get current exchange rates
 */
const getExchangeRates = async (req, res) => {
  try {
    const rates = await exchangeRateService.getExchangeRateSummary();
    res.json(rates);
  } catch (error) {
    console.error('Get exchange rates error:', error);
    res.status(500).json({ error: 'Failed to get exchange rates' });
  }
};

/**
 * POST /api/payments/create-order
 * Create a new payment order
 */
const createOrder = async (req, res) => {
  try {
    const { verificationType, currency = 'INR' } = req.body;
    const userId = req.user.id;

    // Check if Razorpay is configured
    if (!razorpayService.isConfigured()) {
      return res.status(503).json({
        error: 'Payment service not configured',
        message: 'Please contact support for payment assistance'
      });
    }

    const result = await paymentService.createVerificationPayment({
      userId,
      verificationType,
      currency
    });

    res.json(result);
  } catch (error) {
    console.error('Create order error:', error);
    res.status(400).json({ error: error.message });
  }
};

/**
 * POST /api/payments/verify
 * Verify payment after Razorpay callback
 */
const verifyPayment = async (req, res) => {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['razorpayOrderId', 'razorpayPaymentId', 'razorpaySignature']
      });
    }

    const result = await paymentService.verifyAndCompletePayment({
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature
    });

    res.json(result);
  } catch (error) {
    console.error('Verify payment error:', error);
    res.status(400).json({ error: error.message });
  }
};

/**
 * POST /api/payments/webhook
 * Handle Razorpay webhooks
 */
const handleWebhook = async (req, res) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const payload = JSON.stringify(req.body);

    // Verify webhook signature
    if (!razorpayService.verifyWebhookSignature(payload, signature)) {
      console.error('Invalid webhook signature');
      return res.status(400).json({ error: 'Invalid signature' });
    }

    // Process webhook
    const result = await paymentService.handleWebhook(req.body);

    res.json(result);
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
};

/**
 * POST /api/payments/bank-transfer
 * Initiate bank transfer payment
 */
const initiateBankTransfer = async (req, res) => {
  try {
    const { verificationType } = req.body;
    const userId = req.user.id;

    const result = await paymentService.createBankTransferPayment({
      userId,
      verificationType
    });

    res.json(result);
  } catch (error) {
    console.error('Bank transfer error:', error);
    res.status(400).json({ error: error.message });
  }
};

/**
 * POST /api/payments/bank-transfer/proof
 * Upload payment proof for bank transfer
 */
const uploadPaymentProof = async (req, res) => {
  try {
    const { paymentId } = req.body;
    const userId = req.user.id;

    if (!req.file) {
      return res.status(400).json({ error: 'Payment proof file is required' });
    }

    // Generate URL for the uploaded file
    const proofUrl = `/uploads/payment_proofs/${req.file.filename}`;

    const result = await paymentService.uploadPaymentProof({
      paymentId,
      userId,
      proofUrl
    });

    res.json(result);
  } catch (error) {
    console.error('Upload proof error:', error);
    res.status(400).json({ error: error.message });
  }
};

/**
 * GET /api/payments/status
 * Get current user's payment status
 */
const getPaymentStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await paymentService.checkUserPaymentStatus(userId);
    res.json(result);
  } catch (error) {
    console.error('Get payment status error:', error);
    res.status(500).json({ error: 'Failed to get payment status' });
  }
};

/**
 * GET /api/payments/history
 * Get current user's payment history
 */
const getPaymentHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await paymentService.getUserPaymentHistory(userId);
    res.json(result);
  } catch (error) {
    console.error('Get payment history error:', error);
    res.status(500).json({ error: 'Failed to get payment history' });
  }
};

/**
 * GET /api/payments/pricing
 * Get verification pricing
 */
const getPricing = async (req, res) => {
  try {
    res.json({
      success: true,
      pricing: paymentConfig.verificationPricing,
      subscriptionPlans: paymentConfig.subscriptionPlans
    });
  } catch (error) {
    console.error('Get pricing error:', error);
    res.status(500).json({ error: 'Failed to get pricing' });
  }
};

/**
 * POST /api/payments/convert
 * Convert currency for international payments
 */
const convertCurrency = async (req, res) => {
  try {
    const { amount, fromCurrency = 'USD' } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Valid amount is required' });
    }

    const result = await exchangeRateService.convertToINR(amount, fromCurrency);
    res.json(result);
  } catch (error) {
    console.error('Currency conversion error:', error);
    res.status(400).json({ error: error.message });
  }
};

// ============ ADMIN ENDPOINTS ============

/**
 * GET /api/admin/payments/pending
 * Get pending bank transfers (Admin only)
 */
const getPendingPayments = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const result = await paymentService.getPendingBankTransfers(
      parseInt(page),
      parseInt(limit)
    );
    res.json(result);
  } catch (error) {
    console.error('Get pending payments error:', error);
    res.status(500).json({ error: 'Failed to get pending payments' });
  }
};

/**
 * POST /api/admin/payments/:id/approve
 * Approve bank transfer (Admin only)
 */
const approvePayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    const adminId = req.user.id;

    const result = await paymentService.approveBankTransfer({
      paymentId: id,
      adminId,
      notes
    });

    res.json(result);
  } catch (error) {
    console.error('Approve payment error:', error);
    res.status(400).json({ error: error.message });
  }
};

/**
 * POST /api/admin/payments/:id/reject
 * Reject bank transfer (Admin only)
 */
const rejectPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const adminId = req.user.id;

    if (!reason) {
      return res.status(400).json({ error: 'Rejection reason is required' });
    }

    const result = await paymentService.rejectBankTransfer({
      paymentId: id,
      adminId,
      reason
    });

    res.json(result);
  } catch (error) {
    console.error('Reject payment error:', error);
    res.status(400).json({ error: error.message });
  }
};

/**
 * GET /api/admin/payments/stats
 * Get payment statistics (Admin only)
 */
const getPaymentStats = async (req, res) => {
  try {
    const { prisma } = require('../utils/database');
    
    const stats = await prisma.$transaction([
      // Total payments
      prisma.payments.count(),
      // Successful payments
      prisma.payments.count({
        where: { paymentStatus: 'SUCCESS' }
      }),
      // Pending payments
      prisma.payments.count({
        where: { paymentStatus: 'PENDING' }
      }),
      // Pending manual payments
      prisma.payments.count({
        where: { paymentStatus: 'PENDING_MANUAL' }
      }),
      // Failed payments
      prisma.payments.count({
        where: { paymentStatus: 'FAILED' }
      }),
      // Total revenue
      prisma.payments.aggregate({
        where: { paymentStatus: 'SUCCESS' },
        _sum: { amountINR: true }
      }),
      // Verification payments
      prisma.verificationPayments.count({
        where: { paymentStatus: 'SUCCESS' }
      })
    ]);

    res.json({
      total: stats[0],
      successful: stats[1],
      pending: stats[2],
      pendingManual: stats[3],
      failed: stats[4],
      totalRevenue: stats[5]._sum.amountINR || 0,
      verificationPayments: stats[6]
    });
  } catch (error) {
    console.error('Get payment stats error:', error);
    res.status(500).json({ error: 'Failed to get payment statistics' });
  }
};

// Export multer upload for use in routes
const getUploadMiddleware = () => upload.single('proof');

module.exports = {
  getPaymentConfig,
  getExchangeRates,
  createOrder,
  verifyPayment,
  handleWebhook,
  initiateBankTransfer,
  uploadPaymentProof,
  getPaymentStatus,
  getPaymentHistory,
  getPricing,
  convertCurrency,
  // Admin
  getPendingPayments,
  approvePayment,
  rejectPayment,
  getPaymentStats,
  // Middleware
  getUploadMiddleware
};
