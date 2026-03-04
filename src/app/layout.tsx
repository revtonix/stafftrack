// src/app/layout.tsx
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: 'StaffTrack Pro',
  description: 'Staff Attendance, Productivity & Payroll Management',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans bg-slate-950 text-slate-100 antialiased`}>
        {children}
      </body>
    </html>
  )
}
