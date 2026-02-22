/**
 * PhonePe Integration Test Script
 * 
 * Tests the PhonePe payment integration:
 * - OAuth token retrieval
 * - Payment initiation
 * - Payment status check
 * 
 * Run with: node test-phonepe.js
 */

require('dotenv').config();
const phonepeService = require('./services/phonepeService');
const phonepeConfig = require('./config/phonepeConfig');

console.log('========================================');
console.log('PhonePe Integration Test');
console.log('========================================\n');

// Test 1: Check Configuration
console.log('Test 1: Configuration Check');
console.log('----------------------------');
console.log('Environment:', phonepeConfig.environment);
console.log('Base URL:', phonepeConfig.getBaseUrl());
console.log('Checkout URL:', phonepeConfig.getCheckoutUrl());
console.log('Merchant ID:', phonepeConfig.merchantId ? '✅ Set' : '❌ Not Set');
console.log('Client ID:', phonepeConfig.clientId ? '✅ Set' : '❌ Not Set');
console.log('Client Secret:', phonepeConfig.clientSecret ? '✅ Set' : '❌ Not Set');
console.log('Is Configured:', phonepeConfig.isConfigured() ? '✅ Yes' : '❌ No');
console.log('\n');

// Test 2: OAuth Token
async function testOAuthToken() {
  console.log('Test 2: OAuth Token Retrieval');
  console.log('------------------------------');
  
  if (!phonepeConfig.isConfigured()) {
    console.log('⚠️ Skipping - PhonePe not configured');
    console.log('Please set PHONEPE_MERCHANT_ID, PHONEPE_CLIENT_ID, and PHONEPE_CLIENT_SECRET in .env\n');
    return;
  }

  try {
    const token = await phonepeService.getAccessToken();
    console.log('✅ Token obtained successfully');
    // Security: Never log token data, even partially
    if (process.env.DEBUG_PAYMENT === 'true') {
      console.log('Token length:', token.length, 'characters');
    }
  } catch (error) {
    console.log('❌ Failed to get token:', error.message);
  }
  console.log('\n');
}

// Test 3: Payment Initiation
async function testPaymentInitiation() {
  console.log('Test 3: Payment Initiation');
  console.log('--------------------------');
  
  if (!phonepeConfig.isConfigured()) {
    console.log('⚠️ Skipping - PhonePe not configured\n');
    return;
  }

  try {
    const result = await phonepeService.initiatePayment({
      userId: 'test_user_123',
      amount: 19900, // ₹199 in paise
      planId: 'BASIC',
      paymentMode: 'PAY_PAGE',
      mobileNumber: '9999999999',
      type: 'SUBSCRIPTION'
    });

    console.log('✅ Payment initiated successfully');
    console.log('Order ID:', result.orderId);
    console.log('PhonePe Order ID:', result.phonepeOrderId);
    console.log('Checkout URL:', result.checkoutUrl);
    console.log('\nTo test payment, open the checkout URL in a browser');
    console.log('Use test UPI ID: success@ybl for successful payment');
    console.log('Use test UPI ID: failure@ybl for failed payment');
  } catch (error) {
    console.log('❌ Failed to initiate payment:', error.message);
  }
  console.log('\n');
}

// Test 4: Bank Transfer
async function testBankTransfer() {
  console.log('Test 4: Bank Transfer Details');
  console.log('-----------------------------');
  
  try {
    const result = await phonepeService.getBankTransferDetails({
      userId: 'test_user_123',
      amount: 19900,
      planId: 'BASIC'
    });

    console.log('✅ Bank transfer details generated');
    console.log('Reference ID:', result.referenceId);
    console.log('Amount:', result.amount);
    console.log('Bank Name:', result.bankDetails.bankName);
    console.log('Account Number:', result.bankDetails.accountNumber);
    console.log('IFSC Code:', result.bankDetails.ifscCode);
  } catch (error) {
    console.log('❌ Failed to generate bank transfer details:', error.message);
  }
  console.log('\n');
}

// Run all tests
async function runTests() {
  await testOAuthToken();
  await testPaymentInitiation();
  await testBankTransfer();

  console.log('========================================');
  console.log('Test Complete');
  console.log('========================================');
  console.log('\nNext Steps:');
  console.log('1. Add PhonePe credentials to .env file');
  console.log('2. Start backend: npm run dev');
  console.log('3. Start frontend: npm start');
  console.log('4. Navigate to /subscription to test payment');
  console.log('\nAPI Endpoints:');
  console.log('GET  /api/phonepe/config - Get configuration');
  console.log('GET  /api/phonepe/plans - Get subscription plans');
  console.log('GET  /api/phonepe/payment-modes - Get payment modes');
  console.log('POST /api/phonepe/initiate - Initiate payment');
  console.log('GET  /api/phonepe/status/:orderId - Check payment status');
  console.log('POST /api/phonepe/callback - PhonePe callback webhook');
  console.log('POST /api/phonepe/bank-transfer - Bank transfer payment');
}

runTests().catch(console.error);
