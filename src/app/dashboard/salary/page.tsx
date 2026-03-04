'use client'
// src/app/dashboard/salary/page.tsx
import { useState, useEffect } from 'react'
import { formatCurrency } from '@/lib/salary'

export default function SalaryPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [month, setMonth] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
  })

  useEffect(() => {
    setLoading(true)
    fetch(`/api/reports/salary?month=${month}`)
      .then(r => r.json())
      .then(d => { if (d.success) setData(d.data); setLoading(false) })
  }, [month])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">My Salary</h1>
        <p className="text-slate-400 text-sm mt-1">Monthly earnings breakdown</p>
      </div>

      <div className="flex items-center gap-3">
        <div>
          <label className="label">Month</label>
          <input type="month" className="input w-auto text-sm" value={month} onChange={e => setMonth(e.target.value)} />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : data && (
        <div className="space-y-4">
          {/* Big salary card */}
          <div className="card p-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <p className="text-slate-400 text-sm mb-2">Total Salary — {data.month}</p>
                <div className="text-5xl font-bold text-white">{formatCurrency(data.totalSalary)}</div>
                {data.extraPay > 0 && (
                  <p className="text-emerald-400 text-sm mt-2">
                    Includes {formatCurrency(data.extraPay)} extra for {data.extraDays} extra days 🎉
                  </p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Present Days', value: data.presentDays, color: 'text-emerald-400' },
                  { label: 'Extra Days', value: data.extraDays, color: 'text-yellow-400' },
                  { label: 'Base Salary', value: formatCurrency(data.baseSalary), color: 'text-brand-400' },
                  { label: 'Extra Pay', value: formatCurrency(data.extraPay), color: 'text-emerald-400' },
                ].map(item => (
                  <div key={item.label} className="bg-slate-800 rounded-xl p-4 text-center">
                    <div className={`text-xl font-bold ${item.color}`}>{item.value}</div>
                    <div className="text-xs text-slate-500 mt-1">{item.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Salary rule explanation */}
          <div className="card p-5 bg-slate-800/30">
            <h3 className="font-semibold text-white mb-3">Salary Calculation Rule</h3>
            <div className="space-y-2 text-sm text-slate-400">
              <p>• Base salary is paid for <span className="text-white">26 working days</span> per month</p>
              <p>• Extra days are calculated at <span className="text-white">{formatCurrency(data.baseSalary / 30)}/day</span> (monthly ÷ 30)</p>
              <p>• For {data.presentDays} days present: <span className="text-brand-400 font-semibold">{formatCurrency(data.totalSalary)}</span></p>
            </div>
          </div>

          {/* Approved leaves */}
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
                        <td>{new Date(l.dateFrom).toLocaleDateString('en-IN')}</td>
                        <td>{new Date(l.dateTo).toLocaleDateString('en-IN')}</td>
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
