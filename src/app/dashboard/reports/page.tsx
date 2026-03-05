'use client'
import { useEffect, useState, useCallback, useMemo } from 'react'

interface StaffReport {
  name: string
  team: string
  presentDays: number
  extraDays: number
  partialHours: number
  partialPay: number
  base: number
  extraPay: number
  total: number
  hourlyRate: number
}

function SkeletonRow() {
  return (
    <tr className="border-b border-slate-800">
      {[1,2,3,4,5].map(i => (
        <td key={i} className="py-4 px-4">
          <div className="h-4 bg-slate-700/60 rounded-lg animate-pulse" style={{ width: `${60 + i * 8}%` }} />
        </td>
      ))}
    </tr>
  )
}

function SkeletonCard() {
  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-5 space-y-3">
      <div className="h-3 w-24 bg-slate-700 rounded animate-pulse" />
      <div className="h-7 w-32 bg-slate-700 rounded-lg animate-pulse" />
      <div className="h-3 w-16 bg-slate-700/60 rounded animate-pulse" />
    </div>
  )
}

export default function ReportsPage() {
  const [tab, setTab] = useState<'payroll' | 'productivity'>('productivity')
  const [period, setPeriod] = useState('today')
  const [report, setReport] = useState<StaffReport[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())

  const fetchReport = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/reports/payroll?period=${period}`)
      const data = await res.json()
      setReport(data.report || [])
      setLastRefresh(new Date())
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }, [period])

  useEffect(() => { fetchReport() }, [fetchReport])

  useEffect(() => {
    const interval = setInterval(() => { fetchReport() }, 60000)
    return () => clearInterval(interval)
  }, [fetchReport])

  const filtered = useMemo(() =>
    report.filter(r =>
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.team.toLowerCase().includes(search.toLowerCase())
    ), [report, search])

  const fmt = (n: number) => `₹${n.toLocaleString('en-IN')}`

  const totalHours = filtered.reduce((s, r) => s + r.partialHours, 0)
  const totalLiveEarnings = filtered.reduce((s, r) => s + r.partialPay, 0)
  const totalPayroll = filtered.reduce((s, r) => s + r.total, 0)
  const avgHourlyRate = filtered.length > 0
    ? Math.round(filtered.reduce((s, r) => s + r.hourlyRate, 0) / filtered.length)
    : 0

  const handleCSV = async () => {
    const res = await fetch(`/api/reports/payroll?period=${period}`)
    const data = await res.json()
    const rows = [
      ['Name', 'Team', 'Present Days', 'Extra Days', 'Partial Hours', 'Partial Pay', 'Base Salary', 'Extra Pay', 'Total'],
      ...data.report.map((r: StaffReport) => [r.name, r.team, r.presentDays, r.extraDays, r.partialHours, r.partialPay, r.base, r.extraPay, r.total])
    ]
    const csv = rows.map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `payroll-${period}.csv`
    a.click()
  }

  const periods = [
    { value: 'today', label: 'Today' },
    { value: 'week', label: 'This Week' },
    { value: 'month', label: 'This Month' },
  ]

  const summaryCards = [
    {
      label: 'Headcount',
      value: filtered.length,
      sub: 'active staff',
      icon: '👥',
      accent: 'from-blue-500/10 to-blue-600/5 border-blue-500/20',
      textColor: 'text-blue-400',
    },
    {
      label: 'Total Hours',
      value: `${Math.round(totalHours * 10) / 10}h`,
      sub: 'hours worked',
      icon: '⏱',
      accent: 'from-violet-500/10 to-violet-600/5 border-violet-500/20',
      textColor: 'text-violet-400',
    },
    {
      label: 'Avg Hourly Rate',
      value: fmt(avgHourlyRate),
      sub: 'per hour',
      icon: '📊',
      accent: 'from-amber-500/10 to-amber-600/5 border-amber-500/20',
      textColor: 'text-amber-400',
    },
    {
      label: 'Live Earnings',
      value: fmt(totalLiveEarnings),
      sub: 'earned today',
      icon: '💰',
      accent: 'from-emerald-500/10 to-emerald-600/5 border-emerald-500/20',
      textColor: 'text-emerald-400',
    },
  ]

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 font-sans">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-3xl font-bold tracking-tight text-white">Reports</h1>
            <span className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-medium px-2.5 py-1 rounded-full">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
              Live
            </span>
          </div>
          <p className="text-slate-400 text-sm">
            Payroll and productivity reports with CSV export
            <span className="ml-2 text-slate-600 text-xs">
              · Last updated {lastRefresh.toLocaleTimeString()}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchReport}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 px-3 py-2 rounded-xl text-sm font-medium transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
          <button
            onClick={handleCSV}
            className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white px-4 py-2 rounded-xl text-sm font-medium transition-all shadow-lg shadow-violet-900/30"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Payroll CSV
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {loading
          ? [1,2,3,4].map(i => <SkeletonCard key={i} />)
          : summaryCards.map((card) => (
            <div key={card.label} className={`bg-gradient-to-br ${card.accent} border rounded-2xl p-5 backdrop-blur-sm`}>
              <div className="flex items-start justify-between mb-3">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">{card.label}</span>
                <span className="text-lg">{card.icon}</span>
              </div>
              <div className={`text-2xl font-bold ${card.textColor} mb-1`}>{card.value}</div>
              <div className="text-xs text-slate-500">{card.sub}</div>
            </div>
          ))
        }
      </div>

      {/* Controls bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        {/* Period segmented control */}
        <div className="flex items-center bg-slate-800/80 border border-slate-700/60 rounded-xl p-1 gap-0.5">
          {periods.map(p => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                period === p.value
                  ? 'bg-violet-600 text-white shadow-md shadow-violet-900/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search staff or team..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="bg-slate-800/80 border border-slate-700/60 text-slate-200 placeholder-slate-500 rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-violet-500/60 focus:ring-1 focus:ring-violet-500/30 w-56 transition-all"
          />
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-slate-800 mb-0">
        {(['productivity', 'payroll'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-3 text-sm font-semibold capitalize border-b-2 transition-all duration-200 -mb-px ${
              tab === t
                ? 'border-violet-500 text-violet-400'
                : 'border-transparent text-slate-500 hover:text-slate-300'
            }`}
          >
            {t === 'productivity' ? '⚡ Productivity' : '💼 Payroll'}
          </button>
        ))}
        <div className="ml-auto self-center pr-1 pb-2">
          <span className="text-xs text-slate-600">auto-refresh every 60s</span>
        </div>
      </div>

      {/* Table container */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-b-2xl rounded-tr-2xl overflow-hidden">
        {loading ? (
          <table className="w-full text-sm">
            <tbody>{[1,2,3,4,5,6].map(i => <SkeletonRow key={i} />)}</tbody>
          </table>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="text-5xl mb-4">📭</div>
            <div className="text-slate-300 font-semibold text-lg mb-1">No data found</div>
            <div className="text-slate-500 text-sm">
              {search ? `No staff matching "${search}"` : 'No reports available for this period.'}
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-800/60 text-slate-400 text-xs uppercase tracking-widest border-b border-slate-700/60">
                  <th className="text-left py-3.5 px-5 font-semibold">Staff</th>
                  <th className="text-left py-3.5 px-4 font-semibold">Team</th>
                  {tab === 'productivity' ? (
                    <>
                      <th className="text-left py-3.5 px-4 font-semibold">Hours Worked</th>
                      <th className="text-left py-3.5 px-4 font-semibold">Hourly Rate</th>
                      <th className="text-left py-3.5 px-4 font-semibold">Live Earnings</th>
                    </>
                  ) : (
                    <>
                      <th className="text-left py-3.5 px-4 font-semibold">Present</th>
                      <th className="text-left py-3.5 px-4 font-semibold">Extra Days</th>
                      <th className="text-left py-3.5 px-4 font-semibold">Partial Hrs</th>
                      <th className="text-left py-3.5 px-4 font-semibold">Partial Pay</th>
                      <th className="text-left py-3.5 px-4 font-semibold">Base</th>
                      <th className="text-left py-3.5 px-4 font-semibold">Extra Pay</th>
                      <th className="text-left py-3.5 px-4 font-semibold">Total</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filtered.map((r, i) => (
                  <tr key={i} className="hover:bg-slate-800/40 transition-colors group">
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500/20 to-blue-500/20 border border-violet-500/20 flex items-center justify-center text-xs font-bold text-violet-300">
                          {r.name.charAt(0)}
                        </div>
                        <span className="font-semibold text-slate-100">{r.name}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                        r.team === 'DAY'
                          ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                          : 'bg-blue-500/10 border-blue-500/30 text-blue-300'
                      }`}>
                        {r.team === 'DAY' ? '☀️' : '🌙'} {r.team}
                      </span>
                    </td>
                    {tab === 'productivity' ? (
                      <>
                        <td className="py-3.5 px-4">
                          <span className={r.partialHours > 0 ? 'text-slate-200 font-medium' : 'text-slate-600'}>
                            {r.partialHours > 0 ? `${r.partialHours}h` : '—'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-400 text-xs font-mono">
                          {fmt(r.hourlyRate)}<span className="text-slate-600">/hr</span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`font-bold ${r.partialPay > 0 ? 'text-emerald-400' : 'text-slate-600'}`}>
                            {r.partialPay > 0 ? fmt(r.partialPay) : '—'}
                          </span>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="py-3.5 px-4 text-slate-300 font-medium">{r.presentDays}</td>
                        <td className="py-3.5 px-4 text-slate-400">{r.extraDays > 0 ? <span className="text-amber-400 font-semibold">+{r.extraDays}</span> : <span className="text-slate-600">—</span>}</td>
                        <td className="py-3.5 px-4 text-slate-400">{r.partialHours > 0 ? `${r.partialHours}h` : <span className="text-slate-600">—</span>}</td>
                        <td className="py-3.5 px-4 text-blue-400 font-medium">{r.partialPay > 0 ? fmt(r.partialPay) : <span className="text-slate-600">—</span>}</td>
                        <td className="py-3.5 px-4 text-slate-300 font-mono text-xs">{fmt(r.base)}</td>
                        <td className="py-3.5 px-4">{r.extraPay > 0 ? <span className="text-emerald-400 font-medium">{fmt(r.extraPay)}</span> : <span className="text-slate-600">—</span>}</td>
                        <td className="py-3.5 px-4">
                          <span className="text-amber-400 font-bold">{fmt(r.total)}</span>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
              {/* Grand Total Footer */}
              <tfoot>
                <tr className="bg-slate-800/80 border-t-2 border-slate-700">
                  {tab === 'productivity' ? (
                    <>
                      <td className="py-4 px-5" colSpan={2}>
                        <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Grand Total</span>
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-slate-200 font-bold">{Math.round(totalHours * 10) / 10}h</span>
                      </td>
                      <td className="py-4 px-4 text-slate-500 text-xs">avg {fmt(avgHourlyRate)}/hr</td>
                      <td className="py-4 px-4">
                        <span className="text-emerald-400 font-bold text-base">{fmt(totalLiveEarnings)}</span>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="py-4 px-5" colSpan={6}>
                        <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Grand Total</span>
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-amber-400 font-bold text-base">{fmt(totalPayroll)}</span>
                      </td>
                    </>
                  )}
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Footer note */}
      <p className="text-center text-slate-700 text-xs mt-6">
        Salary calculated at Monthly ÷ 26 days ÷ 8 hrs · Auto-refreshes every 60 seconds
      </p>
    </div>
  )
}
