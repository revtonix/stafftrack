'use client'
// src/components/dashboard/AdminDashboard.tsx
// ─────────────────────────────────────────────────────────────────────────────
// CHANGES vs previous version:
//   1. Added approval counters to top stat cards
//   2. Added <PendingApprovals> section above Productivity table
//   3. Everything else unchanged
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef, useMemo } from 'react'
import { formatCurrency }    from '@/lib/salary'
import type { JWTPayload }   from '@/lib/auth'
import PendingApprovals      from '@/components/dashboard/PendingApprovals'
import { SalaryPrivacyProvider } from '@/components/ui/SalaryPrivacyProvider'
import { ProtectedSalary, SalaryRevealBar, SalaryUnlockButton } from '@/components/ui/ProtectedSalary'

interface StaffSummary {
  id: string; name: string; team: string;
  presentDays: number; totalSalary: number; baseSalary: number; extraDays: number; extraPay: number
}
interface ProductivitySummary {
  staffTotals: { name: string; total: number; campaigns: Record<string, number> }[]
  campTotals: Record<string, number>
  totalForms: number
}
interface LiveSalaryRow {
  id: string; name: string; team: string
  hoursToday: number; hourlyRate: number; todaySalary: number; totalSalary: number
}

function getShiftDayRange() {
  const TZ = 'Asia/Kolkata', CUT = 7
  const parts = new Intl.DateTimeFormat('en-IN', {
    timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(new Date())
  const g = (t: string) => parseInt(parts.find(p => p.type === t)!.value)
  const h = g('hour'), y = g('year'), mo = g('month'), d = g('day')
  const sd = new Date(Date.UTC(y, mo - 1, h < CUT ? d - 1 : d))
  const pad = (n: number) => String(n).padStart(2, '0')
  const sy = sd.getUTCFullYear(), sm = sd.getUTCMonth() + 1, sdd = sd.getUTCDate()
  const startISO = new Date(`${sy}-${pad(sm)}-${pad(sdd)}T${pad(CUT)}:00:00+05:30`).toISOString()
  const endISO   = new Date(new Date(startISO).getTime() + (23*3600+59*60+59)*1000).toISOString()
  return { startISO, endISO }
}

export default function AdminDashboard({ session }: { session: JWTPayload }) {
  return (
    <SalaryPrivacyProvider>
      <AdminDashboardInner session={session} />
    </SalaryPrivacyProvider>
  )
}

function AdminDashboardInner({ session }: { session: JWTPayload }) {
  const [payroll,     setPayroll]     = useState<StaffSummary[]>([])
  const [productivity, setProductivity] = useState<ProductivitySummary | null>(null)
  const [loading,     setLoading]     = useState(true)
  const [preset,      setPreset]      = useState('thisMonth')

  // Live salary state
  const [liveRows,    setLiveRows]    = useState<LiveSalaryRow[]>([])
  const [liveLoading, setLiveLoading] = useState(true)
  const [syncAgo,     setSyncAgo]     = useState(0)
  const prevTotal = useRef(0)

  // Approval counters
  const [approvalCounts, setApprovalCounts] = useState({ pending: 0, approved: 0, rejected: 0 })

  // Fetch approval counts
  useEffect(() => {
    async function fetchCounts() {
      try {
        const res  = await fetch('/api/attendance?pending=1')
        const data = await res.json()
        const rows = data.data ?? data.records ?? []
        setApprovalCounts(prev => ({ ...prev, pending: rows.length }))
      } catch {}
    }
    fetchCounts()
    const t = setInterval(fetchCounts, 30_000)
    return () => clearInterval(t)
  }, [])

  // Existing fetch
  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      const [prRes, pdRes] = await Promise.all([
        fetch(`/api/reports/payroll?preset=${preset}`),
        fetch(`/api/reports/productivity?preset=${preset}`),
      ])
      const [pr, pd] = await Promise.all([prRes.json(), pdRes.json()])
      if (pr.success) setPayroll(pr.data)
      if (pd.success) setProductivity(pd.data)
      setLoading(false)
    }
    fetchData()
  }, [preset])

  // Live salary fetch (10s poll)
  useEffect(() => {
    async function fetchLive() {
      try {
        const { startISO, endISO } = getShiftDayRange()
        const params = new URLSearchParams({ from: startISO, to: endISO, preset: 'today' })
        const [todayRes, totalRes] = await Promise.all([
          fetch(`/api/reports/payroll?${params}`),
          fetch(`/api/reports/payroll?preset=thisMonth`),
        ])
        const [todayJson, totalJson] = await Promise.all([todayRes.json(), totalRes.json()])
        const todayData: any[] = todayJson.data ?? todayJson.report ?? []
        const totalData: any[] = totalJson.data ?? totalJson.report ?? []
        const totalMap = new Map<string, number>()
        for (const t of totalData) totalMap.set(t.id ?? t.name, t.totalSalary ?? t.total ?? 0)
        const rows: LiveSalaryRow[] = todayData.map((r: any) => {
          const hourlyRate  = r.hourlyRate  ?? 0
          const hoursToday  = r.partialHours ?? r.hoursToday ?? 0
          const todaySalary = r.partialPay   ?? r.todaySalary ?? Math.round(hourlyRate * hoursToday)
          const key         = r.id ?? r.name
          return { id: key, name: r.name ?? '—', team: r.team ?? 'DAY', hoursToday, hourlyRate, todaySalary, totalSalary: totalMap.get(key) ?? todaySalary }
        })
        setLiveRows(rows)
        prevTotal.current = rows.reduce((s, r) => s + r.todaySalary, 0)
        setSyncAgo(0)
      } catch {}
      setLiveLoading(false)
    }
    fetchLive()
    const poll = setInterval(fetchLive, 10_000)
    const tick = setInterval(() => setSyncAgo(s => s + 1), 1000)
    return () => { clearInterval(poll); clearInterval(tick) }
  }, [])

  const { todayTotal, grandTotal } = useMemo(() => ({
    todayTotal: liveRows.reduce((s, r) => s + r.todaySalary, 0),
    grandTotal: liveRows.reduce((s, r) => s + r.totalSalary, 0),
  }), [liveRows])

  const syncLabel = syncAgo < 5 ? 'just now' : syncAgo < 60 ? `${syncAgo}s ago` : `${Math.floor(syncAgo/60)}m ago`
  const totalPayroll = payroll.reduce((a, s) => a + s.totalSalary, 0)
  const totalPresent = payroll.reduce((a, s) => a + s.presentDays, 0)

  function exportCsv(type: 'payroll' | 'productivity') {
    window.open(`/api/reports/${type}?preset=${preset}&export=csv`, '_blank')
  }

  const presetLabels: Record<string, string> = {
    today: 'Today', '7days': 'Last 7 Days', '30days': 'Last 30 Days',
    thisMonth: 'This Month', '6months': 'Last 6 Months',
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
          <p className="text-slate-400 text-sm mt-1">Complete overview of staff performance & payroll</p>
        </div>
        <select className="input w-auto text-sm" value={preset} onChange={e => setPreset(e.target.value)}>
          {Object.entries(presetLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>

      {/* Top stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="text-xs text-slate-500 uppercase tracking-wide">Total Staff</div>
          <div className="text-3xl font-bold text-white">{payroll.length}</div>
          <div className="text-xs text-slate-500">Active members</div>
        </div>
        <div className="stat-card">
          <div className="text-xs text-slate-500 uppercase tracking-wide">Total Forms</div>
          <div className="text-3xl font-bold text-brand-400">{productivity?.totalForms || 0}</div>
          <div className="text-xs text-slate-500">{presetLabels[preset]}</div>
        </div>
        <div className="stat-card">
          <div className="text-xs text-slate-500 uppercase tracking-wide">Attendance Days</div>
          <div className="text-3xl font-bold text-emerald-400">{totalPresent}</div>
          <div className="text-xs text-slate-500">Total across staff</div>
        </div>
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div className="text-xs text-slate-500 uppercase tracking-wide">Total Payroll</div>
            <SalaryUnlockButton className="!px-2 !py-1 !text-[10px]" />
          </div>
          <div className="text-2xl font-bold text-yellow-400"><ProtectedSalary value={totalPayroll} size="lg" className="font-bold text-yellow-400" /></div>
          <div className="text-xs text-slate-500">{presetLabels[preset]}</div>
        </div>
      </div>

      {/* ── NEW: Approval counters ─────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-4">
        <div className="stat-card border-yellow-500/20">
          <div className="text-xs text-slate-500 uppercase tracking-wide">Pending Approvals</div>
          <div className="text-3xl font-bold text-yellow-400">{approvalCounts.pending}</div>
          <div className="text-xs text-slate-500">Awaiting review</div>
        </div>
        <div className="stat-card border-emerald-500/20">
          <div className="text-xs text-slate-500 uppercase tracking-wide">Approved Today</div>
          <div className="text-3xl font-bold text-emerald-400">{approvalCounts.approved}</div>
          <div className="text-xs text-slate-500">This shift day</div>
        </div>
        <div className="stat-card border-red-500/20">
          <div className="text-xs text-slate-500 uppercase tracking-wide">Rejected</div>
          <div className="text-3xl font-bold text-red-400">{approvalCounts.rejected}</div>
          <div className="text-xs text-slate-500">This shift day</div>
        </div>
      </div>

      {/* ── NEW: Pending Approvals table ──────────────────────────────── */}
      <PendingApprovals role={session.role} />

      {/* Live Salary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="stat-card relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs text-slate-500 uppercase tracking-wide">Today's Earnings</div>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse" />
              <span className="text-[10px] text-slate-500">Live · {syncLabel}</span>
            </div>
          </div>
          {liveLoading ? <div className="h-8 w-32 bg-slate-800 rounded animate-pulse mb-1" /> : (
            <div className="text-2xl font-bold text-brand-400"><ProtectedSalary value={todayTotal} size="lg" className="font-bold text-brand-400" /></div>
          )}
          <div className="text-xs text-slate-500 mt-1">Based on hours worked today</div>
        </div>
        <div className="stat-card relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs text-slate-500 uppercase tracking-wide">Total Salary Till Now</div>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] text-slate-500">Live · {syncLabel}</span>
            </div>
          </div>
          {liveLoading ? <div className="h-8 w-32 bg-slate-800 rounded animate-pulse mb-1" /> : (
            <div className="text-2xl font-bold text-yellow-400"><ProtectedSalary value={grandTotal} size="lg" className="font-bold text-yellow-400" /></div>
          )}
          <div className="text-xs text-slate-500 mt-1">All time earnings</div>
        </div>
      </div>

      {/* Live Staff Salary Table */}
      <div className="card">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <h2 className="font-semibold text-white">Live Salary by Staff</h2>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-slate-500">Auto-refresh 10s</span>
          </div>
        </div>
        {liveLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Staff</th><th>Team</th><th>Hours Today</th>
                  <th>Hourly Rate</th><th>Today Salary</th><th>Total Salary</th>
                </tr>
              </thead>
              <tbody>
                {liveRows.length === 0 ? (
                  <tr><td colSpan={6} className="text-center text-slate-600 py-8">No data for today's shift</td></tr>
                ) : liveRows.map(r => (
                  <tr key={r.id}>
                    <td className="font-semibold text-white">{r.name}</td>
                    <td><span className={r.team === 'DAY' ? 'badge-yellow' : 'badge-purple'}>{r.team}</span></td>
                    <td className="text-slate-300">{r.hoursToday > 0 ? `${r.hoursToday}h` : '—'}</td>
                    <td className="text-slate-400 text-xs">{r.hourlyRate > 0 ? <><ProtectedSalary value={r.hourlyRate} size="sm" className="text-slate-400" />/hr</> : '—'}</td>
                    <td className="font-bold text-brand-400">{r.todaySalary > 0 ? <ProtectedSalary value={r.todaySalary} size="sm" className="font-bold text-brand-400" /> : '—'}</td>
                    <td className="font-bold text-yellow-400">{r.totalSalary > 0 ? <ProtectedSalary value={r.totalSalary} size="sm" className="font-bold text-yellow-400" /> : '—'}</td>
                  </tr>
                ))}
                {liveRows.length > 0 && (
                  <tr className="bg-slate-800/50">
                    <td colSpan={4} className="font-bold text-slate-300">Total</td>
                    <td className="font-bold text-brand-400"><ProtectedSalary value={todayTotal} size="sm" className="font-bold text-brand-400" /></td>
                    <td className="font-bold text-yellow-400"><ProtectedSalary value={grandTotal} size="sm" className="font-bold text-yellow-400" /></td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Productivity Summary (unchanged) */}
      {productivity && (
        <div className="card">
          <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
            <h2 className="font-semibold text-white">Productivity by Staff</h2>
            <button onClick={() => exportCsv('productivity')} className="btn-secondary btn-sm">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
              Export CSV
            </button>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>#</th><th>Staff</th><th>Total Forms</th><th className="hidden md:table-cell">Top Campaign</th></tr></thead>
              <tbody>
                {productivity.staffTotals.map((s, i) => {
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
                              <div className="h-full bg-brand-600 rounded-full"
                                style={{ width: `${Math.min((s.total / (productivity.staffTotals[0]?.total || 1)) * 100, 100)}%` }} />
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="hidden md:table-cell text-slate-400 text-xs">{topCamp ? `${topCamp[0]} (${topCamp[1]})` : '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Payroll Table (unchanged) */}
      <div className="card">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <h2 className="font-semibold text-white">Payroll Summary</h2>
          <button onClick={() => exportCsv('payroll')} className="btn-secondary btn-sm">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
            Export CSV
          </button>
        </div>
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Staff</th><th>Team</th><th>Present</th><th>Extra Days</th><th>Base Salary</th><th>Extra Pay</th><th>Total</th></tr></thead>
              <tbody>
                {payroll.map(s => (
                  <tr key={s.id}>
                    <td className="font-semibold text-white">{s.name}</td>
                    <td><span className={s.team === 'DAY' ? 'badge-yellow' : 'badge-purple'}>{s.team}</span></td>
                    <td>{s.presentDays}</td>
                    <td className="text-yellow-400">{s.extraDays > 0 ? `+${s.extraDays}` : '—'}</td>
                    <td><ProtectedSalary value={s.baseSalary} size="sm" className="text-white" /></td>
                    <td className="text-emerald-400">{s.extraPay > 0 ? <ProtectedSalary value={s.extraPay} size="sm" className="text-emerald-400" /> : '—'}</td>
                    <td className="font-bold text-white"><ProtectedSalary value={s.totalSalary} size="sm" className="font-bold text-white" /></td>
                  </tr>
                ))}
                <tr className="bg-slate-800/50">
                  <td colSpan={4} className="font-bold text-slate-300">Total</td>
                  <td className="font-bold"><ProtectedSalary value={payroll.reduce((a,s) => a + s.baseSalary, 0)} size="sm" className="font-bold text-white" /></td>
                  <td className="font-bold text-emerald-400"><ProtectedSalary value={payroll.reduce((a,s) => a + s.extraPay, 0)} size="sm" className="font-bold text-emerald-400" /></td>
                  <td className="font-bold text-yellow-400"><ProtectedSalary value={totalPayroll} size="sm" className="font-bold text-yellow-400" /></td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
      <SalaryRevealBar />
    </div>
  )
}
