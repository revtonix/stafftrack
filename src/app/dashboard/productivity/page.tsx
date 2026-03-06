'use client'
// src/app/dashboard/productivity/page.tsx
import { useState, useEffect, useRef, useCallback } from 'react'

// Hour labels mapping (Day shift: H1=7AM, Night shift: H1=7PM)
const HOUR_LABELS: Record<number, string> = {
  1: '7–8', 2: '8–9', 3: '9–10', 4: '10–11', 5: '11–12', 6: '12–1',
  7: '1–2', 8: '2–3', 9: '3–4', 10: '4–5', 11: '5–6', 12: '6–7',
}

interface HourlyData { hour: number; dayForms: number; nightForms: number; total: number; staffCount: number }
interface TeamStats { dayForms: number; nightForms: number; dayActiveStaff: number; nightActiveStaff: number; dayScore: number; nightScore: number }
interface TopPerformer { name: string; forms: number; hour: number }

interface ProductivityState {
  shiftDate: string; shiftType: 'DAY' | 'NIGHT'; userTeam: string; role: string
  currentHour: number; hourProgress: number; unlockedHours: number[]
  hourLabels: Record<number, string>
  myHourData: Record<number, { campaignId: string; campaignName: string; formsCount: number; note: string }[]>
  campaigns: { id: string; name: string; team: string }[]
  hourlyLeader: { name: string; forms: number; hour: number } | null
  myIdleStatus: { isIdle: boolean; idleMinutes: number }
  teamIdleAlerts: { staffId: string; name: string; team: string; idleMinutes: number }[]
  gamification: {
    level: number; title: string; xp: number; xpForNext: number
    totalMonthForms: number; attendanceDays: number; activeHours: number
    badges: { id: string; label: string; icon: string }[]
  }
  teamHourStates: {
    staffId: string; name: string; team: string
    hours: { hourIndex: number; formsCount: number; campaignName: string }[]
    totalForms: number
  }[]
}

// Animated number component
function AnimatedNum({ value }: { value: number }) {
  const [display, setDisplay] = useState(0)
  const prevRef = useRef(0)
  useEffect(() => {
    const start = prevRef.current
    const diff = value - start
    if (diff === 0) return
    const t0 = performance.now()
    function tick(t: number) {
      const p = Math.min((t - t0) / 600, 1)
      const eased = 1 - Math.pow(1 - p, 3)
      setDisplay(Math.round(start + diff * eased))
      if (p < 1) requestAnimationFrame(tick)
      else prevRef.current = value
    }
    requestAnimationFrame(tick)
  }, [value])
  return <>{display}</>
}

// Save status indicator
function SaveStatus({ status }: { status: 'idle' | 'saving' | 'saved' | 'error' }) {
  if (status === 'idle') return null
  const map = {
    saving: { text: 'Saving...', cls: 'text-yellow-400' },
    saved: { text: '✓ Saved', cls: 'text-emerald-400' },
    error: { text: '✕ Error', cls: 'text-red-400' },
  }
  const s = map[status]
  return <span className={`text-[10px] font-medium ${s.cls} animate-fade-in`}>{s.text}</span>
}

