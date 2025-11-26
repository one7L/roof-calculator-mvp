'use client'

import React, { useState } from 'react'
import { CrossValidationResult, SourceMeasurement } from '@/lib/crossValidation'
import { getSourceAccuracyDescription, MeasurementSource } from '@/lib/roofMeasurement'
import { ConfidenceBadge } from './ConfidenceMeter'

interface CrossValidationViewProps {
  result: CrossValidationResult
  showDetails?: boolean
}

const sourceIcons: Record<MeasurementSource, string> = {
  'google-solar': '🛰️',
  'instant-roofer': '📡',
  'openstreetmap': '🗺️',
  'footprint-estimation': '📐',
  'manual-tracing': '✏️'
}

const sourceNames: Record<MeasurementSource, string> = {
  'google-solar': 'Google Solar API',
  'instant-roofer': 'Instant Roofer (LiDAR)',
  'openstreetmap': 'OpenStreetMap',
  'footprint-estimation': 'Footprint Estimation',
  'manual-tracing': 'Manual Tracing'
}

export default function CrossValidationView({ result, showDetails = true }: CrossValidationViewProps) {
  const [expanded, setExpanded] = useState(false)
  
  const getAgreementColor = (score: number): string => {
    if (score >= 95) return 'text-green-600'
    if (score >= 85) return 'text-blue-600'
    if (score >= 70) return 'text-yellow-600'
    return 'text-red-600'
  }
  
  const getVarianceColor = (variance: number): string => {
    const absVariance = Math.abs(variance)
    if (absVariance <= 5) return 'text-green-600'
    if (absVariance <= 10) return 'text-blue-600'
    if (absVariance <= 15) return 'text-yellow-600'
    return 'text-red-600'
  }
  
  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Summary header */}
      <div className="p-4 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <h3 className="font-semibold text-gray-900">Cross-Validation Summary</h3>
            <ConfidenceBadge 
              level={result.confidenceLevel} 
              score={result.finalMeasurement.confidence} 
            />
          </div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            {expanded ? 'Hide Details' : 'Show Details'}
          </button>
        </div>
        
        {/* Agreement score bar */}
        <div className="mt-3">
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-gray-600">Source Agreement</span>
            <span className={`font-medium ${getAgreementColor(result.agreementScore)}`}>
              {result.agreementScore.toFixed(1)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-500 ${
                result.agreementScore >= 95 ? 'bg-green-500' :
                result.agreementScore >= 85 ? 'bg-blue-500' :
                result.agreementScore >= 70 ? 'bg-yellow-500' : 'bg-red-500'
              }`}
              style={{ width: `${result.agreementScore}%` }}
            />
          </div>
        </div>
      </div>
      
      {/* Final measurement */}
      <div className="p-4">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-gray-900">
              {result.finalMeasurement.squares.toFixed(1)}
            </div>
            <div className="text-sm text-gray-500">Squares</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">
              {result.finalMeasurement.adjustedAreaSqFt.toLocaleString()}
            </div>
            <div className="text-sm text-gray-500">Sq Ft</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">
              {result.finalMeasurement.pitchDegrees.toFixed(1)}°
            </div>
            <div className="text-sm text-gray-500">Avg Pitch</div>
          </div>
        </div>
      </div>
      
      {/* Discrepancies warning */}
      {result.discrepancies.length > 0 && (
        <div className="px-4 pb-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-yellow-500 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div>
                <h4 className="text-sm font-medium text-yellow-800">Discrepancies Detected</h4>
                <ul className="mt-1 text-sm text-yellow-700 list-disc list-inside">
                  {result.discrepancies.map((d, i) => (
                    <li key={i}>{d}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Expanded details */}
      {expanded && showDetails && (
        <div className="border-t border-gray-200">
          {/* Source breakdown */}
          <div className="p-4">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Source Breakdown</h4>
            <div className="space-y-3">
              {result.sources.map((source, index) => (
                <SourceCard key={index} source={source} />
              ))}
            </div>
          </div>
          
          {/* Recommendation */}
          <div className="p-4 bg-blue-50 border-t border-blue-100">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-blue-500 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <div>
                <h4 className="text-sm font-medium text-blue-800">Recommendation</h4>
                <p className="mt-1 text-sm text-blue-700">{result.recommendation}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function SourceCard({ source }: { source: SourceMeasurement }) {
  const getVarianceColor = (variance: number): string => {
    const absVariance = Math.abs(variance)
    if (absVariance <= 5) return 'text-green-600 bg-green-50'
    if (absVariance <= 10) return 'text-blue-600 bg-blue-50'
    if (absVariance <= 15) return 'text-yellow-600 bg-yellow-50'
    return 'text-red-600 bg-red-50'
  }
  
  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
      <div className="flex items-center">
        <span className="text-xl mr-2">{sourceIcons[source.name]}</span>
        <div>
          <div className="font-medium text-gray-900">{sourceNames[source.name]}</div>
          <div className="text-xs text-gray-500">
            Weight: {(source.weight * 100).toFixed(0)}%
          </div>
        </div>
      </div>
      
      <div className="text-right">
        <div className="font-medium text-gray-900">
          {source.measurement.adjustedAreaSqFt.toLocaleString()} sq ft
        </div>
        <div className={`text-xs px-2 py-0.5 rounded ${getVarianceColor(source.varianceFromFinal)}`}>
          {source.varianceFromFinal >= 0 ? '+' : ''}{source.varianceFromFinal.toFixed(1)}% variance
        </div>
      </div>
    </div>
  )
}

// Simple comparison view for when a GAF report exists
interface GAFComparisonProps {
  calculatedSqFt: number
  gafSqFt: number
  calibrationApplied?: boolean
  adjustedSqFt?: number
}

export function GAFComparisonView({ calculatedSqFt, gafSqFt, calibrationApplied, adjustedSqFt }: GAFComparisonProps) {
  const difference = calculatedSqFt - gafSqFt
  const differencePercent = (difference / gafSqFt) * 100
  const isWithinThreshold = Math.abs(differencePercent) <= 5
  
  return (
    <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-4 border border-green-200">
      <div className="flex items-center mb-3">
        <svg className="w-5 h-5 text-green-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
        <h3 className="font-semibold text-gray-900">GAF Report Comparison</h3>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="text-center p-3 bg-white rounded-lg">
          <div className="text-sm text-gray-500 mb-1">Calculated</div>
          <div className="text-xl font-bold text-gray-900">
            {calculatedSqFt.toLocaleString()} sq ft
          </div>
        </div>
        <div className="text-center p-3 bg-white rounded-lg">
          <div className="text-sm text-gray-500 mb-1">GAF Report</div>
          <div className="text-xl font-bold text-green-600">
            {gafSqFt.toLocaleString()} sq ft
          </div>
        </div>
      </div>
      
      <div className={`mt-3 text-center p-2 rounded ${isWithinThreshold ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
        <span className="font-medium">
          {isWithinThreshold ? '✓ ' : '⚠ '}
          {Math.abs(differencePercent).toFixed(1)}% {difference > 0 ? 'higher' : 'lower'} than GAF report
        </span>
      </div>
      
      {calibrationApplied && adjustedSqFt && (
        <div className="mt-3 text-center p-2 bg-blue-100 rounded text-blue-700">
          <span className="text-sm">
            Calibrated value: <strong>{adjustedSqFt.toLocaleString()} sq ft</strong>
          </span>
        </div>
      )}
    </div>
  )
}
