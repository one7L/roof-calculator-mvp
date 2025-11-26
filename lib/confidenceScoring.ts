/**
 * Confidence Scoring Module
 * 
 * Calculates confidence levels based on multiple factors:
 * - Imagery quality (HIGH/MEDIUM/LOW from Solar API)
 * - Imagery freshness (penalize if > 1-2 years old)
 * - Roof complexity (segment count)
 * - Pitch extremes (very steep > 45° reduces confidence)
 * - Source agreement (multiple sources agreeing increases confidence)
 * - GAF report calibration (if available, highest confidence)
 */

export type ImageryQuality = 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN'
export type ConfidenceLevel = 'gaf-level' | 'high' | 'moderate' | 'low'

export interface ConfidenceFactors {
  imageryQuality?: ImageryQuality
  imageryDate?: string // ISO date string
  segmentCount?: number
  pitchDegrees?: number
  sourceCount?: number
  sourceAgreementPercent?: number // 0-100, how close sources agree
  hasGafCalibration?: boolean
  hasLidarData?: boolean
}

export interface ConfidenceResult {
  score: number // 0-100
  level: ConfidenceLevel
  label: string
  color: string
  factors: {
    name: string
    impact: number
    description: string
  }[]
}

/**
 * Calculate confidence score based on multiple factors
 */
