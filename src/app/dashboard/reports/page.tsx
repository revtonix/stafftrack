'use client'
// src/app/dashboard/reports/page.tsx
import { useState, useEffect } from 'react'
import { formatCurrency } from '@/lib/salary'

const PRESETS = [
  { value: 'today', label: 'Today' },
  { value: '7days', label: 'Last 7 Days' },
  { value: '30days', label: 'Last 30 Days' },
  { value: 'thisMonth', label: 'This Month' },
  { value: '6months', label: 'Last 6 Months' },
  { value: 'custom', label: 'Custom Range' },
]

export default function ReportsPage() {
  const [preset, setPreset] = useState('today')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [payroll, setPayroll] = useState<any[]>([])
  const [productivity, setProductivity] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState<'staffSalary' | 'performance'>('performance')

  function buildQuery() {
    if (preset === 'custom') return `from=${from}&to=${to}`
    return `preset=${preset}`
  }

  async function fetchData() {
    setLoading(true)
    const q = buildQuery()
    const [pr, pd] = await Promise.all([
      fetch(`/api/reports/payroll?${q}`).then(r => r.json()),
      fetch(`/api/reports/productivity?${q}`).then(r => r.json()),
    ])
    if (pr.success) setPayroll(pr.data)
    if (pd.success) setProductivity(pd.data)
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [preset])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Reports</h1>
        <p className="text-slate-400 text-sm mt-1">Staff salary and performance reports with CSV export</p>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="label">Time Period</label>
            <select className="input w-auto text-sm" value={preset} onChange={e => setPreset(e.target.value)}>
              {PRESETS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </div>
          {preset === 'custom' && (
            <>
              <div>
                <label className="label">From</label>
                <input type="date" className="input text-sm" value={from} onChange={e => setFrom(e.target.value)} />
              </div>
              <div>
                <label className="label">To</label>
                <input type="date" className="input text-sm" value={to} onChange={e => setTo(e.target.value)} />
              </div>
              <button className="btn-primary" onClick={fetchData}>Apply</button>
            </>
          )}
          <div className="flex gap-2 ml-auto">
            <a href={`/api/reports/payroll?${buildQuery()}&export=csv`} className="btn-secondary btn-sm" target="_blank">
              ↓ Staff Salary CSV
            </a>
            <a href={`/api/reports/productivity?${buildQuery()}&export=csv`} className="btn-secondary btn-sm" target="_blank">
              ↓ Performance CSV
            </a>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {([
          { key: 'performance' as const, label: 'Performance' },
          { key: 'staffSalary' as const, label: 'Staff Salary' },
        ]).map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`btn btn-sm ${tab === t.key ? 'btn-primary' : 'btn-secondary'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : tab === 'staffSalary' ? (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Staff</th><th>Team</th><th>Present</th>
                  <th>Extra Days</th><th>Basic</th><th>Extra Pay</th><th>Total Salary</th>
                </tr>
              </thead>
              <tbody>
                {payroll.map(s => (
                  <tr key={s.id}>
                    <td className="font-semibold text-white">{s.name}</td>
                    <td><span className={s.team === 'DAY' ? 'badge-yellow' : 'badge-purple'}>{s.team}</span></td>
                    <td>{s.presentDays}</td>
                    <td className="text-yellow-400">{s.extraDays > 0 ? `+${s.extraDays}` : '—'}</td>
                    <td>{formatCurrency(s.baseSalary)}</td>
                    <td className="text-emerald-400">{s.extraPay > 0 ? formatCurrency(s.extraPay) : '—'}</td>
                    <td className="font-bold text-white">{formatCurrency(s.totalSalary)}</td>
                  </tr>
                ))}
                {payroll.length > 0 && (
                  <tr className="bg-slate-800/50 font-bold">
                    <td colSpan={4} className="text-slate-300">Grand Total</td>
                    <td>{formatCurrency(payroll.reduce((a,s) => a+s.baseSalary,0))}</td>
                    <td className="text-emerald-400">{formatCurrency(payroll.reduce((a,s) => a+s.extraPay,0))}</td>
                    <td className="text-yellow-400">{formatCurrency(payroll.reduce((a,s) => a+s.totalSalary,0))}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : productivity && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="stat-card">
              <div className="text-xs text-slate-500 uppercase">Total Forms</div>
              <div className="text-3xl font-bold text-brand-400">{productivity.totalForms}</div>
            </div>
            <div className="stat-card">
              <div className="text-xs text-slate-500 uppercase">Active Staff</div>
              <div className="text-3xl font-bold text-white">{productivity.staffTotals.length}</div>
            </div>
            <div className="stat-card">
              <div className="text-xs text-slate-500 uppercase">Campaigns</div>
              <div className="text-3xl font-bold text-white">{Object.keys(productivity.campTotals).length}</div>
            </div>
          </div>
          {/* Overall Campaign Report - above staff list */}
          <div className="card">
            <div className="px-6 py-4 border-b border-slate-800"><h3 className="font-semibold text-white">Overall Campaign Report</h3></div>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Campaign</th><th>Total Forms</th></tr></thead>
                <tbody>
                  {Object.entries(productivity.campTotals).sort(([,a],[,b]) => (b as number)-(a as number)).map(([name, total]) => (
                    <tr key={name}>
                      <td className="text-slate-300">{name}</td>
                      <td className="font-bold text-brand-400">{total as number}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          {/* Staff performance list */}
          <div className="card">
            <div className="table-wrap">
              <table>
                <thead><tr><th>Staff</th><th>Total Forms</th></tr></thead>
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
        </div>
      )}
    </div>
  )
}
