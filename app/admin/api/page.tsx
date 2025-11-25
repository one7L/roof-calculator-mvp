'use client'

import { useAuth } from '../../context/AuthContext'
import Link from 'next/link'

export default function AdminAPI() {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user?.isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">🚫 Admin Access Required</h1>
          <Link href="/login" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
            Sign In
          </Link>
        </div>
      </div>
    )
  }

  const apiKeys = [
    { id: 1, name: 'Production Key', key: 'pk_live_****', status: 'Active', created: '2024-01-15' },
    { id: 2, name: 'Development Key', key: 'pk_test_****', status: 'Active', created: '2024-01-10' },
  ]

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <span className="mr-3">🔑</span>
            API Configuration
          </h1>
          <button className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 flex items-center">
            <span className="mr-2">+</span>
            Generate New Key
          </button>
        </div>

        <div className="bg-white shadow-md rounded-lg overflow-hidden mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">API Keys</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {apiKeys.map((apiKey) => (
              <div key={apiKey.id} className="px-6 py-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{apiKey.name}</p>
                  <p className="text-sm text-gray-500 font-mono">{apiKey.key}</p>
                </div>
                <div className="flex items-center space-x-4">
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                    apiKey.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {apiKey.status}
                  </span>
                  <button className="text-blue-600 hover:text-blue-800 text-sm">Copy</button>
                  <button className="text-red-600 hover:text-red-800 text-sm">Revoke</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white shadow-md rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Integration Status</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center p-4 bg-green-50 rounded-lg">
              <div className="w-3 h-3 bg-green-500 rounded-full mr-3 animate-pulse"></div>
              <div>
                <p className="font-medium text-green-800">Google Solar API</p>
                <p className="text-sm text-green-600">Connected & Active</p>
              </div>
            </div>
            <div className="flex items-center p-4 bg-green-50 rounded-lg">
              <div className="w-3 h-3 bg-green-500 rounded-full mr-3 animate-pulse"></div>
              <div>
                <p className="font-medium text-green-800">Google Geocoding API</p>
                <p className="text-sm text-green-600">Connected & Active</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
