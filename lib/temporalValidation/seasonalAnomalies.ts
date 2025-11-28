/**
 * Seasonal Anomaly Detection and Classification (Phase 2)
 * 
 * Detects and classifies various seasonal anomalies:
 * - Snow cover (winter inflation)
 * - Leaf obstruction (spring/fall edge issues)
 * - Shadow artifacts (seasonal sun angle changes)
 * - Structural changes (renovations between seasons)
 * - High variance (inconsistent measurements)
 */

import { SeasonalAnomaly, AnomalySeverity, SeasonalAnomalyType } from './seasonalTypes';

/**
 * Detect leaf cover anomaly
 * 
 * Spring often has more leaf cover than fall (when leaves have dropped)
 * 
 * @param springArea - Area from spring imagery
 * @param fallArea - Area from fall imagery
 * @returns Anomaly if detected, null otherwise
 */
export function detectLeafCover(
  springArea: number,
  fallArea: number
): SeasonalAnomaly | null {
  if (fallArea === 0) return null;
  
  // If spring area is significantly smaller than fall, leaves may be obscuring edges
  const reduction = ((1 - springArea / fallArea)) * 100;
  
  if (reduction > 5) {
    return {
      season: 'spring',
      type: 'leaf-cover',
      severity: reduction > 10 ? 'high' : reduction > 7 ? 'medium' : 'low',
      areaImpactPercent: reduction,
      description: `Leaf cover detected in spring imagery.  ` +
        `Area ${reduction.toFixed(1)}% smaller than fall baseline.  ` +
        `Recommend using fall or winter imagery. `
    };
  }
  
  return null;
}

/**
 * Detect structural change between seasons
 * 
 * Large differences suggest roof renovation or addition
 * 
 * @param areas - Map of season to area measurements
 * @returns Anomaly if detected, null otherwise
 */
export function detectStructuralChange(
  areas: Map<string, number>
): SeasonalAnomaly | null {
  const values = Array.from(areas.values()). filter(v => v > 0);
  if (values.length < 2) return null;
  
  const min = Math.min(...values);
  const max = Math.max(... values);
  const changePercent = ((max - min) / min) * 100;
  
  // If variance > 15%, likely a structural change
  if (changePercent > 15) {
    return {
      season: 'all',
      type: 'structural-change',
      severity: changePercent > 25 ? 'high' : 'medium',
      areaImpactPercent: changePercent,
      description: `Significant structural change detected (${changePercent.toFixed(1)}% variance). ` +
        `Building may have been renovated or expanded.  Use most recent imagery.`
    };
  }
  
  return null;
}

/**
 * Detect high seasonal variance
 * 
 * High coefficient of variation suggests measurement inconsistencies
 * 
 * @param areas - Map of season to area measurements
 * @returns Anomaly if detected, null otherwise
 */
export function detectHighVariance(
  areas: Map<string, number>
): SeasonalAnomaly | null {
  const values = Array.from(areas.values()).filter(v => v > 0);
  if (values. length < 2) return null;
  
  // Calculate coefficient of variation
  const mean = values.reduce((a, b) => a + b) / values.length;
  const variance = values.map(v => Math.pow(v - mean, 2)).reduce((a, b) => a + b) / values.length;
  const stdDev = Math.sqrt(variance);
  const coeffVar = (stdDev / mean) * 100;
  
  // If CV > 10%, measurements are inconsistent
  if (coeffVar > 10) {
    return {
      season: 'all',
      type: 'high-variance',
      severity: coeffVar > 20 ? 'high' : coeffVar > 15 ? 'medium' : 'low',
      areaImpactPercent: coeffVar,
      description: `High measurement variance detected (${coeffVar.toFixed(1)}% coefficient of variation). ` +
        `Possible causes: different imagery sources, quality issues, or temporary obstructions.  ` +
        `Review individual season measurements for outliers.`
    };
  }
  
  return null;
}

