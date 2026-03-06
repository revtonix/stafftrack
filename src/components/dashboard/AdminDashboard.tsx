'use client'
// src/components/dashboard/AdminDashboard.tsx
import { useState, useEffect, useCallback } from 'react'
import { formatCurrency, formatTime } from '@/lib/salary'
import { getCurrentShift, getShiftLabel, getISTTimeString, getISTDateLabel } from '@/lib/shiftDay'
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
interface AttendanceEntry {
  staffId: string; name: string; team: string
  checkIn: string | null; checkOut: string | null
  hoursWorked: number; formsToday: number
  campaigns: Record<string, number>
}
interface CampaignPerf { name: string; team: string; totalForms: number; staffCount: number }
interface DashData {
  totalStaff: number; totalPresent: number; activeNow: number
  dayShiftActive: number; nightShiftActive: number
  dayStaffTotal: number; nightStaffTotal: number
  totalFormsToday: number; dayFormsToday: number; nightFormsToday: number
  attendance: AttendanceEntry[]
  staffForms: { name: string; team: string; total: number; campaigns: Record<string, number> }[]
  campaignPerformance: CampaignPerf[]
}

export default function AdminDashboard({ session }: { session: JWTPayload }) {
  const [payroll, setPayroll] = useState<StaffSummary[]>([])
  const [productivity, setProductivity] = useState<ProductivitySummary | null>(null)
  const [dashData, setDashData] = useState<DashData | null>(null)
  const [loading, setLoading] = useState(true)
  const [preset, setPreset] = useState('thisMonth')
  const [now, setNow] = useState(new Date())
  const [pendingLeaves, setPendingLeaves] = useState<any[]>([])
  const [refreshCount, setRefreshCount] = useState(0)
  const [activeTab, setActiveTab] = useState<'overview' | 'attendance' | 'productivity' | 'payroll'>('overview')

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
      const [prRes, pdRes, lvRes, dashRes] = await Promise.all([
        fetch(`/api/reports/payroll?preset=${preset}`),
        fetch(`/api/reports/productivity?preset=${preset}`),
        fetch('/api/leaves'),
        fetch('/api/dashboard'),
      ])
      const [pr, pd, lv, dash] = await Promise.all([prRes.json(), pdRes.json(), lvRes.json(), dashRes.json()])
      if (pr.success) setPayroll(pr.data)
      if (pd.success) setProductivity(pd.data)
      if (lv.success) setPendingLeaves(lv.data.filter((l: any) => l.status === 'PENDING'))
      if (dash.success) setDashData(dash.data)
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

  function exportCsv(type: 'payroll' | 'productivity') {
    window.open(`/api/reports/${type}?preset=${preset}&export=csv`, '_blank')
  }

  const presetLabels: Record<string, string> = {
    today: 'Today', '7days': 'Last 7 Days', '30days': 'Last 30 Days',
    thisMonth: 'This Month', '6months': 'Last 6 Months',
  }

  const shiftType = getCurrentShift(now)
  const shiftLabel = getShiftLabel(now)
  const istTime = getISTTimeString(now)

  const tabs = [
    { key: 'overview' as const, label: 'Overview' },
    { key: 'attendance' as const, label: 'Attendance' },
    { key: 'productivity' as const, label: 'Productivity' },
    { key: 'payroll' as const, label: 'Payroll' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
            <span className="badge-red text-[10px] uppercase tracking-wider">Administrator</span>
          </div>
          <p className="text-slate-500 text-sm">
            <span className={shiftType === 'MORNING' ? 'text-yellow-400' : 'text-purple-400'}>{shiftLabel}</span>
            {' '}&middot; {getISTDateLabel(now)} &middot; Live data refreshes every 10s
          </p>
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
            <span className={`w-1.5 h-1.5 rounded-full ${shiftType === 'MORNING' ? 'bg-yellow-400' : 'bg-purple-400'}`} />
            <span className="tabular-nums font-mono text-white">{istTime}</span>
            <span className="text-slate-600">IST</span>
          </div>
        </div>
      </div>

      {/* Live Active Staff Counter */}
      <div className="card-glow p-6">
        <div className="flex items-center gap-3 mb-4">
          <span className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse-soft" />
          <h2 className="font-semibold text-white text-lg">Live Active Staff</h2>
          <div className="ml-auto flex items-center gap-2">
            <span className="live-dot" />
            <span className="text-xs font-semibold text-emerald-400">LIVE</span>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="text-center">
            <div className="text-4xl font-bold text-white">{dashData?.activeNow || 0}</div>
            <div className="text-xs text-slate-500 mt-1">Active Now</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-yellow-400">{dashData?.dayShiftActive || 0}</div>
            <div className="text-xs text-slate-500 mt-1">Day Shift</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-purple-400">{dashData?.nightShiftActive || 0}</div>
            <div className="text-xs text-slate-500 mt-1">Night Shift</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-emerald-400">{dashData?.totalPresent || 0}</div>
            <div className="text-xs text-slate-500 mt-1">Checked In Today</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-slate-400">{dashData?.totalStaff || 0}</div>
            <div className="text-xs text-slate-500 mt-1">Total Staff</div>
          </div>
        </div>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card stat-card-glow">
          <div className="text-xs text-slate-500 uppercase tracking-wide">Total Forms Today</div>
          <div className="text-3xl font-bold text-brand-400">{dashData?.totalFormsToday || 0}</div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-yellow-400">Day: {dashData?.dayFormsToday || 0}</span>
            <span className="text-slate-600">&middot;</span>
            <span className="text-xs text-purple-400">Night: {dashData?.nightFormsToday || 0}</span>
          </div>
        </div>
        <div className="stat-card stat-card-glow">
          <div className="text-xs text-slate-500 uppercase tracking-wide">Total Payroll</div>
          <div className="text-3xl font-bold text-emerald-400">{formatCurrency(totalPayroll)}</div>
          <div className="text-xs text-slate-500">{presetLabels[preset]}</div>
        </div>
        <div className="stat-card stat-card-glow">
          <div className="text-xs text-slate-500 uppercase tracking-wide">Pending Leaves</div>
          <div className="text-3xl font-bold text-yellow-400">{pendingLeaves.length}</div>
          <div className="text-xs text-slate-500">Needs review</div>
        </div>
        <div className="stat-card stat-card-glow">
          <div className="text-xs text-slate-500 uppercase tracking-wide">Campaigns Active</div>
          <div className="text-3xl font-bold text-white">{dashData?.campaignPerformance?.length || 0}</div>
          <div className="text-xs text-slate-500">Today</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-slate-800/50 p-1 rounded-xl border border-slate-700/50">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeTab === tab.key
                ? 'bg-brand-600 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Pending Approvals */}
      {pendingLeaves.length > 0 && activeTab === 'overview' && (
        <div className="card-glow">
          <div className="px-6 py-4 border-b border-slate-800/80 flex items-center justify-between">
            <h2 className="font-semibold text-white">Pending Leave Approvals</h2>
            <span className="bg-yellow-500/15 text-yellow-400 border border-yellow-500/20 px-3 py-1 rounded-full text-xs font-bold">
              {pendingLeaves.length} pending
            </span>
          </div>
          <div className="p-4 space-y-3">
            {pendingLeaves.map((leave: any) => (
              <div key={leave.id} className="flex items-center justify-between bg-slate-800/40 rounded-xl px-4 py-3 border border-slate-700/40">
                <div>
                  <div className="font-semibold text-white text-sm">{leave.staff?.username || 'Staff'}</div>
                  <div className="text-xs text-slate-500">
                    {new Date(leave.dateFrom).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} - {new Date(leave.dateTo).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    <span className="mx-2 text-slate-600">&middot;</span>
                    {leave.type === 'PAID' ? 'Paid' : 'Unpaid'}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => handleLeaveDecision(leave.id, 'APPROVED')} className="btn-success btn-sm">Approve</button>
                  <button onClick={() => handleLeaveDecision(leave.id, 'REJECTED')} className="btn-danger btn-sm">Reject</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Overview Tab - Campaign Performance */}
      {activeTab === 'overview' && dashData?.campaignPerformance && dashData.campaignPerformance.length > 0 && (
        <div className="card">
          <div className="px-6 py-4 border-b border-slate-800/80">
            <h2 className="font-semibold text-white">Campaign Performance Today</h2>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Campaign</th>
                  <th>Team</th>
                  <th>Total Forms</th>
                  <th>Staff Working</th>
                </tr>
              </thead>
              <tbody>
                {dashData.campaignPerformance.map(c => (
                  <tr key={c.name}>
                    <td className="font-semibold text-white">{c.name}</td>
                    <td><span className={c.team === 'DAY' ? 'badge-yellow' : 'badge-purple'}>{c.team}</span></td>
                    <td className="font-bold text-brand-400">{c.totalForms}</td>
                    <td className="text-slate-300">{c.staffCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Attendance Tab */}
      {activeTab === 'attendance' && (
        <div className="card">
          <div className="px-6 py-4 border-b border-slate-800/80 flex items-center justify-between">
            <h2 className="font-semibold text-white">Today's Attendance — All Staff</h2>
            <span className="text-xs text-slate-500">{dashData?.attendance?.length || 0} records</span>
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
                    <th>Login</th>
                    <th>Logout</th>
                    <th>Hours</th>
                    <th>Forms</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {dashData?.attendance?.map(a => (
                    <tr key={a.staffId}>
                      <td className="font-semibold text-white">{a.name}</td>
                      <td><span className={a.team === 'DAY' ? 'badge-yellow' : 'badge-purple'}>{a.team}</span></td>
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
                  {(!dashData?.attendance || dashData.attendance.length === 0) && (
                    <tr><td colSpan={7} className="text-center text-slate-500">No attendance records today</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Productivity Tab */}
      {activeTab === 'productivity' && (
        <>
          {productivity && (
            <div className="card">
              <div className="px-6 py-4 border-b border-slate-800/80 flex items-center justify-between">
                <h2 className="font-semibold text-white">Productivity by Staff</h2>
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

          {/* Campaign breakdown */}
          {productivity?.campTotals && Object.keys(productivity.campTotals).length > 0 && (
            <div className="card">
              <div className="px-6 py-4 border-b border-slate-800/80">
                <h2 className="font-semibold text-white">Campaign Breakdown</h2>
              </div>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Campaign</th><th>Total Forms</th></tr></thead>
                  <tbody>
                    {Object.entries(productivity.campTotals).sort((a, b) => b[1] - a[1]).map(([name, total]) => (
                      <tr key={name}>
                        <td className="font-semibold text-white">{name}</td>
                        <td className="font-bold text-brand-400">{total}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Payroll Tab */}
      {activeTab === 'payroll' && (
        <div className="card">
          <div className="px-6 py-4 border-b border-slate-800/80 flex items-center justify-between">
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
      )}
    </div>
  )
}
