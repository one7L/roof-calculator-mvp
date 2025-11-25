'use client'

import { useAuth } from '../../context/AuthContext'
import Link from 'next/link'

export default function AdminAnalytics() {
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

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center mb-8">
          <span className="mr-3">📈</span>
          Analytics Dashboard
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white shadow-md rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Daily Calculations</h3>
            <div className="h-64 flex items-end justify-around space-x-2">
              {[65, 45, 78, 92, 55, 80, 70].map((height, i) => (
                <div key={i} className="flex flex-col items-center">
                  <div 
                    className="w-12 bg-blue-500 rounded-t hover:bg-blue-600 transition-colors"
                    style={{ height: `${height * 2}px` }}
                  ></div>
                  <span className="text-xs text-gray-500 mt-2">
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i]}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white shadow-md rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">User Growth</h3>
            <div className="h-64 flex items-center justify-center">
              <div className="text-center">
                <p className="text-5xl font-bold text-green-600">+23%</p>
                <p className="text-gray-500 mt-2">increase this month</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white shadow-md rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Accuracy Rate</h3>
          <div className="text-center py-4">
            <p className="text-5xl font-bold text-purple-600">94.7%</p>
            <p className="text-gray-500 mt-2">vs GAF reports</p>
          </div>
        </div>
      </div>
    </div>
  )
}
