'use client'

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            🏠 Roof Calculator MVP
          </h1>
          <p className="text-xl text-gray-700 mb-8">
            Automated roof square footage calculator using Google Solar API for precise roofing measurements.
          </p>
          
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">
              Welcome to Phase 1
            </h2>
            <p className="text-gray-600 mb-4">
              This is the initial setup of your roof calculator application. 
              The following features will be implemented:
            </p>
            <ul className="list-disc list-inside text-gray-600 space-y-2">
              <li>Address input with Google Geocoding API</li>
              <li>Roof measurements using Google Solar API</li>
              <li>Automatic pitch detection and calculations</li>
              <li>Complexity scoring system</li>
              <li>95% accuracy target vs GAF reports</li>
            </ul>
          </div>
        </div>
      </div>
    </main>
  )
}
