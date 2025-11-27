/**
 * Temporal Validation Types
 * 
 * TypeScript interfaces for the multi-source imagery validation system.
 * Supports integration with multiple FREE data sources:
 * - Google Static Maps
 * - Bing Maps
 * - USGS National Map
 * - Sentinel-2 (Copernicus)
 * - OpenStreetMap
 */

import { BuildingFootprint } from '../enhancedOSM'

/**
 * Supported imagery providers
 */
export type ImageryProvider = 'google' | 'bing' | 'usgs' | 'sentinel' | 'osm'

/**
 * Quality levels for imagery
 */
export type ImageryQualityLevel = 'low' | 'medium' | 'high'

/**
 * Shadow quality assessment levels
 */
export type ShadowQuality = 'poor' | 'moderate' | 'good'

/**
 * Agreement levels between sources
 */
export type AgreementLevel = 'strong' | 'moderate' | 'weak' | 'conflict'

/**
 * Represents a single imagery source and its characteristics
 */
export interface ImagerySource {
  /** Provider name */
  provider: ImageryProvider
  /** URL to the imagery (static map image or tile) */
  imageUrl: string
  /** When the image was captured (if known) */
  captureDate: Date | null
  /** Resolution in meters per pixel */
  resolution: number
  /** Quality assessment */
  quality: ImageryQualityLevel
  /** Cost in USD (always 0 for free tier) */
  cost: number
  /** Cloud cover percentage (for satellite imagery like Sentinel-2) */
  cloudCover?: number
  /** Shadow quality assessment */
  shadowQuality?: ShadowQuality
  /** Optional building footprint extracted from this source */
  footprint?: BuildingFootprint
  /** Additional metadata from the source */
  metadata?: Record<string, unknown>
}

/**
 * Collection of imagery from multiple sources for a single location
 */
export interface MultiSourceImagerySet {
  /** Target location coordinates */
  location: { lat: number; lng: number }
  /** When this set was assembled */
  timestamp: Date
  /** All available imagery sources */
  sources: ImagerySource[]
  /** Variance percentage between sources' footprint measurements */
  footprintVariance: number
  /** The recommended primary source based on scoring */
  recommendedPrimary: ImagerySource | null
  /** Quality flags and warnings */
  qualityFlags: string[]
}

/**
 * Comparison result between two footprints from different sources
 */
export interface FootprintComparison {
  /** First source name */
  source1: string
  /** Second source name */
  source2: string
  /** Absolute difference in square feet */
  areaDifferenceSqFt: number
  /** Variance as a percentage */
  variancePercent: number
  /** Agreement level based on variance */
  agreement: AgreementLevel
}

/**
 * Result from the source selection algorithm
 */
export interface SourceSelectionResult {
  /** The selected best source */
  selectedSource: ImagerySource
  /** Composite score (0-100) */
  score: number
  /** Reasons for selection */
  reasoning: string[]
  /** Other available sources in ranked order */
  alternativeSources: ImagerySource[]
}

/**
 * Options for fetching imagery sources
 */
export interface ImageryFetchOptions {
  /** Maximum age of imagery to consider */
  maxAge?: 'current' | '1year' | '5year'
  /** Whether to include archived/historical imagery */
  includeArchive?: boolean
  /** Maximum cloud cover percentage (for Sentinel-2) */
  maxCloudCover?: number
  /** Target zoom level for static maps */
  zoom?: number
}

/**
 * Scoring weights for source selection
 * Total should equal 100
 */
export interface SourceScoringWeights {
  /** Weight for resolution quality (default: 40) */
  resolution: number
  /** Weight for recency of imagery (default: 30) */
  recency: number
  /** Weight for overall quality (default: 20) */
  quality: number
  /** Weight for cloud cover (default: 10) */
  cloudCover: number
}

/**
 * Default scoring weights for source selection
 */
export const DEFAULT_SCORING_WEIGHTS: SourceScoringWeights = {
  resolution: 40,
  recency: 30,
  quality: 20,
  cloudCover: 10
}

/**
 * Consensus result from multi-source comparison
 */
export interface MultiSourceConsensus {
  /** Agreed-upon area in square feet */
  consensusAreaSqFt: number
  /** Confidence score (0-100) */
  confidenceScore: number
  /** Agreement level across sources */
  agreementLevel: AgreementLevel
  /** List of discrepancies found */
  discrepancies: string[]
}

/**
 * Result from multi-source validation
 */
export interface MultiSourceValidationResult {
  /** Sources that were used */
  sourcesUsed: string[]
  /** Footprint variance between sources */
  footprintVariance: number
  /** Consensus confidence */
  consensusConfidence: number
  /** Quality flags and warnings */
  qualityFlags: string[]
}
