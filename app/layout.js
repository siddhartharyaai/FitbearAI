import './globals.css'
import { Toaster } from '@/components/ui/toaster'

export const metadata = {
  title: 'Fitbear AI - Indian Health & Nutrition Coach',
  description: 'AI-powered nutrition coach for Indian diet. Scan menus, get personalized recommendations, and chat with Coach C.',
  manifest: '/manifest.json',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="theme-color" content="#22c55e" />
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body>
        {children}
        <Toaster />
      </body>
    </html>
  )
}