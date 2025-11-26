/**
 * Cross-Validation Engine
 * 
 * UPDATED: Now uses validation mode instead of averaging mode.
 * Secondary sources are used to FLAG potential issues with the primary
 * measurement, not to blend measurements together.
 * 
 * If a secondary source differs by >15% from primary, a warning is added.
 * The primary measurement is kept, just annotated with validation notes.
 */

import { MeasurementResult, MeasurementSource, getSourceAccuracyDescription } from './roofMeasurement'
import { 
  calculateConfidence, 
  calculateSourceAgreement,
  ConfidenceLevel,
  ImageryQuality 
} from './confidenceScoring'
import { GAFCalibrationResult } from './gafReports'

export interface SourceMeasurement {
  name: MeasurementSource
  measurement: MeasurementResult
  weight: number
  varianceFromFinal: number
}

export interface ValidationCheck {
  source: string
  measurement: number
  varianceFromPrimary: number
  status: 'agrees' | 'minor-variance' | 'significant-variance'
}

export interface ValidationResult {
  primaryMeasurement: MeasurementResult
  validationChecks: ValidationCheck[]
  warnings: string[]
  overallValidation: 'validated' | 'unvalidated' | 'discrepancy-detected'
}

export interface CrossValidationResult {
  finalMeasurement: MeasurementResult
  sources: SourceMeasurement[]
  agreementScore: number // 0-100
  confidenceLevel: ConfidenceLevel
  discrepancies: string[]
  recommendation: string
  validationMode: boolean // NEW: indicates validation mode is used
}

// Source reliability weights (higher = more reliable)
const SOURCE_WEIGHTS: Record<MeasurementSource, number> = {
  'instant-roofer': 0.98, // LiDAR is most accurate
  'google-solar': 0.90,
  'manual-tracing': 0.85,
  'openstreetmap': 0.60,
  'footprint-estimation': 0.50
}

// Variance threshold for flagging discrepancies (percentage)
const VARIANCE_THRESHOLD = 15

/**
 * Perform cross-validation across multiple measurement sources
 * 
 * UPDATED: Now uses validation mode instead of averaging.
 * - Uses the FIRST (primary) measurement as the final result
 * - Secondary sources are used only to FLAG potential issues
 * - If secondary differs by >15%, adds a warning but keeps primary
 */
export function crossValidateMeasurements(
  measurements: MeasurementResult[],
  gafCalibration?: GAFCalibrationResult
): CrossValidationResult {
  if (measurements.length === 0) {
    return createEmptyResult()
  }
  
  // Use the first (primary/best tier) measurement as the final result
  // NO averaging - this is the key change from the old system
  const primaryMeasurement = measurements[0]
  
  // If only one source, return it directly
  if (measurements.length === 1) {
    return createSingleSourceResult(primaryMeasurement, gafCalibration)
  }
  
  // Calculate variance for each source compared to primary (not to weighted average)
  const sources: SourceMeasurement[] = measurements.map(m => ({
    name: m.source,
    measurement: m,
    weight: SOURCE_WEIGHTS[m.source],
    varianceFromFinal: calculateVariance(m.adjustedAreaSqFt, primaryMeasurement.adjustedAreaSqFt)
  }))
  
  // Calculate agreement score
  const areaValues = measurements.map(m => m.adjustedAreaSqFt)
  const agreementScore = calculateSourceAgreement(areaValues)
  
  // Identify discrepancies (sources differing >15% from primary)
  const discrepancies = identifyDiscrepancies(sources, VARIANCE_THRESHOLD)
  
  // Determine confidence level
  const confidenceLevel = determineConfidenceLevel(
    measurements,
    agreementScore,
    gafCalibration
  )
  
  // Generate recommendation
  const recommendation = generateRecommendation(
    confidenceLevel,
    discrepancies,
    measurements.length,
    gafCalibration
  )
  
  return {
    finalMeasurement: primaryMeasurement, // Use primary, not weighted average
    sources,
    agreementScore,
    confidenceLevel,
    discrepancies,
    recommendation,
    validationMode: true // Indicate we're using validation mode
  }
}

/**
 * Calculate weighted average of measurements
 * 
 * NOTE: This function is no longer used in the new validation mode.
 * Kept for legacy compatibility and potential future use cases.
 * The new approach uses the primary (best tier) measurement directly
 * instead of averaging across sources.
 */
