'use client'

export default function Reports() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center mb-8">
          <span className="mr-3">📊</span>
          Reports
        </h1>
        
        <div className="bg-white shadow-md rounded-lg p-8 text-center">
          <div className="text-6xl mb-4">📋</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">No Reports Yet</h2>
          <p className="text-gray-500 mb-6">
            Your generated roof measurement reports will appear here.
          </p>
          <a 
            href="/calculator"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            Start a New Calculation
          </a>
        </div>
      </div>
    </div>
  )
}
