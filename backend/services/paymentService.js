/**
 * Payment Service
 * 
 * Main service for payment operations:
 * - Verification payments
 * - Subscription payments
 * - Bank transfers
 * - Payment status management
 * 
 * @version 1.0.0
 */

const { prisma } = require('../utils/database');
const razorpayService = require('./razorpayService');
const exchangeRateService = require('./exchangeRateService');
const paymentUtils = require('../utils/paymentUtils');
const paymentConfig = require('../config/payments');

/**
 * Create a verification payment order
 * @param {Object} params - Payment parameters
 * @param {string} params.userId - User ID
 * @param {string} params.verificationType - Type: BASIC_AI or ADVANCED_AI
 * @param {string} params.currency - Currency (INR, USD)
 * @returns {Promise<Object>} Order details
 */
const createVerificationPayment = async (params) => {
  const { userId, verificationType, currency = 'INR' } = params;

  // Validate verification type
  const typeValidation = paymentUtils.validateVerificationType(verificationType);
  if (!typeValidation.valid) {
    throw new Error(typeValidation.error);
  }

  // Get pricing
  const pricing = paymentUtils.getVerificationPricing(verificationType);
  let amountINR = pricing.price;
  let exchangeRate = null;
  let commissionAmount = null;
  let originalAmount = null;
  let originalCurrency = null;
  let international = false;

  // Handle international payment
  if (currency !== 'INR') {
    international = true;
    originalAmount = pricing.price;
    originalCurrency = currency;

    // Convert to INR
    const conversion = await exchangeRateService.convertToINR(pricing.price, currency);
    
    if (!conversion.success) {
      throw new Error(conversion.error || 'Currency conversion failed');
    }

    amountINR = conversion.totalAmount;
    exchangeRate = conversion.exchangeRate;
    commissionAmount = conversion.commissionAmount;
  }

  // Create Razorpay order
  const orderResult = await razorpayService.createOrder({
    amount: amountINR,
    currency: 'INR', // Razorpay always processes in INR
    receipt: paymentUtils.generateOrderId(),
    notes: {
      userId,
      verificationType,
      originalCurrency: originalCurrency || 'INR',
      originalAmount: originalAmount ? originalAmount.toString() : amountINR.toString()
    }
  });

  if (!orderResult.success) {
    throw new Error(orderResult.error || 'Failed to create order');
  }

  // Create payment record
  const payment = await prisma.payments.create({
    data: {
      userId,
      orderId: orderResult.order.id,
      amountINR,
      currency: 'INR',
      paymentMethod: paymentConfig.paymentMethods.RAZORPAY,
      paymentStatus: paymentConfig.paymentStatus.PENDING,
      international,
      exchangeRate,
      commissionAmount,
      originalAmount,
      originalCurrency
    }
  });

  // Create verification payment record
  const verificationPayment = await prisma.verificationPayments.create({
    data: {
      userId,
      amount: amountINR,
      paymentStatus: paymentConfig.paymentStatus.PENDING,
      verificationType,
      razorpayOrderId: orderResult.order.id
    }
  });

  return {
    success: true,
    order: {
      id: orderResult.order.id,
      amount: amountINR,
      currency: 'INR',
      originalAmount,
      originalCurrency,
      exchangeRate,
      commissionAmount
    },
    payment: {
      id: payment.id,
      status: payment.paymentStatus
    },
    verificationPayment: {
      id: verificationPayment.id,
      type: verificationType
    },
    razorpayKeyId: paymentConfig.razorpay.keyId
  };
};

/**
 * Verify and complete payment
 * @param {Object} params - Verification parameters
 * @param {string} params.razorpayOrderId - Razorpay order ID
 * @param {string} params.razorpayPaymentId - Razorpay payment ID
 * @param {string} params.razorpaySignature - Razorpay signature
 * @returns {Promise<Object>} Verification result
 */
