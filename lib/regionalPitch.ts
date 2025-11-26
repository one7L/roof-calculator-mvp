/**
 * Regional Pitch Estimation Module
 * 
 * Provides state-based default pitch estimates when no other pitch data is available.
 * Based on regional climate patterns and common building practices:
 * 
 * - Snow load regions (MA, NH, VT, etc.): Steeper pitches (6-8:12) to shed snow
 * - Mild climate regions (FL, TX, AZ, etc.): Lower pitches (3-4:12)
 * - Moderate climate regions (CA, OR, WA, etc.): Medium pitches (4-6:12)
 */

export type ClimateZone = 'snow-load' | 'mild' | 'moderate' | 'unknown'

export interface RegionalPitchData {
  state: string
  stateName: string
  climateZone: ClimateZone
  defaultPitchRatio: number // e.g., 6 for 6:12
  pitchRangeMin: number
  pitchRangeMax: number
  notes: string
}

/**
 * State abbreviation to regional pitch data mapping
 */
const STATE_PITCH_DATA: Record<string, RegionalPitchData> = {
  // Snow load regions - steeper pitches (6-8:12)
  'MA': { state: 'MA', stateName: 'Massachusetts', climateZone: 'snow-load', defaultPitchRatio: 7, pitchRangeMin: 6, pitchRangeMax: 8, notes: 'Heavy snow load region' },
  'NH': { state: 'NH', stateName: 'New Hampshire', climateZone: 'snow-load', defaultPitchRatio: 8, pitchRangeMin: 6, pitchRangeMax: 9, notes: 'Heavy snow load region' },
  'VT': { state: 'VT', stateName: 'Vermont', climateZone: 'snow-load', defaultPitchRatio: 8, pitchRangeMin: 6, pitchRangeMax: 9, notes: 'Heavy snow load region' },
  'ME': { state: 'ME', stateName: 'Maine', climateZone: 'snow-load', defaultPitchRatio: 8, pitchRangeMin: 6, pitchRangeMax: 9, notes: 'Heavy snow load region' },
  'CT': { state: 'CT', stateName: 'Connecticut', climateZone: 'snow-load', defaultPitchRatio: 6, pitchRangeMin: 5, pitchRangeMax: 8, notes: 'Moderate to heavy snow' },
  'RI': { state: 'RI', stateName: 'Rhode Island', climateZone: 'snow-load', defaultPitchRatio: 6, pitchRangeMin: 5, pitchRangeMax: 8, notes: 'Moderate to heavy snow' },
  'NY': { state: 'NY', stateName: 'New York', climateZone: 'snow-load', defaultPitchRatio: 6, pitchRangeMin: 5, pitchRangeMax: 8, notes: 'Moderate to heavy snow' },
  'PA': { state: 'PA', stateName: 'Pennsylvania', climateZone: 'snow-load', defaultPitchRatio: 6, pitchRangeMin: 5, pitchRangeMax: 8, notes: 'Moderate snow load' },
  'MI': { state: 'MI', stateName: 'Michigan', climateZone: 'snow-load', defaultPitchRatio: 7, pitchRangeMin: 6, pitchRangeMax: 9, notes: 'Heavy lake-effect snow' },
  'WI': { state: 'WI', stateName: 'Wisconsin', climateZone: 'snow-load', defaultPitchRatio: 7, pitchRangeMin: 6, pitchRangeMax: 8, notes: 'Heavy snow load' },
  'MN': { state: 'MN', stateName: 'Minnesota', climateZone: 'snow-load', defaultPitchRatio: 7, pitchRangeMin: 6, pitchRangeMax: 9, notes: 'Very heavy snow load' },
  'ND': { state: 'ND', stateName: 'North Dakota', climateZone: 'snow-load', defaultPitchRatio: 7, pitchRangeMin: 6, pitchRangeMax: 8, notes: 'Heavy snow load' },
  'SD': { state: 'SD', stateName: 'South Dakota', climateZone: 'snow-load', defaultPitchRatio: 6, pitchRangeMin: 5, pitchRangeMax: 8, notes: 'Moderate to heavy snow' },
  'MT': { state: 'MT', stateName: 'Montana', climateZone: 'snow-load', defaultPitchRatio: 7, pitchRangeMin: 6, pitchRangeMax: 9, notes: 'Heavy mountain snow' },
  'WY': { state: 'WY', stateName: 'Wyoming', climateZone: 'snow-load', defaultPitchRatio: 7, pitchRangeMin: 6, pitchRangeMax: 9, notes: 'Heavy mountain snow' },
  'CO': { state: 'CO', stateName: 'Colorado', climateZone: 'snow-load', defaultPitchRatio: 6, pitchRangeMin: 5, pitchRangeMax: 8, notes: 'Variable snow by elevation' },
  'ID': { state: 'ID', stateName: 'Idaho', climateZone: 'snow-load', defaultPitchRatio: 6, pitchRangeMin: 5, pitchRangeMax: 8, notes: 'Moderate to heavy snow' },
  'UT': { state: 'UT', stateName: 'Utah', climateZone: 'snow-load', defaultPitchRatio: 6, pitchRangeMin: 5, pitchRangeMax: 8, notes: 'Variable snow by elevation' },
  'IA': { state: 'IA', stateName: 'Iowa', climateZone: 'snow-load', defaultPitchRatio: 6, pitchRangeMin: 5, pitchRangeMax: 7, notes: 'Moderate snow load' },
  'NE': { state: 'NE', stateName: 'Nebraska', climateZone: 'snow-load', defaultPitchRatio: 5, pitchRangeMin: 4, pitchRangeMax: 7, notes: 'Light to moderate snow' },
  'OH': { state: 'OH', stateName: 'Ohio', climateZone: 'snow-load', defaultPitchRatio: 6, pitchRangeMin: 5, pitchRangeMax: 7, notes: 'Lake-effect snow in north' },
  'IN': { state: 'IN', stateName: 'Indiana', climateZone: 'snow-load', defaultPitchRatio: 5, pitchRangeMin: 4, pitchRangeMax: 7, notes: 'Moderate snow load' },
  'IL': { state: 'IL', stateName: 'Illinois', climateZone: 'snow-load', defaultPitchRatio: 5, pitchRangeMin: 4, pitchRangeMax: 7, notes: 'Moderate snow load' },
  'AK': { state: 'AK', stateName: 'Alaska', climateZone: 'snow-load', defaultPitchRatio: 9, pitchRangeMin: 8, pitchRangeMax: 12, notes: 'Extreme snow load' },
  
  // Mild climate regions - lower pitches (3-4:12)
  'FL': { state: 'FL', stateName: 'Florida', climateZone: 'mild', defaultPitchRatio: 4, pitchRangeMin: 3, pitchRangeMax: 5, notes: 'Mild climate, hurricane considerations' },
  'TX': { state: 'TX', stateName: 'Texas', climateZone: 'mild', defaultPitchRatio: 4, pitchRangeMin: 3, pitchRangeMax: 5, notes: 'Mild climate, varies by region' },
  'AZ': { state: 'AZ', stateName: 'Arizona', climateZone: 'mild', defaultPitchRatio: 3, pitchRangeMin: 2, pitchRangeMax: 4, notes: 'Desert climate, minimal precipitation' },
  'NM': { state: 'NM', stateName: 'New Mexico', climateZone: 'mild', defaultPitchRatio: 3, pitchRangeMin: 2, pitchRangeMax: 5, notes: 'Desert to mountain variation' },
  'NV': { state: 'NV', stateName: 'Nevada', climateZone: 'mild', defaultPitchRatio: 3, pitchRangeMin: 2, pitchRangeMax: 5, notes: 'Desert climate, mountain areas vary' },
  'LA': { state: 'LA', stateName: 'Louisiana', climateZone: 'mild', defaultPitchRatio: 4, pitchRangeMin: 3, pitchRangeMax: 5, notes: 'Humid subtropical, hurricane considerations' },
  'MS': { state: 'MS', stateName: 'Mississippi', climateZone: 'mild', defaultPitchRatio: 4, pitchRangeMin: 3, pitchRangeMax: 5, notes: 'Humid subtropical' },
  'AL': { state: 'AL', stateName: 'Alabama', climateZone: 'mild', defaultPitchRatio: 4, pitchRangeMin: 3, pitchRangeMax: 5, notes: 'Humid subtropical' },
  'GA': { state: 'GA', stateName: 'Georgia', climateZone: 'mild', defaultPitchRatio: 4, pitchRangeMin: 3, pitchRangeMax: 5, notes: 'Humid subtropical' },
  'SC': { state: 'SC', stateName: 'South Carolina', climateZone: 'mild', defaultPitchRatio: 4, pitchRangeMin: 3, pitchRangeMax: 5, notes: 'Humid subtropical' },
  'HI': { state: 'HI', stateName: 'Hawaii', climateZone: 'mild', defaultPitchRatio: 4, pitchRangeMin: 3, pitchRangeMax: 5, notes: 'Tropical climate' },
  
  // Moderate climate regions - medium pitches (4-6:12)
  'CA': { state: 'CA', stateName: 'California', climateZone: 'moderate', defaultPitchRatio: 5, pitchRangeMin: 4, pitchRangeMax: 6, notes: 'Mediterranean climate, varies by region' },
  'OR': { state: 'OR', stateName: 'Oregon', climateZone: 'moderate', defaultPitchRatio: 5, pitchRangeMin: 4, pitchRangeMax: 7, notes: 'Pacific Northwest, moderate rain' },
  'WA': { state: 'WA', stateName: 'Washington', climateZone: 'moderate', defaultPitchRatio: 5, pitchRangeMin: 4, pitchRangeMax: 7, notes: 'Pacific Northwest, moderate rain, mountain snow' },
  'NJ': { state: 'NJ', stateName: 'New Jersey', climateZone: 'moderate', defaultPitchRatio: 5, pitchRangeMin: 4, pitchRangeMax: 6, notes: 'Moderate climate, coastal influence' },
  'DE': { state: 'DE', stateName: 'Delaware', climateZone: 'moderate', defaultPitchRatio: 5, pitchRangeMin: 4, pitchRangeMax: 6, notes: 'Moderate climate, coastal influence' },
  'MD': { state: 'MD', stateName: 'Maryland', climateZone: 'moderate', defaultPitchRatio: 5, pitchRangeMin: 4, pitchRangeMax: 6, notes: 'Moderate climate, varies by region' },
  'VA': { state: 'VA', stateName: 'Virginia', climateZone: 'moderate', defaultPitchRatio: 5, pitchRangeMin: 4, pitchRangeMax: 6, notes: 'Moderate climate, mountain areas vary' },
  'WV': { state: 'WV', stateName: 'West Virginia', climateZone: 'moderate', defaultPitchRatio: 5, pitchRangeMin: 4, pitchRangeMax: 7, notes: 'Moderate to heavy, mountain influence' },
  'NC': { state: 'NC', stateName: 'North Carolina', climateZone: 'moderate', defaultPitchRatio: 5, pitchRangeMin: 4, pitchRangeMax: 6, notes: 'Moderate climate, mountain areas vary' },
  'TN': { state: 'TN', stateName: 'Tennessee', climateZone: 'moderate', defaultPitchRatio: 5, pitchRangeMin: 4, pitchRangeMax: 6, notes: 'Humid subtropical to humid continental' },
  'KY': { state: 'KY', stateName: 'Kentucky', climateZone: 'moderate', defaultPitchRatio: 5, pitchRangeMin: 4, pitchRangeMax: 6, notes: 'Humid subtropical' },
  'MO': { state: 'MO', stateName: 'Missouri', climateZone: 'moderate', defaultPitchRatio: 5, pitchRangeMin: 4, pitchRangeMax: 6, notes: 'Continental climate, moderate precipitation' },
  'KS': { state: 'KS', stateName: 'Kansas', climateZone: 'moderate', defaultPitchRatio: 4, pitchRangeMin: 3, pitchRangeMax: 6, notes: 'Semi-arid to humid continental' },
  'OK': { state: 'OK', stateName: 'Oklahoma', climateZone: 'moderate', defaultPitchRatio: 4, pitchRangeMin: 3, pitchRangeMax: 5, notes: 'Humid subtropical, tornado region' },
  'AR': { state: 'AR', stateName: 'Arkansas', climateZone: 'moderate', defaultPitchRatio: 4, pitchRangeMin: 3, pitchRangeMax: 6, notes: 'Humid subtropical' },
  'DC': { state: 'DC', stateName: 'District of Columbia', climateZone: 'moderate', defaultPitchRatio: 5, pitchRangeMin: 4, pitchRangeMax: 6, notes: 'Humid subtropical' },
}

