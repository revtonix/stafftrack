'use client'
// src/components/dashboard/PendingApprovals.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Drop this component anywhere in Admin or TL dashboard.
// Usage:
//   <PendingApprovals role={session.role} />
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback, useRef } from 'react'
import { formatCurrency } from '@/lib/salary'
import { ProtectedSalary } from '@/components/ui/ProtectedSalary'

interface PendingRecord {
  id:            string
  staffId:       string
  staffName:     string
  team:          'DAY' | 'NIGHT'
  date:          string
  checkIn:       string | null
  checkOut:      string | null
  hours:         number
  approvalStatus: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED'
  approvedByName?: string | null
  approvedAt?:    string | null
  approvedHours?: number | null
  approvalNote?:  string | null
  monthlySalary?: number
  earnedToday?:   number
}

function toIST(iso: string | null) {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true,
  }).format(new Date(iso))
}

// ── Adjust Hours Modal ────────────────────────────────────────────────────────
function AdjustModal({
  record,
  onConfirm,
  onClose,
}: {
  record:    PendingRecord
  onConfirm: (hours: number, note: string) => void
  onClose:   () => void
}) {
  const [hours, setHours] = useState(String(record.hours.toFixed(2)))
  const [note,  setNote]  = useState('')

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/60" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-sm shadow-2xl">
          <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
            <h3 className="font-bold text-white">Approve & Adjust Hours</h3>
            <button onClick={onClose} className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="px-6 py-5 space-y-4">
            <div>
              <p className="text-xs text-slate-500 mb-1">Staff</p>
              <p className="text-sm font-semibold text-white">{record.staffName}</p>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs text-slate-400">
              <div>Check In: <span className="text-emerald-400">{toIST(record.checkIn)}</span></div>
              <div>Check Out: <span className="text-red-400">{toIST(record.checkOut)}</span></div>
              <div>System Hours: <span className="text-white font-semibold">{record.hours.toFixed(2)}h</span></div>
            </div>
            <div>
              <label className="text-xs text-slate-500 block mb-1.5 uppercase tracking-wide">
                Approved Hours
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="24"
                value={hours}
                onChange={e => setHours(e.target.value)}
                className="input text-sm w-full"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 block mb-1.5 uppercase tracking-wide">
                Note (optional)
              </label>
              <input
                type="text"
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="e.g. Late arrival deducted"
                className="input text-sm w-full"
              />
            </div>
          </div>
          <div className="px-6 pb-6 flex gap-3">
            <button onClick={onClose} className="flex-1 btn-secondary btn-sm">Cancel</button>
            <button
              onClick={() => onConfirm(parseFloat(hours) || record.hours, note)}
              className="flex-1 btn-primary btn-sm"
            >
              Approve
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function PendingApprovals({ role }: { role: string }) {
  const [records,   setRecords]   = useState<PendingRecord[]>([])
  const [loading,   setLoading]   = useState(true)
  const [actionId,  setActionId]  = useState<string | null>(null)
  const [adjustRec, setAdjustRec] = useState<PendingRecord | null>(null)
  const [syncAgo,   setSyncAgo]   = useState(0)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const isAdmin = role === 'ADMIN'
  const canSeeSalary = isAdmin

  const fetch30s = useCallback(async () => {
    try {
      const res  = await fetch('/api/attendance?pending=1')
      const data = await res.json()
      setRecords(data.data ?? data.records ?? [])
      setSyncAgo(0)
    } catch (e) {
      console.error('[PendingApprovals]', e)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetch30s()
    pollRef.current = setInterval(fetch30s, 30_000)
    const tick = setInterval(() => setSyncAgo(s => s + 1), 1000)
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
      clearInterval(tick)
    }
  }, [fetch30s])

  // ── Approve ─────────────────────────────────────────────────────────────
  async function approve(id: string, approvedHours?: number, note?: string) {
    setActionId(id)
    try {
      const res = await fetch(`/api/attendance/${id}/approve`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ approvedHours, approvalNote: note }),
      })
      if (res.ok) {
        setRecords(prev => prev.filter(r => r.id !== id))
      }
    } catch (e) {
      console.error(e)
    }
    setActionId(null)
    setAdjustRec(null)
  }

  // ── Reject ──────────────────────────────────────────────────────────────
  async function reject(id: string) {
    setActionId(id)
    try {
      const res = await fetch(`/api/attendance/${id}/reject`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({}),
      })
      if (res.ok) {
        setRecords(prev => prev.filter(r => r.id !== id))
      }
    } catch (e) {
      console.error(e)
    }
    setActionId(null)
  }

  const syncLabel = syncAgo < 5 ? 'just now' : syncAgo < 60 ? `${syncAgo}s ago` : `${Math.floor(syncAgo / 60)}m ago`

  return (
    <>
      {adjustRec && (
        <AdjustModal
          record={adjustRec}
          onConfirm={(h, n) => approve(adjustRec.id, h, n)}
          onClose={() => setAdjustRec(null)}
        />
      )}

      <div className="card">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="font-semibold text-white">Pending Approvals</h2>
            {records.length > 0 && (
              <span className="text-xs font-bold bg-yellow-500/15 text-yellow-400 border border-yellow-500/25 px-2 py-0.5 rounded-full">
                {records.length}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-slate-500">synced {syncLabel}</span>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : records.length === 0 ? (
          <div className="text-center py-12 space-y-2">
            <div className="text-3xl">✅</div>
            <p className="text-slate-500 text-sm">All caught up — no pending approvals</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Staff</th>
                  <th>Team</th>
                  <th>Date</th>
                  <th>Check In</th>
                  <th>Check Out</th>
                  <th>Hours</th>
                  {canSeeSalary && <th>Est. Pay</th>}
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {records.map(r => {
                  const busy     = actionId === r.id
                  const monthly  = r.monthlySalary ?? 0
                  const hrRate   = monthly / 26 / 8
                  const estPay   = Math.round(r.hours * hrRate)

                  return (
                    <tr key={r.id} className={busy ? 'opacity-50 pointer-events-none' : ''}>
                      <td className="font-semibold text-white">{r.staffName}</td>
                      <td>
                        <span className={r.team === 'DAY' ? 'badge-yellow' : 'badge-purple'}>
                          {r.team === 'DAY' ? '☀ DAY' : '☽ NIGHT'}
                        </span>
                      </td>
                      <td className="text-slate-400 text-sm">
                        {new Intl.DateTimeFormat('en-IN', {
                          timeZone: 'Asia/Kolkata',
                          day: '2-digit', month: 'short',
                        }).format(new Date(r.date))}
                      </td>
                      <td className="text-emerald-400 font-mono text-xs">{toIST(r.checkIn)}</td>
                      <td className="text-red-400 font-mono text-xs">{toIST(r.checkOut)}</td>
                      <td className="font-mono font-semibold text-white">
                        {r.hours > 0 ? `${r.hours.toFixed(1)}h` : '—'}
                      </td>
                      {canSeeSalary && (
                        <td className="text-yellow-400 font-semibold text-sm">
                          {estPay > 0 ? <ProtectedSalary value={estPay} size="sm" className="font-semibold text-yellow-400" /> : '—'}
                        </td>
                      )}
                      <td>
                        <div className="flex items-center gap-2">
                          {/* Quick approve */}
                          <button
                            onClick={() => approve(r.id)}
                            disabled={busy}
                            className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 hover:bg-emerald-500/25 transition-colors disabled:opacity-40"
                          >
                            {busy ? '…' : 'Approve'}
                          </button>
                          {/* Adjust + approve */}
                          <button
                            onClick={() => setAdjustRec(r)}
                            disabled={busy}
                            className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-brand-500/15 text-brand-400 border border-brand-500/25 hover:bg-brand-500/25 transition-colors disabled:opacity-40"
                            title="Adjust hours before approving"
                          >
                            Adjust
                          </button>
                          {/* Reject */}
                          <button
                            onClick={() => reject(r.id)}
                            disabled={busy}
                            className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-red-500/15 text-red-400 border border-red-500/25 hover:bg-red-500/25 transition-colors disabled:opacity-40"
                          >
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}
