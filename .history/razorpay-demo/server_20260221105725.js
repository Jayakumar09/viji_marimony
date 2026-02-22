require('dotenv').config();
const express = require('express');
const cors = require('cors');
const Razorpay = require('razorpay');

const app = express();

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(express.static('public'));

// Initialize Razorpay with Test Mode credentials
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// Test card details for reference
const TEST_CARDS = [
  { number: '4111 1111 1111 1111', network: 'Visa', type: 'Success' },
  { number: '5267 3181 8792 6173', network: 'Mastercard', type: 'Success' },
  { number: '4000 0000 0000 0002', network: 'Visa', type: 'Failure' },
];

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Razorpay Demo Server Running',
    testMode: process.env.RAZORPAY_TEST_MODE === 'true',
    keyId: process.env.RAZORPAY_KEY_ID
  });
});

// Get Razorpay Key ID for frontend
app.get('/api/config', (req, res) => {
  res.json({
    keyId: process.env.RAZORPAY_KEY_ID,
    testMode: process.env.RAZORPAY_TEST_MODE === 'true'
  });
});

// Get test cards info
app.get('/api/test-cards', (req, res) => {
  res.json({
    message: 'Use these test cards for testing payments',
    cards: TEST_CARDS,
    note: 'Use any future expiry date and any 3-digit CVV. For UPI, use success@razorpay'
  });
});

// Create a new order
app.post('/api/create-order', async (req, res) => {
  try {
    const { amount, currency = 'INR', receipt, notes } = req.body;

    // Validate amount
    if (!amount || amount < 1) {
      return res.status(400).json({ 
        error: 'Invalid amount. Minimum amount is ₹1' 
      });
    }

    // Create order options
    const options = {
      amount: amount * 100, // Convert to paise (smallest currency unit)
      currency,
      receipt: receipt || `receipt_${Date.now()}`,
      notes: notes || {}
    };

    // Create order in Razorpay
    const order = await razorpay.orders.create(options);

    console.log('Order created:', order.id);

    res.json({
      success: true,
      order: {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
        receipt: order.receipt,
        status: order.status,
        created_at: order.created_at
      }
    });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ 
      error: 'Failed to create order',
      message: error.message 
    });
  }
});

// Verify payment signature
app.post('/api/verify-payment', (req, res) => {
  try {
    const { 
      razorpay_order_id, 
      razorpay_payment_id, 
      razorpay_signature 
    } = req.body;

    // Validate required fields
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ 
        error: 'Missing required payment details' 
      });
    }

    // Create signature for verification
    const crypto = require('crypto');
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    // Verify signature
    if (expectedSignature === razorpay_signature) {
      console.log('Payment verified successfully:', razorpay_payment_id);
      res.json({
        success: true,
        message: 'Payment verified successfully',
        paymentId: razorpay_payment_id,
        orderId: razorpay_order_id
      });
    } else {
      console.error('Signature mismatch');
      res.status(400).json({
        success: false,
        error: 'Invalid signature. Payment verification failed.'
      });
    }
  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({ 
      error: 'Failed to verify payment',
      message: error.message 
    });
  }
});

// Fetch payment details
app.get('/api/payment/:paymentId', async (req, res) => {
  try {
    const { paymentId } = req.params;
    const payment = await razorpay.payments.fetch(paymentId);
    
    res.json({
      success: true,
      payment: {
        id: payment.id,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        method: payment.method,
        email: payment.email,
        contact: payment.contact,
        created_at: payment.created_at
      }
    });
  } catch (error) {
    console.error('Error fetching payment:', error);
    res.status(500).json({ 
      error: 'Failed to fetch payment details',
      message: error.message 
    });
  }
});

// Fetch order details
app.get('/api/order/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await razorpay.orders.fetch(orderId);
    
    res.json({
      success: true,
      order: {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
        status: order.status,
        receipt: order.receipt,
        created_at: order.created_at
      }
    });
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ 
      error: 'Failed to fetch order details',
      message: error.message 
    });
  }
});

// Refund a payment
app.post('/api/refund', async (req, res) => {
  try {
    const { paymentId, amount } = req.body;

    if (!paymentId) {
      return res.status(400).json({ 
        error: 'Payment ID is required' 
      });
    }

    const refundOptions = {
      payment_id: paymentId
    };

    if (amount) {
      refundOptions.amount = amount * 100; // Partial refund in paise
    }

    const refund = await razorpay.payments.refund(paymentId, refundOptions);

    console.log('Refund processed:', refund.id);

    res.json({
      success: true,
      refund: {
        id: refund.id,
        payment_id: refund.payment_id,
        amount: refund.amount,
        status: refund.status,
        created_at: refund.created_at
      }
    });
  } catch (error) {
    console.error('Error processing refund:', error);
    res.status(500).json({ 
      error: 'Failed to process refund',
      message: error.message 
    });
  }
});

// Start server
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║           Razorpay Demo Server - Test Mode                 ║
╠════════════════════════════════════════════════════════════╣
║  Server running on: http://localhost:${PORT}                  ║
║  Test Mode: ${process.env.RAZORPAY_TEST_MODE === 'true' ? 'Enabled' : 'Disabled'}                                      ║
║  Key ID: ${process.env.RAZORPAY_KEY_ID}                       ║
╚════════════════════════════════════════════════════════════╝

Available Endpoints:
  GET  /api/health          - Health check
  GET  /api/config          - Get Razorpay config
  GET  /api/test-cards      - Get test card details
  POST /api/create-order    - Create new order
  POST /api/verify-payment  - Verify payment signature
  GET  /api/payment/:id     - Fetch payment details
  GET  /api/order/:id       - Fetch order details
  POST /api/refund          - Refund a payment
  `);
});
