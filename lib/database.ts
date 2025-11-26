/**
 * Database Module
 * 
 * Provides interfaces and mock database functionality for storing
 * GAF reports and calibration data.
 * 
 * In a production environment, this would connect to a real database.
 */

export interface GAFReport {
  id: string
  userId: string
  address: string
  lat: number
  lng: number
  totalSquares: number
  totalAreaSqFt: number
  pitchInfo: string
  facetCount: number
  wasteFactor: number
  reportDate: string
  uploadedAt: string
  pdfUrl?: string
}

export interface RegionalCalibration {
  id: string
  regionCode: string // e.g., "US-CA-90210" for zip-based regions
  lat: number
  lng: number
  radiusMiles: number
  calibrationFactor: number
  sampleCount: number
  lastUpdated: string
  averageVariance: number
}

export interface CalibrationDataPoint {
  reportId: string
  calculatedSqFt: number
  gafSqFt: number
  variancePercent: number
  lat: number
  lng: number
}

// In-memory storage for demo purposes
// In production, this would be replaced with actual database calls
const gafReports: Map<string, GAFReport> = new Map()
const regionalCalibrations: Map<string, RegionalCalibration> = new Map()

/**
 * Generate a unique ID
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
}

/**
 * Save a GAF report
 */
export async function saveGAFReport(report: Omit<GAFReport, 'id' | 'uploadedAt'>): Promise<GAFReport> {
  const id = generateId()
  const fullReport: GAFReport = {
    ...report,
    id,
    uploadedAt: new Date().toISOString()
  }
  gafReports.set(id, fullReport)
  
  // Update regional calibration
  await updateRegionalCalibration(fullReport)
  
  return fullReport
}

/**
 * Get a GAF report by ID
 */
export async function getGAFReport(id: string): Promise<GAFReport | null> {
  return gafReports.get(id) || null
}

/**
 * Get GAF reports by user
 */
export async function getGAFReportsByUser(userId: string): Promise<GAFReport[]> {
  const reports: GAFReport[] = []
  for (const report of gafReports.values()) {
    if (report.userId === userId) {
      reports.push(report)
    }
  }
  return reports
}

/**
 * Find GAF reports near a location
 */
export async function findNearbyGAFReports(
  lat: number,
  lng: number,
  radiusMiles: number = 5
): Promise<GAFReport[]> {
  const reports: GAFReport[] = []
  
  for (const report of gafReports.values()) {
    const distance = calculateDistance(lat, lng, report.lat, report.lng)
    if (distance <= radiusMiles) {
      reports.push(report)
    }
  }
  
  return reports.sort((a, b) => {
    const distA = calculateDistance(lat, lng, a.lat, a.lng)
    const distB = calculateDistance(lat, lng, b.lat, b.lng)
    return distA - distB
  })
}

/**
 * Get exact match GAF report for an address
 */
export async function findGAFReportByAddress(address: string): Promise<GAFReport | null> {
  const normalizedAddress = address.toLowerCase().trim()
  
  for (const report of gafReports.values()) {
    if (report.address.toLowerCase().trim() === normalizedAddress) {
      return report
    }
  }
  
  return null
}

/**
 * Get regional calibration for a location
 */
export async function getRegionalCalibration(
  lat: number,
  lng: number
): Promise<RegionalCalibration | null> {
  let bestMatch: RegionalCalibration | null = null
  let bestDistance = Infinity
  
  for (const calibration of regionalCalibrations.values()) {
    const distance = calculateDistance(lat, lng, calibration.lat, calibration.lng)
    if (distance <= calibration.radiusMiles && distance < bestDistance) {
      bestMatch = calibration
      bestDistance = distance
    }
  }
  
  return bestMatch
}

/**
 * Update regional calibration based on a new GAF report
 */
async function updateRegionalCalibration(report: GAFReport): Promise<void> {
  const regionCode = generateRegionCode(report.lat, report.lng)
  
  const existing = regionalCalibrations.get(regionCode)
  
  if (existing) {
    // Update existing calibration with new data point
    const newSampleCount = existing.sampleCount + 1
    existing.sampleCount = newSampleCount
    existing.lastUpdated = new Date().toISOString()
    regionalCalibrations.set(regionCode, existing)
  } else {
    // Create new regional calibration
    const newCalibration: RegionalCalibration = {
      id: generateId(),
      regionCode,
      lat: report.lat,
      lng: report.lng,
      radiusMiles: 10, // Default radius
      calibrationFactor: 1.0, // Will be updated with actual calculations
      sampleCount: 1,
      lastUpdated: new Date().toISOString(),
      averageVariance: 0
    }
    regionalCalibrations.set(regionCode, newCalibration)
  }
}

/**
 * Generate a region code from coordinates
 * Uses a simple grid-based approach
 */
function generateRegionCode(lat: number, lng: number): string {
  // Round to nearest 0.1 degrees (roughly 7-11 miles depending on latitude)
  const latGrid = Math.round(lat * 10) / 10
  const lngGrid = Math.round(lng * 10) / 10
  return `${latGrid},${lngGrid}`
}

/**
 * Calculate distance between two points using Haversine formula
 * Returns distance in miles
 */
function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 3959 // Earth's radius in miles
  const dLat = toRadians(lat2 - lat1)
  const dLng = toRadians(lng2 - lng1)
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2)
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180)
}

/**
 * Calculate calibration factor from historical data
 * Returns a factor to apply to calculated measurements
 */
export async function calculateCalibrationFactor(
  lat: number,
  lng: number,
  calculatedSqFt: number
): Promise<{ factor: number; basedOnReports: number; lastCalibrated: string } | null> {
  const nearbyReports = await findNearbyGAFReports(lat, lng, 15)
  
  if (nearbyReports.length === 0) {
    return null
  }
  
  // Calculate average ratio of GAF to calculated (weighted by proximity)
  let totalWeight = 0
  let weightedSum = 0
  
  for (const report of nearbyReports) {
    const distance = calculateDistance(lat, lng, report.lat, report.lng)
    const weight = 1 / (1 + distance) // Closer reports have more weight
    
    // We'd need to store the original calculated value to compute this properly
    // For now, we return a factor of 1.0 (no adjustment) as a placeholder
    totalWeight += weight
    weightedSum += weight * 1.0
  }
  
  const factor = totalWeight > 0 ? weightedSum / totalWeight : 1.0
  const mostRecent = nearbyReports.reduce((latest, report) => {
    return new Date(report.uploadedAt) > new Date(latest.uploadedAt) ? report : latest
  })
  
  return {
    factor,
    basedOnReports: nearbyReports.length,
    lastCalibrated: mostRecent.uploadedAt
  }
}

/**
 * Get all regional calibration data for admin/debug purposes
 */
export async function getAllRegionalCalibrations(): Promise<RegionalCalibration[]> {
  return Array.from(regionalCalibrations.values())
}

/**
 * Clear all stored data (for testing purposes)
 */
export async function clearAllData(): Promise<void> {
  gafReports.clear()
  regionalCalibrations.clear()
}
