/**
 * MULTI-SOURCE IMAGERY MANAGER
 * 
 * Fetches building footprints from multiple FREE sources:
 * 1. Google Static Maps (current imagery, free tier - 28,500/month)
 * 2. Microsoft/Bing Maps (different provider perspective, free tier)
 * 3. USGS National Map (topographic + building outlines, FREE)
 * 4. Sentinel-2 (free EU satellite data via Copernicus)
 * 
 * Premium sources (Maxar/WorldView) are deferred to future phases.
 * 
 * This module orchestrates fetching from all sources and provides:
 * - Parallel fetching for efficiency
 * - Graceful degradation when sources fail
 * - Source variance calculation
 * - Best source selection using weighted scoring
 * - Quality flags and warnings
 */

import { BuildingFootprint, fetchMicrosoftBuildingFootprint } from '../enhancedOSM'
import { fetchBingAsImagerySource, BingImageryOptions } from './bingMapsProvider'
import { fetchSentinel2AsImagerySource, Sentinel2Options } from './sentinel2Provider'
import {
  ImagerySource,
  MultiSourceImagerySet,
  SourceSelectionResult,
  ImageryFetchOptions,
  DEFAULT_SCORING_WEIGHTS,
  SourceScoringWeights
} from './types'
import {
  calculateOverallVariance,
  identifyOutlierSources
} from './sourceComparator'

/**
 * Main orchestrator for multi-source imagery fetching
 */
export class ImagerySourceManager {
  private scoringWeights: SourceScoringWeights
  
  constructor(weights?: Partial<SourceScoringWeights>) {
    this.scoringWeights = {
      ...DEFAULT_SCORING_WEIGHTS,
      ...weights
    }
  }
  
  /**
   * Fetch all available FREE imagery sources for a location
   * 
   * Sources are fetched in parallel with graceful error handling.
   * If a source fails, it is skipped and the process continues.
   * 
   * @param lat - Latitude
   * @param lng - Longitude
   * @param options - Fetch options
   * @returns MultiSourceImagerySet with all available sources
   */
  async fetchAllImagerySourcesForLocation(
    lat: number,
    lng: number,
    options?: ImageryFetchOptions
  ): Promise<MultiSourceImagerySet> {
    const timestamp = new Date()
    const sources: ImagerySource[] = []
    const qualityFlags: string[] = []
    
    // Determine zoom level based on options
    const zoom = options?.zoom ?? 20
    
    // Determine cloud cover threshold for Sentinel-2
    const maxCloudCover = options?.maxCloudCover ?? 20
    
    // Determine date range for historical imagery
    let sentinelStartDate: Date | undefined
    if (options?.includeArchive) {
      const now = new Date()
      switch (options.maxAge) {
        case 'current':
          sentinelStartDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) // 30 days
          break
        case '1year':
          sentinelStartDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
          break
        case '5year':
          sentinelStartDate = new Date(now.getTime() - 5 * 365 * 24 * 60 * 60 * 1000)
          break
      }
    }
    
    // Fetch all sources in parallel with error handling
    const [
      googleSource,
      bingSource,
      usgsSource,
      sentinelSource
    ] = await Promise.all([
      this.fetchGoogleStaticMaps(lat, lng, zoom).catch(err => {
        console.error('Google Static Maps fetch failed:', err)
        qualityFlags.push('Google Static Maps unavailable')
        return null
      }),
      this.fetchBingMapsImagery(lat, lng, { zoom }).catch(err => {
        console.error('Bing Maps fetch failed:', err)
        qualityFlags.push('Bing Maps unavailable')
        return null
      }),
      this.fetchUSGSBuildingData(lat, lng).catch(err => {
        console.error('USGS fetch failed:', err)
        qualityFlags.push('USGS building data unavailable')
        return null
      }),
      this.fetchSentinel2Imagery(lat, lng, sentinelStartDate, maxCloudCover).catch(err => {
        console.error('Sentinel-2 fetch failed:', err)
        qualityFlags.push('Sentinel-2 imagery unavailable')
        return null
      })
    ])
    
