import { NextRequest, NextResponse } from 'next/server'
import { geocodeAddress } from '@/lib/geocoding'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const address = searchParams.get('address')
    
    if (!address || !address.trim()) {
      return NextResponse.json(
        { error: 'Address is required' },
        { status: 400 }
      )
    }
    
    const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_SOLAR_API_KEY
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Google API key not configured' },
        { status: 500 }
      )
    }
    
    const result = await geocodeAddress(address, apiKey)
    
    if (!result) {
      return NextResponse.json(
        { error: 'Could not find coordinates for this address. Please check the address and try again.' },
        { status: 404 }
      )
    }
    
    return NextResponse.json(result)
  } catch (error) {
    console.error('Geocoding route error:', error)
    return NextResponse.json(
      { error: 'Failed to geocode address' },
      { status: 500 }
    )
  }
}
