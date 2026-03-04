'use client'
// src/components/dashboard/AdminDashboard.tsx
import { useState, useEffect } from 'react'
import { formatCurrency } from '@/lib/salary'
import type { JWTPayload } from '@/lib/auth'

interface StaffSummary {
  id: string; name: string; team: string;
  presentDays: number; totalSalary: number; baseSalary: number; extraDays: number; extraPay: number
}
interface ProductivitySummary {
  staffTotals: { name: string; total: number; campaigns: Record<string, number> }[]
  campTotals: Record<string, number>
  totalForms: number
}

export default function AdminDashboard({ session }: { session: JWTPayload }) {
  const [payroll, setPayroll] = useState<StaffSummary[]>([])
  const [productivity, setProductivity] = useState<ProductivitySummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [preset, setPreset] = useState('thisMonth')

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
          <p className="text-slate-400 text-sm mt-1">Complete overview of staff performance & payroll</p>
        </div>
        <select
          className="input w-auto text-sm"
          value={preset}
          onChange={e => setPreset(e.target.value)}
        >
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
          <div className="text-xs text-slate-500 uppercase tracking-wide">Total Payroll</div>
          <div className="text-2xl font-bold text-yellow-400">{formatCurrency(totalPayroll)}</div>
          <div className="text-xs text-slate-500">{presetLabels[preset]}</div>
        </div>
      </div>

      {/* Productivity Summary */}
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
                                className="h-full bg-brand-600 rounded-full"
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
                <tr className="bg-slate-800/50">
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
