/**
 * SOURCE COMPARATOR
 * 
 * Compares building footprints across multiple sources
 * Calculates agreement scores and identifies discrepancies
 * 
 * This module provides the core comparison logic for multi-source validation.
 */

import { BuildingFootprint } from '../enhancedOSM'
import { 
  FootprintComparison, 
  AgreementLevel,
  MultiSourceConsensus 
} from './types'

/**
 * Variance thresholds for agreement classification
 */
const VARIANCE_THRESHOLDS = {
  STRONG: 5,    // ≤5% variance = strong agreement
  MODERATE: 15, // ≤15% variance = moderate agreement
  WEAK: 25      // ≤25% variance = weak agreement
  // >25% = conflict
}

/**
 * Compare two footprints from different sources
 * 
 * @param footprint1 - First building footprint
 * @param footprint2 - Second building footprint
 * @param source1Name - Name of first source
 * @param source2Name - Name of second source
 * @returns Comparison result with variance and agreement level
 */
export function compareFootprints(
  footprint1: BuildingFootprint,
  footprint2: BuildingFootprint,
  source1Name: string = 'source1',
  source2Name: string = 'source2'
): FootprintComparison {
  const area1 = footprint1.areaSqFt
  const area2 = footprint2.areaSqFt
  
  // Calculate absolute difference
  const areaDifferenceSqFt = Math.abs(area1 - area2)
  
  // Calculate variance as percentage of the larger area
  const referenceArea = Math.max(area1, area2)
  const variancePercent = referenceArea > 0 
    ? (areaDifferenceSqFt / referenceArea) * 100 
    : 0
  
  // Determine agreement level
  const agreement = getAgreementLevel(variancePercent)
  
  return {
    source1: source1Name,
    source2: source2Name,
    areaDifferenceSqFt,
    variancePercent,
    agreement
  }
}

/**
 * Get agreement level based on variance percentage
 */
function getAgreementLevel(variancePercent: number): AgreementLevel {
  if (variancePercent <= VARIANCE_THRESHOLDS.STRONG) {
    return 'strong'
  } else if (variancePercent <= VARIANCE_THRESHOLDS.MODERATE) {
    return 'moderate'
  } else if (variancePercent <= VARIANCE_THRESHOLDS.WEAK) {
    return 'weak'
  } else {
    return 'conflict'
  }
}

/**
 * Calculate multi-source consensus from multiple footprints
 * 
 * Uses weighted averaging based on source confidence levels
 * to determine a consensus area measurement.
 * 
 * @param footprints - Array of footprints with source names
 * @returns Consensus result with confidence and discrepancies
 */
export function calculateMultiSourceConsensus(
  footprints: { source: string; footprint: BuildingFootprint }[]
): MultiSourceConsensus {
  if (footprints.length === 0) {
    return {
      consensusAreaSqFt: 0,
      confidenceScore: 0,
      agreementLevel: 'conflict',
      discrepancies: ['No footprints provided']
    }
  }
  
  if (footprints.length === 1) {
    return {
      consensusAreaSqFt: footprints[0].footprint.areaSqFt,
      confidenceScore: footprints[0].footprint.confidence,
      agreementLevel: 'strong',
      discrepancies: ['Single source - no cross-validation possible']
    }
  }
  
  // Calculate weighted average based on confidence
  let totalWeight = 0
  let weightedSum = 0
  
  for (const { footprint } of footprints) {
    const weight = footprint.confidence / 100
    weightedSum += footprint.areaSqFt * weight
    totalWeight += weight
  }
  
  const consensusAreaSqFt = totalWeight > 0 ? weightedSum / totalWeight : 0
  
  // Calculate variance from consensus for each source
  const variances = footprints.map(({ source, footprint }) => ({
    source,
    variance: consensusAreaSqFt > 0 
      ? Math.abs(footprint.areaSqFt - consensusAreaSqFt) / consensusAreaSqFt * 100
      : 0
  }))
  
  // Calculate average variance
  const avgVariance = variances.reduce((sum, v) => sum + v.variance, 0) / variances.length
  
  // Determine overall agreement level
  const agreementLevel = getAgreementLevel(avgVariance)
  
  // Calculate confidence score
  // Higher confidence when sources agree, lower when they conflict
  const baseConfidence = footprints.reduce((sum, { footprint }) => sum + footprint.confidence, 0) / footprints.length
  const agreementBonus = {
    strong: 10,
    moderate: 5,
    weak: 0,
    conflict: -15
  }
  const confidenceScore = Math.min(100, Math.max(0, baseConfidence + agreementBonus[agreementLevel]))
  
  // Identify discrepancies
  const discrepancies: string[] = []
  for (const { source, variance } of variances) {
    if (variance > VARIANCE_THRESHOLDS.MODERATE) {
      const direction = footprints.find(f => f.source === source)!.footprint.areaSqFt > consensusAreaSqFt
        ? 'larger'
        : 'smaller'
      discrepancies.push(
        `${source} is ${variance.toFixed(1)}% ${direction} than consensus`
      )
    }
  }
  
  return {
    consensusAreaSqFt,
    confidenceScore,
    agreementLevel,
    discrepancies
  }
}

