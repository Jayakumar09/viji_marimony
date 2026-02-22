/**
 * Payment Routes
 * 
 * All payment-related API endpoints:
 * - Razorpay order creation and verification
 * - Bank transfer handling
 * - Webhook handling
 * - Admin payment management
 * 
 * @version 1.0.0
 */

const express = require('express');
const router = express.Router();

// Import controller
const paymentController = require('../controllers/paymentController');

// Import middleware
const { authMiddleware } = require('../middleware/auth');
const { adminAuthMiddleware } = require('../middleware/auth');

// ============ PUBLIC ROUTES ============

/**
 * GET /api/payments/pricing
 * Get verification pricing (public)
 */
router.get('/pricing', paymentController.getPricing);

/**
 * GET /api/payments/config
 * Get payment configuration (public - for frontend)
 */
router.get('/config', paymentController.getPaymentConfig);

/**
 * GET /api/payments/exchange-rates
 * Get current exchange rates (public)
 */
router.get('/exchange-rates', paymentController.getExchangeRates);

/**
 * POST /api/payments/webhook
 * Razorpay webhook endpoint (no auth - verified by signature)
 */
router.post('/webhook', express.raw({ type: 'application/json' }), paymentController.handleWebhook);

// ============ USER ROUTES (Authentication Required) ============

/**
 * GET /api/payments/status
 * Get current user's payment status
 */
router.get('/status', authMiddleware, paymentController.getPaymentStatus);

/**
 * GET /api/payments/history
 * Get current user's payment history
 */
router.get('/history', authMiddleware, paymentController.getPaymentHistory);

/**
 * POST /api/payments/create-order
 * Create a new Razorpay order for verification payment
 */
router.post('/create-order', authMiddleware, paymentController.createOrder);

/**
 * POST /api/payments/verify
 * Verify Razorpay payment
 */
router.post('/verify', authMiddleware, paymentController.verifyPayment);

/**
 * POST /api/payments/bank-transfer
 * Initiate bank transfer payment
 */
router.post('/bank-transfer', authMiddleware, paymentController.initiateBankTransfer);

/**
 * POST /api/payments/bank-transfer/proof
 * Upload payment proof for bank transfer
 */
router.post(
  '/bank-transfer/proof',
  authMiddleware,
  paymentController.getUploadMiddleware(),
  paymentController.uploadPaymentProof
);

/**
 * POST /api/payments/convert
 * Convert currency for international payments
 */
router.post('/convert', authMiddleware, paymentController.convertCurrency);

// ============ ADMIN ROUTES (Admin Authentication Required) ============

/**
 * GET /api/payments/admin/pending
 * Get pending bank transfers
 */
router.get('/admin/pending', adminAuthMiddleware, paymentController.getPendingPayments);

/**
 * GET /api/payments/admin/stats
 * Get payment statistics
 */
router.get('/admin/stats', adminAuthMiddleware, paymentController.getPaymentStats);

/**
 * POST /api/payments/admin/:id/approve
 * Approve bank transfer payment
 */
router.post('/admin/:id/approve', adminAuthMiddleware, paymentController.approvePayment);

/**
 * POST /api/payments/admin/:id/reject
 * Reject bank transfer payment
 */
router.post('/admin/:id/reject', adminAuthMiddleware, paymentController.rejectPayment);

module.exports = router;
