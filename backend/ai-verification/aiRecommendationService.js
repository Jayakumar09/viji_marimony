/**
 * AI Recommendation Service
 * Combines all verification analyses to generate final recommendation
 */

const documentValidation = require('./documentValidationService');
const faceMatch = require('./faceMatchService');
const tamperDetection = require('./tamperDetectionService');

// Recommendation types
const RECOMMENDATION_TYPES = {
  APPROVE: 'APPROVE',
  REVIEW: 'REVIEW',
  REJECT: 'REJECT'
};

// Confidence thresholds
const CONFIDENCE_THRESHOLDS = {
  HIGH: 0.85,
  MEDIUM: 0.60,
  LOW: 0.40
};

// Risk weights for different factors
const RISK_WEIGHTS = {
  documentValidation: 0.25,
  faceMatch: 0.35,
  tamperDetection: 0.40
};

/**
 * Generate comprehensive AI recommendation
 * @param {Object} params - Verification parameters
 * @param {Object} params.file - Uploaded ID file
 * @param {string} params.idNumber - ID number
 * @param {string} params.idType - ID type
 * @param {string} params.selfiePath - Path to selfie image
 * @param {string} params.idImagePath - Path to ID image
 * @returns {Object} - Complete AI recommendation
 */
const generateRecommendation = async (params) => {
  const { file, idNumber, idType, selfiePath, idImagePath } = params;

  const result = {
    recommendation: RECOMMENDATION_TYPES.REVIEW,
    confidence: 0,
    riskScore: 0,
    flags: [],
    details: {
      documentValidation: null,
      faceMatch: null,
      tamperDetection: null
    },
    summary: '',
    timestamp: new Date().toISOString()
  };

  try {
    // Run all analyses in parallel
    const analyses = await Promise.all([
      // Document validation
      documentValidation.validateDocument({
        file,
        idNumber,
        idType,
        documentType: 'idProof'
      }).catch(e => ({ valid: false, errors: [e.message] })),
      
      // Face match (if selfie provided)
      selfiePath && idImagePath 
        ? faceMatch.compareFaces(idImagePath, selfiePath)
            .catch(e => ({ match: false, error: e.message }))
        : Promise.resolve({ match: null, confidence: 0, recommendation: 'REVIEW' }),
      
      // Tamper detection
      idImagePath 
        ? tamperDetection.analyzeDocument(idImagePath)
            .catch(e => ({ tamperScore: 0.5, riskLevel: 'MEDIUM', error: e.message }))
        : Promise.resolve({ tamperScore: 0, riskLevel: 'LOW' })
    ]);

    const [docValidation, faceMatchResult, tamperResult] = analyses;

    result.details.documentValidation = docValidation;
    result.details.faceMatch = faceMatchResult;
    result.details.tamperDetection = tamperResult;

    // Calculate individual scores
    const docScore = docValidation.valid ? 1 - docValidation.confidence : 0.5;
    const faceScore = faceMatchResult.match ? 1 - faceMatchResult.confidence : 0.5;
    const tamperScore = tamperResult.tamperScore || 0;

    // Calculate weighted risk score
    result.riskScore = (
      docScore * RISK_WEIGHTS.documentValidation +
      faceScore * RISK_WEIGHTS.faceMatch +
      tamperScore * RISK_WEIGHTS.tamperDetection
    );

    // Collect flags
    if (!docValidation.valid) {
      result.flags.push(...(docValidation.errors || []).map(e => `Document: ${e}`));
    }
    if (docValidation.warnings?.length > 0) {
      result.flags.push(...docValidation.warnings.map(w => `Warning: ${w}`));
    }
    if (!docValidation.details?.formatValid) {
      result.flags.push('ID format validation failed');
    }
    if (faceMatchResult.match === false) {
      result.flags.push('Face match failed');
    }
    if (faceMatchResult.confidence < CONFIDENCE_THRESHOLDS.MEDIUM) {
      result.flags.push('Low face match confidence');
    }
    if (tamperResult.riskLevel === 'HIGH') {
      result.flags.push('High tamper risk detected');
    }
    if (tamperResult.indicators?.length > 0) {
      result.flags.push(...tamperResult.indicators);
    }

    // Calculate overall confidence
    const positiveFactors = [];
    const negativeFactors = [];

    if (docValidation.valid) positiveFactors.push(0.9);
    else negativeFactors.push(0.3);

    if (docValidation.details?.formatValid) positiveFactors.push(0.8);
    else negativeFactors.push(0.2);

    if (faceMatchResult.match) positiveFactors.push(faceMatchResult.confidence);
    else if (faceMatchResult.match === false) negativeFactors.push(0.4);

    if (tamperResult.riskLevel === 'MINIMAL' || tamperResult.riskLevel === 'LOW') {
      positiveFactors.push(0.85);
    } else if (tamperResult.riskLevel === 'HIGH') {
      negativeFactors.push(0.5);
    }

    // Calculate confidence
    const avgPositive = positiveFactors.length > 0 
      ? positiveFactors.reduce((a, b) => a + b, 0) / positiveFactors.length 
      : 0.5;
    const avgNegative = negativeFactors.length > 0 
      ? negativeFactors.reduce((a, b) => a + b, 0) / negativeFactors.length 
      : 0;
    
    result.confidence = Math.max(0, Math.min(1, avgPositive - avgNegative * 0.5));

    // Determine final recommendation
    result.recommendation = determineRecommendation(result);

    // Generate summary
    result.summary = generateSummary(result);

  } catch (error) {
    console.error('AI recommendation error:', error);
    result.recommendation = RECOMMENDATION_TYPES.REVIEW;
    result.confidence = 0;
    result.flags.push('Analysis error occurred');
    result.details.error = error.message;
  }

  return result;
};

