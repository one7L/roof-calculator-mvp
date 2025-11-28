/**
 * Temporal Validation Module
 * 
 * Multi-source imagery validation system for roof measurements.
 * Integrates with multiple FREE data sources to improve accuracy.
 * 
 * Phase 1 includes:
 * - Google Static Maps (28,500/month free)
 * - Bing Maps (generous free tier)
 * - USGS National Map (unlimited free)
 * - Sentinel-2 via Copernicus (unlimited free)
 * 
 * @module temporalValidation
 */

// Export types
export * from './types'

// Export main manager
export { 
  ImagerySourceManager,
  createImagerySourceManager
} from './imagerySourceManager'

// Export Bing Maps provider
export {
  fetchBingMapsImagery,
  getBingImageryMetadata,
  fetchBingAsImagerySource,
  type BingImageryMetadata,
  type BingImageryResult,
  type BingImageryOptions
} from './bingMapsProvider'

// Export Sentinel-2 provider
export {
  fetchSentinel2Imagery,
  getSentinel2HistoricalDates,
  fetchSentinel2AsImagerySource,
  type Sentinel2Metadata,
  type Sentinel2Result,
  type Sentinel2Options
} from './sentinel2Provider'

// Export source comparator
export {
  compareFootprints,
  calculateMultiSourceConsensus,
  identifyOutlierSources,
  calculateAllPairwiseComparisons,
  calculateOverallVariance,
  getAgreementSummary
} from './sourceComparator'

// Phase 2: Seasonal Analysis
export { SeasonalAnalyzer } from './seasonalAnalyzer'
export {
  detectSnowCover,
  calculateSnowProbability,
  recommendSeasonForLocation
} from './snowDetector'
export {
  detectLeafCover,
  detectStructuralChange,
  detectHighVariance,
  detectShadowArtifacts,
  detectDataGap,
  classifyAnomalySeverity,
  summarizeAnomalies
} from './seasonalAnomalies'
export type {
  SeasonalImagerySet,
  SeasonalAnomaly,
  SeasonalValidationResult,
  SeasonRecommendation,
  SeasonalAnalyzerConfig,
  SeasonalAnomalyType,
  AnomalySeverity
} from './seasonalTypes'
export type { SnowDetectionResult } from './snowDetector'
