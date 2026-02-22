/**
 * Payment Success Page
 * 
 * Displayed after successful PhonePe payment
 * Shows transaction details and subscription info
 * 
 * @version 1.0.0
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import phonepeService from '../services/phonepeService';

const PaymentSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [paymentDetails, setPaymentDetails] = useState(null);
  const [error, setError] = useState(null);

  const orderId = searchParams.get('orderId');
  const status = searchParams.get('status');
  const transactionId = searchParams.get('transactionId');

  useEffect(() => {
    if (orderId) {
      verifyPayment();
    } else {
      setLoading(false);
    }
  }, [orderId]);

  const verifyPayment = async () => {
    try {
      setLoading(true);
      const result = await phonepeService.checkPaymentStatus(orderId);
      setPaymentDetails(result);
    } catch (err) {
      console.error('Failed to verify payment:', err);
      setError('Failed to verify payment status. Please contact support.');
    } finally {
      setLoading(false);
    }
  };

  const getPaymentModeDisplay = (mode) => {
    const modeMap = {
      'PAY_PAGE': 'All Payment Methods',
      'UPI': 'UPI',
      'CARD': 'Card Payment',
      'WALLET': 'Wallet',
      'NET_BANKING': 'Net Banking',
      'BANK_TRANSFER': 'Direct Bank Transfer'
    };
    return modeMap[mode] || mode || 'Online';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verifying payment...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Verification Failed</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="space-y-3">
            <button
              onClick={() => navigate('/subscription')}
              className="w-full py-3 px-4 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors"
            >
              Try Again
            </button>
            <Link
              to="/dashboard"
              className="block w-full py-3 px-4 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
            >
              Go to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isSuccess = paymentDetails?.status === 'SUCCESS' || status === 'SUCCESS';

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg overflow-hidden">
        {/* Status Header */}
        <div className={`${isSuccess ? 'bg-green-500' : 'bg-yellow-500'} p-6 text-center`}>
          <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4">
            {isSuccess ? (
              <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-10 h-10 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          </div>
          <h1 className="text-2xl font-bold text-white">
            {isSuccess ? 'Payment Successful!' : 'Payment Processing'}
          </h1>
          <p className="text-white/80 mt-1">
            {isSuccess
              ? 'Your subscription is now active'
              : 'Your payment is being processed'}
          </p>
        </div>

        {/* Payment Details */}
        <div className="p-6">
          {paymentDetails ? (
            <div className="space-y-4">
              <div className="flex justify-between py-3 border-b border-gray-100">
                <span className="text-gray-500">Transaction ID</span>
                <span className="font-medium text-gray-900">
                  {paymentDetails.transactionId || transactionId || 'Processing...'}
                </span>
              </div>
              <div className="flex justify-between py-3 border-b border-gray-100">
                <span className="text-gray-500">Order ID</span>
                <span className="font-medium text-gray-900">{paymentDetails.orderId || orderId}</span>
              </div>
              <div className="flex justify-between py-3 border-b border-gray-100">
                <span className="text-gray-500">Amount</span>
                <span className="font-bold text-lg text-gray-900">₹{paymentDetails.amount}</span>
              </div>
              <div className="flex justify-between py-3 border-b border-gray-100">
                <span className="text-gray-500">Payment Mode</span>
                <span className="font-medium text-gray-900">
                  {getPaymentModeDisplay(paymentDetails.paymentMode)}
                </span>
              </div>
              <div className="flex justify-between py-3">
                <span className="text-gray-500">Status</span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  paymentDetails.status === 'SUCCESS'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-yellow-100 text-yellow-700'
                }`}>
                  {paymentDetails.status}
                </span>
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-gray-500">No payment details available</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="p-6 pt-0 space-y-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full py-3 px-4 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors"
          >
            Go to Dashboard
          </button>
          <Link
            to="/profile"
            className="block w-full py-3 px-4 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors text-center"
          >
            View Profile
          </Link>
        </div>

        {/* Support Info */}
        <div className="bg-gray-50 p-4 text-center">
          <p className="text-sm text-gray-500">
            Need help? Contact us at{' '}
            <a href="mailto:support@boyarmatrimony.com" className="text-purple-600 hover:underline">
              support@boyarmatrimony.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccess;
