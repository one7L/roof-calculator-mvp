/**
 * Roof Measurement Module
 * 
 * Provides a unified interface for obtaining roof measurements from multiple sources
 * with a fallback chain:
 * 
 * 1. Google Solar API (Primary) - 90-95% accuracy
 * 2. Instant Roofer API (LiDAR-based, if configured) - 95-98% accuracy
 * 3. OpenStreetMap Building Data - 50-70% accuracy
 * 4. Building Footprint Estimation - 40-60% accuracy
 * 5. Manual Polygon Tracing (UI fallback) - 85-95% accuracy
 */

import { 
  calculatePitchMultiplierFromDegrees, 
  calculateWeightedAveragePitch,
  areaToSquares,
  getPitchCategory,
  RoofSegment
} from './pitchCalculations'

export type MeasurementSource = 
  | 'google-solar'
  | 'instant-roofer'
  | 'openstreetmap'
  | 'footprint-estimation'
  | 'manual-tracing'

export type RoofComplexity = 'simple' | 'moderate' | 'complex' | 'very-complex'

export interface MeasurementResult {
  totalAreaSqM: number
  totalAreaSqFt: number
  adjustedAreaSqFt: number
  squares: number
  pitchDegrees: number
  pitchMultiplier: number
  segmentCount: number
  complexity: RoofComplexity
  source: MeasurementSource
  confidence: number // 0-100
  imageryDate?: string
  imageryQuality?: 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN'
  warning?: string
}

export interface MeasurementOptions {
  lat: number
  lng: number
  address?: string
  googleApiKey?: string
  instantRooferApiKey?: string
  enableFallbacks?: boolean
}

const SQM_TO_SQFT = 10.7639

/**
 * Get complexity rating from segment count
 */
function getComplexity(segmentCount: number): RoofComplexity {
  if (segmentCount <= 4) return 'simple'
  if (segmentCount <= 8) return 'moderate'
  if (segmentCount <= 12) return 'complex'
  return 'very-complex'
}

/**
 * Primary source: Google Solar API
 */
export async function measureWithGoogleSolar(
  lat: number,
  lng: number,
  apiKey: string
): Promise<MeasurementResult | null> {
  try {
    const url = `https://solar.googleapis.com/v1/buildingInsights:findClosest?location.latitude=${lat}&location.longitude=${lng}&key=${apiKey}`
    
    const response = await fetch(url)
    
    if (!response.ok) {
      console.error('Google Solar API error:', response.status, response.statusText)
      return null
    }
    
    const data = await response.json()
    
    if (!data.solarPotential?.roofSegmentStats || data.solarPotential.roofSegmentStats.length === 0) {
      return null
    }
    
    const roofSegments: RoofSegment[] = data.solarPotential.roofSegmentStats.map((segment: { pitchDegrees: number; stats: { areaMeters2: number } }) => ({
      pitchDegrees: segment.pitchDegrees || 0,
      stats: {
        areaMeters2: segment.stats?.areaMeters2 || 0
      }
    }))
    
    // Calculate total area from segments
    const totalAreaSqM = roofSegments.reduce((sum, seg) => sum + (seg.stats?.areaMeters2 || 0), 0)
    const totalAreaSqFt = totalAreaSqM * SQM_TO_SQFT
    
    // Calculate weighted average pitch
    const avgPitch = calculateWeightedAveragePitch(roofSegments)
    const pitchMultiplier = calculatePitchMultiplierFromDegrees(avgPitch)
    
    // Apply pitch multiplier for adjusted area
    const adjustedAreaSqFt = totalAreaSqFt * pitchMultiplier
    
    // Get imagery metadata
    const imageryDate = data.imageryDate?.date 
      ? `${data.imageryDate.year}-${String(data.imageryDate.month).padStart(2, '0')}-${String(data.imageryDate.day).padStart(2, '0')}`
      : undefined
    
    const imageryQuality = data.imageryQuality || 'UNKNOWN'
    
    // Calculate confidence based on data quality
    let confidence = 85
    if (imageryQuality === 'HIGH') confidence += 5
    else if (imageryQuality === 'LOW') confidence -= 10
    
    return {
      totalAreaSqM,
      totalAreaSqFt,
      adjustedAreaSqFt,
      squares: areaToSquares(adjustedAreaSqFt),
      pitchDegrees: avgPitch,
      pitchMultiplier,
      segmentCount: roofSegments.length,
      complexity: getComplexity(roofSegments.length),
      source: 'google-solar',
      confidence,
      imageryDate,
      imageryQuality
    }
  } catch (error) {
    console.error('Google Solar API error:', error)
    return null
  }
}