const verifyAndCompletePayment = async (params) => {
  const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = params;

  // Verify signature
  const isValidSignature = razorpayService.verifySignature(
    razorpayOrderId,
    razorpayPaymentId,
    razorpaySignature
  );

  if (!isValidSignature) {
    // Log failed verification attempt
    console.error('Payment signature verification failed', {
      orderId: razorpayOrderId,
      paymentId: razorpayPaymentId
    });

    throw new Error('Invalid payment signature');
  }

  // Get payment record
  const payment = await prisma.payments.findUnique({
    where: { orderId: razorpayOrderId }
  });

  if (!payment) {
    throw new Error('Payment record not found');
  }

  // Check if already processed
  if (payment.paymentStatus === paymentConfig.paymentStatus.SUCCESS) {
    throw new Error('Payment already processed');
  }

  // Update payment status
  const updatedPayment = await prisma.payments.update({
    where: { id: payment.id },
    data: {
      paymentId: razorpayPaymentId,
      paymentStatus: paymentConfig.paymentStatus.SUCCESS
    }
  });

  // Update verification payment if exists
  const verificationPayment = await prisma.verificationPayments.findFirst({
    where: { razorpayOrderId: razorpayOrderId }
  });

  if (verificationPayment) {
    await prisma.verificationPayments.update({
      where: { id: verificationPayment.id },
      data: {
        paymentId: payment.id,
        paymentStatus: paymentConfig.paymentStatus.SUCCESS,
        razorpayPaymentId,
        razorpaySignature
      }
    });
  }

  // Log successful payment
  console.log('Payment completed successfully', {
    paymentId: payment.id,
    orderId: razorpayOrderId,
    userId: payment.userId
  });

  return {
    success: true,
    message: 'Payment verified successfully',
    payment: {
      id: updatedPayment.id,
      amount: updatedPayment.amountINR,
      status: updatedPayment.paymentStatus
    },
    verificationPayment: verificationPayment ? {
      id: verificationPayment.id,
      type: verificationPayment.verificationType
    } : null
  };
};

/**
 * Create bank transfer payment
 * @param {Object} params - Bank transfer parameters
 * @param {string} params.userId - User ID
 * @param {string} params.verificationType - Type: BASIC_AI or ADVANCED_AI
 * @returns {Promise<Object>} Bank transfer details
 */
const createBankTransferPayment = async (params) => {
  const { userId, verificationType } = params;

  // Validate verification type
  const typeValidation = paymentUtils.validateVerificationType(verificationType);
  if (!typeValidation.valid) {
    throw new Error(typeValidation.error);
  }

  // Get pricing
  const pricing = paymentUtils.getVerificationPricing(verificationType);
  const amountINR = pricing.price;
  const referenceId = paymentUtils.generateReferenceId();

  // Create payment record
  const payment = await prisma.payments.create({
    data: {
      userId,
      orderId: paymentUtils.generateOrderId(),
      amountINR,
      currency: 'INR',
      paymentMethod: paymentConfig.paymentMethods.BANK_TRANSFER,
      paymentStatus: paymentConfig.paymentStatus.PENDING_MANUAL,
      referenceId
    }
  });

  // Create verification payment record
  const verificationPayment = await prisma.verificationPayments.create({
    data: {
      userId,
      amount: amountINR,
      paymentStatus: paymentConfig.paymentStatus.PENDING,
      verificationType
    }
  });

  return {
    success: true,
    payment: {
      id: payment.id,
      amount: amountINR,
      referenceId,
      status: payment.paymentStatus
    },
    bankDetails: {
      ...paymentConfig.bankDetails,
      accountNumber: paymentUtils.maskAccountNumber(paymentConfig.bankDetails.accountNumber)
    },
    instructions: [
      `Transfer ₹${amountINR} to the bank account above`,
      `Use Reference ID: ${referenceId} as payment reference`,
      'Upload payment proof (screenshot/receipt) after transfer',
      'Admin will verify and approve within 24-48 hours'
    ]
  };
};

