import './globals.css'
import { Inter } from 'next/font/google'
import Navbar from './components/Navbar'
import { AuthProvider } from './context/AuthContext'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'QUICKLINK - Multi-Service Platform',
  description: 'Marketplace, Taxi, Errands, Properties - All in one platform',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <div className="min-h-screen bg-gray-50">
            <Navbar />
            <main className="pt-16">
              {children}
            </main>
          </div>
        </AuthProvider>
      </body>
    </html>
  )
}