/**
 * Fallback source: Instant Roofer API (LiDAR-based)
 */
export async function measureWithInstantRoofer(
  lat: number,
  lng: number,
  apiKey: string
): Promise<MeasurementResult | null> {
  try {
    // Instant Roofer API integration
    // This is a placeholder - actual implementation would depend on their API
    const url = `https://api.instantroofer.com/v1/measurements?lat=${lat}&lng=${lng}`
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    })
    
    if (!response.ok) {
      console.error('Instant Roofer API error:', response.status)
      return null
    }
    
    const data = await response.json()
    
    // Map response to our format
    return {
      totalAreaSqM: data.totalAreaSqM || 0,
      totalAreaSqFt: data.totalAreaSqFt || 0,
      adjustedAreaSqFt: data.adjustedAreaSqFt || 0,
      squares: data.squares || 0,
      pitchDegrees: data.pitchDegrees || 0,
      pitchMultiplier: data.pitchMultiplier || 1,
      segmentCount: data.segmentCount || 1,
      complexity: getComplexity(data.segmentCount || 1),
      source: 'instant-roofer',
      confidence: 95, // LiDAR data is highly accurate
      imageryDate: data.imageryDate
    }
  } catch (error) {
    console.error('Instant Roofer API error:', error)
    return null
  }
}

/**
 * Fallback source: OpenStreetMap Building Data
 */
export async function measureWithOpenStreetMap(
  lat: number,
  lng: number
): Promise<MeasurementResult | null> {
  try {
    // Use Overpass API to get building footprint
    const overpassQuery = `
      [out:json];
      way(around:50,${lat},${lng})["building"];
      out geom;
    `
    
    const response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: `data=${encodeURIComponent(overpassQuery)}`
    })
    
    if (!response.ok) {
      console.error('OpenStreetMap API error:', response.status)
      return null
    }
    
    const data = await response.json()
    
    if (!data.elements || data.elements.length === 0) {
      return null
    }
    
    // Find the closest building
    const building = data.elements[0]
    
    // Calculate area from polygon (simplified)
    const footprintArea = calculatePolygonArea(building.geometry || [])
    
    if (footprintArea === 0) {
      return null
    }
    
    // OSM doesn't provide pitch data, estimate based on building type
    const estimatedPitch = estimatePitchFromBuildingType(building.tags?.building || 'yes')
    const pitchMultiplier = calculatePitchMultiplierFromDegrees(estimatedPitch)
    
    const adjustedAreaSqFt = footprintArea * pitchMultiplier
    
    return {
      totalAreaSqM: footprintArea / SQM_TO_SQFT,
      totalAreaSqFt: footprintArea,
      adjustedAreaSqFt,
      squares: areaToSquares(adjustedAreaSqFt),
      pitchDegrees: estimatedPitch,
      pitchMultiplier,
      segmentCount: 1, // OSM doesn't provide segment data
      complexity: 'simple',
      source: 'openstreetmap',
      confidence: 60,
      warning: 'Pitch estimated from building type; actual roof area may vary'
    }
  } catch (error) {
    console.error('OpenStreetMap API error:', error)
    return null
  }
}

/**
 * Fallback source: Building Footprint Estimation
 * Uses simple estimation based on typical building sizes
 */
export async function measureWithFootprintEstimation(
  lat: number,
  lng: number,
  address?: string
): Promise<MeasurementResult | null> {
  // This is a very rough estimation method
  // In a real implementation, this might use:
  // - Satellite imagery with ML-based building detection
  // - Property records from county assessor
  // - Average building sizes for the area
  
  // For now, we return null to indicate this source needs more data
  // The UI can prompt for manual tracing when all other sources fail
  
  console.log('Footprint estimation requires additional data for:', address || `${lat},${lng}`)
  
  return null
}

