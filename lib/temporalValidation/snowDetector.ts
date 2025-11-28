/**
 * Snow Cover Detection (Phase 2)
 * 
 * Detects snow cover on roofs using multiple methods:
 * 1.  Area comparison (winter vs summer footprint)
 * 2.  Capture date analysis (snow season)
 * 3.  Latitude correlation (northern climates)
 * 
 * Snow typically inflates roof measurements by 5-10%
 */

import { ImagerySource } from './types';

/**
 * Result of snow detection analysis
 */
export interface SnowDetectionResult {
  snowDetected: boolean;
  coveragePercent: number;       // Estimated % of area inflation
  confidence: number;            // 0-100%, confidence in detection
  method: 'area-comparison' | 'brightness-analysis' | 'combined' | 'insufficient-data';
  recommendation: string;
  factors: {
    areaInflation: number;       // % inflation from area comparison
    seasonalMatch: boolean;      // Is it snow season?
    latitudeAppropriate: boolean; // Is latitude prone to snow?
  };
}

/**
 * Detect snow cover using multiple signals
 * 
 * @param winterImagery - Imagery from winter season
 * @param summerImagery - Imagery from summer season (baseline)
 * @returns Snow detection result with confidence score
 */
export function detectSnowCover(
  winterImagery: ImagerySource | null,
  summerImagery: ImagerySource | null
): SnowDetectionResult {
  
  // Insufficient data check
  if (!winterImagery || !summerImagery) {
    return {
      snowDetected: false,
      coveragePercent: 0,
      confidence: 0,
      method: 'insufficient-data',
      recommendation: 'Insufficient data for snow detection (need both winter and summer imagery)',
      factors: {
        areaInflation: 0,
        seasonalMatch: false,
        latitudeAppropriate: false
      }
    };
  }
  
  const winterArea = winterImagery.footprintAreaSqFt || 0;
  const summerArea = summerImagery.footprintAreaSqFt || 0;
  
  // No summer baseline check
  if (summerArea === 0) {
    return {
      snowDetected: false,
      coveragePercent: 0,
      confidence: 0,
      method: 'insufficient-data',
      recommendation: 'No summer baseline available for comparison',
      factors: {
        areaInflation: 0,
        seasonalMatch: false,
        latitudeAppropriate: false
      }
    };
  }
  
  // Method 1: Area comparison
  // Snow typically inflates area by 5-10% due to snow accumulation on edges
  const areaInflation = ((winterArea / summerArea) - 1) * 100;
  const areaIndicatesSnow = areaInflation > 5; // 5% threshold
  
  // Method 2: Capture date check
  // Snow more likely November-March in northern hemisphere
  const winterMonth = new Date(winterImagery.captureDate).getMonth();
  const seasonalMatch = winterMonth >= 10 || winterMonth <= 2; // Nov-Feb
  
  // Method 3: Latitude check
  // Snow more likely in northern latitudes (>35°N or <35°S)
  const lat = winterImagery.location?. lat || 0;
  const latitudeAppropriate = Math.abs(lat) > 35;
  
  // Calculate confidence based on multiple factors
  let confidence = 0;
  
  if (areaIndicatesSnow) {
    // Area inflation is the strongest signal
    confidence += 50;
  }
  
  if (seasonalMatch) {
    // Seasonal timing adds credibility
    confidence += 30;
  }
  
  if (latitudeAppropriate) {
    // Latitude context
    confidence += 20;
  }
  
  // Snow detected if confidence >= 60%
  const snowDetected = confidence >= 60;
  
  // Generate recommendation
  let recommendation: string;
  if (snowDetected) {
    recommendation = `Snow cover detected with ${confidence}% confidence.  ` +
      `Winter measurement inflated by ~${areaInflation. toFixed(1)}%. ` +
      `Recommend using summer or fall imagery for accurate measurements.`;
  } else if (areaInflation > 0 && areaInflation < 5) {
    recommendation = `Minor area difference detected (${areaInflation.toFixed(1)}%), ` +
      `but below snow detection threshold. Consider using summer imagery for best accuracy.`;
  } else {
    recommendation = 'No significant snow cover detected. Winter imagery appears reliable.';
  }
  
  return {
    snowDetected,
    coveragePercent: Math.max(0, areaInflation),
    confidence,
    method: 'combined',
    recommendation,
    factors: {
      areaInflation,
      seasonalMatch,
      latitudeAppropriate
    }
  };
}

/**
 * Calculate snow probability based on location and date
 * 
 * @param lat - Latitude
 * @param lng - Longitude
 * @param date - Date of imagery
 * @returns Probability (0-100) that snow is present
 */
export function calculateSnowProbability(
  lat: number,
  lng: number,
  date: Date
): number {
  let probability = 0;
  
  // Latitude factor (higher latitudes = more snow)
  const absLat = Math.abs(lat);
  if (absLat > 50) probability += 40;        // Very high latitude
  else if (absLat > 40) probability += 30;   // High latitude
  else if (absLat > 35) probability += 20;   // Moderate latitude
  else if (absLat > 30) probability += 10;   // Low latitude
  
  // Seasonal factor (winter months = more snow)
  const month = date.getMonth();
  const isNorthernHemisphere = lat > 0;
  
  if (isNorthernHemisphere) {
    // Northern hemisphere winter: Dec-Feb
    if (month === 0 || month === 1 || month === 11) probability += 40;
    // Shoulder months: Nov, Mar
    else if (month === 2 || month === 10) probability += 20;
  } else {
    // Southern hemisphere winter: Jun-Aug
    if (month >= 5 && month <= 7) probability += 40;
    // Shoulder months: May, Sep
    else if (month === 4 || month === 8) probability += 20;
  }
  
  // Elevation factor (if available in future)
  // Higher elevations = more snow probability
  
  return Math.min(100, probability);
}

/**
 * Recommend best season for measurement based on snow probability
 * 
 * @param lat - Latitude
 * @param lng - Longitude
 * @returns Recommended seasons in order of preference
 */
export function recommendSeasonForLocation(
  lat: number,
  lng: number
): Array<'spring' | 'summer' | 'fall' | 'winter'> {
  const absLat = Math.abs(lat);
  const isNorthernHemisphere = lat > 0;
  
  // High latitude (>45°) - avoid winter, prefer summer
  if (absLat > 45) {
    return isNorthernHemisphere 
      ? ['summer', 'fall', 'spring', 'winter']
      : ['summer', 'spring', 'fall', 'winter']; // Reversed for southern hemisphere
  }
  
  // Moderate latitude (35-45°) - summer/fall best
  if (absLat > 35) {
    return isNorthernHemisphere
      ? ['summer', 'fall', 'spring', 'winter']
      : ['summer', 'fall', 'spring', 'winter'];
  }
  
  // Low latitude (<35°) - any season acceptable, summer still preferred
  return ['summer', 'fall', 'spring', 'winter'];
}
