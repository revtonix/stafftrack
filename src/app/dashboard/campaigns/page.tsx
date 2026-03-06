'use client'
import { useState, useEffect } from 'react'
import { HourGrid } from '@/components/campaigns/HourGrid'
import type { UserRole } from '@/types/campaign'

export default function CampaignsPage() {
  const [userId, setUserId] = useState('')
  const [role, setRole] = useState<UserRole>('STAFF')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setUserId(d.data.userId)
          setRole(d.data.role)
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="space-y-8">
        {/* Skeleton header */}
        <div className="space-y-3">
          <div className="h-8 w-72 rounded-xl animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />
          <div className="h-4 w-96 rounded-lg animate-pulse" style={{ background: 'rgba(255,255,255,0.02)' }} />
        </div>
        {/* Skeleton rows */}
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <div
              key={i}
              className="rounded-2xl h-20 animate-pulse"
              style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.04)',
                animationDelay: `${i * 80}ms`,
              }}
            />
          ))}
        </div>
      </div>
    )
  }

  if (!userId) {
    return (
      <div
        className="rounded-2xl px-6 py-8 text-center"
        style={{
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div className="text-white/30 text-sm">Unable to load session. Please log in again.</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3 mb-1.5">
            <h1
              className="text-2xl font-bold tracking-tight"
              style={{
                background: 'linear-gradient(135deg, #fff 0%, rgba(255,255,255,0.65) 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Campaigns
            </h1>
            <span
              className="text-[10px] font-bold uppercase px-2.5 py-1 rounded-md"
              style={{
                background: 'rgba(109,40,217,0.1)',
                color: '#a78bfa',
                border: '1px solid rgba(109,40,217,0.2)',
                fontFamily: 'DM Mono, monospace',
                letterSpacing: '0.15em',
              }}
            >
              Multi-Hour Grid
            </span>
          </div>
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>
            Admin/TL can add multiple campaigns per hour · Shift starts at 07:00 IST
          </p>
        </div>
      </div>

      {/* Grid */}
      <HourGrid staffId={userId} role={role} />
    </div>
  )
}
