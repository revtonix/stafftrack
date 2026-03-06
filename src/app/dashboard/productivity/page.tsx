'use client'
// src/app/dashboard/productivity/page.tsx
import { useState, useEffect } from 'react'

export default function ProductivityPage() {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [from, setFrom] = useState(() => {
    const d = new Date(); d.setDate(1); return d.toISOString().split('T')[0]
  })
  const [to, setTo] = useState(() => new Date().toISOString().split('T')[0])

  useEffect(() => {
    setLoading(true)
    fetch(`/api/worklogs?from=${from}&to=${to}`)
      .then(r => r.json())
      .then(d => { if (d.success) setLogs(d.data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [from, to])

  // Group by date
  const byDate = logs.reduce((acc: Record<string, any[]>, log) => {
    const d = log.date.split('T')[0]
    if (!acc[d]) acc[d] = []
    acc[d].push(log)
    return acc
  }, {})

  const totalForms = logs.reduce((a, l) => a + l.formsCount, 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Productivity History</h1>
        <p className="text-slate-400 text-sm mt-1">Your hourly form submissions</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div>
          <label className="label">From</label>
          <input type="date" className="input w-auto text-sm" value={from} onChange={e => setFrom(e.target.value)} />
        </div>
        <div>
          <label className="label">To</label>
          <input type="date" className="input w-auto text-sm" value={to} onChange={e => setTo(e.target.value)} />
        </div>
        <div className="pt-5 text-sm text-slate-400">
          <span className="font-bold text-white">{totalForms}</span> total forms
        </div>
      </div>

      {/* Grouped by date */}
      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : Object.keys(byDate).length === 0 ? (
        <div className="card text-center py-16 text-slate-500">No productivity records for this period</div>
      ) : (
        Object.entries(byDate).sort(([a], [b]) => b.localeCompare(a)).map(([date, dayLogs]) => {
          const dayTotal = dayLogs.reduce((a: number, l: any) => a + l.formsCount, 0)
          return (
            <div key={date} className="card">
              <div className="px-6 py-3 border-b border-slate-800 flex items-center justify-between">
                <span className="font-semibold text-white">
                  {new Date(date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
                </span>
                <span className="badge-blue">{dayTotal} forms</span>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr><th>Hour</th><th>Campaign</th><th>Forms</th><th className="hidden md:table-cell">Note</th></tr>
                  </thead>
                  <tbody>
                    {dayLogs.sort((a: any, b: any) => a.hourIndex - b.hourIndex).map((l: any) => (
                      <tr key={l.id}>
                        <td><span className="badge-purple">H{l.hourIndex}</span></td>
                        <td className="text-slate-300">{l.campaign?.name}</td>
                        <td className="font-bold text-brand-400">{l.formsCount}</td>
                        <td className="hidden md:table-cell text-slate-500 text-xs">{l.note || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}