/**
 * Upload payment proof for bank transfer
 * @param {Object} params - Upload parameters
 * @param {string} params.paymentId - Payment ID
 * @param {string} params.userId - User ID
 * @param {string} params.proofUrl - URL of uploaded proof
 * @returns {Promise<Object>} Update result
 */
const uploadPaymentProof = async (params) => {
  const { paymentId, userId, proofUrl } = params;

  // Get payment
  const payment = await prisma.payments.findFirst({
    where: {
      id: paymentId,
      userId,
      paymentMethod: paymentConfig.paymentMethods.BANK_TRANSFER
    }
  });

  if (!payment) {
    throw new Error('Payment not found');
  }

  if (payment.paymentStatus !== paymentConfig.paymentStatus.PENDING_MANUAL) {
    throw new Error('Payment is not in pending state');
  }

  // Update payment with proof
  const updatedPayment = await prisma.payments.update({
    where: { id: paymentId },
    data: {
      paymentProof: proofUrl,
      notes: 'Payment proof uploaded by user'
    }
  });

  return {
    success: true,
    message: 'Payment proof uploaded successfully',
    payment: {
      id: updatedPayment.id,
      status: updatedPayment.paymentStatus
    }
  };
};

/**
 * Check if user has valid payment for AI verification
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Payment status
 */
const checkUserPaymentStatus = async (userId) => {
  // Check for active subscription
  const activeSubscription = await prisma.subscription.findFirst({
    where: {
      userId,
      status: 'ACTIVE',
      endDate: { gte: new Date() }
    }
  });

  if (activeSubscription) {
    return {
      hasValidPayment: true,
      paymentType: 'SUBSCRIPTION',
      details: {
        plan: activeSubscription.plan,
        endDate: activeSubscription.endDate
      }
    };
  }

  // Check for successful verification payment
  const successfulPayment = await prisma.verificationPayments.findFirst({
    where: {
      userId,
      paymentStatus: paymentConfig.paymentStatus.SUCCESS
    },
    orderBy: { createdAt: 'desc' }
  });

  if (successfulPayment) {
    return {
      hasValidPayment: true,
      paymentType: 'VERIFICATION',
      details: {
        type: successfulPayment.verificationType,
        amount: successfulPayment.amount,
        date: successfulPayment.createdAt
      }
    };
  }

  // Check for pending bank transfer
  const pendingBankTransfer = await prisma.payments.findFirst({
    where: {
      userId,
      paymentMethod: paymentConfig.paymentMethods.BANK_TRANSFER,
      paymentStatus: paymentConfig.paymentStatus.PENDING_MANUAL
    }
  });

  if (pendingBankTransfer) {
    return {
      hasValidPayment: false,
      paymentType: 'PENDING_BANK_TRANSFER',
      details: {
        referenceId: pendingBankTransfer.referenceId,
        amount: pendingBankTransfer.amountINR,
        hasProof: !!pendingBankTransfer.paymentProof
      }
    };
  }

  return {
    hasValidPayment: false,
    paymentType: null,
    details: null
  };
};

/**
 * Get payment history for user
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Payment history
 */
const getUserPaymentHistory = async (userId) => {
  const payments = await prisma.payments.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 20
  });

  const verificationPayments = await prisma.verificationPayments.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 20
  });

  return {
    payments: payments.map(p => ({
      id: p.id,
      orderId: p.orderId,
      amount: p.amountINR,
      currency: p.currency,
      method: p.paymentMethod,
      status: p.paymentStatus,
      createdAt: p.createdAt
    })),
    verificationPayments: verificationPayments.map(vp => ({
      id: vp.id,
      amount: vp.amount,
      type: vp.verificationType,
      status: vp.paymentStatus,
      createdAt: vp.createdAt
    }))
  };
};

/**
 * Handle Razorpay webhook
 * @param {Object} payload - Webhook payload
 * @returns {Promise<Object>} Processing result
 */
