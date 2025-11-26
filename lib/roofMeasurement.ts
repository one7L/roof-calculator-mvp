/**
 * Roof Measurement Module
 * 
 * Provides a unified interface for obtaining roof measurements from multiple sources
 * with a tiered fallback system (prioritizes the BEST available source, not averaging):
 * 
 * Tier 1: LiDAR (Instant Roofer API) - 95-98% accuracy
 * Tier 2: Google Solar API (HIGH quality) - 92-95% accuracy
 * Tier 3: Google Solar API (MEDIUM quality) - 85-90% accuracy
 * Tier 4: Google Solar API (LOW quality) - 75-85% accuracy
 * Tier 5: OpenStreetMap + Estimated Pitch - 50-70% accuracy
 * Tier 6: Building Footprint Estimation - 40-60% accuracy
 * Tier 7: Manual Polygon Tracing (UI prompt) - 85-95% accuracy (user-dependent)
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

// Tiered fallback system types
export interface TierFailure {
  tier: number
  tierName: string
  reason: string
}

export interface TieredMeasurementResult {
  measurement: MeasurementResult
  tierUsed: number  // 1-7
  tierName: string  // e.g., "Google Solar API (HIGH)"
  higherTierFailures: TierFailure[]
  fallbacksAvailable: string[]  // What options remain if user wants to try something else
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
 * 
 * IMPORTANT: The Google Solar API's roofSegmentStats[].stats.areaMeters2 already
 * returns the SLOPED roof surface area, NOT the footprint area. Therefore, we
 * do NOT apply the pitch multiplier to this data - it would cause 8-41% inflation.
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
    // NOTE: Google Solar API already returns sloped surface area (adjusted for pitch)
    // so we use this directly as the adjusted area - NO pitch multiplier needed!
    const totalAreaSqM = roofSegments.reduce((sum, seg) => sum + (seg.stats?.areaMeters2 || 0), 0)
    const totalAreaSqFt = totalAreaSqM * SQM_TO_SQFT
    
    // Calculate weighted average pitch (for display/reference only)
    const avgPitch = calculateWeightedAveragePitch(roofSegments)
    const pitchMultiplier = calculatePitchMultiplierFromDegrees(avgPitch)
    
    // For Google Solar API, the area IS already the sloped surface area
    // DO NOT apply pitch multiplier again - this was causing 8-41% inflation!
    const adjustedAreaSqFt = totalAreaSqFt
    
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
 * 
 * NOTE: This is a placeholder implementation. The URL and response format
 * are hypothetical and should be replaced with the actual Instant Roofer API
 * endpoint and documentation when the integration is configured.
 * 
 * Configure INSTANT_ROOFER_API_KEY environment variable to enable this source.
 */
