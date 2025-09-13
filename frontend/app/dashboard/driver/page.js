'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useRouter } from 'next/navigation'
import api from '../../utils/api'
import { 
  Car, 
  MapPin, 
  Clock, 
  DollarSign, 
  User, 
  Phone,
  CheckCircle,
  Play,
  Square,
  RefreshCw,
  AlertCircle,
  Calendar
} from 'lucide-react'

export default function DriverDashboard() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [onlineStatus, setOnlineStatus] = useState(false)
  const [availableRides, setAvailableRides] = useState([])
  const [myRides, setMyRides] = useState([])
  const [stats, setStats] = useState({
    todayEarnings: 0,
    totalRides: 0,
    completedRides: 0,
    rating: 4.8
  })

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'driver')) {
      router.push('/auth/login')
      return
    }
    if (user && user.role === 'driver') {
      fetchDashboardData()
    }
  }, [user, authLoading])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      
      // Fetch available rides
      const availableResponse = await api.get('/taxi/available')
      setAvailableRides(availableResponse.data.rides)
      
      // Fetch driver's rides
      const myRidesResponse = await api.get('/taxi/driver-rides')
      setMyRides(myRidesResponse.data.rides)
      
      // Calculate stats
      const today = new Date().toDateString()
      const todayRides = myRidesResponse.data.rides.filter(ride => 
        new Date(ride.created_at).toDateString() === today && ride.status === 'completed'
      )
      const todayEarnings = todayRides.reduce((sum, ride) => sum + parseFloat(ride.price || 0), 0)
      const completedRides = myRidesResponse.data.rides.filter(ride => ride.status === 'completed').length
      
      setStats({
        todayEarnings,
        totalRides: myRidesResponse.data.rides.length,
        completedRides,
        rating: 4.8 // Mock rating
      })
      
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleOnlineStatus = async () => {
    try {
      const response = await api.put('/taxi/driver/status', {
        online: !onlineStatus
      })
      setOnlineStatus(!onlineStatus)
    } catch (error) {
      console.error('Failed to update status:', error)
    }
  }

  const acceptRide = async (rideId) => {
    try {
      const response = await api.post(`/taxi/${rideId}/accept`)
      if (response.data.ride) {
        // Remove from available rides and add to my rides
        setAvailableRides(prev => prev.filter(ride => ride.id !== rideId))
        setMyRides(prev => [response.data.ride, ...prev])
      }
    } catch (error) {
      console.error('Failed to accept ride:', error)
      alert(error.response?.data?.error || 'Failed to accept ride')
    }
  }

  const startTrip = async (rideId) => {
    try {
      const response = await api.post(`/taxi/${rideId}/start`)
      setMyRides(prev => prev.map(ride => 
        ride.id === rideId ? { ...ride, status: 'in_progress' } : ride
      ))
    } catch (error) {
      console.error('Failed to start trip:', error)
      alert(error.response?.data?.error || 'Failed to start trip')
    }
  }

  const completeTrip = async (rideId) => {
    try {
      const response = await api.post(`/taxi/${rideId}/complete`)
      setMyRides(prev => prev.map(ride => 
        ride.id === rideId ? { ...ride, status: 'completed', completed_at: new Date().toISOString() } : ride
      ))
      fetchDashboardData() // Refresh stats
    } catch (error) {
      console.error('Failed to complete trip:', error)
      alert(error.response?.data?.error || 'Failed to complete trip')
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="animate-spin mx-auto mb-4" size={32} />
          <p>Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (!user?.verified) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-8 text-center">
          <AlertCircle className="mx-auto mb-4 text-yellow-500" size={48} />
          <h2 className="text-xl font-semibold mb-4">Account Verification Required</h2>
          <p className="text-gray-600 mb-4">
            Your driver account is pending verification. Please wait for admin approval to access the dashboard.
          </p>
          <p className="text-sm text-gray-500">
            You will receive a notification once your account is verified.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-secondary-900">Driver Dashboard</h1>
            <p className="text-gray-600">Welcome back, {user?.name}</p>
          </div>
          
          {/* Online Status Toggle */}
          <div className="mt-4 sm:mt-0">
            <button
              onClick={toggleOnlineStatus}
              className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-colors ${
                onlineStatus 
                  ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <div className={`w-3 h-3 rounded-full ${onlineStatus ? 'bg-green-500' : 'bg-gray-400'}`} />
              <span>{onlineStatus ? 'Online' : 'Offline'}</span>
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Today's Earnings</p>
                <p className="text-2xl font-bold text-green-600">KES {stats.todayEarnings.toLocaleString()}</p>
              </div>
              <DollarSign className="text-green-500" size={32} />
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Rides</p>
                <p className="text-2xl font-bold text-blue-600">{stats.totalRides}</p>
              </div>
              <Car className="text-blue-500" size={32} />
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-purple-600">{stats.completedRides}</p>
              </div>
              <CheckCircle className="text-purple-500" size={32} />
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Rating</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.rating}⭐</p>
              </div>
              <User className="text-yellow-500" size={32} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Available Rides */}
          <div className="bg-white rounded-xl shadow-lg">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold text-secondary-900">Available Rides</h2>
              <p className="text-gray-600">Ride requests near you</p>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {availableRides.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  <Car className="mx-auto mb-2" size={32} />
                  <p>No rides available</p>
                </div>
              ) : (
                availableRides.map((ride) => (
                  <div key={ride.id} className="p-6 border-b last:border-b-0">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <User className="text-gray-400" size={16} />
                          <span className="font-medium">{ride.customer_name}</span>
                          <Phone className="text-gray-400" size={16} />
                          <span className="text-sm text-gray-600">{ride.customer_phone}</span>
                        </div>
                        
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                            <span className="text-sm text-gray-600">Pickup: {ride.pickup}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                            <span className="text-sm text-gray-600">Drop-off: {ride.destination}</span>
                          </div>
                        </div>
                        
                        <div className="mt-2 flex items-center space-x-4 text-sm text-gray-500">
                          <span>{ride.distance_km}km</span>
                          <span>•</span>
                          <span className="font-medium text-green-600">KES {ride.price}</span>
                          <span>•</span>
                          <span>{ride.car_category}</span>
                        </div>
                      </div>
                      
                      <button
                        onClick={() => acceptRide(ride.id)}
                        className="btn-primary text-sm px-4 py-2"
                      >
                        Accept
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* My Rides */}
          <div className="bg-white rounded-xl shadow-lg">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold text-secondary-900">My Rides</h2>
              <p className="text-gray-600">Your current and recent rides</p>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {myRides.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  <Clock className="mx-auto mb-2" size={32} />
                  <p>No rides yet</p>
                </div>
              ) : (
                myRides.slice(0, 10).map((ride) => (
                  <div key={ride.id} className="p-6 border-b last:border-b-0">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          {ride.status === 'confirmed' && (
                            <div className="flex items-center space-x-1 text-green-600">
                              <CheckCircle size={16} />
                              <span className="text-sm font-medium">Confirmed ✅</span>
                            </div>
                          )}
                          {ride.status === 'in_progress' && (
                            <div className="flex items-center space-x-1 text-blue-600">
                              <Play size={16} />
                              <span className="text-sm font-medium">In Progress</span>
                            </div>
                          )}
                          {ride.status === 'completed' && (
                            <div className="flex items-center space-x-1 text-purple-600">
                              <CheckCircle size={16} />
                              <span className="text-sm font-medium">Completed</span>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex items-center space-x-2 mb-2">
                          <User className="text-gray-400" size={16} />
                          <span className="font-medium">{ride.customer_name}</span>
                          <Phone className="text-gray-400" size={16} />
                          <span className="text-sm text-gray-600">{ride.customer_phone}</span>
                        </div>
                        
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                            <span className="text-sm text-gray-600">{ride.pickup}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                            <span className="text-sm text-gray-600">{ride.destination}</span>
                          </div>
                        </div>
                        
                        <div className="mt-2 flex items-center space-x-4 text-sm text-gray-500">
                          <span className="font-medium text-green-600">KES {ride.price}</span>
                          <span>•</span>
                          <span>{ride.car_category}</span>
                          <span>•</span>
                          <span className="flex items-center space-x-1">
                            <Calendar size={12} />
                            <span>{new Date(ride.created_at).toLocaleDateString()}</span>
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex flex-col space-y-2">
                        {ride.status === 'confirmed' && (
                          <button
                            onClick={() => startTrip(ride.id)}
                            className="btn-secondary text-sm px-3 py-1"
                          >
                            Start Trip
                          </button>
                        )}
                        {ride.status === 'in_progress' && (
                          <button
                            onClick={() => completeTrip(ride.id)}
                            className="btn-primary text-sm px-3 py-1"
                          >
                            Complete
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}