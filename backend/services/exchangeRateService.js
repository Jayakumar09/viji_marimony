/**
 * Exchange Rate Service
 * 
 * Handles currency conversion for international payments:
 * - Fetches real-time exchange rates
 * - Caches rates to minimize API calls
 * - Calculates commission for currency conversion
 * 
 * @version 1.0.0
 */

const axios = require('axios');
const paymentConfig = require('../config/payments');

// Cache for exchange rates
let exchangeRateCache = {
  data: null,
  timestamp: null,
  baseCurrency: 'USD'
};

/**
 * Fetch exchange rates from API
 * @returns {Promise<Object>} Exchange rates data
 */
const fetchExchangeRates = async () => {
  const { exchangeRateApi } = paymentConfig.international;
  
  try {
    const response = await axios.get(`${exchangeRateApi.url}/USD`, {
      timeout: 10000 // 10 second timeout
    });

    if (response.data && response.data.rates) {
      // Update cache
      exchangeRateCache = {
        data: response.data.rates,
        timestamp: Date.now(),
        baseCurrency: 'USD'
      };

      return {
        success: true,
        rates: response.data.rates,
        base: 'USD',
        timestamp: response.data.date
      };
    }

    throw new Error('Invalid response from exchange rate API');
  } catch (error) {
    console.error('Exchange rate fetch error:', error.message);
    
    // Return cached data if available
    if (exchangeRateCache.data) {
      console.log('Using cached exchange rates');
      return {
        success: true,
        rates: exchangeRateCache.data,
        base: exchangeRateCache.baseCurrency,
        timestamp: new Date(exchangeRateCache.timestamp).toISOString(),
        cached: true
      };
    }

    // Fallback to approximate rate if API fails
    return {
      success: false,
      error: error.message,
      fallbackRate: 83.0 // Approximate USD to INR rate as fallback
    };
  }
};

/**
 * Get USD to INR exchange rate
 * @returns {Promise<Object>} Exchange rate info
 */
const getUsdToInrRate = async () => {
  // Check cache first
  const { exchangeRateApi } = paymentConfig.international;
  const now = Date.now();
  
  if (exchangeRateCache.data && 
      exchangeRateCache.timestamp && 
      (now - exchangeRateCache.timestamp) < exchangeRateApi.cacheDuration) {
    return {
      success: true,
      rate: exchangeRateCache.data.INR,
      base: 'USD',
      cached: true,
      timestamp: new Date(exchangeRateCache.timestamp).toISOString()
    };
  }

  // Fetch fresh rates
  const result = await fetchExchangeRates();
  
  if (result.success && result.rates && result.rates.INR) {
    return {
      success: true,
      rate: result.rates.INR,
      base: 'USD',
      cached: result.cached || false,
      timestamp: result.timestamp
    };
  }

  // Return fallback rate
  return {
    success: false,
    rate: 83.0, // Fallback rate
    base: 'USD',
    fallback: true,
    error: result.error || 'Exchange rate unavailable'
  };
};

/**
 * Convert foreign currency to INR
 * @param {number} amount - Amount in foreign currency
 * @param {string} fromCurrency - Source currency code (USD, EUR, GBP, etc.)
 * @returns {Promise<Object>} Conversion result
 */