// Default values for unknown states
const DEFAULT_PITCH_DATA: RegionalPitchData = {
  state: 'XX',
  stateName: 'Unknown',
  climateZone: 'unknown',
  defaultPitchRatio: 5, // 5:12 is a reasonable middle ground
  pitchRangeMin: 4,
  pitchRangeMax: 6,
  notes: 'Default values used for unknown region'
}

/**
 * Get regional pitch data for a state
 * 
 * @param stateCode - Two-letter state abbreviation (e.g., 'MA', 'FL')
 * @returns Regional pitch data for the state
 */
export function getRegionalPitchData(stateCode: string): RegionalPitchData {
  const normalizedCode = stateCode.toUpperCase().trim()
  return STATE_PITCH_DATA[normalizedCode] || DEFAULT_PITCH_DATA
}

/**
 * Convert pitch ratio to degrees
 * 
 * @param pitchRatio - Pitch ratio (e.g., 6 for 6:12)
 * @returns Pitch in degrees
 */
export function pitchRatioToDegrees(pitchRatio: number): number {
  return Math.atan(pitchRatio / 12) * (180 / Math.PI)
}

/**
 * Get default pitch in degrees for a state
 * 
 * @param stateCode - Two-letter state abbreviation
 * @returns Default pitch in degrees
 */
