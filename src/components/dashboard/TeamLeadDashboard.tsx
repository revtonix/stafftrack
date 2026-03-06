'use client'
// src/components/dashboard/TeamLeadDashboard.tsx
import { useState, useEffect } from 'react'
import { getCurrentShift, getShiftLabel, getISTTimeString, getISTDateLabel } from '@/lib/shiftDay'
import type { JWTPayload } from '@/lib/auth'

export default function TeamLeadDashboard({ session }: { session: JWTPayload }) {
  const [productivity, setProductivity] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    fetch('/api/reports/productivity?preset=today')
      .then(r => r.json())
      .then(d => { if (d.success) setProductivity(d.data); setLoading(false) })
  }, [])

  const teamLabel = session.role === 'TEAM_LEAD_DAY' ? 'Day Team' : 'Night Team'
  const shiftType = getCurrentShift(now)
  const shiftLabel = getShiftLabel(now)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">{teamLabel} — Lead Dashboard</h1>
        <p className="text-slate-400 text-sm mt-1">
          {getISTDateLabel(now)} &middot;{' '}
          <span className={shiftType === 'MORNING' ? 'text-yellow-400' : 'text-purple-400'}>{shiftLabel}</span>
          {' '}&middot; <span className="font-mono text-white">{getISTTimeString(now)}</span> IST
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="stat-card">
          <div className="text-xs text-slate-500 uppercase">Total Forms Today</div>
          <div className="text-3xl font-bold text-brand-400">{productivity?.totalForms || 0}</div>
        </div>
        <div className="stat-card">
          <div className="text-xs text-slate-500 uppercase">Active Staff</div>
          <div className="text-3xl font-bold text-white">{productivity?.staffTotals?.length || 0}</div>
        </div>
      </div>

      {!loading && productivity && (
        <div className="card">
          <div className="px-6 py-4 border-b border-slate-800">
            <h2 className="font-semibold text-white">Staff Performance Today</h2>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Staff</th><th>Forms</th></tr></thead>
              <tbody>
                {productivity.staffTotals.map((s: any) => (
                  <tr key={s.name}>
                    <td className="font-semibold text-white">{s.name}</td>
                    <td className="font-bold text-brand-400">{s.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
