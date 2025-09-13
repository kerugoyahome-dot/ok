'use client'
import { createContext, useContext, useState, useEffect } from 'react'
import api from '../utils/api'
import Cookies from 'js-cookie'

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = Cookies.get('token')
    if (token) {
      // Set the token in API headers
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`
      // Fetch user data
      fetchUser()
    } else {
      setLoading(false)
    }
  }, [])

  const fetchUser = async () => {
    try {
      const response = await api.get('/auth/me')
      setUser(response.data.user)
    } catch (error) {
      console.error('Failed to fetch user:', error)
      // Clear invalid token
      Cookies.remove('token')
      delete api.defaults.headers.common['Authorization']
    } finally {
      setLoading(false)
    }
  }

  const login = async (credentials) => {
    try {
      const response = await api.post('/auth/login', credentials)
      const { user, token } = response.data
      
      // Store token in cookie
      Cookies.set('token', token, { expires: 30 }) // 30 days
      
      // Set token in API headers
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`
      
      setUser(user)
      return { success: true, user }
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.error || 'Login failed' 
      }
    }
  }

  const register = async (userData) => {
    try {
      const response = await api.post('/auth/register', userData)
      const { user, token, requiresSubscription } = response.data
      
      // Store token in cookie
      Cookies.set('token', token, { expires: 30 })
      
      // Set token in API headers
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`
      
      setUser(user)
      return { success: true, user, requiresSubscription }
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.error || 'Registration failed' 
      }
    }
  }

  const loginWithOTP = async (phone, otp) => {
    try {
      const response = await api.post('/auth/verify-otp', { phone, otp })
      const { user, token } = response.data
      
      // Store token in cookie
      Cookies.set('token', token, { expires: 30 })
      
      // Set token in API headers
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`
      
      setUser(user)
      return { success: true, user }
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.error || 'OTP verification failed' 
      }
    }
  }

  const sendOTP = async (phone) => {
    try {
      const response = await api.post('/auth/send-otp', { phone })
      return { success: true, data: response.data }
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.error || 'Failed to send OTP' 
      }
    }
  }

  const logout = async () => {
    try {
      await api.post('/auth/logout')
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      // Clear token and user data
      Cookies.remove('token')
      delete api.defaults.headers.common['Authorization']
      setUser(null)
    }
  }

  const value = {
    user,
    loading,
    login,
    register,
    loginWithOTP,
    sendOTP,
    logout,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    isSeller: user?.role === 'seller',
    isDriver: user?.role === 'driver',
    isCustomer: user?.role === 'customer',
    isAgent: user?.role === 'agent'
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}