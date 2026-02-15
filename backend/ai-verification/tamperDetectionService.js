/**
 * Tamper Detection Service
 * Analyzes documents for signs of tampering, editing, or manipulation
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Tamper detection thresholds
const TAMPER_THRESHOLDS = {
  LOW_RISK: 0.2,      // Score below this is low risk
  MEDIUM_RISK: 0.5,   // Score below this is medium risk
  HIGH_RISK: 0.7      // Score above this is high risk
};

// Common tampering indicators
const TAMPER_INDICATORS = {
  METADATA_INCONSISTENCY: 'metadata_inconsistency',
  COMPRESSION_ARTIFACTS: 'compression_artifacts',
  EDGE_ANOMALIES: 'edge_anomalies',
  COLOR_INCONSISTENCIES: 'color_inconsistencies',
  TEXT_ANOMALIES: 'text_anomalies',
  CLONING_DETECTED: 'cloning_detected',
  RESAMPLING_ARTIFACTS: 'resampling_artifacts',
  NOISE_INCONSISTENCY: 'noise_inconsistency'
};

/**
 * Analyze file metadata for tampering signs
 * @param {string} filePath - Path to file
 * @returns {Object} - Metadata analysis result
 */
const analyzeMetadata = async (filePath) => {
  const result = {
    valid: true,
    suspicious: false,
    score: 0,
    indicators: [],
    details: {}
  };

  try {
    if (!fs.existsSync(filePath)) {
      result.valid = false;
      return result;
    }

    const stats = fs.statSync(filePath);
    result.details.fileSize = stats.size;
    result.details.modifiedTime = stats.mtime;

    // Check for suspicious file size (too small might indicate compression/editing)
    if (stats.size < 50 * 1024) { // Less than 50KB
      result.suspicious = true;
      result.score += 0.2;
      result.indicators.push('File size unusually small');
    }

    // Get file extension
    const ext = path.extname(filePath).toLowerCase();
    result.details.extension = ext;

    // Read file header for format validation
    const fd = fs.openSync(filePath, 'r');
    const header = Buffer.alloc(24);
    fs.readSync(fd, header, 0, 24, 0);
    fs.closeSync(fd);

    // Validate file signature matches extension
    const signatures = {
      '.jpg': [0xFF, 0xD8, 0xFF],
      '.jpeg': [0xFF, 0xD8, 0xFF],
      '.png': [0x89, 0x50, 0x4E, 0x47],
      '.pdf': [0x25, 0x50, 0x44, 0x46]
    };

    const expectedSig = signatures[ext];
    if (expectedSig) {
      const matches = expectedSig.every((byte, i) => header[i] === byte);
      if (!matches) {
        result.suspicious = true;
        result.score += 0.4;
        result.indicators.push(TAMPER_INDICATORS.METADATA_INCONSISTENCY);
        result.indicators.push('File signature does not match extension');
      }
    }

    result.details.headerValid = !result.suspicious;

  } catch (error) {
    console.error('Metadata analysis error:', error);
    result.valid = false;
    result.details.error = error.message;
  }

  return result;
};

/**
 * Detect image compression artifacts
 * @param {string} imagePath - Path to image
 * @returns {Object} - Compression analysis result
 */
const detectCompressionArtifacts = async (imagePath) => {
  const result = {
    detected: false,
    score: 0,
    details: {}
  };

  try {
    const ext = path.extname(imagePath).toLowerCase();
    
    // JPEG images commonly show compression artifacts
    if (ext === '.jpg' || ext === '.jpeg') {
      // In production, use image analysis library
      // For now, check file size as proxy
      const stats = fs.statSync(imagePath);
      const sizeKB = stats.size / 1024;
      
      // Very small JPEGs likely have high compression
      if (sizeKB < 100) {
        result.detected = true;
        result.score = 0.3;
        result.details.note = 'High compression detected';
      }
    }

  } catch (error) {
    console.error('Compression analysis error:', error);
  }

  return result;
};

/**
 * Analyze document for edge anomalies
 * @param {string} filePath - Path to file
 * @returns {Object} - Edge analysis result
 */
const analyzeEdges = async (filePath) => {
  const result = {
    anomalies: false,
    score: 0,
    details: {}
  };

  try {
    // In production, use image processing to detect:
    // - Unnatural edges from copy-paste operations
    // - Blending artifacts at document boundaries
    // - Inconsistent edge sharpness
    
    // Placeholder implementation
    result.details.analyzed = true;

  } catch (error) {
    console.error('Edge analysis error:', error);
  }

  return result;
};

/**
 * Calculate file hash for integrity verification
 * @param {string} filePath - Path to file
 * @returns {Object} - Hash result
 */
const calculateFileHash = async (filePath) => {
  const result = {
    md5: null,
    sha256: null,
    valid: false
  };

  try {
    if (!fs.existsSync(filePath)) {
      return result;
    }

    const fileBuffer = fs.readFileSync(filePath);
    result.md5 = crypto.createHash('md5').update(fileBuffer).digest('hex');
    result.sha256 = crypto.createHash('sha256').update(fileBuffer).digest('hex');
    result.valid = true;

  } catch (error) {
    console.error('Hash calculation error:', error);
  }

  return result;
};

