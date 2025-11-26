/**
 * GAF Upload API Route
 * 
 * Handles GAF report uploads (PDF or manual entry) for calibration.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createGAFReport, validateGAFReportInput, getUserGAFReports, getGAFReportById } from '@/lib/gafReports'
import { GAFReport } from '@/lib/database'

export interface GAFUploadRequest {
  userId: string
  address: string
  lat: number
  lng: number
  totalSquares: number
  pitchInfo: string
  facetCount: number
  wasteFactor: number
  reportDate: string
  pdfUrl?: string
}

export interface GAFUploadResponse {
  success: boolean
  report?: GAFReport
  errors?: string[]
}

export async function POST(request: NextRequest) {
  try {
    const body: GAFUploadRequest = await request.json()
    
    // Validate input
    const errors = validateGAFReportInput(body)
    if (errors.length > 0) {
      return NextResponse.json(
        { success: false, errors },
        { status: 400 }
      )
    }
    
    // Ensure userId is provided
    if (!body.userId) {
      return NextResponse.json(
        { success: false, errors: ['User ID is required'] },
        { status: 400 }
      )
    }
    
    // Create the GAF report
    const report = await createGAFReport({
      userId: body.userId,
      address: body.address,
      lat: body.lat,
      lng: body.lng,
      totalSquares: body.totalSquares,
      pitchInfo: body.pitchInfo || 'Unknown',
      facetCount: body.facetCount || 1,
      wasteFactor: body.wasteFactor || 0,
      reportDate: body.reportDate,
      pdfUrl: body.pdfUrl
    })
    
    const response: GAFUploadResponse = {
      success: true,
      report
    }
    
    return NextResponse.json(response, { status: 201 })
  } catch (error) {
    console.error('GAF upload error:', error)
    return NextResponse.json(
      { success: false, errors: ['Failed to upload GAF report'] },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('userId')
    const reportId = searchParams.get('reportId')
    
    // Get specific report by ID
    if (reportId) {
      const report = await getGAFReportById(reportId)
      if (!report) {
        return NextResponse.json(
          { error: 'Report not found' },
          { status: 404 }
        )
      }
      return NextResponse.json(report)
    }
    
    // Get all reports for a user
    if (userId) {
      const reports = await getUserGAFReports(userId)
      return NextResponse.json({ reports })
    }
    
    return NextResponse.json(
      { error: 'userId or reportId parameter required' },
      { status: 400 }
    )
  } catch (error) {
    console.error('GAF retrieve error:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve GAF reports' },
      { status: 500 }
    )
  }
}
