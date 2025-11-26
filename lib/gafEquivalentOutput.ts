/**
 * GAF Equivalent Output Module
 * 
 * Generates full GAF-format output from any measurement, including:
 * - Linear measurements from polygon geometry
 * - Waste factor recommendation from complexity
 * - Material quantity calculations from area/pitch
 * 
 * This module integrates all GAF-level algorithms from the codebase
 * to produce professional-grade reports without needing Google Solar API or LiDAR.
 */

import { MeasurementResult, RoofComplexity } from './roofMeasurement'
import { TracedPolygon, Coordinate, AutoTraceResult } from './autoTrace'
import { 
  areaToSquares, 
  getPitchCategory, 
  getNearestStandardPitch,
  calculatePitchMultiplierFromDegrees 
} from './pitchCalculations'
import { 
  calculateConfidence, 
  ConfidenceResult, 
  ConfidenceFactors,
  ConfidenceLevel 
} from './confidenceScoring'
import { 
  validateMeasurement, 
  ValidationResult 
} from './crossValidation'
import { 
  analyzeFootprintGeometry, 
  GeometryAnalysis 
} from './enhancedOSM'
import { 
  getCalibrationForLocation, 
  GAFCalibrationResult 
} from './gafReports'
import { 
  getZipCodeCorrection, 
  ZipCodeCorrectionModel 
} from './selfLearning'

/**
 * Linear measurements derived from polygon geometry
 */
export interface LinearMeasurements {
  ridgeLengthFt: number
  eavesLengthFt: number
  rakesLengthFt: number
  valleyCount: number
  hipCount: number
  totalPerimeterFt: number
}

/**
 * Material estimates for roofing job
 */
export interface MaterialEstimates {
  shingleBundles: number
  underlaymentRolls: number
  starterStripFt: number
  ridgeCapFt: number
  dripEdgeFt: number
  valleyMetalFt: number
  nailsPounds: number
}

/**
 * GAF-equivalent output structure
 */
export interface GAFEquivalentOutput {
  totalSquares: number
  predominantPitch: string          // e.g., "7:12"
  pitchDegrees: number
  facetCount: number
  complexity: RoofComplexity
  
  linearMeasurements: LinearMeasurements
  
  wasteFactorRecommendation: number  // 10%, 15%, 20%
  wasteFactorReason: string
  
  materials: MaterialEstimates
}

/**
 * Validation status against other data sources
 */
export interface ValidationStatus {
  comparedToOSM: boolean
  osmVariancePercent: number
  comparedToMicrosoft: boolean
  microsoftVariancePercent: number
  validationStatus: 'validated' | 'discrepancy-detected' | 'unvalidated'
  warnings: string[]
}

/**
 * Calibration information from self-learning system
 */
export interface CalibrationInfo {
  regionHasHistoricalData: boolean
  calibrationFactorApplied: number
  basedOnSamples: number
}

/**
 * Confidence breakdown with detailed factors
 */
export interface ConfidenceBreakdown {
  score: number
  level: ConfidenceLevel
  factors: { name: string; impact: number; description: string }[]
}

/**
 * Full GAF-enhanced auto-trace result
 */
export interface GAFEnhancedAutoTraceResult {
  // Basic trace result
  polygon: Coordinate[]
  areaSqFt: number
  confidence: number
  
  // GAF-equivalent outputs
  gafEquivalent: GAFEquivalentOutput
  
  // Validation against other sources
  validation: ValidationStatus
  
  // Self-learning integration
  calibration: CalibrationInfo
  
  // Confidence breakdown
  confidenceBreakdown: ConfidenceBreakdown
}

/**
 * Estimate linear measurements from traced polygon
 * 
 * Uses geometry analysis to estimate ridge, eaves, rakes, valleys, and hips
 * based on polygon shape and building type patterns.
 */