/**
 * Detect shadow artifacts
 * 
 * Shadow angle changes with seasons can affect measurements
 * 
 * @param areas - Map of season to area measurements
 * @returns Anomaly if detected, null otherwise
 */
export function detectShadowArtifacts(
  areas: Map<string, number>
): SeasonalAnomaly | null {
  const winter = areas.get('winter') || 0;
  const summer = areas.get('summer') || 0;
  
  if (winter === 0 || summer === 0) return null;
  
  // Winter has longer shadows (lower sun angle)
  // If winter area is significantly different from summer (excluding snow), may be shadow issue
  const difference = Math.abs(((winter - summer) / summer) * 100);
  
  // Only flag as shadow artifact if difference is 3-8% (not extreme enough for snow/structure)
  if (difference > 3 && difference < 8) {
    return {
      season: 'winter',
      type: 'shadow-artifact',
      severity: 'low',
      areaImpactPercent: difference,
      description: `Possible shadow artifacts detected (${difference.toFixed(1)}% difference). ` +
        `Sun angle variations between seasons may affect edge detection. ` +
        `Prefer summer imagery for most accurate shadows.`
    };
  }
  
  return null;
}

/**
 * Detect data gaps (missing seasons)
 * 
 * @param availableSeasons - Number of seasons with valid data
 * @returns Anomaly if critical gap exists, null otherwise
 */
export function detectDataGap(availableSeasons: number): SeasonalAnomaly | null {
  if (availableSeasons < 2) {
    return {
      season: 'all',
      type: 'data-gap',
      severity: 'high',
      areaImpactPercent: 0,
      description: `Insufficient seasonal data (only ${availableSeasons} season available). ` +
        `Need at least 2 seasons for meaningful comparison. ` +
        `Measurement reliability may be reduced.`
    };
  }
  
  if (availableSeasons === 2) {
    return {
      season: 'all',
      type: 'data-gap',
      severity: 'medium',
      areaImpactPercent: 0,
      description: `Limited seasonal data (only 2 seasons available). ` +
        `More seasons would improve validation. ` +
        `Current measurement should be reliable but may lack cross-validation.`
    };
  }
  
  return null;
}

/**
 * Classify anomaly severity based on area impact
 * 
 * @param impactPercent - Area impact percentage
 * @returns Severity classification
 */
export function classifyAnomalySeverity(impactPercent: number): AnomalySeverity {
  if (impactPercent > 15) return 'high';
  if (impactPercent > 8) return 'medium';
  return 'low';
}

/**
 * Generate human-readable anomaly summary
 * 
 * @param anomalies - Array of detected anomalies
 * @returns Summary string
 */
export function summarizeAnomalies(anomalies: SeasonalAnomaly[]): string {
  if (anomalies.length === 0) {
    return 'No seasonal anomalies detected.  Measurements are consistent across seasons.';
  }
  
  const highSeverity = anomalies. filter(a => a.severity === 'high');
  const mediumSeverity = anomalies.filter(a => a.severity === 'medium');
  const lowSeverity = anomalies.filter(a => a.severity === 'low');
  
  const parts: string[] = [];
  
  if (highSeverity.length > 0) {
    parts.push(`${highSeverity.length} high-severity anomaly(ies) detected`);
  }
  if (mediumSeverity.length > 0) {
    parts.push(`${mediumSeverity.length} medium-severity anomaly(ies)`);
  }
  if (lowSeverity.length > 0) {
    parts.push(`${lowSeverity.length} low-severity anomaly(ies)`);
  }
  
  const summary = parts.join(', ') + '. ';
  
  // List most significant anomalies
  const significant = anomalies.filter(a => a.severity !== 'low');
  if (significant.length > 0) {
    const types = significant.map(a => a.type).join(', ');
    return summary + `Types: ${types}.  Review individual anomalies for details.`;
  }
  
  return summary + 'Minor anomalies detected, measurements should still be reliable.';
}