const handleWebhook = async (payload) => {
  const event = payload.event;

  console.log('Processing webhook event:', event);

  switch (event) {
    case paymentConfig.webhookEvents.PAYMENT_CAPTURED:
    case paymentConfig.webhookEvents.ORDER_PAID: {
      const paymentEntity = payload.payload.payment?.entity || payload.payload.order?.entity;
      
      if (paymentEntity) {
        const orderId = paymentEntity.order_id || paymentEntity.id;
        
        // Update payment status
        await prisma.payments.updateMany({
          where: { orderId },
          data: {
            paymentId: paymentEntity.id,
            paymentStatus: paymentConfig.paymentStatus.SUCCESS
          }
        });

        // Update verification payment
        await prisma.verificationPayments.updateMany({
          where: { razorpayOrderId: orderId },
          data: { paymentStatus: paymentConfig.paymentStatus.SUCCESS }
        });
      }
      break;
    }

    case paymentConfig.webhookEvents.PAYMENT_FAILED: {
      const paymentEntity = payload.payload.payment?.entity;
      
      if (paymentEntity) {
        await prisma.payments.updateMany({
          where: { orderId: paymentEntity.order_id },
          data: { paymentStatus: paymentConfig.paymentStatus.FAILED }
        });

        await prisma.verificationPayments.updateMany({
          where: { razorpayOrderId: paymentEntity.order_id },
          data: { paymentStatus: paymentConfig.paymentStatus.FAILED }
        });
      }
      break;
    }

    case paymentConfig.webhookEvents.REFUND_CREATED:
    case paymentConfig.webhookEvents.REFUND_PROCESSED: {
      const refundEntity = payload.payload.refund?.entity;
      
      if (refundEntity) {
        await prisma.payments.updateMany({
          where: { paymentId: refundEntity.payment_id },
          data: { paymentStatus: paymentConfig.paymentStatus.REFUNDED }
        });
      }
      break;
    }

    default:
      console.log('Unhandled webhook event:', event);
  }

  return { success: true, processed: true };
};

/**
 * Admin: Get pending bank transfers
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @returns {Promise<Object>} Pending payments list
 */
const getPendingBankTransfers = async (page = 1, limit = 20) => {
  const skip = (page - 1) * limit;

  const payments = await prisma.payments.findMany({
    where: {
      paymentMethod: paymentConfig.paymentMethods.BANK_TRANSFER,
      paymentStatus: paymentConfig.paymentStatus.PENDING_MANUAL
    },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true
        }
      }
    },
    orderBy: { createdAt: 'desc' },
    skip,
    take: limit
  });

  const total = await prisma.payments.count({
    where: {
      paymentMethod: paymentConfig.paymentMethods.BANK_TRANSFER,
      paymentStatus: paymentConfig.paymentStatus.PENDING_MANUAL
    }
  });

  return {
    payments,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  };
};

/**
 * Admin: Approve bank transfer
 * @param {Object} params - Approval parameters
 * @param {string} params.paymentId - Payment ID
 * @param {string} params.adminId - Admin ID
 * @param {string} params.notes - Optional notes
 * @returns {Promise<Object>} Approval result
 */
const approveBankTransfer = async (params) => {
  const { paymentId, adminId, notes } = params;

  const payment = await prisma.payments.findUnique({
    where: { id: paymentId }
  });

  if (!payment) {
    throw new Error('Payment not found');
  }

  if (payment.paymentStatus !== paymentConfig.paymentStatus.PENDING_MANUAL) {
    throw new Error('Payment is not in pending state');
  }

  // Update payment
  const updatedPayment = await prisma.payments.update({
    where: { id: paymentId },
    data: {
      paymentStatus: paymentConfig.paymentStatus.SUCCESS,
      verifiedBy: adminId,
      verifiedAt: new Date(),
      notes: notes || 'Approved by admin'
    }
  });

  // Update verification payment if exists
  const verificationPayment = await prisma.verificationPayments.findFirst({
    where: { userId: payment.userId }
  });

  if (verificationPayment) {
    await prisma.verificationPayments.update({
      where: { id: verificationPayment.id },
      data: {
        paymentId: payment.id,
        paymentStatus: paymentConfig.paymentStatus.SUCCESS
      }
    });
  }

  // Log admin action
  await prisma.adminActivityLog.create({
    data: {
      adminId,
      action: 'APPROVE_BANK_TRANSFER',
      targetUserId: payment.userId,
      details: JSON.stringify({
        paymentId,
        amount: payment.amountINR,
        referenceId: payment.referenceId
      })
    }
  });

  return {
    success: true,
    message: 'Bank transfer approved successfully',
    payment: updatedPayment
  };
};

