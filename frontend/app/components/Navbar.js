'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useAuth } from '../context/AuthContext'
import { 
  Menu, 
  X, 
  User, 
  LogOut, 
  ShoppingBag,
  Car,
  MapPin,
  Home as HomeIcon,
  Settings
} from 'lucide-react'

export default function Navbar() {
  const { user, logout, isAuthenticated } = useAuth()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false)

  const handleLogout = async () => {
    await logout()
    setIsProfileMenuOpen(false)
  }

  const navigation = [
    { name: 'Marketplace', href: '/marketplace', icon: ShoppingBag },
    { name: 'Taxi', href: '/taxi', icon: Car },
    { name: 'Errands', href: '/errands', icon: MapPin },
    { name: 'Properties', href: '/properties', icon: HomeIcon },
  ]

  return (
    <nav className="fixed top-0 left-0 right-0 bg-white shadow-lg z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-primary-800 to-primary-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">Q</span>
            </div>
            <span className="text-xl font-bold text-secondary-900">QUICKLINK</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="flex items-center space-x-1 text-gray-600 hover:text-primary-800 transition-colors duration-200"
              >
                <item.icon size={18} />
                <span>{item.name}</span>
              </Link>
            ))}
          </div>

          {/* Desktop Auth/Profile */}
          <div className="hidden md:flex items-center space-x-4">
            {isAuthenticated ? (
              <div className="relative">
                <button
                  onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                  className="flex items-center space-x-2 bg-gray-100 rounded-full px-3 py-2 hover:bg-gray-200 transition-colors"
                >
                  <User size={18} />
                  <span className="text-sm font-medium">{user?.name}</span>
                </button>

                {isProfileMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border">
                    <div className="px-4 py-2 border-b">
                      <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                      <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
                    </div>
                    <div className="py-1">
                      <Link
                        href={`/dashboard/${user?.role}`}
                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={() => setIsProfileMenuOpen(false)}
                      >
                        <Settings size={16} className="mr-2" />
                        Dashboard
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <LogOut size={16} className="mr-2" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center space-x-3">
                <Link
                  href="/auth/login"
                  className="text-gray-600 hover:text-primary-800 font-medium"
                >
                  Sign In
                </Link>
                <Link
                  href="/auth/register"
                  className="btn-primary"
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:bg-gray-50 hover:text-primary-800"
                onClick={() => setIsMenuOpen(false)}
              >
                <item.icon size={18} />
                <span>{item.name}</span>
              </Link>
            ))}
            
            <div className="border-t mt-4 pt-4">
              {isAuthenticated ? (
                <>
                  <div className="px-4 py-2">
                    <p className="font-medium text-gray-900">{user?.name}</p>
                    <p className="text-sm text-gray-500 capitalize">{user?.role}</p>
                  </div>
                  <Link
                    href={`/dashboard/${user?.role}`}
                    className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:bg-gray-50"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <Settings size={18} />
                    <span>Dashboard</span>
                  </Link>
                  <button
                    onClick={() => {
                      handleLogout()
                      setIsMenuOpen(false)
                    }}
                    className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:bg-gray-50 w-full text-left"
                  >
                    <LogOut size={18} />
                    <span>Sign Out</span>
                  </button>
                </>
              ) : (
                <div className="px-4 space-y-2">
                  <Link
                    href="/auth/login"
                    className="block w-full text-center py-2 text-gray-600 font-medium"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/auth/register"
                    className="block w-full text-center btn-primary"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Get Started
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Overlay for profile menu */}
      {isProfileMenuOpen && (
        <div
          className="fixed inset-0 z-10"
          onClick={() => setIsProfileMenuOpen(false)}
        />
      )}
    </nav>
  )
}