export async function measureWithInstantRoofer(
  lat: number,
  lng: number,
  apiKey: string
): Promise<MeasurementResult | null> {
  try {
    // PLACEHOLDER: Replace with actual Instant Roofer API endpoint
    // The actual API URL and request format may differ
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
 * 
 * NOTE: OSM provides FOOTPRINT area only, so we MUST apply pitch multiplier
 * to get the actual sloped roof surface area.
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
    
    // Calculate area from polygon - returns {areaSqM, areaSqFt}
    const areaResult = calculatePolygonArea(building.geometry || [])
    
    if (areaResult.areaSqM === 0) {
      return null
    }
    
    // OSM doesn't provide pitch data, estimate based on building type
    // Use 4:12 (18.4°) as conservative default for residential
    const estimatedPitch = estimatePitchFromBuildingType(building.tags?.building || 'yes')
    const pitchMultiplier = calculatePitchMultiplierFromDegrees(estimatedPitch)
    
    // OSM provides FOOTPRINT area, so we MUST apply pitch multiplier
    const adjustedAreaSqFt = areaResult.areaSqFt * pitchMultiplier
    
    return {
      totalAreaSqM: areaResult.areaSqM,
      totalAreaSqFt: areaResult.areaSqFt,
      adjustedAreaSqFt,
      squares: areaToSquares(adjustedAreaSqFt),
      pitchDegrees: estimatedPitch,
      pitchMultiplier,
      segmentCount: 1, // OSM doesn't provide segment data
      complexity: 'simple',
      source: 'openstreetmap',
      confidence: 60,
      warning: 'Pitch estimated from building type (default 4:12 for residential); actual roof area may vary significantly'
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

// Tier name definitions for the tiered fallback system
const TIER_NAMES: Record<number, string> = {
  1: 'LiDAR (Instant Roofer)',
  2: 'Google Solar API (HIGH)',
  3: 'Google Solar API (MEDIUM)',
  4: 'Google Solar API (LOW)',
  5: 'OpenStreetMap + Estimated Pitch',
  6: 'Building Footprint Estimation',
  7: 'Manual Polygon Tracing'
}

const TIER_ACCURACY: Record<number, string> = {
  1: '95-98%',
  2: '92-95%',
  3: '85-90%',
  4: '75-85%',
  5: '50-70%',
  6: '40-60%',
  7: '85-95%'
}

/**
 * NEW: Tiered fallback measurement system
 * 
 * Tries each tier in order and returns the FIRST successful result.
 * Does NOT average results - uses the best available source.
 * 
 * Tier Priority:
 * 1. LiDAR (Instant Roofer API) - 95-98% accuracy
 * 2. Google Solar API (HIGH quality) - 92-95% accuracy
 * 3. Google Solar API (MEDIUM quality) - 85-90% accuracy
 * 4. Google Solar API (LOW quality) - 75-85% accuracy
 * 5. OpenStreetMap + Estimated Pitch - 50-70% accuracy
 * 6. Building Footprint Estimation - 40-60% accuracy
 * 7. Manual Polygon Tracing (UI prompt) - 85-95% accuracy
 */
export async function getRoofMeasurementTiered(
  options: MeasurementOptions
): Promise<TieredMeasurementResult> {
  const higherTierFailures: TierFailure[] = []
  const fallbacksAvailable: string[] = []
  
  // TIER 1: LiDAR (Instant Roofer API)
  if (options.instantRooferApiKey) {
    const lidarResult = await measureWithInstantRoofer(
      options.lat,
      options.lng,
      options.instantRooferApiKey
    )
    if (lidarResult) {
      // Add remaining fallbacks
      if (options.googleApiKey) fallbacksAvailable.push('Google Solar API')
      fallbacksAvailable.push('OpenStreetMap', 'Manual Tracing')
      
      return {
        measurement: lidarResult,
        tierUsed: 1,
        tierName: TIER_NAMES[1],
        higherTierFailures,
        fallbacksAvailable
      }
    }
    higherTierFailures.push({
      tier: 1,
      tierName: TIER_NAMES[1],
      reason: 'LiDAR data not available for this location'
    })
  } else {
    higherTierFailures.push({
      tier: 1,
      tierName: TIER_NAMES[1],
      reason: 'Instant Roofer API key not configured'
    })
  }
  
  // TIER 2-4: Google Solar API (with quality sub-tiers)
  if (options.googleApiKey) {
    const solarResult = await measureWithGoogleSolar(
      options.lat,
      options.lng,
      options.googleApiKey
    )
    
    if (solarResult) {
      // Determine which quality tier based on imagery quality
      let tier: number
      if (solarResult.imageryQuality === 'HIGH') {
        tier = 2
      } else if (solarResult.imageryQuality === 'MEDIUM') {
        tier = 3
        // Add failure for higher quality tier
        higherTierFailures.push({
          tier: 2,
          tierName: TIER_NAMES[2],
          reason: 'Only MEDIUM quality imagery available (not HIGH)'
        })
      } else {
        tier = 4
        // Add failures for higher quality tiers
        higherTierFailures.push({
          tier: 2,
          tierName: TIER_NAMES[2],
          reason: 'Only LOW quality imagery available (not HIGH)'
        })
        higherTierFailures.push({
          tier: 3,
          tierName: TIER_NAMES[3],
          reason: 'Only LOW quality imagery available (not MEDIUM)'
        })
      }
      
      // Add remaining fallbacks
      fallbacksAvailable.push('OpenStreetMap', 'Manual Tracing')
      
      return {
        measurement: solarResult,
        tierUsed: tier,
        tierName: TIER_NAMES[tier],
        higherTierFailures,
        fallbacksAvailable
      }
    }
    
    higherTierFailures.push({
      tier: 2,
      tierName: 'Google Solar API',
      reason: 'No building data available for this location'
    })
  } else {
    higherTierFailures.push({
      tier: 2,
      tierName: 'Google Solar API',
      reason: 'Google Solar API key not configured'
    })
  }
  
  // TIER 5: OpenStreetMap
  const osmResult = await measureWithOpenStreetMap(options.lat, options.lng)
  if (osmResult) {
    fallbacksAvailable.push('Manual Tracing')
    
    return {
      measurement: osmResult,
      tierUsed: 5,
      tierName: TIER_NAMES[5],
      higherTierFailures,
      fallbacksAvailable
    }
  }
  
  higherTierFailures.push({
    tier: 5,
    tierName: TIER_NAMES[5],
    reason: 'No building footprint found in OpenStreetMap for this location'
  })
  
  // TIER 6: Building Footprint Estimation
  const footprintResult = await measureWithFootprintEstimation(
    options.lat,
    options.lng,
    options.address
  )
  if (footprintResult) {
    fallbacksAvailable.push('Manual Tracing')
    
    return {
      measurement: footprintResult,
      tierUsed: 6,
      tierName: TIER_NAMES[6],
      higherTierFailures,
      fallbacksAvailable
    }
  }
  
  higherTierFailures.push({
    tier: 6,
    tierName: TIER_NAMES[6],
    reason: 'Insufficient data for footprint estimation'
  })
  
  // TIER 7: Manual Polygon Tracing (fallback)
  return {
    measurement: createManualTracingPlaceholder(),
    tierUsed: 7,
    tierName: TIER_NAMES[7],
    higherTierFailures,
    fallbacksAvailable: []
  }
}

/**
 * Get tier accuracy description
 */
export function getTierAccuracy(tier: number): string {
  return TIER_ACCURACY[tier] || 'Unknown'
}

/**
 * Get tier name
 */
export function getTierName(tier: number): string {
  return TIER_NAMES[tier] || 'Unknown'
}

/**
 * Main measurement function with fallback chain (legacy, uses tiered system internally)
 */
export async function getRoofMeasurement(
  options: MeasurementOptions
): Promise<{ result: MeasurementResult; allResults: MeasurementResult[]; enableManualTracing: boolean }> {
  // Use the new tiered system
  const tieredResult = await getRoofMeasurementTiered(options)
  
  // Convert to legacy format for backward compatibility
  const allResults: MeasurementResult[] = [tieredResult.measurement]
  const enableManualTracing = tieredResult.tierUsed === 7
  
  return {
    result: tieredResult.measurement,
    allResults,
    enableManualTracing
  }
}

/**
 * Calculate polygon area using Shoelace formula
 * Returns area in both square meters and square feet
 * 
 * FIX: Previously returned only sq ft but caller was incorrectly treating
 * it as sq meters in some places. Now returns both explicitly.
 */
function calculatePolygonArea(geometry: { lat: number; lon: number }[]): { areaSqM: number; areaSqFt: number } {
  if (!geometry || geometry.length < 3) {
    return { areaSqM: 0, areaSqFt: 0 }
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
  
  // Area is in square meters
  const areaSqM = Math.abs(area / 2)
  // Convert to square feet
  const areaSqFt = areaSqM * SQM_TO_SQFT
  
  return { areaSqM, areaSqFt }
}

/**
 * Estimate pitch from building type
 * Uses 4:12 (18.4°) as conservative default for residential buildings
 */
function estimatePitchFromBuildingType(buildingType: string): number {
  const pitchEstimates: Record<string, number> = {
    'house': 18.4, // 4:12 - conservative default for residential
    'residential': 18.4,
    'detached': 22, // ~5:12
    'apartments': 15,
    'commercial': 5,
    'industrial': 3,
    'retail': 5,
    'warehouse': 3,
    'garage': 18.4,
    'shed': 15,
    'yes': 18.4 // Default to 4:12 for unknown (conservative estimate)
  }
  
  return pitchEstimates[buildingType.toLowerCase()] || 18.4 // Default 4:12
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