export function estimateLinearMeasurements(
  polygon: TracedPolygon | null,
  areaSqFt: number,
  facetCount: number,
  complexity: RoofComplexity
): LinearMeasurements {
  if (!polygon || polygon.vertexCount < 3) {
    // Return empty measurements for invalid polygon
    return {
      ridgeLengthFt: 0,
      eavesLengthFt: 0,
      rakesLengthFt: 0,
      valleyCount: 0,
      hipCount: 0,
      totalPerimeterFt: 0
    }
  }
  
  // Convert perimeter from meters to feet
  const perimeterFt = polygon.perimeterM * 3.28084
  
  // Calculate approximate building dimensions
  const bbox = polygon.boundingBox
  const latSpanM = (bbox.maxLat - bbox.minLat) * 110540
  const lngSpanM = (bbox.maxLng - bbox.minLng) * 111320 * Math.cos(polygon.centroid.lat * Math.PI / 180)
  
  const lengthFt = Math.max(latSpanM, lngSpanM) * 3.28084
  const widthFt = Math.min(latSpanM, lngSpanM) * 3.28084
  
  // Estimate based on complexity and typical roof patterns
  let ridgeLengthFt: number
  let eavesLengthFt: number
  let rakesLengthFt: number
  let valleyCount: number
  let hipCount: number
  
  switch (complexity) {
    case 'simple':
      // Simple gable or hip roof
      ridgeLengthFt = lengthFt * 0.75  // Ridge runs along the length
      eavesLengthFt = lengthFt * 2     // Both sides
      rakesLengthFt = widthFt * 2      // Both ends (for gable)
      valleyCount = 0
      hipCount = facetCount > 2 ? 4 : 0
      break
      
    case 'moderate':
      // L-shaped or cross-gable
      ridgeLengthFt = lengthFt * 1.2   // Multiple ridge sections
      eavesLengthFt = perimeterFt * 0.4
      rakesLengthFt = perimeterFt * 0.2
      valleyCount = 2
      hipCount = 0
      break
      
    case 'complex':
      // Multiple intersecting sections
      ridgeLengthFt = lengthFt * 1.5
      eavesLengthFt = perimeterFt * 0.5
      rakesLengthFt = perimeterFt * 0.25
      valleyCount = 4
      hipCount = facetCount > 8 ? 4 : 2
      break
      
    case 'very-complex':
      // Highly irregular with many intersections
      ridgeLengthFt = lengthFt * 2.0
      eavesLengthFt = perimeterFt * 0.6
      rakesLengthFt = perimeterFt * 0.3
      valleyCount = Math.min(8, Math.ceil(facetCount / 2))
      hipCount = Math.min(6, Math.floor(facetCount / 3))
      break
      
    default:
      ridgeLengthFt = lengthFt
      eavesLengthFt = perimeterFt * 0.4
      rakesLengthFt = perimeterFt * 0.2
      valleyCount = 0
      hipCount = 0
  }
  
  // Ensure non-negative values
  return {
    ridgeLengthFt: Math.max(0, Math.round(ridgeLengthFt)),
    eavesLengthFt: Math.max(0, Math.round(eavesLengthFt)),
    rakesLengthFt: Math.max(0, Math.round(rakesLengthFt)),
    valleyCount: Math.max(0, valleyCount),
    hipCount: Math.max(0, hipCount),
    totalPerimeterFt: Math.round(perimeterFt)
  }
}

/**
 * Calculate waste factor recommendation based on complexity
 * 
 * Waste factors account for material loss during installation:
 * - Simple roofs: 10% waste
 * - Moderate complexity: 15% waste  
 * - Complex roofs: 20% waste
 * - Very complex: 20%+ waste
 */
export function calculateWasteFactor(
  complexity: RoofComplexity,
  valleyCount: number,
  hipCount: number
): { recommendation: number; reason: string } {
  let baseWaste: number
  let reason: string
  
  switch (complexity) {
    case 'simple':
      baseWaste = 10
      reason = 'Simple roof geometry with minimal cuts required'
      break
      
    case 'moderate':
      baseWaste = 15
      reason = 'Moderate complexity with some cuts around features'
      break
      
    case 'complex':
      baseWaste = 18
      reason = 'Complex geometry requiring significant cutting'
      break
      
    case 'very-complex':
      baseWaste = 20
      reason = 'Very complex roof with many intersections and cuts'
      break
      
    default:
      baseWaste = 15
      reason = 'Standard waste factor applied'
  }
  
  // Add extra waste for valleys (each valley adds ~1% waste)
  const valleyWaste = Math.min(5, valleyCount * 1)
  
  // Add extra waste for hips (each hip adds ~0.5% waste)
  const hipWaste = Math.min(3, hipCount * 0.5)
  
  const totalWaste = Math.min(25, baseWaste + valleyWaste + hipWaste)
  
  if (valleyCount > 0 || hipCount > 0) {
    reason += `. Additional waste for ${valleyCount} valleys and ${hipCount} hips.`
  }
  
  return {
    recommendation: Math.round(totalWaste),
    reason
  }
}

