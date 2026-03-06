'use client'
// src/app/dashboard/salary/page.tsx
import { useState, useEffect, useCallback } from 'react'
import { formatCurrency, formatTime } from '@/lib/salary'

interface SalaryRecord {
  date: string; staffId: string; staffName: string; team: string
  checkIn: string | null; checkOut: string | null; hoursWorked: number
  dailyEarning?: number
}
interface StaffSummary {
  staffId: string; name: string; team: string; presentDays: number; totalHours: number
  totalForms: number; formsPerHour: number; attendanceStatus: 'green' | 'yellow' | 'red'
  totalWorkingDays: number
  monthlySalary?: number; baseSalary?: number; extraDays?: number; extraPay?: number
  totalSalary?: number; salaryTillDate?: number; estimatedMonthSalary?: number
}
interface SalaryData {
  records: SalaryRecord[]; staffSummaries: StaffSummary[]; leaves: any[]
  role: string; dateRange: { start: string; end: string }
  topEarners: { name: string; amount: number }[]
  topHours: { name: string; hours: number }[]
  totalWorkingDays: number
}

const PRESETS = [
  { key: 'thisMonth', label: 'This Month' },
  { key: 'lastMonth', label: 'Last Month' },
  { key: 'thisWeek', label: 'This Week' },
  { key: 'today', label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: 'custom', label: 'Custom' },
]

function AttendanceBadge({ status, present, total }: { status: string; present: number; total: number }) {
  const icon = status === 'green' ? '🟢' : status === 'yellow' ? '🟡' : '🔴'
  const color = status === 'green' ? 'text-emerald-400' : status === 'yellow' ? 'text-yellow-400' : 'text-red-400'
  return (
    <span className={`text-xs font-medium ${color}`}>
      {icon} {present}/{total} days
    </span>
  )
}

function SalaryProgressBar({ current, total }: { current: number; total: number }) {
  const pct = total > 0 ? Math.min(Math.round((current / total) * 100), 100) : 0
  return (
    <div className="w-full">
      <div className="flex items-center justify-between text-[10px] mb-1">
        <span className="text-emerald-400 font-medium">{formatCurrency(current)}</span>
        <span className="text-slate-500">/ {formatCurrency(total)}</span>
      </div>
      <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="text-[10px] text-slate-500 mt-0.5 text-right">{pct}%</div>
    </div>
  )
}