const convertToINR = async (amount, fromCurrency = 'USD') => {
  // Validate currency
  const supportedCurrencies = paymentConfig.international.supportedCurrencies;
  if (!supportedCurrencies.includes(fromCurrency)) {
    return {
      success: false,
      error: `Currency ${fromCurrency} is not supported. Supported currencies: ${supportedCurrencies.join(', ')}`
    };
  }

  // For INR, no conversion needed
  if (fromCurrency === 'INR') {
    return {
      success: true,
      originalAmount: amount,
      originalCurrency: 'INR',
      convertedAmount: amount,
      exchangeRate: 1,
      commissionAmount: 0,
      totalAmount: amount
    };
  }

  // Get exchange rate
  let exchangeRate;
  
  if (fromCurrency === 'USD') {
    const rateResult = await getUsdToInrRate();
    exchangeRate = rateResult.rate;
  } else {
    // For other currencies, get USD rate first, then convert
    const ratesResult = await fetchExchangeRates();
    
    if (!ratesResult.success || !ratesResult.rates) {
      return {
        success: false,
        error: ratesResult.error || 'Failed to fetch exchange rates'
      };
    }

    // Convert: Currency -> USD -> INR
    const usdRate = ratesResult.rates[fromCurrency];
    const inrRate = ratesResult.rates.INR;
    
    if (!usdRate || !inrRate) {
      return {
        success: false,
        error: `Exchange rate not available for ${fromCurrency}`
      };
    }

    // Convert to USD first, then to INR
    const amountInUSD = amount / usdRate;
    exchangeRate = inrRate / usdRate; // Effective rate for Currency -> INR
  }

  // Calculate base amount in INR
  const baseAmountInINR = amount * exchangeRate;

  // Calculate commission
  const commissionPercentage = paymentConfig.international.commissionPercentage;
  const commissionAmount = (baseAmountInINR * commissionPercentage) / 100;

  // Total amount in INR
  const totalAmountInINR = Math.round((baseAmountInINR + commissionAmount) * 100) / 100;

  return {
    success: true,
    originalAmount: amount,
    originalCurrency: fromCurrency,
    convertedAmount: Math.round(baseAmountInINR * 100) / 100,
    exchangeRate: Math.round(exchangeRate * 10000) / 10000, // 4 decimal precision
    commissionPercentage,
    commissionAmount: Math.round(commissionAmount * 100) / 100,
    totalAmount: totalAmountInINR
  };
};

/**
 * Calculate commission for international payment
 * @param {number} amountInINR - Amount in INR
 * @returns {Object} Commission details
 */
const calculateCommission = (amountInINR) => {
  const commissionPercentage = paymentConfig.international.commissionPercentage;
  const commissionAmount = (amountInINR * commissionPercentage) / 100;

  return {
    percentage: commissionPercentage,
    amount: Math.round(commissionAmount * 100) / 100
  };
};

/**
 * Get supported currencies
 * @returns {Array<string>} List of supported currency codes
 */
const getSupportedCurrencies = () => {
  return paymentConfig.international.supportedCurrencies;
};

/**
 * Check if international payments are enabled
 * @returns {boolean}
 */
const isInternationalPaymentsEnabled = () => {
  return paymentConfig.international.enabled;
};

/**
 * Get formatted currency string
 * @param {number} amount - Amount
 * @param {string} currency - Currency code
 * @returns {string} Formatted currency string
 */
const formatCurrency = (amount, currency = 'INR') => {
  const formatter = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  return formatter.format(amount);
};

/**
 * Get exchange rate summary for display
 * @returns {Promise<Object>} Exchange rate summary
 */
const getExchangeRateSummary = async () => {
  const ratesResult = await fetchExchangeRates();
  
  if (!ratesResult.success) {
    return {
      success: false,
      error: ratesResult.error
    };
  }

  const { rates } = ratesResult;
  const summary = {};

  // Get rates for supported currencies
  paymentConfig.international.supportedCurrencies.forEach(currency => {
    if (currency === 'INR') {
      summary[currency] = { rate: 1, label: 'Indian Rupee' };
    } else if (rates[currency]) {
      // Rate is for USD to Currency, we need Currency to INR
      summary[currency] = {
        rate: Math.round((rates.INR / rates[currency]) * 10000) / 10000,
        label: getCurrencyLabel(currency)
      };
    }
  });

  return {
    success: true,
    base: 'USD',
    rates: summary,
    timestamp: ratesResult.timestamp,
    commissionPercentage: paymentConfig.international.commissionPercentage
  };
};

/**
 * Get currency label
 * @param {string} currency - Currency code
 * @returns {string} Currency label
 */
const getCurrencyLabel = (currency) => {
  const labels = {
    USD: 'US Dollar',
    EUR: 'Euro',
    GBP: 'British Pound',
    AED: 'UAE Dirham',
    SGD: 'Singapore Dollar',
    INR: 'Indian Rupee'
  };

  return labels[currency] || currency;
};

module.exports = {
  fetchExchangeRates,
  getUsdToInrRate,
  convertToINR,
  calculateCommission,
  getSupportedCurrencies,
  isInternationalPaymentsEnabled,
  formatCurrency,
  getExchangeRateSummary
};