/**
 * Calculate material quantities from area and pitch
 * 
 * Standard calculations:
 * - Shingles: 3 bundles per square
 * - Underlayment: 1 roll covers 4 squares
 * - Starter strip: perimeter of roof
 * - Ridge cap: ridge length
 * - Drip edge: eaves + rakes
 * - Nails: 320 per square (1.5 lbs)
 */
export function calculateMaterialQuantities(
  areaSqFt: number,
  linearMeasurements: LinearMeasurements,
  wasteFactorPercent: number,
  valleyCount: number
): MaterialEstimates {
  const squares = areaToSquares(areaSqFt)
  const wasteFactor = 1 + (wasteFactorPercent / 100)
  
  // Shingles: 3 bundles per square with waste
  const shingleBundles = Math.ceil(squares * 3 * wasteFactor)
  
  // Underlayment: 1 roll covers 4 squares with waste
  const underlaymentRolls = Math.ceil(squares * wasteFactor / 4)
  
  // Starter strip: perimeter in feet
  const starterStripFt = linearMeasurements.eavesLengthFt + linearMeasurements.rakesLengthFt
  
  // Ridge cap: ridge length (1 bundle per 20 linear feet)
  const ridgeCapFt = linearMeasurements.ridgeLengthFt
  
  // Drip edge: eaves + rakes
  const dripEdgeFt = linearMeasurements.eavesLengthFt + linearMeasurements.rakesLengthFt
  
  // Valley metal: estimate 8 feet per valley
  const valleyMetalFt = valleyCount * 8
  
  // Nails: approximately 1.5 lbs per square
  const nailsPounds = Math.ceil(squares * 1.5 * wasteFactor)
  
  return {
    shingleBundles,
    underlaymentRolls,
    starterStripFt: Math.round(starterStripFt),
    ridgeCapFt: Math.round(ridgeCapFt),
    dripEdgeFt: Math.round(dripEdgeFt),
    valleyMetalFt: Math.round(valleyMetalFt),
    nailsPounds
  }
}

/**
 * Generate full GAF-equivalent output from measurement result
 */
export function generateGAFEquivalentOutput(
  measurement: MeasurementResult,
  polygon?: TracedPolygon | null
): GAFEquivalentOutput {
  const squares = areaToSquares(measurement.adjustedAreaSqFt)
  const predominantPitch = getNearestStandardPitch(measurement.pitchDegrees)
  const facetCount = measurement.segmentCount || estimateFacetCount(measurement.complexity)
  
  // Estimate linear measurements
  const linearMeasurements = estimateLinearMeasurements(
    polygon || null,
    measurement.adjustedAreaSqFt,
    facetCount,
    measurement.complexity
  )
  
  // Calculate waste factor
  const wasteFactor = calculateWasteFactor(
    measurement.complexity,
    linearMeasurements.valleyCount,
    linearMeasurements.hipCount
  )
  
  // Calculate materials
  const materials = calculateMaterialQuantities(
    measurement.adjustedAreaSqFt,
    linearMeasurements,
    wasteFactor.recommendation,
    linearMeasurements.valleyCount
  )
  
  return {
    totalSquares: Math.round(squares * 100) / 100,
    predominantPitch,
    pitchDegrees: Math.round(measurement.pitchDegrees * 100) / 100,
    facetCount,
    complexity: measurement.complexity,
    linearMeasurements,
    wasteFactorRecommendation: wasteFactor.recommendation,
    wasteFactorReason: wasteFactor.reason,
    materials
  }
}

