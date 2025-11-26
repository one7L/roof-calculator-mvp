/**
 * Self-Learning Module (Layer 3)
 * 
 * Learns from every GAF report and correction to improve future measurements:
 * - Store correction factors by zip code
 * - Weighted moving average for calibration
 * - Apply learned corrections to future measurements
 * - Gets smarter over time
 * 
 * This is part of the 3-layer autonomous self-tracing & self-learning system
 * designed to achieve 90-95% accuracy using only FREE data sources.
 */

import { MeasurementResult, MeasurementSource } from './roofMeasurement'
import { GAFReport } from './database'

/**
 * Correction data point from a single measurement comparison
 */
export interface CorrectionDataPoint {
  id: string
  zipCode: string
  osmAreaSqFt: number
  groundTruthSqFt: number // From GAF report or LiDAR
  correctionFactor: number // groundTruth / osm
  source: 'gaf-report' | 'lidar' | 'manual-verification'
  timestamp: string
  buildingType?: string
  roofComplexity?: string
  confidence: number
}

/**
 * Learned correction model for a zip code
 */
export interface ZipCodeCorrectionModel {
  zipCode: string
  correctionFactor: number
  sampleCount: number
  weightedConfidence: number
  lastUpdated: string
  dataPoints: CorrectionDataPoint[]
  trendDirection: 'stable' | 'improving' | 'degrading'
  recommendedAction: 'apply-correction' | 'needs-more-data' | 'high-confidence'
}

/**
 * Self-learning system state
 */
export interface SelfLearningState {
  totalDataPoints: number
  zipCodesModeled: number
  averageAccuracyImprovement: number
  lastGlobalUpdate: string
  topPerformingZips: string[]
  needsAttentionZips: string[]
}

/**
 * Learning configuration
 */
