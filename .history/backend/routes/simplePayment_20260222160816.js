/**
 * Simple Payment Verification Route
 * Direct verification without complex service layers
 */

const express = require('express');
const crypto = require('crypto');
const { prisma } = require('../utils/database');
const router = express.Router();

/**
 * POST /api/simple-payment/verify
 * Simple payment verification
 */
router.post('/verify', async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    const userId = req.user?.id;

    console.log('=== Payment Verification ===');
    console.log('Order ID:', razorpay_order_id);
    console.log('Payment ID:', razorpay_payment_id);
    console.log('User ID:', userId);

    // Validate required fields
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    // Verify signature
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) {
      console.error('RAZORPAY_KEY_SECRET not configured');
      return res.status(500).json({
        success: false,
        error: 'Payment configuration error'
      });
    }

    const generatedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(razorpay_order_id + '|' + razorpay_payment_id)
      .digest('hex');

    console.log('Generated signature:', generatedSignature);
    console.log('Received signature:', razorpay_signature);

    if (generatedSignature !== razorpay_signature) {
      console.error('Signature mismatch');
      return res.status(400).json({
        success: false,
        error: 'Invalid payment signature'
      });
    }

    // Find payment record
    const payment = await prisma.payments.findFirst({
      where: { orderId: razorpay_order_id }
    });

    if (!payment) {
      console.error('Payment record not found for order:', razorpay_order_id);
      return res.status(404).json({
        success: false,
        error: 'Payment record not found'
      });
    }

    // Update payment status
    const updatedPayment = await prisma.payments.update({
      where: { id: payment.id },
      data: {
        paymentId: razorpay_payment_id,
        paymentStatus: 'SUCCESS'
      }
    });

    // Find and update subscription
    const subscription = await prisma.subscription.findFirst({
      where: { paymentId: payment.id }
    });

    if (subscription) {
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: { status: 'ACTIVE' }
      });

      // Update user subscription tier
      await prisma.user.update({
        where: { id: payment.userId },
        data: {
          subscriptionTier: subscription.plan,
          subscriptionStart: subscription.startDate,
          subscriptionEnd: subscription.endDate,
          isPremium: true
        }
      });

      console.log('Subscription updated successfully');
    }

    console.log('Payment verified successfully');

    res.json({
      success: true,
      message: 'Payment verified successfully',
      payment: {
        id: updatedPayment.id,
        amount: updatedPayment.amountINR,
        status: updatedPayment.paymentStatus
      },
      subscription: subscription ? {
        id: subscription.id,
        plan: subscription.plan,
        startDate: subscription.startDate,
        endDate: subscription.endDate
      } : null
    });

  } catch (error) {
    console.error('Payment verification error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Payment verification failed'
    });
  }
});

module.exports = router;
