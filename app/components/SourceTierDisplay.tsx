'use client'

import React, { useState } from 'react'
import { TierFailure } from '@/lib/roofMeasurement'

interface SourceTierDisplayProps {
  tier: number
  tierName: string
  accuracy: string
  confidence: number
  higherTierFailures?: TierFailure[]
  imageryQuality?: 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN'
  imageryDate?: string
}

/**
 * Source Tier Display Component
 * 
 * Shows which data source tier was used for the measurement,
 * along with accuracy information and reasons why higher tiers failed.
 */
export default function SourceTierDisplay({
  tier,
  tierName,
  accuracy,
  confidence,
  higherTierFailures = [],
  imageryQuality,
  imageryDate
}: SourceTierDisplayProps) {
  const [showFailures, setShowFailures] = useState(false)
  
  // Get tier styling based on tier number
  const getTierStyles = (tierNum: number) => {
    if (tierNum <= 2) {
      return {
        bg: 'bg-green-50',
        border: 'border-green-200',
        icon: '🎯',
        iconBg: 'bg-green-100',
        textColor: 'text-green-800',
        badgeBg: 'bg-green-500',
        label: 'High Accuracy'
      }
    } else if (tierNum <= 4) {
      return {
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        icon: '📊',
        iconBg: 'bg-blue-100',
        textColor: 'text-blue-800',
        badgeBg: 'bg-blue-500',
        label: 'Good Accuracy'
      }
    } else if (tierNum <= 5) {
      return {
        bg: 'bg-yellow-50',
        border: 'border-yellow-200',
        icon: '⚠️',
        iconBg: 'bg-yellow-100',
        textColor: 'text-yellow-800',
        badgeBg: 'bg-yellow-500',
        label: 'Moderate Accuracy'
      }
    } else {
      return {
        bg: 'bg-orange-50',
        border: 'border-orange-200',
        icon: '✏️',
        iconBg: 'bg-orange-100',
        textColor: 'text-orange-800',
        badgeBg: 'bg-orange-500',
        label: 'Manual Entry'
      }
    }
  }
  
  const styles = getTierStyles(tier)
  
  return (
    <div className={`rounded-lg border ${styles.bg} ${styles.border} overflow-hidden`}>
      {/* Main content */}
      <div className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className={`w-10 h-10 rounded-full ${styles.iconBg} flex items-center justify-center mr-3`}>
              <span className="text-xl">{styles.icon}</span>
            </div>
            <div>
              <div className="flex items-center">
                <h3 className={`font-semibold ${styles.textColor}`}>
                  {tierName}
                </h3>
                <span className={`ml-2 px-2 py-0.5 text-xs font-medium rounded-full text-white ${styles.badgeBg}`}>
                  Tier {tier}
                </span>
              </div>
              <p className="text-sm text-gray-600">
                {styles.label} • {accuracy} accuracy
              </p>
            </div>
          </div>
          
          <div className="text-right">
            <div className="text-2xl font-bold text-gray-800">
              {confidence}%
            </div>
            <div className="text-xs text-gray-500">confidence</div>
          </div>
        </div>
        
        {/* Data quality indicators */}
        {(imageryQuality || imageryDate) && (
          <div className="mt-3 flex flex-wrap gap-2">
            {imageryQuality && imageryQuality !== 'UNKNOWN' && (
              <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                imageryQuality === 'HIGH' ? 'bg-green-100 text-green-700' :
                imageryQuality === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' :
                'bg-red-100 text-red-700'
              }`}>
                {imageryQuality} Quality Imagery
              </span>
            )}
            {imageryDate && (
              <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700">
                📅 Imagery from {imageryDate}
              </span>
            )}
          </div>
        )}
        
        {/* Higher tier failures toggle */}
        {higherTierFailures.length > 0 && (
          <button
            onClick={() => setShowFailures(!showFailures)}
            className="mt-3 text-sm text-gray-600 hover:text-gray-800 flex items-center"
          >
            <svg 
              className={`w-4 h-4 mr-1 transform transition-transform ${showFailures ? 'rotate-180' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
            {showFailures ? 'Hide' : 'Show'} why higher-accuracy sources weren&apos;t used
          </button>
        )}
      </div>
      
      {/* Higher tier failures expanded */}
      {showFailures && higherTierFailures.length > 0 && (
        <div className="border-t border-gray-200 bg-white p-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">
            Higher-accuracy sources unavailable:
          </h4>
          <ul className="space-y-2">
            {higherTierFailures.map((failure, index) => (
              <li key={index} className="flex items-start text-sm">
                <span className="text-gray-400 mr-2 mt-0.5">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </span>
                <div>
                  <span className="font-medium text-gray-700">Tier {failure.tier}: {failure.tierName}</span>
                  <p className="text-gray-500">{failure.reason}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

/**
 * Compact tier badge for use in headers or summaries
 */
export function TierBadge({ tier, tierName }: { tier: number; tierName: string }) {
  const getBadgeStyle = (tierNum: number) => {
    if (tierNum <= 2) return 'bg-green-500'
    if (tierNum <= 4) return 'bg-blue-500'
    if (tierNum <= 5) return 'bg-yellow-500'
    return 'bg-orange-500'
  }
  
  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium text-white ${getBadgeStyle(tier)}`}>
      T{tier}: {tierName}
    </span>
  )
}