/**
 * Determine final recommendation based on analysis results
 * @param {Object} result - Analysis result
 * @returns {string} - Recommendation type
 */
const determineRecommendation = (result) => {
  const { riskScore, confidence, flags, details } = result;

  // Auto-reject conditions
  if (flags.includes('High tamper risk detected')) {
    return RECOMMENDATION_TYPES.REJECT;
  }
  if (details.tamperDetection?.riskLevel === 'HIGH') {
    return RECOMMENDATION_TYPES.REJECT;
  }
  if (details.faceMatch?.recommendation === 'REJECT') {
    return RECOMMENDATION_TYPES.REJECT;
  }

  // High risk score
  if (riskScore > 0.7) {
    return RECOMMENDATION_TYPES.REJECT;
  }

  // Review conditions
  if (riskScore > 0.4) {
    return RECOMMENDATION_TYPES.REVIEW;
  }
  if (confidence < CONFIDENCE_THRESHOLDS.MEDIUM) {
    return RECOMMENDATION_TYPES.REVIEW;
  }
  if (flags.length > 3) {
    return RECOMMENDATION_TYPES.REVIEW;
  }
  if (details.faceMatch?.confidence < CONFIDENCE_THRESHOLDS.HIGH) {
    return RECOMMENDATION_TYPES.REVIEW;
  }
  if (details.tamperDetection?.riskLevel === 'MEDIUM') {
    return RECOMMENDATION_TYPES.REVIEW;
  }

  // Approve conditions
  if (confidence >= CONFIDENCE_THRESHOLDS.HIGH && flags.length <= 1) {
    return RECOMMENDATION_TYPES.APPROVE;
  }

  return RECOMMENDATION_TYPES.REVIEW;
};

/**
 * Generate human-readable summary
 * @param {Object} result - Analysis result
 * @returns {string} - Summary text
 */
const generateSummary = (result) => {
  const parts = [];

  // Document validation summary
  if (result.details.documentValidation?.valid) {
    parts.push('Document format is valid');
  } else {
    parts.push('Document validation issues detected');
  }

  // Face match summary
  if (result.details.faceMatch?.match === true) {
    parts.push(`face match confirmed (${Math.round(result.details.faceMatch.confidence * 100)}% confidence)`);
  } else if (result.details.faceMatch?.match === false) {
    parts.push('face match failed');
  }

  // Tamper detection summary
  if (result.details.tamperDetection) {
    const riskLevel = result.details.tamperDetection.riskLevel;
    if (riskLevel === 'MINIMAL' || riskLevel === 'LOW') {
      parts.push('no tampering detected');
    } else if (riskLevel === 'MEDIUM') {
      parts.push('some tampering indicators found');
    } else if (riskLevel === 'HIGH') {
      parts.push('significant tampering detected');
    }
  }

  // Final recommendation
  const recText = {
    APPROVE: 'Recommended for approval',
    REVIEW: 'Requires manual review',
    REJECT: 'Recommended for rejection'
  };
  parts.push(`- ${recText[result.recommendation]}`);

  return parts.join(', ') + '.';
};

/**
 * Quick verification check
 * @param {Object} params - Quick check parameters
 * @returns {Object} - Quick check result
 */
const quickVerify = async (params) => {
  const { file, idNumber, idType } = params;

  const result = {
    passed: true,
    issues: [],
    recommendation: RECOMMENDATION_TYPES.REVIEW
  };

  try {
    // Quick document validation
    const docResult = await documentValidation.validateDocument({
      file,
      idNumber,
      idType,
      documentType: 'idProof'
    });

    if (!docResult.valid) {
      result.passed = false;
      result.issues.push(...docResult.errors);
    }

    // Quick tamper check
    if (file) {
      const tamperCheck = await tamperDetection.quickTamperCheck(file);
      if (!tamperCheck.passed) {
        result.passed = false;
        result.issues.push(...tamperCheck.warnings);
      }
    }

    result.recommendation = result.passed ? RECOMMENDATION_TYPES.APPROVE : RECOMMENDATION_TYPES.REVIEW;

  } catch (error) {
    result.passed = false;
    result.issues.push(error.message);
    result.recommendation = RECOMMENDATION_TYPES.REVIEW;
  }

  return result;
};

/**
 * Get recommendation badge color
 * @param {string} recommendation - Recommendation type
 * @returns {string} - Color code
 */
const getRecommendationColor = (recommendation) => {
  const colors = {
    APPROVE: 'green',
    REVIEW: 'yellow',
    REJECT: 'red'
  };
  return colors[recommendation] || 'gray';
};

/**
 * Get recommendation display text
 * @param {string} recommendation - Recommendation type
 * @returns {string} - Display text
 */
const getRecommendationText = (recommendation) => {
  const texts = {
    APPROVE: 'Recommended Approval',
    REVIEW: 'Needs Review',
    REJECT: 'High Risk'
  };
  return texts[recommendation] || 'Unknown';
};

module.exports = {
  generateRecommendation,
  quickVerify,
  determineRecommendation,
  generateSummary,
  getRecommendationColor,
  getRecommendationText,
  RECOMMENDATION_TYPES,
  CONFIDENCE_THRESHOLDS,
  RISK_WEIGHTS
};
