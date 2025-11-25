'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useAuth } from '../context/AuthContext'

export default function Navbar() {
  const { user, logout } = useAuth()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const navLinks = [
    { href: '/', label: 'Home', icon: '🏠' },
    { href: '/calculator', label: 'Calculator', icon: '📐' },
    { href: '/reports', label: 'Reports', icon: '📊' },
    { href: '/history', label: 'History', icon: '📜' },
  ]

  const adminLinks = [
    { href: '/admin', label: 'Admin Dashboard', icon: '⚙️' },
    { href: '/admin/users', label: 'User Management', icon: '👥' },
    { href: '/admin/settings', label: 'Settings', icon: '🔧' },
    { href: '/admin/analytics', label: 'Analytics', icon: '📈' },
  ]

  return (
    <nav className="bg-white shadow-lg border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo and brand */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-2">
              <span className="text-2xl">🏠</span>
              <span className="text-xl font-bold text-gray-900">RoofCalc Pro</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex md:items-center md:space-x-4">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-blue-600 hover:bg-blue-50 transition-colors"
              >
                <span className="mr-1">{link.icon}</span>
                {link.label}
              </Link>
            ))}

            {/* Admin dropdown for admin users */}
            {user?.isAdmin && (
              <div className="relative group">
                <button className="flex items-center px-3 py-2 rounded-md text-sm font-medium text-purple-700 hover:text-purple-800 hover:bg-purple-50 transition-colors">
                  <span className="mr-1">👑</span>
                  Admin
                  <svg className="ml-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                  {adminLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-700"
                    >
                      <span className="mr-2">{link.icon}</span>
                      {link.label}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* User menu */}
            {user ? (
              <div className="flex items-center space-x-3 ml-4 pl-4 border-l border-gray-200">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="ml-2">
                    <p className="text-sm font-medium text-gray-700">{user.name}</p>
                    {user.isAdmin && (
                      <p className="text-xs text-purple-600 font-medium">Admin</p>
                    )}
                  </div>
                </div>
                <button
                  onClick={logout}
                  className="px-3 py-1.5 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
                >
                  Logout
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="ml-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                Sign In
              </Link>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
            >
              <svg
                className="h-6 w-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                {isMobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-gray-200">
          <div className="px-2 pt-2 pb-3 space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-blue-600 hover:bg-blue-50"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <span className="mr-2">{link.icon}</span>
                {link.label}
              </Link>
            ))}
            
            {user?.isAdmin && (
              <>
                <div className="border-t border-gray-200 my-2"></div>
                <p className="px-3 py-1 text-xs font-semibold text-gray-500 uppercase">Admin</p>
                {adminLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="flex items-center px-3 py-2 rounded-md text-base font-medium text-purple-700 hover:text-purple-800 hover:bg-purple-50"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <span className="mr-2">{link.icon}</span>
                    {link.label}
                  </Link>
                ))}
              </>
            )}

            <div className="border-t border-gray-200 my-2"></div>
            {user ? (
              <div className="px-3 py-2">
                <div className="flex items-center mb-3">
                  <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="ml-3">
                    <p className="text-base font-medium text-gray-700">{user.email}</p>
                    {user.isAdmin && (
                      <p className="text-sm text-purple-600 font-medium">Administrator</p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => {
                    logout()
                    setIsMobileMenuOpen(false)
                  }}
                  className="w-full px-3 py-2 text-left text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md"
                >
                  Logout
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="flex items-center justify-center px-3 py-2 mx-3 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  )
}
