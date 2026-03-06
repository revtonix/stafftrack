'use client'
// src/app/dashboard/campaigns/page.tsx
import { useState, useEffect, useCallback } from 'react'

interface Campaign { id: string; name: string; team: string }
interface WorkLogEntry {
  id: string; hourIndex: number; formsCount: number; campaignId: string
  campaign: { id: string; name: string; team: string }
  staff?: { username: string }
}

const HOUR_SLOTS = [
  { index: 1, start: '09:00', end: '10:00' },
  { index: 2, start: '10:00', end: '11:00' },
  { index: 3, start: '11:00', end: '12:00' },
  { index: 4, start: '12:00', end: '13:00' },
  { index: 5, start: '13:00', end: '14:00' },
  { index: 6, start: '14:00', end: '15:00' },
  { index: 7, start: '15:00', end: '16:00' },
  { index: 8, start: '16:00', end: '17:00' },
  { index: 9, start: '17:00', end: '18:00' },
  { index: 10, start: '18:00', end: '19:00' },
  { index: 11, start: '19:00', end: '20:00' },
  { index: 12, start: '20:00', end: '21:00' },
]

const CAMPAIGN_COLORS = [
  'bg-cyan-500/15 text-cyan-400 border-cyan-500/25',
  'bg-purple-500/15 text-purple-400 border-purple-500/25',
  'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
  'bg-yellow-500/15 text-yellow-400 border-yellow-500/25',
  'bg-pink-500/15 text-pink-400 border-pink-500/25',
  'bg-blue-500/15 text-blue-400 border-blue-500/25',
  'bg-orange-500/15 text-orange-400 border-orange-500/25',
  'bg-indigo-500/15 text-indigo-400 border-indigo-500/25',
]

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [workLogs, setWorkLogs] = useState<WorkLogEntry[]>([])
  const [role, setRole] = useState('')
  const [loading, setLoading] = useState(true)
  const [now, setNow] = useState(new Date())

  // Add modal state
  const [addModal, setAddModal] = useState<{ hourIndex: number } | null>(null)
  const [addForm, setAddForm] = useState({ campaignId: '', formsCount: '' })
  const [saving, setSaving] = useState(false)

  // Campaign management state
  const [showManage, setShowManage] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [newCamp, setNewCamp] = useState({ name: '', team: 'DAY' })
  const [msg, setMsg] = useState('')

  const todayStr = now.toISOString().split('T')[0]

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => { if (d.success) setRole(d.data.role) }).catch(() => {})
  }, [])

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [campRes, logRes] = await Promise.all([
        fetch('/api/campaigns'),
        fetch(`/api/worklogs?date=${todayStr}&all=true`),
      ])
      const [camp, logs] = await Promise.all([campRes.json(), logRes.json()])
      if (camp.success) setCampaigns(camp.data)
      if (logs.success) setWorkLogs(logs.data)
    } catch {}
    setLoading(false)
  }, [todayStr])

  useEffect(() => { fetchData() }, [fetchData])

  // Group worklogs by hour -> campaign with totals
  function getHourData(hourIndex: number) {
    const hourLogs = workLogs.filter(l => l.hourIndex === hourIndex)
    const byCampaign: Record<string, { name: string; total: number; id: string }> = {}
    for (const log of hourLogs) {
      const key = log.campaignId
      if (!byCampaign[key]) byCampaign[key] = { name: log.campaign.name, total: 0, id: key }
      byCampaign[key].total += log.formsCount
    }
    return Object.values(byCampaign).sort((a, b) => b.total - a.total)
  }

  function getCampaignColor(campId: string) {
    const idx = campaigns.findIndex(c => c.id === campId)
    return CAMPAIGN_COLORS[(idx >= 0 ? idx : 0) % CAMPAIGN_COLORS.length]
  }

  async function handleAddEntry() {
    if (!addModal || !addForm.campaignId || !addForm.formsCount) return
    setSaving(true)
    try {
      const res = await fetch('/api/worklogs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId: addForm.campaignId,
          date: todayStr,
          hourIndex: addModal.hourIndex,
          formsCount: parseInt(addForm.formsCount),
        }),
      })
      const d = await res.json()
      if (d.success) {
        setAddModal(null)
        setAddForm({ campaignId: '', formsCount: '' })
        fetchData()
      }
    } catch {}
    setSaving(false)
  }

  // Campaign management
  async function saveEdit(id: string) {
    const res = await fetch(`/api/campaigns/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editName }),
    })
    const d = await res.json()
    if (d.success) { setEditId(null); fetchData(); setMsg('Campaign updated!') }
    else setMsg(d.error || 'Error')
  }

  async function createCampaign() {
    const res = await fetch('/api/campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newCamp),
    })
    const d = await res.json()
    if (d.success) { fetchData(); setNewCamp({ name: '', team: 'DAY' }); setMsg('Campaign created!') }
    else setMsg(d.error || 'Error')
  }

  const shiftTime = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Kolkata' })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Campaigns &middot; Multi-Hour Grid</h1>
          <p className="text-slate-500 text-sm mt-1">Admin/TL can add multiple campaigns per hour &middot; Shift: {shiftTime} IST</p>
        </div>
        <button className="btn-secondary btn-sm" onClick={() => setShowManage(!showManage)}>
          {showManage ? 'Hide Management' : 'Manage Campaigns'}
        </button>
      </div>

      {msg && <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm rounded-xl px-4 py-3">{msg}</div>}

      {/* Multi-Hour Grid */}
      <div className="space-y-3">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          HOUR_SLOTS.map(slot => {
            const hourCampaigns = getHourData(slot.index)
            return (
              <div key={slot.index} className="card px-5 py-4">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  {/* Time slot */}
                  <div className="flex items-center gap-3 min-w-[140px]">
                    <span className="text-sm font-bold text-brand-400 bg-brand-600/15 px-2.5 py-1 rounded-lg border border-brand-600/25 font-mono">
                      {slot.start}
                    </span>
                    <span className="text-slate-600">-</span>
                    <span className="text-sm text-slate-400 font-mono">{slot.end}</span>
                  </div>

                  {/* Campaign badges */}
                  <div className="flex items-center gap-2 flex-wrap flex-1 justify-end">
                    {hourCampaigns.length === 0 && (
                      <span className="text-xs text-slate-600 italic">No entries yet</span>
                    )}
                    {hourCampaigns.map(camp => (
                      <span
                        key={camp.id}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border ${getCampaignColor(camp.id)}`}
                      >
                        {camp.name}: <span className="font-bold">{camp.total}</span>
                      </span>
                    ))}
                    <button
                      onClick={() => {
                        setAddModal({ hourIndex: slot.index })
                        setAddForm({ campaignId: campaigns[0]?.id || '', formsCount: '' })
                      }}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-brand-600/15 text-brand-400 border border-brand-600/25 hover:bg-brand-600/25 transition-colors cursor-pointer"
                    >
                      + Add
                    </button>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Add Entry Modal */}
      {addModal && (
        <>
          <div className="fixed inset-0 bg-black/60 z-40" onClick={() => setAddModal(null)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md px-4">
            <div className="card p-6">
              <h3 className="font-semibold text-white mb-4">
                Add Entry &middot; {HOUR_SLOTS[addModal.hourIndex - 1]?.start} - {HOUR_SLOTS[addModal.hourIndex - 1]?.end}
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="label">Campaign</label>
                  <select
                    className="input"
                    value={addForm.campaignId}
                    onChange={e => setAddForm(p => ({ ...p, campaignId: e.target.value }))}
                  >
                    {campaigns.map(c => <option key={c.id} value={c.id}>{c.name} ({c.team})</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Forms Count</label>
                  <input
                    type="number"
                    min="0"
                    className="input"
                    placeholder="Enter forms count"
                    value={addForm.formsCount}
                    onChange={e => setAddForm(p => ({ ...p, formsCount: e.target.value }))}
                    autoFocus
                  />
                </div>
                <div className="flex gap-3 justify-end">
                  <button className="btn-secondary btn-sm" onClick={() => setAddModal(null)}>Cancel</button>
                  <button className="btn-primary btn-sm" onClick={handleAddEntry} disabled={saving}>
                    {saving ? 'Saving...' : 'Add Entry'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Campaign Management (toggle) */}
      {showManage && (
        <>
          {role === 'ADMIN' && (
            <div className="card p-6">
              <h2 className="font-semibold text-white mb-4">Add New Campaign</h2>
              <div className="flex flex-wrap gap-3">
                <input className="input flex-1 min-w-48" placeholder="Campaign name" value={newCamp.name} onChange={e => setNewCamp(p => ({...p, name: e.target.value}))} />
                <select className="input w-32" value={newCamp.team} onChange={e => setNewCamp(p => ({...p, team: e.target.value}))}>
                  <option value="DAY">Day</option>
                  <option value="NIGHT">Night</option>
                </select>
                <button className="btn-primary" onClick={createCampaign}>Add Campaign</button>
              </div>
            </div>
          )}

          {['DAY', 'NIGHT'].map(team => {
            const camps = campaigns.filter(c => c.team === team)
            const color = team === 'DAY' ? 'badge-yellow' : 'badge-purple'
            return (
              <div key={team} className="card">
                <div className="px-6 py-4 border-b border-slate-800/80 flex items-center gap-3">
                  <h2 className="font-semibold text-white">{team} Team Campaigns</h2>
                  <span className={color}>{camps.length} campaigns</span>
                </div>
                <div className="divide-y divide-slate-800/40">
                  {camps.map((c: any) => (
                    <div key={c.id} className="px-6 py-3 flex items-center justify-between gap-4">
                      {editId === c.id ? (
                        <div className="flex gap-2 flex-1">
                          <input
                            className="input text-sm"
                            value={editName}
                            onChange={e => setEditName(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && saveEdit(c.id)}
                            autoFocus
                          />
                          <button className="btn-success btn-sm" onClick={() => saveEdit(c.id)}>Save</button>
                          <button className="btn-secondary btn-sm" onClick={() => setEditId(null)}>Cancel</button>
                        </div>
                      ) : (
                        <>
                          <span className="text-slate-200">{c.name}</span>
                          <button
                            className="btn-secondary btn-sm"
                            onClick={() => { setEditId(c.id); setEditName(c.name) }}
                          >
                            Rename
                          </button>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </>
      )}
    </div>
  )
}
