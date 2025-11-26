'use client'

import React from 'react'
import { TierFailure } from '@/lib/roofMeasurement'

interface ManualTracingPromptProps {
  higherTierFailures?: TierFailure[]
  onStartTracing?: () => void
  onUploadGAF?: () => void
  onRequestProfessional?: () => void
}

/**
 * Manual Tracing Prompt Component
 * 
 * Shown when all automated measurement sources fail (Tier 7).
 * Explains why automated measurement wasn't possible and provides
 * options for the user to proceed.
 */
export default function ManualTracingPrompt({
  higherTierFailures = [],
  onStartTracing,
  onUploadGAF,
  onRequestProfessional
}: ManualTracingPromptProps) {
  return (
    <div className="bg-gradient-to-br from-orange-50 to-yellow-50 border border-orange-200 rounded-lg p-6">
      {/* Header */}
      <div className="flex items-start mb-4">
        <div className="flex-shrink-0">
          <svg className="w-8 h-8 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <div className="ml-4">
          <h3 className="text-lg font-semibold text-orange-800">
            Manual Roof Measurement Required
          </h3>
          <p className="text-orange-700 mt-1">
            We couldn&apos;t automatically measure the roof at this location. 
            You can still get accurate measurements using one of the options below.
          </p>
        </div>
      </div>

      {/* Why automated measurement failed */}
      {higherTierFailures.length > 0 && (
        <div className="bg-white rounded-lg p-4 mb-4 border border-orange-100">
          <h4 className="text-sm font-medium text-gray-700 mb-2">
            Why automated measurement wasn&apos;t available:
          </h4>
          <ul className="space-y-1">
            {higherTierFailures.map((failure, index) => (
              <li key={index} className="text-sm text-gray-600 flex items-start">
                <span className="text-orange-400 mr-2">•</span>
                <span>
                  <strong>{failure.tierName}:</strong> {failure.reason}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Options */}
      <div className="grid md:grid-cols-3 gap-4">
        {/* Option 1: Manual Tracing */}
        <div className="bg-white rounded-lg p-4 border border-gray-200 hover:border-blue-300 transition-colors">
          <div className="flex items-center mb-2">
            <span className="text-2xl mr-2">✏️</span>
            <h4 className="font-medium text-gray-800">Trace Roof Outline</h4>
          </div>
          <p className="text-sm text-gray-600 mb-3">
            Draw the roof outline on a satellite map for accurate measurements.
          </p>
          <div className="text-xs text-green-600 mb-3">
            ✓ 85-95% accuracy when traced carefully
          </div>
          <button
            onClick={onStartTracing}
            className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            Start Tracing
          </button>
        </div>

        {/* Option 2: Upload GAF Report */}
        <div className="bg-white rounded-lg p-4 border border-gray-200 hover:border-green-300 transition-colors">
          <div className="flex items-center mb-2">
            <span className="text-2xl mr-2">📄</span>
            <h4 className="font-medium text-gray-800">Upload GAF Report</h4>
          </div>
          <p className="text-sm text-gray-600 mb-3">
            Upload an existing roof measurement report for instant calibration.
          </p>
          <div className="text-xs text-green-600 mb-3">
            ✓ GAF-level accuracy from verified data
          </div>
          <button
            onClick={onUploadGAF}
            className="w-full py-2 px-4 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm font-medium"
          >
            Upload Report
          </button>
        </div>

        {/* Option 3: Professional Measurement */}
        <div className="bg-white rounded-lg p-4 border border-gray-200 hover:border-purple-300 transition-colors">
          <div className="flex items-center mb-2">
            <span className="text-2xl mr-2">📏</span>
            <h4 className="font-medium text-gray-800">Request Professional</h4>
          </div>
          <p className="text-sm text-gray-600 mb-3">
            Get a professional roof measurement from a certified inspector.
          </p>
          <div className="text-xs text-green-600 mb-3">
            ✓ Highest accuracy guaranteed
          </div>
          <button
            onClick={onRequestProfessional}
            className="w-full py-2 px-4 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors text-sm font-medium"
          >
            Request Quote
          </button>
        </div>
      </div>

      {/* Cost savings note */}
      <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
        <div className="flex items-center">
          <svg className="w-5 h-5 text-blue-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <span className="text-sm text-blue-700">
            <strong>Save money:</strong> Manual tracing is free and takes about 2-3 minutes. 
            A professional measurement typically costs $50-150.
          </span>
        </div>
      </div>
    </div>
  )
}