/**
 * Estimate facet count from complexity if not provided
 */
function estimateFacetCount(complexity: RoofComplexity): number {
  switch (complexity) {
    case 'simple': return 2
    case 'moderate': return 6
    case 'complex': return 10
    case 'very-complex': return 14
    default: return 4
  }
}

/**
 * Build validation status from cross-validation results
 */
export function buildValidationStatus(
  primaryMeasurement: MeasurementResult,
  osmMeasurement?: MeasurementResult | null,
  microsoftMeasurement?: MeasurementResult | null,
  validationResult?: ValidationResult | null
): ValidationStatus {
  const warnings: string[] = []
  let validationStatus: 'validated' | 'discrepancy-detected' | 'unvalidated' = 'unvalidated'
  
  // Calculate OSM variance
  let osmVariancePercent = 0
  let comparedToOSM = false
  if (osmMeasurement && primaryMeasurement.adjustedAreaSqFt > 0) {
    osmVariancePercent = ((primaryMeasurement.adjustedAreaSqFt - osmMeasurement.adjustedAreaSqFt) / osmMeasurement.adjustedAreaSqFt) * 100
    comparedToOSM = true
    
    if (Math.abs(osmVariancePercent) > 15) {
      warnings.push(`Auto-trace corrected ${Math.abs(osmVariancePercent).toFixed(1)}% ${osmVariancePercent > 0 ? 'under' : 'over'}-measurement from OSM`)
      validationStatus = 'discrepancy-detected'
    } else {
      validationStatus = 'validated'
    }
  }
  
  // Calculate Microsoft variance
  let microsoftVariancePercent = 0
  let comparedToMicrosoft = false
  if (microsoftMeasurement && primaryMeasurement.adjustedAreaSqFt > 0) {
    microsoftVariancePercent = ((primaryMeasurement.adjustedAreaSqFt - microsoftMeasurement.adjustedAreaSqFt) / microsoftMeasurement.adjustedAreaSqFt) * 100
    comparedToMicrosoft = true
    
    if (Math.abs(microsoftVariancePercent) > 15) {
      warnings.push(`Significant variance (${Math.abs(microsoftVariancePercent).toFixed(1)}%) from Microsoft Building Footprints`)
      if (validationStatus === 'validated') {
        validationStatus = 'discrepancy-detected'
      }
    }
  }
  
  // Add warnings from validation result
  if (validationResult?.warnings) {
    warnings.push(...validationResult.warnings)
  }
  
  // Update status based on validation result
  if (validationResult) {
    if (validationResult.overallValidation === 'discrepancy-detected') {
      validationStatus = 'discrepancy-detected'
    } else if (validationResult.overallValidation === 'validated' && validationStatus === 'unvalidated') {
      validationStatus = 'validated'
    }
  }
  
  return {
    comparedToOSM,
    osmVariancePercent: Math.round(osmVariancePercent * 10) / 10,
    comparedToMicrosoft,
    microsoftVariancePercent: Math.round(microsoftVariancePercent * 10) / 10,
    validationStatus,
    warnings
  }
}

/**
 * Build calibration info from self-learning data
 */
export async function buildCalibrationInfo(
  lat: number,
  lng: number,
  zipCode?: string
): Promise<CalibrationInfo> {
  // Check for zip code correction model
  if (zipCode) {
    const model = getZipCodeCorrection(zipCode)
    if (model && model.sampleCount >= 3) {
      return {
        regionHasHistoricalData: true,
        calibrationFactorApplied: model.correctionFactor,
        basedOnSamples: model.sampleCount
      }
    }
  }
  
  // Check for location-based calibration
  // Note: This requires areaSqFt but we use 0 just to check if calibration exists
  const calibration = await getCalibrationForLocation(lat, lng, 0)
  if (calibration && calibration.basedOnReports > 0) {
    return {
      regionHasHistoricalData: true,
      calibrationFactorApplied: calibration.calibrationFactor,
      basedOnSamples: calibration.basedOnReports
    }
  }
  
  return {
    regionHasHistoricalData: false,
    calibrationFactorApplied: 1.0,
    basedOnSamples: 0
  }
}

