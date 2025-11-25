'use client'

import { useAuth } from '../context/AuthContext'
import Link from 'next/link'

export default function AdminDashboard() {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600 mb-4">Please sign in to access this page.</p>
          <Link
            href="/login"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Sign In
          </Link>
        </div>
      </div>
    )
  }

  if (!user.isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">🚫 Admin Access Required</h1>
          <p className="text-gray-600 mb-4">You do not have administrator privileges.</p>
          <p className="text-sm text-gray-500">Logged in as: {user.email}</p>
          <Link
            href="/"
            className="mt-4 inline-block px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Go to Home
          </Link>
        </div>
      </div>
    )
  }

  const stats = [
    { label: 'Total Calculations', value: '1,234', icon: '📐', color: 'bg-blue-500' },
    { label: 'Active Users', value: '156', icon: '👥', color: 'bg-green-500' },
    { label: 'Reports Generated', value: '892', icon: '📊', color: 'bg-purple-500' },
    { label: 'API Calls Today', value: '2,847', icon: '🌐', color: 'bg-orange-500' },
  ]

  const quickActions = [
    { label: 'User Management', href: '/admin/users', icon: '👥', description: 'Manage user accounts and permissions' },
    { label: 'System Settings', href: '/admin/settings', icon: '⚙️', description: 'Configure application settings' },
    { label: 'Analytics', href: '/admin/analytics', icon: '📈', description: 'View detailed usage analytics' },
    { label: 'API Configuration', href: '/admin/api', icon: '🔑', description: 'Manage API keys and integrations' },
  ]

  const recentActivity = [
    { action: 'New user registered', user: 'john@example.com', time: '5 minutes ago' },
    { action: 'Roof calculation completed', user: 'sarah@company.com', time: '12 minutes ago' },
    { action: 'Report exported', user: 'mike@roofing.com', time: '1 hour ago' },
    { action: 'Settings updated', user: 'viralclickpro@gmail.com', time: '2 hours ago' },
    { action: 'New user registered', user: 'alex@builders.com', time: '3 hours ago' },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <span className="mr-3">👑</span>
            Admin Dashboard
          </h1>
          <p className="mt-2 text-gray-600">
            Welcome back, <span className="font-semibold text-purple-600">{user.email}</span>
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat) => (
            <div key={stat.label} className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                </div>
                <div className={`${stat.color} rounded-full p-3 text-2xl`}>
                  {stat.icon}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
              <span className="mr-2">⚡</span>
              Quick Actions
            </h2>
            <div className="space-y-3">
              {quickActions.map((action) => (
                <Link
                  key={action.href}
                  href={action.href}
                  className="flex items-center p-4 rounded-lg border border-gray-200 hover:border-purple-300 hover:bg-purple-50 transition-all"
                >
                  <span className="text-2xl mr-4">{action.icon}</span>
                  <div>
                    <p className="font-semibold text-gray-900">{action.label}</p>
                    <p className="text-sm text-gray-500">{action.description}</p>
                  </div>
                  <svg className="ml-auto h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
              <span className="mr-2">📋</span>
              Recent Activity
            </h2>
            <div className="space-y-4">
              {recentActivity.map((activity, index) => (
                <div key={index} className="flex items-start border-b border-gray-100 pb-3 last:border-0">
                  <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 mr-3"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                    <p className="text-xs text-gray-500">{activity.user}</p>
                  </div>
                  <span className="text-xs text-gray-400">{activity.time}</span>
                </div>
              ))}
            </div>
            <button className="mt-4 w-full px-4 py-2 text-sm text-purple-600 hover:text-purple-700 hover:bg-purple-50 rounded-md transition-colors">
              View All Activity →
            </button>
          </div>
        </div>

        {/* System Status */}
        <div className="mt-8 bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
            <span className="mr-2">💻</span>
            System Status
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center p-4 bg-green-50 rounded-lg">
              <div className="w-3 h-3 bg-green-500 rounded-full mr-3 animate-pulse"></div>
              <div>
                <p className="font-medium text-green-800">Google Solar API</p>
                <p className="text-sm text-green-600">Operational</p>
              </div>
            </div>
            <div className="flex items-center p-4 bg-green-50 rounded-lg">
              <div className="w-3 h-3 bg-green-500 rounded-full mr-3 animate-pulse"></div>
              <div>
                <p className="font-medium text-green-800">Database</p>
                <p className="text-sm text-green-600">Connected</p>
              </div>
            </div>
            <div className="flex items-center p-4 bg-green-50 rounded-lg">
              <div className="w-3 h-3 bg-green-500 rounded-full mr-3 animate-pulse"></div>
              <div>
                <p className="font-medium text-green-800">Maps API</p>
                <p className="text-sm text-green-600">Active</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