/**
 * Admin: Reject bank transfer
 * @param {Object} params - Rejection parameters
 * @param {string} params.paymentId - Payment ID
 * @param {string} params.adminId - Admin ID
 * @param {string} params.reason - Rejection reason
 * @returns {Promise<Object>} Rejection result
 */
const rejectBankTransfer = async (params) => {
  const { paymentId, adminId, reason } = params;

  const payment = await prisma.payments.findUnique({
    where: { id: paymentId }
  });

  if (!payment) {
    throw new Error('Payment not found');
  }

  if (payment.paymentStatus !== paymentConfig.paymentStatus.PENDING_MANUAL) {
    throw new Error('Payment is not in pending state');
  }

  // Update payment
  const updatedPayment = await prisma.payments.update({
    where: { id: paymentId },
    data: {
      paymentStatus: paymentConfig.paymentStatus.FAILED,
      verifiedBy: adminId,
      verifiedAt: new Date(),
      rejectionReason: reason
    }
  });

  // Update verification payment if exists
  const verificationPayment = await prisma.verificationPayments.findFirst({
    where: { userId: payment.userId }
  });

  if (verificationPayment) {
    await prisma.verificationPayments.update({
      where: { id: verificationPayment.id },
      data: { paymentStatus: paymentConfig.paymentStatus.FAILED }
    });
  }

  // Log admin action
  await prisma.adminActivityLog.create({
    data: {
      adminId,
      action: 'REJECT_BANK_TRANSFER',
      targetUserId: payment.userId,
      details: JSON.stringify({
        paymentId,
        amount: payment.amountINR,
        referenceId: payment.referenceId,
        reason
      })
    }
  });

  return {
    success: true,
    message: 'Bank transfer rejected',
    payment: updatedPayment
  };
};

/**
 * Create a subscription payment order
 * @param {Object} params - Payment parameters
 * @param {string} params.userId - User ID
 * @param {string} params.planId - Subscription plan ID (BASIC, PRO, PREMIUM)
 * @param {string} params.currency - Currency (INR, USD)
 * @returns {Promise<Object>} Order details
 */