/**
 * Build confidence breakdown from confidence factors
 */
export function buildConfidenceBreakdown(
  measurement: MeasurementResult,
  geometryAnalysis?: GeometryAnalysis | null,
  hasGafCalibration?: boolean,
  sourceCount?: number,
  sourceAgreementPercent?: number
): ConfidenceBreakdown {
  const factors: ConfidenceFactors = {
    imageryQuality: measurement.imageryQuality,
    imageryDate: measurement.imageryDate,
    segmentCount: measurement.segmentCount,
    pitchDegrees: measurement.pitchDegrees,
    hasGafCalibration: hasGafCalibration || false,
    hasLidarData: measurement.source === 'instant-roofer',
    sourceCount,
    sourceAgreementPercent
  }
  
  const confidenceResult = calculateConfidence(factors)
  
  return {
    score: confidenceResult.score,
    level: confidenceResult.level,
    factors: confidenceResult.factors
  }
}

/**
 * Generate full GAF-enhanced auto-trace result
 * 
 * This is the main function that combines all GAF-level algorithms
 * to produce a professional-grade report.
 */
export async function generateGAFEnhancedResult(
  autoTraceResult: AutoTraceResult,
  measurement: MeasurementResult,
  lat: number,
  lng: number,
  zipCode?: string,
  osmMeasurement?: MeasurementResult | null,
  microsoftMeasurement?: MeasurementResult | null
): Promise<GAFEnhancedAutoTraceResult> {
  // Generate GAF-equivalent output
  const gafEquivalent = generateGAFEquivalentOutput(
    measurement,
    autoTraceResult.polygon
  )
  
  // Build validation status
  const validation = buildValidationStatus(
    measurement,
    osmMeasurement,
    microsoftMeasurement
  )
  
  // Build calibration info
  const calibration = await buildCalibrationInfo(lat, lng, zipCode)
  
  // Build confidence breakdown
  const confidenceBreakdown = buildConfidenceBreakdown(
    measurement,
    null,
    calibration.regionHasHistoricalData,
    osmMeasurement && microsoftMeasurement ? 3 : osmMeasurement ? 2 : 1,
    validation.validationStatus === 'validated' ? 90 : 
    validation.validationStatus === 'discrepancy-detected' ? 70 : 50
  )
  
  return {
    polygon: autoTraceResult.polygon?.vertices || [],
    areaSqFt: measurement.adjustedAreaSqFt,
    confidence: measurement.confidence,
    gafEquivalent,
    validation,
    calibration,
    confidenceBreakdown
  }
}

/**
 * Generate GAF-enhanced result from any measurement
 * (not just auto-trace results)
 */
export async function generateGAFEnhancedFromMeasurement(
  measurement: MeasurementResult,
  lat: number,
  lng: number,
  zipCode?: string,
  polygon?: TracedPolygon | null,
  osmMeasurement?: MeasurementResult | null,
  microsoftMeasurement?: MeasurementResult | null
): Promise<GAFEnhancedAutoTraceResult> {
  // Generate GAF-equivalent output
  const gafEquivalent = generateGAFEquivalentOutput(measurement, polygon)
  
  // Build validation status
  const validation = buildValidationStatus(
    measurement,
    osmMeasurement,
    microsoftMeasurement
  )
  
  // Build calibration info
  const calibration = await buildCalibrationInfo(lat, lng, zipCode)
  
  // Build confidence breakdown
  const confidenceBreakdown = buildConfidenceBreakdown(
    measurement,
    null,
    calibration.regionHasHistoricalData,
    osmMeasurement && microsoftMeasurement ? 3 : osmMeasurement ? 2 : 1,
    validation.validationStatus === 'validated' ? 90 : 
    validation.validationStatus === 'discrepancy-detected' ? 70 : 50
  )
  
  return {
    polygon: polygon?.vertices || [],
    areaSqFt: measurement.adjustedAreaSqFt,
    confidence: measurement.confidence,
    gafEquivalent,
    validation,
    calibration,
    confidenceBreakdown
  }
}
