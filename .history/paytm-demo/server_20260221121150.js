// Paytm Payment Gateway Demo Server
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const axios = require('axios');
const net = require('net');

const app = express();

// ------------------------
// Environment variable checks
// ------------------------
const REQUIRED_ENV = ['PAYTM_MERCHANT_ID', 'PAYTM_MERCHANT_KEY'];
const missingEnv = REQUIRED_ENV.filter(key => !process.env[key] || process.env[key] === `YOUR_${key}`);

if (missingEnv.length > 0) {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║           Paytm Demo - Setup Required                        ║
╠══════════════════════════════════════════════════════════════╣
║  Please update your .env file with valid Paytm credentials:  ║
║                                                              ║
║  Missing: ${missingEnv.join(', ')}
║                                                              ║
║  Get your credentials from: https://dashboard.paytm.com/     ║
║  Use WEBSTAGING for test mode website                        ║
╚══════════════════════════════════════════════════════════════╝
  `);
}

// ------------------------
// Middleware
// ------------------------
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Dynamic CORS
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && origin.startsWith('http://localhost')) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  }
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// ------------------------
// Paytm Configuration
// ------------------------
const PAYTM_CONFIG = {
  MID: process.env.PAYTM_MERCHANT_ID || 'demo_merchant',
  KEY: process.env.PAYTM_MERCHANT_KEY || 'demo_key',
  WEBSITE: process.env.PAYTM_WEBSITE || 'WEBSTAGING',
  CHANNEL_ID: process.env.PAYTM_CHANNEL_ID || 'WEB',
  INDUSTRY_TYPE_ID: process.env.PAYTM_INDUSTRY_TYPE_ID || 'Retail',
  CALLBACK_URL: process.env.PAYTM_CALLBACK_URL || 'http://localhost:5006/api/payment/callback',
  TEST_MODE: process.env.PAYTM_TEST_MODE !== 'false'
};

// Paytm URLs
const PAYTM_URLS = {
  TEST: {
    INITIATE: 'https://securegw-stage.paytm.in/order/process',
    STATUS: 'https://securegw-stage.paytm.in/order/status',
    REFUND: 'https://securegw-stage.paytm.in/refund/apply'
  },
  PROD: {
    INITIATE: 'https://securegw.paytm.in/order/process',
    STATUS: 'https://securegw.paytm.in/order/status',
    REFUND: 'https://securegw.paytm.in/refund/apply'
  }
};

// ------------------------
// Helper Functions
// ------------------------

// Generate checksum for Paytm
function generateChecksum(params, key) {
  const sortedParams = Object.keys(params)
    .sort()
    .reduce((acc, k) => {
      acc[k] = params[k];
      return acc;
    }, {});
  
  const paramString = Object.entries(sortedParams)
    .map(([k, v]) => `${k}=${v}`)
    .join('&');
  
  return crypto
    .createHmac('sha256', key)
    .update(paramString)
    .digest('hex');
}

// Verify checksum from Paytm response
function verifyChecksum(params, key, checksum) {
  const receivedChecksum = params.CHECKSUMHASH;
  delete params.CHECKSUMHASH;
  
  const calculatedChecksum = generateChecksum(params, key);
  return calculatedChecksum === receivedChecksum || receivedChecksum === checksum;
}

// Generate unique order ID
function generateOrderId() {
  return `ORDER_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`.toUpperCase();
}

// ------------------------
// Routes
// ------------------------

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Paytm Demo Server Running',
    testMode: PAYTM_CONFIG.TEST_MODE,
    merchantId: PAYTM_CONFIG.MID,
    configured: !missingEnv.length
  });
});

// Get Paytm config for frontend
app.get('/api/config', (req, res) => {
  res.json({
    merchantId: PAYTM_CONFIG.MID,
    testMode: PAYTM_CONFIG.TEST_MODE,
    configured: !missingEnv.length
  });
});

// Test cards info
app.get('/api/test-cards', (req, res) => {
  res.json({
    message: 'Use these test cards for testing payments',
    cards: [
      { number: '4111 1111 1111 1111', type: 'Visa - Success' },
      { number: '5267 3181 8792 6173', type: 'Mastercard - Success' },
      { number: '4000 0000 0000 0002', type: 'Visa - Failure' }
    ],
    note: 'Use any future expiry date and any CVV. For UPI, use success@paytm'
  });
});

// Create payment order
app.post('/api/create-order', async (req, res) => {
  try {
    const { amount, customerId, customerEmail, customerPhone } = req.body;
    
    if (!amount || amount < 1) {
      return res.status(400).json({ error: 'Invalid amount. Minimum amount is ₹1' });
    }

    const orderId = generateOrderId();
    
    // Paytm request parameters
    const paytmParams = {
      MID: PAYTM_CONFIG.MID,
      WEBSITE: PAYTM_CONFIG.WEBSITE,
      INDUSTRY_TYPE_ID: PAYTM_CONFIG.INDUSTRY_TYPE_ID,
      CHANNEL_ID: PAYTM_CONFIG.CHANNEL_ID,
      ORDER_ID: orderId,
      CUST_ID: customerId || `CUST_${Date.now()}`,
      TXN_AMOUNT: amount.toString(),
      CALLBACK_URL: PAYTM_CONFIG.CALLBACK_URL,
      EMAIL: customerEmail || 'test@example.com',
      MOBILE_NO: customerPhone || '9999999999'
    };

    // Generate checksum
    const checksum = generateChecksum(paytmParams, PAYTM_CONFIG.KEY);
    paytmParams.CHECKSUMHASH = checksum;

    console.log('Order created:', orderId);

    res.json({
      success: true,
      order: {
        orderId,
        amount,
        currency: 'INR',
        status: 'CREATED'
      },
      paytmParams,
      paytmUrl: PAYTM_CONFIG.TEST_MODE ? PAYTM_URLS.TEST.INITIATE : PAYTM_URLS.PROD.INITIATE
    });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ error: 'Failed to create order', message: error.message });
  }
});

// Payment callback from Paytm
app.post('/api/payment/callback', express.urlencoded({ extended: false }), (req, res) => {
  try {
    console.log('Paytm callback received:', req.body);
    
    const { ORDERID, TXNID, TXNAMOUNT, STATUS, RESPCODE, RESPMSG, CHECKSUMHASH } = req.body;
    
    // Verify checksum (simplified for demo)
    // In production, always verify the checksum
    
    if (STATUS === 'TXN_SUCCESS') {
      console.log('Payment successful:', TXNID);
      res.send(`
        <html>
          <head><title>Payment Success</title></head>
          <body>
            <h1>✅ Payment Successful!</h1>
            <p>Transaction ID: ${TXNID}</p>
            <p>Order ID: ${ORDERID}</p>
            <p>Amount: ₹${TXNAMOUNT}</p>
            <script>
              setTimeout(() => {
                window.location.href = '/?payment=success&txnId=${TXNID}&orderId=${ORDERID}';
              }, 2000);
            </script>
          </body>
        </html>
      `);
    } else {
      console.log('Payment failed:', RESPMSG);
      res.send(`
        <html>
          <head><title>Payment Failed</title></head>
          <body>
            <h1>❌ Payment Failed</h1>
            <p>Reason: ${RESPMSG}</p>
            <p>Order ID: ${ORDERID}</p>
            <script>
              setTimeout(() => {
                window.location.href = '/?payment=failed&msg=${encodeURIComponent(RESPMSG)}';
              }, 2000);
            </script>
          </body>
        </html>
      `);
    }
  } catch (error) {
    console.error('Callback error:', error);
    res.status(500).send('Error processing payment callback');
  }
});

// Check payment status
app.post('/api/payment/status', async (req, res) => {
  try {
    const { orderId } = req.body;
    
    if (!orderId) {
      return res.status(400).json({ error: 'Order ID is required' });
    }

    const paytmParams = {
      MID: PAYTM_CONFIG.MID,
      ORDERID: orderId
    };

    const checksum = generateChecksum(paytmParams, PAYTM_CONFIG.KEY);
    paytmParams.CHECKSUMHASH = checksum;

    const url = PAYTM_CONFIG.TEST_MODE ? PAYTM_URLS.TEST.STATUS : PAYTM_URLS.PROD.STATUS;
    
    // In production, make actual API call to Paytm
    // For demo, return mock response
    res.json({
      success: true,
      status: 'Mock response - configure real credentials for actual status check',
      orderId
    });
  } catch (error) {
    console.error('Status check error:', error);
    res.status(500).json({ error: 'Failed to check status', message: error.message });
  }
});

// Refund
app.post('/api/refund', async (req, res) => {
  try {
    const { orderId, txnId, amount, refId } = req.body;
    
    if (!orderId || !txnId) {
      return res.status(400).json({ error: 'Order ID and Transaction ID are required' });
    }

    const refundId = refId || `REFUND_${Date.now()}`;
    
    const paytmParams = {
      MID: PAYTM_CONFIG.MID,
      TXNID: txnId,
      ORDERID: orderId,
      REFID: refundId,
      REFUNDAMOUNT: amount ? amount.toString() : ''
    };

    const checksum = generateChecksum(paytmParams, PAYTM_CONFIG.KEY);
    paytmParams.CHECKSUMHASH = checksum;

    console.log('Refund initiated:', refundId);

    res.json({
      success: true,
      refund: {
        refundId,
        orderId,
        txnId,
        status: 'INITIATED'
      }
    });
  } catch (error) {
    console.error('Refund error:', error);
    res.status(500).json({ error: 'Failed to process refund', message: error.message });
  }
});

// ------------------------
// Start Server
// ------------------------
const DEFAULT_PORT = process.env.PORT ? parseInt(process.env.PORT) : 5006;

function findFreePort(port, callback) {
  const server = net.createServer();
  server.once('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      findFreePort(port + 1, callback);
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
╔════════════════════════════════════════════════════════════╗
║           Paytm Payment Gateway Demo                        ║
╠════════════════════════════════════════════════════════════╣
║  Server running on: http://localhost:${port}                  ║
║  Test Mode: ${PAYTM_CONFIG.TEST_MODE ? 'Enabled' : 'Disabled'}                                      ║
║  Merchant ID: ${PAYTM_CONFIG.MID}                       ║
╚════════════════════════════════════════════════════════════╝

Available Endpoints:
  GET  /api/health          - Health check
  GET  /api/config          - Get Paytm config
  GET  /api/test-cards      - Get test card details
  POST /api/create-order    - Create new order
  POST /api/payment/callback - Payment callback (Paytm redirects here)
  POST /api/payment/status  - Check payment status
  POST /api/refund          - Refund a payment

${missingEnv.length ? '⚠️  Configure your .env file with valid Paytm credentials to enable payments' : '✅ Paytm credentials configured'}
    `);
  });
});
