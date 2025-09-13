'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../context/AuthContext'
import Link from 'next/link'
import { Mail, Lock, Phone, Eye, EyeOff, Car, ShoppingBag } from 'lucide-react'

export default function LoginPage() {
  const [formData, setFormData] = useState({
    email: '',
    phone: '',
    password: '',
    loginType: 'email' // 'email' or 'phone'
  })
  const [otp, setOtp] = useState('')
  const [showOtpInput, setShowOtpInput] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [otpSent, setOtpSent] = useState(false)

  const { login, loginWithOTP, sendOTP } = useAuth()
  const router = useRouter()

  const handleInputChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
    setError('')
  }

  const handleEmailLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const result = await login({
      email: formData.email,
      phone: formData.phone,
      password: formData.password
    })

    setLoading(false)

    if (result.success) {
      // Redirect based on user role
      router.push(`/dashboard/${result.user.role}`)
    } else {
      setError(result.error)
    }
  }

  const handleSendOtp = async () => {
    if (!formData.phone) {
      setError('Please enter your phone number')
      return
    }

    setLoading(true)
    setError('')

    const result = await sendOTP(formData.phone)
    setLoading(false)

    if (result.success) {
      setShowOtpInput(true)
      setOtpSent(true)
    } else {
      setError(result.error)
    }
  }

  const handleOtpLogin = async (e) => {
    e.preventDefault()
    if (!otp) {
      setError('Please enter the OTP')
      return
    }

    setLoading(true)
    setError('')

    const result = await loginWithOTP(formData.phone, otp)
    setLoading(false)

    if (result.success) {
      router.push(`/dashboard/${result.user.role}`)
    } else {
      setError(result.error)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-white flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-primary-800 to-primary-600 rounded-2xl flex items-center justify-center">
              <span className="text-white font-bold text-2xl">Q</span>
            </div>
          </div>
          <h2 className="text-3xl font-bold text-secondary-900">Welcome Back</h2>
          <p className="text-gray-600 mt-2">Sign in to your QUICKLINK account</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Login Type Toggle */}
          <div className="flex mb-6 bg-gray-100 rounded-lg p-1">
            <button
              type="button"
              className={`flex-1 flex items-center justify-center py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                formData.loginType === 'email'
                  ? 'bg-white text-primary-800 shadow-sm'
                  : 'text-gray-600'
              }`}
              onClick={() => setFormData(prev => ({ ...prev, loginType: 'email' }))}
            >
              <Mail size={16} className="mr-2" />
              Email
            </button>
            <button
              type="button"
              className={`flex-1 flex items-center justify-center py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                formData.loginType === 'phone'
                  ? 'bg-white text-primary-800 shadow-sm'
                  : 'text-gray-600'
              }`}
              onClick={() => setFormData(prev => ({ ...prev, loginType: 'phone' }))}
            >
              <Phone size={16} className="mr-2" />
              Phone
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          {formData.loginType === 'email' ? (
            <form onSubmit={handleEmailLogin} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Enter your email"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Enter your password"
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full btn-primary disabled:opacity-50"
              >
                {loading ? 'Signing In...' : 'Sign In'}
              </button>
            </form>
          ) : (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="0712345678"
                    required
                  />
                </div>
              </div>

              {!showOtpInput ? (
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={loading}
                  className="w-full btn-primary disabled:opacity-50"
                >
                  {loading ? 'Sending OTP...' : 'Send OTP'}
                </button>
              ) : (
                <form onSubmit={handleOtpLogin} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Enter OTP
                    </label>
                    <input
                      type="text"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-center text-lg font-mono"
                      placeholder="123456"
                      maxLength="6"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full btn-primary disabled:opacity-50"
                  >
                    {loading ? 'Verifying...' : 'Verify & Sign In'}
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowOtpInput(false)}
                    className="w-full text-sm text-gray-600 hover:text-primary-800"
                  >
                    Use different number
                  </button>
                </form>
              )}
            </div>
          )}

          <div className="mt-6 text-center">
            <p className="text-gray-600">
              Don't have an account?{' '}
              <Link href="/auth/register" className="text-primary-800 hover:text-primary-600 font-medium">
                Sign up here
              </Link>
            </p>
          </div>

          {/* Demo Accounts */}
          <div className="mt-8 p-4 bg-gray-50 rounded-lg">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Demo Accounts:</h4>
            <div className="text-xs text-gray-600 space-y-1">
              <div>Admin: admin@quicklink.com / password123</div>
              <div>Seller: seller@test.com / password123</div>
              <div>Driver: james.driver@test.com / password123</div>
              <div>Customer: mary.customer@test.com / password123</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}