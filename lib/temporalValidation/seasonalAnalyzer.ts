/**
 * Seasonal Analyzer (Phase 2 of 5)
 * 
 * Cross-validates measurements across seasons to detect and filter:
 * - Snow cover (5-10% inflation in winter)
 * - Leaf obstruction (spring edge issues)
 * - Shadow variations (seasonal sun angles)
 * - Temporary structures (tarps, equipment)
 * 
 * Base Season Scores:
 * - Summer: 95 (optimal - clear shadows, no snow, no leaves)
 * - Fall: 90 (good - leaves down, clear visibility)
 * - Spring: 75 (fair - possible leaf cover)
 * - Winter: 70 (fair - snow risk)
 */

import { ImagerySourceManager } from './imagerySourceManager';
import {
  detectLeafCover,
  detectStructuralChange,
  detectHighVariance,
  detectShadowArtifacts,
  detectDataGap
} from './seasonalAnomalies';
import {
  SeasonalImagerySet,
  SeasonalValidationResult,
  SeasonalAnomaly,
  SeasonRecommendation,
  SeasonalAnalyzerConfig,
  DEFAULT_SEASONAL_CONFIG
} from './seasonalTypes';

export class SeasonalAnalyzer {
  private imageryManager: ImagerySourceManager;
  private config: SeasonalAnalyzerConfig;

  constructor(
    imageryManager: ImagerySourceManager,
    config: Partial<SeasonalAnalyzerConfig> = {}
  ) {
    this.imageryManager = imageryManager;
    this.config = { ...DEFAULT_SEASONAL_CONFIG, ...config };
  }

  /**
   * Fetch imagery for all 4 seasons in a given year
   * Uses Sentinel-2 historical archive (FREE)
   */
  async fetchSeasonalImagerySet(
    lat: number,
    lng: number,
    year: number = new Date().getFullYear()
  ): Promise<SeasonalImagerySet> {
    const seasons = ['spring', 'summer', 'fall', 'winter'] as const;
    
    const fetchPromises = seasons.map(async (season) => {
      try {
        const { month, day } = this.config.seasonDates[season];
        const imagery = await this.imageryManager.fetchSentinel2Imagery(
          lat,
          lng,
          new Date(year, month, day)
        );
        return { season, imagery };
      } catch (error) {
        console.warn(`Failed to fetch ${season} imagery:`, error);
        return { season, imagery: null };
      }
    });

    const results = await Promise.all(fetchPromises);

    const set: SeasonalImagerySet = {
      location: { lat, lng },
      spring: null,
      summer: null,
      fall: null,
      winter: null,
      captureYear: year,
      availableSeasons: 0
    };

    for (const { season, imagery } of results) {
      set[season] = imagery;
      if (imagery) set.availableSeasons++;
    }

    return set;
  }

  /**
   * Analyze footprint consistency across seasons
   * 
   * Detection Logic:
   * - If winter > summer * 1.05 → Snow cover (5%+ inflation)
   * - If spring < fall * 0.97 → Leaf cover (3%+ reduction)
   * - Coefficient of variation > 10% → High variance
   */
  analyzeFootprintConsistency(
    footprints: Map<string, number>
  ): { consistency: number; issues: string[]; anomalies: SeasonalAnomaly[] } {
    const issues: string[] = [];
    const anomalies: SeasonalAnomaly[] = [];
    const areas = Array.from(footprints.values()).filter(a => a > 0);

    // Minimum 2 seasons required
    if (areas.length < 2) {
      const dataGap = detectDataGap(areas.length);
      if (dataGap) anomalies.push(dataGap);
      
      return {
        consistency: 50,
        issues: ['insufficient-seasonal-data'],
        anomalies
      };
    }

    // Calculate statistics
    const mean = areas.reduce((a, b) => a + b) / areas.length;
    const variance = areas.map(a => Math.pow(a - mean, 2)).reduce((a, b) => a + b) / areas.length;
    const stdDev = Math.sqrt(variance);
    const coeffVar = (stdDev / mean) * 100;

    // Snow detection (winter vs summer)
    const winter = footprints.get('winter') || 0;
    const summer = footprints.get('summer') || 0;
    if (summer > 0 && winter > 0) {
      const inflation = ((winter / summer) - 1) * 100;
      if (inflation > this.config.thresholds.snowInflation) {
        issues.push(`snow-cover-detected: Winter ${inflation.toFixed(1)}% larger`);
        anomalies.push({
          season: 'winter',
          type: 'snow-cover',
          severity: inflation > 10 ? 'high' : 'medium',
          areaImpactPercent: inflation,
          description: `Snow cover inflates measurement by ${inflation.toFixed(1)}%`
        });
      }
    }

    // Leaf cover detection (spring vs fall)
    const spring = footprints.get('spring') || 0;
    const fall = footprints.get('fall') || 0;
    if (spring > 0 && fall > 0) {
      const leafAnomaly = detectLeafCover(spring, fall);
      if (leafAnomaly) {
        issues.push(`leaf-cover-detected: ${leafAnomaly.description}`);
        anomalies.push(leafAnomaly);
      }
    }

    // Structural change detection
    const structuralChange = detectStructuralChange(footprints);
    if (structuralChange) {
      issues.push(`structural-change: ${structuralChange.description}`);
      anomalies.push(structuralChange);
    }

    // High variance detection
    if (coeffVar > this.config.thresholds.highVariance) {
      const varianceAnomaly = detectHighVariance(footprints);
      if (varianceAnomaly) {
        issues.push(`high-seasonal-variance: ${coeffVar.toFixed(1)}% CV`);
        anomalies.push(varianceAnomaly);
      }
    }

    // Shadow artifacts
    const shadowAnomaly = detectShadowArtifacts(footprints);
    if (shadowAnomaly) {
      issues.push(`shadow-artifacts: ${shadowAnomaly.description}`);
      anomalies.push(shadowAnomaly);
    }

    // Consistency score: 100% if <5% variation, scales down
    const consistency = Math.max(0, Math.min(100, 100 - (coeffVar * 8)));

    return { consistency, issues, anomalies };
  }

