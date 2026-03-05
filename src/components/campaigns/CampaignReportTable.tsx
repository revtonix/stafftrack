'use client'
import { useState } from 'react'
import type { StaffCampaignReport } from '@/types/campaign'

function toHHMM(iso: string) {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour:     '2-digit',
    minute:   '2-digit',
    hour12:   false,
  }).format(new Date(iso))
}

export function CampaignReportTable({
  data, loading,
}: {
  data:    StaffCampaignReport[]
  loading: boolean
}) {
  const [expanded, setExpanded] = useState<string | null>(null)

  const grandTotal = data.reduce((s, r) => s + r.totalCampaigns, 0)

  if (loading) {
    return (
      <div className="space-y-2 p-4">
        {[1, 2, 3, 4, 5].map(i => (
          <div
            key={i}
            className="h-12 rounded-xl animate-pulse"
            style={{ background: 'rgba(255,255,255,0.04)' }}
          />
        ))}
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-16 text-white/20 text-sm">
        No campaign data for this period
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[600px] text-sm">
        <thead>
          <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            {['Staff', 'Team', 'Total', 'Campaign Breakdown', ''].map(h => (
              <th
                key={h}
                className="text-left px-5 py-3 text-[10px] font-bold uppercase tracking-[0.14em] text-white/20"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {data.map(r => (
            <>
              {/* Staff row */}
              <tr
                key={r.staffId}
                className="cursor-pointer transition-colors"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.025)'
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.background = ''
                }}
                onClick={() =>
                  setExpanded(expanded === r.staffId ? null : r.staffId)
                }
              >
                {/* Name */}
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-indigo-300/60 shrink-0"
                      style={{ background: 'rgba(99,102,241,0.08)' }}
                    >
                      {r.staffName.charAt(0)}
                    </div>
                    <span className="font-semibold text-white/70">{r.staffName}</span>
                  </div>
                </td>

                {/* Team */}
                <td className="px-5 py-3.5">
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                      r.team === 'DAY'
                        ? 'text-amber-400/70 bg-amber-400/8'
                        : 'text-sky-400/70 bg-sky-400/8'
                    }`}
                  >
                    {r.team}
                  </span>
                </td>

                {/* Total */}
                <td className="px-5 py-3.5">
                  <span className="text-xl font-black text-white tabular-nums">
                    {r.totalCampaigns}
                  </span>
                </td>

                {/* Breakdown chips */}
                <td className="px-5 py-3.5">
                  <div className="flex flex-wrap gap-1.5">
                    {r.campaignBreakdown.map(b => (
                      <span
                        key={b.name}
                        className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                        style={{
                          background: 'rgba(99,102,241,0.1)',
                          color:      '#a5b4fc',
                          border:     '1px solid rgba(99,102,241,0.2)',
                        }}
                      >
                        {b.name}: <strong>{b.count}</strong>
                      </span>
                    ))}
                  </div>
                </td>

                {/* Expand chevron */}
                <td className="px-5 py-3.5 text-right">
                  <svg
                    className={`w-3.5 h-3.5 text-white/20 transition-transform duration-200 inline-block ${
                      expanded === r.staffId ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </td>
              </tr>

              {/* Expanded: per-hour breakdown */}
              {expanded === r.staffId && (
                <tr key={`${r.staffId}-detail`}>
                  <td
                    colSpan={5}
                    className="px-5 py-3 pb-5"
                    style={{
                      background:   'rgba(99,102,241,0.04)',
                      borderBottom: '1px solid rgba(255,255,255,0.04)',
                    }}
                  >
                    <div className="space-y-2.5 pl-10">
                      {r.hourEntries
                        .filter(he => he.campaigns.length > 0)
                        .map(he => (
                          <div key={he.id} className="flex items-start gap-4">
                            {/* Hour label */}
                            <span className="font-mono text-[10px] text-white/20 w-24 shrink-0 pt-1 tabular-nums">
                              {toHHMM(he.hourStart)}–{toHHMM(he.hourEnd)}
                            </span>

                            {/* Campaign chips for this hour */}
                            <div className="flex flex-wrap gap-1.5 flex-1">
                              {he.campaigns.map(c => (
                                <span
                                  key={c.id}
                                  className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                                  style={{
                                    background: 'rgba(255,255,255,0.04)',
                                    color:      'rgba(255,255,255,0.4)',
                                    border:     '1px solid rgba(255,255,255,0.08)',
                                  }}
                                >
                                  {c.name}: {c.count}
                                </span>
                              ))}
                            </div>

                            {/* Hour subtotal */}
                            <span className="text-xs font-bold text-emerald-400/60 tabular-nums shrink-0">
                              {he.campaigns.reduce((s, c) => s + c.count, 0)}
                            </span>
                          </div>
                        ))}
                    </div>
                  </td>
                </tr>
              )}
            </>
          ))}
        </tbody>

        {/* Grand total footer */}
        <tfoot>
          <tr
            style={{
              background:  'rgba(255,255,255,0.02)',
              borderTop:   '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <td
              colSpan={2}
              className="px-5 py-3.5 text-[10px] font-bold uppercase tracking-widest text-white/15"
            >
              Grand Total
            </td>
            <td className="px-5 py-3.5">
              <span className="text-xl font-black text-emerald-400 tabular-nums">
                {grandTotal}
              </span>
            </td>
            <td colSpan={2} />
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
