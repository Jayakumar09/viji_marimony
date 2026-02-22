/**
 * PhonePe Payment Routes
 * 
 * All PhonePe payment-related API endpoints:
 * - Payment initiation
 * - Payment status check
 * - Callback handling
 * - Bank transfer requests
 * 
 * @version 1.0.0
 */

const express = require('express');
const router = express.Router();

// Import controller
const phonepeController = require('../controllers/phonepeController');

// Import middleware
const { authMiddleware } = require('../middleware/auth');
const { rateLimitPaymentAttempts } = require('../middleware/paymentValidation');

// ============ PUBLIC ROUTES ============

/**
 * GET /api/phonepe/config
 * Get PhonePe configuration (public - for frontend)
 */
router.get('/config', phonepeController.getConfig);

/**
 * GET /api/phonepe/plans
 * Get available subscription plans (public)
 */
router.get('/plans', phonepeController.getPlans);

/**
 * GET /api/phonepe/payment-modes
 * Get available payment modes (public)
 */
router.get('/payment-modes', phonepeController.getPaymentModes);

/**
 * POST /api/phonepe/callback
 * PhonePe callback webhook (no auth - from PhonePe servers)
 * Uses express.raw() to preserve raw body for signature verification
 */
router.post('/callback', express.raw({ type: 'application/json' }), (req, res, next) => {
  // Store raw body for signature verification
  req.rawBody = req.body.toString();
  // Parse raw body to JSON for the controller
  try {
    req.body = JSON.parse(req.rawBody);
    next();
  } catch (e) {
    return res.status(400).json({ success: false, error: 'Invalid JSON' });
  }
}, phonepeController.handleCallback);

/**
 * GET /api/phonepe/redirect
 * Handle redirect from PhonePe after payment
 */
router.get('/redirect', phonepeController.handleRedirect);

// ============ USER ROUTES (Authentication Required) ============

/**
 * POST /api/phonepe/initiate
 * Initiate a PhonePe payment
 * Rate limited to 5 attempts per minute to prevent abuse
 */
router.post('/initiate', authMiddleware, rateLimitPaymentAttempts(5, 60000), phonepeController.initiatePayment);

/**
 * GET /api/phonepe/status/:orderId
 * Check payment status
 */
router.get('/status/:orderId', authMiddleware, phonepeController.checkStatus);

/**
 * POST /api/phonepe/bank-transfer
 * Initiate bank transfer payment
 * Rate limited to 3 attempts per minute to prevent abuse
 */
router.post('/bank-transfer', authMiddleware, rateLimitPaymentAttempts(3, 60000), phonepeController.initiateBankTransfer);

module.exports = router;
