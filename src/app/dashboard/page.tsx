// FILE 2: src/app/dashboard/page.tsx
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
'use client'
import { useEffect, useState, useCallback } from 'react'
import { getShiftDayRange, shiftParams, toIST, type ShiftDayRange } from '@/lib/shiftDay'
import { SalaryPrivacyProvider } from '@/components/ui/SalaryPrivacyProvider'
import { ProtectedSalary, SalaryRevealBar, SalaryUnlockButton } from '@/components/ui/ProtectedSalary'

interface AttRow {
  id: string; staffName: string; team: 'DAY'|'NIGHT'
  checkIn: string|null; checkOut: string|null
  status: 'PRESENT'|'ABSENT'|'HALF_DAY'|'OVERTIME'; hoursWorked: number
}
interface MyStats {
  status: 'NOT_CHECKED_IN'|'WORKING'|'DAY_COMPLETE'
  checkInTime: string|null; checkOutTime: string|null
  hoursWorked: number; earningsToday: number
}

const p2  = (n: number) => String(n).padStart(2,'0')
const inr = (n: number) => `₹${n.toLocaleString('en-IN')}`
const MONTHLY = 10000   // TODO: from auth/session

function useClock() {
  const [t, setT] = useState(new Date())
  useEffect(() => { const id = setInterval(() => setT(new Date()), 1000); return () => clearInterval(id) }, [])
  return t
}

