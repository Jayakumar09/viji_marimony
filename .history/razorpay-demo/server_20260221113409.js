// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const net = require('net');

const app = express();

// ------------------------
// Environment variable checks
// ------------------------
['RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET', 'RAZORPAY_TEST_MODE'].forEach((key) => {
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
// Razorpay init
// ------------------------
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// ------------------------
// Test cards
// ------------------------
const TEST_CARDS = [
  { number: '4111 1111 1111 1111', network: 'Visa', type: 'Success' },
  { number: '5267 3181 8792 6173', network: 'Mastercard', type: 'Success' },
  { number: '4000 0000 0000 0002', network: 'Visa', type: 'Failure' },
];

// ------------------------
// Routes (health, config, create-order, verify, fetch, refund)
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

// Config
app.get('/api/config', (req, res) => {
  res.json({
    keyId: process.env.RAZORPAY_KEY_ID,
    testMode: process.env.RAZORPAY_TEST_MODE === 'true',
  });
});

// Test cards
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
    if (!amount || amount < 1) return res.status(400).json({ error: 'Invalid amount' });

    const options = {
      amount: amount * 100,
      currency,
      receipt: receipt || `receipt_${Date.now()}`,
      notes: notes || {},
    };

    const order = await razorpay.orders.create(options);
    res.json({ success: true, order });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create order', message: error.message });
  }
});

// Verify payment
app.post('/api/verify-payment', (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature)
      return res.status(400).json({ error: 'Missing required payment details' });

    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (expectedSignature === razorpay_signature) {
      res.json({ success: true, paymentId: razorpay_payment_id, orderId: razorpay_order_id });
    } else {
      res.status(400).json({ success: false, error: 'Invalid signature' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to verify payment', message: error.message });
  }
});

// Fetch payment
app.get('/api/payment/:paymentId', async (req, res) => {
  try {
    const payment = await razorpay.payments.fetch(req.params.paymentId);
    res.json({ success: true, payment });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch payment', message: error.message });
  }
});

// Fetch order
app.get('/api/order/:orderId', async (req, res) => {
  try {
    const order = await razorpay.orders.fetch(req.params.orderId);
    res.json({ success: true, order });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch order', message: error.message });
  }
});

// Refund
app.post('/api/refund', async (req, res) => {
  try {
    const { paymentId, amount } = req.body;
    if (!paymentId) return res.status(400).json({ error: 'Payment ID required' });

    const refundOptions = amount ? { amount: amount * 100 } : {};
    const refund = await razorpay.payments.refund(paymentId, refundOptions);
    res.json({ success: true, refund });
  } catch (error) {
    res.status(500).json({ error: 'Failed to refund', message: error.message });
  }
});

// ------------------------
// Auto port selection
// ------------------------
const DEFAULT_PORT = process.env.PORT ? parseInt(process.env.PORT) : 5005;

function findFreePort(port, callback) {
  const server = net.createServer();
  server.once('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      findFreePort(port + 1, callback); // try next port
    } else {
      callback(err, null);
    }
  });
  server.once('listening', () => {
    server.close(() => callback(null, port));
  });
  server.listen(port);
}

findFreePort(DEFAULT_PORT, (err, port) => {
  if (err) {
    console.error('Failed to find a free port', err);
    process.exit(1);
  }
  app.listen(port, () => {
    console.log(`
🚀 Razorpay Demo Server Running
🌐 URL: http://localhost:${port}
🧪 Test Mode: ${process.env.RAZORPAY_TEST_MODE === 'true' ? 'Enabled' : 'Disabled'}
🔑 Key ID: ${process.env.RAZORPAY_KEY_ID}
    `);
  });
});