export function calculateConfidence(factors: ConfidenceFactors): ConfidenceResult {
  const factorBreakdown: { name: string; impact: number; description: string }[] = []
  
  // Base score starts at 70
  let score = 70

  // GAF calibration provides highest confidence boost
  if (factors.hasGafCalibration) {
    score = Math.min(100, score + 25)
    factorBreakdown.push({
      name: 'GAF Calibration',
      impact: 25,
      description: 'Historical GAF report provides calibration data'
    })
  }

  // LiDAR data provides high confidence
  if (factors.hasLidarData) {
    score = Math.min(100, score + 20)
    factorBreakdown.push({
      name: 'LiDAR Data',
      impact: 20,
      description: 'LiDAR-based measurements available'
    })
  }

  // Imagery quality factor
  if (factors.imageryQuality) {
    let qualityImpact = 0
    switch (factors.imageryQuality) {
      case 'HIGH':
        qualityImpact = 10
        factorBreakdown.push({
          name: 'Imagery Quality',
          impact: qualityImpact,
          description: 'High quality satellite imagery'
        })
        break
      case 'MEDIUM':
        qualityImpact = 0
        factorBreakdown.push({
          name: 'Imagery Quality',
          impact: qualityImpact,
          description: 'Medium quality satellite imagery'
        })
        break
      case 'LOW':
        qualityImpact = -15
        factorBreakdown.push({
          name: 'Imagery Quality',
          impact: qualityImpact,
          description: 'Low quality satellite imagery reduces accuracy'
        })
        break
      case 'UNKNOWN':
        qualityImpact = -10
        factorBreakdown.push({
          name: 'Imagery Quality',
          impact: qualityImpact,
          description: 'Unknown imagery quality'
        })
        break
    }
    score = Math.max(0, Math.min(100, score + qualityImpact))
  }

  // Imagery freshness factor
  if (factors.imageryDate) {
    const imageryDate = new Date(factors.imageryDate)
    const now = new Date()
    const ageInYears = (now.getTime() - imageryDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
    
    let freshnessImpact = 0
    if (ageInYears <= 1) {
      freshnessImpact = 5
      factorBreakdown.push({
        name: 'Imagery Freshness',
        impact: freshnessImpact,
        description: 'Recent imagery (< 1 year old)'
      })
    } else if (ageInYears <= 2) {
      freshnessImpact = 0
      factorBreakdown.push({
        name: 'Imagery Freshness',
        impact: freshnessImpact,
        description: 'Moderately recent imagery (1-2 years old)'
      })
    } else if (ageInYears <= 3) {
      freshnessImpact = -5
      factorBreakdown.push({
        name: 'Imagery Freshness',
        impact: freshnessImpact,
        description: 'Older imagery (2-3 years old)'
      })
    } else {
      freshnessImpact = -10
      factorBreakdown.push({
        name: 'Imagery Freshness',
        impact: freshnessImpact,
        description: 'Outdated imagery (> 3 years old)'
      })
    }
    score = Math.max(0, Math.min(100, score + freshnessImpact))
  }

  // Roof complexity (segment count) factor
  if (factors.segmentCount !== undefined) {
    let complexityImpact = 0
    if (factors.segmentCount <= 4) {
      complexityImpact = 5
      factorBreakdown.push({
        name: 'Roof Complexity',
        impact: complexityImpact,
        description: 'Simple roof structure (≤4 segments)'
      })
    } else if (factors.segmentCount <= 8) {
      complexityImpact = 0
      factorBreakdown.push({
        name: 'Roof Complexity',
        impact: complexityImpact,
        description: 'Moderate roof complexity (5-8 segments)'
      })
    } else if (factors.segmentCount <= 12) {
      complexityImpact = -5
      factorBreakdown.push({
        name: 'Roof Complexity',
        impact: complexityImpact,
        description: 'Complex roof structure (9-12 segments)'
      })
    } else {
      complexityImpact = -10
      factorBreakdown.push({
        name: 'Roof Complexity',
        impact: complexityImpact,
        description: 'Very complex roof structure (>12 segments)'
      })
    }
    score = Math.max(0, Math.min(100, score + complexityImpact))
  }

  // Pitch extremes factor
  if (factors.pitchDegrees !== undefined) {
    let pitchImpact = 0
    if (factors.pitchDegrees <= 5) {
      // Flat roof
      pitchImpact = 5
      factorBreakdown.push({
        name: 'Pitch Analysis',
        impact: pitchImpact,
        description: 'Flat or low-slope roof (easy to measure)'
      })
    } else if (factors.pitchDegrees <= 33.7) {
      // Normal pitch range (up to 8:12)
      pitchImpact = 0
      factorBreakdown.push({
        name: 'Pitch Analysis',
        impact: pitchImpact,
        description: 'Standard pitch range'
      })
    } else if (factors.pitchDegrees <= 45) {
      // Steep (8:12 to 12:12)
      pitchImpact = -5
      factorBreakdown.push({
        name: 'Pitch Analysis',
        impact: pitchImpact,
        description: 'Steep pitch may affect measurement accuracy'
      })
    } else {
      // Very steep (> 12:12)
      pitchImpact = -15
      factorBreakdown.push({
        name: 'Pitch Analysis',
        impact: pitchImpact,
        description: 'Very steep pitch significantly reduces accuracy'
      })
    }
    score = Math.max(0, Math.min(100, score + pitchImpact))
  }

  // Source count and agreement factor
  if (factors.sourceCount !== undefined && factors.sourceCount > 1) {
    let sourceImpact = 0
    const agreement = factors.sourceAgreementPercent ?? 0
    
    if (agreement >= 95) {
      sourceImpact = 15
      factorBreakdown.push({
        name: 'Source Agreement',
        impact: sourceImpact,
        description: `${factors.sourceCount} sources agree within 5%`
      })
    } else if (agreement >= 90) {
      sourceImpact = 10
      factorBreakdown.push({
        name: 'Source Agreement',
        impact: sourceImpact,
        description: `${factors.sourceCount} sources agree within 10%`
      })
    } else if (agreement >= 80) {
      sourceImpact = 5
      factorBreakdown.push({
        name: 'Source Agreement',
        impact: sourceImpact,
        description: `${factors.sourceCount} sources agree within 20%`
      })
    } else {
      sourceImpact = -5
      factorBreakdown.push({
        name: 'Source Agreement',
        impact: sourceImpact,
        description: 'Significant discrepancy between sources'
      })
    }
    score = Math.max(0, Math.min(100, score + sourceImpact))
  }

  // Determine confidence level
  const level = getConfidenceLevel(score)
  const { label, color } = getConfidenceLabelAndColor(level)

  return {
    score: Math.round(score),
    level,
    label,
    color,
    factors: factorBreakdown
  }
}

/**
 * Get confidence level from score
 */
export function getConfidenceLevel(score: number): ConfidenceLevel {
  if (score >= 90) return 'gaf-level'
  if (score >= 75) return 'high'
  if (score >= 60) return 'moderate'
  return 'low'
}

/**
 * Get label and color for confidence level
 */
export function getConfidenceLabelAndColor(level: ConfidenceLevel): { label: string; color: string } {
  switch (level) {
    case 'gaf-level':
      return { label: 'GAF-Level Confidence', color: 'green' }
    case 'high':
      return { label: 'High Confidence', color: 'blue' }
    case 'moderate':
      return { label: 'Moderate Confidence', color: 'yellow' }
    case 'low':
      return { label: 'Low Confidence - Manual Verification Recommended', color: 'red' }
  }
}

/**
 * Calculate source agreement percentage
 * Returns 100 if all sources agree perfectly, 0 if they have 100%+ variance
 * 
 * @param measurements - Array of area measurements from different sources
 * @returns Agreement percentage (0-100)
 */
export function calculateSourceAgreement(measurements: number[]): number {
  if (measurements.length === 0) return 0
  if (measurements.length === 1) return 100
  
  const average = measurements.reduce((a, b) => a + b, 0) / measurements.length
  if (average === 0) return 0
  
  const maxVariance = measurements.reduce((max, m) => {
    const variance = Math.abs((m - average) / average) * 100
    return Math.max(max, variance)
  }, 0)
  
  // Convert variance to agreement (100% agreement at 0% variance)
  return Math.max(0, 100 - maxVariance)
}
