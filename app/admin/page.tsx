'use client'

import { useAuth } from '../context/AuthContext'
import Link from 'next/link'
import { 
  Calculator, 
  Users, 
  FileBarChart, 
  Globe, 
  Settings, 
  BarChart3,
  Key,
  ArrowRight,
  Activity,
  CheckCircle,
  Clock,
  TrendingUp,
  Shield,
  Database,
  Map
} from 'lucide-react'

export default function AdminDashboard() {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-blue-200 rounded-full"></div>
          <div className="w-16 h-16 border-4 border-blue-600 rounded-full animate-spin border-t-transparent absolute top-0 left-0"></div>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Shield className="w-10 h-10 text-gray-400" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">Access Denied</h1>
          <p className="text-gray-600 mb-6">Please sign in to access the admin dashboard.</p>
          <Link
            href="/login"
            className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all"
          >
            Sign In
            <ArrowRight className="w-5 h-5 ml-2" />
          </Link>
        </div>
      </div>
    )
  }

  if (!user.isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Shield className="w-10 h-10 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">Admin Access Required</h1>
          <p className="text-gray-600 mb-2">You do not have administrator privileges.</p>
          <p className="text-sm text-gray-500 mb-6">Logged in as: {user.email}</p>
          <Link
            href="/"
            className="inline-flex items-center px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-all"
          >
            Go to Home
          </Link>
        </div>
      </div>
    )
  }

  const stats = [
    { 
      label: 'Total Calculations', 
      value: '1,234', 
      change: '+12%',
      trend: 'up',
      icon: Calculator, 
      color: 'from-blue-500 to-cyan-500',
      bgColor: 'bg-blue-50'
    },
    { 
      label: 'Active Users', 
      value: '156', 
      change: '+8%',
      trend: 'up',
      icon: Users, 
      color: 'from-green-500 to-emerald-500',
      bgColor: 'bg-green-50'
    },
    { 
      label: 'Reports Generated', 
      value: '892', 
      change: '+23%',
      trend: 'up',
      icon: FileBarChart, 
      color: 'from-purple-500 to-pink-500',
      bgColor: 'bg-purple-50'
    },
    { 
      label: 'API Calls Today', 
      value: '2,847', 
      change: '+5%',
      trend: 'up',
      icon: Globe, 
      color: 'from-orange-500 to-red-500',
      bgColor: 'bg-orange-50'
    },
  ]

  const quickActions = [
    { label: 'User Management', href: '/admin/users', icon: Users, description: 'Manage user accounts and permissions', color: 'text-blue-600', bgHover: 'hover:bg-blue-50' },
    { label: 'System Settings', href: '/admin/settings', icon: Settings, description: 'Configure application settings', color: 'text-purple-600', bgHover: 'hover:bg-purple-50' },
    { label: 'Analytics', href: '/admin/analytics', icon: BarChart3, description: 'View detailed usage analytics', color: 'text-green-600', bgHover: 'hover:bg-green-50' },
    { label: 'API Configuration', href: '/admin/api', icon: Key, description: 'Manage API keys and integrations', color: 'text-orange-600', bgHover: 'hover:bg-orange-50' },
  ]

  const recentActivity = [
    { action: 'New user registered', user: 'john@example.com', time: '5 minutes ago', type: 'user' },
    { action: 'Roof calculation completed', user: 'sarah@company.com', time: '12 minutes ago', type: 'calc' },
    { action: 'Report exported', user: 'mike@roofing.com', time: '1 hour ago', type: 'report' },
    { action: 'Settings updated', user: 'viralclickpro@gmail.com', time: '2 hours ago', type: 'settings' },
    { action: 'New user registered', user: 'alex@builders.com', time: '3 hours ago', type: 'user' },
  ]

  const systemStatus = [
    { name: 'Google Solar API', status: 'operational', icon: Globe },
    { name: 'Database', status: 'operational', icon: Database },
    { name: 'Maps API', status: 'operational', icon: Map },
  ]

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center mb-2">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center mr-4 shadow-lg">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                Admin Dashboard
              </h1>
              <p className="text-gray-600 text-sm">
                Welcome back, <span className="font-semibold text-purple-600">{user.email}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat) => {
            const Icon = stat.icon
            return (
              <div key={stat.label} className="bg-white rounded-2xl shadow-lg p-6 card-hover border border-gray-100">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-1">{stat.label}</p>
                    <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                    <div className="flex items-center mt-2">
                      <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                      <span className="text-sm font-medium text-green-600">{stat.change}</span>
                      <span className="text-xs text-gray-400 ml-1">vs last month</span>
                    </div>
                  </div>
                  <div className={`p-3 bg-gradient-to-br ${stat.color} rounded-xl shadow-lg`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Quick Actions */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center mb-6">
              <Activity className="w-5 h-5 text-purple-600 mr-2" />
              <h2 className="text-lg font-bold text-gray-900">Quick Actions</h2>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              {quickActions.map((action) => {
                const Icon = action.icon
                return (
                  <Link
                    key={action.href}
                    href={action.href}
                    className={`flex items-center p-4 rounded-xl border border-gray-100 ${action.bgHover} transition-all group`}
                  >
                    <div className={`p-3 bg-gray-100 rounded-xl mr-4 group-hover:scale-110 transition-transform`}>
                      <Icon className={`w-5 h-5 ${action.color}`} />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">{action.label}</p>
                      <p className="text-sm text-gray-500">{action.description}</p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-gray-500 group-hover:translate-x-1 transition-all" />
                  </Link>
                )
              })}
            </div>
          </div>

          {/* System Status */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center mb-6">
              <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
              <h2 className="text-lg font-bold text-gray-900">System Status</h2>
            </div>
            <div className="space-y-4">
              {systemStatus.map((service) => {
                const Icon = service.icon
                return (
                  <div key={service.name} className="flex items-center justify-between p-3 bg-green-50 rounded-xl">
                    <div className="flex items-center">
                      <Icon className="w-5 h-5 text-green-600 mr-3" />
                      <span className="font-medium text-gray-900">{service.name}</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-green-500 rounded-full mr-2 relative">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-ping absolute"></div>
                      </div>
                      <span className="text-sm text-green-600 font-medium">Operational</span>
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="mt-6 pt-4 border-t border-gray-100">
              <p className="text-xs text-gray-500 text-center">All systems operational • Last checked: just now</p>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="mt-8 bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <Clock className="w-5 h-5 text-blue-600 mr-2" />
              <h2 className="text-lg font-bold text-gray-900">Recent Activity</h2>
            </div>
            <button className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center">
              View All
              <ArrowRight className="w-4 h-4 ml-1" />
            </button>
          </div>
          <div className="space-y-4">
            {recentActivity.map((activity, index) => (
              <div key={index} className="flex items-center p-3 hover:bg-gray-50 rounded-xl transition-colors">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-4 ${
                  activity.type === 'user' ? 'bg-blue-100' : 
                  activity.type === 'calc' ? 'bg-green-100' : 
                  activity.type === 'report' ? 'bg-purple-100' : 'bg-orange-100'
                }`}>
                  {activity.type === 'user' ? <Users className={`w-5 h-5 text-blue-600`} /> : 
                   activity.type === 'calc' ? <Calculator className={`w-5 h-5 text-green-600`} /> : 
                   activity.type === 'report' ? <FileBarChart className={`w-5 h-5 text-purple-600`} /> : 
                   <Settings className={`w-5 h-5 text-orange-600`} />}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{activity.action}</p>
                  <p className="text-sm text-gray-500">{activity.user}</p>
                </div>
                <span className="text-sm text-gray-400">{activity.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