function calculateWeightedAverage(measurements: MeasurementResult[]): MeasurementResult {
  let totalWeight = 0
  let weightedAreaSqM = 0
  let weightedAreaSqFt = 0
  let weightedAdjustedAreaSqFt = 0
  let weightedPitch = 0
  let bestConfidence = 0
  let bestSource = measurements[0]
  
  measurements.forEach(m => {
    const weight = SOURCE_WEIGHTS[m.source]
    totalWeight += weight
    weightedAreaSqM += m.totalAreaSqM * weight
    weightedAreaSqFt += m.totalAreaSqFt * weight
    weightedAdjustedAreaSqFt += m.adjustedAreaSqFt * weight
    weightedPitch += m.pitchDegrees * weight
    
    if (m.confidence > bestConfidence) {
      bestConfidence = m.confidence
      bestSource = m
    }
  })
  
  const avgAreaSqM = weightedAreaSqM / totalWeight
  const avgAreaSqFt = weightedAreaSqFt / totalWeight
  const avgAdjustedAreaSqFt = weightedAdjustedAreaSqFt / totalWeight
  const avgPitch = weightedPitch / totalWeight
  
  return {
    totalAreaSqM: avgAreaSqM,
    totalAreaSqFt: avgAreaSqFt,
    adjustedAreaSqFt: avgAdjustedAreaSqFt,
    squares: avgAdjustedAreaSqFt / 100,
    pitchDegrees: avgPitch,
    pitchMultiplier: bestSource.pitchMultiplier,
    segmentCount: bestSource.segmentCount,
    complexity: bestSource.complexity,
    source: 'google-solar', // Indicate primary source used
    confidence: calculateCombinedConfidence(measurements),
    imageryDate: bestSource.imageryDate,
    imageryQuality: bestSource.imageryQuality
  }
}

/**
 * Calculate combined confidence from multiple sources
 */
function calculateCombinedConfidence(measurements: MeasurementResult[]): number {
  if (measurements.length === 0) return 0
  
  // Start with the highest individual confidence
  const maxConfidence = Math.max(...measurements.map(m => m.confidence))
  
  // Boost confidence if multiple sources agree
  const areaValues = measurements.map(m => m.adjustedAreaSqFt)
  const agreementBoost = (calculateSourceAgreement(areaValues) - 70) / 3
  
  return Math.min(100, maxConfidence + Math.max(0, agreementBoost))
}

/**
 * Calculate variance as percentage
 */
function calculateVariance(value: number, reference: number): number {
  if (reference === 0) return 0
  return ((value - reference) / reference) * 100
}

/**
 * Identify sources with significant discrepancies
 */
function identifyDiscrepancies(
  sources: SourceMeasurement[],
  threshold: number
): string[] {
  const discrepancies: string[] = []
  
  sources.forEach(source => {
    if (Math.abs(source.varianceFromFinal) > threshold) {
      const direction = source.varianceFromFinal > 0 ? 'higher' : 'lower'
      discrepancies.push(
        `${source.name} measurement is ${Math.abs(source.varianceFromFinal).toFixed(1)}% ${direction} than average`
      )
    }
  })
  
  return discrepancies
}

/**
 * Determine confidence level based on measurements and calibration
 */
function determineConfidenceLevel(
  measurements: MeasurementResult[],
  agreementScore: number,
  gafCalibration?: GAFCalibrationResult
): ConfidenceLevel {
  // GAF-level confidence criteria:
  // 1. GAF report available for calibration
  // 2. LiDAR data available
  // 3. At least 2 sources agree within 5%
  
  if (gafCalibration?.exactMatch) {
    return 'gaf-level'
  }
  
  const hasLidar = measurements.some(m => m.source === 'instant-roofer')
  if (hasLidar) {
    return 'gaf-level'
  }
  
  if (measurements.length >= 2 && agreementScore >= 95) {
    return 'gaf-level'
  }
  
  // High confidence
  if (agreementScore >= 85 || measurements.some(m => m.confidence >= 85)) {
    return 'high'
  }
  
  // Moderate confidence
  if (agreementScore >= 70 || measurements.some(m => m.confidence >= 70)) {
    return 'moderate'
  }
  
  return 'low'
}

/**
 * Generate recommendation based on validation results
 */
function generateRecommendation(
  confidenceLevel: ConfidenceLevel,
  discrepancies: string[],
  sourceCount: number,
  gafCalibration?: GAFCalibrationResult
): string {
  switch (confidenceLevel) {
    case 'gaf-level':
      if (gafCalibration?.exactMatch) {
        return 'Measurements calibrated against historical GAF report. High accuracy expected.'
      }
      return 'High accuracy measurement from multiple agreeing sources or LiDAR data.'
    
    case 'high':
      if (sourceCount >= 2) {
        return 'Measurements from multiple sources with good agreement. Suitable for quoting.'
      }
      return 'Single high-quality source. Consider uploading a GAF report for verification.'
    
    case 'moderate':
      if (discrepancies.length > 0) {
        return 'Some discrepancy between sources. Manual verification recommended before final quote.'
      }
      return 'Moderate confidence in measurements. Consider site visit for verification.'
    
    case 'low':
      return 'Low confidence in measurements. Manual roof measurement or GAF report upload strongly recommended.'
  }
}

