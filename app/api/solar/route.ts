/**
 * Solar API Route
 * 
 * Provides roof measurements using a tiered fallback system.
 * Returns the BEST available source, not an average of all sources.
 */

import { NextRequest, NextResponse } from 'next/server'
import { 
  getRoofMeasurementTiered, 
  MeasurementResult,
  TieredMeasurementResult,
  TierFailure,
  getTierAccuracy
} from '@/lib/roofMeasurement'
import { crossValidateMeasurements, CrossValidationResult } from '@/lib/crossValidation'
import { calculateConfidence, ConfidenceResult } from '@/lib/confidenceScoring'
import { getCalibrationForLocation, findGAFReportForLocation, GAFCalibrationResult } from '@/lib/gafReports'
import { calculatePitchMultiplierFromDegrees, areaToSquares } from '@/lib/pitchCalculations'

export interface SolarAPIResponse {
  measurement: MeasurementResult
  crossValidation: CrossValidationResult
  confidence: ConfidenceResult
  gafCalibration?: {
    calibrationFactor: number
    basedOnReports: number
    lastCalibrated: string
  }
  recommendations: string[]
  enableManualTracing: boolean
  // NEW: Tiered system information
  source: {
    tier: number
    name: string
    accuracy: string
    confidence: number
  }
  higherTierFailures?: TierFailure[]
  dataQuality: {
    imageryQuality?: 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN'
    imageryAge?: string
    segmentConfidence?: number
  }
  manualTracingRequired: boolean
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const lat = parseFloat(searchParams.get('lat') || '')
    const lng = parseFloat(searchParams.get('lng') || '')
    const address = searchParams.get('address') || undefined
    
    // Validate coordinates
    if (isNaN(lat) || isNaN(lng)) {
      return NextResponse.json(
        { error: 'Valid latitude and longitude are required' },
        { status: 400 }
      )
    }
    
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return NextResponse.json(
        { error: 'Coordinates out of valid range' },
        { status: 400 }
      )
    }
    
    // Get API keys from environment
    const googleApiKey = process.env.GOOGLE_SOLAR_API_KEY
    const instantRooferApiKey = process.env.INSTANT_ROOFER_API_KEY
    
    if (!googleApiKey) {
      return NextResponse.json(
        { error: 'Google Solar API key not configured' },
        { status: 500 }
      )
    }
    
    // Get measurements using the NEW tiered fallback system
    const tieredResult = await getRoofMeasurementTiered({
      lat,
      lng,
      address,
      googleApiKey,
      instantRooferApiKey
    })
    
    const result = tieredResult.measurement
    const enableManualTracing = tieredResult.tierUsed === 7
    
    // Check for GAF calibration data
    let gafCalibration: GAFCalibrationResult | undefined
    if (address) {
      const gafData = await findGAFReportForLocation(address, lat, lng)
      if (gafData.exactMatch || gafData.nearbyReports.length > 0) {
        gafCalibration = await getCalibrationForLocation(lat, lng, result.adjustedAreaSqFt) || undefined
      }
    } else {
      gafCalibration = await getCalibrationForLocation(lat, lng, result.adjustedAreaSqFt) || undefined
    }
    
    // Cross-validate measurements (now in validation mode, not averaging)
    const crossValidation = crossValidateMeasurements([result], gafCalibration)
    
    // Calculate detailed confidence
    const confidence = calculateConfidence({
      imageryQuality: result.imageryQuality || 'UNKNOWN',
      imageryDate: result.imageryDate,
      segmentCount: result.segmentCount,
      pitchDegrees: result.pitchDegrees,
      sourceCount: 1,
      sourceAgreementPercent: 100,
      hasGafCalibration: !!gafCalibration?.exactMatch,
      hasLidarData: result.source === 'instant-roofer'
    })
    
    // Generate recommendations based on tier used
    const recommendations = generateRecommendations(
      crossValidation,
      confidence,
      tieredResult,
      gafCalibration,
      enableManualTracing
    )
    
    // Apply calibration if available
    let finalMeasurement = result
    if (gafCalibration && gafCalibration.calibrationFactor !== 1.0) {
      finalMeasurement = {
        ...finalMeasurement,
        adjustedAreaSqFt: finalMeasurement.adjustedAreaSqFt * gafCalibration.calibrationFactor,
        squares: (finalMeasurement.adjustedAreaSqFt * gafCalibration.calibrationFactor) / 100
      }
    }
    
    const response: SolarAPIResponse = {
      measurement: finalMeasurement,
      crossValidation,
      confidence,
      gafCalibration: gafCalibration ? {
        calibrationFactor: gafCalibration.calibrationFactor,
        basedOnReports: gafCalibration.basedOnReports,
        lastCalibrated: gafCalibration.lastCalibrated
      } : undefined,
      recommendations,
      enableManualTracing,
      // NEW: Tier information
      source: {
        tier: tieredResult.tierUsed,
        name: tieredResult.tierName,
        accuracy: getTierAccuracy(tieredResult.tierUsed),
        confidence: result.confidence
      },
      higherTierFailures: tieredResult.higherTierFailures.length > 0 
        ? tieredResult.higherTierFailures 
        : undefined,
      dataQuality: {
        imageryQuality: result.imageryQuality,
        imageryAge: result.imageryDate,
        segmentConfidence: result.confidence
      },
      manualTracingRequired: enableManualTracing
    }
    
    return NextResponse.json(response)
  } catch (error) {
    console.error('Solar API error:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve roof measurements' },
      { status: 500 }
    )
  }
}

