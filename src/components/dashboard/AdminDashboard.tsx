'use client'
// src/components/dashboard/AdminDashboard.tsx
import { useState, useEffect, useCallback } from 'react'
import { formatCurrency } from '@/lib/salary'
import type { JWTPayload } from '@/lib/auth'

interface StaffSummary {
  id: string; name: string; team: string;
  presentDays: number; totalSalary: number; baseSalary: number; extraDays: number; extraPay: number; monthlySalary: number
}
interface ProductivitySummary {
  staffTotals: { name: string; total: number; campaigns: Record<string, number> }[]
  campTotals: Record<string, number>
  totalForms: number
}
interface PendingAttendance {
  id: string; staffId: string; date: string; checkIn: string | null; checkOut: string | null;
  staff?: { username: string; profile?: { team: string } }
}
interface LiveStaffEntry {
  name: string; team: string; hoursToday: number; hourlyRate: number; todayEarnings: number; status: 'PRESENT' | 'ABSENT' | 'PENDING_APPROVAL'
}

export default function AdminDashboard({ session }: { session: JWTPayload }) {
  const [payroll, setPayroll] = useState<StaffSummary[]>([])
  const [productivity, setProductivity] = useState<ProductivitySummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [preset, setPreset] = useState('thisMonth')
  const [now, setNow] = useState(new Date())
  const [pendingLeaves, setPendingLeaves] = useState<any[]>([])
  const [liveData, setLiveData] = useState<LiveStaffEntry[]>([])
  const [refreshCount, setRefreshCount] = useState(0)

  // Live clock
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  // Auto refresh every 10s
  useEffect(() => {
    const t = setInterval(() => setRefreshCount(c => c + 1), 10000)
    return () => clearInterval(t)
  }, [])

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [prRes, pdRes, lvRes] = await Promise.all([
        fetch(`/api/reports/payroll?preset=${preset}`),
        fetch(`/api/reports/productivity?preset=${preset}`),
        fetch('/api/leaves'),
      ])
      const [pr, pd, lv] = await Promise.all([prRes.json(), pdRes.json(), lvRes.json()])
      if (pr.success) {
        setPayroll(pr.data)
        // Build live salary data from payroll
        const live: LiveStaffEntry[] = pr.data.map((s: StaffSummary) => {
          const staffProd = pd.success ? pd.data.staffTotals?.find((st: any) => st.name === s.name) : null
          const hoursToday = staffProd ? Math.min(staffProd.total / 10, 12) : 0
          const hourlyRate = s.monthlySalary ? Math.round(s.monthlySalary / 26 / 9) : 0
          return {
            name: s.name,
            team: s.team,
            hoursToday: Math.round(hoursToday * 10) / 10,
            hourlyRate,
            todayEarnings: Math.round(hoursToday * hourlyRate),
            status: s.presentDays > 0 ? 'PRESENT' as const : 'ABSENT' as const,
          }
        })
        setLiveData(live)
      }
      if (pd.success) setProductivity(pd.data)
      if (lv.success) setPendingLeaves(lv.data.filter((l: any) => l.status === 'PENDING'))
    } catch {}
    setLoading(false)
  }, [preset])

  useEffect(() => { fetchData() }, [fetchData, refreshCount])

  async function handleLeaveDecision(id: string, status: 'APPROVED' | 'REJECTED') {
    const res = await fetch(`/api/leaves/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    const d = await res.json()
    if (d.success) fetchData()
  }

  const totalPayroll = payroll.reduce((a, s) => a + s.totalSalary, 0)
  const totalPresent = payroll.filter(s => s.presentDays > 0).length
  const liveSalaryToday = liveData.reduce((a, s) => a + s.todayEarnings, 0)
  const approvedToday = payroll.filter(s => s.presentDays > 0).length

  function exportCsv(type: 'payroll' | 'productivity') {
    window.open(`/api/reports/${type}?preset=${preset}&export=csv`, '_blank')
  }

  const presetLabels: Record<string, string> = {
    today: 'Today', '7days': 'Last 7 Days', '30days': 'Last 30 Days',
    thisMonth: 'This Month', '6months': 'Last 6 Months',
  }

  const shiftInfo = `Shift: ${now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' })} IST`

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
            <span className="badge-red text-[10px] uppercase tracking-wider">Administrator</span>
          </div>
          <p className="text-slate-500 text-sm">{shiftInfo} &middot; Live data refreshes every 10s</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            className="input w-auto text-sm"
            value={preset}
            onChange={e => setPreset(e.target.value)}
          >
            {Object.entries(presetLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-800/60 px-3 py-2 rounded-xl border border-slate-700/50">
            <span className="tabular-nums font-mono text-white">
              {now.toLocaleTimeString('en-IN', { hour12: false })}
            </span>
          </div>
        </div>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card stat-card-glow">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">👥</span>
            <span className="text-xs text-slate-500 uppercase tracking-wide">Present Today</span>
          </div>
          <div className="text-3xl font-bold text-white">{totalPresent}/{payroll.length}</div>
          <div className="text-xs text-slate-500">Active staff</div>
        </div>
        <div className="stat-card stat-card-glow">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">💰</span>
            <span className="text-xs text-slate-500 uppercase tracking-wide">Live Salary Today</span>
          </div>
          <div className="text-3xl font-bold text-emerald-400">{formatCurrency(liveSalaryToday)}</div>
          <div className="text-xs text-slate-500">Auto-refresh 10s</div>
        </div>
        <div className="stat-card stat-card-glow">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">⏳</span>
            <span className="text-xs text-slate-500 uppercase tracking-wide">Pending Approvals</span>
          </div>
          <div className="text-3xl font-bold text-yellow-400">{pendingLeaves.length}</div>
          <div className="text-xs text-slate-500">Needs review</div>
        </div>
        <div className="stat-card stat-card-glow">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">✅</span>
            <span className="text-xs text-slate-500 uppercase tracking-wide">Approved Today</span>
          </div>
          <div className="text-3xl font-bold text-white">{approvedToday}</div>
          <div className="text-xs text-slate-500">This shift</div>
        </div>
      </div>

      {/* Pending Approvals */}
      {pendingLeaves.length > 0 && (
        <div className="card-glow">
          <div className="px-6 py-4 border-b border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-base">⏳</span>
              <h2 className="font-semibold text-white">Pending Approvals</h2>
            </div>
            <span className="bg-yellow-500/15 text-yellow-400 border border-yellow-500/20 px-3 py-1 rounded-full text-xs font-bold">
              {pendingLeaves.length} pending
            </span>
          </div>
          <div className="p-4 space-y-3">
            {pendingLeaves.map((leave: any) => (
              <div key={leave.id} className="flex items-center justify-between bg-slate-800/40 rounded-xl px-4 py-3 border border-slate-700/40">
                <div className="flex items-center gap-4">
                  <div>
                    <div className="font-semibold text-white text-sm">{leave.staff?.username || 'Staff'}</div>
                    <div className="text-xs text-slate-500">
                      {new Date(leave.dateFrom).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} - {new Date(leave.dateTo).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      <span className="mx-2 text-slate-600">&middot;</span>
                      {leave.type === 'PAID' ? 'Paid' : 'Unpaid'}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => handleLeaveDecision(leave.id, 'APPROVED')} className="btn-success btn-sm">
                    ✓ Approve
                  </button>
                  <button onClick={() => handleLeaveDecision(leave.id, 'REJECTED')} className="btn-danger btn-sm">
                    ✗ Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Live Salary Monitor */}
      <div className="card">
        <div className="px-6 py-4 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-base">💰</span>
            <h2 className="font-semibold text-white">Live Salary Monitor</h2>
          </div>
          <div className="flex items-center gap-2 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20">
            <span className="live-dot" />
            <span className="text-xs font-semibold text-emerald-400">LIVE &middot; 10s</span>
          </div>
        </div>
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Staff</th>
                  <th>Team</th>
                  <th>Hours Today</th>
                  <th>Hourly Rate</th>
                  <th>Today Earnings</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {liveData.map(s => (
                  <tr key={s.name}>
                    <td className="font-semibold text-white">{s.name}</td>
                    <td>
                      <span className={s.team === 'DAY' ? 'badge-yellow' : 'badge-purple'}>
                        {s.team}
                      </span>
                    </td>
                    <td className="font-mono text-slate-300">{s.hoursToday}h</td>
                    <td className="text-slate-400">{formatCurrency(s.hourlyRate)}/hr</td>
                    <td className="font-bold text-emerald-400">{formatCurrency(s.todayEarnings)}</td>
                    <td>
                      <span className={s.status === 'PRESENT' ? 'status-present' : s.status === 'PENDING_APPROVAL' ? 'status-pending' : 'status-absent'}>
                        <span className={`w-1.5 h-1.5 rounded-full ${s.status === 'PRESENT' ? 'bg-emerald-400' : s.status === 'PENDING_APPROVAL' ? 'bg-yellow-400' : 'bg-red-400'}`} />
                        {s.status.replace('_', ' ')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Productivity Summary */}
      {productivity && (
        <div className="card">
          <div className="px-6 py-4 border-b border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-base">⚡</span>
              <h2 className="font-semibold text-white">Productivity by Staff</h2>
            </div>
            <button onClick={() => exportCsv('productivity')} className="btn-secondary btn-sm">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
              Export CSV
            </button>
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
                              <div
                                className="h-full bg-brand-600 rounded-full transition-all duration-500"
                                style={{ width: `${Math.min((s.total / (productivity.staffTotals[0]?.total || 1)) * 100, 100)}%` }}
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

      {/* Payroll Table */}
      <div className="card">
        <div className="px-6 py-4 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-base">📊</span>
            <h2 className="font-semibold text-white">Payroll Summary</h2>
          </div>
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
              <thead>
                <tr>
                  <th>Staff</th>
                  <th>Team</th>
                  <th>Present</th>
                  <th>Extra Days</th>
                  <th>Base Salary</th>
                  <th>Extra Pay</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {payroll.map(s => (
                  <tr key={s.id}>
                    <td className="font-semibold text-white">{s.name}</td>
                    <td>
                      <span className={s.team === 'DAY' ? 'badge-yellow' : 'badge-purple'}>
                        {s.team}
                      </span>
                    </td>
                    <td>{s.presentDays}</td>
                    <td className="text-yellow-400">{s.extraDays > 0 ? `+${s.extraDays}` : '—'}</td>
                    <td>{formatCurrency(s.baseSalary)}</td>
                    <td className="text-emerald-400">{s.extraPay > 0 ? formatCurrency(s.extraPay) : '—'}</td>
                    <td className="font-bold text-white">{formatCurrency(s.totalSalary)}</td>
                  </tr>
                ))}
                <tr className="bg-slate-800/30">
                  <td colSpan={4} className="font-bold text-slate-300">Total</td>
                  <td className="font-bold">{formatCurrency(payroll.reduce((a,s) => a + s.baseSalary, 0))}</td>
                  <td className="font-bold text-emerald-400">{formatCurrency(payroll.reduce((a,s) => a + s.extraPay, 0))}</td>
                  <td className="font-bold text-yellow-400">{formatCurrency(totalPayroll)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
