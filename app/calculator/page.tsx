'use client'

import { useState } from 'react'
import { 
  Search, 
  MapPin, 
  Calculator as CalcIcon, 
  Ruler, 
  AlertTriangle,
  CheckCircle,
  Loader2,
  Home,
  BarChart3,
  Percent,
  Square
} from 'lucide-react'

export default function Calculator() {
  const [address, setAddress] = useState('')
  const [isCalculating, setIsCalculating] = useState(false)
  const [result, setResult] = useState<null | {
    totalSqFt: number
    pitch: string
    pitchMultiplier: number
    complexity: number
    wasteFactor: number
    finalSqFt: number
    confidence: number
  }>(null)

  const handleCalculate = async () => {
    if (!address.trim()) return
    
    setIsCalculating(true)
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // Mock result
    setResult({
      totalSqFt: 2450,
      pitch: '6:12',
      pitchMultiplier: 1.12,
      complexity: 4,
      wasteFactor: 15,
      finalSqFt: 3157,
      confidence: 94
    })
    setIsCalculating(false)
  }

  return (
    <div className="min-h-screen py-8 sm:py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mb-4 shadow-lg">
            <CalcIcon className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
            Roof Calculator
          </h1>
          <p className="text-gray-600 max-w-xl mx-auto">
            Enter any property address to get instant, accurate roof measurements 
            powered by Google Solar API.
          </p>
        </div>
        
        {/* Search Card */}
        <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 border border-gray-100 mb-8">
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            Property Address
          </label>
          <div className="relative mb-4">
            <MapPin className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="123 Main Street, City, State 12345"
              className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-lg"
              onKeyDown={(e) => e.key === 'Enter' && handleCalculate()}
            />
          </div>
          
          <button 
            onClick={handleCalculate}
            disabled={isCalculating || !address.trim()}
            className="w-full flex items-center justify-center py-4 px-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl hover:from-blue-700 hover:to-purple-700 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isCalculating ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Calculating...
              </>
            ) : (
              <>
                <Search className="w-5 h-5 mr-2" />
                Calculate Roof Area
              </>
            )}
          </button>
        </div>

        {/* Results */}
        {result ? (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Confidence Indicator */}
            <div className={`p-4 rounded-xl flex items-center ${
              result.confidence >= 90 ? 'bg-green-50 border border-green-100' : 
              result.confidence >= 70 ? 'bg-yellow-50 border border-yellow-100' : 
              'bg-red-50 border border-red-100'
            }`}>
              {result.confidence >= 90 ? (
                <CheckCircle className="w-6 h-6 text-green-600 mr-3 flex-shrink-0" />
              ) : (
                <AlertTriangle className="w-6 h-6 text-yellow-600 mr-3 flex-shrink-0" />
              )}
              <div>
                <p className={`font-semibold ${
                  result.confidence >= 90 ? 'text-green-800' : 
                  result.confidence >= 70 ? 'text-yellow-800' : 'text-red-800'
                }`}>
                  {result.confidence}% Confidence Score
                </p>
                <p className={`text-sm ${
                  result.confidence >= 90 ? 'text-green-600' : 
                  result.confidence >= 70 ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {result.confidence >= 90 
                    ? 'High confidence - No GAF report needed' 
                    : 'Consider requesting a GAF report for verification'}
                </p>
              </div>
            </div>

            {/* Main Result Card */}
            <div className="bg-gradient-to-br from-blue-600 to-purple-700 rounded-2xl p-8 text-white shadow-xl">
              <div className="text-center">
                <p className="text-blue-100 text-sm font-medium mb-2">Total Roofing Area (with waste)</p>
                <p className="text-5xl sm:text-6xl font-bold mb-2">{result.finalSqFt.toLocaleString()}</p>
                <p className="text-blue-100">square feet</p>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl p-5 shadow-lg border border-gray-100">
                <div className="flex items-center justify-between mb-3">
                  <Square className="w-5 h-5 text-blue-600" />
                </div>
                <p className="text-2xl font-bold text-gray-900">{result.totalSqFt.toLocaleString()}</p>
                <p className="text-sm text-gray-500">Base Sq. Ft.</p>
              </div>

              <div className="bg-white rounded-xl p-5 shadow-lg border border-gray-100">
                <div className="flex items-center justify-between mb-3">
                  <Home className="w-5 h-5 text-purple-600" />
                </div>
                <p className="text-2xl font-bold text-gray-900">{result.pitch}</p>
                <p className="text-sm text-gray-500">Roof Pitch</p>
              </div>

              <div className="bg-white rounded-xl p-5 shadow-lg border border-gray-100">
                <div className="flex items-center justify-between mb-3">
                  <BarChart3 className="w-5 h-5 text-green-600" />
                </div>
                <p className="text-2xl font-bold text-gray-900">{result.complexity}/10</p>
                <p className="text-sm text-gray-500">Complexity</p>
              </div>

              <div className="bg-white rounded-xl p-5 shadow-lg border border-gray-100">
                <div className="flex items-center justify-between mb-3">
                  <Percent className="w-5 h-5 text-orange-600" />
                </div>
                <p className="text-2xl font-bold text-gray-900">{result.wasteFactor}%</p>
                <p className="text-sm text-gray-500">Waste Factor</p>
              </div>
            </div>

            {/* Calculation Breakdown */}
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center">
                <Ruler className="w-5 h-5 text-blue-600 mr-2" />
                Calculation Breakdown
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">Base roof area</span>
                  <span className="font-semibold text-gray-900">{result.totalSqFt.toLocaleString()} sq ft</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">Pitch multiplier ({result.pitch})</span>
                  <span className="font-semibold text-gray-900">× {result.pitchMultiplier}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">After pitch adjustment</span>
                  <span className="font-semibold text-gray-900">{Math.round(result.totalSqFt * result.pitchMultiplier).toLocaleString()} sq ft</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">Waste factor (complexity {result.complexity}/10)</span>
                  <span className="font-semibold text-gray-900">+ {result.wasteFactor}%</span>
                </div>
                <div className="flex justify-between py-3 bg-blue-50 rounded-lg px-3 -mx-3">
                  <span className="font-bold text-blue-900">Final roofing area</span>
                  <span className="font-bold text-blue-900">{result.finalSqFt.toLocaleString()} sq ft</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-4">
              <button className="flex-1 flex items-center justify-center py-3 px-6 bg-white text-gray-700 rounded-xl font-semibold border border-gray-200 hover:bg-gray-50 transition-all">
                Export Report
              </button>
              <button className="flex-1 flex items-center justify-center py-3 px-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl hover:from-blue-700 hover:to-purple-700 transition-all">
                Save to History
              </button>
            </div>
          </div>
        ) : (
          /* Empty State */
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center border border-gray-100">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <MapPin className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Ready to Calculate</h3>
            <p className="text-gray-500 max-w-sm mx-auto">
              Enter a property address above to instantly calculate accurate roof measurements 
              using satellite imagery and AI.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
