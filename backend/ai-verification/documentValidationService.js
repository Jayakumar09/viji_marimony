/**
 * Document Validation Service
 * Validates uploaded documents for format, size, and type compliance
 */

const path = require('path');

// Allowed document types and their MIME types
const ALLOWED_DOCUMENT_TYPES = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
  'application/pdf': ['.pdf']
};

// Maximum file sizes (in bytes)
const MAX_FILE_SIZES = {
  idProof: 10 * 1024 * 1024, // 10MB
  selfie: 5 * 1024 * 1024,   // 5MB
  document: 10 * 1024 * 1024 // 10MB
};

// ID type specific validations
const ID_TYPE_VALIDATIONS = {
  AADHAAR: {
    minLength: 12,
    maxLength: 12,
    pattern: /^\d{12}$/,
    formatDescription: '12-digit number'
  },
  PAN: {
    minLength: 10,
    maxLength: 10,
    pattern: /^[A-Z]{5}\d{4}[A-Z]{1}$/,
    formatDescription: 'ABCDE1234F format'
  },
  VOTER_ID: {
    minLength: 10,
    maxLength: 10,
    pattern: /^[A-Z]{3}\d{7}$/,
    formatDescription: 'ABC1234567 format'
  },
  DRIVING_LICENSE: {
    minLength: 8,
    maxLength: 20,
    pattern: /^[A-Z]{2}\d{2}\s?\d{11}$/,
    formatDescription: 'State code followed by numbers'
  },
  PASSPORT: {
    minLength: 8,
    maxLength: 9,
    pattern: /^[A-Z]{1}\d{7}$/,
    formatDescription: 'Letter followed by 7 digits'
  }
};

/**
 * Validate file type and extension
 * @param {Object} file - Uploaded file object
 * @param {string} documentType - Type of document (idProof, selfie, document)
 * @returns {Object} - Validation result
 */
const validateFileType = (file, documentType = 'document') => {
  const result = {
    valid: true,
    errors: [],
    warnings: []
  };

  if (!file) {
    result.valid = false;
    result.errors.push('No file provided');
    return result;
  }

  // Check MIME type
  const allowedMimeTypes = Object.keys(ALLOWED_DOCUMENT_TYPES);
  if (!allowedMimeTypes.includes(file.mimetype)) {
    result.valid = false;
    result.errors.push(`Invalid file type: ${file.mimetype}. Allowed types: ${allowedMimeTypes.join(', ')}`);
  }

  // Check file extension
  const ext = path.extname(file.originalname || file.filename || '').toLowerCase();
  const allowedExtensions = ALLOWED_DOCUMENT_TYPES[file.mimetype] || [];
  if (!allowedExtensions.includes(ext)) {
    result.warnings.push(`File extension ${ext} may not match content type ${file.mimetype}`);
  }

  // Check file size
  const maxSize = MAX_FILE_SIZES[documentType] || MAX_FILE_SIZES.document;
  if (file.size > maxSize) {
    result.valid = false;
    result.errors.push(`File size ${(file.size / 1024 / 1024).toFixed(2)}MB exceeds maximum allowed ${(maxSize / 1024 / 1024).toFixed(0)}MB`);
  }

  return result;
};

/**
 * Validate ID number format based on ID type
 * @param {string} idNumber - The ID number to validate
 * @param {string} idType - Type of ID (AADHAAR, PAN, etc.)
 * @returns {Object} - Validation result
 */
const validateIdNumber = (idNumber, idType) => {
  const result = {
    valid: true,
    errors: [],
    warnings: [],
    formatValid: true,
    cleanedNumber: null
  };

  if (!idNumber) {
    result.valid = false;
    result.formatValid = false;
    result.errors.push('ID number is required');
    return result;
  }

  // Clean the ID number (remove spaces and dashes)
  const cleanedNumber = String(idNumber).toUpperCase().replace(/[-\s]/g, '');
  result.cleanedNumber = cleanedNumber;

  const validation = ID_TYPE_VALIDATIONS[idType?.toUpperCase()];
  
  if (!validation) {
    result.warnings.push(`Unknown ID type: ${idType}. Using generic validation.`);
    // Generic validation - just check length
    if (cleanedNumber.length < 4 || cleanedNumber.length > 20) {
      result.valid = false;
      result.formatValid = false;
      result.errors.push('ID number length should be between 4 and 20 characters');
    }
    return result;
  }

  // Check length
  if (cleanedNumber.length < validation.minLength || cleanedNumber.length > validation.maxLength) {
    result.valid = false;
    result.formatValid = false;
    result.errors.push(`Invalid length for ${idType}. Expected ${validation.minLength}-${validation.maxLength} characters, got ${cleanedNumber.length}`);
  }

  // Check format pattern
  if (validation.pattern && !validation.pattern.test(cleanedNumber)) {
    result.valid = false;
    result.formatValid = false;
    result.errors.push(`Invalid format for ${idType}. Expected: ${validation.formatDescription}`);
  }

  return result;
};

