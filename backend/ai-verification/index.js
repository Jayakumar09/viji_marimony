/**
 * AI Verification Module
 * Main entry point for all AI verification services
 * 
 * This module provides comprehensive document verification including:
 * - Document format validation
 * - Face matching between ID and selfie
 * - Tamper detection
 * - AI-powered recommendations
 */

const documentValidationService = require('./documentValidationService');
const faceMatchService = require('./faceMatchService');
const tamperDetectionService = require('./tamperDetectionService');
const aiRecommendationService = require('./aiRecommendationService');

/**
 * Process complete ID verification
 * @param {Object} params - Verification parameters
 * @param {Object} params.file - Uploaded ID file
 * @param {string} params.idNumber - ID number
 * @param {string} params.idType - ID type (AADHAAR, PAN, etc.)
 * @param {string} params.selfiePath - Path to selfie image
 * @param {string} params.idImagePath - Path to ID image
 * @returns {Object} - Complete verification result
 */
const processVerification = async (params) => {
  const startTime = Date.now();
  
  console.log('Starting AI verification process...');
  
  try {
    // Generate AI recommendation (includes all sub-analyses)
    const recommendation = await aiRecommendationService.generateRecommendation(params);
    
    const processingTime = Date.now() - startTime;
    
    return {
      success: true,
      ...recommendation,
      processingTime,
      version: '1.0.0'
    };
  } catch (error) {
    console.error('AI verification error:', error);
    
    return {
      success: false,
      recommendation: 'REVIEW',
      confidence: 0,
      flags: ['Processing error occurred'],
      error: error.message,
      processingTime: Date.now() - startTime
    };
  }
};

/**
 * Quick validation check (lightweight, fast)
 * @param {Object} params - Validation parameters
 * @returns {Object} - Quick check result
 */
const quickValidation = async (params) => {
  return aiRecommendationService.quickVerify(params);
};

/**
 * Validate ID number format only
 * @param {string} idNumber - ID number
 * @param {string} idType - ID type
 * @returns {Object} - Validation result
 */
const validateIdFormat = (idNumber, idType) => {
  return documentValidationService.validateIdNumber(idNumber, idType);
};

/**
 * Check document for tampering
 * @param {string} filePath - Path to document
 * @returns {Object} - Tamper analysis result
 */
const checkTampering = async (filePath) => {
  return tamperDetectionService.analyzeDocument(filePath);
};

/**
 * Compare faces between ID and selfie
 * @param {string} idImagePath - Path to ID image
 * @param {string} selfiePath - Path to selfie
 * @returns {Object} - Face match result
 */
const compareFaces = async (idImagePath, selfiePath) => {
  return faceMatchService.compareFaces(idImagePath, selfiePath);
};

/**
 * Get supported ID types
 * @returns {Array} - List of supported ID types
 */
const getSupportedIdTypes = () => {
  return documentValidationService.getSupportedIdTypes();
};

/**
 * Get module status
 * @returns {Object} - Module status information
 */
const getStatus = () => {
  return {
    status: 'operational',
    version: '1.0.0',
    services: {
      documentValidation: 'active',
      faceMatch: 'active',
      tamperDetection: 'active',
      aiRecommendation: 'active'
    },
    supportedIdTypes: getSupportedIdTypes().map(t => t.type)
  };
};

module.exports = {
  // Main functions
  processVerification,
  quickValidation,
  
  // Individual services
  documentValidation: documentValidationService,
  faceMatch: faceMatchService,
  tamperDetection: tamperDetectionService,
  aiRecommendation: aiRecommendationService,
  
  // Utility functions
  validateIdFormat,
  checkTampering,
  compareFaces,
  getSupportedIdTypes,
  getStatus,
  
  // Constants
  RECOMMENDATION_TYPES: aiRecommendationService.RECOMMENDATION_TYPES,
  ID_TYPE_VALIDATIONS: documentValidationService.ID_TYPE_VALIDATIONS
};
