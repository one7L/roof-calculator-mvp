/**
 * Pitch Calculations Module
 * 
 * Provides geometrically accurate pitch multiplier calculations using the formula:
 * multiplier = sqrt((pitch/12)² + 1)
 * 
 * Also includes a validation lookup table for common pitches.
 */

// Standard pitch multipliers lookup table for validation
// Pitch format: rise:12 (e.g., 4:12 means 4 inches rise per 12 inches run)
export const STANDARD_PITCH_MULTIPLIERS: Record<string, { degrees: number; multiplier: number }> = {
  '0:12': { degrees: 0, multiplier: 1.0 },
  '1:12': { degrees: 4.76, multiplier: 1.003 },
  '2:12': { degrees: 9.46, multiplier: 1.014 },
  '3:12': { degrees: 14.04, multiplier: 1.031 },
  '4:12': { degrees: 18.43, multiplier: 1.054 },
  '5:12': { degrees: 22.62, multiplier: 1.083 },
  '6:12': { degrees: 26.57, multiplier: 1.118 },
  '7:12': { degrees: 30.26, multiplier: 1.158 },
  '8:12': { degrees: 33.69, multiplier: 1.202 },
  '9:12': { degrees: 36.87, multiplier: 1.250 },
  '10:12': { degrees: 39.81, multiplier: 1.302 },
  '11:12': { degrees: 42.51, multiplier: 1.357 },
  '12:12': { degrees: 45.0, multiplier: 1.414 },
  '14:12': { degrees: 49.40, multiplier: 1.537 },
  '16:12': { degrees: 53.13, multiplier: 1.667 },
  '18:12': { degrees: 56.31, multiplier: 1.803 },
}

/**
 * Calculate pitch multiplier from pitch ratio (rise:12)
 * Uses the geometric formula: sqrt((pitch/12)² + 1)
 * 
 * @param pitchRatio - The pitch ratio (e.g., 4 for 4:12 pitch)
 * @returns The pitch multiplier
 */
export function calculatePitchMultiplierFromRatio(pitchRatio: number): number {
  return Math.sqrt(Math.pow(pitchRatio / 12, 2) + 1)
}

/**
 * Convert pitch ratio (rise:12) to degrees
 * 
 * @param pitchRatio - The pitch ratio (e.g., 4 for 4:12 pitch)
 * @returns The pitch angle in degrees
 */
export function pitchRatioToDegrees(pitchRatio: number): number {
  return Math.atan(pitchRatio / 12) * (180 / Math.PI)
}

/**
 * Convert pitch degrees to pitch ratio (rise:12)
 * 
 * @param degrees - The pitch angle in degrees
 * @returns The pitch ratio (e.g., 4 for 4:12 pitch)
 */
export function degreesToPitchRatio(degrees: number): number {
  return Math.tan(degrees * (Math.PI / 180)) * 12
}

/**
 * Calculate pitch multiplier from degrees
 * First converts to ratio, then applies the geometric formula
 * 
 * @param degrees - The pitch angle in degrees
 * @returns The pitch multiplier
 */
export function calculatePitchMultiplierFromDegrees(degrees: number): number {
  const pitchRatio = degreesToPitchRatio(degrees)
  return calculatePitchMultiplierFromRatio(pitchRatio)
}

/**
 * Get the nearest standard pitch from degrees
 * Useful for displaying user-friendly pitch values
 * 
 * @param degrees - The pitch angle in degrees
 * @returns The nearest standard pitch label (e.g., "4:12")
 */
export function getNearestStandardPitch(degrees: number): string {
  let nearestPitch = '0:12'
  let minDiff = Math.abs(degrees)

  for (const [pitch, data] of Object.entries(STANDARD_PITCH_MULTIPLIERS)) {
    const diff = Math.abs(degrees - data.degrees)
    if (diff < minDiff) {
      minDiff = diff
      nearestPitch = pitch
    }
  }

  return nearestPitch
}

/**
 * Validate a calculated multiplier against the standard lookup table
 * Returns true if the calculated value is within 1% of the standard value
 * 
 * @param pitchRatio - The pitch ratio (e.g., 4 for 4:12)
 * @param calculatedMultiplier - The calculated multiplier to validate
 * @returns Whether the multiplier is valid
 */
export function validateMultiplier(pitchRatio: number, calculatedMultiplier: number): boolean {
  const key = `${pitchRatio}:12`
  const standard = STANDARD_PITCH_MULTIPLIERS[key]
  
  if (!standard) {
    // No standard to compare against, accept calculated value
    return true
  }

  const percentDiff = Math.abs((calculatedMultiplier - standard.multiplier) / standard.multiplier) * 100
  return percentDiff <= 1 // Accept if within 1%
}

export interface RoofSegment {
  pitchDegrees: number
  stats?: {
    areaMeters2?: number
  }
}

/**
 * Calculate weighted average pitch from roof segments
 * Weights each segment's pitch by its area
 * 
 * @param roofSegments - Array of roof segments with pitch and area data
 * @returns Weighted average pitch in degrees
 */
export function calculateWeightedAveragePitch(roofSegments: RoofSegment[]): number {
  let weightedPitchSum = 0
  let totalAreaSqM = 0

  roofSegments.forEach((segment) => {
    const segmentArea = segment.stats?.areaMeters2 || 0
    weightedPitchSum += segment.pitchDegrees * segmentArea
    totalAreaSqM += segmentArea
  })

  return totalAreaSqM > 0 ? weightedPitchSum / totalAreaSqM : 0
}

/**
 * Calculate total roof area with pitch adjustment
 * 
 * @param baseAreaSqFt - The base (footprint) area in square feet
 * @param pitchDegrees - The pitch angle in degrees
 * @returns The adjusted area accounting for roof pitch
 */
export function calculateAdjustedArea(baseAreaSqFt: number, pitchDegrees: number): number {
  const multiplier = calculatePitchMultiplierFromDegrees(pitchDegrees)
  return baseAreaSqFt * multiplier
}

/**
 * Convert square feet to roofing squares
 * One roofing square = 100 sq ft
 * 
 * @param areaSqFt - Area in square feet
 * @returns Number of roofing squares
 */
export function areaToSquares(areaSqFt: number): number {
  return areaSqFt / 100
}

/**
 * Get pitch category for complexity scoring
 * 
 * @param degrees - Pitch in degrees
 * @returns Pitch category string
 */
export function getPitchCategory(degrees: number): 'flat' | 'low' | 'medium' | 'steep' | 'very-steep' {
  if (degrees <= 5) return 'flat'
  if (degrees <= 18.5) return 'low' // Up to 4:12
  if (degrees <= 33.7) return 'medium' // 4:12 to 8:12
  if (degrees <= 45) return 'steep' // 8:12 to 12:12
  return 'very-steep' // > 12:12
}
