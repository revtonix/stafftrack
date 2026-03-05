'use client'
import { useState, useRef, useEffect } from 'react'
import type { CampaignWork, HourEntry, UserRole } from '@/types/campaign'

function toHHMM(iso: string) {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour:     '2-digit',
    minute:   '2-digit',
    hour12:   false,
  }).format(new Date(iso))
}

// ─── Campaign Chip ────────────────────────────────────────────────────────────
function CampaignChip({
  campaign, role, onRename, onCountChange, onDelete,
}: {
  campaign:      CampaignWork
  role:          UserRole
  onRename:      (id: string, newName: string) => Promise<void>
  onCountChange: (id: string, delta: number)   => Promise<void>
  onDelete:      (id: string)                  => Promise<void>
}) {
  const canEdit   = role === 'ADMIN' || role === 'TEAM_LEAD'
  const [editing,  setEditing]  = useState(false)
  const [nameVal,  setNameVal]  = useState(campaign.name)
  const [saving,   setSaving]   = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const menuRef  = useRef<HTMLDivElement>(null)

  useEffect(() => { if (editing) inputRef.current?.focus() }, [editing])

  // Close menu on outside click
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
      className="group relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold select-none"
      style={{
        background: 'rgba(99,102,241,0.12)',
        border:     '1px solid rgba(99,102,241,0.25)',
        color:      '#a5b4fc',
      }}
    >
      {/* Name */}
      {editing ? (
        <input
          ref={inputRef}
          value={nameVal}
          onChange={e => setNameVal(e.target.value)}
          onBlur={commitRename}
          onKeyDown={handleKey}
          disabled={saving}
          className="bg-transparent outline-none text-white w-28 font-semibold text-xs"
          style={{ borderBottom: '1px solid rgba(99,102,241,0.6)' }}
        />
      ) : (
        <span
          className={canEdit ? 'cursor-pointer hover:text-white transition-colors' : ''}
          onDoubleClick={() => canEdit && setEditing(true)}
          title={canEdit ? 'Double-click to rename' : ''}
        >
          {campaign.name}
        </span>
      )}

      {/* Count stepper */}
      <div
        className="flex items-center gap-1 ml-1 rounded-lg px-1.5 py-0.5"
        style={{ background: 'rgba(255,255,255,0.1)' }}
      >
        <button
          onClick={() => campaign.count > 0 && onCountChange(campaign.id, -1)}
          className="text-white/40 hover:text-white w-3.5 h-3.5 flex items-center justify-center leading-none transition-colors"
        >
          −
        </button>
        <span className="text-white font-black tabular-nums w-5 text-center">
          {campaign.count}
        </span>
        <button
          onClick={() => onCountChange(campaign.id, +1)}
          className="text-white/40 hover:text-white w-3.5 h-3.5 flex items-center justify-center leading-none transition-colors"
        >
          +
        </button>
      </div>

      {/* Admin / TL action menu */}
      {canEdit && (
        <div ref={menuRef} className="relative">
          <button
            onClick={() => setShowMenu(m => !m)}
            className="opacity-0 group-hover:opacity-100 transition-opacity text-white/30 hover:text-white ml-0.5 w-4 h-4 flex items-center justify-center rounded"
          >
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zm6 0a2 2 0 11-4 0 2 2 0 014 0zm6 0a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </button>

          {showMenu && (
            <div
              className="absolute right-0 top-5 z-50 rounded-xl overflow-hidden text-xs font-medium w-36"
              style={{
                background:  '#1a1f35',
                border:      '1px solid rgba(255,255,255,0.1)',
                boxShadow:   '0 8px 32px rgba(0,0,0,0.5)',
              }}
            >
              <button
                onClick={() => { setEditing(true); setShowMenu(false) }}
                className="w-full text-left px-4 py-2.5 text-white/60 hover:text-white hover:bg-white/[0.06] transition-colors flex items-center gap-2"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Rename
              </button>
              <button
                onClick={async () => { setShowMenu(false); await onDelete(campaign.id) }}
                className="w-full text-left px-4 py-2.5 text-rose-400/70 hover:text-rose-400 hover:bg-rose-500/[0.08] transition-colors flex items-center gap-2"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
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

// ─── Add Campaign Form ────────────────────────────────────────────────────────
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
        placeholder="Campaign name…"
        disabled={saving}
        className="text-xs px-3 py-1.5 rounded-xl font-medium text-white placeholder-white/20 focus:outline-none transition-all w-40"
        style={{
          background: 'rgba(255,255,255,0.05)',
          border:     '1px solid rgba(99,102,241,0.4)',
        }}
      />
      <button
        onClick={submit}
        disabled={saving || !val.trim()}
        className="text-xs px-3 py-1.5 rounded-xl font-semibold text-white transition-all disabled:opacity-40"
        style={{
          background: 'linear-gradient(135deg,#4f46e5,#6366f1)',
          boxShadow:  '0 2px 8px rgba(79,70,229,0.3)',
        }}
      >
        {saving ? '…' : 'Add'}
      </button>
      <button
        onClick={onCancel}
        className="text-xs text-white/20 hover:text-white/50 transition-colors"
      >
        ✕
      </button>
    </div>
  )
}

// ─── HourRow (main export) ────────────────────────────────────────────────────
export function HourRow({
  entry, role,
  onAddCampaign, onRenameCampaign, onUpdateCount, onDeleteCampaign,
}: {
  entry:             HourEntry
  role:              UserRole
  onAddCampaign:     (hourEntryId: string, name: string)    => Promise<void>
  onRenameCampaign:  (campaignId: string, newName: string)  => Promise<void>
  onUpdateCount:     (campaignId: string, delta: number)    => Promise<void>
  onDeleteCampaign:  (campaignId: string)                   => Promise<void>
}) {
  const [showAdd, setShowAdd] = useState(false)
  const totalCount = entry.campaigns.reduce((s, c) => s + c.count, 0)

  const handleAdd = async (name: string) => {
    await onAddCampaign(entry.id, name)
    setShowAdd(false)
  }

  return (
    <div
      className="rounded-2xl p-4 transition-all"
      style={{
        background: 'rgba(255,255,255,0.025)',
        border:     '1px solid rgba(255,255,255,0.06)',
      }}
    >
      {/* Hour label row */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs font-bold text-white/40 tabular-nums">
            {toHHMM(entry.hourStart)} – {toHHMM(entry.hourEnd)}
          </span>
          {entry.campaigns.length > 0 && (
            <span className="text-[10px] font-bold uppercase tracking-widest text-white/20">
              {entry.campaigns.length} campaign{entry.campaigns.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {totalCount > 0 && (
          <span
            className="text-xs font-black tabular-nums px-2.5 py-1 rounded-full"
            style={{
              background: 'rgba(16,185,129,0.12)',
              color:      '#34d399',
              border:     '1px solid rgba(16,185,129,0.2)',
            }}
          >
            {totalCount} total
          </span>
        )}
      </div>

      {/* Campaign chips + Add button */}
      <div className="flex flex-wrap gap-2 min-h-[32px]">
        {entry.campaigns.map(c => (
          <CampaignChip
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
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
            style={{
              background:  'rgba(255,255,255,0.04)',
              border:      '1px dashed rgba(255,255,255,0.15)',
              color:       'rgba(255,255,255,0.3)',
            }}
            onMouseEnter={e => {
              const el = e.currentTarget as HTMLElement
              el.style.borderColor = 'rgba(99,102,241,0.5)'
              el.style.color       = '#a5b4fc'
            }}
            onMouseLeave={e => {
              const el = e.currentTarget as HTMLElement
              el.style.borderColor = 'rgba(255,255,255,0.15)'
              el.style.color       = 'rgba(255,255,255,0.3)'
            }}
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            Add campaign
          </button>
        )}
      </div>
    </div>
  )
}