/**
 * Comprehensive tamper detection analysis
 * @param {string} filePath - Path to document file
 * @param {Object} options - Analysis options
 * @returns {Object} - Complete tamper analysis result
 */
const analyzeDocument = async (filePath, options = {}) => {
  const result = {
    tamperScore: 0,
    riskLevel: 'LOW',
    recommendation: 'APPROVE',
    indicators: [],
    details: {
      metadata: null,
      compression: null,
      edges: null,
      hash: null
    },
    confidence: 1.0
  };

  try {
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      result.riskLevel = 'HIGH';
      result.recommendation = 'REJECT';
      result.indicators.push('File not found');
      result.confidence = 0;
      return result;
    }

    // Run all analyses
    const [metadata, compression, edges, hash] = await Promise.all([
      analyzeMetadata(filePath),
      detectCompressionArtifacts(filePath),
      analyzeEdges(filePath),
      calculateFileHash(filePath)
    ]);

    result.details.metadata = metadata;
    result.details.compression = compression;
    result.details.edges = edges;
    result.details.hash = hash;

    // Aggregate scores
    let totalScore = 0;
    let weightSum = 0;

    // Metadata analysis (weight: 0.4)
    if (metadata.suspicious) {
      totalScore += metadata.score * 0.4;
      result.indicators.push(...metadata.indicators);
    }
    weightSum += 0.4;

    // Compression artifacts (weight: 0.2)
    if (compression.detected) {
      totalScore += compression.score * 0.2;
      result.indicators.push(TAMPER_INDICATORS.COMPRESSION_ARTIFACTS);
    }
    weightSum += 0.2;

    // Edge anomalies (weight: 0.3)
    if (edges.anomalies) {
      totalScore += edges.score * 0.3;
      result.indicators.push(TAMPER_INDICATORS.EDGE_ANOMALIES);
    }
    weightSum += 0.3;

    // Calculate final tamper score
    result.tamperScore = totalScore / weightSum;

    // Determine risk level and recommendation
    if (result.tamperScore >= TAMPER_THRESHOLDS.HIGH_RISK) {
      result.riskLevel = 'HIGH';
      result.recommendation = 'REJECT';
      result.confidence = 0.9;
    } else if (result.tamperScore >= TAMPER_THRESHOLDS.MEDIUM_RISK) {
      result.riskLevel = 'MEDIUM';
      result.recommendation = 'REVIEW';
      result.confidence = 0.7;
    } else if (result.tamperScore >= TAMPER_THRESHOLDS.LOW_RISK) {
      result.riskLevel = 'LOW';
      result.recommendation = 'APPROVE';
      result.confidence = 0.85;
    } else {
      result.riskLevel = 'MINIMAL';
      result.recommendation = 'APPROVE';
      result.confidence = 0.95;
    }

  } catch (error) {
    console.error('Tamper analysis error:', error);
    result.riskLevel = 'MEDIUM';
    result.recommendation = 'REVIEW';
    result.indicators.push('Analysis error occurred');
    result.details.error = error.message;
    result.confidence = 0.5;
  }

  return result;
};

/**
 * Quick tamper check for uploaded files
 * @param {Object} file - Uploaded file object
 * @returns {Object} - Quick check result
 */
const quickTamperCheck = async (file) => {
  const result = {
    passed: true,
    score: 0,
    warnings: []
  };

  try {
    // Check file extension vs MIME type
    const ext = path.extname(file.originalname || '').toLowerCase();
    const mimeMap = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.pdf': 'application/pdf'
    };

    if (mimeMap[ext] && file.mimetype !== mimeMap[ext]) {
      result.passed = false;
      result.score += 0.3;
      result.warnings.push('File extension does not match content type');
    }

    // Check for suspicious file names
    const suspiciousPatterns = [
      /edited/i,
      /copy/i,
      /modified/i,
      /photoshop/i,
      /_1\./,
      /_2\./
    ];

    const filename = file.originalname || '';
    if (suspiciousPatterns.some(p => p.test(filename))) {
      result.warnings.push('File name suggests possible editing');
      result.score += 0.1;
    }

  } catch (error) {
    console.error('Quick tamper check error:', error);
  }

  return result;
};

/**
 * Get tamper risk level description
 * @param {string} riskLevel - Risk level
 * @returns {string} - Description
 */
const getRiskDescription = (riskLevel) => {
  const descriptions = {
    MINIMAL: 'No signs of tampering detected',
    LOW: 'Minor indicators present, likely safe',
    MEDIUM: 'Some tampering indicators detected, review recommended',
    HIGH: 'Strong indicators of tampering, rejection recommended'
  };
  return descriptions[riskLevel] || 'Unknown risk level';
};

module.exports = {
  analyzeDocument,
  analyzeMetadata,
  detectCompressionArtifacts,
  analyzeEdges,
  calculateFileHash,
  quickTamperCheck,
  getRiskDescription,
  TAMPER_THRESHOLDS,
  TAMPER_INDICATORS
};
