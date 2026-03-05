'use client'
// src/app/dashboard/attendance/page.tsx

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { formatCurrency } from '@/lib/salary'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
interface AttendanceRecord {
  id:             string
  staffId:        string
  staffName?:     string
  team?:          string
  monthlySalary?: number
  date:           string
  checkIn:        string | null
  checkOut:       string | null
  hours?:         number
  status?:        string
}

type Period  = 'today' | 'yesterday' | 'week' | 'month' | 'lastMonth' | 'custom'
type TeamFilter   = 'ALL' | 'DAY' | 'NIGHT'
type StatusFilter = 'ALL' | 'PRESENT' | 'ABSENT' | 'HALF_DAY' | 'OVERTIME'

// ─────────────────────────────────────────────────────────────────────────────
// Shift-day helper  (07:00 IST boundary)
// ─────────────────────────────────────────────────────────────────────────────
function getShiftDayRange(
  now        : Date   = new Date(),
  cutoffHour : number = 7,
  tz         : string = 'Asia/Kolkata',
): { startISO: string; endISO: string; labelDate: string; shiftKey: string } {
  const parts = new Intl.DateTimeFormat('en-IN', {
    timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(now)
  const g   = (t: string) => parseInt(parts.find(p => p.type === t)!.value)
  const h   = g('hour'), y = g('year'), mo = g('month'), d = g('day')
  const sd  = new Date(Date.UTC(y, mo - 1, h < cutoffHour ? d - 1 : d))
  const pad = (n: number) => String(n).padStart(2, '0')
  const sy  = sd.getUTCFullYear(), sm = sd.getUTCMonth() + 1, sdd = sd.getUTCDate()
  const startISO  = new Date(`${sy}-${pad(sm)}-${pad(sdd)}T${pad(cutoffHour)}:00:00+05:30`).toISOString()
  const endISO    = new Date(new Date(startISO).getTime() + (23 * 3600 + 59 * 60 + 59) * 1000).toISOString()
  const labelDate = new Intl.DateTimeFormat('en-IN', {
    timeZone: tz, day: '2-digit', month: 'short', year: 'numeric',
  }).format(new Date(startISO))
  const shiftKey  = `${sy}-${pad(sm)}-${pad(sdd)}`
  return { startISO, endISO, labelDate, shiftKey }
}

function getRangeForPeriod(period: Period, custom?: { from: string; to: string }) {
  const now   = new Date()
  const TZ    = 'Asia/Kolkata'

  if (period === 'custom' && custom) {
    // Custom: treat from/to as shift-day starts
    const fromShift = getShiftDayRange(new Date(custom.from + 'T07:00:00+05:30'))
    const toShift   = getShiftDayRange(new Date(custom.to   + 'T07:00:00+05:30'))
    return { from: fromShift.startISO, to: toShift.endISO }
  }

  if (period === 'today') {
    const r = getShiftDayRange(now)
    return { from: r.startISO, to: r.endISO }
  }

  if (period === 'yesterday') {
    const yest = new Date(now.getTime() - 86400000)
    const r    = getShiftDayRange(yest)
    return { from: r.startISO, to: r.endISO }
  }

  if (period === 'week') {
    const weekAgo = new Date(now.getTime() - 6 * 86400000)
    const from    = getShiftDayRange(weekAgo)
    const to      = getShiftDayRange(now)
    return { from: from.startISO, to: to.endISO }
  }

  if (period === 'month') {
    // From 1st of current IST month at 07:00
    const parts = new Intl.DateTimeFormat('en-IN', {
      timeZone: TZ, year: 'numeric', month: '2-digit',
    }).formatToParts(now)
    const y  = parseInt(parts.find(p => p.type === 'year')!.value)
    const mo = parseInt(parts.find(p => p.type === 'month')!.value)
    const pad = (n: number) => String(n).padStart(2, '0')
    const from = new Date(`${y}-${pad(mo)}-01T07:00:00+05:30`).toISOString()
    const to   = getShiftDayRange(now).endISO
    return { from, to }
  }

  if (period === 'lastMonth') {
    const parts = new Intl.DateTimeFormat('en-IN', {
      timeZone: TZ, year: 'numeric', month: '2-digit',
    }).formatToParts(now)
    const y   = parseInt(parts.find(p => p.type === 'year')!.value)
    const mo  = parseInt(parts.find(p => p.type === 'month')!.value)
    const pad = (n: number) => String(n).padStart(2, '0')
    const prevMo    = mo === 1 ? 12 : mo - 1
    const prevY     = mo === 1 ? y - 1 : y
    const lastDay   = new Date(y, mo - 1, 0).getDate()
    const from      = new Date(`${prevY}-${pad(prevMo)}-01T07:00:00+05:30`).toISOString()
    const to        = new Date(`${prevY}-${pad(prevMo)}-${lastDay}T07:00:00+05:30`).toISOString()
    return { from, to }
  }

  return { from: getShiftDayRange(now).startISO, to: getShiftDayRange(now).endISO }
}

// ─────────────────────────────────────────────────────────────────────────────
// Compute hours & status from record
// ─────────────────────────────────────────────────────────────────────────────
function calcHours(checkIn: string | null, checkOut: string | null): number {
  if (!checkIn || !checkOut) return 0
  return (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 3600000
}

function computeStatus(checkIn: string | null, checkOut: string | null): string {
  if (!checkIn) return 'ABSENT'
  if (!checkOut) return 'PRESENT'
  const h = calcHours(checkIn, checkOut)
  if (h >= 9) return 'OVERTIME'
  if (h >= 7) return 'PRESENT'
  if (h >= 4) return 'HALF_DAY'
  return 'PRESENT'
}

function toIST(iso: string | null): string {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true,
  }).format(new Date(iso))
}

function toISTDate(iso: string | null): string {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric',
  }).format(new Date(iso))
}