// ── Hero ──────────────────────────────────────────────────────────────────────
function Hero({ stats, range, checkedIn, onIn, onOut }: {
  stats: MyStats; range: ShiftDayRange; checkedIn: boolean
  onIn: () => void; onOut: () => void
}) {
  const now = useClock()
  const statusCls = stats.status === 'NOT_CHECKED_IN' ? 'text-white/30 bg-white/5'
    : stats.status === 'WORKING' ? 'text-emerald-400 bg-emerald-400/10'
    : 'text-indigo-400 bg-indigo-400/10'
  const statusLabel = stats.status === 'NOT_CHECKED_IN' ? 'Not Checked In'
    : stats.status === 'WORKING' ? 'Working' : 'Day Complete'

  return (
    <div className="relative overflow-hidden rounded-2xl p-8 flex flex-col" style={{
      background: 'linear-gradient(135deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))',
      border: '1px solid rgba(255,255,255,0.07)',
      boxShadow: '0 24px 64px rgba(0,0,0,0.4),inset 0 1px 0 rgba(255,255,255,0.05)',
    }}>
      <div className="absolute top-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
      <div className="absolute -bottom-16 -right-16 w-40 h-40 bg-indigo-600/8 rounded-full blur-3xl pointer-events-none" />

      {/* Status + shift label */}
      <div className="flex items-center gap-3 mb-4">
        <span className={`text-[11px] font-semibold tracking-wider uppercase px-3 py-1 rounded-full ${statusCls}`}>
          {statusLabel}
        </span>
        {/* ✅ Shift-day label, not raw calendar date */}
        <span className="text-[10px] font-mono text-white/20">Today • {range.labelDate}</span>
      </div>

      {/* Clock */}
      <div className="flex items-end -ml-1 mb-2">
        <span className="font-mono font-black text-white tracking-tighter tabular-nums leading-none"
          style={{ fontSize: 'clamp(3.5rem,8vw,5.5rem)' }}>
          {p2(now.getHours())}<span className="text-white/20 mx-1">:</span>{p2(now.getMinutes())}
        </span>
        <span className="font-mono font-bold text-white/20 mb-1.5 ml-1 text-2xl tabular-nums">{p2(now.getSeconds())}</span>
      </div>

      {/* Today quick stats */}
      <div className="flex flex-wrap gap-5 mb-6 mt-1">
        {stats.checkInTime  && <Stat label="Checked In"  val={stats.checkInTime}  />}
        {stats.checkOutTime && <Stat label="Checked Out" val={stats.checkOutTime} />}
        {stats.hoursWorked > 0 && <Stat label="Hours Today"   val={`${stats.hoursWorked}h`} />}
        {stats.earningsToday > 0 && (
          <div>
            <p className="text-[10px] text-white/20 uppercase tracking-widest">Earned Today</p>
            <ProtectedSalary value={stats.earningsToday} size="sm" className="font-bold font-mono text-emerald-400" />
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        {!checkedIn ? (
          <button onClick={onIn} className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white active:scale-[0.98] transition-all"
            style={{ background:'linear-gradient(135deg,#4f46e5,#6366f1)', boxShadow:'0 4px 20px rgba(79,70,229,0.35)' }}>
            Check In
          </button>
        ) : (
          <button onClick={onOut} className="px-6 py-2.5 rounded-xl text-sm font-semibold text-rose-400 active:scale-[0.98] transition-all"
            style={{ background:'rgba(244,63,94,0.08)', border:'1px solid rgba(244,63,94,0.2)' }}>
            Check Out
          </button>
        )}
        <button className="text-sm text-white/30 hover:text-white/50 transition-colors">View history →</button>
      </div>
    </div>
  )
}

function Stat({ label, val, highlight }: { label: string; val: string; highlight?: boolean }) {
  return (
    <div>
      <p className="text-[10px] text-white/20 uppercase tracking-widest">{label}</p>
      <p className={`text-sm font-bold font-mono ${highlight ? 'text-emerald-400' : 'text-white/60'}`}>{val}</p>
    </div>
  )
}

// ── Attendance Table ───────────────────────────────────────────────────────────
function AttTable({ rows, loading, range }: { rows: AttRow[]; loading: boolean; range: ShiftDayRange }) {
  const stCls: Record<string,string> = {
    PRESENT:'text-emerald-400 bg-emerald-500/8', ABSENT:'text-red-400 bg-red-500/8',
    HALF_DAY:'text-amber-400 bg-amber-500/8', OVERTIME:'text-indigo-400 bg-indigo-500/8',
  }
  const stLbl: Record<string,string> = { PRESENT:'Present', ABSENT:'Absent', HALF_DAY:'Half Day', OVERTIME:'Overtime' }
  const total   = rows.reduce((s,r) => s+r.hoursWorked, 0)
  const present = rows.filter(r => ['PRESENT','OVERTIME'].includes(r.status)).length

  return (
    <div className="rounded-2xl overflow-hidden" style={{
      background:'rgba(255,255,255,0.025)', border:'1px solid rgba(255,255,255,0.07)',
      boxShadow:'0 8px 32px rgba(0,0,0,0.25)',
    }}>
      <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
        <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/25">Attendance</span>
        {/* ✅ Shift-day label in header */}
        <span className="text-[10px] font-mono text-white/15">Shift Day • {range.labelDate}</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px]">
          <thead>
            <tr style={{ borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
              {['Staff','Team','Check In (IST)','Check Out (IST)','Hours','Status'].map(h => (
                <th key={h} className="text-left px-6 py-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/20">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading
              ? [1,2,3,4].map(i => (
                <tr key={i} style={{ borderBottom:'1px solid rgba(255,255,255,0.03)' }}>
                  {[55,35,45,45,30,55].map((w,j) => (
                    <td key={j} className="px-6 py-4">
                      <div className="h-3 rounded bg-white/[0.05] animate-pulse" style={{ width:`${w}%` }} />
                    </td>
                  ))}
                </tr>
              ))
              : rows.length === 0
                ? <tr><td colSpan={6} className="px-6 py-14 text-center text-white/15 text-sm">No records for {range.labelDate}</td></tr>
                : rows.map(r => (
                  <tr key={r.id} style={{ borderBottom:'1px solid rgba(255,255,255,0.03)' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.025)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '' }}
                  >
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-indigo-300/60"
                          style={{ background:'rgba(99,102,241,0.08)' }}>{r.staffName.charAt(0)}</div>
                        <span className="text-sm font-medium text-white/65">{r.staffName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-3.5">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${r.team==='DAY' ? 'text-amber-400/70 bg-amber-400/8' : 'text-sky-400/70 bg-sky-400/8'}`}>{r.team}</span>
                    </td>
                    <td className="px-6 py-3.5 text-xs font-mono text-white/30">{r.checkIn  ?? '—'}</td>
                    <td className="px-6 py-3.5 text-xs font-mono text-white/30">{r.checkOut ?? '—'}</td>
                    <td className="px-6 py-3.5 text-sm font-semibold text-white/50 tabular-nums">{r.hoursWorked > 0 ? `${r.hoursWorked}h` : '—'}</td>
                    <td className="px-6 py-3.5">
                      <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full ${stCls[r.status]}`}>{stLbl[r.status]}</span>
                    </td>
                  </tr>
                ))
            }
          </tbody>
          {!loading && rows.length > 0 && (
            <tfoot>
              <tr style={{ background:'rgba(255,255,255,0.02)', borderTop:'1px solid rgba(255,255,255,0.05)' }}>
                <td colSpan={4} className="px-6 py-3.5 text-[10px] font-bold uppercase tracking-widest text-white/15">Total</td>
                <td className="px-6 py-3.5 text-sm font-bold text-indigo-400 tabular-nums">{Math.round(total*10)/10}h</td>
                <td className="px-6 py-3.5 text-xs font-semibold text-emerald-400/70">{present} present</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [role, setRole] = useState<string>('')

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => {
      if (d.success) setRole(d.data.role)
    }).catch(() => {})
  }, [])

  return (
    <SalaryPrivacyProvider bypass={role === 'ADMIN'}>
      <DashboardPageInner role={role} />
    </SalaryPrivacyProvider>
  )
}

function DashboardPageInner({ role }: { role: string }) {
  const clock = useClock()
  const [loading,    setLoading]    = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [syncAgo,    setSyncAgo]    = useState(0)
  const [checkedIn,  setCheckedIn]  = useState(false)
  const [range,      setRange]      = useState<ShiftDayRange>(() => getShiftDayRange())
  const [rows,       setRows]       = useState<AttRow[]>([])
  const [stats,      setStats]      = useState<MyStats>({
    status:'NOT_CHECKED_IN', checkInTime:null, checkOutTime:null, hoursWorked:0, earningsToday:0,
  })

  const hourlyRate = Math.round(MONTHLY / 26 / 8)

  const refresh = useCallback(async () => {
    if (refreshing) return
    setRefreshing(true)
    const r = getShiftDayRange()     // always recompute — handles midnight crossover
    setRange(r)

    try {
      // ✅ Pass shift range as from/to — same endpoint, backward-compat period=today kept
      const res = await fetch(`/api/attendance?${shiftParams()}`)
      if (res.ok) {
        const data = await res.json()
        const raw: any[] = data.attendance ?? data.records ?? []
        const mapped: AttRow[] = raw.map(a => ({
          id:          a.id,
          staffName:   a.user?.username ?? a.staffName ?? '—',
          team:        (a.team ?? 'DAY') as 'DAY'|'NIGHT',
          // ✅ All timestamps → IST display string via toIST()
          checkIn:     a.checkIn  ? toIST(a.checkIn)  : null,
          checkOut:    a.checkOut ? toIST(a.checkOut) : null,
          status:      (a.status ?? 'ABSENT') as AttRow['status'],
          hoursWorked: a.hoursWorked ?? 0,
        }))
        setRows(mapped)

        const me = mapped[0]
        if (me) {
          const hrs = me.hoursWorked
          setCheckedIn(!!me.checkIn && !me.checkOut)
          setStats({
            checkInTime:   me.checkIn,
            checkOutTime:  me.checkOut,
            hoursWorked:   hrs,
            earningsToday: Math.round(hrs * hourlyRate),
            status: !me.checkIn ? 'NOT_CHECKED_IN' : !me.checkOut ? 'WORKING' : 'DAY_COMPLETE',
          })
        }
      }
    } catch (e) { console.error('[dashboard]', e) }

    setSyncAgo(0); setLoading(false); setRefreshing(false)
  }, [refreshing, hourlyRate])

  useEffect(() => { refresh() }, [])
  useEffect(() => {
    const poll = setInterval(refresh, 60_000)
    const tick = setInterval(() => setSyncAgo(s => s+1), 1000)
    return () => { clearInterval(poll); clearInterval(tick) }
  }, [refresh])

  const handleIn = useCallback(async () => {
    // TODO: await fetch('/api/attendance/checkin', { method:'POST' })
    setCheckedIn(true)
    setStats(p => ({ ...p, status:'WORKING', checkInTime: toIST(new Date()) }))
    setTimeout(refresh, 1500)
  }, [refresh])

  const handleOut = useCallback(async () => {
    // TODO: await fetch('/api/attendance/checkout', { method:'POST' })
    setCheckedIn(false)
    setStats(p => ({ ...p, status:'DAY_COMPLETE', checkOutTime: toIST(new Date()) }))
    setTimeout(refresh, 1500)
  }, [refresh])

  const syncLabel = syncAgo < 5 ? 'just now' : syncAgo < 60 ? `${syncAgo}s ago` : `${Math.floor(syncAgo/60)}m ago`
  const liveStr   = `${p2(clock.getHours())}:${p2(clock.getMinutes())}:${p2(clock.getSeconds())}`
  const presentN  = rows.filter(r => ['PRESENT','OVERTIME'].includes(r.status)).length
  const totalHrs  = rows.reduce((s,r) => s+r.hoursWorked, 0)

  const dailyRateVal = Math.round(MONTHLY/26)
  const cards: { label:string; value?:string; salaryValue?:number; helper:string; accent:string }[] = [
    { label:'Present Today', value:`${presentN}`,                    helper:'staff checked in', accent:'#6366f1' },
    { label:'Hours Today',   value:`${Math.round(totalHrs*10)/10}h`, helper:'all staff combined', accent:'#8b5cf6' },
    { label:'Daily Rate',    salaryValue:dailyRateVal,               helper:'per shift day', accent:'#f59e0b' },
    { label:'My Earnings',   salaryValue:stats.earningsToday,        helper:'this shift day', accent:'#10b981' },
  ]

  return (
    <div className="min-h-screen font-sans antialiased"
      style={{ background:'linear-gradient(160deg,#070A12 0%,#0B1020 50%,#070A12 100%)' }}>
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-[600px] h-[400px]"
          style={{ background:'radial-gradient(ellipse at 20% 20%,rgba(99,102,241,0.07),transparent 70%)' }} />
        <div className="absolute top-0 right-0 w-[500px] h-[350px]"
          style={{ background:'radial-gradient(ellipse at 80% 10%,rgba(139,92,246,0.05),transparent 70%)' }} />
      </div>

      {/* Sticky header */}
      <header className="sticky top-0 z-50 flex items-center justify-between px-6 py-4"
        style={{ background:'rgba(7,10,18,0.8)', backdropFilter:'blur(20px)', borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black text-white"
            style={{ background:'linear-gradient(135deg,#4f46e5,#6366f1)', boxShadow:'0 0 16px rgba(99,102,241,0.3)' }}>S</div>
          <span className="text-sm font-semibold text-white/80">StaffTrack <span className="text-indigo-400">Pro</span></span>
        </div>
        <span className="hidden md:block text-[10px] uppercase tracking-[0.3em] text-white/10">Command Center</span>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full"
            style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] font-mono text-white/30">{liveStr}</span>
            <span className="text-[10px] text-white/15 ml-1">· {syncLabel}</span>
          </div>
          <button onClick={refresh} disabled={refreshing}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white/25 hover:text-white/50 disabled:opacity-30 transition-colors"
            style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)' }}>
            <svg className={`w-3.5 h-3.5 ${refreshing?'animate-spin':''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </header>

      <main className="relative z-10 max-w-screen-xl mx-auto px-4 md:px-6 py-8 space-y-5">
        {/* Hero + metric cards */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
          <div className="lg:col-span-2">
            <Hero stats={stats} range={range} checkedIn={checkedIn} onIn={handleIn} onOut={handleOut} />
          </div>
          <div className="lg:col-span-3 grid grid-cols-2 gap-3">
            {cards.map(c => (
              <div key={c.label} className="rounded-2xl p-5 flex flex-col gap-3 cursor-default hover:-translate-y-0.5 transition-all duration-200"
                style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', boxShadow:'0 8px 32px rgba(0,0,0,0.25)' }}
                onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor='rgba(255,255,255,0.12)'; el.style.boxShadow=`0 12px 40px rgba(0,0,0,0.3),0 0 0 1px ${c.accent}18` }}
                onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor='rgba(255,255,255,0.07)'; el.style.boxShadow='0 8px 32px rgba(0,0,0,0.25)' }}>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-white/30">{c.label}</span>
                  <div className="w-1.5 h-1.5 rounded-full opacity-40" style={{ background:c.accent }} />
                </div>
                <div className="text-2xl font-black text-white tracking-tight tabular-nums leading-none">
                  {c.salaryValue !== undefined
                    ? <ProtectedSalary value={c.salaryValue} size="lg" className="font-black text-white" />
                    : c.value
                  }
                </div>
                <div className="text-xs text-white/25">{c.helper}</div>
              </div>
            ))}
          </div>
        </div>

        <AttTable rows={rows} loading={loading} range={range} />

        <p className="text-center text-[10px] font-mono text-white/8 tracking-widest pb-6 uppercase">
          Shift Day: {range.labelDate} · 07:00 IST boundary · Auto-sync 60s
        </p>
      </main>
      <SalaryRevealBar />
    </div>
  )
}