function generateRecommendations(
  crossValidation: CrossValidationResult,
  confidence: ConfidenceResult,
  tieredResult: TieredMeasurementResult,
  gafCalibration?: GAFCalibrationResult,
  enableManualTracing?: boolean
): string[] {
  const recommendations: string[] = []
  
  // Add tier-specific recommendations
  if (tieredResult.tierUsed >= 5) {
    // Low tier - strongly suggest alternatives
    recommendations.push('⚠️ Using lower-accuracy data source. For better accuracy:')
    recommendations.push('• Upload a GAF report for this address')
    recommendations.push('• Use manual tracing to outline the roof')
    recommendations.push('• Consider requesting a professional measurement')
  } else if (tieredResult.tierUsed >= 3) {
    // Medium tier
    recommendations.push('📊 Using moderate-accuracy data source.')
    if (!gafCalibration) {
      recommendations.push('Upload a GAF report to improve confidence.')
    }
  }
  
  // Add main cross-validation recommendation
  recommendations.push(crossValidation.recommendation)
  
  // Add confidence-based recommendations
  if (confidence.level === 'low') {
    if (!recommendations.some(r => r.includes('GAF report'))) {
      recommendations.push('Upload a historical GAF report for this address to improve accuracy.')
    }
    if (!recommendations.some(r => r.includes('professional'))) {
      recommendations.push('Consider requesting a professional roof measurement.')
    }
  } else if (confidence.level === 'moderate') {
    if (!gafCalibration && !recommendations.some(r => r.includes('GAF'))) {
      recommendations.push('Upload a GAF report to achieve GAF-level confidence.')
    }
  }
  
  // Add discrepancy warnings
  if (crossValidation.discrepancies.length > 0) {
    recommendations.push('Review measurement discrepancies before finalizing quote.')
  }
  
  // Add manual tracing suggestion if needed
  if (enableManualTracing) {
    recommendations.push('Use the manual tracing tool to outline the roof for more accurate measurements.')
  }
  
  // Add higher tier failure info if applicable
  if (tieredResult.higherTierFailures.length > 0 && tieredResult.tierUsed > 2) {
    const failureReasons = tieredResult.higherTierFailures
      .slice(0, 2)
      .map(f => `${f.tierName}: ${f.reason}`)
      .join('; ')
    recommendations.push(`ℹ️ Why higher-accuracy sources weren't used: ${failureReasons}`)
  }
  
  return recommendations
}

export async function POST(request: NextRequest) {
  // Handle manual tracing submission
  try {
    const body = await request.json()
    const { manualArea, manualPitch } = body
    
    if (!manualArea || manualArea <= 0) {
      return NextResponse.json(
        { error: 'Valid manual area is required' },
        { status: 400 }
      )
    }
    
    // Create measurement result from manual input
    const pitchDegrees = manualPitch || 20 // Default to 20 degrees if not provided
    const pitchMultiplier = calculatePitchMultiplierFromDegrees(pitchDegrees)
    const adjustedAreaSqFt = manualArea * pitchMultiplier
    
    const manualMeasurement: MeasurementResult = {
      totalAreaSqM: manualArea / 10.7639,
      totalAreaSqFt: manualArea,
      adjustedAreaSqFt,
      squares: areaToSquares(adjustedAreaSqFt),
      pitchDegrees,
      pitchMultiplier,
      segmentCount: 1,
      complexity: 'simple',
      source: 'manual-tracing',
      confidence: 85
    }
    
    const crossValidation = crossValidateMeasurements([manualMeasurement])
    
    const confidence = calculateConfidence({
      sourceCount: 1,
      pitchDegrees,
      hasGafCalibration: false,
      hasLidarData: false
    })
    
    const response: SolarAPIResponse = {
      measurement: manualMeasurement,
      crossValidation,
      confidence,
      recommendations: [
        'Manual measurements provided. Consider verifying with site visit.',
        'Upload a GAF report if available for calibration.'
      ],
      enableManualTracing: false,
      // Manual tracing is Tier 7
      source: {
        tier: 7,
        name: 'Manual Polygon Tracing',
        accuracy: '85-95%',
        confidence: 85
      },
      higherTierFailures: undefined,
      dataQuality: {
        imageryQuality: undefined,
        imageryAge: undefined,
        segmentConfidence: 85
      },
      manualTracingRequired: false
    }
    
    return NextResponse.json(response)
  } catch (error) {
    console.error('Manual measurement error:', error)
    return NextResponse.json(
      { error: 'Failed to process manual measurement' },
      { status: 500 }
    )
  }
}