function DetailPopup({ staff, showSalary, onClose }: { staff: StaffSummary; showSalary: boolean; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="card max-w-md w-full p-6 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">{staff.name}</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white text-lg">✕</button>
        </div>
        <div className="flex items-center gap-2">
          <span className={staff.team === 'DAY' ? 'badge-yellow' : 'badge-purple'}>{staff.team}</span>
          <AttendanceBadge status={staff.attendanceStatus} present={staff.presentDays} total={staff.totalWorkingDays} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-800/60 rounded-lg p-3">
            <div className="text-[10px] text-slate-500 uppercase">Working Days</div>
            <div className="text-lg font-bold text-emerald-400">{staff.presentDays}</div>
          </div>
          <div className="bg-slate-800/60 rounded-lg p-3">
            <div className="text-[10px] text-slate-500 uppercase">Total Hours</div>
            <div className="text-lg font-bold text-brand-400">{staff.totalHours.toFixed(1)}h</div>
          </div>
          <div className="bg-slate-800/60 rounded-lg p-3">
            <div className="text-[10px] text-slate-500 uppercase">Total Forms</div>
            <div className="text-lg font-bold text-white">{staff.totalForms}</div>
          </div>
          <div className="bg-slate-800/60 rounded-lg p-3">
            <div className="text-[10px] text-slate-500 uppercase">Forms/Hour</div>
            <div className="text-lg font-bold text-brand-400">{staff.formsPerHour}</div>
          </div>
        </div>
        {showSalary && (
          <>
            <div className="border-t border-slate-700 pt-3 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-800/60 rounded-lg p-3">
                  <div className="text-[10px] text-slate-500 uppercase">Base Salary</div>
                  <div className="text-lg font-bold text-white">{formatCurrency(staff.baseSalary || 0)}</div>
                </div>
                <div className="bg-slate-800/60 rounded-lg p-3">
                  <div className="text-[10px] text-slate-500 uppercase">Extra Days</div>
                  <div className="text-lg font-bold text-yellow-400">{staff.extraDays || 0}</div>
                </div>
                <div className="bg-slate-800/60 rounded-lg p-3">
                  <div className="text-[10px] text-slate-500 uppercase">Extra Pay</div>
                  <div className="text-lg font-bold text-emerald-400">{formatCurrency(staff.extraPay || 0)}</div>
                </div>
                <div className="bg-slate-800/60 rounded-lg p-3">
                  <div className="text-[10px] text-slate-500 uppercase">Final Salary</div>
                  <div className="text-lg font-bold text-yellow-400">{formatCurrency(staff.totalSalary || 0)}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-800/60 rounded-lg p-3">
                  <div className="text-[10px] text-slate-500 uppercase">Salary Till Date</div>
                  <div className="text-lg font-bold text-emerald-400">{formatCurrency(staff.salaryTillDate || 0)}</div>
                </div>
                <div className="bg-gradient-to-br from-brand-600/20 to-brand-500/10 border border-brand-500/20 rounded-lg p-3">
                  <div className="text-[10px] text-brand-400 uppercase flex items-center gap-1">
                    <span>🤖</span> AI Estimated Month
                  </div>
                  <div className="text-lg font-bold text-brand-400">{formatCurrency(staff.estimatedMonthSalary || 0)}</div>
                </div>
              </div>
              <div className="pt-1">
                <div className="text-[10px] text-slate-500 uppercase mb-2">Monthly Salary Progress</div>
                <SalaryProgressBar current={staff.salaryTillDate || 0} total={staff.monthlySalary || 10000} />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function SalaryPage() {
  const [data, setData] = useState<SalaryData | null>(null)
  const [loading, setLoading] = useState(true)
  const [preset, setPreset] = useState('thisMonth')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [selectedStaff, setSelectedStaff] = useState<string>('all')
  const [session, setSession] = useState<{ role: string } | null>(null)
  const [detailStaff, setDetailStaff] = useState<StaffSummary | null>(null)
  const [rankingTab, setRankingTab] = useState<'earners' | 'hours'>('earners')

  // Fetch session role
  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => {
      if (d.success) setSession({ role: d.data.role })
    })
  }, [])

  const buildQuery = useCallback(() => {
    let q = ''
    if (preset === 'custom' && customFrom && customTo) {
      q = `from=${customFrom}&to=${customTo}`
    } else if (preset !== 'custom') {
      q = `preset=${preset}`
    } else {
      q = 'preset=thisMonth'
    }
    if (selectedStaff !== 'all') q += `&staffId=${selectedStaff}`
    return q
  }, [preset, customFrom, customTo, selectedStaff])

  const fetchData = useCallback(async () => {
    setLoading(true)
    const url = `/api/reports/salary?${buildQuery()}`
    const res = await fetch(url)
    const d = await res.json()
    if (d.success) setData(d.data)
    setLoading(false)
  }, [buildQuery])

  useEffect(() => { fetchData() }, [fetchData])

  const role = data?.role || session?.role || 'STAFF'
  const isAdmin = role === 'ADMIN'
  const isTL = role === 'TEAM_LEAD_DAY' || role === 'TEAM_LEAD_NIGHT'
  const showSalary = !isTL

  // Get unique staff list for selector
  const staffList = data?.staffSummaries || []

  // Records to show (filter by selected staff)
  const filteredRecords = selectedStaff === 'all'
    ? (data?.records || [])
    : (data?.records || []).filter(r => r.staffId === selectedStaff)

  // Summary for selected view
  const summary = selectedStaff === 'all' && staffList.length === 1
    ? staffList[0]
    : selectedStaff !== 'all'
      ? staffList.find(s => s.staffId === selectedStaff)
      : null

  // Aggregate totals when showing all
  const aggTotalDays = staffList.reduce((a, s) => a + s.presentDays, 0)
  const aggTotalHours = staffList.reduce((a, s) => a + s.totalHours, 0)
  const aggTotalSalary = showSalary ? staffList.reduce((a, s) => a + (s.totalSalary || 0), 0) : 0

  const pageTitle = isAdmin ? 'Staff Salary & Work History' : isTL ? 'Team Work History' : 'My Salary'
  const pageSubtitle = isAdmin
    ? 'View all staff attendance and earnings'
    : isTL
      ? 'View team attendance and hours'
      : 'Monthly earnings and attendance breakdown'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">{pageTitle}</h1>
        <p className="text-slate-400 text-sm mt-1">{pageSubtitle}</p>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-wrap items-end gap-4">
          {/* Preset buttons */}
          <div className="flex-1 min-w-0">
            <label className="text-xs text-slate-500 uppercase tracking-wide block mb-2">Period</label>
            <div className="flex flex-wrap gap-1.5">
              {PRESETS.map(p => (
                <button
                  key={p.key}
                  onClick={() => setPreset(p.key)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                    preset === p.key
                      ? 'bg-brand-600 text-white'
                      : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Custom date range */}
          {preset === 'custom' && (
            <div className="flex items-center gap-2">
              <div>
                <label className="text-xs text-slate-500 block mb-1">From</label>
                <input type="date" className="input text-sm w-auto" value={customFrom} onChange={e => setCustomFrom(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-slate-500 block mb-1">To</label>
                <input type="date" className="input text-sm w-auto" value={customTo} onChange={e => setCustomTo(e.target.value)} />
              </div>
            </div>
          )}

          {/* Staff selector (Admin/TL only) */}
          {(isAdmin || isTL) && staffList.length > 0 && (
            <div>
              <label className="text-xs text-slate-500 block mb-1">Staff</label>
              <select
                className="input text-sm w-auto"
                value={selectedStaff}
                onChange={e => setSelectedStaff(e.target.value)}
              >
                <option value="all">All Staff</option>
                {staffList.map(s => (
                  <option key={s.staffId} value={s.staffId}>{s.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Export buttons */}
          {(isAdmin || (!isTL)) && (
            <div className="flex gap-1.5 ml-auto">
              <div className="relative group">
                <button className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors">
                  ↓ Export CSV
                </button>
                <div className="absolute right-0 top-full mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-20 min-w-[140px]">
                  <a href={`/api/reports/salary?${buildQuery()}&export=csv&exportScope=salary`}
                    className="block px-3 py-2 text-xs text-slate-300 hover:bg-slate-700 hover:text-white rounded-t-lg" target="_blank">
                    Salary Report
                  </a>
                  <a href={`/api/reports/salary?${buildQuery()}&export=csv&exportScope=hours`}
                    className="block px-3 py-2 text-xs text-slate-300 hover:bg-slate-700 hover:text-white" target="_blank">
                    Staff Hours
                  </a>
                  {showSalary && (
                    <a href={`/api/reports/salary?${buildQuery()}&export=csv&exportScope=payroll`}
                      className="block px-3 py-2 text-xs text-slate-300 hover:bg-slate-700 hover:text-white rounded-b-lg" target="_blank">
                      Payroll
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : data && (
        <div className="space-y-6">
          {/* Summary Cards */}
          {summary ? (
            // Single staff summary with enhanced fields
            <div className="space-y-4">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="stat-card">
                  <div className="text-xs text-slate-500 uppercase tracking-wide">Working Days</div>
                  <div className="text-3xl font-bold text-emerald-400">{summary.presentDays}</div>
                  <AttendanceBadge status={summary.attendanceStatus} present={summary.presentDays} total={summary.totalWorkingDays} />
                </div>
                <div className="stat-card">
                  <div className="text-xs text-slate-500 uppercase tracking-wide">Total Hours</div>
                  <div className="text-3xl font-bold text-brand-400">{summary.totalHours.toFixed(1)}h</div>
                  <div className="text-xs text-slate-500">{summary.formsPerHour} forms/hr</div>
                </div>
                {showSalary && (
                  <>
                    <div className="stat-card">
                      <div className="text-xs text-slate-500 uppercase tracking-wide">Salary Till Date</div>
                      <div className="text-2xl font-bold text-emerald-400">{formatCurrency(summary.salaryTillDate || 0)}</div>
                      <SalaryProgressBar current={summary.salaryTillDate || 0} total={summary.monthlySalary || 10000} />
                    </div>
                    <div className="stat-card">
                      <div className="text-xs text-slate-500 uppercase tracking-wide flex items-center gap-1">
                        <span>🤖</span> AI Estimated Month
                      </div>
                      <div className="text-2xl font-bold text-brand-400">{formatCurrency(summary.estimatedMonthSalary || 0)}</div>
                      {(summary.extraPay || 0) > 0 && (
                        <div className="text-xs text-emerald-400">+{formatCurrency(summary.extraPay || 0)} extra</div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          ) : (
            // Aggregate summary (all staff)
            <div className={`grid gap-4 ${showSalary ? 'grid-cols-2 lg:grid-cols-3' : 'grid-cols-2'}`}>
              <div className="stat-card">
                <div className="text-xs text-slate-500 uppercase tracking-wide">Total Working Days</div>
                <div className="text-3xl font-bold text-emerald-400">{aggTotalDays}</div>
                <div className="text-xs text-slate-500">{staffList.length} staff</div>
              </div>
              <div className="stat-card">
                <div className="text-xs text-slate-500 uppercase tracking-wide">Total Hours</div>
                <div className="text-3xl font-bold text-brand-400">{aggTotalHours.toFixed(1)}h</div>
              </div>
              {showSalary && (
                <div className="stat-card">
                  <div className="text-xs text-slate-500 uppercase tracking-wide">Total Earnings</div>
                  <div className="text-3xl font-bold text-yellow-400">{formatCurrency(aggTotalSalary)}</div>
                </div>
              )}
            </div>
          )}

          {/* Rankings: Top Earners + Top Hours */}
          {(isAdmin || !isTL) && selectedStaff === 'all' && staffList.length > 1 && (
            <div className="card hover-card-glow">
              <div className="px-6 py-4 border-b border-slate-800 flex items-center gap-3">
                <span className="text-sm">🏆</span>
                <div className="flex gap-1.5">
                  {showSalary && (
                    <button
                      onClick={() => setRankingTab('earners')}
                      className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
                        rankingTab === 'earners' ? 'bg-brand-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      Top Earners
                    </button>
                  )}
                  <button
                    onClick={() => setRankingTab('hours')}
                    className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
                      rankingTab === 'hours' ? 'bg-brand-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    Top Hours
                  </button>
                </div>
              </div>
              <div className="p-4">
                {rankingTab === 'earners' && showSalary && data.topEarners?.length > 0 && (
                  <div className="space-y-2">
                    {data.topEarners.map((e, i) => (
                      <div key={e.name} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-slate-800/40">
                        <span className={`text-sm font-bold ${i === 0 ? 'text-yellow-400' : i === 1 ? 'text-slate-300' : i === 2 ? 'text-amber-600' : 'text-slate-500'}`}>
                          {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                        </span>
                        <span className="text-sm text-white font-medium flex-1">{e.name}</span>
                        <span className="text-sm font-bold text-yellow-400">{formatCurrency(e.amount)}</span>
                      </div>
                    ))}
                  </div>
                )}
                {rankingTab === 'hours' && data.topHours?.length > 0 && (
                  <div className="space-y-2">
                    {data.topHours.map((e, i) => (
                      <div key={e.name} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-slate-800/40">
                        <span className={`text-sm font-bold ${i === 0 ? 'text-yellow-400' : i === 1 ? 'text-slate-300' : i === 2 ? 'text-amber-600' : 'text-slate-500'}`}>
                          {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                        </span>
                        <span className="text-sm text-white font-medium flex-1">{e.name}</span>
                        <span className="text-sm font-bold text-brand-400">{e.hours.toFixed(1)}h</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Staff-wise summary table (Admin/TL multi-staff view) — Enhanced */}
          {(isAdmin || isTL) && selectedStaff === 'all' && staffList.length > 0 && (
            <div className="card">
              <div className="px-6 py-4 border-b border-slate-800">
                <h2 className="font-semibold text-white">Staff Summary</h2>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Staff</th>
                      <th>Team</th>
                      <th>Days Present</th>
                      <th>Total Hours</th>
                      <th>Forms/Hour</th>
                      <th>Attendance</th>
                      {showSalary && <th>Salary Till Date</th>}
                      {showSalary && <th>Est. Month Salary</th>}
                      {showSalary && <th>Total Salary</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {staffList.map(s => (
                      <tr
                        key={s.staffId}
                        className="cursor-pointer hover:bg-slate-800/50"
                        onClick={() => setDetailStaff(s)}
                      >
                        <td className="font-semibold text-white">{s.name}</td>
                        <td><span className={s.team === 'DAY' ? 'badge-yellow' : 'badge-purple'}>{s.team}</span></td>
                        <td className="text-emerald-400">{s.presentDays}</td>
                        <td className="font-mono text-brand-400">{s.totalHours.toFixed(1)}h</td>
                        <td className="text-slate-300">{s.formsPerHour}</td>
                        <td>
                          <AttendanceBadge status={s.attendanceStatus} present={s.presentDays} total={s.totalWorkingDays} />
                        </td>
                        {showSalary && (
                          <td>
                            <div className="w-28">
                              <SalaryProgressBar current={s.salaryTillDate || 0} total={s.monthlySalary || 10000} />
                            </div>
                          </td>
                        )}
                        {showSalary && (
                          <td className="text-brand-400 font-medium">
                            <span className="text-[10px] text-slate-600 mr-1">🤖</span>
                            {formatCurrency(s.estimatedMonthSalary || 0)}
                          </td>
                        )}
                        {showSalary && <td className="font-bold text-yellow-400">{formatCurrency(s.totalSalary || 0)}</td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Date-wise breakdown table */}
          <div className="card">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <h2 className="font-semibold text-white">
                {selectedStaff !== 'all' ? `${staffList.find(s => s.staffId === selectedStaff)?.name || 'Staff'} — ` : ''}
                Date-wise Breakdown
              </h2>
              <span className="text-xs text-slate-500">{filteredRecords.length} records</span>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    {(isAdmin || isTL) && selectedStaff === 'all' && <th>Staff</th>}
                    <th>Date</th>
                    <th>Check-in</th>
                    <th>Check-out</th>
                    <th>Hours Worked</th>
                    {showSalary && <th>Daily Earning</th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.length > 0 ? filteredRecords.map((r, i) => (
                    <tr key={`${r.staffId}-${r.date}-${i}`}>
                      {(isAdmin || isTL) && selectedStaff === 'all' && (
                        <td className="font-semibold text-white">{r.staffName}</td>
                      )}
                      <td className="text-white">
                        {new Date(r.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' })}
                      </td>
                      <td className="text-slate-300">{r.checkIn ? formatTime(r.checkIn) : '--:--'}</td>
                      <td className="text-slate-300">{r.checkOut ? formatTime(r.checkOut) : '--:--'}</td>
                      <td className="font-mono text-brand-400">{r.hoursWorked.toFixed(1)}h</td>
                      {showSalary && (
                        <td className="font-bold text-emerald-400">
                          {r.dailyEarning ? formatCurrency(r.dailyEarning) : '—'}
                        </td>
                      )}
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={showSalary ? 6 : 5} className="text-center text-slate-500">
                        No records found for this period
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Approved Leaves (Staff view) */}
          {data.leaves?.length > 0 && (
            <div className="card">
              <div className="px-6 py-4 border-b border-slate-800">
                <h3 className="font-semibold text-white">Approved Leaves</h3>
              </div>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>From</th><th>To</th><th>Type</th></tr></thead>
                  <tbody>
                    {data.leaves.map((l: any) => (
                      <tr key={l.id}>
                        <td>{new Date(l.dateFrom).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' })}</td>
                        <td>{new Date(l.dateTo).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' })}</td>
                        <td><span className={l.type === 'PAID' ? 'badge-green' : 'badge-red'}>{l.type}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Detail Popup */}
      {detailStaff && (
        <DetailPopup staff={detailStaff} showSalary={showSalary} onClose={() => setDetailStaff(null)} />
      )}
    </div>
  )
}