/**
 * Validate document metadata
 * @param {Object} metadata - Document metadata
 * @returns {Object} - Validation result
 */
const validateMetadata = (metadata) => {
  const result = {
    valid: true,
    errors: [],
    warnings: []
  };

  if (!metadata) {
    result.warnings.push('No metadata provided');
    return result;
  }

  // Check required fields
  if (!metadata.idType) {
    result.warnings.push('ID type not specified');
  }

  if (!metadata.userId) {
    result.valid = false;
    result.errors.push('User ID is required');
  }

  return result;
};

/**
 * Comprehensive document validation
 * @param {Object} params - Validation parameters
 * @param {Object} params.file - Uploaded file
 * @param {string} params.idNumber - ID number
 * @param {string} params.idType - ID type
 * @param {string} params.documentType - Document type (idProof, selfie)
 * @returns {Object} - Complete validation result
 */
const validateDocument = async (params) => {
  const { file, idNumber, idType, documentType = 'document' } = params;

  const result = {
    valid: true,
    errors: [],
    warnings: [],
    details: {
      fileValidation: null,
      idValidation: null,
      formatValid: true,
      sizeValid: true,
      typeValid: true
    },
    confidence: 1.0
  };

  // Validate file
  const fileValidation = validateFileType(file, documentType);
  result.details.fileValidation = fileValidation;
  result.details.sizeValid = !fileValidation.errors.some(e => e.includes('size'));
  result.details.typeValid = !fileValidation.errors.some(e => e.includes('type'));
  
  if (!fileValidation.valid) {
    result.valid = false;
    result.errors.push(...fileValidation.errors);
    result.confidence *= 0.5;
  }
  result.warnings.push(...fileValidation.warnings);

  // Validate ID number if provided
  if (idNumber) {
    const idValidation = validateIdNumber(idNumber, idType);
    result.details.idValidation = idValidation;
    result.details.formatValid = idValidation.formatValid;
    
    if (!idValidation.valid) {
      result.valid = false;
      result.errors.push(...idValidation.errors);
      result.confidence *= 0.3;
    }
    result.warnings.push(...idValidation.warnings);
  }

  // Calculate overall confidence
  if (result.errors.length > 0) {
    result.confidence = Math.max(0, result.confidence - (result.errors.length * 0.2));
  }

  return result;
};

/**
 * Get supported ID types
 * @returns {Array} - List of supported ID types
 */
const getSupportedIdTypes = () => {
  return Object.keys(ID_TYPE_VALIDATIONS).map(type => ({
    type,
    formatDescription: ID_TYPE_VALIDATIONS[type].formatDescription,
    example: getExampleId(type)
  }));
};

/**
 * Get example ID for a type (for display purposes)
 * @param {string} idType - ID type
 * @returns {string} - Example ID
 */
const getExampleId = (idType) => {
  const examples = {
    AADHAAR: '123456789012',
    PAN: 'ABCDE1234F',
    VOTER_ID: 'ABC1234567',
    DRIVING_LICENSE: 'MH0123456789012',
    PASSPORT: 'A1234567'
  };
  return examples[idType] || 'XXXXXXXXXX';
};

module.exports = {
  validateDocument,
  validateFileType,
  validateIdNumber,
  validateMetadata,
  getSupportedIdTypes,
  getExampleId,
  ALLOWED_DOCUMENT_TYPES,
  MAX_FILE_SIZES,
  ID_TYPE_VALIDATIONS
};
