'use client'
import { useState } from 'react'
import { useAuth } from './context/AuthContext'
import Link from 'next/link'
import { 
  ShoppingBag, 
  Car, 
  MapPin, 
  Home, 
  Star, 
  ArrowRight,
  Users,
  Shield,
  Zap
} from 'lucide-react'

export default function HomePage() {
  const { user } = useAuth()
  const [pickupLocation, setPickupLocation] = useState('')
  const [destination, setDestination] = useState('')

  const services = [
    {
      title: 'Marketplace',
      description: 'Buy electronics, clothing, food, and professional services',
      icon: ShoppingBag,
      color: 'bg-primary-800',
      href: '/marketplace',
      image: 'https://images.pexels.com/photos/230544/pexels-photo-230544.jpeg'
    },
    {
      title: 'Taxi Service',
      description: 'Reliable rides with verified drivers',
      icon: Car,
      color: 'bg-blue-600',
      href: '/taxi',
      image: 'https://images.pexels.com/photos/109919/pexels-photo-109919.jpeg'
    },
    {
      title: 'Errands',
      description: 'Kids pickup, grocery runs, parcel delivery',
      icon: MapPin,
      color: 'bg-green-600',
      href: '/errands',
      image: 'https://images.pexels.com/photos/4393668/pexels-photo-4393668.jpeg'
    },
    {
      title: 'Properties',
      description: 'Find your dream home or investment property',
      icon: Home,
      color: 'bg-purple-600',
      href: '/properties',
      image: 'https://images.pexels.com/photos/106399/pexels-photo-106399.jpeg'
    }
  ]

  const features = [
    {
      icon: Shield,
      title: 'Verified Providers',
      description: 'All sellers, drivers, and agents are verified for your safety'
    },
    {
      icon: Zap,
      title: 'Instant Service',
      description: 'Quick response times and real-time tracking'
    },
    {
      icon: Users,
      title: 'Trusted Community',
      description: 'Join thousands of satisfied customers'
    }
  ]

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-primary-800 to-primary-900 text-white">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative max-w-7xl mx-auto px-4 py-20 sm:py-32">
          <div className="text-center fade-in">
            <h1 className="text-4xl sm:text-6xl font-bold mb-6">
              Everything You Need,{' '}
              <span className="text-accent-500">All in One Place</span>
            </h1>
            <p className="text-xl sm:text-2xl mb-8 text-gray-200 max-w-3xl mx-auto">
              Shop, ride, manage errands, and find properties with QUICKLINK - 
              Kenya's most trusted multi-service platform
            </p>
            
            {!user && (
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/auth/register" className="btn-primary text-lg px-8 py-4">
                  Get Started Free
                </Link>
                <Link href="/auth/login" className="btn-secondary text-lg px-8 py-4 bg-white/20 text-white hover:bg-white/30">
                  Sign In
                </Link>
              </div>
            )}

            {user && (
              <Link href={`/dashboard/${user.role}`} className="btn-accent text-lg px-8 py-4">
                Go to Dashboard <ArrowRight className="inline ml-2" size={20} />
              </Link>
            )}
          </div>

          {/* Quick Taxi Request */}
          <div className="mt-16 max-w-4xl mx-auto">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8">
              <h3 className="text-2xl font-semibold mb-6 text-center">Quick Taxi Request</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <input
                  type="text"
                  placeholder="Pickup location"
                  value={pickupLocation}
                  onChange={(e) => setPickupLocation(e.target.value)}
                  className="px-4 py-3 rounded-lg bg-white/20 text-white placeholder-white/70 border border-white/30 focus:border-accent-500 focus:outline-none"
                />
                <input
                  type="text"
                  placeholder="Destination"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  className="px-4 py-3 rounded-lg bg-white/20 text-white placeholder-white/70 border border-white/30 focus:border-accent-500 focus:outline-none"
                />
                <Link 
                  href={`/taxi?pickup=${encodeURIComponent(pickupLocation)}&destination=${encodeURIComponent(destination)}`}
                  className="btn-accent justify-center flex items-center"
                >
                  <Car className="mr-2" size={20} />
                  Request Ride
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-secondary-900 mb-4">
              Our Services
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Access multiple services through one convenient platform
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {services.map((service, index) => (
              <Link 
                key={service.title}
                href={service.href}
                className="group block"
              >
                <div className="card hover:scale-105 transition-transform duration-300 h-full">
                  <div className="relative h-48 mb-4 overflow-hidden rounded-lg">
                    <img 
                      src={service.image} 
                      alt={service.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                    <div className={`absolute top-4 left-4 p-2 rounded-full ${service.color}`}>
                      <service.icon className="text-white" size={24} />
                    </div>
                  </div>
                  <h3 className="text-xl font-semibold text-secondary-900 mb-2">
                    {service.title}
                  </h3>
                  <p className="text-gray-600 mb-4">
                    {service.description}
                  </p>
                  <div className="flex items-center text-primary-800 font-medium group-hover:text-primary-600">
                    Learn More <ArrowRight className="ml-1" size={16} />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-secondary-900 mb-4">
              Why Choose QUICKLINK?
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div key={feature.title} className="text-center slide-in" style={{ animationDelay: `${index * 0.1}s` }}>
                <div className="bg-primary-800 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                  <feature.icon className="text-white" size={32} />
                </div>
                <h3 className="text-xl font-semibold text-secondary-900 mb-4">
                  {feature.title}
                </h3>
                <p className="text-gray-600">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-primary-800 text-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-accent-500 mb-2">10K+</div>
              <div className="text-lg">Happy Customers</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-accent-500 mb-2">500+</div>
              <div className="text-lg">Verified Drivers</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-accent-500 mb-2">1K+</div>
              <div className="text-lg">Products Available</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-accent-500 mb-2">200+</div>
              <div className="text-lg">Properties Listed</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-accent-500 to-accent-400">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold text-secondary-900 mb-6">
            Ready to Get Started?
          </h2>
          <p className="text-xl text-secondary-800 mb-8">
            Join thousands of users who trust QUICKLINK for all their service needs
          </p>
          {!user && (
            <Link href="/auth/register" className="btn-primary text-lg px-8 py-4">
              Create Your Account
            </Link>
          )}
        </div>
      </section>
    </div>
  )
}