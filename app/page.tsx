'use client'

import Link from 'next/link'
import { 
  Calculator, 
  MapPin, 
  Zap, 
  Target, 
  TrendingUp, 
  Clock, 
  DollarSign,
  ArrowRight,
  CheckCircle2,
  Building2,
  Ruler
} from 'lucide-react'

export default function Home() {
  const features = [
    {
      icon: MapPin,
      title: 'Address-to-Measurement',
      description: 'Simply enter any address and get precise roof measurements in under 5 seconds.',
      color: 'from-blue-500 to-cyan-500'
    },
    {
      icon: Zap,
      title: 'Automatic Pitch Detection',
      description: 'AI-powered detection calculates roof pitch and applies accurate multipliers.',
      color: 'from-purple-500 to-pink-500'
    },
    {
      icon: Target,
      title: '95% Accuracy Target',
      description: 'Validated against GAF reports to ensure reliable measurements every time.',
      color: 'from-green-500 to-emerald-500'
    },
    {
      icon: TrendingUp,
      title: 'Complexity Scoring',
      description: 'Dynamic 1-10 complexity scale with intelligent waste factor calculations.',
      color: 'from-orange-500 to-red-500'
    }
  ]

  const stats = [
    { value: '<5s', label: 'Per Calculation', icon: Clock },
    { value: '95%', label: 'Accuracy Rate', icon: Target },
    { value: '$0.05', label: 'Per Measurement', icon: DollarSign },
    { value: '10K+', label: 'Roofs Measured', icon: Building2 }
  ]

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 lg:py-32">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-400/20 rounded-full blur-3xl"></div>
          <div className="absolute top-1/2 -left-40 w-80 h-80 bg-purple-400/20 rounded-full blur-3xl"></div>
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            {/* Badge */}
            <div className="inline-flex items-center px-4 py-2 bg-blue-50 rounded-full text-blue-700 text-sm font-medium mb-8 border border-blue-100">
              <Zap className="w-4 h-4 mr-2" />
              Powered by Google Solar API
            </div>
            
            {/* Main heading */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 mb-6 leading-tight">
              Professional Roof Measurements
              <span className="block bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                In Seconds, Not Hours
              </span>
            </h1>
            
            {/* Subtitle */}
            <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed">
              Transform any address into accurate roof square footage calculations. 
              Save thousands on manual reports with our AI-powered measurement system.
            </p>
            
            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link 
                href="/calculator"
                className="group w-full sm:w-auto inline-flex items-center justify-center px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl hover:from-blue-700 hover:to-purple-700 transition-all"
              >
                <Calculator className="w-5 h-5 mr-2" />
                Start Calculating
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link 
                href="/login"
                className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-4 bg-white text-gray-700 rounded-xl font-semibold text-lg shadow-md hover:shadow-lg border border-gray-200 hover:border-gray-300 transition-all"
              >
                Sign In to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-white/50 backdrop-blur-sm border-y border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((stat) => {
              const Icon = stat.icon
              return (
                <div key={stat.label} className="text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl mb-4 shadow-lg">
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-3xl sm:text-4xl font-bold text-gray-900 mb-1">{stat.value}</div>
                  <div className="text-sm text-gray-500 font-medium">{stat.label}</div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Everything You Need for Accurate Estimates
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Our comprehensive platform combines cutting-edge APIs with intelligent algorithms 
              to deliver the most accurate roof measurements in the industry.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {features.map((feature) => {
              const Icon = feature.icon
              return (
                <div 
                  key={feature.title}
                  className="group bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all border border-gray-100 card-hover"
                >
                  <div className={`inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br ${feature.color} rounded-xl mb-6 shadow-lg group-hover:scale-110 transition-transform`}>
                    <Icon className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">{feature.title}</h3>
                  <p className="text-gray-600 leading-relaxed">{feature.description}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Pricing Comparison */}
      <section className="py-20 bg-gradient-to-br from-gray-900 to-gray-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Save Thousands Every Month
            </h2>
            <p className="text-gray-300 text-lg max-w-2xl mx-auto">
              Why pay $4,000/month for manual GAF reports when you can get the same 
              accuracy for a fraction of the cost?
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Traditional */}
            <div className="bg-gray-800/50 backdrop-blur rounded-2xl p-8 border border-gray-700">
              <div className="text-gray-400 text-sm font-medium mb-2">Traditional Methods</div>
              <div className="text-4xl font-bold mb-4">$4,000<span className="text-lg font-normal text-gray-400">/mo</span></div>
              <ul className="space-y-3 text-gray-300">
                <li className="flex items-center">
                  <span className="w-5 h-5 mr-3 text-red-400">✕</span>
                  Manual on-site measurements
                </li>
                <li className="flex items-center">
                  <span className="w-5 h-5 mr-3 text-red-400">✕</span>
                  Days to receive reports
                </li>
                <li className="flex items-center">
                  <span className="w-5 h-5 mr-3 text-red-400">✕</span>
                  Limited scalability
                </li>
                <li className="flex items-center">
                  <span className="w-5 h-5 mr-3 text-red-400">✕</span>
                  Weather dependent
                </li>
              </ul>
            </div>

            {/* RoofCalc Pro */}
            <div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl p-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-yellow-400 text-gray-900 text-xs font-bold px-3 py-1 rounded-bl-lg">
                RECOMMENDED
              </div>
              <div className="text-blue-100 text-sm font-medium mb-2">RoofCalc Pro</div>
              <div className="text-4xl font-bold mb-4">$5<span className="text-lg font-normal text-blue-200">/mo</span></div>
              <ul className="space-y-3 text-white">
                <li className="flex items-center">
                  <CheckCircle2 className="w-5 h-5 mr-3 text-green-300" />
                  Instant automated measurements
                </li>
                <li className="flex items-center">
                  <CheckCircle2 className="w-5 h-5 mr-3 text-green-300" />
                  Results in under 5 seconds
                </li>
                <li className="flex items-center">
                  <CheckCircle2 className="w-5 h-5 mr-3 text-green-300" />
                  Unlimited scalability
                </li>
                <li className="flex items-center">
                  <CheckCircle2 className="w-5 h-5 mr-3 text-green-300" />
                  Works 24/7, any weather
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="bg-white rounded-3xl shadow-2xl p-12 border border-gray-100">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mb-6 shadow-lg">
              <Ruler className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Ready to Transform Your Estimates?
            </h2>
            <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
              Join thousands of roofing professionals who save time and money with 
              accurate, instant roof measurements.
            </p>
            <Link 
              href="/calculator"
              className="inline-flex items-center justify-center px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl hover:from-blue-700 hover:to-purple-700 transition-all"
            >
              <Calculator className="w-5 h-5 mr-2" />
              Try It Free Now
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