// ─────────────────────────────────────────────────────────────────────────────
// Status badge
// ─────────────────────────────────────────────────────────────────────────────
const STATUS_CFG: Record<string, { label: string; cls: string }> = {
  PRESENT:  { label: 'Present',   cls: 'badge-green'  },
  ABSENT:   { label: 'Absent',    cls: 'badge-red'    },
  HALF_DAY: { label: 'Half Day',  cls: 'badge-yellow' },
  OVERTIME: { label: 'Overtime',  cls: 'badge-purple' },
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CFG[status] ?? STATUS_CFG.ABSENT
  return <span className={cfg.cls}>{cfg.label}</span>
}

// ─────────────────────────────────────────────────────────────────────────────
// Detail Drawer
// ─────────────────────────────────────────────────────────────────────────────
function DetailDrawer({ record, canSeeSalary, onClose }: {
  record:        AttendanceRecord
  canSeeSalary:  boolean
  onClose:       () => void
}) {
  const hrs     = record.hours ?? calcHours(record.checkIn, record.checkOut)
  const status  = record.status ?? computeStatus(record.checkIn, record.checkOut)
  const hrRate  = (record.monthlySalary ?? 0) / 26 / 8
  const estPay  = Math.round(hrs * hrRate)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50"
        onClick={onClose}
      />
      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-full max-w-sm z-50 bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <h3 className="font-bold text-white text-lg">Attendance Detail</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Staff info */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-brand-600/20 border border-brand-500/30 flex items-center justify-center text-lg font-bold text-brand-400">
              {(record.staffName ?? '?').charAt(0)}
            </div>
            <div>
              <p className="font-bold text-white text-base">{record.staffName ?? 'Staff'}</p>
              <span className={record.team === 'DAY' ? 'badge-yellow' : 'badge-purple'}>
                {record.team === 'DAY' ? '☀ DAY' : '☽ NIGHT'}
              </span>
            </div>
          </div>

          <div className="h-px bg-slate-800" />

          {/* Details */}
          {[
            { label: 'Shift Date',  value: toISTDate(record.date) },
            { label: 'Check In',    value: toIST(record.checkIn),  cls: 'text-emerald-400' },
            { label: 'Check Out',   value: toIST(record.checkOut), cls: 'text-red-400' },
            { label: 'Hours Worked', value: hrs > 0 ? `${hrs.toFixed(2)}h` : '—' },
          ].map(row => (
            <div key={row.label} className="flex items-center justify-between">
              <span className="text-sm text-slate-500">{row.label}</span>
              <span className={`text-sm font-semibold ${row.cls ?? 'text-white'}`}>{row.value}</span>
            </div>
          ))}

          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-500">Status</span>
            <StatusBadge status={status} />
          </div>

          {canSeeSalary && (
            <>
              <div className="h-px bg-slate-800" />
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Est. Pay (this day)</span>
                <span className="text-sm font-bold text-yellow-400">
                  {estPay > 0 ? formatCurrency(estPay) : '—'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Monthly Salary</span>
                <span className="text-sm font-semibold text-slate-300">
                  {record.monthlySalary ? formatCurrency(record.monthlySalary) : '—'}
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Skeleton row
// ─────────────────────────────────────────────────────────────────────────────
function SkeletonRow({ cols }: { cols: number }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="py-4 px-5">
          <div className="h-3.5 bg-slate-800 rounded-full animate-pulse" style={{ width: `${60 + (i % 3) * 15}%` }} />
        </td>
      ))}
    </tr>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────
export default function AttendancePage() {
  const [records,     setRecords]     = useState<AttendanceRecord[]>([])
  const [loading,     setLoading]     = useState(true)
  const [userRole,    setUserRole]    = useState<string>('')
  const [period,      setPeriod]      = useState<Period>('today')
  const [teamFilter,  setTeamFilter]  = useState<TeamFilter>('ALL')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL')
  const [search,      setSearch]      = useState('')
  const [customFrom,  setCustomFrom]  = useState('')
  const [customTo,    setCustomTo]    = useState('')
  const [showCustom,  setShowCustom]  = useState(false)
  const [selected,    setSelected]    = useState<AttendanceRecord | null>(null)
  const [syncAgo,     setSyncAgo]     = useState(0)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const isAdmin      = userRole === 'ADMIN'
  const isTL         = userRole === 'TEAM_LEAD_DAY' || userRole === 'TEAM_LEAD_NIGHT'
  const canSeeSalary = isAdmin
  const canSeeAll    = isAdmin || isTL

  // ── Fetch session role ────────────────────────────────────────────────────
  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(d => setUserRole(d?.role ?? d?.data?.role ?? ''))
      .catch(() => {})
  }, [])

  // ── Fetch attendance ──────────────────────────────────────────────────────
  const fetchRecords = useCallback(async () => {
    setLoading(true)
    try {
      const { from, to } = getRangeForPeriod(
        period,
        period === 'custom' ? { from: customFrom, to: customTo } : undefined,
      )

      const params = new URLSearchParams({ from, to })
      if (teamFilter !== 'ALL') params.set('team', teamFilter)
      if (search.trim())        params.set('q',    search.trim())

      const res  = await fetch(`/api/attendance?${params}`)
      const data = await res.json()

      // Support both { success, data } and { records } shapes
      const raw: any[] = data.data ?? data.records ?? data ?? []

      // Normalise + compute missing fields
      const normalised: AttendanceRecord[] = raw.map((r: any) => ({
        id:            r.id,
        staffId:       r.staffId ?? r.userId ?? '',
        staffName:     r.staffName ?? r.staff?.username ?? r.name ?? '',
        team:          r.team ?? r.staff?.staffProfile?.team ?? r.staffProfile?.team ?? '',
        monthlySalary: r.monthlySalary ?? r.staff?.staffProfile?.monthlySalary ?? 0,
        date:          r.date ?? r.checkIn ?? '',
        checkIn:       r.checkIn ?? null,
        checkOut:      r.checkOut ?? null,
        hours:         r.hours ?? calcHours(r.checkIn, r.checkOut),
        status:        r.status ?? computeStatus(r.checkIn, r.checkOut),
      }))

      setRecords(normalised)
      setSyncAgo(0)
    } catch (e) {
      console.error('[attendance fetch error]', e)
    }
    setLoading(false)
  }, [period, teamFilter, search, customFrom, customTo])

  // Initial + poll every 30s
  useEffect(() => {
    fetchRecords()
    pollRef.current = setInterval(fetchRecords, 30_000)
    const tick = setInterval(() => setSyncAgo(s => s + 1), 1000)
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
      clearInterval(tick)
    }
  }, [fetchRecords])

  // ── Filtering (client-side on top of server filter) ───────────────────────
  const filtered = useMemo(() => {
    return records.filter(r => {
      const status = r.status ?? computeStatus(r.checkIn, r.checkOut)
      const matchStatus = statusFilter === 'ALL' || status === statusFilter
      const matchSearch = !search.trim() ||
        (r.staffName ?? '').toLowerCase().includes(search.toLowerCase())
      const matchTeam   = teamFilter === 'ALL' || r.team === teamFilter
      return matchStatus && matchSearch && matchTeam
    })
  }, [records, statusFilter, search, teamFilter])

  // ── Summary counts ────────────────────────────────────────────────────────
  const summary = useMemo(() => {
    const all = filtered
    return {
      present:  all.filter(r => (r.status ?? computeStatus(r.checkIn, r.checkOut)) === 'PRESENT').length,
      absent:   all.filter(r => (r.status ?? computeStatus(r.checkIn, r.checkOut)) === 'ABSENT').length,
      halfDay:  all.filter(r => (r.status ?? computeStatus(r.checkIn, r.checkOut)) === 'HALF_DAY').length,
      overtime: all.filter(r => (r.status ?? computeStatus(r.checkIn, r.checkOut)) === 'OVERTIME').length,
      totalHrs: all.reduce((s, r) => s + (r.hours ?? 0), 0),
    }
  }, [filtered])

  // Export CSV (admin only)
  function exportCSV() {
    const { from, to } = getRangeForPeriod(period)
    window.open(`/api/attendance?from=${from}&to=${to}&export=csv`, '_blank')
  }

  const PERIODS: { value: Period; label: string }[] = [
    { value: 'today',     label: 'Today'      },
    { value: 'yesterday', label: 'Yesterday'  },
    { value: 'week',      label: 'This Week'  },
    { value: 'month',     label: 'This Month' },
    { value: 'lastMonth', label: 'Last Month' },
    { value: 'custom',    label: 'Custom'     },
  ]

  const shiftLabel = getShiftDayRange().labelDate
  const syncLabel  = syncAgo < 5 ? 'just now' : syncAgo < 60 ? `${syncAgo}s ago` : `${Math.floor(syncAgo / 60)}m ago`
  const colCount   = canSeeSalary ? 8 : 7

  return (
    <div className="space-y-6">

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">
            {canSeeAll ? 'Attendance Sheet' : 'My Attendance'}
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-slate-400 text-sm">
              {canSeeAll ? 'All staff · ' : 'Your records · '}
              <span className="text-slate-500">Shift day: 7AM–7AM IST · {shiftLabel}</span>
            </p>
            <span className="text-[10px] text-slate-600">· synced {syncLabel}</span>
          </div>
        </div>
        {isAdmin && (
          <button onClick={exportCSV} className="btn-secondary btn-sm self-start sm:self-auto">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export CSV
          </button>
        )}
      </div>

      {/* ── Summary chips ─────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2">
        {[
          { label: 'Present',   value: summary.present,  cls: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
          { label: 'Absent',    value: summary.absent,   cls: 'text-red-400     bg-red-500/10     border-red-500/20'     },
          { label: 'Half Day',  value: summary.halfDay,  cls: 'text-yellow-400  bg-yellow-500/10  border-yellow-500/20'  },
          { label: 'Overtime',  value: summary.overtime, cls: 'text-purple-400  bg-purple-500/10  border-purple-500/20'  },
          { label: 'Total Hours', value: `${summary.totalHrs.toFixed(1)}h`, cls: 'text-brand-400 bg-brand-500/10 border-brand-500/20' },
        ].map(chip => (
          <div key={chip.label}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold ${chip.cls}`}>
            <span className="text-current opacity-70">{chip.label}</span>
            <span className="font-black">{chip.value}</span>
          </div>
        ))}
      </div>

      {/* ── Filter bar ────────────────────────────────────────────────────── */}
      <div className="card p-4 space-y-3">
        {/* Period pills */}
        <div className="flex flex-wrap gap-2">
          {PERIODS.map(p => (
            <button
              key={p.value}
              onClick={() => { setPeriod(p.value); if (p.value === 'custom') setShowCustom(true) }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                period === p.value
                  ? 'bg-brand-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Custom range */}
        {period === 'custom' && (
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">From</span>
              <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
                className="input text-sm py-1.5" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">To</span>
              <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
                className="input text-sm py-1.5" />
            </div>
            <button onClick={fetchRecords} className="btn-primary btn-sm">Apply</button>
          </div>
        )}

        {/* Search + Team + Status */}
        <div className="flex flex-wrap gap-3">
          {/* Search */}
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500"
              fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search staff…"
              className="input pl-9 text-sm py-1.5 w-48"
            />
          </div>

          {/* Team */}
          {canSeeAll && (
            <div className="flex items-center gap-1.5">
              {(['ALL', 'DAY', 'NIGHT'] as TeamFilter[]).map(t => (
                <button key={t} onClick={() => setTeamFilter(t)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    teamFilter === t
                      ? t === 'DAY'   ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                      : t === 'NIGHT' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                      :                 'bg-brand-600 text-white'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}>
                  {t === 'ALL' ? 'All Teams' : t === 'DAY' ? '☀ Day' : '☽ Night'}
                </button>
              ))}
            </div>
          )}

          {/* Status */}
          <div className="flex items-center gap-1.5">
            {(['ALL', 'PRESENT', 'ABSENT', 'HALF_DAY', 'OVERTIME'] as StatusFilter[]).map(s => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  statusFilter === s
                    ? 'bg-brand-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}>
                {s === 'ALL' ? 'All' : s === 'HALF_DAY' ? 'Half Day' : s.charAt(0) + s.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Table ─────────────────────────────────────────────────────────── */}
      <div className="card">
        <div className="px-6 py-3 border-b border-slate-800 flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            {filtered.length} record{filtered.length !== 1 ? 's' : ''}
          </span>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-slate-600">Auto-refresh 30s</span>
          </div>
        </div>

        {loading ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  {canSeeAll
                    ? ['Staff', 'Team', 'Date', 'Check In', 'Check Out', 'Hours', 'Status', ...(canSeeSalary ? ['Est. Pay'] : [])].map(h => <th key={h}>{h}</th>)
                    : ['Date', 'Check In', 'Check Out', 'Hours', 'Status'].map(h => <th key={h}>{h}</th>)
                  }
                </tr>
              </thead>
              <tbody>
                {[1,2,3,4,5].map(i => <SkeletonRow key={i} cols={colCount} />)}
              </tbody>
            </table>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 space-y-2">
            <div className="text-3xl">📭</div>
            <p className="text-slate-500 text-sm">No attendance records found</p>
            <p className="text-slate-600 text-xs">Try changing the period or filters</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  {canSeeAll && <th>Staff</th>}
                  {canSeeAll && <th>Team</th>}
                  <th>Date (Shift Day)</th>
                  <th>Check In</th>
                  <th>Check Out</th>
                  <th>Hours</th>
                  <th>Status</th>
                  {canSeeSalary && <th>Est. Pay</th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => {
                  const hrs     = r.hours ?? calcHours(r.checkIn, r.checkOut)
                  const status  = r.status ?? computeStatus(r.checkIn, r.checkOut)
                  const hrRate  = (r.monthlySalary ?? 0) / 26 / 8
                  const estPay  = Math.round(hrs * hrRate)

                  return (
                    <tr
                      key={r.id}
                      className="cursor-pointer hover:bg-slate-800/50 transition-colors"
                      onClick={() => setSelected(r)}
                    >
                      {canSeeAll && (
                        <td className="font-semibold text-white">{r.staffName || '—'}</td>
                      )}
                      {canSeeAll && (
                        <td>
                          <span className={r.team === 'DAY' ? 'badge-yellow' : 'badge-purple'}>
                            {r.team === 'DAY' ? '☀ DAY' : '☽ NIGHT'}
                          </span>
                        </td>
                      )}
                      <td className="text-slate-300 text-sm">{toISTDate(r.date || r.checkIn)}</td>
                      <td className="text-emerald-400 font-mono text-xs">{toIST(r.checkIn)}</td>
                      <td className="text-red-400 font-mono text-xs">{toIST(r.checkOut)}</td>
                      <td className="font-mono text-sm">{hrs > 0 ? `${hrs.toFixed(1)}h` : '—'}</td>
                      <td><StatusBadge status={status} /></td>
                      {canSeeSalary && (
                        <td className="text-yellow-400 font-semibold text-sm">
                          {estPay > 0 ? formatCurrency(estPay) : '—'}
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>

              {/* Footer totals */}
              {filtered.length > 1 && (
                <tfoot>
                  <tr className="bg-slate-800/50">
                    {canSeeAll && <td colSpan={2} className="font-bold text-slate-400 text-xs uppercase tracking-wide">Total</td>}
                    {!canSeeAll && <td className="font-bold text-slate-400 text-xs uppercase tracking-wide">Total</td>}
                    <td />
                    <td />
                    <td />
                    <td className="font-bold text-brand-400">{summary.totalHrs.toFixed(1)}h</td>
                    <td className="text-xs text-slate-500">{summary.present} present</td>
                    {canSeeSalary && (
                      <td className="font-bold text-yellow-400">
                        {formatCurrency(Math.round(
                          filtered.reduce((s, r) => {
                            const hrs    = r.hours ?? calcHours(r.checkIn, r.checkOut)
                            const hrRate = (r.monthlySalary ?? 0) / 26 / 8
                            return s + hrs * hrRate
                          }, 0)
                        ))}
                      </td>
                    )}
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </div>

      {/* ── Detail Drawer ──────────────────────────────────────────────────── */}
      {selected && (
        <DetailDrawer
          record={selected}
          canSeeSalary={canSeeSalary}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  )
}
