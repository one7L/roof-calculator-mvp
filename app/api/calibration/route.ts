/**
 * Calibration API Route
 * 
 * Provides regional calibration data for roof measurements.
 */

import { NextRequest, NextResponse } from 'next/server'
import { 
  getRegionalCalibration, 
  getAllRegionalCalibrations,
  findNearbyGAFReports 
} from '@/lib/database'

export interface CalibrationResponse {
  hasCalibration: boolean
  calibrationFactor: number
  sampleCount: number
  lastUpdated?: string
  regionCode?: string
  nearbyReportsCount: number
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const lat = parseFloat(searchParams.get('lat') || '')
    const lng = parseFloat(searchParams.get('lng') || '')
    const listAll = searchParams.get('all') === 'true'
    
    // List all calibrations (admin endpoint)
    if (listAll) {
      const calibrations = await getAllRegionalCalibrations()
      return NextResponse.json({ calibrations })
    }
    
    // Validate coordinates
    if (isNaN(lat) || isNaN(lng)) {
      return NextResponse.json(
        { error: 'Valid latitude and longitude are required' },
        { status: 400 }
      )
    }
    
    // Get regional calibration
    const calibration = await getRegionalCalibration(lat, lng)
    
    // Get nearby GAF reports count
    const nearbyReports = await findNearbyGAFReports(lat, lng, 15)
    
    const response: CalibrationResponse = {
      hasCalibration: !!calibration,
      calibrationFactor: calibration?.calibrationFactor || 1.0,
      sampleCount: calibration?.sampleCount || 0,
      lastUpdated: calibration?.lastUpdated,
      regionCode: calibration?.regionCode,
      nearbyReportsCount: nearbyReports.length
    }
    
    return NextResponse.json(response)
  } catch (error) {
    console.error('Calibration API error:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve calibration data' },
      { status: 500 }
    )
  }
}
