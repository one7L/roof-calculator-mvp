'use client'

import React, { useState } from 'react'

interface GAFUploadProps {
  onUpload: (data: GAFUploadData) => Promise<void>
  lat?: number
  lng?: number
  address?: string
  userId?: string
}

export interface GAFUploadData {
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

export default function GAFUpload({ onUpload, lat, lng, address, userId = 'anonymous' }: GAFUploadProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadSuccess, setUploadSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [formData, setFormData] = useState<Partial<GAFUploadData>>({
    userId,
    address: address || '',
    lat: lat || 0,
    lng: lng || 0,
    totalSquares: 0,
    pitchInfo: '',
    facetCount: 1,
    wasteFactor: 10,
    reportDate: new Date().toISOString().split('T')[0]
  })
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) || 0 : value
    }))
  }
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsUploading(true)
    setError(null)
    
    try {
      await onUpload(formData as GAFUploadData)
      setUploadSuccess(true)
      setIsExpanded(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setIsUploading(false)
    }
  }
  
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    // PDF upload handling would go here
    // For now, we just show a message that manual entry is available
    setError('PDF parsing coming soon. Please use manual entry for now.')
  }
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }
  
  if (uploadSuccess) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-center">
          <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <span className="text-green-700 font-medium">GAF Report uploaded successfully!</span>
        </div>
        <p className="text-green-600 text-sm mt-2">
          Your report has been saved and will be used to improve measurement accuracy.
        </p>
        <button
          onClick={() => {
            setUploadSuccess(false)
            setFormData(prev => ({ ...prev, totalSquares: 0 }))
          }}
          className="text-green-700 underline text-sm mt-2"
        >
          Upload another report
        </button>
      </div>
    )
  }
  
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 bg-gray-50 flex items-center justify-between hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center">
          <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span className="font-medium text-gray-800">Upload GAF Report for Calibration</span>
        </div>
        <svg 
          className={`w-5 h-5 text-gray-500 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      {/* Expanded content */}
      {isExpanded && (
        <div className="p-4">
          <p className="text-sm text-gray-600 mb-4">
            Upload a historical GAF report to improve measurement accuracy. Your data helps calibrate our system for better estimates.
          </p>
          
          {/* Drag and drop area */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center mb-4 hover:border-blue-400 transition-colors"
          >
            <svg className="w-10 h-10 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="text-gray-600">Drag and drop your GAF report PDF here</p>
            <p className="text-sm text-gray-400 mt-1">or enter details manually below</p>
          </div>
          
          {/* Manual entry form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Total Squares *
                </label>
                <input
                  type="number"
                  name="totalSquares"
                  value={formData.totalSquares || ''}
                  onChange={handleInputChange}
                  step="0.1"
                  min="0"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., 25.5"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Predominant Pitch
                </label>
                <select
                  name="pitchInfo"
                  value={formData.pitchInfo}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select pitch...</option>
                  <option value="3:12">3:12 (14°)</option>
                  <option value="4:12">4:12 (18°)</option>
                  <option value="5:12">5:12 (23°)</option>
                  <option value="6:12">6:12 (27°)</option>
                  <option value="7:12">7:12 (30°)</option>
                  <option value="8:12">8:12 (34°)</option>
                  <option value="9:12">9:12 (37°)</option>
                  <option value="10:12">10:12 (40°)</option>
                  <option value="12:12">12:12 (45°)</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Number of Facets
                </label>
                <input
                  type="number"
                  name="facetCount"
                  value={formData.facetCount || ''}
                  onChange={handleInputChange}
                  min="1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., 4"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Waste Factor (%)
                </label>
                <input
                  type="number"
                  name="wasteFactor"
                  value={formData.wasteFactor || ''}
                  onChange={handleInputChange}
                  min="0"
                  max="50"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., 10"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Report Date *
                </label>
                <input
                  type="date"
                  name="reportDate"
                  value={formData.reportDate}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address *
                </label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="123 Main St, City, ST"
                />
              </div>
            </div>
            
            {error && (
              <div className="text-red-600 text-sm bg-red-50 p-2 rounded">
                {error}
              </div>
            )}
            
            <button
              type="submit"
              disabled={isUploading}
              className="w-full py-2 px-4 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 disabled:bg-blue-300 transition-colors"
            >
              {isUploading ? 'Uploading...' : 'Submit GAF Report'}
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
