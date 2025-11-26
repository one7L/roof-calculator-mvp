/**
 * Geocoding utility to convert addresses to coordinates
 */

export interface GeocodingResult {
  lat: number
  lng: number
  formattedAddress: string
  placeId?: string
}

export async function geocodeAddress(
  address: string,
  apiKey: string
): Promise<GeocodingResult | null> {
  try {
    const encodedAddress = encodeURIComponent(address)
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${apiKey}`
    
    const response = await fetch(url)
    
    if (!response.ok) {
      console.error('Geocoding API error:', response.status)
      return null
    }
    
    const data = await response.json()
    
    if (data.status !== 'OK' || !data.results || data.results.length === 0) {
      console.error('Geocoding failed:', data.status)
      return null
    }
    
    const result = data.results[0]
    const location = result.geometry.location
    
    return {
      lat: location.lat,
      lng: location.lng,
      formattedAddress: result.formatted_address,
      placeId: result.place_id
    }
  } catch (error) {
    console.error('Geocoding error:', error)
    return null
  }
}