// Hour row entry component with autosave
function HourRow({ hourIndex, label, isActive, isCurrent, shiftDate, campaigns, savedData, onSaved }:
  {
    hourIndex: number; label: string; isActive: boolean; isCurrent: boolean
    shiftDate: string; campaigns: { id: string; name: string }[]
    savedData?: { campaignId: string; formsCount: number; note: string }
    onSaved: () => void
  }) {
  const [campaignId, setCampaignId] = useState(savedData?.campaignId || (campaigns[0]?.id || ''))
  const [formsCount, setFormsCount] = useState(savedData?.formsCount?.toString() || '0')
  const [note, setNote] = useState(savedData?.note || '')
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  // Sync from saved data when it changes externally
  useEffect(() => {
    if (savedData) {
      setCampaignId(savedData.campaignId || (campaigns[0]?.id || ''))
      setFormsCount(savedData.formsCount?.toString() || '0')
      setNote(savedData.note || '')
    }
  }, [savedData, campaigns])

  const doSave = useCallback(async (cId: string, forms: string, n: string) => {
    if (!cId) return
    const count = parseInt(forms) || 0
    setSaveStatus('saving')
    try {
      const res = await fetch('/api/worklogs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId: cId, date: shiftDate, hourIndex, formsCount: count, note: n || undefined,
        }),
      })
      const data = await res.json()
      if (mountedRef.current) {
        if (data.success) {
          setSaveStatus('saved')
          onSaved()
          setTimeout(() => { if (mountedRef.current) setSaveStatus('idle') }, 2000)
        } else {
          setSaveStatus('error')
        }
      }
    } catch {
      if (mountedRef.current) setSaveStatus('error')
    }
  }, [shiftDate, hourIndex, onSaved])

  const scheduleAutoSave = useCallback((cId: string, forms: string, n: string) => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => doSave(cId, forms, n), 2000)
  }, [doSave])

  const handleCampaignChange = (val: string) => {
    setCampaignId(val)
    scheduleAutoSave(val, formsCount, note)
  }
  const handleFormsChange = (val: string) => {
    setFormsCount(val)
    scheduleAutoSave(campaignId, val, note)
  }
  const handleNoteChange = (val: string) => {
    setNote(val)
    scheduleAutoSave(campaignId, formsCount, val)
  }

  const isPast = !isCurrent
  const rowBg = isCurrent
    ? 'bg-brand-600/10 border border-brand-500/30'
    : isPast
      ? 'bg-slate-800/30'
      : ''

  return (
    <div className={`rounded-lg px-4 py-3 ${rowBg} transition-all`}>
      <div className="flex flex-wrap items-center gap-3">
        {/* Hour label */}
        <div className="flex items-center gap-2 w-28 flex-shrink-0">
          <span className={`text-xs font-bold ${isCurrent ? 'text-brand-400' : 'text-slate-400'}`}>
            H{hourIndex}
          </span>
          <span className="text-[10px] text-slate-600">{label}</span>
          {isCurrent && <span className="live-dot" />}
        </div>

        {/* Campaign */}
        <select
          className="input text-xs py-1.5 w-auto min-w-[120px]"
          value={campaignId}
          onChange={e => handleCampaignChange(e.target.value)}
          disabled={!isActive}
        >
          {campaigns.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        {/* Forms count */}
        <div className="flex items-center gap-1">
          <input
            type="number"
            className="input text-xs py-1.5 w-16 text-center font-mono"
            value={formsCount}
            onChange={e => handleFormsChange(e.target.value)}
            onBlur={() => { if (timerRef.current) { clearTimeout(timerRef.current); doSave(campaignId, formsCount, note) } }}
            min="0"
            disabled={!isActive}
          />
          <span className="text-[10px] text-slate-600">forms</span>
        </div>

        {/* Note */}
        <input
          type="text"
          className="input text-xs py-1.5 flex-1 min-w-[100px]"
          value={note}
          onChange={e => handleNoteChange(e.target.value)}
          onBlur={() => { if (timerRef.current) { clearTimeout(timerRef.current); doSave(campaignId, formsCount, note) } }}
          placeholder="Note..."
          disabled={!isActive}
        />

        {/* Save status */}
        <div className="w-16 text-right">
          <SaveStatus status={saveStatus} />
          {!isActive && saveStatus === 'idle' && (
            <span className="text-[10px] text-slate-600">✓ Done</span>
          )}
        </div>
      </div>
    </div>
  )
}