export function getDefaultPitchDegrees(stateCode: string): number {
  const data = getRegionalPitchData(stateCode)
  return pitchRatioToDegrees(data.defaultPitchRatio)
}

/**
 * Get pitch range in degrees for a state
 * 
 * @param stateCode - Two-letter state abbreviation
 * @returns Object with min and max pitch in degrees
 */
export function getPitchRangeDegrees(stateCode: string): { min: number; max: number } {
  const data = getRegionalPitchData(stateCode)
  return {
    min: pitchRatioToDegrees(data.pitchRangeMin),
    max: pitchRatioToDegrees(data.pitchRangeMax)
  }
}

/**
 * Extract state code from an address string
 * 
 * @param address - Full address string
 * @returns Two-letter state code or null if not found
 */
export function extractStateFromAddress(address: string): string | null {
  if (!address) return null
  
  // Pattern 1: ZIP code format "City, ST 12345"
  const zipPattern = /,\s*([A-Z]{2})\s+\d{5}/i
  const zipMatch = address.match(zipPattern)
  if (zipMatch) {
    return zipMatch[1].toUpperCase()
  }
  
  // Pattern 2: "City, State" without ZIP
  const statePattern = /,\s*([A-Z]{2})\s*(?:,|$)/i
  const stateMatch = address.match(statePattern)
  if (stateMatch) {
    return stateMatch[1].toUpperCase()
  }
  
  // Pattern 3: Full state name at end
  const fullStateNames: Record<string, string> = {
    'alabama': 'AL', 'alaska': 'AK', 'arizona': 'AZ', 'arkansas': 'AR',
    'california': 'CA', 'colorado': 'CO', 'connecticut': 'CT', 'delaware': 'DE',
    'florida': 'FL', 'georgia': 'GA', 'hawaii': 'HI', 'idaho': 'ID',
    'illinois': 'IL', 'indiana': 'IN', 'iowa': 'IA', 'kansas': 'KS',
    'kentucky': 'KY', 'louisiana': 'LA', 'maine': 'ME', 'maryland': 'MD',
    'massachusetts': 'MA', 'michigan': 'MI', 'minnesota': 'MN', 'mississippi': 'MS',
    'missouri': 'MO', 'montana': 'MT', 'nebraska': 'NE', 'nevada': 'NV',
    'new hampshire': 'NH', 'new jersey': 'NJ', 'new mexico': 'NM', 'new york': 'NY',
    'north carolina': 'NC', 'north dakota': 'ND', 'ohio': 'OH', 'oklahoma': 'OK',
    'oregon': 'OR', 'pennsylvania': 'PA', 'rhode island': 'RI', 'south carolina': 'SC',
    'south dakota': 'SD', 'tennessee': 'TN', 'texas': 'TX', 'utah': 'UT',
    'vermont': 'VT', 'virginia': 'VA', 'washington': 'WA', 'west virginia': 'WV',
    'wisconsin': 'WI', 'wyoming': 'WY', 'district of columbia': 'DC'
  }
  
  const lowerAddress = address.toLowerCase()
  for (const [fullName, code] of Object.entries(fullStateNames)) {
    if (lowerAddress.includes(fullName)) {
      return code
    }
  }
  
  return null
}

/**
 * Get regional pitch estimate with confidence range
 * 
 * @param address - Full address string
 * @returns Object with pitch estimate and metadata
 */
export function getRegionalPitchEstimate(address: string): {
  stateCode: string | null
  pitchDegrees: number
  pitchRatio: number
  pitchRangeMin: number
  pitchRangeMax: number
  climateZone: ClimateZone
  confidence: number
  notes: string
} {
  const stateCode = extractStateFromAddress(address)
  const pitchData = stateCode ? getRegionalPitchData(stateCode) : DEFAULT_PITCH_DATA
  
  return {
    stateCode,
    pitchDegrees: pitchRatioToDegrees(pitchData.defaultPitchRatio),
    pitchRatio: pitchData.defaultPitchRatio,
    pitchRangeMin: pitchData.pitchRangeMin,
    pitchRangeMax: pitchData.pitchRangeMax,
    climateZone: pitchData.climateZone,
    confidence: stateCode ? 70 : 50, // Higher confidence when state is identified
    notes: pitchData.notes
  }
}