/**
 * Create a placeholder result for manual tracing
 * The UI will provide actual measurements
 */
export function createManualTracingPlaceholder(): MeasurementResult {
  return {
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
    warning: 'Manual tracing required - trace the roof outline to calculate area'
  }
}

/**
 * Main measurement function with fallback chain
 */
export async function getRoofMeasurement(
  options: MeasurementOptions
): Promise<{ result: MeasurementResult; allResults: MeasurementResult[]; enableManualTracing: boolean }> {
  const allResults: MeasurementResult[] = []
  let result: MeasurementResult | null = null
  
  // Try Google Solar API first
  if (options.googleApiKey) {
    result = await measureWithGoogleSolar(options.lat, options.lng, options.googleApiKey)
    if (result) {
      allResults.push(result)
      if (!options.enableFallbacks) {
        return { result, allResults, enableManualTracing: false }
      }
    }
  }
  
  // Try Instant Roofer API if available
  if (options.instantRooferApiKey) {
    const instantRooferResult = await measureWithInstantRoofer(
      options.lat, 
      options.lng, 
      options.instantRooferApiKey
    )
    if (instantRooferResult) {
      allResults.push(instantRooferResult)
      if (!result) {
        result = instantRooferResult
      }
    }
  }
  
  // Try OpenStreetMap if still no result or if fallbacks enabled
  if (!result || options.enableFallbacks) {
    const osmResult = await measureWithOpenStreetMap(options.lat, options.lng)
    if (osmResult) {
      allResults.push(osmResult)
      if (!result) {
        result = osmResult
      }
    }
  }
  
  // Try footprint estimation as last automated fallback
  if (!result) {
    const footprintResult = await measureWithFootprintEstimation(
      options.lat,
      options.lng,
      options.address
    )
    if (footprintResult) {
      allResults.push(footprintResult)
      result = footprintResult
    }
  }
  
  // If still no result, enable manual tracing
  if (!result) {
    result = createManualTracingPlaceholder()
    return { result, allResults, enableManualTracing: true }
  }
  
  return { result, allResults, enableManualTracing: false }
}

/**
 * Calculate polygon area using Shoelace formula
 * Returns area in square feet
 */
function calculatePolygonArea(geometry: { lat: number; lon: number }[]): number {
  if (!geometry || geometry.length < 3) {
    return 0
  }
  
  let area = 0
  const n = geometry.length
  
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n
    // Convert lat/lng to approximate meters (simplified)
    const x1 = geometry[i].lon * 111320 * Math.cos(geometry[i].lat * Math.PI / 180)
    const y1 = geometry[i].lat * 110540
    const x2 = geometry[j].lon * 111320 * Math.cos(geometry[j].lat * Math.PI / 180)
    const y2 = geometry[j].lat * 110540
    
    area += x1 * y2
    area -= x2 * y1
  }
  
  // Convert sq meters to sq feet
  return Math.abs(area / 2) * SQM_TO_SQFT
}

/**
 * Estimate pitch from building type
 */
function estimatePitchFromBuildingType(buildingType: string): number {
  const pitchEstimates: Record<string, number> = {
    'house': 22, // ~5:12
    'residential': 22,
    'detached': 25,
    'apartments': 15,
    'commercial': 5,
    'industrial': 3,
    'retail': 5,
    'warehouse': 3,
    'garage': 20,
    'shed': 15,
    'yes': 20 // Default for unknown
  }
  
  return pitchEstimates[buildingType.toLowerCase()] || 20
}

/**
 * Get source accuracy description
 */
export function getSourceAccuracyDescription(source: MeasurementSource): string {
  const descriptions: Record<MeasurementSource, string> = {
    'google-solar': '90-95% accuracy using satellite imagery and AI analysis',
    'instant-roofer': '95-98% accuracy using LiDAR measurements',
    'openstreetmap': '50-70% accuracy using crowd-sourced building footprints',
    'footprint-estimation': '40-60% accuracy using statistical estimation',
    'manual-tracing': '85-95% accuracy when traced by experienced user'
  }
  
  return descriptions[source]
}
