// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const Razorpay = require('razorpay');
const crypto = require('crypto');

const app = express();

// ------------------------
// Environment variable checks
// ------------------------
const REQUIRED_ENV = ['RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET', 'RAZORPAY_TEST_MODE'];
REQUIRED_ENV.forEach((key) => {
  if (!process.env[key]) {
    console.error(`❌ Environment variable ${key} is missing. Please add it to your .env file.`);
    process.exit(1);
  }
});

// ------------------------
// Middleware
// ------------------------
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  })
);
app.use(express.json());
app.use(express.static('public'));

// ------------------------
// Initialize Razorpay
// ------------------------
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// ------------------------
// Test cards for demo
// ------------------------
const TEST_CARDS = [
  { number: '4111 1111 1111 1111', network: 'Visa', type: 'Success' },
  { number: '5267 3181 8792 6173', network: 'Mastercard', type: 'Success' },
  { number: '4000 0000 0000 0002', network: 'Visa', type: 'Failure' },
];

// ------------------------
// Routes
// ------------------------

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Razorpay Demo Server Running',
    testMode: process.env.RAZORPAY_TEST_MODE === 'true',
    keyId: process.env.RAZORPAY_KEY_ID,
  });
});

// Razorpay config
app.get('/api/config', (req, res) => {
  res.json({
    keyId: process.env.RAZORPAY_KEY_ID,
    testMode: process.env.RAZORPAY_TEST_MODE === 'true',
  });
});

// Test cards info
app.get('/api/test-cards', (req, res) => {
  res.json({
    message: 'Use these test cards for testing payments',
    cards: TEST_CARDS,
    note: 'Use any future expiry date and any 3-digit CVV. For UPI, use success@razorpay',
  });
});

// Create order
app.post('/api/create-order', async (req, res) => {
  try {
    const { amount, currency = 'INR', receipt, notes } = req.body;
    if (!amount || amount < 1) {
      return res.status(400).json({ error: 'Invalid amount. Minimum amount is ₹1' });
    }

    const options = {
      amount: amount * 100, // paise
      currency,
      receipt: receipt || `receipt_${Date.now()}`,
      notes: notes || {},
    };

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
        created_at: order.created_at,
      },
    });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ error: 'Failed to create order', message: error.message });
  }
});

// Verify payment
app.post('/api/verify-payment', (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ error: 'Missing required payment details' });
    }

    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (expectedSignature === razorpay_signature) {
      console.log('Payment verified successfully:', razorpay_payment_id);
      res.json({
        success: true,
        message: 'Payment verified successfully',
        paymentId: razorpay_payment_id,
        orderId: razorpay_order_id,
      });
    } else {
      console.error('Signature mismatch');
      res.status(400).json({ success: false, error: 'Invalid signature. Payment verification failed.' });
    }
  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({ error: 'Failed to verify payment', message: error.message });
  }
});

// Fetch payment
app.get('/api/payment/:paymentId', async (req, res) => {
  try {
    const payment = await razorpay.payments.fetch(req.params.paymentId);
    res.json({ success: true, payment });
  } catch (error) {
    console.error('Error fetching payment:', error);
    res.status(500).json({ error: 'Failed to fetch payment details', message: error.message });
  }
});

// Fetch order
app.get('/api/order/:orderId', async (req, res) => {
  try {
    const order = await razorpay.orders.fetch(req.params.orderId);
    res.json({ success: true, order });
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ error: 'Failed to fetch order details', message: error.message });
  }
});

// Refund
app.post('/api/refund', async (req, res) => {
  try {
    const { paymentId, amount } = req.body;
    if (!paymentId) return res.status(400).json({ error: 'Payment ID is required' });

    const refundOptions = amount ? { amount: amount * 100 } : {};
    const refund = await razorpay.payments.refund(paymentId, refundOptions);

    console.log('Refund processed:', refund.id);
    res.json({ success: true, refund });
  } catch (error) {
    console.error('Error processing refund:', error);
    res.status(500).json({ error: 'Failed to process refund', message: error.message });
  }
});

// ------------------------
// Start server
// ------------------------
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`
🚀 Razorpay Demo Server Running
🌐 URL: http://localhost:${PORT}
🧪 Test Mode: ${process.env.RAZORPAY_TEST_MODE === 'true' ? 'Enabled' : 'Disabled'}
🔑 Key ID: ${process.env.RAZORPAY_KEY_ID}
`);
});