  /**
   * Recommend best season for measurement
   * Applies penalties based on detected anomalies
   */
  recommendBestSeason(
    anomalies: SeasonalAnomaly[],
    availableSeasons: string[]
  ): SeasonRecommendation {
    const scores = { ...this.config.baseScores };
    const reasoning: string[] = [];

    // Apply penalties based on anomalies
    for (const anomaly of anomalies) {
      const penalty = this.config.anomalyPenalties[anomaly.severity];

      if (anomaly.season !== 'all' && scores[anomaly.season] !== undefined) {
        scores[anomaly.season] -= penalty;
        reasoning.push(`${anomaly.season}: -${penalty} (${anomaly.type})`);
      }
    }

    // Filter to only available seasons
    const available = Object.entries(scores)
      .filter(([season]) => availableSeasons.includes(season))
      .sort(([, a], [, b]) => b - a);

    if (available.length === 0) {
      return {
        season: 'summer',
        score: 0,
        reasoning: ['No seasonal data available, defaulting to summer']
      };
    }

    const [bestSeason, bestScore] = available[0];
    reasoning.unshift(`Recommended: ${bestSeason} (score: ${bestScore})`);

    return {
      season: bestSeason as 'spring' | 'summer' | 'fall' | 'winter',
      score: bestScore,
      reasoning
    };
  }

  /**
   * Calculate minimum confidence based on available seasons
   */
  private calculateMinimumConfidence(availableSeasons: number): number {
    if (availableSeasons < 2) return 0;
    const baseConfidence: Record<number, number> = {
      2: 60,  // Can compare two seasons
      3: 80,  // Good seasonal coverage
      4: 100  // Complete seasonal dataset
    };
    return baseConfidence[availableSeasons] || 0;
  }

  /**
   * Extract footprints from seasonal imagery
   * Uses existing enhancedOSM or autoTrace infrastructure
   */
  private async extractSeasonalFootprints(
    seasonalSet: SeasonalImagerySet
  ): Promise<Map<string, number>> {
    const footprints = new Map<string, number>();
    const seasons = ['spring', 'summer', 'fall', 'winter'] as const;

    for (const season of seasons) {
      const imagery = seasonalSet[season];
      if (imagery && imagery.footprintAreaSqFt) {
        footprints.set(season, imagery.footprintAreaSqFt);
      }
    }

    return footprints;
  }

  /**
   * MAIN ENTRY: Full seasonal validation pipeline
   */
  async performSeasonalValidation(
    lat: number,
    lng: number,
    year?: number
  ): Promise<SeasonalValidationResult> {
    const targetYear = year || new Date().getFullYear();

    // Step 1: Fetch seasonal imagery
    const seasonalSet = await this.fetchSeasonalImagerySet(lat, lng, targetYear);

    // Step 2: Extract footprints from each season
    const footprints = await this.extractSeasonalFootprints(seasonalSet);

    // Step 3: Analyze consistency
    const { consistency, issues, anomalies } = this.analyzeFootprintConsistency(footprints);

    // Step 4: Get available seasons
    const availableSeasons = ['spring', 'summer', 'fall', 'winter']
      .filter(s => seasonalSet[s as keyof Pick<SeasonalImagerySet, 'spring'|'summer'|'fall'|'winter'>] !== null);

    // Step 5: Recommend best season
    const recommendation = this.recommendBestSeason(anomalies, availableSeasons);

    // Step 6: Calculate variance
    const areas = Array.from(footprints.values()).filter(a => a > 0);
    const mean = areas.length > 0 ? areas.reduce((a, b) => a + b) / areas.length : 0;
    const areaVariance = areas.length > 1
      ? (Math.max(...areas) - Math.min(...areas)) / mean * 100
      : 0;

    // Step 7: Calculate quality score
    const minConfidence = this.calculateMinimumConfidence(seasonalSet.availableSeasons);
    const anomalyPenalty = anomalies.filter(a => a.severity === 'high').length * 15;
    const qualityScore = Math.max(0, Math.min(100,
      consistency * 0.4 +
      minConfidence * 0.4 +
      (100 - anomalyPenalty) * 0.2
    ));

    return {
      seasonalSet,
      footprintConsistency: consistency,
      pitchConsistency: 85, // Placeholder - enhanced in future phase
      areaVariance,
      anomalies,
      issues,
      recommendedSeason: recommendation.season,
      seasonScores: this.config.baseScores,
      qualityScore,
      recommendation
    };
  }
}
