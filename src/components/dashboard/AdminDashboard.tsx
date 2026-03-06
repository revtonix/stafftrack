'use client'
// src/components/dashboard/AdminDashboard.tsx
import { useState, useEffect, useCallback, useRef } from 'react'
import { formatCurrency, formatTime } from '@/lib/salary'
import { getCurrentShift, getShiftLabel, getISTTimeString, getISTDateLabel, getISTHour } from '@/lib/shiftDay'
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
interface CampaignPerf { name: string; team: string; totalForms: number; staffCount: number; formsPerHour: number }
interface ActivityEvent {
  id: string; time: string; staffName: string; team: string; event: string; detail?: string
}
interface HourlyData { hour: number; dayForms: number; nightForms: number }
interface IdleStaff { name: string; team: string; idleMinutes: number }
interface ProductivityScore { name: string; team: string; score: number; formsPerHour: number; activeHours: number; totalForms: number }
interface SmartAlert { type: 'warning' | 'danger' | 'info'; message: string }
interface DashData {
  totalStaff: number; totalPresent: number; activeNow: number
  dayShiftActive: number; nightShiftActive: number
  dayStaffTotal: number; nightStaffTotal: number
  totalFormsToday: number; dayFormsToday: number; nightFormsToday: number
  attendance: AttendanceEntry[]
  staffForms: { name: string; team: string; total: number; campaigns: Record<string, number> }[]
  campaignPerformance: CampaignPerf[]
  activityTimeline?: ActivityEvent[]
  hourlyFormsByTeam?: HourlyData[]
  idleStaff?: IdleStaff[]
  productivityScores?: ProductivityScore[]
  alerts?: SmartAlert[]
}

// Animated counter component
function AnimatedNumber({ value, duration = 800 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0)
  const prevRef = useRef(0)
  useEffect(() => {
    const start = prevRef.current
    const diff = value - start
    if (diff === 0) return
    const startTime = performance.now()
    function animate(currentTime: number) {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3) // ease-out cubic
      setDisplay(Math.round(start + diff * eased))
      if (progress < 1) requestAnimationFrame(animate)
      else prevRef.current = value
    }
    requestAnimationFrame(animate)
  }, [value, duration])
  return <>{display}</>
}