export default function ProductivityPage() {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [from, setFrom] = useState(() => {
    const d = new Date(); d.setDate(1); return d.toISOString().split('T')[0]
  })
  const [to, setTo] = useState(() => new Date().toISOString().split('T')[0])
  const [refreshCount, setRefreshCount] = useState(0)
  const [hourlyData, setHourlyData] = useState<HourlyData[]>([])
  const [teamStats, setTeamStats] = useState<TeamStats | null>(null)
  const [topPerformer, setTopPerformer] = useState<TopPerformer | null>(null)
  const [prevTopPerformer, setPrevTopPerformer] = useState<string | null>(null)
  const [showTopNotif, setShowTopNotif] = useState(false)

  // New: productivity state
  const [prodState, setProdState] = useState<ProductivityState | null>(null)
  const [stateLoading, setStateLoading] = useState(true)
  const [liveProgress, setLiveProgress] = useState(0)

  // Auto refresh every 10s
  useEffect(() => {
    const t = setInterval(() => setRefreshCount(c => c + 1), 10000)
    return () => clearInterval(t)
  }, [])

  // Fetch productivity state
  const fetchState = useCallback(async () => {
    try {
      const res = await fetch('/api/productivity/state')
      const d = await res.json()
      if (d.success) {
        setProdState(d.data)
        setLiveProgress(d.data.hourProgress)
      }
    } catch { /* silent */ }
    setStateLoading(false)
  }, [])

  useEffect(() => { fetchState() }, [fetchState, refreshCount])

  // Live progress timer (updates every 15 seconds for smooth progress)
  useEffect(() => {
    const t = setInterval(() => {
      const now = new Date()
      const min = parseInt(new Intl.DateTimeFormat('en-IN', {
        timeZone: 'Asia/Kolkata', minute: '2-digit', hour12: false,
      }).formatToParts(now).find(x => x.type === 'minute')!.value)
      setLiveProgress(Math.round((min / 60) * 100))
    }, 15000)
    return () => clearInterval(t)
  }, [])

  // Fetch reports data
  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetch(`/api/worklogs?from=${from}&to=${to}`).then(r => r.json()),
      fetch(`/api/reports/productivity?preset=today`).then(r => r.json()),
    ]).then(([wl, pd]) => {
      if (wl.success) setLogs(wl.data)
      if (pd.success) {
        setHourlyData(pd.data.hourlyBreakdown || [])
        setTeamStats(pd.data.teamStats || null)
        if (pd.data.topPerformerThisHour) {
          const newTop = pd.data.topPerformerThisHour
          if (prevTopPerformer && prevTopPerformer !== newTop.name) {
            setShowTopNotif(true)
            setTimeout(() => setShowTopNotif(false), 5000)
          }
          setPrevTopPerformer(newTop.name)
          setTopPerformer(newTop)
        }
      }
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [from, to, refreshCount])

  // Group by date
  const byDate = logs.reduce((acc: Record<string, any[]>, log) => {
    const d = log.date.split('T')[0]
    if (!acc[d]) acc[d] = []
    acc[d].push(log)
    return acc
  }, {})

  const totalForms = logs.reduce((a, l) => a + l.formsCount, 0)
  const maxHourly = Math.max(...hourlyData.map(h => h.total), 1)

  const role = prodState?.role || 'STAFF'
  const isAdmin = role === 'ADMIN'
  const isTL = role === 'TEAM_LEAD_DAY' || role === 'TEAM_LEAD_NIGHT'
  const isStaff = role === 'STAFF'

  return (
    <div className="space-y-6">
      {/* Header with Live indicator */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">
            {isAdmin ? 'Productivity History' : isTL ? 'Team Productivity' : 'My Productivity'}
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            {isAdmin ? 'All staff hourly form submissions' : isTL ? 'Your team\'s hourly reporting' : 'Your hourly form submissions'}
          </p>
        </div>
        <div className="flex items-center gap-2 bg-slate-800/60 px-3 py-2 rounded-xl border border-slate-700/50">
          <span className="live-dot" />
          <span className="text-xs font-semibold text-emerald-400">LIVE</span>
          <span className="text-[10px] text-slate-500 ml-1">Refreshes every 10s</span>
        </div>
      </div>

      {/* Idle Warning */}
      {prodState?.myIdleStatus.isIdle && (
        <div className="animate-slide-up bg-gradient-to-r from-red-500/15 to-red-500/5 border border-red-500/20 rounded-xl px-5 py-3 flex items-center gap-3">
          <span className="text-xl">⚠️</span>
          <div>
            <div className="text-sm font-semibold text-red-400">You are inactive</div>
            <div className="text-xs text-slate-400">
              No activity for <span className="text-white font-medium">{prodState.myIdleStatus.idleMinutes} minutes</span>. Submit your forms to stay active.
            </div>
          </div>
        </div>
      )}

      {/* Top Performer Notification Popup */}
      {showTopNotif && topPerformer && (
        <div className="animate-slide-up bg-gradient-to-r from-yellow-500/15 to-amber-500/10 border border-yellow-500/20 rounded-xl px-5 py-3 flex items-center gap-3">
          <span className="text-xl">🏆</span>
          <div>
            <div className="text-sm font-semibold text-yellow-400">New Top Performer!</div>
            <div className="text-xs text-slate-400">
              <span className="text-white font-medium">{topPerformer.name}</span> is now leading with {topPerformer.forms} forms in H{topPerformer.hour}
            </div>
          </div>
          <button onClick={() => setShowTopNotif(false)} className="ml-auto text-slate-600 hover:text-slate-400 text-xs">✕</button>
        </div>
      )}

      {/* Team Idle Alerts (TL/Admin) */}
      {(isTL || isAdmin) && prodState && prodState.teamIdleAlerts.length > 0 && (
        <div className="bg-gradient-to-r from-amber-500/10 to-amber-500/5 border border-amber-500/15 rounded-xl px-5 py-3">
          <div className="text-xs font-semibold text-amber-400 mb-2">⚠️ Idle Staff Alerts</div>
          <div className="flex flex-wrap gap-2">
            {prodState.teamIdleAlerts.map(a => (
              <div key={a.staffId} className="flex items-center gap-1.5 bg-slate-800/50 rounded-lg px-2.5 py-1.5">
                <span className="text-xs font-medium text-white">{a.name}</span>
                <span className={a.team === 'DAY' ? 'badge-yellow' : 'badge-purple'}
                  style={{ fontSize: '8px', padding: '1px 4px' }}>{a.team}</span>
                <span className="text-[10px] text-red-400">{a.idleMinutes}m idle</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Current Hour Progress + Gamification Row */}
      {prodState && !stateLoading && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Current Hour Progress */}
          <div className="card hover-card-glow p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="live-dot" />
              <h3 className="font-semibold text-white text-sm">Current Hour</h3>
            </div>
            {prodState.currentHour > 0 ? (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-lg font-bold text-brand-400">
                    H{prodState.currentHour}
                  </span>
                  <span className="text-xs text-slate-400">
                    {prodState.hourLabels[prodState.currentHour]}
                  </span>
                </div>
                <div className="h-3 bg-slate-800 rounded-full overflow-hidden mb-1">
                  <div
                    className="h-full bg-gradient-to-r from-brand-500 to-brand-400 rounded-full transition-all duration-1000"
                    style={{ width: `${liveProgress}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-500">
                  <span>{liveProgress}% complete</span>
                  <span>{prodState.shiftType} Shift</span>
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <div className="text-slate-500 text-sm">Shift not active</div>
                <div className="text-[10px] text-slate-600 mt-1">
                  {prodState.shiftType === 'DAY' ? 'Starts at 7:00 AM' : 'Starts at 7:00 PM'}
                </div>
              </div>
            )}
          </div>

          {/* Hourly Leader */}
          {prodState.hourlyLeader ? (
            <div className="card hover-card-glow p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-sm">🏆</span>
                <h3 className="font-semibold text-white text-sm">Top Performer This Hour</h3>
              </div>
              <div className="bg-gradient-to-r from-yellow-500/10 to-amber-500/5 border border-yellow-500/15 rounded-xl px-4 py-3 text-center">
                <div className="text-xl mb-1">🥇</div>
                <div className="font-bold text-white">{prodState.hourlyLeader.name}</div>
                <div className="text-sm text-brand-400 font-semibold mt-0.5">{prodState.hourlyLeader.forms} forms</div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  in H{prodState.hourlyLeader.hour} ({prodState.hourLabels[prodState.hourlyLeader.hour]})
                </div>
              </div>
            </div>
          ) : (
            <div className="card hover-card-glow p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-sm">🏆</span>
                <h3 className="font-semibold text-white text-sm">Top Performer This Hour</h3>
              </div>
              <div className="text-center py-4">
                <div className="text-slate-500 text-sm">No submissions yet</div>
                <div className="text-[10px] text-slate-600 mt-1">Be the first!</div>
              </div>
            </div>
          )}

          {/* XP / Level Widget */}
          <div className="card hover-card-glow p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm">⭐</span>
              <h3 className="font-semibold text-white text-sm">Level & XP</h3>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-brand-400">
                LVL {prodState.gamification.level}
              </div>
              <div className="text-xs text-yellow-400 font-medium mt-0.5">{prodState.gamification.title}</div>
              <div className="mt-3">
                <div className="flex items-center justify-between text-[10px] mb-1">
                  <span className="text-slate-500">XP</span>
                  <span className="text-slate-400">
                    {prodState.gamification.xp} / {prodState.gamification.xpForNext}
                  </span>
                </div>
                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-yellow-500 to-yellow-400 rounded-full transition-all duration-700"
                    style={{ width: `${Math.min(Math.round((prodState.gamification.xp / prodState.gamification.xpForNext) * 100), 100)}%` }}
                  />
                </div>
              </div>
              {/* Badges */}
              {prodState.gamification.badges.length > 0 && (
                <div className="flex items-center justify-center gap-1.5 mt-3 flex-wrap">
                  {prodState.gamification.badges.map(b => (
                    <span key={b.id} className="bg-slate-800/60 border border-slate-700/50 rounded-lg px-2 py-1 text-[10px] text-slate-300" title={b.label}>
                      {b.icon} {b.label}
                    </span>
                  ))}
                </div>
              )}
              {/* Quick Stats */}
              <div className="grid grid-cols-3 gap-2 mt-3">
                <div className="bg-slate-800/40 rounded-lg py-1.5">
                  <div className="text-xs font-bold text-white">{prodState.gamification.totalMonthForms}</div>
                  <div className="text-[8px] text-slate-500">Forms</div>
                </div>
                <div className="bg-slate-800/40 rounded-lg py-1.5">
                  <div className="text-xs font-bold text-white">{prodState.gamification.activeHours}</div>
                  <div className="text-[8px] text-slate-500">Hours</div>
                </div>
                <div className="bg-slate-800/40 rounded-lg py-1.5">
                  <div className="text-xs font-bold text-white">{prodState.gamification.attendanceDays}</div>
                  <div className="text-[8px] text-slate-500">Days</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Dynamic Hourly Entry (STAFF / own entry) */}
      {prodState && !stateLoading && (isStaff || isAdmin) && prodState.unlockedHours.length > 0 && (
        <div className="card">
          <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-white">Hourly Entry — {prodState.shiftDate}</h2>
              <span className={prodState.shiftType === 'DAY' ? 'badge-yellow' : 'badge-purple'}>{prodState.shiftType}</span>
            </div>
            <div className="text-[10px] text-slate-500">
              {prodState.unlockedHours.length} of 12 hours unlocked • Auto-saves after 2s
            </div>
          </div>
          <div className="p-4 space-y-2">
            {prodState.unlockedHours.map(h => {
              const saved = prodState.myHourData[h]?.[0]
              return (
                <HourRow
                  key={h}
                  hourIndex={h}
                  label={prodState.hourLabels[h] || ''}
                  isActive={h === prodState.currentHour}
                  isCurrent={h === prodState.currentHour}
                  shiftDate={prodState.shiftDate}
                  campaigns={prodState.campaigns}
                  savedData={saved ? { campaignId: saved.campaignId, formsCount: saved.formsCount, note: saved.note } : undefined}
                  onSaved={fetchState}
                />
              )
            })}
            {/* Future hours indicator */}
            {prodState.unlockedHours.length < 12 && (
              <div className="text-center py-2 text-[10px] text-slate-600 border-t border-slate-800/50 mt-2">
                {12 - prodState.unlockedHours.length} more hours will unlock as your shift progresses
              </div>
            )}
          </div>
        </div>
      )}

      {/* Team Hour States (TL/Admin) */}
      {(isTL || isAdmin) && prodState && prodState.teamHourStates.length > 0 && (
        <div className="card">
          <div className="px-6 py-4 border-b border-slate-800">
            <h2 className="font-semibold text-white">
              {isAdmin ? 'All Staff' : 'Team'} — Today&apos;s Hourly State
            </h2>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Staff</th>
                  <th>Team</th>
                  {[1,2,3,4,5,6,7,8,9,10,11,12].filter(h => prodState.unlockedHours.includes(h) || prodState.teamHourStates.some(s => s.hours.some(hr => hr.hourIndex === h))).map(h => (
                    <th key={h} className={h === prodState.currentHour ? 'text-brand-400' : ''}>
                      H{h}
                    </th>
                  ))}
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {prodState.teamHourStates.map(s => {
                  const hourMap: Record<number, number> = {}
                  for (const h of s.hours) {
                    hourMap[h.hourIndex] = (hourMap[h.hourIndex] || 0) + h.formsCount
                  }
                  return (
                    <tr key={s.staffId}>
                      <td className="font-semibold text-white">{s.name}</td>
                      <td><span className={s.team === 'DAY' ? 'badge-yellow' : 'badge-purple'}>{s.team}</span></td>
                      {[1,2,3,4,5,6,7,8,9,10,11,12].filter(h => prodState.unlockedHours.includes(h) || prodState.teamHourStates.some(st => st.hours.some(hr => hr.hourIndex === h))).map(h => (
                        <td key={h} className={`text-center font-mono text-xs ${h === prodState.currentHour ? 'text-brand-400 font-bold' : hourMap[h] ? 'text-emerald-400' : 'text-slate-700'}`}>
                          {hourMap[h] || '—'}
                        </td>
                      ))}
                      <td className="font-bold text-brand-400">{s.totalForms}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Existing: Top Section: Graph + Team Score + Top Performer (Admin / TL) */}
      {(isAdmin || isTL) && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Productivity Graph */}
          <div className="card hover-card-glow p-5 lg:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <span className="live-dot" />
              <h3 className="font-semibold text-white text-sm">Forms Submitted (Hourly)</h3>
              <div className="ml-auto flex items-center gap-4 text-[10px]">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-2 bg-yellow-400/80 rounded-sm" />
                  <span className="text-slate-500">Day Team</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-2 bg-purple-400/80 rounded-sm" />
                  <span className="text-slate-500">Night Team</span>
                </div>
              </div>
            </div>
            <div className="space-y-1.5">
              {hourlyData.map(h => (
                <div key={h.hour} className="flex items-center gap-3">
                  <div className="w-24 text-right flex-shrink-0">
                    <span className={`text-xs font-mono ${h.hour === prodState?.currentHour ? 'text-brand-400 font-bold' : 'text-slate-400'}`}>H{h.hour}</span>
                    <span className="text-[10px] text-slate-600 ml-1">({HOUR_LABELS[h.hour]})</span>
                  </div>
                  <div className="flex-1 flex gap-0.5 h-5">
                    {h.dayForms > 0 && (
                      <div
                        className="bg-gradient-to-r from-yellow-500 to-yellow-400 rounded-sm transition-all duration-700 relative group"
                        style={{ width: `${(h.dayForms / maxHourly) * 100}%` }}
                      >
                        <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-yellow-900 opacity-0 group-hover:opacity-100 transition-opacity">{h.dayForms}</span>
                      </div>
                    )}
                    {h.nightForms > 0 && (
                      <div
                        className="bg-gradient-to-r from-purple-500 to-purple-400 rounded-sm transition-all duration-700 relative group"
                        style={{ width: `${(h.nightForms / maxHourly) * 100}%` }}
                      >
                        <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-purple-900 opacity-0 group-hover:opacity-100 transition-opacity">{h.nightForms}</span>
                      </div>
                    )}
                    {h.total === 0 && (
                      <div className="h-full bg-slate-800/40 rounded-sm w-1" />
                    )}
                  </div>
                  <div className="w-12 text-right flex-shrink-0">
                    <span className="text-xs font-bold text-brand-400">{h.total}</span>
                  </div>
                  <div className="w-10 text-right flex-shrink-0">
                    <span className="text-[10px] text-slate-500">{h.staffCount}p</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Team Score + Top Performer */}
          <div className="space-y-4 lg:col-span-1">
            {/* AI Team Productivity Score */}
            {teamStats && (
              <div className="card hover-card-glow p-5">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-sm">🤖</span>
                  <h3 className="font-semibold text-white text-sm">Team Productivity Score</h3>
                </div>
                <div className="space-y-4">
                  {/* Day Team */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs text-yellow-400 font-medium">Day Team</span>
                      <span className="text-sm font-bold text-yellow-400 flex items-center gap-1">
                        {teamStats.dayScore > 0 && <span className="text-xs">⭐</span>}
                        {teamStats.dayScore}%
                      </span>
                    </div>
                    <div className="h-2.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-yellow-500 to-yellow-400 rounded-full transition-all duration-1000 progress-glow-yellow"
                        style={{ width: `${teamStats.dayScore}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between mt-1 text-[10px] text-slate-500">
                      <span>{teamStats.dayActiveStaff} staff active</span>
                      <span>{teamStats.dayForms} forms</span>
                    </div>
                  </div>
                  {/* Night Team */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs text-purple-400 font-medium">Night Team</span>
                      <span className="text-sm font-bold text-purple-400 flex items-center gap-1">
                        {teamStats.nightScore > 0 && <span className="text-xs">⭐</span>}
                        {teamStats.nightScore}%
                      </span>
                    </div>
                    <div className="h-2.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-purple-500 to-purple-400 rounded-full transition-all duration-1000 progress-glow-purple"
                        style={{ width: `${teamStats.nightScore}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between mt-1 text-[10px] text-slate-500">
                      <span>{teamStats.nightActiveStaff} staff active</span>
                      <span>{teamStats.nightForms} forms</span>
                    </div>
                  </div>
                  {/* Team comparison */}
                  <div className="pt-3 border-t border-slate-800/60">
                    <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">Today&apos;s Comparison</div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 text-center">
                        <div className="text-lg font-bold text-yellow-400 live-stat"><AnimatedNum value={teamStats.dayForms} /></div>
                        <div className="text-[10px] text-slate-500">Day Team</div>
                      </div>
                      <div className="text-xs text-slate-600 font-bold">VS</div>
                      <div className="flex-1 text-center">
                        <div className="text-lg font-bold text-purple-400 live-stat"><AnimatedNum value={teamStats.nightForms} /></div>
                        <div className="text-[10px] text-slate-500">Night Team</div>
                      </div>
                    </div>
                    {(teamStats.dayForms > 0 || teamStats.nightForms > 0) && (
                      <div className="mt-2 text-center">
                        <span className={`text-[10px] font-semibold ${teamStats.dayForms >= teamStats.nightForms ? 'text-yellow-400' : 'text-purple-400'}`}>
                          {teamStats.dayForms >= teamStats.nightForms ? '☀ Day Team' : '🌙 Night Team'} is leading!
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Top Performer This Hour (original) */}
            {topPerformer && (
              <div className="card hover-card-glow p-5">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-sm">🏆</span>
                  <h3 className="font-semibold text-white text-sm">Top Performer Right Now</h3>
                </div>
                <div className="bg-gradient-to-r from-yellow-500/10 to-amber-500/5 border border-yellow-500/15 rounded-xl px-4 py-3 text-center">
                  <div className="text-2xl mb-1">🥇</div>
                  <div className="font-bold text-white text-lg">{topPerformer.name}</div>
                  <div className="text-sm text-brand-400 font-semibold mt-1">{topPerformer.forms} forms</div>
                  <div className="text-[10px] text-slate-500 mt-1">
                    in H{topPerformer.hour} ({HOUR_LABELS[topPerformer.hour]})
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

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
          const staffPerHour: Record<number, Set<string>> = {}
          for (const l of dayLogs) {
            if (!staffPerHour[l.hourIndex]) staffPerHour[l.hourIndex] = new Set()
            staffPerHour[l.hourIndex].add(l.staff?.username || l.staffId)
          }
          return (
            <div key={date} className="card hover-card-glow">
              <div className="px-6 py-3 border-b border-slate-800 flex items-center justify-between">
                <span className="font-semibold text-white">
                  {new Date(date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
                </span>
                <span className="badge-blue">{dayTotal} forms</span>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Hour</th>
                      <th>Campaign</th>
                      <th>Forms</th>
                      <th>Staff Working</th>
                      <th className="hidden md:table-cell">Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dayLogs.sort((a: any, b: any) => a.hourIndex - b.hourIndex).map((l: any) => (
                      <tr key={l.id}>
                        <td>
                          <span className="badge-purple">H{l.hourIndex}</span>
                          <span className="text-[10px] text-slate-600 ml-1">({HOUR_LABELS[l.hourIndex] || ''})</span>
                        </td>
                        <td className="text-slate-300">{l.campaign?.name}</td>
                        <td className="font-bold text-brand-400">{l.formsCount}</td>
                        <td className="text-slate-400 text-xs">{staffPerHour[l.hourIndex]?.size || 1}</td>
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
