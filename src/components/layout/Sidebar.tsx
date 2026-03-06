'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Role } from '@prisma/client'
import { useState } from 'react'

interface NavItem { href: string; label: string; icon: React.ReactNode; roles: Role[] }

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', roles: ['ADMIN','TEAM_LEAD_DAY','TEAM_LEAD_NIGHT','STAFF'],
    icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg> },
  { href: '/dashboard/attendance', label: 'Attendance', roles: ['ADMIN','TEAM_LEAD_DAY','TEAM_LEAD_NIGHT','STAFF'],
    icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg> },
  { href: '/dashboard/productivity', label: 'Productivity', roles: ['ADMIN','TEAM_LEAD_DAY','TEAM_LEAD_NIGHT','STAFF'],
    icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg> },
  { href: '/dashboard/salary', label: 'My Salary', roles: ['STAFF'],
    icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg> },
  { href: '/dashboard/leaves', label: 'Leaves', roles: ['ADMIN','STAFF'],
    icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg> },
  { href: '/dashboard/campaigns', label: 'Campaigns', roles: ['ADMIN','TEAM_LEAD_DAY','TEAM_LEAD_NIGHT'],
    icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"/></svg> },
  { href: '/dashboard/reports', label: 'Reports', roles: ['ADMIN'],
    icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg> },
  { href: '/dashboard/admin', label: 'Staff Mgmt', roles: ['ADMIN'],
    icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg> },
]

const ROLE_BADGE: Record<Role, { bg: string; color: string; border: string }> = {
  ADMIN:           { bg: 'rgba(255,77,109,0.12)',   color: '#ff4d6d', border: 'rgba(255,77,109,0.25)'   },
  TEAM_LEAD_DAY:   { bg: 'rgba(255,184,0,0.1)',     color: '#ffb800', border: 'rgba(255,184,0,0.25)'    },
  TEAM_LEAD_NIGHT: { bg: 'rgba(109,40,217,0.14)',   color: '#a78bfa', border: 'rgba(109,40,217,0.3)'   },
  STAFF:           { bg: 'rgba(0,212,255,0.08)',    color: '#00d4ff', border: 'rgba(0,212,255,0.22)'   },
}

