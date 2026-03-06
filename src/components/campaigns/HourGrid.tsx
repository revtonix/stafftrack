'use client'
import { useEffect, useState, useCallback } from 'react'
import { HourRowCard } from '@/components/ui/HourRowCard'
import { getShiftDayRange } from '@/lib/shiftDay'
import type { HourEntry, UserRole } from '@/types/campaign'

function buildEmptyHours(shiftStartISO: string): HourEntry[] {
  const shiftStart = new Date(shiftStartISO)
  return Array.from({ length: 12 }, (_, i) => {
    const start = new Date(shiftStart.getTime() + i * 3600 * 1000)
    const end   = new Date(start.getTime()       +     3600 * 1000)
    return {
      id:        `empty-${i}`,
      staffId:   '',
      shiftKey:  '',
      hourStart: start.toISOString(),
      hourEnd:   end.toISOString(),
      campaigns: [],
    }
  })
}

export function HourGrid({ staffId, role }: { staffId: string; role: UserRole }) {
  const [entries,  setEntries]  = useState<HourEntry[]>([])
  const [loading,  setLoading]  = useState(true)

  const range = getShiftDayRange()

  const fetchEntries = useCallback(async () => {
    try {
      const res  = await fetch(`/api/campaigns?staffId=${staffId}&shiftKey=${range.shiftKey}`)
      const data = await res.json()
      const fetched: HourEntry[] = data.entries ?? []

      const skeleton = buildEmptyHours(range.startISO)
      const merged   = skeleton.map(slot => {
        const match = fetched.find(e =>
          new Date(e.hourStart).getHours() === new Date(slot.hourStart).getHours()
        )
        return match ?? slot
      })
      setEntries(merged)
    } catch (e) {
      console.error('[HourGrid] fetch error', e)
    }
    setLoading(false)
  }, [staffId, range.shiftKey, range.startISO])

  useEffect(() => { fetchEntries() }, [fetchEntries])

  // ── Optimistic state helpers ────────────────────────────────────────────
  const handleAddCampaign = async (hourEntryId: string, name: string) => {
    const entry = entries.find(e => e.id === hourEntryId)
    if (!entry) return

    const res  = await fetch('/api/campaigns', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        staffId,
        shiftKey:     range.shiftKey,
        hourStart:    entry.hourStart,
        hourEnd:      entry.hourEnd,
        campaignName: name,
        count:        0,
      }),
    })
    const data = await res.json()
    if (!res.ok) return

    setEntries(prev => prev.map(e => {
      if (e.id !== hourEntryId) return e
      return {
        ...e,
        id:        data.hourEntryId,
        campaigns: [...e.campaigns, data.campaign],
      }
    }))
  }

  const handleRename = async (campaignId: string, newName: string) => {
    const res = await fetch(`/api/campaigns/${campaignId}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ name: newName }),
    })
    if (!res.ok) return

    setEntries(prev => prev.map(e => ({
      ...e,
      campaigns: e.campaigns.map(c =>
        c.id === campaignId ? { ...c, name: newName } : c
      ),
    })))
  }

  const handleCountChange = async (campaignId: string, delta: number) => {
    setEntries(prev => prev.map(e => ({
      ...e,
      campaigns: e.campaigns.map(c =>
        c.id === campaignId
          ? { ...c, count: Math.max(0, c.count + delta) }
          : c
      ),
    })))

    const current = entries.flatMap(e => e.campaigns).find(c => c.id === campaignId)
    if (!current) return

    await fetch(`/api/campaigns/${campaignId}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ count: Math.max(0, current.count + delta) }),
    })
  }

  const handleDelete = async (campaignId: string) => {
    setEntries(prev => prev.map(e => ({
      ...e,
      campaigns: e.campaigns.filter(c => c.id !== campaignId),
    })))
    await fetch(`/api/campaigns/${campaignId}`, { method: 'DELETE' })
  }

  const totalToday      = entries.flatMap(e => e.campaigns).reduce((s, c) => s + c.count, 0)
  const totalCampaigns  = entries.flatMap(e => e.campaigns).length
  const activeCampaigns = Array.from(new Set(entries.flatMap(e => e.campaigns.map(c => c.name))))

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map(i => (
          <div
            key={i}
            className="rounded-2xl h-20 animate-pulse"
            style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.04)',
              animationDelay: `${i * 100}ms`,
            }}
          />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Stats summary bar */}
      <div
        className="rounded-2xl px-6 py-4"
        style={{
          background: 'rgba(255,255,255,0.018)',
          border: '1px solid rgba(255,255,255,0.05)',
          backdropFilter: 'blur(12px)',
        }}
      >
        <div className="flex items-center justify-between flex-wrap gap-4">
          {/* Left: shift info */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div
                className="w-2 h-2 rounded-full"
                style={{
                  background: '#00ff94',
                  boxShadow: '0 0 8px rgba(0,255,148,0.5)',
                }}
              />
              <span
                className="text-[10px] font-bold uppercase tracking-[0.2em]"
                style={{ color: 'rgba(255,255,255,0.25)', fontFamily: 'DM Mono, monospace' }}
              >
                Shift Day
              </span>
            </div>
            <span
              className="text-xs font-semibold"
              style={{ color: 'rgba(255,255,255,0.5)' }}
            >
              {range.labelDate}
            </span>
          </div>

          {/* Right: quick stats */}
          <div className="flex items-center gap-5">
            {/* Active campaigns pills */}
            {activeCampaigns.length > 0 && (
              <div className="flex gap-1.5 flex-wrap justify-end">
                {activeCampaigns.slice(0, 5).map(name => (
                  <span
                    key={name}
                    className="text-[10px] font-semibold px-2.5 py-1 rounded-md"
                    style={{
                      background: 'rgba(109,40,217,0.08)',
                      color: 'rgba(167,139,250,0.7)',
                      border: '1px solid rgba(109,40,217,0.15)',
                    }}
                  >
                    {name}
                  </span>
                ))}
                {activeCampaigns.length > 5 && (
                  <span className="text-[10px] text-white/15 self-center">
                    +{activeCampaigns.length - 5}
                  </span>
                )}
              </div>
            )}

            {/* Divider */}
            <div className="w-px h-6" style={{ background: 'rgba(255,255,255,0.06)' }} />

            {/* Total campaigns */}
            <div className="text-center">
              <div className="text-[9px] font-bold uppercase tracking-widest text-white/15" style={{ fontFamily: 'DM Mono, monospace' }}>
                Entries
              </div>
              <div className="text-sm font-black tabular-nums text-white/50">
                {totalCampaigns}
              </div>
            </div>

            {/* Total count */}
            <div className="text-center">
              <div className="text-[9px] font-bold uppercase tracking-widest text-white/15" style={{ fontFamily: 'DM Mono, monospace' }}>
                Total
              </div>
              <div
                className="text-sm font-black tabular-nums"
                style={{ color: '#00ff94' }}
              >
                {totalToday}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Hour rows */}
      <div className="space-y-2.5">
        {entries.map((entry, i) => (
          <HourRowCard
            key={entry.id}
            entry={entry}
            role={role}
            index={i}
            onAddCampaign={handleAddCampaign}
            onRenameCampaign={handleRename}
            onUpdateCount={handleCountChange}
            onDeleteCampaign={handleDelete}
          />
        ))}
      </div>
    </div>
  )
}
