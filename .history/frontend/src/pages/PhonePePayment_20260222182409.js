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
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">
            Choose Your Plan
          </h1>
          <p className="text-gray-600 text-sm">
            Select a plan and payment method
          </p>
        </div>

        {/* Plans Section */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">
            Select Plan
          </h2>
          <div className="grid grid-cols-3 gap-3">
            {PHONEPE_PLANS.map((plan) => (
              <div
                key={plan.id}
                onClick={() => handlePlanSelect(plan.id)}
                className={`relative p-3 rounded-lg border-2 cursor-pointer transition-all ${
                  selectedPlan === plan.id
                    ? 'border-purple-500 bg-purple-50 shadow-md'
                    : 'border-gray-200 bg-white hover:border-purple-300'
                }`}
              >
                {plan.id === 'PRO' && (
                  <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                    <span className="bg-purple-500 text-white text-[10px] px-2 py-0.5 rounded-full">
                      POPULAR
                    </span>
                  </div>
                )}
                <h3 className="text-sm font-semibold text-gray-900 mb-1">
                  {plan.name}
                </h3>
                <div className="mb-2">
                  <span className="text-xl font-bold text-gray-900">
                    ₹{plan.price}
                  </span>
                  <span className="text-gray-500 text-xs ml-1">
                    /{plan.validity}d
                  </span>
                </div>
                <ul className="space-y-1">
                  {plan.features.slice(0, 3).map((feature, index) => (
                    <li key={index} className="flex items-start text-xs text-gray-600">
                      <svg className="w-3 h-3 text-green-500 mr-1 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
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
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">
            Payment Method
          </h2>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
            {PAYMENT_MODES.map((mode) => (
              <div
                key={mode.id}
                onClick={() => handlePaymentModeSelect(mode.id)}
                className={`p-2 rounded-lg border-2 cursor-pointer transition-all text-center ${
                  selectedPaymentMode === mode.id
                    ? 'border-purple-500 bg-purple-50 shadow-md'
                    : 'border-gray-200 bg-white hover:border-purple-300'
                }`}
              >
                <div className="text-xl mb-1">{mode.icon}</div>
                <div className="text-xs font-medium text-gray-900">
                  {mode.name}
                </div>
                {mode.type === 'OFFLINE' && (
                  <div className="text-[10px] text-orange-500 mt-0.5">
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
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm mb-4">
          <div className="flex justify-between items-center">
            <div>
              <span className="text-sm text-gray-600">{getSelectedPlanDetails()?.name} Plan</span>
              <span className="text-xs text-gray-400 ml-2">({getSelectedPlanDetails()?.validity} days)</span>
            </div>
            <span className="text-xl font-bold text-purple-600">₹{getSelectedPlanDetails()?.price}</span>
          </div>
        </div>

        {/* Pay Button */}
        <button
          onClick={handlePayment}
          disabled={loading}
          className={`w-full py-3 px-6 rounded-lg font-semibold text-white transition-all ${
            loading
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-purple-600 hover:bg-purple-700 shadow-md hover:shadow-lg'
          }`}
        >
          {loading ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Processing...
            </span>
          ) : (
            `Pay ₹${getSelectedPlanDetails()?.price}`
          )}
        </button>

        {/* Security Note */}
        <div className="mt-4 text-center text-xs text-gray-500">
          <p className="flex items-center justify-center">
            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
            </svg>
            Secure payment by PhonePe
          </p>
        </div>
      </div>
    </div>
  );
};

export default PhonePePayment;
