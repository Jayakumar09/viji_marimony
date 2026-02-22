// Instamojo Payment Gateway Demo Server
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const axios = require('axios');
const net = require('net');

const app = express();

// ------------------------
// Environment Configuration
// ------------------------
const CONFIG = {
  API_KEY: process.env.INSTAMOJO_API_KEY || 'test_api_key',
  AUTH_TOKEN: process.env.INSTAMOJO_AUTH_TOKEN || 'test_auth_token',
  SALT: process.env.INSTAMOJO_SALT || 'test_salt',
  TEST_MODE: process.env.INSTAMOJO_TEST_MODE !== 'false',
  REDIRECT_URL: process.env.INSTAMOJO_REDIRECT_URL || 'http://localhost:5007/api/payment/callback',
  WEBHOOK_URL: process.env.INSTAMOJO_WEBHOOK_URL || 'http://localhost:5007/api/payment/webhook'
};

// Instamojo API URLs
const INSTAMOJO_URLS = {
  TEST: 'https://test.instamojo.com/api/1.1',
  PROD: 'https://www.instamojo.com/api/1.1'
};

const BASE_URL = CONFIG.TEST_MODE ? INSTAMOJO_URLS.TEST : INSTAMOJO_URLS.PROD;

// Check if credentials are configured
const isConfigured = CONFIG.API_KEY !== 'test_api_key' && 
                     CONFIG.AUTH_TOKEN !== 'test_auth_token' && 
                     CONFIG.SALT !== 'test_salt';

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
// Helper Functions
// ------------------------

// Generate unique order ID
function generateOrderId() {
  return `MOJO_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`.toUpperCase();
}

// Verify Instamojo webhook signature
function verifyWebhookSignature(data, salt, receivedSignature) {
  const sortedKeys = Object.keys(data).sort();
  const signatureString = sortedKeys.map(key => `${key}|${data[key]}`).join('|');
  const calculatedSignature = crypto
    .createHmac('sha1', salt)
    .update(signatureString)
    .digest('hex');
  return calculatedSignature === receivedSignature;
}

// ------------------------
// Routes
// ------------------------

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Instamojo Demo Server Running',
    testMode: CONFIG.TEST_MODE,
    configured: isConfigured,
    baseUrl: BASE_URL
  });
});

// Get config
app.get('/api/config', (req, res) => {
  res.json({
    testMode: CONFIG.TEST_MODE,
    configured: isConfigured
  });
});

// Test cards info
app.get('/api/test-cards', (req, res) => {
  res.json({
    message: 'Instamojo Test Mode Information',
    cards: [
      { number: '4242 4242 4242 4242', type: 'Visa - Success' },
      { number: '5555 5555 5555 4444', type: 'Mastercard - Success' },
      { number: '4000 0000 0000 0002', type: 'Visa - Decline' }
    ],
    note: 'In test mode, use any valid card format. For UPI, use success@upi'
  });
});