    // Add successful sources to the array
    if (googleSource) sources.push(googleSource)
    if (bingSource) sources.push(bingSource)
    if (usgsSource) sources.push(usgsSource)
    if (sentinelSource) sources.push(sentinelSource)
    
    // Calculate variance between sources (if we have footprints)
    const footprintVariance = this.calculateFootprintVariance(sources)
    
    // Identify quality flags based on variance
    if (footprintVariance > 15) {
      qualityFlags.push(`High variance between sources (${footprintVariance.toFixed(1)}%)`)
    }
    
    // Identify outliers
    const sourcesWithAreas = sources
      .filter(s => s.footprint?.areaSqFt)
      .map(s => ({ source: s.provider, areaSqFt: s.footprint!.areaSqFt }))
    
    const outliers = identifyOutlierSources(sourcesWithAreas)
    if (outliers.length > 0) {
      qualityFlags.push(`Outlier sources: ${outliers.join(', ')}`)
    }
    
    // Select best source
    const bestSource = sources.length > 0 
      ? this.selectBestSource(sources).selectedSource 
      : null
    
    // Add flag if no sources available
    if (sources.length === 0) {
      qualityFlags.push('No imagery sources available for this location')
    }
    
    return {
      location: { lat, lng },
      timestamp,
      sources,
      footprintVariance,
      recommendedPrimary: bestSource,
      qualityFlags
    }
  }
  
  /**
   * SOURCE 1: Google Static Maps (Primary - Current, Free)
   * 
   * Free tier: up to 28,500 requests/month
   * Resolution: 0.149m/pixel at zoom 20
   * 
   * Note: This provides imagery URL but footprint extraction
   * would require additional processing (not included in free tier).
   * 
   * @param lat - Latitude
   * @param lng - Longitude
   * @param zoom - Zoom level (default: 20)
   * @returns ImagerySource object
   */
  async fetchGoogleStaticMaps(
    lat: number,
    lng: number,
    zoom: number = 20
  ): Promise<ImagerySource | null> {
    // Get API key from environment
    const apiKey = typeof process !== 'undefined' 
      ? process.env.GOOGLE_SOLAR_API_KEY || process.env.GOOGLE_MAPS_API_KEY
      : null
    
    if (!apiKey) {
      console.warn('Google Maps API key not configured')
      return null
    }
    
    // Construct Google Static Maps URL
    const imageUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=${zoom}&size=640x640&maptype=satellite&key=${apiKey}`
    
    // Calculate resolution based on zoom level
    // At zoom 20, resolution is approximately 0.149m/pixel at equator
    const baseResolution = 0.149
    const resolution = baseResolution * Math.pow(2, 20 - zoom)
    
    return {
      provider: 'google',
      imageUrl,
      captureDate: null, // Google doesn't provide capture date in Static Maps API
      resolution,
      quality: zoom >= 20 ? 'high' : zoom >= 18 ? 'medium' : 'low',
      cost: 0 // Free tier
    }
  }
  
  /**
   * SOURCE 2: Bing Maps (Secondary - Different perspective)
   * 
   * Different satellite source than Google
   * Can catch roof changes missed by Google's cached tiles
   * 
   * @param lat - Latitude
   * @param lng - Longitude
   * @param options - Bing imagery options
   * @returns ImagerySource object
   */
  async fetchBingMapsImagery(
    lat: number,
    lng: number,
    options?: BingImageryOptions
  ): Promise<ImagerySource | null> {
    return fetchBingAsImagerySource(lat, lng, options)
  }
  
  /**
   * SOURCE 3: USGS National Map (Validation - Building extract)
   * 
   * FREE building footprint dataset derived from LIDAR
   * More authoritative than OSM in US
   * 
   * Note: Uses Microsoft Building Footprints via ArcGIS which is
   * hosted by ESRI and includes USGS-derived data.
   * 
   * @param lat - Latitude
   * @param lng - Longitude
   * @returns ImagerySource object with footprint data
   */
  async fetchUSGSBuildingData(
    lat: number,
    lng: number
  ): Promise<ImagerySource | null> {
    // Fetch Microsoft Building Footprint (includes USGS-derived data)
    const footprint = await fetchMicrosoftBuildingFootprint(lat, lng)
    
    if (!footprint) {
      return null
    }
    
    return {
      provider: 'usgs',
      imageUrl: '', // USGS building data doesn't have an imagery URL
      captureDate: null,
      resolution: 1, // Building footprints typically derived from 1m LiDAR
      quality: 'high', // LiDAR-derived footprints are high quality
      cost: 0,
      footprint
    }
  }
  
  /**
   * SOURCE 4: Sentinel-2 (Historical Archive - Free)
   * 
   * Free through Copernicus hub
   * ~10m resolution (coarser but useful for temporal validation)
   * Extensive historical archive (2015-present)
   * 
   * @param lat - Latitude
   * @param lng - Longitude
   * @param startDate - Start of date range
   * @param maxCloudCover - Maximum cloud cover percentage
   * @returns ImagerySource object
   */
  async fetchSentinel2Imagery(
    lat: number,
    lng: number,
    startDate?: Date,
    maxCloudCover: number = 20
  ): Promise<ImagerySource | null> {
    const options: Sentinel2Options = {
      maxCloudCover,
      startDate,
      endDate: new Date()
    }
    
    return fetchSentinel2AsImagerySource(lat, lng, options)
  }
  
  /**
   * Calculate variance between footprints from different sources
   * 
   * Uses coefficient of variation (CV) to measure dispersion.
   * Lower variance indicates better agreement between sources.
   * 
   * @param sources - Array of imagery sources
   * @returns Variance as percentage (0 = perfect agreement)
   */
  calculateFootprintVariance(sources: ImagerySource[]): number {
    // Extract areas from sources that have footprints
    const areas = sources
      .filter(s => s.footprint?.areaSqFt)
      .map(s => s.footprint!.areaSqFt)
    
    if (areas.length < 2) {
      return 0 // Can't calculate variance with less than 2 sources
    }
    
    return calculateOverallVariance(areas)
  }
  
  /**
   * Select best source using weighted scoring
   * 
   * Weights (default):
   * - Resolution: 40%
   * - Recency: 30%
   * - Quality: 20%
   * - Cloud cover: 10%
   * 
   * @param sources - Available imagery sources
   * @returns Selection result with score and reasoning
   */
  selectBestSource(sources: ImagerySource[]): SourceSelectionResult {
    if (sources.length === 0) {
      throw new Error('No sources to select from')
    }
    
    if (sources.length === 1) {
      return {
        selectedSource: sources[0],
        score: this.scoreSource(sources[0]),
        reasoning: [`Only one source available: ${sources[0].provider}`],
        alternativeSources: []
      }
    }
    
    // Score each source
    const scoredSources = sources.map(source => ({
      source,
      score: this.scoreSource(source)
    }))
    
    // Sort by score descending
    scoredSources.sort((a, b) => b.score - a.score)
    
    const best = scoredSources[0]
    const reasoning: string[] = []
    
    // Build reasoning
    reasoning.push(`Selected ${best.source.provider} with score ${best.score.toFixed(1)}/100`)
    
    if (best.source.quality === 'high') {
      reasoning.push('High quality imagery')
    }
    
    if (best.source.resolution <= 0.5) {
      reasoning.push(`High resolution (${best.source.resolution.toFixed(2)}m/pixel)`)
    }
    
    if (best.source.captureDate) {
      const age = (Date.now() - best.source.captureDate.getTime()) / (1000 * 60 * 60 * 24)
      if (age < 30) {
        reasoning.push('Recent imagery (< 30 days old)')
      } else if (age < 365) {
        reasoning.push('Reasonably current imagery (< 1 year old)')
      }
    }
    
    if (best.source.cloudCover !== undefined && best.source.cloudCover < 10) {
      reasoning.push('Low cloud cover')
    }
    
    return {
      selectedSource: best.source,
      score: best.score,
      reasoning,
      alternativeSources: scoredSources.slice(1).map(s => s.source)
    }
  }
  
  /**
   * Score a single source based on weighted criteria
   */
  private scoreSource(source: ImagerySource): number {
    let score = 0
    
    // Resolution score (lower is better, 0.149m is ideal)
    // Score 40 for 0.149m, decreasing as resolution gets worse
    const resolutionScore = Math.max(0, 40 - (source.resolution - 0.149) * 4)
    score += resolutionScore * (this.scoringWeights.resolution / 40)
    
    // Recency score (based on capture date)
    let recencyScore = 15 // Default if no date known
    if (source.captureDate) {
      const ageDays = (Date.now() - source.captureDate.getTime()) / (1000 * 60 * 60 * 24)
      if (ageDays < 30) {
        recencyScore = 30
      } else if (ageDays < 90) {
        recencyScore = 25
      } else if (ageDays < 365) {
        recencyScore = 20
      } else if (ageDays < 730) {
        recencyScore = 10
      } else {
        recencyScore = 5
      }
    }
    score += recencyScore * (this.scoringWeights.recency / 30)
    
    // Quality score
    const qualityScores = { high: 20, medium: 15, low: 10 }
    score += qualityScores[source.quality] * (this.scoringWeights.quality / 20)
    
    // Cloud cover score (for satellite imagery)
    if (source.cloudCover !== undefined) {
      const cloudScore = Math.max(0, 10 - source.cloudCover / 10)
      score += cloudScore * (this.scoringWeights.cloudCover / 10)
    } else {
      // If no cloud cover info, give average score
      score += 5 * (this.scoringWeights.cloudCover / 10)
    }
    
    return Math.min(100, Math.max(0, score))
  }
  
  /**
   * Identify quality flags and warnings
   * 
   * Checks for common issues:
   * - Old imagery
   * - High cloud cover
   * - Low resolution
   * - High variance between sources
   * 
   * @param sources - Array of imagery sources
   * @returns Array of quality flag strings
   */
  identifyQualityFlags(sources: ImagerySource[]): string[] {
    const flags: string[] = []
    
    for (const source of sources) {
      // Check for old imagery
      if (source.captureDate) {
        const ageDays = (Date.now() - source.captureDate.getTime()) / (1000 * 60 * 60 * 24)
        if (ageDays > 730) { // More than 2 years old
          flags.push(`${source.provider}: Imagery is over 2 years old`)
        }
      }
      
      // Check for high cloud cover
      if (source.cloudCover !== undefined && source.cloudCover > 30) {
        flags.push(`${source.provider}: High cloud cover (${source.cloudCover.toFixed(1)}%)`)
      }
      
      // Check for low resolution
      if (source.resolution > 5) {
        flags.push(`${source.provider}: Low resolution (${source.resolution}m/pixel)`)
      }
      
      // Check for poor shadow quality
      if (source.shadowQuality === 'poor') {
        flags.push(`${source.provider}: Poor shadow quality may affect accuracy`)
      }
    }
    
    // Check overall variance
    const variance = this.calculateFootprintVariance(sources)
    if (variance > 25) {
      flags.push(`High disagreement between sources (${variance.toFixed(1)}% variance)`)
    }
    
    // Check if sources are all low quality
    const highQualitySources = sources.filter(s => s.quality === 'high')
    if (highQualitySources.length === 0 && sources.length > 0) {
      flags.push('No high-quality imagery available')
    }
    
    return flags
  }
}

/**
 * Create a default ImagerySourceManager instance
 */
export function createImagerySourceManager(
  weights?: Partial<SourceScoringWeights>
): ImagerySourceManager {
  return new ImagerySourceManager(weights)
}
