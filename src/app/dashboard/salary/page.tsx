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
  monthlySalary?: number; baseSalary?: number; extraDays?: number; extraPay?: number; totalSalary?: number
}
interface SalaryData {
  records: SalaryRecord[]; staffSummaries: StaffSummary[]; leaves: any[]
  role: string; dateRange: { start: string; end: string }
}

const PRESETS = [
  { key: 'thisMonth', label: 'This Month' },
  { key: 'lastMonth', label: 'Last Month' },
  { key: 'thisWeek', label: 'This Week' },
  { key: 'today', label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: 'custom', label: 'Custom' },
]

export default function SalaryPage() {
  const [data, setData] = useState<SalaryData | null>(null)
  const [loading, setLoading] = useState(true)
  const [preset, setPreset] = useState('thisMonth')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [selectedStaff, setSelectedStaff] = useState<string>('all')
  const [session, setSession] = useState<{ role: string } | null>(null)

  // Fetch session role
  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => {
      if (d.success) setSession({ role: d.data.role })
    })
  }, [])

  const fetchData = useCallback(async () => {
    setLoading(true)
    let url = '/api/reports/salary?'
    if (preset === 'custom' && customFrom && customTo) {
      url += `from=${customFrom}&to=${customTo}`
    } else if (preset !== 'custom') {
      url += `preset=${preset}`
    } else {
      url += 'preset=thisMonth'
    }
    if (selectedStaff !== 'all') url += `&staffId=${selectedStaff}`

    const res = await fetch(url)
    const d = await res.json()
    if (d.success) setData(d.data)
    setLoading(false)
  }, [preset, customFrom, customTo, selectedStaff])

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
            // Single staff summary
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="stat-card">
                <div className="text-xs text-slate-500 uppercase tracking-wide">Working Days</div>
                <div className="text-3xl font-bold text-emerald-400">{summary.presentDays}</div>
              </div>
              <div className="stat-card">
                <div className="text-xs text-slate-500 uppercase tracking-wide">Total Hours</div>
                <div className="text-3xl font-bold text-brand-400">{summary.totalHours.toFixed(1)}h</div>
              </div>
              {showSalary && (
                <>
                  <div className="stat-card">
                    <div className="text-xs text-slate-500 uppercase tracking-wide">Base Salary</div>
                    <div className="text-2xl font-bold text-white">{formatCurrency(summary.baseSalary || 0)}</div>
                    {(summary.extraPay || 0) > 0 && (
                      <div className="text-xs text-emerald-400">+{formatCurrency(summary.extraPay || 0)} extra</div>
                    )}
                  </div>
                  <div className="stat-card">
                    <div className="text-xs text-slate-500 uppercase tracking-wide">Total Earnings</div>
                    <div className="text-3xl font-bold text-yellow-400">{formatCurrency(summary.totalSalary || 0)}</div>
                  </div>
                </>
              )}
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

          {/* Staff-wise summary table (Admin/TL multi-staff view) */}
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
                      {showSalary && <th>Total Salary</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {staffList.map(s => (
                      <tr key={s.staffId} className="cursor-pointer hover:bg-slate-800/50" onClick={() => setSelectedStaff(s.staffId)}>
                        <td className="font-semibold text-white">{s.name}</td>
                        <td><span className={s.team === 'DAY' ? 'badge-yellow' : 'badge-purple'}>{s.team}</span></td>
                        <td className="text-emerald-400">{s.presentDays}</td>
                        <td className="font-mono text-brand-400">{s.totalHours.toFixed(1)}h</td>
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
    </div>
  )
}
