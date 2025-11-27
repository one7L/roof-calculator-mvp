/**
 * BING MAPS PROVIDER
 * 
 * Integrates with Bing Maps REST API for satellite imagery
 * Uses free tier - generous limits sufficient for MVP
 * 
 * API Documentation: https://docs.microsoft.com/en-us/bingmaps/rest-services/
 * 
 * Free tier includes:
 * - 125,000 transactions per year for non-profit
 * - 50,000 transactions per year for basic accounts
 * 
 * All imagery fetching is FREE within these limits.
 */

import { ImagerySource } from './types'

/**
 * Bing Maps imagery metadata
 */
export interface BingImageryMetadata {
  /** Start date of imagery vintage (YYYY-MM-DD format or null if unknown) */
  vintageStart: string | null
  /** End date of imagery vintage (YYYY-MM-DD format or null if unknown) */
  vintageEnd: string | null
  /** Imagery provider name */
  provider: string
  /** Available zoom range */
  zoomRange: { min: number; max: number }
}

/**
 * Bing Maps static imagery result
 */
export interface BingImageryResult {
  /** URL to the static map image */
  imageUrl: string
  /** Capture date extracted from metadata (if available) */
  captureDate: Date | null
  /** Imagery metadata */
  metadata: BingImageryMetadata
}

/**
 * Options for fetching Bing Maps imagery
 */
export interface BingImageryOptions {
  /** Zoom level (1-21, default: 20) */
  zoom?: number
  /** Map type */
  mapType?: 'Aerial' | 'AerialWithLabels'
  /** Image dimensions (default: 640x640) */
  width?: number
  height?: number
}

/**
 * Get the Bing Maps API key from environment variables
 */
function getBingMapsApiKey(): string | null {
  // Check for environment variable (works in Node.js and some bundlers)
  if (typeof process !== 'undefined' && process.env?.BING_MAPS_KEY) {
    return process.env.BING_MAPS_KEY
  }
  return null
}

/**
 * Fetch Bing Maps static satellite imagery for a location
 * 
 * Uses the Bing Maps Static Image API:
 * https://docs.microsoft.com/en-us/bingmaps/rest-services/imagery/get-a-static-map
 * 
 * @param lat - Latitude
 * @param lng - Longitude
 * @param options - Optional configuration
 * @returns Static imagery result with URL and metadata
 */
export async function fetchBingMapsImagery(
  lat: number,
  lng: number,
  options?: BingImageryOptions
): Promise<BingImageryResult | null> {
  const apiKey = getBingMapsApiKey()
  
  if (!apiKey) {
    console.warn('Bing Maps API key not configured (BING_MAPS_KEY)')
    return null
  }
  
  const zoom = options?.zoom ?? 20
  const mapType = options?.mapType ?? 'Aerial'
  const width = options?.width ?? 640
  const height = options?.height ?? 640
  
  try {
    // Construct the static image URL
    // Note: We construct the URL but also fetch metadata for vintage information
    const imageUrl = `https://dev.virtualearth.net/REST/v1/Imagery/Map/${mapType}/${lat},${lng}/${zoom}?mapSize=${width},${height}&key=${apiKey}`
    
    // Fetch metadata to get vintage information
    const metadata = await getBingImageryMetadata(lat, lng)
    
    // Parse vintage dates if available
    let captureDate: Date | null = null
    if (metadata.vintageStart) {
      try {
        captureDate = new Date(metadata.vintageStart)
        // If invalid date, set to null
        if (isNaN(captureDate.getTime())) {
          captureDate = null
        }
      } catch {
        captureDate = null
      }
    }
    
    return {
      imageUrl,
      captureDate,
      metadata
    }
  } catch (error) {
    console.error('Bing Maps imagery fetch error:', error)
    return null
  }
}

/**
 * Get imagery metadata from Bing Maps API
 * 
 * Uses the Imagery Metadata API:
 * https://docs.microsoft.com/en-us/bingmaps/rest-services/imagery/get-imagery-metadata
 * 
 * @param lat - Latitude
 * @param lng - Longitude
 * @returns Imagery metadata including vintage dates
 */
export async function getBingImageryMetadata(
  lat: number,
  lng: number
): Promise<BingImageryMetadata> {
  const apiKey = getBingMapsApiKey()
  
  const defaultMetadata: BingImageryMetadata = {
    vintageStart: null,
    vintageEnd: null,
    provider: 'unknown',
    zoomRange: { min: 1, max: 21 }
  }
  
  if (!apiKey) {
    return defaultMetadata
  }
  
  try {
    // Use the Imagery Metadata API to get vintage information
    const metadataUrl = `https://dev.virtualearth.net/REST/v1/Imagery/Metadata/Aerial/${lat},${lng}?key=${apiKey}`
    
    const response = await fetch(metadataUrl)
    
    if (!response.ok) {
      console.error('Bing Maps metadata API error:', response.status)
      return defaultMetadata
    }
    
    const data = await response.json()
    
    // Extract metadata from response
    const resourceSets = data.resourceSets || []
    if (resourceSets.length === 0 || !resourceSets[0].resources) {
      return defaultMetadata
    }
    
    const resource = resourceSets[0].resources[0]
    
    return {
      vintageStart: resource.vintageStart || null,
      vintageEnd: resource.vintageEnd || null,
      provider: resource.imageUrl?.includes('provider=') 
        ? extractProvider(resource.imageUrl) 
        : 'Microsoft Bing',
      zoomRange: {
        min: resource.zoomMin || 1,
        max: resource.zoomMax || 21
      }
    }
  } catch (error) {
    console.error('Bing Maps metadata fetch error:', error)
    return defaultMetadata
  }
}

/**
 * Convert Bing Maps result to ImagerySource format
 * 
 * @param lat - Latitude
 * @param lng - Longitude
 * @param options - Fetch options
 * @returns ImagerySource object or null if fetch fails
 */
export async function fetchBingAsImagerySource(
  lat: number,
  lng: number,
  options?: BingImageryOptions
): Promise<ImagerySource | null> {
  const result = await fetchBingMapsImagery(lat, lng, options)
  
  if (!result) {
    return null
  }
  
  const zoom = options?.zoom ?? 20
  
  // Calculate approximate resolution based on zoom level
  // At zoom 20, resolution is approximately 0.149m/pixel at equator
  // Resolution doubles with each decrease in zoom level
  const baseResolution = 0.149 // meters per pixel at zoom 20
  const resolution = baseResolution * Math.pow(2, 20 - zoom)
  
  // Determine quality based on zoom and metadata availability
  let quality: 'low' | 'medium' | 'high' = 'medium'
  if (zoom >= 20 && result.captureDate) {
    quality = 'high'
  } else if (zoom < 18) {
    quality = 'low'
  }
  
  return {
    provider: 'bing',
    imageUrl: result.imageUrl,
    captureDate: result.captureDate,
    resolution,
    quality,
    cost: 0, // Free tier
    metadata: {
      vintageStart: result.metadata.vintageStart,
      vintageEnd: result.metadata.vintageEnd,
      provider: result.metadata.provider,
      zoomRange: result.metadata.zoomRange
    }
  }
}

/**
 * Extract provider name from Bing Maps image URL
 */
function extractProvider(imageUrl: string): string {
  const match = imageUrl.match(/provider=([^&]+)/)
  return match ? decodeURIComponent(match[1]) : 'Microsoft Bing'
}
