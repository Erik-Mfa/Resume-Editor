import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Resume Pivot AI',
  description: 'Adapt your resume to any job description using Gemini — without hallucinating.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-slate-950 text-gray-900 antialiased min-h-screen">{children}</body>
    </html>
  )
}
