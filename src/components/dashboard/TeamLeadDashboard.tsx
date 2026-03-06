'use client'
// src/components/dashboard/TeamLeadDashboard.tsx
import { useState, useEffect, useCallback } from 'react'
import { formatTime } from '@/lib/salary'
import { getCurrentShift, getShiftLabel, getISTTimeString, getISTDateLabel } from '@/lib/shiftDay'
import type { JWTPayload } from '@/lib/auth'

interface AttendanceEntry {
  staffId: string; name: string; team: string
  checkIn: string | null; checkOut: string | null
  hoursWorked: number; formsToday: number
  campaigns: Record<string, number>
}
interface StaffForm { name: string; team: string; total: number; campaigns: Record<string, number> }
interface CampaignPerf { name: string; team: string; totalForms: number; staffCount: number }
interface DashData {
  totalPresent: number; activeNow: number
  dayShiftActive: number; nightShiftActive: number
  dayStaffTotal: number; nightStaffTotal: number
  totalFormsToday: number; dayFormsToday: number; nightFormsToday: number
  attendance: AttendanceEntry[]
  staffForms: StaffForm[]
  campaignPerformance: CampaignPerf[]
}

export default function TeamLeadDashboard({ session }: { session: JWTPayload }) {
  const [data, setData] = useState<DashData | null>(null)
  const [loading, setLoading] = useState(true)
  const [now, setNow] = useState(new Date())
  const [refreshCount, setRefreshCount] = useState(0)

  const isDay = session.role === 'TEAM_LEAD_DAY'
  const teamLabel = isDay ? 'Day Team' : 'Night Team'
  const teamBadge = isDay ? 'badge-yellow' : 'badge-purple'
  const teamDotColor = isDay ? 'bg-yellow-400' : 'bg-purple-400'

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    const t = setInterval(() => setRefreshCount(c => c + 1), 10000)
    return () => clearInterval(t)
  }, [])

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/dashboard')
      const d = await res.json()
      if (d.success) setData(d.data)
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData, refreshCount])

  const shiftType = getCurrentShift(now)
  const shiftLabel = getShiftLabel(now)
  const myTeamActive = isDay ? (data?.dayShiftActive || 0) : (data?.nightShiftActive || 0)
  const myTeamTotal = isDay ? (data?.dayStaffTotal || 0) : (data?.nightStaffTotal || 0)
  const myTeamForms = isDay ? (data?.dayFormsToday || 0) : (data?.nightFormsToday || 0)

  if (loading && !data) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-white">{teamLabel} — Lead Dashboard</h1>
            <span className={teamBadge + ' text-[10px] uppercase tracking-wider'}>{teamLabel}</span>
          </div>
          <p className="text-slate-400 text-sm">
            {getISTDateLabel(now)} &middot;{' '}
            <span className={shiftType === 'MORNING' ? 'text-yellow-400' : 'text-purple-400'}>{shiftLabel}</span>
            {' '}&middot; <span className="font-mono text-white">{getISTTimeString(now)}</span> IST
          </p>
        </div>
        <div className="flex items-center gap-2 bg-slate-800/60 px-3 py-2 rounded-xl border border-slate-700/50">
          <span className="live-dot" />
          <span className="text-xs text-slate-400">Auto-refresh 10s</span>
        </div>
      </div>

      {/* Live Active Staff Counter */}
      <div className="card-glow p-6">
        <div className="flex items-center gap-3 mb-4">
          <span className={`w-3 h-3 rounded-full ${teamDotColor} animate-pulse-soft`} />
          <h2 className="font-semibold text-white text-lg">Live Active Staff</h2>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-4xl font-bold text-white">{myTeamActive}</div>
            <div className="text-xs text-slate-500 mt-1">Active Now</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-emerald-400">{data?.attendance?.filter(a => a.checkIn).length || 0}</div>
            <div className="text-xs text-slate-500 mt-1">Checked In Today</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-slate-400">{myTeamTotal}</div>
            <div className="text-xs text-slate-500 mt-1">Total Team</div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="text-xs text-slate-500 uppercase tracking-wide">Team Forms Today</div>
          <div className="text-3xl font-bold text-brand-400">{myTeamForms}</div>
          <div className="text-xs text-slate-500">{teamLabel}</div>
        </div>
        <div className="stat-card">
          <div className="text-xs text-slate-500 uppercase tracking-wide">Active Staff</div>
          <div className="text-3xl font-bold text-emerald-400">{myTeamActive}/{myTeamTotal}</div>
          <div className="text-xs text-slate-500">Working now</div>
        </div>
        <div className="stat-card">
          <div className="text-xs text-slate-500 uppercase tracking-wide">Campaigns</div>
          <div className="text-3xl font-bold text-white">{data?.campaignPerformance?.length || 0}</div>
          <div className="text-xs text-slate-500">Active today</div>
        </div>
        <div className="stat-card">
          <div className="text-xs text-slate-500 uppercase tracking-wide">Avg Forms/Staff</div>
          <div className="text-3xl font-bold text-yellow-400">
            {(data?.staffForms?.length || 0) > 0
              ? Math.round(myTeamForms / (data?.staffForms?.length || 1))
              : 0}
          </div>
          <div className="text-xs text-slate-500">Today</div>
        </div>
      </div>

      {/* Team Attendance Details */}
      <div className="card">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-white">Team Attendance</h2>
            <span className={teamBadge}>{teamLabel}</span>
          </div>
          <span className="text-xs text-slate-500">{data?.attendance?.length || 0} records</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Staff</th>
                <th>Login</th>
                <th>Logout</th>
                <th>Hours</th>
                <th>Forms</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {data?.attendance?.map(a => (
                <tr key={a.staffId}>
                  <td className="font-semibold text-white">{a.name}</td>
                  <td className="text-slate-300">{a.checkIn ? formatTime(a.checkIn) : '--:--'}</td>
                  <td className="text-slate-300">{a.checkOut ? formatTime(a.checkOut) : '--:--'}</td>
                  <td className="font-mono text-brand-400">{a.hoursWorked.toFixed(1)}h</td>
                  <td className="font-bold text-white">{a.formsToday}</td>
                  <td>
                    {a.checkIn && !a.checkOut ? (
                      <span className="status-present"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Active</span>
                    ) : a.checkOut ? (
                      <span className="status-present"><span className="w-1.5 h-1.5 rounded-full bg-blue-400" /> Done</span>
                    ) : (
                      <span className="status-absent"><span className="w-1.5 h-1.5 rounded-full bg-red-400" /> Absent</span>
                    )}
                  </td>
                </tr>
              ))}
              {(!data?.attendance || data.attendance.length === 0) && (
                <tr><td colSpan={6} className="text-center text-slate-500">No attendance records today</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Staff Performance */}
      {data?.staffForms && data.staffForms.length > 0 && (
        <div className="card">
          <div className="px-6 py-4 border-b border-slate-800">
            <h2 className="font-semibold text-white">Staff Performance Today</h2>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Staff</th>
                  <th>Total Forms</th>
                  <th className="hidden md:table-cell">Top Campaign</th>
                </tr>
              </thead>
              <tbody>
                {data.staffForms.map((s, i) => {
                  const topCamp = Object.entries(s.campaigns).sort((a, b) => b[1] - a[1])[0]
                  return (
                    <tr key={s.name}>
                      <td className="text-slate-500">{i + 1}</td>
                      <td className="font-semibold text-white">{s.name}</td>
                      <td>
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-brand-400">{s.total}</span>
                          <div className="flex-1 hidden sm:block">
                            <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden max-w-24">
                              <div
                                className="h-full bg-brand-600 rounded-full transition-all duration-500"
                                style={{ width: `${Math.min((s.total / (data.staffForms[0]?.total || 1)) * 100, 100)}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="hidden md:table-cell text-slate-400 text-xs">
                        {topCamp ? `${topCamp[0]} (${topCamp[1]})` : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Campaign Performance */}
      {data?.campaignPerformance && data.campaignPerformance.length > 0 && (
        <div className="card">
          <div className="px-6 py-4 border-b border-slate-800">
            <h2 className="font-semibold text-white">Campaign Performance</h2>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Campaign</th>
                  <th>Total Forms</th>
                  <th>Staff Working</th>
                </tr>
              </thead>
              <tbody>
                {data.campaignPerformance.map(c => (
                  <tr key={c.name}>
                    <td className="font-semibold text-white">{c.name}</td>
                    <td className="font-bold text-brand-400">{c.totalForms}</td>
                    <td className="text-slate-300">{c.staffCount} staff</td>
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
