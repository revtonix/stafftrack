'use client'
// src/app/dashboard/admin/page.tsx
import { useState, useEffect } from 'react'
import { formatCurrency } from '@/lib/salary'

export default function AdminPage() {
  const [staff, setStaff] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [editData, setEditData] = useState<any>({})
  const [form, setForm] = useState({ username: '', password: '', role: 'STAFF', team: 'DAY', monthlySalary: 10000 })
  const [msg, setMsg] = useState('')

  useEffect(() => { fetchStaff() }, [])

  async function fetchStaff() {
    setLoading(true)
    const res = await fetch('/api/staff')
    const d = await res.json()
    if (d.success) setStaff(d.data)
    setLoading(false)
  }

  async function createStaff() {
    const res = await fetch('/api/staff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const d = await res.json()
    if (d.success) { setMsg('Staff created!'); setShowCreate(false); fetchStaff() }
    else setMsg(d.error || 'Error')
  }

  async function updateStaff(id: string) {
    const payload: any = {}
    if (editData.monthlySalary) payload.monthlySalary = Number(editData.monthlySalary)
    if (editData.team) payload.team = editData.team
    if (editData.isActive !== undefined) payload.isActive = editData.isActive
    if (editData.password) payload.password = editData.password

    const res = await fetch(`/api/staff/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const d = await res.json()
    if (d.success) { setMsg('Updated!'); setEditId(null); fetchStaff() }
    else setMsg(d.error || 'Error')
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Staff Management</h1>
          <p className="text-slate-400 text-sm mt-1">Create and manage staff accounts</p>
        </div>
        <button className="btn-primary" onClick={() => setShowCreate(!showCreate)}>
          + Add Staff
        </button>
      </div>

      {msg && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm rounded-xl px-4 py-3">
          {msg}
        </div>
      )}

      {/* Create Form */}
      {showCreate && (
        <div className="card p-6">
          <h2 className="font-semibold text-white mb-4">New Staff Account</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="label">Username</label>
              <input className="input" placeholder="e.g. JOHN" value={form.username} onChange={e => setForm(p => ({...p, username: e.target.value}))} />
            </div>
            <div>
              <label className="label">Password</label>
              <input type="password" className="input" placeholder="Min 6 chars" value={form.password} onChange={e => setForm(p => ({...p, password: e.target.value}))} />
            </div>
            <div>
              <label className="label">Role</label>
              <select className="input" value={form.role} onChange={e => setForm(p => ({...p, role: e.target.value}))}>
                <option value="STAFF">Staff</option>
                <option value="TEAM_LEAD_DAY">Team Lead Day</option>
                <option value="TEAM_LEAD_NIGHT">Team Lead Night</option>
              </select>
            </div>
            <div>
              <label className="label">Team</label>
              <select className="input" value={form.team} onChange={e => setForm(p => ({...p, team: e.target.value}))}>
                <option value="DAY">Day</option>
                <option value="NIGHT">Night</option>
              </select>
            </div>
            <div>
              <label className="label">Monthly Salary (₹)</label>
              <input type="number" className="input" value={form.monthlySalary} onChange={e => setForm(p => ({...p, monthlySalary: Number(e.target.value)}))} />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button className="btn-primary" onClick={createStaff}>Create Staff</button>
            <button className="btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Staff Table */}
      <div className="card">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Username</th><th>Team</th><th>Salary</th><th>Status</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {staff.map(s => (
                  <>
                    <tr key={s.id}>
                      <td className="font-semibold text-white">{s.username}</td>
                      <td><span className={s.team === 'DAY' ? 'badge-yellow' : 'badge-purple'}>{s.team || '—'}</span></td>
                      <td>{formatCurrency(s.monthlySalary || 0)}</td>
                      <td>
                        <span className={s.isActive !== false ? 'badge-green' : 'badge-red'}>
                          {s.isActive !== false ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>
                        <button
                          className="btn-secondary btn-sm"
                          onClick={() => {
                            setEditId(editId === s.id ? null : s.id)
                            setEditData({ monthlySalary: s.monthlySalary, team: s.team, isActive: s.isActive !== false })
                          }}
                        >
                          {editId === s.id ? 'Cancel' : 'Edit'}
                        </button>
                      </td>
                    </tr>
                    {editId === s.id && (
                      <tr key={s.id + '-edit'}>
                        <td colSpan={5} className="bg-slate-800/50">
                          <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div>
                              <label className="label">Salary</label>
                              <input type="number" className="input text-sm" value={editData.monthlySalary || ''} onChange={e => setEditData((p: any) => ({...p, monthlySalary: e.target.value}))} />
                            </div>
                            <div>
                              <label className="label">Team</label>
                              <select className="input text-sm" value={editData.team || 'DAY'} onChange={e => setEditData((p: any) => ({...p, team: e.target.value}))}>
                                <option value="DAY">DAY</option>
                                <option value="NIGHT">NIGHT</option>
                              </select>
                            </div>
                            <div>
                              <label className="label">Status</label>
                              <select className="input text-sm" value={editData.isActive ? 'true' : 'false'} onChange={e => setEditData((p: any) => ({...p, isActive: e.target.value === 'true'}))}>
                                <option value="true">Active</option>
                                <option value="false">Inactive</option>
                              </select>
                            </div>
                            <div>
                              <label className="label">Reset Password</label>
                              <input type="password" className="input text-sm" placeholder="New password" value={editData.password || ''} onChange={e => setEditData((p: any) => ({...p, password: e.target.value}))} />
                            </div>
                            <div className="col-span-2 md:col-span-4">
                              <button className="btn-primary btn-sm" onClick={() => updateStaff(s.id)}>Save Changes</button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
