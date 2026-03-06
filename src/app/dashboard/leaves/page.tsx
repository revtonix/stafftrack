'use client'
// src/app/dashboard/leaves/page.tsx
import { useState, useEffect } from 'react'
export default function LeavesPage() {
  const [leaves, setLeaves] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ dateFrom: '', dateTo: '', type: 'PAID', reason: '' })
  const [submitting, setSubmitting] = useState(false)
  const [msg, setMsg] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => {
      if (d.success) setIsAdmin(d.data.role === 'ADMIN')
    }).catch(() => {})
    fetchLeaves()
  }, [])

  async function fetchLeaves() {
    setLoading(true)
    try {
      const res = await fetch('/api/leaves')
      const d = await res.json()
      if (d.success) setLeaves(d.data)
    } catch {
      setMsg('Failed to load leaves')
    }
    setLoading(false)
  }

  async function applyLeave() {
    if (!form.dateFrom || !form.dateTo || !form.reason) { setMsg('Please fill all fields'); return }
    setSubmitting(true)
    const res = await fetch('/api/leaves', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const d = await res.json()
    if (d.success) { setMsg('Leave applied successfully!'); setForm({ dateFrom: '', dateTo: '', type: 'PAID', reason: '' }); fetchLeaves() }
    else setMsg(d.error || 'Failed to apply')
    setSubmitting(false)
  }

  async function decide(id: string, status: 'APPROVED' | 'REJECTED') {
    const res = await fetch(`/api/leaves/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    const d = await res.json()
    if (d.success) fetchLeaves()
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Leaves</h1>
        <p className="text-slate-400 text-sm mt-1">{isAdmin ? 'Manage leave requests' : 'Apply and track your leaves'}</p>
      </div>

      {/* Apply Leave Form (staff only) */}
      {!isAdmin && (
        <div className="card p-6">
          <h2 className="font-semibold text-white mb-4">Apply for Leave</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">From Date</label>
              <input type="date" className="input" value={form.dateFrom} onChange={e => setForm(p => ({...p, dateFrom: e.target.value}))} />
            </div>
            <div>
              <label className="label">To Date</label>
              <input type="date" className="input" value={form.dateTo} onChange={e => setForm(p => ({...p, dateTo: e.target.value}))} />
            </div>
            <div>
              <label className="label">Type</label>
              <select className="input" value={form.type} onChange={e => setForm(p => ({...p, type: e.target.value}))}>
                <option value="PAID">Paid Leave</option>
                <option value="UNPAID">Unpaid Leave</option>
              </select>
            </div>
            <div>
              <label className="label">Reason</label>
              <input type="text" className="input" placeholder="Reason for leave..." value={form.reason} onChange={e => setForm(p => ({...p, reason: e.target.value}))} />
            </div>
          </div>
          {msg && <p className="mt-3 text-sm text-emerald-400">{msg}</p>}
          <button className="btn-primary mt-4" onClick={applyLeave} disabled={submitting}>
            {submitting ? 'Submitting...' : 'Apply Leave'}
          </button>
        </div>
      )}

      {/* Leave Records */}
      <div className="card">
        <div className="px-6 py-4 border-b border-slate-800">
          <h2 className="font-semibold text-white">Leave Requests</h2>
        </div>
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : leaves.length === 0 ? (
          <div className="text-center py-16 text-slate-500">No leave requests</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  {isAdmin && <th>Staff</th>}
                  <th>From</th><th>To</th><th>Type</th>
                  <th className="hidden md:table-cell">Reason</th>
                  <th>Status</th>
                  {isAdmin && <th>Action</th>}
                </tr>
              </thead>
              <tbody>
                {leaves.map((l: any) => (
                  <tr key={l.id}>
                    {isAdmin && <td className="font-semibold text-white">{l.staff?.username}</td>}
                    <td>{new Date(l.dateFrom).toLocaleDateString('en-IN')}</td>
                    <td>{new Date(l.dateTo).toLocaleDateString('en-IN')}</td>
                    <td><span className={l.type === 'PAID' ? 'badge-green' : 'badge-red'}>{l.type}</span></td>
                    <td className="hidden md:table-cell text-slate-400 text-xs max-w-xs truncate">{l.reason}</td>
                    <td>
                      <span className={l.status === 'APPROVED' ? 'badge-green' : l.status === 'REJECTED' ? 'badge-red' : 'badge-yellow'}>
                        {l.status}
                      </span>
                    </td>
                    {isAdmin && l.status === 'PENDING' && (
                      <td>
                        <div className="flex gap-2">
                          <button className="btn-success btn-sm" onClick={() => decide(l.id, 'APPROVED')}>✓</button>
                          <button className="btn-danger btn-sm" onClick={() => decide(l.id, 'REJECTED')}>✗</button>
                        </div>
                      </td>
                    )}
                    {isAdmin && l.status !== 'PENDING' && <td className="text-slate-500 text-xs">—</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
