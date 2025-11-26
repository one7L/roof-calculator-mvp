/**
 * GAF Reports Module
 * 
 * Handles GAF report storage, parsing, and calibration functionality.
 */

import { 
  GAFReport, 
  saveGAFReport, 
  getGAFReport,
  getGAFReportsByUser,
  findNearbyGAFReports,
  findGAFReportByAddress,
  calculateCalibrationFactor
} from './database'

export interface GAFReportInput {
  userId: string
  address: string
  lat: number
  lng: number
  totalSquares: number
  pitchInfo: string
  facetCount: number
  wasteFactor: number
  reportDate: string
  pdfUrl?: string
}

export interface GAFCalibrationResult {
  calibrationFactor: number
  basedOnReports: number
  lastCalibrated: string
  exactMatch?: GAFReport
}

export interface ComparisonResult {
  calculatedSqFt: number
  gafSqFt: number
  difference: number
  differencePercent: number
  calibrationApplied: boolean
  adjustedSqFt?: number
}

/**
 * Save a new GAF report
 */
export async function createGAFReport(input: GAFReportInput): Promise<GAFReport> {
  const report = await saveGAFReport({
    userId: input.userId,
    address: input.address,
    lat: input.lat,
    lng: input.lng,
    totalSquares: input.totalSquares,
    totalAreaSqFt: input.totalSquares * 100, // Convert squares to sq ft
    pitchInfo: input.pitchInfo,
    facetCount: input.facetCount,
    wasteFactor: input.wasteFactor,
    reportDate: input.reportDate,
    pdfUrl: input.pdfUrl
  })
  
  return report
}

/**
 * Get GAF report by ID
 */
export async function getGAFReportById(id: string): Promise<GAFReport | null> {
  return getGAFReport(id)
}

/**
 * Get all GAF reports for a user
 */
export async function getUserGAFReports(userId: string): Promise<GAFReport[]> {
  return getGAFReportsByUser(userId)
}

/**
 * Find a GAF report for a specific address or nearby location
 */
export async function findGAFReportForLocation(
  address: string,
  lat: number,
  lng: number
): Promise<{ exactMatch: GAFReport | null; nearbyReports: GAFReport[] }> {
  // First try exact address match
  const exactMatch = await findGAFReportByAddress(address)
  
  // Also get nearby reports for calibration
  const nearbyReports = await findNearbyGAFReports(lat, lng, 10)
  
  return { exactMatch, nearbyReports }
}

/**
 * Get calibration data for a location
 */
export async function getCalibrationForLocation(
  lat: number,
  lng: number,
  calculatedSqFt: number
): Promise<GAFCalibrationResult | null> {
  const calibration = await calculateCalibrationFactor(lat, lng, calculatedSqFt)
  
  if (!calibration) {
    return null
  }
  
  // Check for exact location match
  const nearbyReports = await findNearbyGAFReports(lat, lng, 0.1) // Very close match
  const exactMatch = nearbyReports.length > 0 ? nearbyReports[0] : undefined
  
  return {
    calibrationFactor: calibration.factor,
    basedOnReports: calibration.basedOnReports,
    lastCalibrated: calibration.lastCalibrated,
    exactMatch
  }
}

/**
 * Compare calculated measurements with GAF report
 */
export function compareWithGAFReport(
  calculatedSqFt: number,
  gafReport: GAFReport,
  calibrationFactor?: number
): ComparisonResult {
  const gafSqFt = gafReport.totalAreaSqFt
  const difference = calculatedSqFt - gafSqFt
  const differencePercent = (difference / gafSqFt) * 100
  
  const result: ComparisonResult = {
    calculatedSqFt,
    gafSqFt,
    difference,
    differencePercent,
    calibrationApplied: false
  }
  
  if (calibrationFactor && calibrationFactor !== 1.0) {
    result.calibrationApplied = true
    result.adjustedSqFt = calculatedSqFt * calibrationFactor
  }
  
  return result
}

/**
 * Parse pitch info string to degrees
 * Handles formats like "4:12", "4/12", "18 degrees", "18°"
 */
export function parsePitchInfo(pitchInfo: string): number | null {
  // Try ratio format (e.g., "4:12" or "4/12")
  const ratioMatch = pitchInfo.match(/(\d+(?:\.\d+)?)\s*[:/]\s*12/)
  if (ratioMatch) {
    const ratio = parseFloat(ratioMatch[1])
    return Math.atan(ratio / 12) * (180 / Math.PI)
  }
  
  // Try degree format (e.g., "18 degrees" or "18°")
  const degreeMatch = pitchInfo.match(/(\d+(?:\.\d+)?)\s*(?:degrees?|°)/)
  if (degreeMatch) {
    return parseFloat(degreeMatch[1])
  }
  
  // Try plain number (assume degrees)
  const plainNumber = parseFloat(pitchInfo)
  if (!isNaN(plainNumber)) {
    return plainNumber
  }
  
  return null
}

/**
 * Validate GAF report input
 */
export function validateGAFReportInput(input: Partial<GAFReportInput>): string[] {
  const errors: string[] = []
  
  if (!input.address || input.address.trim().length === 0) {
    errors.push('Address is required')
  }
  
  if (input.lat === undefined || input.lat < -90 || input.lat > 90) {
    errors.push('Valid latitude is required')
  }
  
  if (input.lng === undefined || input.lng < -180 || input.lng > 180) {
    errors.push('Valid longitude is required')
  }
  
  if (!input.totalSquares || input.totalSquares <= 0) {
    errors.push('Total squares must be a positive number')
  }
  
  if (!input.reportDate) {
    errors.push('Report date is required')
  }
  
  return errors
}
