'use client'
import { useState, useRef, useEffect } from 'react'
import { CampaignBadge } from '@/components/ui/CampaignBadge'
import { DashboardButton } from '@/components/ui/DashboardButton'
import type { HourEntry, UserRole } from '@/types/campaign'

function toHHMM(iso: string) {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour:     '2-digit',
    minute:   '2-digit',
    hour12:   false,
  }).format(new Date(iso))
}

function getHourPeriod(iso: string): 'morning' | 'afternoon' | 'evening' {
  const h = new Date(iso).getUTCHours()
  // Adjust for IST (+5:30)
  const istHour = (h + 5) % 24
  if (istHour < 12) return 'morning'
  if (istHour < 17) return 'afternoon'
  return 'evening'
}

const PERIOD_ACCENT = {
  morning:   { dot: '#00d4ff', glow: 'rgba(0,212,255,0.4)',   line: 'rgba(0,212,255,0.25)'   },
  afternoon: { dot: '#a78bfa', glow: 'rgba(167,139,250,0.4)', line: 'rgba(167,139,250,0.25)' },
  evening:   { dot: '#f472b6', glow: 'rgba(244,114,182,0.4)', line: 'rgba(244,114,182,0.25)' },
}

// ─── Add Campaign Inline Form ─────────────────────────────────────────────────
function AddCampaignForm({ onAdd, onCancel }: {
  onAdd:    (name: string) => Promise<void>
  onCancel: () => void
}) {
  const [val,    setVal]    = useState('')
  const [saving, setSaving] = useState(false)
  const ref = useRef<HTMLInputElement>(null)

  useEffect(() => { ref.current?.focus() }, [])

  const submit = async () => {
    if (!val.trim()) return
    setSaving(true)
    await onAdd(val.trim())
    setSaving(false)
  }

  return (
    <div className="flex items-center gap-2">
      <input
        ref={ref}
        value={val}
        onChange={e => setVal(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter')  submit()
          if (e.key === 'Escape') onCancel()
        }}
        placeholder="Campaign name..."
        disabled={saving}
        className="text-xs px-3 py-2 rounded-xl font-medium text-white placeholder-white/20 focus:outline-none transition-all w-44"
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(109,40,217,0.35)',
          boxShadow: '0 0 0 3px rgba(109,40,217,0.08)',
        }}
      />
      <DashboardButton
        variant="primary"
        size="sm"
        onClick={submit}
        disabled={saving || !val.trim()}
      >
        {saving ? '...' : 'Add'}
      </DashboardButton>
      <button
        onClick={onCancel}
        className="w-6 h-6 flex items-center justify-center rounded-lg text-white/20 hover:text-white/50 hover:bg-white/5 transition-all"
      >
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}

// ─── HourRowCard (main export) ────────────────────────────────────────────────
export function HourRowCard({
  entry, role, index,
  onAddCampaign, onRenameCampaign, onUpdateCount, onDeleteCampaign,
}: {
  entry:             HourEntry
  role:              UserRole
  index:             number
  onAddCampaign:     (hourEntryId: string, name: string)    => Promise<void>
  onRenameCampaign:  (campaignId: string, newName: string)  => Promise<void>
  onUpdateCount:     (campaignId: string, delta: number)    => Promise<void>
  onDeleteCampaign:  (campaignId: string)                   => Promise<void>
}) {
  const [showAdd, setShowAdd] = useState(false)
  const [hovered, setHovered] = useState(false)
  const totalCount = entry.campaigns.reduce((s, c) => s + c.count, 0)
  const period = getHourPeriod(entry.hourStart)
  const accent = PERIOD_ACCENT[period]

  const handleAdd = async (name: string) => {
    await onAddCampaign(entry.id, name)
    setShowAdd(false)
  }

  return (
    <div
      className="relative rounded-2xl transition-all duration-300"
      style={{
        background: hovered
          ? 'rgba(255,255,255,0.035)'
          : 'rgba(255,255,255,0.018)',
        border: hovered
          ? '1px solid rgba(255,255,255,0.1)'
          : '1px solid rgba(255,255,255,0.05)',
        boxShadow: hovered
          ? '0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.04)'
          : '0 2px 8px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.02)',
        backdropFilter: 'blur(12px)',
        animationDelay: `${index * 40}ms`,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Left accent bar */}
      <div
        className="absolute left-0 top-3 bottom-3 w-[3px] rounded-full transition-all duration-300"
        style={{
          background: `linear-gradient(to bottom, ${accent.dot}, transparent)`,
          opacity: hovered ? 1 : 0.5,
        }}
      />

      <div className="px-5 py-4">
        {/* Header row: Time | Campaign count | Total */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            {/* Time badge */}
            <div
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <div
                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{
                  background: accent.dot,
                  boxShadow: `0 0 6px ${accent.glow}`,
                }}
              />
              <span className="font-mono text-xs font-bold tabular-nums" style={{ color: accent.dot }}>
                {toHHMM(entry.hourStart)}
              </span>
              <span className="text-white/15 text-[10px]">-</span>
              <span className="font-mono text-xs font-medium tabular-nums text-white/35">
                {toHHMM(entry.hourEnd)}
              </span>
            </div>

            {entry.campaigns.length > 0 && (
              <span
                className="text-[10px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-md"
                style={{
                  color: 'rgba(255,255,255,0.22)',
                  background: 'rgba(255,255,255,0.02)',
                }}
              >
                {entry.campaigns.length} campaign{entry.campaigns.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          {totalCount > 0 && (
            <div
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black tabular-nums"
              style={{
                background: 'rgba(0,255,148,0.06)',
                border: '1px solid rgba(0,255,148,0.15)',
                color: '#34d399',
                boxShadow: '0 2px 8px rgba(0,255,148,0.06)',
              }}
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              {totalCount}
            </div>
          )}
        </div>

        {/* Campaign badges row */}
        <div className="flex flex-wrap gap-2.5 min-h-[36px] items-center">
          {entry.campaigns.map(c => (
            <CampaignBadge
              key={c.id}
              campaign={c}
              role={role}
              onRename={onRenameCampaign}
              onCountChange={onUpdateCount}
              onDelete={onDeleteCampaign}
            />
          ))}

          {showAdd ? (
            <AddCampaignForm onAdd={handleAdd} onCancel={() => setShowAdd(false)} />
          ) : (
            <button
              onClick={() => setShowAdd(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-200 group/add"
              style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px dashed rgba(255,255,255,0.1)',
                color: 'rgba(255,255,255,0.25)',
              }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLElement
                el.style.borderColor = 'rgba(109,40,217,0.45)'
                el.style.color = '#a78bfa'
                el.style.background = 'rgba(109,40,217,0.06)'
                el.style.borderStyle = 'solid'
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLElement
                el.style.borderColor = 'rgba(255,255,255,0.1)'
                el.style.color = 'rgba(255,255,255,0.25)'
                el.style.background = 'rgba(255,255,255,0.02)'
                el.style.borderStyle = 'dashed'
              }}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
