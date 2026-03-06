'use client'
import { useState, useRef, useEffect } from 'react'
import type { CampaignWork, UserRole } from '@/types/campaign'

// Deterministic color palette for campaign badges
const BADGE_COLORS = [
  { bg: 'rgba(99,102,241,0.10)',  border: 'rgba(99,102,241,0.25)',  text: '#a5b4fc', glow: 'rgba(99,102,241,0.15)'  },
  { bg: 'rgba(0,212,255,0.08)',   border: 'rgba(0,212,255,0.22)',   text: '#67e8f9', glow: 'rgba(0,212,255,0.12)'   },
  { bg: 'rgba(168,85,247,0.10)',  border: 'rgba(168,85,247,0.25)',  text: '#c4b5fd', glow: 'rgba(168,85,247,0.15)'  },
  { bg: 'rgba(0,255,148,0.07)',   border: 'rgba(0,255,148,0.20)',   text: '#6ee7b7', glow: 'rgba(0,255,148,0.10)'   },
  { bg: 'rgba(251,191,36,0.08)',  border: 'rgba(251,191,36,0.22)',  text: '#fcd34d', glow: 'rgba(251,191,36,0.12)'  },
  { bg: 'rgba(244,114,182,0.08)', border: 'rgba(244,114,182,0.22)', text: '#f9a8d4', glow: 'rgba(244,114,182,0.12)' },
  { bg: 'rgba(56,189,248,0.08)',  border: 'rgba(56,189,248,0.22)',  text: '#7dd3fc', glow: 'rgba(56,189,248,0.12)'  },
  { bg: 'rgba(248,113,113,0.08)', border: 'rgba(248,113,113,0.20)', text: '#fca5a5', glow: 'rgba(248,113,113,0.12)' },
]

function hashStr(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

function getColor(name: string) {
  return BADGE_COLORS[hashStr(name) % BADGE_COLORS.length]
}

export function CampaignBadge({
  campaign, role, onRename, onCountChange, onDelete,
}: {
  campaign:      CampaignWork
  role:          UserRole
  onRename:      (id: string, newName: string) => Promise<void>
  onCountChange: (id: string, delta: number)   => Promise<void>
  onDelete:      (id: string)                  => Promise<void>
}) {
  const canEdit   = role === 'ADMIN' || role === 'TEAM_LEAD_DAY' || role === 'TEAM_LEAD_NIGHT'
  const [editing,  setEditing]  = useState(false)
  const [nameVal,  setNameVal]  = useState(campaign.name)
  const [saving,   setSaving]   = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [hovered,  setHovered]  = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const menuRef  = useRef<HTMLDivElement>(null)

  const color = getColor(campaign.name)

  useEffect(() => { if (editing) inputRef.current?.focus() }, [editing])

  useEffect(() => {
    if (!showMenu) return
    const handler = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setShowMenu(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showMenu])

  const commitRename = async () => {
    if (!nameVal.trim() || nameVal.trim() === campaign.name) {
      setEditing(false)
      setNameVal(campaign.name)
      return
    }
    setSaving(true)
    await onRename(campaign.id, nameVal.trim())
    setSaving(false)
    setEditing(false)
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter')  commitRename()
    if (e.key === 'Escape') { setEditing(false); setNameVal(campaign.name) }
  }

  return (
    <div
      className="group relative flex items-center gap-2 rounded-xl select-none transition-all duration-200"
      style={{
        padding: '6px 10px 6px 14px',
        background: hovered ? color.bg.replace(/[\d.]+\)$/, m => `${parseFloat(m) * 1.8})`) : color.bg,
        border: `1px solid ${color.border}`,
        boxShadow: hovered ? `0 4px 20px ${color.glow}, inset 0 1px 0 rgba(255,255,255,0.04)` : `0 2px 8px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.03)`,
        transform: hovered ? 'translateY(-1px)' : 'none',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Campaign name */}
      {editing ? (
        <input
          ref={inputRef}
          value={nameVal}
          onChange={e => setNameVal(e.target.value)}
          onBlur={commitRename}
          onKeyDown={handleKey}
          disabled={saving}
          className="bg-transparent outline-none text-white w-28 font-semibold text-xs"
          style={{ borderBottom: `1px solid ${color.border}` }}
        />
      ) : (
        <span
          className={`text-xs font-semibold tracking-wide ${canEdit ? 'cursor-pointer' : ''}`}
          style={{ color: color.text }}
          onDoubleClick={() => canEdit && setEditing(true)}
          title={canEdit ? 'Double-click to rename' : ''}
        >
          {campaign.name}
        </span>
      )}

      {/* Separator dot */}
      <span className="w-px h-3 mx-0.5" style={{ background: color.border }} />

      {/* Count stepper */}
      <div
        className="flex items-center gap-0.5 rounded-lg px-1 py-0.5"
        style={{ background: 'rgba(255,255,255,0.06)' }}
      >
        <button
          onClick={() => campaign.count > 0 && onCountChange(campaign.id, -1)}
          className="w-5 h-5 flex items-center justify-center rounded-md text-xs transition-all duration-150 hover:bg-white/10"
          style={{ color: 'rgba(255,255,255,0.35)' }}
        >
          -
        </button>
        <span
          className="text-xs font-black tabular-nums w-6 text-center"
          style={{ color: '#fff' }}
        >
          {campaign.count}
        </span>
        <button
          onClick={() => onCountChange(campaign.id, +1)}
          className="w-5 h-5 flex items-center justify-center rounded-md text-xs transition-all duration-150 hover:bg-white/10"
          style={{ color: 'rgba(255,255,255,0.35)' }}
        >
          +
        </button>
      </div>

      {/* Admin / TL menu */}
      {canEdit && (
        <div ref={menuRef} className="relative">
          <button
            onClick={() => setShowMenu(m => !m)}
            className="opacity-0 group-hover:opacity-100 transition-all duration-200 w-5 h-5 flex items-center justify-center rounded-md hover:bg-white/10"
            style={{ color: 'rgba(255,255,255,0.3)' }}
          >
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zm6 0a2 2 0 11-4 0 2 2 0 014 0zm6 0a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </button>

          {showMenu && (
            <div
              className="absolute right-0 top-7 z-50 rounded-xl overflow-hidden text-xs font-medium w-36"
              style={{
                background: 'rgba(15,18,30,0.95)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255,255,255,0.08)',
                boxShadow: '0 12px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.03)',
              }}
            >
              <button
                onClick={() => { setEditing(true); setShowMenu(false) }}
                className="w-full text-left px-4 py-2.5 text-white/50 hover:text-white hover:bg-white/[0.05] transition-colors flex items-center gap-2.5"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Rename
              </button>
              <div style={{ height: 1, background: 'rgba(255,255,255,0.05)' }} />
              <button
                onClick={async () => { setShowMenu(false); await onDelete(campaign.id) }}
                className="w-full text-left px-4 py-2.5 text-rose-400/60 hover:text-rose-400 hover:bg-rose-500/[0.06] transition-colors flex items-center gap-2.5"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