// Create payment request
app.post('/api/create-payment', async (req, res) => {
  try {
    const { amount, purpose, buyerName, email, phone } = req.body;
    
    if (!amount || amount < 10) {
      return res.status(400).json({ 
        error: 'Invalid amount. Minimum amount is ₹10' 
      });
    }

    const orderId = generateOrderId();

    // Prepare payment request data
    const paymentData = {
      purpose: purpose || `Payment for Order ${orderId}`,
      amount: amount.toString(),
      buyer_name: buyerName || 'Test Buyer',
      email: email || 'test@example.com',
      phone: phone || '9999999999',
      transaction_id: orderId,
      redirect_url: CONFIG.REDIRECT_URL,
      webhook: CONFIG.WEBHOOK_URL,
      allow_repeated_payments: false
    };

    console.log('Creating payment request:', orderId);

    if (!isConfigured) {
      // Demo mode - return mock response
      console.log('Demo mode: Returning mock payment URL');
      return res.json({
        success: true,
        demo: true,
        message: 'Demo mode - Configure API credentials for real payments',
        payment: {
          id: `MOJO_DEMO_${Date.now()}`,
          order_id: orderId,
          amount: amount,
          purpose: paymentData.purpose,
          status: 'CREATED'
        },
        payment_url: `/demo-payment?amount=${amount}&orderId=${orderId}&purpose=${encodeURIComponent(paymentData.purpose)}`,
        longurl: `${BASE_URL}/payment/${orderId}`
      });
    }

    // Make API call to Instamojo
    const response = await axios.post(
      `${BASE_URL}/payment-requests/`,
      new URLSearchParams(paymentData),
      {
        headers: {
          'X-Api-Key': CONFIG.API_KEY,
          'X-Auth-Token': CONFIG.AUTH_TOKEN,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    console.log('Payment created:', response.data);

    res.json({
      success: true,
      payment: {
        id: response.data.payment_request.id,
        order_id: orderId,
        amount: response.data.payment_request.amount,
        purpose: response.data.payment_request.purpose,
        status: response.data.payment_request.status
      },
      payment_url: response.data.payment_request.longurl,
      longurl: response.data.payment_request.longurl
    });

  } catch (error) {
    console.error('Error creating payment:', error.response?.data || error.message);
    res.status(500).json({ 
      error: 'Failed to create payment', 
      message: error.response?.data?.message || error.message 
    });
  }
});

// Payment callback (redirect from Instamojo)
app.get('/api/payment/callback', (req, res) => {
  try {
    const { payment_id, payment_request_id, status } = req.query;
    
    console.log('Payment callback received:', req.query);

    if (status === 'Credit') {
      res.send(`
        <html>
          <head>
            <title>Payment Success</title>
            <style>
              body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #e8f5e9; }
              .container { background: white; padding: 40px; border-radius: 10px; max-width: 500px; margin: 0 auto; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
              h1 { color: #4caf50; }
              .details { text-align: left; margin: 20px 0; padding: 15px; background: #f5f5f5; border-radius: 5px; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>✅ Payment Successful!</h1>
              <div class="details">
                <p><strong>Payment ID:</strong> ${payment_id}</p>
                <p><strong>Request ID:</strong> ${payment_request_id}</p>
                <p><strong>Status:</strong> ${status}</p>
              </div>
              <p>Redirecting back to demo...</p>
            </div>
            <script>
              setTimeout(() => {
                window.location.href = '/?payment=success&paymentId=${payment_id}&requestId=${payment_request_id}';
              }, 3000);
            </script>
          </body>
        </html>
      `);
    } else {
      res.send(`
        <html>
          <head>
            <title>Payment Failed</title>
            <style>
              body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #ffebee; }
              .container { background: white; padding: 40px; border-radius: 10px; max-width: 500px; margin: 0 auto; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
              h1 { color: #f44336; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>❌ Payment Failed</h1>
              <p>Status: ${status}</p>
              <p>Redirecting back to demo...</p>
            </div>
            <script>
              setTimeout(() => {
                window.location.href = '/?payment=failed&status=${status}';
              }, 3000);
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

// Webhook for payment notifications
app.post('/api/payment/webhook', express.urlencoded({ extended: false }), (req, res) => {
  try {
    console.log('Webhook received:', req.body);
    
    // Verify webhook signature (if configured)
    // const isValid = verifyWebhookSignature(req.body, CONFIG.SALT, req.headers['x-instamojo-signature']);
    
    const { payment_id, payment_request_id, status, amount, fees } = req.body;
    
    if (status === 'Credit') {
      console.log('Payment successful via webhook:', payment_id);
      // Update your database here
    }
    
    res.status(200).send('OK');
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).send('Error');
  }
});

// Get payment details
app.get('/api/payment/:paymentId', async (req, res) => {
  try {
    const { paymentId } = req.params;

    if (!isConfigured) {
      return res.json({
        success: true,
        demo: true,
        payment: {
          id: paymentId,
          status: 'Credit',
          amount: '100.00'
        }
      });
    }

    const response = await axios.get(
      `${BASE_URL}/payments/${paymentId}/`,
      {
        headers: {
          'X-Api-Key': CONFIG.API_KEY,
          'X-Auth-Token': CONFIG.AUTH_TOKEN
        }
      }
    );

    res.json({
      success: true,
      payment: response.data.payment
    });
  } catch (error) {
    console.error('Error fetching payment:', error.response?.data || error.message);
    res.status(500).json({ 
      error: 'Failed to fetch payment', 
      message: error.response?.data?.message || error.message 
    });
  }
});

// Get payment request details
app.get('/api/payment-request/:requestId', async (req, res) => {
  try {
    const { requestId } = req.params;

    if (!isConfigured) {
      return res.json({
        success: true,
        demo: true,
        request: {
          id: requestId,
          status: 'Completed',
          amount: '100.00'
        }
      });
    }

    const response = await axios.get(
      `${BASE_URL}/payment-requests/${requestId}/`,
      {
        headers: {
          'X-Api-Key': CONFIG.API_KEY,
          'X-Auth-Token': CONFIG.AUTH_TOKEN
        }
      }
    );

    res.json({
      success: true,
      request: response.data.payment_request
    });
  } catch (error) {
    console.error('Error fetching payment request:', error.response?.data || error.message);
    res.status(500).json({ 
      error: 'Failed to fetch payment request', 
      message: error.response?.data?.message || error.message 
    });
  }
});

// Refund payment
app.post('/api/refund', async (req, res) => {
  try {
    const { paymentId, amount, reason } = req.body;

    if (!paymentId) {
      return res.status(400).json({ error: 'Payment ID is required' });
    }

    if (!isConfigured) {
      return res.json({
        success: true,
        demo: true,
        refund: {
          payment_id: paymentId,
          amount: amount || 'Full refund',
          status: 'Refunded'
        }
      });
    }

    const refundData = {
      payment_id: paymentId,
      type: 'TNR', // TNR = Transaction Not Recognized, QFL = Quality Failure, TEF = Transaction Error, FRD = Fraud
      body: reason || 'Refund requested by customer'
    };

    if (amount) {
      refundData.refund_amount = amount.toString();
    }

    const response = await axios.post(
      `${BASE_URL}/refunds/`,
      new URLSearchParams(refundData),
      {
        headers: {
          'X-Api-Key': CONFIG.API_KEY,
          'X-Auth-Token': CONFIG.AUTH_TOKEN,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    console.log('Refund processed:', response.data);

    res.json({
      success: true,
      refund: response.data.refund
    });
  } catch (error) {
    console.error('Refund error:', error.response?.data || error.message);
    res.status(500).json({ 
      error: 'Failed to process refund', 
      message: error.response?.data?.message || error.message 
    });
  }
});

// Demo payment page (for testing without real credentials)
app.get('/demo-payment', (req, res) => {
  const { amount, orderId, purpose } = req.query;
  
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Demo Payment - Instamojo</title>
      <style>
        body { font-family: Arial, sans-serif; background: #f5f5f5; padding: 20px; }
        .container { max-width: 500px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1 { color: #6c5ce7; text-align: center; }
        .amount { font-size: 2rem; text-align: center; color: #333; margin: 20px 0; }
        .form-group { margin-bottom: 15px; }
        label { display: block; margin-bottom: 5px; color: #666; }
        input { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px; font-size: 1rem; }
        .btn { width: 100%; padding: 15px; background: #6c5ce7; color: white; border: none; border-radius: 5px; font-size: 1.1rem; cursor: pointer; margin-top: 20px; }
        .btn:hover { background: #5b4cdb; }
        .btn-secondary { background: #00b894; margin-top: 10px; }
        .btn-secondary:hover { background: #00a383; }
        .note { background: #fff3cd; padding: 10px; border-radius: 5px; margin-top: 20px; font-size: 0.9rem; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🛒 Demo Payment</h1>
        <p style="text-align: center; color: #666;">${purpose || 'Payment'}</p>
        <div class="amount">₹${amount || '100'}</div>
        
        <div class="form-group">
          <label>Card Number</label>
          <input type="text" value="4242 4242 4242 4242" placeholder="Enter card number">
        </div>
        <div style="display: flex; gap: 10px;">
          <div class="form-group" style="flex: 1;">
            <label>Expiry</label>
            <input type="text" value="12/25" placeholder="MM/YY">
          </div>
          <div class="form-group" style="flex: 1;">
            <label>CVV</label>
            <input type="text" value="123" placeholder="CVV">
          </div>
        </div>
        
        <button class="btn" onclick="simulatePayment('success')">✅ Simulate Success</button>
        <button class="btn btn-secondary" onclick="simulatePayment('fail')">❌ Simulate Failure</button>
        
        <div class="note">
          <strong>⚠️ Demo Mode:</strong> This is a simulated payment page. Configure your Instamojo API credentials for real payments.
        </div>
      </div>
      
      <script>
        function simulatePayment(status) {
          const paymentId = 'MOJO_DEMO_' + Date.now();
          const requestId = '${orderId || 'ORDER_DEMO'}';
          
          if (status === 'success') {
            window.location.href = '/api/payment/callback?payment_id=' + paymentId + '&payment_request_id=' + requestId + '&status=Credit';
          } else {
            window.location.href = '/api/payment/callback?payment_id=' + paymentId + '&payment_request_id=' + requestId + '&status=Failed';
          }
        }
      </script>
    </body>
    </html>
  `);
});

// ------------------------
// Start Server
// ------------------------
const DEFAULT_PORT = process.env.PORT ? parseInt(process.env.PORT) : 5007;

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
║           Instamojo Payment Gateway Demo                   ║
╠════════════════════════════════════════════════════════════╣
║  Server running on: http://localhost:${port}                  ║
║  Test Mode: ${CONFIG.TEST_MODE ? 'Enabled' : 'Disabled'}                                      ║
║  API Configured: ${isConfigured ? 'Yes' : 'No (Demo Mode)'}                               ║
╚════════════════════════════════════════════════════════════╝

Available Endpoints:
  GET  /api/health              - Health check
  GET  /api/config              - Get configuration
  GET  /api/test-cards          - Get test card info
  POST /api/create-payment      - Create payment request
  GET  /api/payment/callback    - Payment redirect handler
  POST /api/payment/webhook     - Webhook handler
  GET  /api/payment/:id         - Get payment details
  GET  /api/payment-request/:id - Get payment request details
  POST /api/refund              - Process refund

${isConfigured ? '✅ API credentials configured' : '⚠️  Running in DEMO mode - Configure API credentials for real payments'}
    `);
  });
});
