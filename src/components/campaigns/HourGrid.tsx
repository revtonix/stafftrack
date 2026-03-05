'use client'
import { useEffect, useState, useCallback } from 'react'
import { HourRow } from '@/components/campaigns/HourRow'
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

      // Merge fetched entries into 12-hour skeleton so every hour shows
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
        id:        data.hourEntryId,    // replace temp id if just created
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
    // Optimistic update first
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
    // Optimistic remove
    setEntries(prev => prev.map(e => ({
      ...e,
      campaigns: e.campaigns.filter(c => c.id !== campaignId),
    })))
    await fetch(`/api/campaigns/${campaignId}`, { method: 'DELETE' })
  }

  const totalToday      = entries.flatMap(e => e.campaigns).reduce((s, c) => s + c.count, 0)
  const activeCampaigns = [...new Set(entries.flatMap(e => e.campaigns.map(c => c.name)))]

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4].map(i => (
          <div
            key={i}
            className="rounded-2xl p-4 h-16 animate-pulse"
            style={{
              background: 'rgba(255,255,255,0.025)',
              border:     '1px solid rgba(255,255,255,0.06)',
            }}
          />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Day summary bar */}
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-bold text-white/30 uppercase tracking-widest">
          Shift Day • {range.labelDate}
        </span>

        <div className="flex items-center gap-3">
          {activeCampaigns.length > 0 && (
            <div className="flex gap-1.5 flex-wrap justify-end">
              {activeCampaigns.slice(0, 4).map(name => (
                <span
                  key={name}
                  className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                  style={{
                    background: 'rgba(99,102,241,0.1)',
                    color:      '#a5b4fc',
                    border:     '1px solid rgba(99,102,241,0.2)',
                  }}
                >
                  {name}
                </span>
              ))}
              {activeCampaigns.length > 4 && (
                <span className="text-[10px] text-white/20">
                  +{activeCampaigns.length - 4} more
                </span>
              )}
            </div>
          )}

          <span className="text-sm font-black text-emerald-400 tabular-nums">
            {totalToday}{' '}
            <span className="text-xs font-normal text-white/25">today</span>
          </span>
        </div>
      </div>

      {/* One row per hour */}
      {entries.map(entry => (
        <HourRow
          key={entry.id}
          entry={entry}
          role={role}
          onAddCampaign={handleAddCampaign}
          onRenameCampaign={handleRename}
          onUpdateCount={handleCountChange}
          onDeleteCampaign={handleDelete}
        />
      ))}
    </div>
  )
}
