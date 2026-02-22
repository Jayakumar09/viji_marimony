/**
 * PhonePe Payment Page
 * 
 * Subscription payment page with PhonePe integration
 * Supports multiple payment modes including bank transfer
 * 
 * @version 1.0.0
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import phonepeService, { PHONEPE_PLANS, PAYMENT_MODES } from '../services/phonepeService';
import { useAuth } from '../hooks/useAuth';

const PhonePePayment = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  const [selectedPlan, setSelectedPlan] = useState('PRO');
  const [selectedPaymentMode, setSelectedPaymentMode] = useState('PAY_PAGE');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [bankTransferDetails, setBankTransferDetails] = useState(null);
  const [paymentConfig, setPaymentConfig] = useState(null);

  // Check for redirect from PhonePe or plan selection from Profile
  useEffect(() => {
    const orderId = searchParams.get('orderId');
    const status = searchParams.get('status');
    const transactionId = searchParams.get('transactionId');
    const planFromUrl = searchParams.get('plan');

    // If plan is specified in URL, select it
    if (planFromUrl && ['BASIC', 'PRO', 'PREMIUM'].includes(planFromUrl)) {
      setSelectedPlan(planFromUrl);
    }

    if (orderId && status) {
      // Handle redirect from PhonePe
      handlePaymentRedirect(orderId, status, transactionId);
    }
  }, [searchParams]);

  // Load PhonePe config
  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const config = await phonepeService.getConfig();
      setPaymentConfig(config.config);
    } catch (err) {
      console.error('Failed to load PhonePe config:', err);
    }
  };

  const handlePaymentRedirect = async (orderId, status, transactionId) => {
    setLoading(true);
    try {
      // Check actual payment status from backend
      const result = await phonepeService.checkPaymentStatus(orderId);
      
      if (result.status === 'SUCCESS') {
        navigate('/dashboard', {
          state: {
            message: 'Payment successful! Your subscription is now active.',
            type: 'success'
          }
        });
      } else {
        setError(`Payment status: ${result.status}. Please try again or contact support.`);
      }
    } catch (err) {
      console.error('Failed to verify payment:', err);
      setError('Failed to verify payment status. Please contact support.');
    } finally {
      setLoading(false);
    }
  };

  const handlePlanSelect = (planId) => {
    setSelectedPlan(planId);
    setBankTransferDetails(null);
    setError(null);
  };

  const handlePaymentModeSelect = (modeId) => {
    setSelectedPaymentMode(modeId);
    setBankTransferDetails(null);
    setError(null);
  };

  const handlePayment = async () => {
    setLoading(true);
    setError(null);
    setBankTransferDetails(null);

    try {
      const result = await phonepeService.initiatePayment({
        plan: selectedPlan,
        paymentMode: selectedPaymentMode,
        type: 'SUBSCRIPTION'
      });

      if (result.success) {
        if (selectedPaymentMode === 'BANK_TRANSFER') {
          // Show bank transfer details
          setBankTransferDetails(result);
        } else {
          // Redirect to PhonePe checkout
          phonepeService.redirectToCheckout(result.checkoutUrl);
        }
      } else {
        setError(result.error || 'Failed to initiate payment');
      }
    } catch (err) {
      console.error('Payment initiation error:', err);
      setError(err.response?.data?.error || err.message || 'Failed to initiate payment');
    } finally {
      setLoading(false);
    }
  };

  const getSelectedPlanDetails = () => {
    return PHONEPE_PLANS.find(p => p.id === selectedPlan);
  };

  const getSelectedPaymentModeDetails = () => {
    return PAYMENT_MODES.find(m => m.id === selectedPaymentMode);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Choose Your Subscription Plan
          </h1>
          <p className="text-gray-600">
            Select a plan and payment method to unlock premium features
          </p>
        </div>

        {/* Plans Section */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Select Plan
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {PHONEPE_PLANS.map((plan) => (
              <div
                key={plan.id}
                onClick={() => handlePlanSelect(plan.id)}
                className={`relative p-6 rounded-xl border-2 cursor-pointer transition-all ${
                  selectedPlan === plan.id
                    ? 'border-purple-500 bg-purple-50 shadow-lg'
                    : 'border-gray-200 bg-white hover:border-purple-300'
                }`}
              >
                {plan.id === 'PRO' && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <span className="bg-purple-500 text-white text-xs px-3 py-1 rounded-full">
                      POPULAR
                    </span>
                  </div>
                )}
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {plan.name}
                </h3>
                <div className="mb-4">
                  <span className="text-3xl font-bold text-gray-900">
                    ₹{plan.price}
                  </span>
                  <span className="text-gray-500 text-sm ml-1">
                    /{plan.validity} days
                  </span>
                </div>
                <ul className="space-y-2">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start text-sm text-gray-600">
                      <svg className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Payment Modes Section */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Select Payment Method
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {PAYMENT_MODES.map((mode) => (
              <div
                key={mode.id}
                onClick={() => handlePaymentModeSelect(mode.id)}
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all text-center ${
                  selectedPaymentMode === mode.id
                    ? 'border-purple-500 bg-purple-50 shadow-lg'
                    : 'border-gray-200 bg-white hover:border-purple-300'
                }`}
              >
                <div className="text-2xl mb-2">{mode.icon}</div>
                <div className="text-sm font-medium text-gray-900">
                  {mode.name}
                </div>
                {mode.type === 'OFFLINE' && (
                  <div className="text-xs text-orange-500 mt-1">
                    Offline
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-red-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span className="text-red-700">{error}</span>
            </div>
          </div>
        )}

        {/* Bank Transfer Details */}
        {bankTransferDetails && (
          <div className="mb-6 p-6 bg-blue-50 border border-blue-200 rounded-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Bank Transfer Details
            </h3>
            <div className="bg-white p-4 rounded-lg mb-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Account Holder</p>
                  <p className="font-medium">{bankTransferDetails.bankDetails.accountHolderName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Bank Name</p>
                  <p className="font-medium">{bankTransferDetails.bankDetails.bankName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Account Number</p>
                  <p className="font-medium">{bankTransferDetails.bankDetails.accountNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">IFSC Code</p>
                  <p className="font-medium">{bankTransferDetails.bankDetails.ifscCode}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Amount to Transfer</p>
                  <p className="font-medium text-lg text-green-600">₹{bankTransferDetails.amount}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Reference ID</p>
                  <p className="font-medium text-purple-600">{bankTransferDetails.referenceId}</p>
                </div>
              </div>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg">
              <h4 className="font-medium text-yellow-800 mb-2">Instructions:</h4>
              <ul className="list-disc list-inside text-sm text-yellow-700 space-y-1">
                {bankTransferDetails.instructions.map((instruction, index) => (
                  <li key={index}>{instruction}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Payment Summary */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Payment Summary
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Plan</span>
              <span className="font-medium">{getSelectedPlanDetails()?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Payment Method</span>
              <span className="font-medium">{getSelectedPaymentModeDetails()?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Validity</span>
              <span className="font-medium">{getSelectedPlanDetails()?.validity} days</span>
            </div>
            <hr className="my-3" />
            <div className="flex justify-between text-lg">
              <span className="font-semibold">Total Amount</span>
              <span className="font-bold text-purple-600">₹{getSelectedPlanDetails()?.price}</span>
            </div>
          </div>
        </div>

        {/* Pay Button */}
        <button
          onClick={handlePayment}
          disabled={loading}
          className={`w-full py-4 px-6 rounded-xl font-semibold text-white transition-all ${
            loading
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-purple-600 hover:bg-purple-700 shadow-lg hover:shadow-xl'
          }`}
        >
          {loading ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Processing...
            </span>
          ) : (
            `Pay ₹${getSelectedPlanDetails()?.price} with ${getSelectedPaymentModeDetails()?.name}`
          )}
        </button>

        {/* Security Note */}
        <div className="mt-6 text-center text-sm text-gray-500">
          <p className="flex items-center justify-center">
            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
            </svg>
            Secure payment powered by PhonePe
          </p>
        </div>
      </div>
    </div>
  );
};

export default PhonePePayment;
