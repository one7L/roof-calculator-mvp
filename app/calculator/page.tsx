'use client'

export default function Calculator() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center mb-8">
          <span className="mr-3">📐</span>
          Roof Calculator
        </h1>
        
        <div className="bg-white shadow-md rounded-lg p-8">
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Enter Property Address
            </label>
            <input
              type="text"
              placeholder="123 Main St, City, State 12345"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <button className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
            Calculate Roof Area
          </button>
          
          <div className="mt-8 p-6 bg-gray-50 rounded-lg text-center">
            <p className="text-gray-500">
              Enter an address above to calculate roof measurements using Google Solar API.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
