'use client'

import { useState } from 'react'
import ConfidenceMeter from './components/ConfidenceMeter'
import GAFUpload, { GAFUploadData } from './components/GAFUpload'
import CrossValidationView, { GAFComparisonView } from './components/CrossValidationView'
import SourceTierDisplay from './components/SourceTierDisplay'
import ManualTracingPrompt from './components/ManualTracingPrompt'
import { MeasurementResult, TierFailure } from '@/lib/roofMeasurement'
import { CrossValidationResult } from '@/lib/crossValidation'
import { ConfidenceResult } from '@/lib/confidenceScoring'

interface RoofCalculationResult {
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
  // NEW: Tier information from API
  source?: {
    tier: number
    name: string
    accuracy: string
    confidence: number
  }
  higherTierFailures?: TierFailure[]
  dataQuality?: {
    imageryQuality?: 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN'
    imageryAge?: string
    segmentConfidence?: number
  }
  manualTracingRequired?: boolean
}

export default function Home() {
  const [address, setAddress] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<RoofCalculationResult | null>(null)
  const [gafReport, setGafReport] = useState<{ totalAreaSqFt: number } | null>(null)
  const [showGAFUpload, setShowGAFUpload] = useState(false)
  
  const handleCalculate = async () => {
    if (!address.trim()) {
      setError('Please enter an address')
      return
    }
    
    setIsLoading(true)
    setError(null)
    
    try {
      // Step 1: Geocode the address to get coordinates
      const geocodeResponse = await fetch(`/api/geocode?address=${encodeURIComponent(address)}`)
      
      if (!geocodeResponse.ok) {
        const errorData = await geocodeResponse.json()
        throw new Error(errorData.error || 'Could not find this address. Please check and try again.')
      }
      
      const geocodeData = await geocodeResponse.json()
      const { lat, lng, formattedAddress } = geocodeData
      
      // Update address with formatted version if different
      if (formattedAddress && formattedAddress !== address) {
        setAddress(formattedAddress)
      }
      
      // Step 2: Call Solar API with actual coordinates
      const response = await fetch(`/api/solar?lat=${lat}&lng=${lng}&address=${encodeURIComponent(formattedAddress || address)}`)
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to calculate roof measurements')
      }
      
      const data: RoofCalculationResult = await response.json()
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }
  
  const handleGAFUpload = async (data: GAFUploadData) => {
    const response = await fetch('/api/gaf-upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    
    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.errors?.join(', ') || 'Upload failed')
    }
    
    // Store the GAF report data for comparison
    setGafReport({ totalAreaSqFt: data.totalSquares * 100 })
    setShowGAFUpload(false)
    
    // Recalculate if we have a result
    if (result) {
      handleCalculate()
    }
  }
  
  const handleStartTracing = () => {
    // In a real implementation, this would open a map-based tracing tool
    alert('Manual tracing feature coming soon! For now, you can upload a GAF report.')
  }
  
  const handleRequestProfessional = () => {
    // In a real implementation, this would open a form to request professional measurement
    alert('Professional measurement request feature coming soon!')
  }
  
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-2">
            🏠 Roof Calculator MVP
          </h1>
          <p className="text-lg text-gray-700 mb-8">
            Automated roof measurements with cross-validation and GAF-level accuracy
          </p>
          
          {/* Address Input */}
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              Enter Property Address
            </h2>
            <div className="flex flex-col md:flex-row gap-4">
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="123 Main Street, City, State, ZIP"
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                onKeyDown={(e) => e.key === 'Enter' && handleCalculate()}
              />
              <button
                onClick={handleCalculate}
                disabled={isLoading}
                className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-blue-300 transition-colors"
              >
                {isLoading ? 'Calculating...' : 'Calculate Roof'}
              </button>
            </div>
            
            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
                {error}
              </div>
            )}
          </div>
          
          {/* Results Section */}
          {result && (
            <div className="space-y-6">
              {/* Manual Tracing Prompt (if required) */}
              {result.manualTracingRequired && (
                <ManualTracingPrompt
                  higherTierFailures={result.higherTierFailures}
                  onStartTracing={handleStartTracing}
                  onUploadGAF={() => setShowGAFUpload(true)}
                  onRequestProfessional={handleRequestProfessional}
                />
              )}
              
              {/* Source Tier Display (when not manual tracing) */}
              {!result.manualTracingRequired && result.source && (
                <SourceTierDisplay
                  tier={result.source.tier}
                  tierName={result.source.name}
                  accuracy={result.source.accuracy}
                  confidence={result.source.confidence}
                  higherTierFailures={result.higherTierFailures}
                  imageryQuality={result.dataQuality?.imageryQuality}
                  imageryDate={result.dataQuality?.imageryAge}
                />
              )}
              
              {/* Main Results Card */}
              {!result.manualTracingRequired && (
                <div className="bg-white rounded-lg shadow-lg p-6">
                  <h2 className="text-xl font-semibold text-gray-800 mb-4">
                    Roof Measurement Results
                  </h2>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <div className="text-3xl font-bold text-blue-600">
                        {result.measurement.squares.toFixed(1)}
                      </div>
                      <div className="text-sm text-gray-600">Squares</div>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <div className="text-3xl font-bold text-green-600">
                        {result.measurement.adjustedAreaSqFt.toLocaleString()}
                      </div>
                      <div className="text-sm text-gray-600">Total Sq Ft</div>
                    </div>
                    <div className="text-center p-4 bg-purple-50 rounded-lg">
                      <div className="text-3xl font-bold text-purple-600">
                        {result.measurement.pitchDegrees.toFixed(1)}°
                      </div>
                      <div className="text-sm text-gray-600">Avg Pitch</div>
                    </div>
                    <div className="text-center p-4 bg-orange-50 rounded-lg">
                      <div className="text-3xl font-bold text-orange-600">
                        {result.measurement.segmentCount}
                      </div>
                      <div className="text-sm text-gray-600">Segments</div>
                    </div>
                  </div>
                  
                  <div className="text-sm text-gray-500 text-center">
                    Complexity: <span className="font-medium capitalize">{result.measurement.complexity}</span>
                    {' | '}
                    Pitch Multiplier: <span className="font-medium">{result.measurement.pitchMultiplier.toFixed(3)}</span>
                  </div>
                </div>
              )}
              
              {/* Confidence Meter */}
              {!result.manualTracingRequired && (
                <ConfidenceMeter confidence={result.confidence} showDetails={true} />
              )}
              
              {/* GAF Comparison (if available) */}
              {gafReport && !result.manualTracingRequired && (
                <GAFComparisonView
                  calculatedSqFt={result.measurement.adjustedAreaSqFt}
                  gafSqFt={gafReport.totalAreaSqFt}
                  calibrationApplied={!!result.gafCalibration}
                  adjustedSqFt={result.gafCalibration ? result.measurement.adjustedAreaSqFt : undefined}
                />
              )}
              
              {/* Cross-Validation View */}
              {!result.manualTracingRequired && (
                <CrossValidationView result={result.crossValidation} showDetails={true} />
              )}
              
              {/* Recommendations */}
              {result.recommendations.length > 0 && (
                <div className="bg-white rounded-lg shadow-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">
                    Recommendations
                  </h3>
                  <ul className="space-y-2">
                    {result.recommendations.map((rec, index) => (
                      <li key={index} className="flex items-start">
                        <span className="text-blue-500 mr-2">•</span>
                        <span className="text-gray-700">{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
          
          {/* GAF Upload Section */}
          <div className="mt-6">
            <GAFUpload
              onUpload={handleGAFUpload}
              address={address}
              userId="demo-user"
            />
          </div>
          
          {/* Features List */}
          <div className="bg-white rounded-lg shadow-lg p-6 mt-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              Features
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="flex items-start">
                <span className="text-green-500 text-xl mr-3">✓</span>
                <div>
                  <div className="font-medium text-gray-800">Tiered Fallback System</div>
                  <div className="text-sm text-gray-600">Uses best available source, not averaging</div>
                </div>
              </div>
              <div className="flex items-start">
                <span className="text-green-500 text-xl mr-3">✓</span>
                <div>
                  <div className="font-medium text-gray-800">Accurate Pitch Handling</div>
                  <div className="text-sm text-gray-600">No double pitch multiplier bug</div>
                </div>
              </div>
              <div className="flex items-start">
                <span className="text-green-500 text-xl mr-3">✓</span>
                <div>
                  <div className="font-medium text-gray-800">Multi-Source Validation</div>
                  <div className="text-sm text-gray-600">Cross-validate without blending</div>
                </div>
              </div>
              <div className="flex items-start">
                <span className="text-green-500 text-xl mr-3">✓</span>
                <div>
                  <div className="font-medium text-gray-800">Confidence Scoring</div>
                  <div className="text-sm text-gray-600">GAF-level accuracy indicators</div>
                </div>
              </div>
              <div className="flex items-start">
                <span className="text-green-500 text-xl mr-3">✓</span>
                <div>
                  <div className="font-medium text-gray-800">GAF Report Integration</div>
                  <div className="text-sm text-gray-600">Upload historical reports for calibration</div>
                </div>
              </div>
              <div className="flex items-start">
                <span className="text-green-500 text-xl mr-3">✓</span>
                <div>
                  <div className="font-medium text-gray-800">Transparent Fallback Info</div>
                  <div className="text-sm text-gray-600">See why higher-tier sources failed</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