// Mini line graph (SVG-based, no dependencies)
function MiniLineGraph({ data, className = '' }: { data: HourlyData[]; className?: string }) {
  if (!data || data.length === 0) return null
  const maxVal = Math.max(...data.map(d => Math.max(d.dayForms, d.nightForms)), 1)
  const w = 100
  const h = 40
  const points = (key: 'dayForms' | 'nightForms') =>
    data.map((d, i) => `${(i / (data.length - 1)) * w},${h - (d[key] / maxVal) * (h - 4)}`).join(' ')
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={`w-full h-full ${className}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id="dayGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgb(250,204,21)" stopOpacity="0.3" />
          <stop offset="100%" stopColor="rgb(250,204,21)" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="nightGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgb(192,132,252)" stopOpacity="0.3" />
          <stop offset="100%" stopColor="rgb(192,132,252)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Day team area */}
      <polygon
        points={`0,${h} ${points('dayForms')} ${w},${h}`}
        fill="url(#dayGrad)"
      />
      <polyline points={points('dayForms')} fill="none" stroke="rgb(250,204,21)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* Night team area */}
      <polygon
        points={`0,${h} ${points('nightForms')} ${w},${h}`}
        fill="url(#nightGrad)"
      />
      <polyline points={points('nightForms')} fill="none" stroke="rgb(192,132,252)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
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
  const [activeTab, setActiveTab] = useState<'overview' | 'attendance' | 'performance' | 'staffSalary'>('overview')
  const [alertsDismissed, setAlertsDismissed] = useState<Set<string>>(new Set())

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
  const istHour = getISTHour(now)

  // Office status
  const isDay = shiftType === 'MORNING'
  const nightStartsIn = isDay ? (19 - istHour) : 0
  const dayStartsIn = !isDay ? ((istHour < 7 ? 7 - istHour : 24 - istHour + 7)) : 0

  // Team targets (configurable daily targets)
  const DAY_TARGET = 200
  const NIGHT_TARGET = 150
  const dayProgress = Math.min(((dashData?.dayFormsToday || 0) / DAY_TARGET) * 100, 100)
  const nightProgress = Math.min(((dashData?.nightFormsToday || 0) / NIGHT_TARGET) * 100, 100)

  // Top performers
  const topPerformers = (dashData?.staffForms || []).slice(0, 3)

  const tabs = [
    { key: 'overview' as const, label: 'Overview' },
    { key: 'attendance' as const, label: 'Attendance' },
    { key: 'performance' as const, label: 'Performance' },
    { key: 'staffSalary' as const, label: 'Staff Salary' },
  ]

  const visibleAlerts = (dashData?.alerts || []).filter(a => !alertsDismissed.has(a.message))

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
          {/* Office Status Indicator */}
          <div className="flex items-center gap-2 text-xs bg-slate-800/60 px-3 py-2 rounded-xl border border-slate-700/50">
            <span className="text-slate-500 uppercase tracking-wider text-[10px] font-semibold">Office</span>
            {isDay ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse-soft" />
                <span className="text-emerald-400 font-medium">Day Shift Active</span>
                {nightStartsIn > 0 && nightStartsIn <= 4 && (
                  <span className="text-purple-400/60 text-[10px] ml-1">Night in {nightStartsIn}h</span>
                )}
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse-soft" />
                <span className="text-purple-400 font-medium">Night Shift Active</span>
                {dayStartsIn > 0 && dayStartsIn <= 4 && (
                  <span className="text-yellow-400/60 text-[10px] ml-1">Day in {dayStartsIn}h</span>
                )}
              </>
            )}
          </div>
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

      {/* Smart Alerts System */}
      {visibleAlerts.length > 0 && (
        <div className="space-y-2 animate-slide-up">
          {visibleAlerts.map((alert, i) => (
            <div
              key={i}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${
                alert.type === 'danger'
                  ? 'bg-red-500/10 border-red-500/20 text-red-400'
                  : alert.type === 'warning'
                  ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400'
                  : 'bg-blue-500/10 border-blue-500/20 text-blue-400'
              }`}
            >
              <span className="text-lg flex-shrink-0">
                {alert.type === 'danger' ? '🔴' : alert.type === 'warning' ? '⚠' : 'ℹ'}
              </span>
              <span className="text-sm font-medium flex-1">{alert.message}</span>
              <button
                onClick={() => setAlertsDismissed(prev => new Set(prev).add(alert.message))}
                className="text-slate-600 hover:text-slate-400 text-xs"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Idle Staff Alerts */}
      {dashData?.idleStaff && dashData.idleStaff.length > 0 && (
        <div className="space-y-1.5 animate-slide-up">
          {dashData.idleStaff.map((s, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-orange-500/8 border border-orange-500/15 text-orange-400">
              <span className="text-sm">⚠</span>
              <span className="text-sm">
                <span className="font-semibold">{s.name}</span> idle for {s.idleMinutes} minutes
              </span>
              <span className={`ml-auto text-[10px] ${s.team === 'DAY' ? 'text-yellow-400/60' : 'text-purple-400/60'}`}>{s.team}</span>
            </div>
          ))}
        </div>
      )}

      {/* Live Active Staff Counter */}
      <div className="card-glow p-6 hover-card-glow">
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
            <div className="text-4xl font-bold text-white animated-counter"><AnimatedNumber value={dashData?.activeNow || 0} /></div>
            <div className="text-xs text-slate-500 mt-1">Active Now</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-yellow-400 animated-counter"><AnimatedNumber value={dashData?.dayShiftActive || 0} /></div>
            <div className="text-xs text-slate-500 mt-1">Day Shift</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-purple-400 animated-counter"><AnimatedNumber value={dashData?.nightShiftActive || 0} /></div>
            <div className="text-xs text-slate-500 mt-1">Night Shift</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-emerald-400 animated-counter"><AnimatedNumber value={dashData?.totalPresent || 0} /></div>
            <div className="text-xs text-slate-500 mt-1">Checked In Today</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-slate-400"><AnimatedNumber value={dashData?.totalStaff || 0} /></div>
            <div className="text-xs text-slate-500 mt-1">Total Staff</div>
          </div>
        </div>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card stat-card-glow hover-card-glow">
          <div className="text-xs text-slate-500 uppercase tracking-wide">Total Forms Today</div>
          <div className="text-3xl font-bold text-brand-400 live-stat"><AnimatedNumber value={dashData?.totalFormsToday || 0} /></div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-yellow-400">Day: {dashData?.dayFormsToday || 0}</span>
            <span className="text-slate-600">&middot;</span>
            <span className="text-xs text-purple-400">Night: {dashData?.nightFormsToday || 0}</span>
          </div>
        </div>
        <div className="stat-card stat-card-glow hover-card-glow">
          <div className="text-xs text-slate-500 uppercase tracking-wide">Total Payroll</div>
          <div className="text-3xl font-bold text-emerald-400">{formatCurrency(totalPayroll)}</div>
          <div className="text-xs text-slate-500">{presetLabels[preset]}</div>
        </div>
        <div className="stat-card stat-card-glow hover-card-glow">
          <div className="text-xs text-slate-500 uppercase tracking-wide">Pending Leaves</div>
          <div className="text-3xl font-bold text-yellow-400"><AnimatedNumber value={pendingLeaves.length} /></div>
          <div className="text-xs text-slate-500">Needs review</div>
        </div>
        <div className="stat-card stat-card-glow hover-card-glow">
          <div className="text-xs text-slate-500 uppercase tracking-wide">Campaigns Active</div>
          <div className="text-3xl font-bold text-white"><AnimatedNumber value={dashData?.campaignPerformance?.length || 0} /></div>
          <div className="text-xs text-slate-500">Today</div>
        </div>
      </div>

      {/* Live Performance Graph + Team Target + Top Performer (3-col grid) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 1. Live Performance Graph */}
        <div className="card hover-card-glow p-5 lg:col-span-1">
          <div className="flex items-center gap-2 mb-3">
            <span className="live-dot" />
            <h3 className="font-semibold text-white text-sm">Forms Per Hour</h3>
            <span className="text-[10px] text-emerald-400 font-semibold ml-auto uppercase">Live</span>
          </div>
          <div className="h-24 mb-3">
            <MiniLineGraph data={dashData?.hourlyFormsByTeam || []} />
          </div>
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-yellow-400 rounded-full" />
                <span className="text-slate-500">Day Team</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-purple-400 rounded-full" />
                <span className="text-slate-500">Night Team</span>
              </div>
            </div>
            <span className="text-slate-600 text-[10px]">H1–H12</span>
          </div>
        </div>

        {/* 2. Team Target Progress */}
        <div className="card hover-card-glow p-5 lg:col-span-1">
          <h3 className="font-semibold text-white text-sm mb-4">Team Target Today</h3>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-yellow-400 font-medium">Day Team</span>
                <span className="text-xs text-slate-400 tabular-nums">{dashData?.dayFormsToday || 0}/{DAY_TARGET}</span>
              </div>
              <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-yellow-500 to-yellow-400 rounded-full transition-all duration-1000 ease-out progress-glow-yellow"
                  style={{ width: `${dayProgress}%` }}
                />
              </div>
              <div className="text-right mt-1">
                <span className={`text-xs font-bold ${dayProgress >= 100 ? 'text-emerald-400' : 'text-yellow-400'}`}>{Math.round(dayProgress)}%</span>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-purple-400 font-medium">Night Team</span>
                <span className="text-xs text-slate-400 tabular-nums">{dashData?.nightFormsToday || 0}/{NIGHT_TARGET}</span>
              </div>
              <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-purple-500 to-purple-400 rounded-full transition-all duration-1000 ease-out progress-glow-purple"
                  style={{ width: `${nightProgress}%` }}
                />
              </div>
              <div className="text-right mt-1">
                <span className={`text-xs font-bold ${nightProgress >= 100 ? 'text-emerald-400' : 'text-purple-400'}`}>{Math.round(nightProgress)}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Hourly Top Performer */}
        <div className="card hover-card-glow p-5 lg:col-span-1">
          <h3 className="font-semibold text-white text-sm mb-4">Top Performers Today</h3>
          <div className="space-y-3">
            {topPerformers.length === 0 && (
              <div className="text-sm text-slate-500 text-center py-4">No data yet</div>
            )}
            {topPerformers.map((s, i) => {
              const medals = ['🥇', '🥈', '🥉']
              return (
                <div key={s.name} className="flex items-center gap-3 bg-slate-800/30 rounded-lg px-3 py-2.5 border border-slate-700/30">
                  <span className="text-lg">{medals[i] || ''}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-white text-sm truncate">{s.name}</div>
                    <div className="text-[10px] text-slate-500">
                      <span className={s.team === 'DAY' ? 'text-yellow-400/70' : 'text-purple-400/70'}>{s.team}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-brand-400 text-sm">{s.total}</div>
                    <div className="text-[10px] text-slate-500">forms</div>
                  </div>
                </div>
              )
            })}
          </div>
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

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: AI Productivity Score + Campaign Performance */}
          <div className="lg:col-span-2 space-y-6">
            {/* AI Productivity Score */}
            {dashData?.productivityScores && dashData.productivityScores.length > 0 && (
              <div className="card hover-card-glow">
                <div className="px-6 py-4 border-b border-slate-800/80 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">🤖</span>
                    <h2 className="font-semibold text-white">AI Productivity Score</h2>
                  </div>
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider">AI-Powered</span>
                </div>
                <div className="p-4 space-y-2">
                  {dashData.productivityScores.slice(0, 8).map((s, i) => (
                    <div key={s.name} className="flex items-center gap-3 bg-slate-800/30 rounded-lg px-4 py-2.5 border border-slate-700/30">
                      <div className="w-6 text-center text-xs text-slate-500">{i + 1}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-white text-sm truncate">{s.name}</span>
                          <span className={`text-[10px] ${s.team === 'DAY' ? 'text-yellow-400/70' : 'text-purple-400/70'}`}>{s.team}</span>
                        </div>
                        <div className="flex items-center gap-3 mt-1">
                          <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden max-w-32">
                            <div
                              className={`h-full rounded-full transition-all duration-700 ${
                                s.score >= 80 ? 'bg-emerald-500' : s.score >= 60 ? 'bg-brand-500' : s.score >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                              }`}
                              style={{ width: `${s.score}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-slate-500">{s.formsPerHour}/hr</span>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="flex items-center gap-1">
                          <span className={`text-sm font-bold ${
                            s.score >= 80 ? 'text-emerald-400' : s.score >= 60 ? 'text-brand-400' : s.score >= 40 ? 'text-yellow-400' : 'text-red-400'
                          }`}>{s.score}%</span>
                          {s.score >= 80 ? <span className="text-xs">⭐</span> : s.score < 50 ? <span className="text-xs">⚠</span> : null}
                        </div>
                        <div className="text-[10px] text-slate-500">{s.totalForms} forms</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Campaign Performance Today (Enhanced) */}
            {dashData?.campaignPerformance && dashData.campaignPerformance.length > 0 && (
              <div className="card hover-card-glow">
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
                        <th>Forms/Hr</th>
                        <th>Staff Working</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dashData.campaignPerformance.map(c => (
                        <tr key={c.name}>
                          <td className="font-semibold text-white">{c.name}</td>
                          <td><span className={c.team === 'DAY' ? 'badge-yellow' : 'badge-purple'}>{c.team}</span></td>
                          <td className="font-bold text-brand-400">{c.totalForms}</td>
                          <td className="text-slate-300 font-mono text-xs">{c.formsPerHour || 0}</td>
                          <td className="text-slate-300">{c.staffCount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Right: Real-Time Activity Feed */}
          <div className="lg:col-span-1">
            <div className="card hover-card-glow sticky top-4">
              <div className="px-5 py-4 border-b border-slate-800/80 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse-soft" />
                  <h2 className="font-semibold text-white text-sm">Live Activity</h2>
                </div>
                <span className="text-[10px] text-slate-500">{dashData?.activityTimeline?.length || 0} events</span>
              </div>
              <div className="p-3 space-y-1.5 max-h-[500px] overflow-y-auto">
                {(!dashData?.activityTimeline || dashData.activityTimeline.length === 0) && (
                  <div className="text-sm text-slate-500 text-center py-8">No activity yet</div>
                )}
                {dashData?.activityTimeline?.map((evt) => (
                  <div key={evt.id} className="flex items-start gap-2.5 bg-slate-800/20 rounded-lg px-3 py-2 border border-slate-700/20 animate-fade-in">
                    <div className="text-[10px] text-slate-500 font-mono w-12 flex-shrink-0 mt-0.5">{evt.time}</div>
                    <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5 ${evt.team === 'DAY' ? 'bg-yellow-400' : 'bg-purple-400'}`} />
                    <div className="flex-1 min-w-0">
                      <span className="font-medium text-white text-xs">{evt.staffName}</span>
                      <span className="text-slate-400 text-xs"> {evt.event}</span>
                      {evt.detail && <div className="text-slate-600 text-[10px] mt-0.5 truncate">{evt.detail}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Attendance Tab */}
      {activeTab === 'attendance' && (
        <div className="card hover-card-glow">
          <div className="px-6 py-4 border-b border-slate-800/80 flex items-center justify-between">
            <h2 className="font-semibold text-white">Today&apos;s Attendance — All Staff</h2>
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

      {/* Performance Tab */}
      {activeTab === 'performance' && (
        <>
          {/* Overall Campaign Report - ABOVE staff list */}
          {productivity?.campTotals && Object.keys(productivity.campTotals).length > 0 && (
            <div className="card hover-card-glow">
              <div className="px-6 py-4 border-b border-slate-800/80">
                <h2 className="font-semibold text-white">Overall Campaign Report</h2>
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

          {/* Staff Performance List */}
          {productivity && (
            <div className="card hover-card-glow">
              <div className="px-6 py-4 border-b border-slate-800/80 flex items-center justify-between">
                <h2 className="font-semibold text-white">Staff Performance</h2>
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
        </>
      )}

      {/* Staff Salary Tab */}
      {activeTab === 'staffSalary' && (
        <div className="card hover-card-glow">
          <div className="px-6 py-4 border-b border-slate-800/80 flex items-center justify-between">
            <h2 className="font-semibold text-white">Staff Salary Summary</h2>
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
                    <th>Basic</th>
                    <th>Extra Pay</th>
                    <th>Total Salary</th>
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
