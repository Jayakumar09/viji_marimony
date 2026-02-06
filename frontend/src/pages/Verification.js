import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import verificationService from '../services/verificationService';
import LoadingSpinner from '../components/LoadingSpinner';

const Verification = () => {
  const { user, updateUser } = useAuth();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState({ email: false, phone: false });
  const [verifying, setVerifying] = useState({ email: false, phone: false });
  const [otp, setOtp] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('email');
  const [resendTimer, setResendTimer] = useState(0);
  const [isFullyVerified, setIsFullyVerified] = useState(false);
  const [fallbackEmail, setFallbackEmail] = useState('');
  const [showFallback, setShowFallback] = useState(false);
  const [lastOtpMethod, setLastOtpMethod] = useState(null);

  useEffect(() => {
    fetchStatus();
  }, []);

  useEffect(() => {
    let timer;
    if (resendTimer > 0) {
      timer = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [resendTimer]);

  const fetchStatus = async () => {
    try {
      const data = await verificationService.getVerificationStatus();
      setStatus(data);
      setIsFullyVerified(data.emailVerified && data.phoneVerified);
      setFallbackEmail(data.email || '');
    } catch (err) {
      setError(err.error || 'Failed to fetch verification status');
    } finally {
      setLoading(false);
    }
  };

  const handleSendOTP = async (type) => {
    const value = type === 'email' ? user?.email : user?.phone;
    if (!value && !fallbackEmail) {
      setError(`${type === 'email' ? 'Email' : 'Phone'} not available`);
      return;
    }

    setSending((prev) => ({ ...prev, [type]: true }));
    setError('');
    setMessage('');

    try {
      let data;
      if (type === 'email') {
        data = await verificationService.sendEmailOTP(value);
      } else {
        // For phone, check if we should use fallback
        const phoneValue = user?.phone || '';
        data = await verificationService.sendPhoneOTP(phoneValue, fallbackEmail);
      }
      
      setMessage(`OTP sent to your ${data.sentVia === 'email' ? 'email' : type}${data.sentVia === 'email' ? ' (SMS unavailable)' : ''}`);
      setLastOtpMethod(data.sentVia || type);
      setResendTimer(60);
      setShowFallback(false);
    } catch (err) {
      setError(err.error || `Failed to send ${type} OTP`);
    } finally {
      setSending((prev) => ({ ...prev, [type]: false }));
    }
  };

  const handleVerify = async (type) => {
    const value = type === 'email' ? user?.email : user?.phone;
    if (!otp) {
      setError('Please enter OTP');
      return;
    }

    setVerifying((prev) => ({ ...prev, [type]: true }));
    setError('');
    setMessage('');

    try {
      let data;
      if (type === 'email') {
        data = await verificationService.verifyEmailOTP(value, otp);
      } else {
        const phoneValue = user?.phone || '';
        data = await verificationService.verifyPhoneOTP(phoneValue, otp, fallbackEmail);
      }
      
      if (data.isVerified) {
        setIsFullyVerified(true);
        setMessage('🎉 Congratulations! Your profile is now fully verified!');
      } else {
        setMessage(`${type.charAt(0).toUpperCase() + type.slice(1)} verified successfully! Complete both to get verified badge.`);
      }
      setOtp('');
      fetchStatus();
      updateUser();
    } catch (err) {
      setError(err.error || `Failed to verify ${type}`);
    } finally {
      setVerifying((prev) => ({ ...prev, [type]: false }));
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 py-12 px-4">
      <div className="max-w-md mx-auto bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 py-6 px-6">
          <h1 className="text-2xl font-bold text-white">Identity Verification</h1>
          <p className="text-purple-100 mt-1">Verify your email and phone number</p>
        </div>

        <div className="p-6">
          {isFullyVerified && (
            <div className="mb-6 p-4 bg-green-100 rounded-lg text-center">
              <span className="text-3xl">✅</span>
              <p className="text-green-700 font-semibold mt-2">Your Profile is Fully Verified!</p>
              <p className="text-green-600 text-sm">You now have the verified badge on your profile.</p>
            </div>
          )}

          {message && !isFullyVerified && (
            <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-lg">
              {message}
            </div>
          )}
          
          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg">
              {error}
            </div>
          )}

          {/* Verification Status Summary */}
          <div className="mb-6 grid grid-cols-2 gap-4">
            <div className={`p-4 rounded-lg ${status?.emailVerified ? 'bg-green-100' : 'bg-gray-100'}`}>
              <div className="flex items-center">
                <span className={`text-2xl mr-2 ${status?.emailVerified ? '✅' : '📧'}`}></span>
                <div>
                  <p className="text-sm text-gray-600">Email</p>
                  <p className="font-semibold">{status?.emailVerified ? 'Verified' : 'Pending'}</p>
                </div>
              </div>
            </div>
            <div className={`p-4 rounded-lg ${status?.phoneVerified ? 'bg-green-100' : 'bg-gray-100'}`}>
              <div className="flex items-center">
                <span className={`text-2xl mr-2 ${status?.phoneVerified ? '✅' : '📱'}`}></span>
                <div>
                  <p className="text-sm text-gray-600">Phone</p>
                  <p className="font-semibold">{status?.phoneVerified ? 'Verified' : 'Pending'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Tab Selection */}
          <div className="flex mb-6 border-b">
            <button
              onClick={() => setActiveTab('email')}
              className={`flex-1 py-3 font-medium ${
                activeTab === 'email'
                  ? 'text-purple-600 border-b-2 border-purple-600'
                  : 'text-gray-500'
              }`}
            >
              Email Verification
            </button>
            <button
              onClick={() => setActiveTab('phone')}
              className={`flex-1 py-3 font-medium ${
                activeTab === 'phone'
                  ? 'text-purple-600 border-b-2 border-purple-600'
                  : 'text-gray-500'
              }`}
            >
              Phone Verification
            </button>
          </div>

          {/* Email Verification Tab */}
          {activeTab === 'email' && (
            <div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className="w-full px-4 py-2 border rounded-lg bg-gray-50 text-gray-500"
                />
              </div>

              {status?.emailVerified ? (
                <div className="p-4 bg-green-100 rounded-lg text-center">
                  <span className="text-2xl">✅</span>
                  <p className="text-green-700 font-medium">Your email is verified</p>
                </div>
              ) : (
                <>
                  <button
                    onClick={() => handleSendOTP('email')}
                    disabled={sending.email || resendTimer > 0}
                    className="w-full py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {sending.email ? 'Sending...' : resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Send OTP'}
                  </button>

                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Enter OTP
                    </label>
                    <input
                      type="text"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="Enter 6-digit OTP"
                      maxLength={6}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>

                  <button
                    onClick={() => handleVerify('email')}
                    disabled={verifying.email || otp.length !== 6}
                    className="w-full mt-4 py-3 bg-pink-600 text-white rounded-lg font-medium hover:bg-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {verifying.email ? 'Verifying...' : 'Verify OTP'}
                  </button>
                </>
              )}
            </div>
          )}

          {/* Phone Verification Tab */}
          {activeTab === 'phone' && (
            <div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={user?.phone || 'Not provided'}
                  disabled
                  className="w-full px-4 py-2 border rounded-lg bg-gray-50 text-gray-500"
                />
              </div>

              {status?.phoneVerified ? (
                <div className="p-4 bg-green-100 rounded-lg text-center">
                  <span className="text-2xl">✅</span>
                  <p className="text-green-700 font-medium">Your phone is verified</p>
                </div>
              ) : (
                <>
                  {!user?.phone ? (
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Enter Email for OTP (since phone not available)
                      </label>
                      <input
                        type="email"
                        value={fallbackEmail}
                        onChange={(e) => setFallbackEmail(e.target.value)}
                        placeholder="Enter your email"
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        OTP will be sent to this email if SMS delivery fails
                      </p>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowFallback(!showFallback)}
                      className="mb-3 text-sm text-purple-600 hover:text-purple-700 underline"
                    >
                      {showFallback ? 'Hide fallback option' : 'SMS not working? Use email instead'}
                    </button>
                  )}
                  
                  {showFallback && user?.phone && (
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Enter Email for fallback OTP
                      </label>
                      <input
                        type="email"
                        value={fallbackEmail}
                        onChange={(e) => setFallbackEmail(e.target.value)}
                        placeholder="Enter your email"
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                  )}

                  <button
                    onClick={() => handleSendOTP('phone')}
                    disabled={sending.phone || resendTimer > 0 || (!user?.phone && !fallbackEmail)}
                    className="w-full py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {sending.phone ? 'Sending...' : resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Send OTP'}
                  </button>

                  {lastOtpMethod === 'email' && (
                    <p className="text-xs text-orange-600 mt-2 text-center">
                      OTP sent to email because SMS delivery failed
                    </p>
                  )}

                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Enter OTP
                    </label>
                    <input
                      type="text"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="Enter 6-digit OTP"
                      maxLength={6}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>

                  <button
                    onClick={() => handleVerify('phone')}
                    disabled={verifying.phone || otp.length !== 6}
                    className="w-full mt-4 py-3 bg-pink-600 text-white rounded-lg font-medium hover:bg-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {verifying.phone ? 'Verifying...' : 'Verify OTP'}
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Verification;