export default function Sidebar({ role }: { role: Role }) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const visibleItems = NAV_ITEMS.filter(i => i.roles.includes(role))
  const rb = ROLE_BADGE[role]

  const NavContent = () => (
    <div className="flex flex-col h-full" style={{ position: 'relative' }}>
      {/* Right edge glow line */}
      <div style={{ position:'absolute', right:0, top:0, bottom:0, width:'1px', pointerEvents:'none', background:'linear-gradient(to bottom,transparent,rgba(109,40,217,0.35),rgba(0,212,255,0.15),transparent)' }} />

      {/* Logo */}
      <div className="px-5 pt-5 pb-4" style={{ borderBottom:'1px solid rgba(109,40,217,0.1)' }}>
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex-shrink-0 flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg,#5b21b6,#7c3aed)',
              boxShadow: '0 0 20px rgba(109,40,217,0.45), 0 0 40px rgba(0,212,255,0.08)',
              fontFamily: 'Syne, system-ui',
              fontWeight: 800,
              fontSize: 15,
              color: '#fff',
            }}
          >
            S
          </div>
          <div>
            <div style={{ fontFamily:'Syne, system-ui', fontWeight:700, fontSize:14, color:'#fff', letterSpacing:'-0.02em' }}>
              StaffTrack
            </div>
            <div style={{ fontFamily:'DM Mono, monospace', fontSize:9, color:'#00d4ff', letterSpacing:'0.15em', textTransform:'uppercase', marginTop:1 }}>
              Pro Edition
            </div>
          </div>
        </div>
      </div>

      {/* User chip */}
      <div className="mx-3 mt-3 mb-1">
        <div
          className="rounded-xl px-3.5 py-3"
          style={{
            background: 'linear-gradient(135deg, rgba(109,40,217,0.07), rgba(0,212,255,0.02))',
            border: '1px solid rgba(109,40,217,0.12)',
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-white tracking-wide">
              {role.replace(/_/g,' ')}
            </span>
            <span
              className="inline-flex px-2 py-0.5 rounded-md text-[9px] font-bold uppercase"
              style={{
                background: rb.bg,
                border: `1px solid ${rb.border}`,
                color: rb.color,
                fontFamily: 'DM Mono, monospace',
                letterSpacing: '0.08em',
              }}
            >
              {role === 'ADMIN' ? 'Admin' : role.includes('TEAM') ? 'TL' : 'Staff'}
            </span>
          </div>
          <div style={{ fontFamily:'DM Mono, monospace', fontSize:9, color:'rgba(255,255,255,0.22)' }}>
            {new Date().toLocaleDateString('en-IN', { weekday:'short', day:'numeric', month:'short', year:'numeric' })}
          </div>
        </div>
      </div>

      {/* Nav label */}
      <div
        className="px-5 pt-4 pb-2"
        style={{ fontFamily:'DM Mono, monospace', fontSize:8, letterSpacing:'0.2em', color:'rgba(255,255,255,0.12)', textTransform:'uppercase' }}
      >
        Navigation
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-2.5 overflow-y-auto pb-2">
        {visibleItems.map(item => {
          const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className="relative flex items-center gap-2.5 rounded-xl mb-0.5 overflow-hidden no-underline transition-all duration-150"
              style={{
                padding: '10px 14px',
                fontSize: 13,
                fontWeight: 600,
                ...(active
                  ? {
                      background: 'linear-gradient(135deg, rgba(109,40,217,0.15), rgba(0,212,255,0.04))',
                      border: '1px solid rgba(109,40,217,0.22)',
                      color: '#fff',
                      boxShadow: '0 2px 12px rgba(109,40,217,0.1)',
                    }
                  : {
                      background: 'transparent',
                      border: '1px solid transparent',
                      color: 'rgba(255,255,255,0.35)',
                    }
                ),
              }}
              onMouseEnter={e => {
                if (!active) {
                  const el = e.currentTarget as HTMLElement
                  el.style.background = 'rgba(255,255,255,0.035)'
                  el.style.color = 'rgba(255,255,255,0.7)'
                  el.style.borderColor = 'rgba(255,255,255,0.05)'
                }
              }}
              onMouseLeave={e => {
                if (!active) {
                  const el = e.currentTarget as HTMLElement
                  el.style.background = 'transparent'
                  el.style.color = 'rgba(255,255,255,0.35)'
                  el.style.borderColor = 'transparent'
                }
              }}
            >
              {/* Active accent bar */}
              {active && (
                <div
                  className="absolute left-0 top-[20%] bottom-[20%] w-[3px] rounded-r-full"
                  style={{
                    background: 'linear-gradient(to bottom, #7c3aed, #00d4ff)',
                  }}
                />
              )}

              <span style={{ opacity: active ? 1 : 0.5, color: active ? '#a78bfa' : 'currentColor' }}>
                {item.icon}
              </span>
              {item.label}

              {active && (
                <div className="ml-auto flex items-center gap-1.5">
                  <div
                    className="w-1.5 h-1.5 rounded-full"
                    style={{
                      background: '#00d4ff',
                      boxShadow: '0 0 6px #00d4ff',
                      animation: 'pulseSoft 2s infinite',
                    }}
                  />
                </div>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div
        className="px-4 py-3"
        style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-1.5 h-1.5 rounded-full"
            style={{
              background: '#00ff94',
              boxShadow: '0 0 6px rgba(0,255,148,0.5)',
            }}
          />
          <span style={{ fontFamily:'DM Mono, monospace', fontSize:9, color:'rgba(109,40,217,0.4)', letterSpacing:'0.12em', textTransform:'uppercase' }}>
            Shift · 07:00 IST
          </span>
        </div>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className="hidden lg:flex flex-col flex-shrink-0 sticky top-0 h-screen"
        style={{
          width: 248,
          background: 'rgba(4,5,10,0.85)',
          borderRight: '1px solid rgba(109,40,217,0.1)',
          backdropFilter: 'blur(24px)',
        }}
      >
        <NavContent />
      </aside>

      {/* Mobile toggle */}
      <button
        className="lg:hidden fixed bottom-4 right-4 z-50 w-12 h-12 rounded-full flex items-center justify-center"
        style={{
          background: 'linear-gradient(135deg,#5b21b6,#7c3aed)',
          boxShadow: '0 4px 20px rgba(109,40,217,0.5)',
        }}
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          {mobileOpen
            ? <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
            : <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16"/>
          }
        </svg>
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <>
          <div className="lg:hidden fixed inset-0 bg-black/70 z-40 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside
            className="lg:hidden fixed left-0 top-0 bottom-0 w-72 z-50 overflow-hidden flex flex-col"
            style={{
              background: 'rgba(4,5,10,0.96)',
              borderRight: '1px solid rgba(109,40,217,0.18)',
            }}
          >
            <NavContent />
          </aside>
        </>
      )}
    </>
  )
}