/**
 * Identify sources that are statistical outliers
 * 
 * Uses the interquartile range (IQR) method to identify outliers.
 * A source is an outlier if its area is > 1.5 * IQR from Q1 or Q3.
 * 
 * @param footprints - Array of source names and areas
 * @returns Array of source names that are outliers
 */
export function identifyOutlierSources(
  footprints: { source: string; areaSqFt: number }[]
): string[] {
  if (footprints.length < 3) {
    // Not enough data points to identify outliers
    return []
  }
  
  // Sort by area
  const sorted = [...footprints].sort((a, b) => a.areaSqFt - b.areaSqFt)
  
  // Calculate Q1, Q3, and IQR
  const q1Index = Math.floor(sorted.length * 0.25)
  const q3Index = Math.floor(sorted.length * 0.75)
  
  const q1 = sorted[q1Index].areaSqFt
  const q3 = sorted[q3Index].areaSqFt
  const iqr = q3 - q1
  
  // Define outlier bounds
  const lowerBound = q1 - 1.5 * iqr
  const upperBound = q3 + 1.5 * iqr
  
  // Identify outliers
  const outliers: string[] = []
  for (const { source, areaSqFt } of footprints) {
    if (areaSqFt < lowerBound || areaSqFt > upperBound) {
      outliers.push(source)
    }
  }
  
  return outliers
}

/**
 * Calculate pairwise comparisons for all sources
 * 
 * @param footprints - Array of footprints with source names
 * @returns Array of all pairwise comparisons
 */
export function calculateAllPairwiseComparisons(
  footprints: { source: string; footprint: BuildingFootprint }[]
): FootprintComparison[] {
  const comparisons: FootprintComparison[] = []
  
  for (let i = 0; i < footprints.length; i++) {
    for (let j = i + 1; j < footprints.length; j++) {
      const comparison = compareFootprints(
        footprints[i].footprint,
        footprints[j].footprint,
        footprints[i].source,
        footprints[j].source
      )
      comparisons.push(comparison)
    }
  }
  
  return comparisons
}

/**
 * Calculate overall variance across all sources
 * 
 * Returns the coefficient of variation (CV) as a percentage.
 * Lower CV indicates better agreement across sources.
 * 
 * @param areaSqFt - Array of area measurements
 * @returns Variance as coefficient of variation (percentage)
 */
export function calculateOverallVariance(areaSqFt: number[]): number {
  if (areaSqFt.length === 0) {
    return 0
  }
  
  if (areaSqFt.length === 1) {
    return 0
  }
  
  // Calculate mean
  const mean = areaSqFt.reduce((sum, a) => sum + a, 0) / areaSqFt.length
  
  if (mean === 0) {
    return 0
  }
  
  // Calculate standard deviation
  const squaredDiffs = areaSqFt.map(a => Math.pow(a - mean, 2))
  const avgSquaredDiff = squaredDiffs.reduce((sum, d) => sum + d, 0) / areaSqFt.length
  const stdDev = Math.sqrt(avgSquaredDiff)
  
  // Return coefficient of variation as percentage
  return (stdDev / mean) * 100
}

/**
 * Get a summary of source agreement
 * 
 * @param comparisons - Array of pairwise comparisons
 * @returns Summary object with counts and percentages
 */
export function getAgreementSummary(
  comparisons: FootprintComparison[]
): {
  total: number
  strong: number
  moderate: number
  weak: number
  conflict: number
  strongPercent: number
  agreementPercent: number
} {
  const counts = {
    strong: 0,
    moderate: 0,
    weak: 0,
    conflict: 0
  }
  
  for (const comparison of comparisons) {
    counts[comparison.agreement]++
  }
  
  const total = comparisons.length
  const strongPercent = total > 0 ? (counts.strong / total) * 100 : 0
  const agreementPercent = total > 0 
    ? ((counts.strong + counts.moderate) / total) * 100 
    : 0
  
  return {
    total,
    ...counts,
    strongPercent,
    agreementPercent
  }
}
