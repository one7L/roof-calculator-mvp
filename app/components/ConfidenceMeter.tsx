'use client'

import React from 'react'
import { ConfidenceResult, ConfidenceLevel } from '@/lib/confidenceScoring'

interface ConfidenceMeterProps {
  confidence: ConfidenceResult
  showDetails?: boolean
}

const colorMap: Record<string, { bg: string; text: string; border: string; fill: string }> = {
  green: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-500', fill: 'bg-green-500' },
  blue: { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-500', fill: 'bg-blue-500' },
  yellow: { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-500', fill: 'bg-yellow-500' },
  red: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-500', fill: 'bg-red-500' }
}

export default function ConfidenceMeter({ confidence, showDetails = true }: ConfidenceMeterProps) {
  const colors = colorMap[confidence.color] || colorMap.blue
  
  return (
    <div className={`rounded-lg p-4 ${colors.bg} border ${colors.border}`}>
      <div className="flex items-center justify-between mb-2">
        <span className={`font-semibold ${colors.text}`}>{confidence.label}</span>
        <span className={`text-2xl font-bold ${colors.text}`}>{confidence.score}%</span>
      </div>
      
      {/* Progress bar */}
      <div className="w-full bg-gray-200 rounded-full h-3 mb-3">
        <div 
          className={`h-3 rounded-full transition-all duration-500 ${colors.fill}`}
          style={{ width: `${confidence.score}%` }}
        />
      </div>
      
      {/* Confidence level indicators */}
      <div className="flex justify-between text-xs text-gray-500 mb-3">
        <span>Low</span>
        <span>Moderate</span>
        <span>High</span>
        <span>GAF-Level</span>
      </div>
      
      {/* Factor breakdown */}
      {showDetails && confidence.factors.length > 0 && (
        <div className="mt-4 pt-3 border-t border-gray-300">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Confidence Factors</h4>
          <div className="space-y-2">
            {confidence.factors.map((factor, index) => (
              <div key={index} className="flex items-center justify-between text-sm">
                <div className="flex items-center">
                  <span className={`mr-2 ${factor.impact >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {factor.impact >= 0 ? '↑' : '↓'}
                  </span>
                  <span className="text-gray-700">{factor.name}</span>
                </div>
                <span className={`font-medium ${factor.impact >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {factor.impact >= 0 ? '+' : ''}{factor.impact}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// Badge component for compact display
export function ConfidenceBadge({ level, score }: { level: ConfidenceLevel; score: number }) {
  const levelColors: Record<ConfidenceLevel, string> = {
    'gaf-level': 'bg-green-500 text-white',
    'high': 'bg-blue-500 text-white',
    'moderate': 'bg-yellow-500 text-gray-900',
    'low': 'bg-red-500 text-white'
  }
  
  const levelLabels: Record<ConfidenceLevel, string> = {
    'gaf-level': 'GAF',
    'high': 'High',
    'moderate': 'Med',
    'low': 'Low'
  }
  
  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${levelColors[level]}`}>
      {levelLabels[level]} {score}%
    </span>
  )
}
