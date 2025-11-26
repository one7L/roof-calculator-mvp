/**
 * Solar API Route
 * 
 * Provides roof measurements with cross-validation and confidence scoring.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getRoofMeasurement, MeasurementResult } from '@/lib/roofMeasurement'
import { crossValidateMeasurements, CrossValidationResult } from '@/lib/crossValidation'
import { calculateConfidence, ConfidenceResult } from '@/lib/confidenceScoring'
import { getCalibrationForLocation, findGAFReportForLocation, GAFCalibrationResult } from '@/lib/gafReports'

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
    
    // Get measurements from all available sources
    const { result, allResults, enableManualTracing } = await getRoofMeasurement({
      lat,
      lng,
      address,
      googleApiKey,
      instantRooferApiKey,
      enableFallbacks: true
    })
    
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
    
    // Cross-validate measurements
    const crossValidation = crossValidateMeasurements(allResults, gafCalibration)
    
    // Calculate detailed confidence
    const confidence = calculateConfidence({
      imageryQuality: result.imageryQuality || 'UNKNOWN',
      imageryDate: result.imageryDate,
      segmentCount: result.segmentCount,
      pitchDegrees: result.pitchDegrees,
      sourceCount: allResults.length,
      sourceAgreementPercent: crossValidation.agreementScore,
      hasGafCalibration: !!gafCalibration?.exactMatch,
      hasLidarData: allResults.some(r => r.source === 'instant-roofer')
    })
    
    // Generate recommendations
    const recommendations = generateRecommendations(
      crossValidation,
      confidence,
      gafCalibration,
      enableManualTracing
    )
    
    // Apply calibration if available
    let finalMeasurement = crossValidation.finalMeasurement
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
      enableManualTracing
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
  gafCalibration?: GAFCalibrationResult,
  enableManualTracing?: boolean
): string[] {
  const recommendations: string[] = []
  
  // Add main cross-validation recommendation
  recommendations.push(crossValidation.recommendation)
  
  // Add confidence-based recommendations
  if (confidence.level === 'low') {
    recommendations.push('Upload a historical GAF report for this address to improve accuracy.')
    recommendations.push('Consider requesting a professional roof measurement.')
  } else if (confidence.level === 'moderate') {
    if (!gafCalibration) {
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
  
  return recommendations
}

export async function POST(request: NextRequest) {
  // Handle manual tracing submission
  try {
    const body = await request.json()
    const { lat, lng, address, manualArea, manualPitch } = body
    
    if (!manualArea || manualArea <= 0) {
      return NextResponse.json(
        { error: 'Valid manual area is required' },
        { status: 400 }
      )
    }
    
    // Create measurement result from manual input
    const pitchDegrees = manualPitch || 20 // Default to 20 degrees if not provided
    const { calculatePitchMultiplierFromDegrees, areaToSquares } = await import('@/lib/pitchCalculations')
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
      enableManualTracing: false
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