export interface SelfLearningConfig {
  minDataPointsForCorrection: number // Default: 3
  maxDataPointAge: number // Days, default: 365
  weightDecayFactor: number // Default: 0.9 (per year)
  outlierThreshold: number // Default: 2.0 (std deviations)
  confidenceBoostPerSample: number // Default: 5
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: SelfLearningConfig = {
  minDataPointsForCorrection: 3,
  maxDataPointAge: 365,
  weightDecayFactor: 0.9,
  outlierThreshold: 2.0,
  confidenceBoostPerSample: 5
}

/**
 * In-memory storage for correction models
 * In production, this should be persisted to a database
 */
const zipCodeModels: Map<string, ZipCodeCorrectionModel> = new Map()
const dataPoints: Map<string, CorrectionDataPoint> = new Map()

/**
 * Generate a unique ID
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
}

/**
 * Learn from a GAF report by comparing it with OSM measurement
 * 
 * @param gafReport - The GAF report with ground truth data
 * @param osmMeasurement - The OSM measurement for the same building
 * @param zipCode - The zip code for regional learning
 * @returns The created correction data point
 */
export async function learnFromGAFReport(
  gafReport: GAFReport,
  osmMeasurement: MeasurementResult,
  zipCode: string
): Promise<CorrectionDataPoint> {
  const normalizedZip = zipCode.substring(0, 5)
  
  const groundTruthSqFt = gafReport.totalAreaSqFt
  const osmAreaSqFt = osmMeasurement.adjustedAreaSqFt
  const correctionFactor = osmAreaSqFt > 0 ? groundTruthSqFt / osmAreaSqFt : 1

  const dataPoint: CorrectionDataPoint = {
    id: generateId(),
    zipCode: normalizedZip,
    osmAreaSqFt,
    groundTruthSqFt,
    correctionFactor,
    source: 'gaf-report',
    timestamp: new Date().toISOString(),
    roofComplexity: osmMeasurement.complexity,
    confidence: osmMeasurement.confidence
  }

  // Store the data point
  dataPoints.set(dataPoint.id, dataPoint)

  // Update the zip code model
  await updateZipCodeModel(normalizedZip, dataPoint)

  return dataPoint
}

/**
 * Learn from a LiDAR measurement comparison
 */
export async function learnFromLiDAR(
  lidarAreaSqFt: number,
  osmMeasurement: MeasurementResult,
  zipCode: string
): Promise<CorrectionDataPoint> {
  const normalizedZip = zipCode.substring(0, 5)
  
  const osmAreaSqFt = osmMeasurement.adjustedAreaSqFt
  const correctionFactor = osmAreaSqFt > 0 ? lidarAreaSqFt / osmAreaSqFt : 1

  const dataPoint: CorrectionDataPoint = {
    id: generateId(),
    zipCode: normalizedZip,
    osmAreaSqFt,
    groundTruthSqFt: lidarAreaSqFt,
    correctionFactor,
    source: 'lidar',
    timestamp: new Date().toISOString(),
    roofComplexity: osmMeasurement.complexity,
    confidence: 95 // LiDAR is highly accurate
  }

  dataPoints.set(dataPoint.id, dataPoint)
  await updateZipCodeModel(normalizedZip, dataPoint)

  return dataPoint
}

/**
 * Update the correction model for a zip code
 */
async function updateZipCodeModel(
  zipCode: string,
  newDataPoint: CorrectionDataPoint,
  config: SelfLearningConfig = DEFAULT_CONFIG
): Promise<void> {
  const existing = zipCodeModels.get(zipCode)
  
  if (existing) {
    // Add new data point to existing model
    existing.dataPoints.push(newDataPoint)
    
    // Recalculate weighted correction factor
    const { factor, confidence } = calculateWeightedCorrectionFactor(
      existing.dataPoints,
      config
    )
    
    existing.correctionFactor = factor
    existing.weightedConfidence = confidence
    existing.sampleCount = existing.dataPoints.length
    existing.lastUpdated = new Date().toISOString()
    existing.trendDirection = calculateTrend(existing.dataPoints)
    existing.recommendedAction = determineRecommendedAction(existing, config)
    
    zipCodeModels.set(zipCode, existing)
  } else {
    // Create new model
    const newModel: ZipCodeCorrectionModel = {
      zipCode,
      correctionFactor: newDataPoint.correctionFactor,
      sampleCount: 1,
      weightedConfidence: newDataPoint.confidence,
      lastUpdated: new Date().toISOString(),
      dataPoints: [newDataPoint],
      trendDirection: 'stable',
      recommendedAction: 'needs-more-data'
    }
    
    zipCodeModels.set(zipCode, newModel)
  }
}

/**
 * Calculate weighted correction factor from data points
 * Uses weighted moving average with recency and confidence weights
 */
function calculateWeightedCorrectionFactor(
  points: CorrectionDataPoint[],
  config: SelfLearningConfig
): { factor: number; confidence: number } {
  if (points.length === 0) {
    return { factor: 1, confidence: 0 }
  }

  const now = new Date()
  let weightedSum = 0
  let totalWeight = 0
  let confidenceSum = 0

  // Filter out outliers
  const factors = points.map(p => p.correctionFactor)
  const mean = factors.reduce((a, b) => a + b, 0) / factors.length
  const stdDev = Math.sqrt(
    factors.reduce((sum, f) => sum + Math.pow(f - mean, 2), 0) / factors.length
  )

  for (const point of points) {
    // Skip outliers
    if (Math.abs(point.correctionFactor - mean) > config.outlierThreshold * stdDev) {
      continue
    }

    // Calculate age in years
    const ageMs = now.getTime() - new Date(point.timestamp).getTime()
    const ageYears = ageMs / (365.25 * 24 * 60 * 60 * 1000)

    // Skip data points that are too old
    if (ageYears * 365 > config.maxDataPointAge) {
      continue
    }

    // Weight based on recency and confidence
    const recencyWeight = Math.pow(config.weightDecayFactor, ageYears)
    const confidenceWeight = point.confidence / 100
    const sourceWeight = point.source === 'lidar' ? 1.2 : 
                         point.source === 'gaf-report' ? 1.0 : 0.8
    
    const weight = recencyWeight * confidenceWeight * sourceWeight

    weightedSum += point.correctionFactor * weight
    totalWeight += weight
    confidenceSum += point.confidence * weight
  }

  if (totalWeight === 0) {
    return { factor: 1, confidence: 0 }
  }

  return {
    factor: weightedSum / totalWeight,
    confidence: Math.min(95, confidenceSum / totalWeight + 
      (points.length - 1) * config.confidenceBoostPerSample)
  }
}

/**
 * Calculate trend direction from data points
 */
function calculateTrend(points: CorrectionDataPoint[]): 'stable' | 'improving' | 'degrading' {
  if (points.length < 3) {
    return 'stable'
  }

  // Sort by timestamp
  const sorted = [...points].sort((a, b) => 
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  )

  // Compare recent vs older correction factors
  const midpoint = Math.floor(sorted.length / 2)
  const olderAvg = sorted.slice(0, midpoint).reduce((s, p) => s + p.correctionFactor, 0) / midpoint
  const recentAvg = sorted.slice(midpoint).reduce((s, p) => s + p.correctionFactor, 0) / (sorted.length - midpoint)

  const change = Math.abs(recentAvg - olderAvg)
  
  if (change < 0.02) {
    return 'stable'
  }
  
  // If correction factor is moving toward 1.0, accuracy is improving
  const movingTowardOne = Math.abs(recentAvg - 1) < Math.abs(olderAvg - 1)
  return movingTowardOne ? 'improving' : 'degrading'
}

/**
 * Determine recommended action based on model state
 */
function determineRecommendedAction(
  model: ZipCodeCorrectionModel,
  config: SelfLearningConfig
): 'apply-correction' | 'needs-more-data' | 'high-confidence' {
  if (model.sampleCount < config.minDataPointsForCorrection) {
    return 'needs-more-data'
  }

  if (model.weightedConfidence >= 85 && model.sampleCount >= 5) {
    return 'high-confidence'
  }

  return 'apply-correction'
}

/**
 * Get the correction factor for a zip code
 * 
 * @param zipCode - The zip code to get correction for
 * @returns The correction model if available, null otherwise
 */
export function getZipCodeCorrection(zipCode: string): ZipCodeCorrectionModel | null {
  const normalizedZip = zipCode.substring(0, 5)
  return zipCodeModels.get(normalizedZip) || null
}

/**
 * Apply learned correction to a measurement
 * 
 * @param measurement - The measurement to correct
 * @param zipCode - The zip code for lookup
 * @param config - Optional configuration
 * @returns Corrected measurement and correction details
 */
export function applyLearnedCorrection(
  measurement: MeasurementResult,
  zipCode: string,
  config: SelfLearningConfig = DEFAULT_CONFIG
): { 
  correctedMeasurement: MeasurementResult; 
  correctionApplied: boolean; 
  correctionDetails: CorrectionDetails 
} {
  const model = getZipCodeCorrection(zipCode)
  
  if (!model || model.sampleCount < config.minDataPointsForCorrection) {
    return {
      correctedMeasurement: measurement,
      correctionApplied: false,
      correctionDetails: {
        reason: model ? 'insufficient-data' : 'no-model',
        originalAreaSqFt: measurement.adjustedAreaSqFt,
        correctedAreaSqFt: measurement.adjustedAreaSqFt,
        correctionFactor: 1,
        confidenceBoost: 0,
        dataPointCount: model?.sampleCount || 0
      }
    }
  }

  // Apply the correction
  const correctedAreaSqFt = measurement.adjustedAreaSqFt * model.correctionFactor
  const confidenceBoost = Math.min(15, model.weightedConfidence - measurement.confidence)
  
  const correctedMeasurement: MeasurementResult = {
    ...measurement,
    adjustedAreaSqFt: correctedAreaSqFt,
    squares: correctedAreaSqFt / 100,
    confidence: Math.min(95, measurement.confidence + Math.max(0, confidenceBoost)),
    warning: `${measurement.warning || ''} Self-learning correction applied (factor: ${model.correctionFactor.toFixed(3)}, based on ${model.sampleCount} samples).`.trim()
  }

  return {
    correctedMeasurement,
    correctionApplied: true,
    correctionDetails: {
      reason: 'correction-applied',
      originalAreaSqFt: measurement.adjustedAreaSqFt,
      correctedAreaSqFt,
      correctionFactor: model.correctionFactor,
      confidenceBoost: Math.max(0, confidenceBoost),
      dataPointCount: model.sampleCount
    }
  }
}

/**
 * Correction details for transparency
 */
export interface CorrectionDetails {
  reason: 'correction-applied' | 'insufficient-data' | 'no-model'
  originalAreaSqFt: number
  correctedAreaSqFt: number
  correctionFactor: number
  confidenceBoost: number
  dataPointCount: number
}

/**
 * Get the current state of the self-learning system
 */
export function getSelfLearningState(): SelfLearningState {
  const models = Array.from(zipCodeModels.values())
  
  // Calculate average improvement
  const improvements = models
    .filter(m => m.sampleCount >= 3)
    .map(m => Math.abs(m.correctionFactor - 1) * 100)
  
  const avgImprovement = improvements.length > 0
    ? improvements.reduce((a, b) => a + b, 0) / improvements.length
    : 0

  // Find top performing and needs-attention zips
  const sortedByConfidence = models
    .filter(m => m.sampleCount >= 3)
    .sort((a, b) => b.weightedConfidence - a.weightedConfidence)
  
  const topPerforming = sortedByConfidence
    .slice(0, 5)
    .map(m => m.zipCode)
  
  const needsAttention = sortedByConfidence
    .filter(m => m.weightedConfidence < 70 || Math.abs(m.correctionFactor - 1) > 0.2)
    .slice(0, 5)
    .map(m => m.zipCode)

  return {
    totalDataPoints: dataPoints.size,
    zipCodesModeled: zipCodeModels.size,
    averageAccuracyImprovement: avgImprovement,
    lastGlobalUpdate: new Date().toISOString(),
    topPerformingZips: topPerforming,
    needsAttentionZips: needsAttention
  }
}

/**
 * Get all zip code models (for admin/debug purposes)
 */
export function getAllZipCodeModels(): ZipCodeCorrectionModel[] {
  return Array.from(zipCodeModels.values())
}

/**
 * Import historical GAF data for bulk learning
 * Useful for bootstrapping the system with existing data
 */
export async function importHistoricalData(
  reports: Array<{
    gafAreaSqFt: number
    osmAreaSqFt: number
    zipCode: string
    timestamp: string
    source: 'gaf-report' | 'lidar' | 'manual-verification'
  }>
): Promise<{ imported: number; errors: string[] }> {
  const errors: string[] = []
  let imported = 0

  for (const report of reports) {
    try {
      const normalizedZip = report.zipCode.substring(0, 5)
      const correctionFactor = report.osmAreaSqFt > 0 
        ? report.gafAreaSqFt / report.osmAreaSqFt 
        : 1

      const dataPoint: CorrectionDataPoint = {
        id: generateId(),
        zipCode: normalizedZip,
        osmAreaSqFt: report.osmAreaSqFt,
        groundTruthSqFt: report.gafAreaSqFt,
        correctionFactor,
        source: report.source,
        timestamp: report.timestamp,
        confidence: report.source === 'lidar' ? 95 : 
                   report.source === 'gaf-report' ? 90 : 75
      }

      dataPoints.set(dataPoint.id, dataPoint)
      await updateZipCodeModel(normalizedZip, dataPoint)
      imported++
    } catch (error) {
      errors.push(`Failed to import data for zip ${report.zipCode}: ${error}`)
    }
  }

  return { imported, errors }
}

/**
 * Predict expected accuracy for a location based on learned data
 */
export function predictAccuracy(
  zipCode: string,
  osmConfidence: number
): { 
  expectedAccuracy: number; 
  hasLocalData: boolean; 
  recommendation: string 
} {
  const model = getZipCodeCorrection(zipCode)
  
  if (!model || model.sampleCount < 3) {
    return {
      expectedAccuracy: Math.min(osmConfidence, 75),
      hasLocalData: false,
      recommendation: 'Consider uploading a GAF report to improve accuracy for this area'
    }
  }

  // Calculate expected accuracy based on historical corrections
  const underMeasurementPercent = Math.abs(1 - model.correctionFactor) * 100
  const baseAccuracy = 100 - underMeasurementPercent
  const expectedAccuracy = Math.min(
    95,
    baseAccuracy + (model.weightedConfidence - 70) * 0.2
  )

  let recommendation: string
  if (model.recommendedAction === 'high-confidence') {
    recommendation = 'High confidence in measurements for this area'
  } else if (underMeasurementPercent > 15) {
    recommendation = `OSM typically under-measures by ${underMeasurementPercent.toFixed(1)}% in this area. Correction will be applied.`
  } else {
    recommendation = 'Measurements should be accurate with applied corrections'
  }

  return {
    expectedAccuracy,
    hasLocalData: true,
    recommendation
  }
}

/**
 * Clear all learned data (for testing purposes)
 */
export async function clearAllLearningData(): Promise<void> {
  zipCodeModels.clear()
  dataPoints.clear()
}

/**
 * Export learning data for backup or transfer
 */
export function exportLearningData(): {
  models: ZipCodeCorrectionModel[]
  dataPoints: CorrectionDataPoint[]
} {
  return {
    models: Array.from(zipCodeModels.values()),
    dataPoints: Array.from(dataPoints.values())
  }
}

/**
 * Import learning data from backup
 */
export async function importLearningData(data: {
  models: ZipCodeCorrectionModel[]
  dataPoints: CorrectionDataPoint[]
}): Promise<void> {
  // Import data points first
  for (const point of data.dataPoints) {
    dataPoints.set(point.id, point)
  }

  // Then import models
  for (const model of data.models) {
    zipCodeModels.set(model.zipCode, model)
  }
}