/**
 * Create result for empty measurements array
 */
function createEmptyResult(): CrossValidationResult {
  return {
    finalMeasurement: {
      totalAreaSqM: 0,
      totalAreaSqFt: 0,
      adjustedAreaSqFt: 0,
      squares: 0,
      pitchDegrees: 0,
      pitchMultiplier: 1,
      segmentCount: 0,
      complexity: 'simple',
      source: 'manual-tracing',
      confidence: 0,
      warning: 'No measurements available'
    },
    sources: [],
    agreementScore: 0,
    confidenceLevel: 'low',
    discrepancies: ['No measurement sources available'],
    recommendation: 'Unable to obtain measurements. Manual tracing or site visit required.',
    validationMode: true
  }
}

/**
 * Create result for single source measurement
 */
function createSingleSourceResult(
  measurement: MeasurementResult,
  gafCalibration?: GAFCalibrationResult
): CrossValidationResult {
  const hasGafCalibration = !!gafCalibration?.exactMatch
  const hasLidar = measurement.source === 'instant-roofer'
  
  let confidenceLevel: ConfidenceLevel = 'moderate'
  if (hasGafCalibration || hasLidar) {
    confidenceLevel = 'gaf-level'
  } else if (measurement.confidence >= 80) {
    confidenceLevel = 'high'
  } else if (measurement.confidence < 60) {
    confidenceLevel = 'low'
  }
  
  return {
    finalMeasurement: measurement,
    sources: [{
      name: measurement.source,
      measurement,
      weight: SOURCE_WEIGHTS[measurement.source],
      varianceFromFinal: 0
    }],
    agreementScore: 100, // Single source always agrees with itself
    confidenceLevel,
    discrepancies: [],
    recommendation: generateRecommendation(confidenceLevel, [], 1, gafCalibration),
    validationMode: true
  }
}

/**
 * Check if measurements achieve GAF-level confidence
 */
export function meetsGafLevelCriteria(
  measurements: MeasurementResult[],
  gafCalibration?: GAFCalibrationResult
): { meets: boolean; reason: string } {
  // Criteria 1: GAF report available
  if (gafCalibration?.exactMatch) {
    return { 
      meets: true, 
      reason: 'GAF report available for this address' 
    }
  }
  
  // Criteria 2: LiDAR data available
  if (measurements.some(m => m.source === 'instant-roofer')) {
    return { 
      meets: true, 
      reason: 'LiDAR measurement data available' 
    }
  }
  
  // Criteria 3: Multiple sources agree within 5%
  if (measurements.length >= 2) {
    const areaValues = measurements.map(m => m.adjustedAreaSqFt)
    const agreement = calculateSourceAgreement(areaValues)
    
    if (agreement >= 95) {
      return { 
        meets: true, 
        reason: `${measurements.length} sources agree within 5%` 
      }
    }
  }
  
  return { 
    meets: false, 
    reason: 'Insufficient data for GAF-level confidence. Upload a GAF report or enable additional sources.' 
  }
}

/**
 * NEW: Validate primary measurement against secondary sources
 * 
 * This is the new validation mode that replaces averaging.
 * Secondary sources are used only to FLAG potential issues with the primary
 * measurement, not to blend measurements together.
 */
export function validateMeasurement(
  primaryMeasurement: MeasurementResult,
  secondaryMeasurements: MeasurementResult[]
): ValidationResult {
  const validationChecks: ValidationCheck[] = []
  const warnings: string[] = []
  
  for (const secondary of secondaryMeasurements) {
    const variance = calculateVariance(
      secondary.adjustedAreaSqFt, 
      primaryMeasurement.adjustedAreaSqFt
    )
    
    let status: 'agrees' | 'minor-variance' | 'significant-variance'
    if (Math.abs(variance) <= 5) {
      status = 'agrees'
    } else if (Math.abs(variance) <= 15) {
      status = 'minor-variance'
    } else {
      status = 'significant-variance'
      warnings.push(
        `${secondary.source} differs by ${Math.abs(variance).toFixed(1)}% from primary source (${primaryMeasurement.source})`
      )
    }
    
    validationChecks.push({
      source: secondary.source,
      measurement: secondary.adjustedAreaSqFt,
      varianceFromPrimary: variance,
      status
    })
  }
  
  // Determine overall validation status
  let overallValidation: 'validated' | 'unvalidated' | 'discrepancy-detected'
  if (validationChecks.length === 0) {
    overallValidation = 'unvalidated'
  } else if (warnings.length > 0) {
    overallValidation = 'discrepancy-detected'
  } else {
    overallValidation = 'validated'
  }
  
  return {
    primaryMeasurement,
    validationChecks,
    warnings,
    overallValidation
  }
}
