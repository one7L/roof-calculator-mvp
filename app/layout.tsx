import type { Metadata } from 'next'
import './globals.css'
import { AuthProvider } from './context/AuthContext'
import Navbar from './components/Navbar'

export const metadata: Metadata = {
  title: 'Roof Calculator MVP',
  description: 'Automated roof square footage calculator using Google Solar API',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <Navbar />
          <main>{children}</main>
        </AuthProvider>
      </body>
    </html>
  )
}
