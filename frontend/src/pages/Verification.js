import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import verificationService from '../services/verificationService';
import LoadingSpinner from '../components/LoadingSpinner';
import '../components/Verification.css';

const Verification = () => {
  const { user, updateUser } = useAuth();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [otp, setOtp] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('email');
  const [resendTimer, setResendTimer] = useState(0);
  const [fallbackEmail, setFallbackEmail] = useState('');
  const [showFallback, setShowFallback] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
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
      setFallbackEmail(data.email || '');
    } catch (err) {
      setError(err.error || 'Failed to fetch verification status');
    } finally {
      setLoading(false);
    }
  };

  const handleSendOTP = async () => {
    const value = activeTab === 'email' ? user?.email : user?.phone;
    if (!value && !fallbackEmail) {
      setError(`${activeTab === 'email' ? 'Email' : 'Phone'} not available`);
      return;
    }

    setSending(true);
    setError('');
    setMessage('');

    try {
      let data;
      if (activeTab === 'email') {
        data = await verificationService.sendEmailOTP(value);
      } else {
        const phoneValue = user?.phone || '';
        data = await verificationService.sendPhoneOTP(phoneValue, fallbackEmail);
      }
      
      setMessage(`OTP sent to your ${data.sentVia === 'email' ? 'email' : activeTab}${data.sentVia === 'email' ? ' (SMS unavailable)' : ''}`);
      setLastOtpMethod(data.sentVia || activeTab);
      setResendTimer(60);
      setShowFallback(false);
      setOtpSent(true);
    } catch (err) {
      setError(err.error || `Failed to send ${activeTab} OTP`);
    } finally {
      setSending(false);
    }
  };

  const handleVerify = async () => {
    const value = activeTab === 'email' ? user?.email : user?.phone;
    if (!otp) {
      setError('Please enter OTP');
      return;
    }

    setVerifying(true);
    setError('');
    setMessage('');

    try {
      let data;
      if (activeTab === 'email') {
        data = await verificationService.verifyEmailOTP(value, otp);
      } else {
        const phoneValue = user?.phone || '';
        data = await verificationService.verifyPhoneOTP(phoneValue, otp, fallbackEmail);
      }
      
      if (data.isVerified) {
        setMessage('🎉 Congratulations! Your profile is now fully verified!');
      } else {
        setMessage(`${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} verified successfully!`);
      }
      setOtp('');
      setOtpSent(false);
      fetchStatus();
      updateUser();
    } catch (err) {
      setError(err.error || `Failed to verify ${activeTab}`);
    } finally {
      setVerifying(false);
    }
  };

  const switchMethod = (type) => {
    setActiveTab(type);
    setOtp('');
    setOtpSent(false);
    setError('');
    setMessage('');
  };

  if (loading) return <LoadingSpinner />;

  const getStatusText = () => {
    if (activeTab === 'email') {
      return status?.emailVerified ? 'Email verified successfully' : 'Email verification pending';
    } else {
      return status?.phoneVerified ? 'Phone verified successfully' : 'Phone verification pending';
    }
  };

  const isVerified = activeTab === 'email' ? status?.emailVerified : status?.phoneVerified;

  return (
    <div className="verify-page-wrapper">
      {/* Page Wrapper */}
      <div className="verify-wrapper">
        {/* Card */}
        <div className="verify-card">
          <h2>Identity Verification</h2>
          <div className="subtitle">
            Verify your contact details to continue
          </div>

          {/* Status */}
          <div className={`status ${isVerified ? 'verified' : 'pending'}`}>
            {getStatusText()}
          </div>

          {/* Tabs */}
          <div className="verify-tabs">
            <button 
              className={activeTab === 'email' ? 'active' : ''} 
              onClick={() => switchMethod('email')}
            >
              Email
            </button>
            <button 
              className={activeTab === 'phone' ? 'active' : ''} 
              onClick={() => switchMethod('phone')}
            >
              Phone
            </button>
          </div>

          {/* Messages */}
          {message && (
            <div className="status verified">{message}</div>
          )}
          
          {error && (
            <div className="status" style={{ color: '#f44336' }}>{error}</div>
          )}

          {/* Contact Input Label */}
          <label>{activeTab === 'email' ? 'Email Address' : 'Mobile Number'}</label>
          <input
            type={activeTab === 'email' ? 'email' : 'tel'}
            value={activeTab === 'email' ? (user?.email || '') : (user?.phone || '')}
            disabled
            placeholder={activeTab === 'email' ? 'Enter your email address' : 'Enter your mobile number'}
          />

          {/* Fallback Email (for phone) */}
          {activeTab === 'phone' && !user?.phone && (
            <>
              <label>Email for OTP</label>
              <input
                type="email"
                value={fallbackEmail}
                onChange={(e) => setFallbackEmail(e.target.value)}
                placeholder="Enter your email for OTP"
              />
            </>
          )}

          {/* Show fallback option for phone if user has phone */}
          {activeTab === 'phone' && user?.phone && (
            <button
              className="fallback-btn"
              onClick={() => setShowFallback(!showFallback)}
            >
              {showFallback ? 'Hide fallback option' : 'SMS not working? Use email instead'}
            </button>
          )}

          {/* Fallback email input */}
          {showFallback && activeTab === 'phone' && user?.phone && (
            <>
              <label>Email for fallback OTP</label>
              <input
                type="email"
                value={fallbackEmail}
                onChange={(e) => setFallbackEmail(e.target.value)}
                placeholder="Enter your email"
              />
            </>
          )}

          {/* Send OTP Button */}
          <button 
            className="btn btn-primary" 
            onClick={handleSendOTP}
            disabled={sending || resendTimer > 0}
          >
            {sending ? 'Sending...' : resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Send OTP'}
          </button>

          {/* OTP Input */}
          <label style={{ marginTop: '14px', display: 'block' }}>Enter OTP</label>
          <input
            type="text"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="Enter 6-digit OTP"
            disabled={!otpSent}
          />

          {/* Verify Button */}
          <button 
            className="btn btn-primary" 
            onClick={handleVerify}
            disabled={verifying || otp.length !== 6}
          >
            {verifying ? 'Verifying...' : 'Verify'}
          </button>

          {/* Trust Message */}
          <div className="trust">
            🔒 Your details are safe and never shared with anyone
          </div>
        </div>
      </div>
    </div>
  );
};

export default Verification;
