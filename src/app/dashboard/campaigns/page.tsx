'use client'
// src/app/dashboard/campaigns/page.tsx
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
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Campaigns · Multi-Hour Grid</h1>
          <p className="text-slate-400 text-sm mt-1">Loading…</p>
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => (
            <div
              key={i}
              className="rounded-2xl p-4 h-16 animate-pulse"
              style={{
                background: 'rgba(255,255,255,0.025)',
                border: '1px solid rgba(255,255,255,0.06)',
              }}
            />
          ))}
        </div>
      </div>
    )
  }

  if (!userId) {
    return (
      <div className="text-slate-400">Unable to load user session. Please log in again.</div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Campaigns · Multi-Hour Grid</h1>
        <p className="text-slate-400 text-sm mt-1">
          Admin/TL can add multiple campaigns per hour · Shift: 07:00 IST
        </p>
      </div>

      <HourGrid staffId={userId} role={role} />
    </div>
  )
}
