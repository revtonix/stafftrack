'use client'
// src/components/dashboard/StaffDashboard.tsx
import { useState, useEffect, useCallback } from 'react'
import { formatTime, formatCurrency } from '@/lib/salary'
import { getShiftDateStr, getCurrentShift, getShiftLabel, getISTTimeString, getISTFullDate } from '@/lib/shiftDay'
import type { JWTPayload } from '@/lib/auth'

interface Campaign { id: string; name: string; team: string }
interface AttendanceRecord { id: string; date: string; checkIn: string | null; checkOut: string | null }
interface WorkLog { id: string; hourIndex: number; campaignId: string; formsCount: number; note?: string; campaign: { name: string } }
interface SalarySummary { baseSalary: number; extraDays: number; extraPay: number; totalSalary: number; presentDays: number }

export default function StaffDashboard({ session }: { session: JWTPayload }) {
  const [now, setNow] = useState(new Date())
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [todayAtt, setTodayAtt] = useState<AttendanceRecord | null>(null)
  const [workLogs, setWorkLogs] = useState<WorkLog[]>([])
  const [salary, setSalary] = useState<SalarySummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [checkLoading, setCheckLoading] = useState(false)

  // Per-hour form state
  const [hourData, setHourData] = useState<Record<number, { campaignId: string; formsCount: string; note: string; saving: boolean; saved: boolean }>>({})

  // Use shift-day logic: before 7 AM IST = previous day's shift
  const todayStr = getShiftDateStr(now)

  // Live clock
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const fetchAll = useCallback(async () => {
    setLoading(true)
    const [campRes, attRes, logRes, salRes] = await Promise.all([
      fetch('/api/campaigns'),
      fetch(`/api/attendance?from=${todayStr}&to=${todayStr}`),
      fetch(`/api/worklogs?date=${todayStr}`),
      fetch('/api/reports/salary'),
    ])
    const [camp, att, logs, sal] = await Promise.all([campRes.json(), attRes.json(), logRes.json(), salRes.json()])

    if (camp.success) setCampaigns(camp.data)
    if (att.success) setTodayAtt(att.data[0] || null)
    if (sal.success) setSalary(sal.data)

    if (logs.success) {
      setWorkLogs(logs.data)
      const init: typeof hourData = {}
      for (let h = 1; h <= 12; h++) {
        const existing = logs.data.find((l: WorkLog) => l.hourIndex === h)
        init[h] = {
          campaignId: existing?.campaignId || (camp.data[0]?.id || ''),
          formsCount: existing?.formsCount?.toString() || '',
          note: existing?.note || '',
          saving: false,
          saved: !!existing,
        }
      }
      setHourData(init)
    }
    setLoading(false)
  }, [todayStr])

  useEffect(() => { fetchAll() }, [fetchAll])

  async function handleCheckIn() {
    setCheckLoading(true)
    const res = await fetch('/api/attendance', { method: 'POST' })
    const data = await res.json()
    if (data.success) setTodayAtt(data.data)
    setCheckLoading(false)
  }

  async function handleCheckOut() {
    setCheckLoading(true)
    const res = await fetch('/api/attendance', { method: 'PATCH' })
    const data = await res.json()
    if (data.success) setTodayAtt(data.data)
    setCheckLoading(false)
  }

  async function saveHour(hourIndex: number) {
    const h = hourData[hourIndex]
    if (!h || !h.campaignId) return

    setHourData(prev => ({ ...prev, [hourIndex]: { ...prev[hourIndex], saving: true } }))

    const res = await fetch('/api/worklogs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        campaignId: h.campaignId,
        date: todayStr,
        hourIndex,
        formsCount: parseInt(h.formsCount || '0'),
        note: h.note || undefined,
      }),
    })
    const data = await res.json()
    setHourData(prev => ({ ...prev, [hourIndex]: { ...prev[hourIndex], saving: false, saved: data.success } }))
    if (data.success) fetchAll()
  }

  const checkedIn = !!todayAtt?.checkIn
  const checkedOut = !!todayAtt?.checkOut
  const totalFormsToday = workLogs.reduce((a, l) => a + l.formsCount, 0)
  const workedHours = workLogs.filter(l => l.formsCount > 0).length

  const h = now.getHours()
  const greeting = h < 12 ? 'Good Morning' : h < 17 ? 'Good Afternoon' : 'Good Evening'
  const shiftType = getCurrentShift(now)
  const shiftLabel = getShiftLabel(now)

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">{greeting}, {session.username} 👋</h1>
        <p className="text-slate-400 text-sm mt-1">
          {getISTFullDate(now)}
          {' '}&middot;{' '}
          <span className={shiftType === 'MORNING' ? 'text-yellow-400' : 'text-purple-400'}>{shiftLabel}</span>
        </p>
      </div>

      {/* Check In/Out + Clock */}
      <div className="card p-6">
        <div className="flex flex-col md:flex-row md:items-center gap-6">
          {/* Clock */}
          <div className="flex-1 text-center md:text-left">
            <div className="text-4xl font-bold text-white tabular-nums tracking-tight">
              {getISTTimeString(now)} <span className="text-lg text-slate-500">IST</span>
            </div>
            <div className="mt-2 flex items-center gap-2 justify-center md:justify-start">
              {checkedIn && !checkedOut && (
                <span className="flex items-center gap-1.5 text-emerald-400 text-sm">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse-soft" />
                  Working since {formatTime(todayAtt?.checkIn || null)}
                </span>
              )}
              {checkedOut && (
                <span className="badge-green text-sm">Day Complete ✓</span>
              )}
              {!checkedIn && (
                <span className="badge-red text-sm">Not checked in</span>
              )}
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 justify-center">
            <button
              onClick={handleCheckIn}
              disabled={checkedIn || checkLoading}
              className="btn-success btn-lg"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
              Check In
            </button>
            <button
              onClick={handleCheckOut}
              disabled={!checkedIn || checkedOut || checkLoading}
              className="btn-danger btn-lg"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
              Check Out
            </button>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="text-xs text-slate-500 uppercase tracking-wide">Today's Forms</div>
          <div className="text-3xl font-bold text-white">{totalFormsToday}</div>
          <div className="text-xs text-slate-500">{workedHours}/12 hours filled</div>
        </div>
        <div className="stat-card">
          <div className="text-xs text-slate-500 uppercase tracking-wide">Days Present</div>
          <div className="text-3xl font-bold text-emerald-400">{salary?.presentDays || 0}</div>
          <div className="text-xs text-slate-500">This month</div>
        </div>
        <div className="stat-card">
          <div className="text-xs text-slate-500 uppercase tracking-wide">Base Salary</div>
          <div className="text-2xl font-bold text-brand-400">{formatCurrency(salary?.baseSalary || 0)}</div>
          <div className="text-xs text-slate-500">Monthly</div>
        </div>
        <div className="stat-card">
          <div className="text-xs text-slate-500 uppercase tracking-wide">Total Earned</div>
          <div className="text-2xl font-bold text-white">{formatCurrency(salary?.totalSalary || 0)}</div>
          {(salary?.extraPay || 0) > 0 && (
            <div className="text-xs text-emerald-400">+{formatCurrency(salary?.extraPay || 0)} extra</div>
          )}
        </div>
      </div>

      {/* Hourly Productivity Grid */}
      <div className="card">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-white">Today's Productivity</h2>
            <p className="text-xs text-slate-500 mt-0.5">Fill in forms count for each hour</p>
          </div>
          <div className="text-sm text-slate-400">
            <span className="font-bold text-white">{totalFormsToday}</span> total forms
          </div>
        </div>

        <div className="p-4 space-y-2">
          {/* Header */}
          <div className="hidden md:grid grid-cols-12 gap-2 px-2 mb-1">
            <div className="col-span-1 text-xs text-slate-500 uppercase">Hour</div>
            <div className="col-span-5 text-xs text-slate-500 uppercase">Campaign</div>
            <div className="col-span-2 text-xs text-slate-500 uppercase">Forms</div>
            <div className="col-span-3 text-xs text-slate-500 uppercase">Note</div>
            <div className="col-span-1 text-xs text-slate-500 uppercase">Save</div>
          </div>

          {Array.from({ length: 12 }, (_, i) => i + 1).map(h => {
            const hd = hourData[h]
            if (!hd) return null
            const isSaved = hd.saved && !hd.saving
            return (
              <div key={h} className={`rounded-xl border transition-colors ${isSaved && parseInt(hd.formsCount || '0') > 0 ? 'border-brand-600/30 bg-brand-600/5' : 'border-slate-800 bg-slate-800/30'}`}>
                <div className="grid grid-cols-2 md:grid-cols-12 gap-2 p-3 items-center">
                  {/* Hour label */}
                  <div className="col-span-1 text-center">
                    <span className={`text-xs font-bold px-2 py-1 rounded-lg ${isSaved && parseInt(hd.formsCount || '0') > 0 ? 'bg-brand-600/20 text-brand-400' : 'bg-slate-800 text-slate-400'}`}>
                      H{h}
                    </span>
                  </div>

                  {/* Campaign dropdown */}
                  <div className="col-span-1 md:col-span-5">
                    <select
                      className="input text-xs py-2"
                      value={hd.campaignId}
                      onChange={e => setHourData(p => ({ ...p, [h]: { ...p[h], campaignId: e.target.value, saved: false } }))}
                    >
                      {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>

                  {/* Forms count */}
                  <div className="col-span-1 md:col-span-2">
                    <input
                      type="number"
                      min="0"
                      className="input text-xs py-2 text-center font-mono"
                      placeholder="0"
                      value={hd.formsCount}
                      onChange={e => setHourData(p => ({ ...p, [h]: { ...p[h], formsCount: e.target.value, saved: false } }))}
                    />
                  </div>

                  {/* Note */}
                  <div className="col-span-2 md:col-span-3">
                    <input
                      type="text"
                      className="input text-xs py-2"
                      placeholder="Optional note..."
                      value={hd.note}
                      onChange={e => setHourData(p => ({ ...p, [h]: { ...p[h], note: e.target.value, saved: false } }))}
                    />
                  </div>

                  {/* Save button */}
                  <div className="col-span-2 md:col-span-1 flex justify-end md:justify-center">
                    <button
                      onClick={() => saveHour(h)}
                      disabled={hd.saving}
                      className={`btn btn-sm ${isSaved ? 'btn-secondary' : 'btn-primary'}`}
                    >
                      {hd.saving ? (
                        <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                      ) : isSaved ? (
                        <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                      ) : (
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"/></svg>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Salary Summary */}
      {salary && (
        <div className="card p-6">
          <h2 className="font-semibold text-white mb-4">Monthly Salary Summary</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Present Days', value: salary.presentDays, color: 'text-emerald-400' },
              { label: 'Extra Days', value: salary.extraDays, color: 'text-yellow-400' },
              { label: 'Base Salary', value: formatCurrency(salary.baseSalary), color: 'text-brand-400' },
              { label: 'Total Salary', value: formatCurrency(salary.totalSalary), color: 'text-white font-bold' },
            ].map(item => (
              <div key={item.label} className="bg-slate-800/50 rounded-xl p-4">
                <div className="text-xs text-slate-500 mb-1">{item.label}</div>
                <div className={`text-xl font-bold ${item.color}`}>{item.value}</div>
              </div>
            ))}
          </div>
          {salary.extraPay > 0 && (
            <div className="mt-3 text-sm text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-2">
              🎉 Extra pay: {formatCurrency(salary.extraPay)} for {salary.extraDays} extra days!
            </div>
          )}
        </div>
      )}
    </div>
  )
}