const createSubscriptionPayment = async (params) => {
  const { userId, planId, currency = 'INR' } = params;

  // Get plan details
  const plan = paymentConfig.subscriptionPlans[planId];
  if (!plan) {
    const validPlans = Object.keys(paymentConfig.subscriptionPlans).filter(p => p !== 'FREE');
    console.error(`Invalid subscription plan: ${planId}. Valid plans: ${validPlans.join(', ')}`);
    throw new Error(`Invalid subscription plan: ${planId}. Valid plans: ${validPlans.join(', ')}`);
  }

  if (plan.price === 0) {
    throw new Error('Cannot create payment for free plan');
  }

  let amountINR = plan.price;
  let exchangeRate = null;
  let commissionAmount = null;
  let originalAmount = null;
  let originalCurrency = null;
  let international = false;

  // Handle international payment
  if (currency !== 'INR') {
    international = true;
    originalAmount = plan.price;
    originalCurrency = currency;

    // Convert to INR
    const conversion = await exchangeRateService.convertToINR(plan.price, currency);
    
    if (!conversion.success) {
      throw new Error(conversion.error || 'Currency conversion failed');
    }

    amountINR = conversion.totalAmount;
    exchangeRate = conversion.exchangeRate;
    commissionAmount = conversion.commissionAmount;
  }

  // Create Razorpay order
  const orderResult = await razorpayService.createOrder({
    amount: amountINR,
    currency: 'INR', // Razorpay always processes in INR
    receipt: paymentUtils.generateOrderId(),
    notes: {
      userId,
      type: 'SUBSCRIPTION',
      planId,
      originalCurrency: originalCurrency || 'INR',
      originalAmount: originalAmount ? originalAmount.toString() : amountINR.toString()
    }
  });

  if (!orderResult.success) {
    throw new Error(orderResult.error || 'Failed to create order');
  }

  // Calculate subscription dates
  const startDate = new Date();
  let endDate = new Date();
  endDate.setDate(endDate.getDate() + plan.duration);

  // Create payment record
  const payment = await prisma.payments.create({
    data: {
      userId,
      orderId: orderResult.order.id,
      amountINR,
      currency: 'INR',
      paymentMethod: paymentConfig.paymentMethods.RAZORPAY,
      paymentStatus: paymentConfig.paymentStatus.PENDING,
      international,
      exchangeRate,
      commissionAmount,
      originalAmount,
      originalCurrency
    }
  });

  // Create subscription record (pending until payment verified)
  const subscription = await prisma.subscription.create({
    data: {
      userId,
      plan: planId,
      startDate,
      endDate,
      amount: amountINR,
      status: paymentConfig.paymentStatus.PENDING,
      paymentId: payment.id  // Link to payment record
    }
  });

  return {
    success: true,
    order: {
      id: orderResult.order.id,
      orderId: orderResult.order.id,
      amount: amountINR,
      currency: 'INR',
      originalAmount,
      originalCurrency,
      exchangeRate,
      commissionAmount,
      type: 'SUBSCRIPTION',
      planId,
      description: `${plan.name} Subscription - ${plan.duration} days`
    },
    payment: {
      id: payment.id,
      status: payment.paymentStatus
    },
    subscription: {
      id: subscription.id,
      plan: planId,
      startDate,
      endDate
    },
    razorpayKeyId: paymentConfig.razorpay.keyId
  };
};

/**
 * Verify and complete subscription payment
 * @param {Object} params - Verification parameters
 * @param {string} params.razorpayOrderId - Razorpay order ID
 * @param {string} params.razorpayPaymentId - Razorpay payment ID
 * @param {string} params.razorpaySignature - Razorpay signature
 * @returns {Promise<Object>} Verification result
 */
const verifyAndCompleteSubscriptionPayment = async (params) => {
  const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = params;

  // First use the existing verification
  const result = await verifyAndCompletePayment(params);

  // If payment verified, update subscription
  if (result.success) {
    // Find the payment record to get the payment ID
    const payment = await prisma.payments.findUnique({
      where: { orderId: razorpayOrderId }
    });

    if (payment) {
      // Find subscription by payment ID
      const subscription = await prisma.subscription.findFirst({
        where: { paymentId: payment.id }
      });

      if (subscription) {
        // Update subscription status
        await prisma.subscription.update({
          where: { id: subscription.id },
          data: {
            status: paymentConfig.paymentStatus.SUCCESS
          }
        });

        // Update user subscription tier
        const plan = paymentConfig.subscriptionPlans[subscription.plan];
        await prisma.user.update({
          where: { id: subscription.userId },
          data: {
            subscriptionTier: subscription.plan,
            subscriptionStart: subscription.startDate,
            subscriptionEnd: subscription.endDate,
            isPremium: true,
            successFee: plan ? plan.successFee : null
          }
        });

        result.subscription = {
          id: subscription.id,
          plan: subscription.plan,
          startDate: subscription.startDate,
          endDate: subscription.endDate
        };
      }
    }
  }

  return result;
};

module.exports = {
  createVerificationPayment,
  createSubscriptionPayment,
  verifyAndCompletePayment,
  verifyAndCompleteSubscriptionPayment,
  createBankTransferPayment,
  uploadPaymentProof,
  checkUserPaymentStatus,
  getUserPaymentHistory,
  handleWebhook,
  getPendingBankTransfers,
  approveBankTransfer,
  rejectBankTransfer
};
