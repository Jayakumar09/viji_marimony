/**
 * PhonePe JS SDK Integration
 * 
 * This module handles PhonePe checkout using their JS SDK
 * instead of redirect-based flow.
 * 
 * @version 1.0.0
 */

// PhonePe SDK configuration
const PHONEPE_SDK_URL = 'https://mercury.phonepe.com/web/bundle.js';

let sdkLoaded = false;
let sdkLoadPromise = null;

/**
 * Load PhonePe SDK script
 * @returns {Promise<void>}
 */
const loadPhonePeSDK = () => {
  if (sdkLoaded) {
    return Promise.resolve();
  }

  if (sdkLoadPromise) {
    return sdkLoadPromise;
  }

  sdkLoadPromise = new Promise((resolve, reject) => {
    // Check if already loaded
    if (window.PhonePe) {
      sdkLoaded = true;
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = PHONEPE_SDK_URL;
    script.async = true;
    script.onload = () => {
      sdkLoaded = true;
      console.log('PhonePe SDK loaded successfully');
      resolve();
    };
    script.onerror = (error) => {
      console.error('Failed to load PhonePe SDK:', error);
      reject(new Error('Failed to load PhonePe SDK'));
    };
    document.head.appendChild(script);
  });

  return sdkLoadPromise;
};

/**
 * Initiate PhonePe payment using JS SDK
 * @param {Object} params - Payment parameters
 * @param {string} params.merchantId - PhonePe merchant ID
 * @param {string} params.orderId - Order ID from PhonePe
 * @param {string} params.amount - Amount in paise
 * @param {string} params.redirectUrl - Redirect URL after payment
 * @param {string} params.callbackUrl - Callback URL for server notification
 * @returns {Promise<Object>} Payment result
 */
const initiatePayment = async (params) => {
  try {
    await loadPhonePeSDK();

    if (!window.PhonePe) {
      throw new Error('PhonePe SDK not available');
    }

    const { merchantId, orderId, amount, redirectUrl, callbackUrl } = params;

    // Create payment request
    const paymentRequest = {
      merchantId,
      merchantTransactionId: orderId,
      merchantUserId: `USER_${Date.now()}`,
      amount: parseInt(amount),
      redirectUrl,
      callbackUrl,
      paymentInstrument: {
        type: 'PAY_PAGE'
      }
    };

    console.log('PhonePe SDK payment request:', paymentRequest);

    // Use PhonePe SDK to open checkout
    const result = await window.PhonePe.transact(paymentRequest);
    
    console.log('PhonePe SDK result:', result);
    return result;
  } catch (error) {
    console.error('PhonePe SDK error:', error);
    throw error;
  }
};

/**
 * Open PhonePe checkout page in a popup
 * @param {string} checkoutUrl - Checkout URL from backend
 * @param {Object} options - Popup options
 * @returns {Promise<Object>} Payment result
 */
const openCheckoutPopup = (checkoutUrl, options = {}) => {
  return new Promise((resolve, reject) => {
    const width = options.width || 500;
    const height = options.height || 600;
    const left = (window.innerWidth - width) / 2;
    const top = (window.innerHeight - height) / 2;

    const popup = window.open(
      checkoutUrl,
      'PhonePeCheckout',
      `width=${width},height=${height},left=${left},top=${top},resizable,scrollbars`
    );

    if (!popup) {
      reject(new Error('Popup blocked. Please allow popups for this site.'));
      return;
    }

    // Listen for messages from popup
    const messageHandler = (event) => {
      // Verify origin
      if (!event.origin.includes('phonepe.com') && !event.origin.includes('localhost')) {
        return;
      }

      if (event.data && event.data.type === 'PHONEPE_PAYMENT_COMPLETE') {
        window.removeEventListener('message', messageHandler);
        popup.close();
        resolve(event.data);
      }
    };

    window.addEventListener('message', messageHandler);

    // Check if popup was closed
    const checkClosed = setInterval(() => {
      if (popup.closed) {
        clearInterval(checkClosed);
        window.removeEventListener('message', messageHandler);
        resolve({ status: 'CLOSED' });
      }
    }, 500);
  });
};

/**
 * Handle PhonePe payment response
 * @param {Object} response - Response from PhonePe
 * @returns {Object} Normalized payment result
 */
const handlePaymentResponse = (response) => {
  const statusMap = {
    'SUCCESS': 'SUCCESS',
    'FAILED': 'FAILED',
    'CANCELLED': 'CANCELLED',
    'PENDING': 'PENDING',
    'CLOSED': 'CANCELLED'
  };

  return {
    success: response.status === 'SUCCESS',
    status: statusMap[response.status] || 'PENDING',
    transactionId: response.transactionId || response.providerReferenceId,
    orderId: response.merchantTransactionId,
    amount: response.amount,
    message: response.message || ''
  };
};

export default {
  loadPhonePeSDK,
  initiatePayment,
  openCheckoutPopup,
  handlePaymentResponse
};
