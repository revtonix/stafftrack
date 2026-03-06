'use client'
import { useEffect, useState, useCallback, useMemo, useRef } from 'react'

interface Staff {
  id: string
  username: string
  team: string
  monthlySalary: number
  role: string
}

interface Toast {
  id: number
  type: 'success' | 'error'
  message: string
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function ToastStack({ toasts, onRemove }: { toasts: Toast[]; onRemove: (id: number) => void }) {
  return (
    <div className="fixed top-5 right-5 z-[100] flex flex-col gap-2 w-80 pointer-events-none">
      {toasts.map(t => (
        <ToastItem key={t.id} toast={t} onRemove={onRemove} />
      ))}
    </div>
  )
}

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: number) => void }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true))
    const hide = setTimeout(() => setVisible(false), 3000)
    const remove = setTimeout(() => onRemove(toast.id), 3400)
    return () => { clearTimeout(hide); clearTimeout(remove) }
  }, [toast.id, onRemove])

  return (
    <div
      className={`pointer-events-auto flex items-start gap-3 bg-white border rounded-2xl px-4 py-3 shadow-xl transition-all duration-300 ${
        visible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'
      } ${toast.type === 'success' ? 'border-emerald-200' : 'border-red-200'}`}
    >
      <div className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
        toast.type === 'success' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'
      }`}>
        {toast.type === 'success'
          ? <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
          : <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
        }
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-800">{toast.type === 'success' ? 'Success' : 'Error'}</p>
        <p className="text-xs text-slate-500 mt-0.5">{toast.message}</p>
      </div>
      <button
        onClick={() => onRemove(toast.id)}
        className="text-slate-400 hover:text-slate-600 transition-colors shrink-0"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
      </button>
    </div>
  )
}

// ─── Drawer ───────────────────────────────────────────────────────────────────
function EditDrawer({
  staff,
  onClose,
  onSave,
}: {
  staff: Staff
  onClose: () => void
  onSave: (id: string, username: string, monthlySalary: number) => Promise<void>
}) {
  const [name, setName] = useState(staff.username)
  const [salary, setSalary] = useState(String(staff.monthlySalary))
  const [saving, setSaving] = useState(false)
  const [nameErr, setNameErr] = useState('')
  const [salaryErr, setSalaryErr] = useState('')
  const [open, setOpen] = useState(false)
  const nameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    requestAnimationFrame(() => setOpen(true))
    nameRef.current?.focus()

    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const handleClose = () => {
    setOpen(false)
    setTimeout(onClose, 300)
  }

  const validate = () => {
    let ok = true
    if (!name.trim()) { setNameErr('Name is required'); ok = false } else setNameErr('')
    const n = Number(salary)
    if (!salary || isNaN(n) || n <= 0) { setSalaryErr('Enter a valid positive amount'); ok = false } else setSalaryErr('')
    return ok
  }

  const handleSave = async () => {
    if (!validate()) return
    setSaving(true)
    await onSave(staff.id, name.trim(), Number(salary))
    setSaving(false)
  }

  const dailyRate = !isNaN(Number(salary)) && Number(salary) > 0 ? Math.round(Number(salary) / 26) : 0
  const hourlyRate = dailyRate ? Math.round(dailyRate / 8) : 0
  const fmt = (n: number) => `₹${n.toLocaleString('en-IN')}`

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Overlay */}
      <div
        className={`absolute inset-0 bg-slate-900/30 backdrop-blur-[2px] transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0'}`}
        onClick={handleClose}
      />

      {/* Drawer — slides from right */}
      <div
        className={`absolute top-0 right-0 h-full w-full sm:w-[420px] bg-white shadow-2xl flex flex-col transition-transform duration-300 ease-out ${open ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-800">Edit Staff Profile</h2>
            <p className="text-xs text-slate-400 mt-0.5">Update name or salary below</p>
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Staff identity card */}
        <div className="mx-6 mt-6 bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-100 flex items-center justify-center text-indigo-700 text-lg font-bold shrink-0">
            {staff.username.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-slate-800 truncate">{staff.username}</p>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${
                staff.team === 'DAY'
                  ? 'bg-amber-50 border-amber-200 text-amber-700'
                  : 'bg-blue-50 border-blue-200 text-blue-700'
              }`}>
                {staff.team === 'DAY' ? '☀️ Day' : '🌙 Night'}
              </span>
              <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{staff.role}</span>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {/* Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Display Name <span className="text-red-400">*</span>
            </label>
            <input
              ref={nameRef}
              type="text"
              value={name}
              onChange={e => { setName(e.target.value); if (nameErr) setNameErr('') }}
              className={`w-full bg-white border rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 transition-all ${
                nameErr
                  ? 'border-red-300 focus:ring-red-200 focus:border-red-400'
                  : 'border-slate-200 focus:ring-indigo-100 focus:border-indigo-400'
              }`}
              placeholder="Enter full name"
            />
            {nameErr && (
              <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                {nameErr}
              </p>
            )}
          </div>

          {/* Salary */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Monthly Salary <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-semibold">₹</span>
              <input
                type="number"
                value={salary}
                onChange={e => { setSalary(e.target.value); if (salaryErr) setSalaryErr('') }}
                className={`w-full bg-white border rounded-xl pl-8 pr-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 transition-all ${
                  salaryErr
                    ? 'border-red-300 focus:ring-red-200 focus:border-red-400'
                    : 'border-slate-200 focus:ring-indigo-100 focus:border-indigo-400'
                }`}
                placeholder="e.g. 10000"
                min={1}
              />
            </div>
            {salaryErr && (
              <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                {salaryErr}
              </p>
            )}

            {/* Breakdown */}
            {hourlyRate > 0 && (
              <div className="mt-3 bg-indigo-50 border border-indigo-100 rounded-xl p-3 grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-indigo-400 font-medium">Daily Rate</p>
                  <p className="text-sm font-bold text-indigo-700">{fmt(dailyRate)}</p>
                </div>
                <div>
                  <p className="text-xs text-indigo-400 font-medium">Hourly Rate</p>
                  <p className="text-sm font-bold text-indigo-700">{fmt(hourlyRate)}</p>
                </div>
                <p className="col-span-2 text-xs text-indigo-400 -mt-1">Based on 26 working days × 8 hrs</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-5 border-t border-slate-100 flex gap-3">
          <button
            onClick={handleClose}
            className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold py-2.5 rounded-xl text-sm transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-400 text-white font-semibold py-2.5 rounded-xl text-sm transition-all shadow-md shadow-indigo-200 flex items-center justify-center gap-2"
          >
            {saving && (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
            )}
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function SkeletonRows() {
  return (
    <>
      {[1,2,3,4,5,6,7].map(i => (
        <tr key={i} className="border-b border-slate-100">
          <td className="py-4 px-5"><div className="w-6 h-3 bg-slate-200 rounded animate-pulse" /></td>
          <td className="py-4 px-5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-slate-200 animate-pulse" />
              <div className="h-3.5 w-28 bg-slate-200 rounded animate-pulse" />
            </div>
          </td>
          <td className="py-4 px-4"><div className="h-5 w-16 bg-slate-200 rounded-full animate-pulse" /></td>
          <td className="py-4 px-4"><div className="h-5 w-14 bg-slate-200 rounded-lg animate-pulse" /></td>
          <td className="py-4 px-4"><div className="h-3.5 w-20 bg-slate-200 rounded animate-pulse" /></td>
          <td className="py-4 px-4"><div className="h-3.5 w-16 bg-slate-200 rounded animate-pulse" /></td>
          <td className="py-4 px-5 text-right"><div className="h-7 w-14 bg-slate-200 rounded-lg animate-pulse ml-auto" /></td>
        </tr>
      ))}
    </>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function StaffManagementPage() {
  const [staff, setStaff] = useState<Staff[]>([])
  const [loading, setLoading] = useState(true)
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null)
  const [search, setSearch] = useState('')
  const [teamFilter, setTeamFilter] = useState<'ALL' | 'DAY' | 'NIGHT'>('ALL')
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((type: 'success' | 'error', message: string) => {
    setToasts(prev => [...prev, { id: Date.now(), type, message }])
  }, [])

  const removeToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const fetchStaff = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/staff')
      const data = await res.json()
      setStaff(data.staff || [])
    } catch {
      addToast('error', 'Could not load staff list')
    }
    setLoading(false)
  }, [addToast])

  useEffect(() => { fetchStaff() }, [fetchStaff])

  const handleSave = async (id: string, username: string, monthlySalary: number) => {
    try {
      const res = await fetch(`/api/staff/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, monthlySalary }),
      })
      if (res.ok) {
        addToast('success', 'Staff profile updated successfully')
        setEditingStaff(null)
        fetchStaff()
      } else {
        addToast('error', 'Failed to save changes')
      }
    } catch {
      addToast('error', 'Network error, please retry')
    }
  }

  const filtered = useMemo(() =>
    staff.filter(s => {
      const q = search.toLowerCase()
      const matchSearch = s.username.toLowerCase().includes(q) || s.team.toLowerCase().includes(q) || s.role.toLowerCase().includes(q)
      const matchTeam = teamFilter === 'ALL' || s.team === teamFilter
      return matchSearch && matchTeam
    }), [staff, search, teamFilter])

  const fmt = (n: number) => `₹${n.toLocaleString('en-IN')}`
  const dayCount = staff.filter(s => s.team === 'DAY').length
  const nightCount = staff.filter(s => s.team === 'NIGHT').length

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <ToastStack toasts={toasts} onRemove={removeToast} />
      {editingStaff && <EditDrawer staff={editingStaff} onClose={() => setEditingStaff(null)} onSave={handleSave} />}

      {/* Sticky top bar */}
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200 px-4 md:px-8 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          {/* Title */}
          <div className="shrink-0">
            <h1 className="text-xl font-bold text-slate-800 leading-tight">Staff Management</h1>
            <p className="text-xs text-slate-400 mt-0.5">Admin can update staff name & salary</p>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
            {/* Search */}
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search staff…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="bg-slate-100 border border-transparent focus:bg-white focus:border-slate-200 rounded-xl pl-8 pr-3 py-2 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all w-44"
              />
            </div>

            {/* Team filter */}
            <div className="flex items-center bg-slate-100 rounded-xl p-1 gap-0.5">
              {(['ALL', 'DAY', 'NIGHT'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setTeamFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    teamFilter === f ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {f === 'ALL' ? 'All' : f === 'DAY' ? '☀️ Day' : '🌙 Night'}
                </button>
              ))}
            </div>

            {/* Refresh */}
            <button
              onClick={fetchStaff}
              className="flex items-center gap-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 px-3 py-2 rounded-xl text-sm font-medium shadow-sm transition-all"
            >
              <svg className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="px-4 md:px-8 py-6 max-w-7xl mx-auto">
        {/* Stat chips */}
        <div className="flex flex-wrap gap-3 mb-6">
          {[
            { label: 'Total', value: staff.length, color: 'bg-indigo-50 text-indigo-700 border-indigo-100' },
            { label: '☀️ Day', value: dayCount, color: 'bg-amber-50 text-amber-700 border-amber-100' },
            { label: '🌙 Night', value: nightCount, color: 'bg-blue-50 text-blue-700 border-blue-100' },
          ].map(chip => (
            <div key={chip.label} className={`flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-semibold ${chip.color}`}>
              <span>{chip.label}</span>
              <span className="font-bold">{chip.value}</span>
            </div>
          ))}
          {search && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-full border border-slate-200 bg-white text-sm text-slate-500">
              Showing <strong className="text-slate-700">{filtered.length}</strong> result{filtered.length !== 1 ? 's' : ''}
              <button onClick={() => setSearch('')} className="ml-1 text-slate-400 hover:text-slate-600">×</button>
            </div>
          )}
        </div>

        {/* Table card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="text-left py-3.5 px-5 text-xs font-semibold uppercase tracking-wider text-slate-400 w-12">#</th>
                  <th className="text-left py-3.5 px-5 text-xs font-semibold uppercase tracking-wider text-slate-400">Staff Member</th>
                  <th className="text-left py-3.5 px-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Team</th>
                  <th className="text-left py-3.5 px-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Role</th>
                  <th className="text-left py-3.5 px-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Monthly Salary</th>
                  <th className="text-left py-3.5 px-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Hourly Rate</th>
                  <th className="text-right py-3.5 px-5 text-xs font-semibold uppercase tracking-wider text-slate-400">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <SkeletonRows />
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-20 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-2xl">
                          {search ? '🔍' : '👥'}
                        </div>
                        <p className="font-semibold text-slate-600">
                          {search ? `No results for "${search}"` : 'No staff members found'}
                        </p>
                        <p className="text-xs text-slate-400">
                          {search ? 'Try a different search term.' : 'Staff will appear here once added.'}
                        </p>
                        {search && (
                          <button onClick={() => setSearch('')} className="text-xs text-indigo-600 hover:underline mt-1">
                            Clear search
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filtered.map((s, i) => (
                    <tr key={s.id} className="hover:bg-indigo-50/30 transition-colors group">
                      <td className="py-4 px-5 text-slate-400 text-xs">{i + 1}</td>
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-50 to-indigo-100 border border-indigo-200/60 flex items-center justify-center text-sm font-bold text-indigo-600 shrink-0">
                            {s.username.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-semibold text-slate-800">{s.username}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                          s.team === 'DAY'
                            ? 'bg-amber-50 border-amber-200 text-amber-700'
                            : 'bg-blue-50 border-blue-200 text-blue-700'
                        }`}>
                          {s.team === 'DAY' ? '☀️' : '🌙'} {s.team}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-xs text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg font-medium">{s.role}</span>
                      </td>
                      <td className="py-4 px-4 font-semibold text-slate-700">{fmt(s.monthlySalary)}</td>
                      <td className="py-4 px-4 text-slate-400 text-xs font-mono">
                        {fmt(Math.round(s.monthlySalary / 26 / 8))}<span className="text-slate-300">/hr</span>
                      </td>
                      <td className="py-4 px-5 text-right">
                        <button
                          onClick={() => setEditingStaff(s)}
                          className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-3.5 py-1.5 rounded-lg transition-all shadow-sm shadow-indigo-100 opacity-70 group-hover:opacity-100"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Table footer */}
          {!loading && filtered.length > 0 && (
            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/60 flex items-center justify-between">
              <span className="text-xs text-slate-400">
                {filtered.length} of {staff.length} staff members
              </span>
              <span className="text-xs text-slate-400">Click Edit to open staff drawer</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
