/**
 * Type definitions for Seasonal Analyzer (Phase 2)
 * 
 * Cross-validates measurements across different seasons to detect:
 * - Snow cover (inflates roof area by 5-10%)
 * - Leaf/vegetation obstruction (obscures edges)
 * - Shadow angle variations (affects pitch calculations)
 * - Temporary structures (tarps, equipment)
 */

import { ImagerySource } from './types';

/**
 * Seasonal imagery set for a specific location and year
 */
export interface SeasonalImagerySet {
  location: { lat: number; lng: number };
  spring: ImagerySource | null;   // April (best for no leaves)
  summer: ImagerySource | null;   // July (best shadows)
  fall: ImagerySource | null;     // October (leaves down)
  winter: ImagerySource | null;   // February (snow risk)
  captureYear: number;
  availableSeasons: number;
}

/**
 * Types of seasonal anomalies that can affect measurements
 */
export type SeasonalAnomalyType = 
  | 'snow-cover'           // Winter snow accumulation
  | 'leaf-cover'           // Spring/fall vegetation
  | 'shadow-artifact'      // Shadow angle issues
  | 'structural-change'    // Building modifications
  | 'high-variance'        // Inconsistent measurements
  | 'data-gap';            // Missing seasonal data

/**
 * Severity levels for anomalies
 */
export type AnomalySeverity = 'low' | 'medium' | 'high';

/**
 * Detected seasonal anomaly
 */
export interface SeasonalAnomaly {
  season: string;
  type: SeasonalAnomalyType;
  severity: AnomalySeverity;
  areaImpactPercent: number;      // How much it affects measurement
  description: string;
}

/**
 * Season recommendation with scoring
 */
export interface SeasonRecommendation {
  season: 'spring' | 'summer' | 'fall' | 'winter';
  score: number;                   // 0-100, higher is better
  reasoning: string[];
}

/**
 * Complete seasonal validation result
 */
export interface SeasonalValidationResult {
  seasonalSet: SeasonalImagerySet;
  footprintConsistency: number;    // 0-100%, how consistent across seasons
  pitchConsistency: number;        // 0-100%, pitch measurement consistency
  areaVariance: number;            // % variance between seasons
  anomalies: SeasonalAnomaly[];
  issues: string[];
  recommendedSeason: 'spring' | 'summer' | 'fall' | 'winter';
  seasonScores: Record<string, number>;
  qualityScore: number;            // 0-100%, overall quality
  recommendation: SeasonRecommendation;
}

/**
 * Configuration for seasonal analyzer
 */
export interface SeasonalAnalyzerConfig {
  // Season date configurations (month, day)
  seasonDates: {
    spring: { month: number; day: number };  // Default: April 15
    summer: { month: number; day: number };  // Default: July 15
    fall: { month: number; day: number };    // Default: October 15
    winter: { month: number; day: number };  // Default: February 15
  };
  
  // Base scores for season recommendation
  baseScores: {
    spring: number;  // Default: 75
    summer: number;  // Default: 95
    fall: number;    // Default: 90
    winter: number;  // Default: 70
  };
  
  // Thresholds for anomaly detection
  thresholds: {
    snowInflation: number;        // Default: 5% (winter > summer * 1.05)
    leafReduction: number;        // Default: 3% (spring < fall * 0.97)
    highVariance: number;         // Default: 10% (coefficient of variation)
    structuralChange: number;     // Default: 5% (year-over-year)
  };
  
  // Penalty scores for anomalies
  anomalyPenalties: {
    low: number;      // Default: 5
    medium: number;   // Default: 15
    high: number;     // Default: 25
  };
}

/**
 * Default configuration for seasonal analyzer
 */
export const DEFAULT_SEASONAL_CONFIG: SeasonalAnalyzerConfig = {
  seasonDates: {
    spring: { month: 3, day: 15 },   // April 15
    summer: { month: 6, day: 15 },   // July 15
    fall: { month: 9, day: 15 },     // October 15
    winter: { month: 1, day: 15 }    // February 15
  },
  baseScores: {
    spring: 70,  // Leaf budding can obscure edges
    summer: 85,  // Full foliage reduces boundary clarity
    fall: 95,    // Optimal visibility, leaves down
    winter: 75   // Snow risk despite no leaves
  },
  thresholds: {
    snowInflation: 5,
    leafReduction: 3,
    highVariance: 10,
    structuralChange: 5
  },
  anomalyPenalties: {
    low: 5,
    medium: 15,
    high: 25
  }
};