'use client'
// src/app/dashboard/campaigns/page.tsx
import { useState, useEffect } from 'react'

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<any[]>([])
  const [role, setRole] = useState('')
  const [loading, setLoading] = useState(true)
  const [editId, setEditId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [newCamp, setNewCamp] = useState({ name: '', team: 'DAY' })
  const [msg, setMsg] = useState('')

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => { if (d.success) setRole(d.data.role) })
    fetchCampaigns()
  }, [])

  async function fetchCampaigns() {
    setLoading(true)
    const res = await fetch('/api/campaigns?team=DAY')
    const res2 = await fetch('/api/campaigns?team=NIGHT')
    const [d1, d2] = await Promise.all([res.json(), res2.json()])
    setCampaigns([...(d1.data || []), ...(d2.data || [])])
    setLoading(false)
  }

  async function saveEdit(id: string) {
    const res = await fetch(`/api/campaigns/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editName }),
    })
    const d = await res.json()
    if (d.success) { setEditId(null); fetchCampaigns(); setMsg('Campaign updated!') }
    else setMsg(d.error || 'Error')
  }

  async function createCampaign() {
    const res = await fetch('/api/campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newCamp),
    })
    const d = await res.json()
    if (d.success) { fetchCampaigns(); setNewCamp({ name: '', team: 'DAY' }); setMsg('Campaign created!') }
    else setMsg(d.error || 'Error')
  }

  const dayCamps = campaigns.filter(c => c.team === 'DAY')
  const nightCamps = campaigns.filter(c => c.team === 'NIGHT')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Campaigns</h1>
        <p className="text-slate-400 text-sm mt-1">Manage campaign names for your team</p>
      </div>

      {msg && <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm rounded-xl px-4 py-3">{msg}</div>}

      {/* Create new (admin only) */}
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

      {/* Campaign lists */}
      {[{ team: 'DAY', camps: dayCamps, color: 'badge-yellow' }, { team: 'NIGHT', camps: nightCamps, color: 'badge-purple' }].map(({ team, camps, color }) => (
        <div key={team} className="card">
          <div className="px-6 py-4 border-b border-slate-800 flex items-center gap-3">
            <h2 className="font-semibold text-white">{team} Team Campaigns</h2>
            <span className={color as any}>{camps.length} campaigns</span>
          </div>
          <div className="divide-y divide-slate-800">
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
      ))}
    </div>
  )
}
