'use client'
// src/app/dashboard/productivity/page.tsx
import { useState, useEffect, useRef } from 'react'

// Hour labels mapping (Day shift: H1=7AM, Night shift: H1=7PM)
const HOUR_LABELS: Record<number, string> = {
  1: '7–8', 2: '8–9', 3: '9–10', 4: '10–11', 5: '11–12', 6: '12–1',
  7: '1–2', 8: '2–3', 9: '3–4', 10: '4–5', 11: '5–6', 12: '6–7',
}

interface HourlyData { hour: number; dayForms: number; nightForms: number; total: number; staffCount: number }
interface TeamStats { dayForms: number; nightForms: number; dayActiveStaff: number; nightActiveStaff: number; dayScore: number; nightScore: number }
interface TopPerformer { name: string; forms: number; hour: number }

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

  // Auto refresh every 10s
  useEffect(() => {
    const t = setInterval(() => setRefreshCount(c => c + 1), 10000)
    return () => clearInterval(t)
  }, [])

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

  return (
    <div className="space-y-6">
      {/* Header with Live indicator */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Productivity History</h1>
          <p className="text-slate-400 text-sm mt-1">Your hourly form submissions</p>
        </div>
        <div className="flex items-center gap-2 bg-slate-800/60 px-3 py-2 rounded-xl border border-slate-700/50">
          <span className="live-dot" />
          <span className="text-xs font-semibold text-emerald-400">LIVE</span>
          <span className="text-[10px] text-slate-500 ml-1">Refreshes every 10s</span>
        </div>
      </div>

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

      {/* Top Section: Graph + Team Score + Top Performer */}
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
                  <span className="text-xs font-mono text-slate-400">H{h.hour}</span>
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

          {/* Top Performer This Hour */}
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
          // Count unique staff per hour
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
