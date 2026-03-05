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
      <div style={{ position:'absolute', right:0, top:0, bottom:0, width:'1px', pointerEvents:'none', background:'linear-gradient(to bottom,transparent,rgba(109,40,217,0.45),rgba(0,212,255,0.2),transparent)' }} />

      {/* Logo */}
      <div style={{ padding:'20px 20px 18px', borderBottom:'1px solid rgba(109,40,217,0.13)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ width:36, height:36, borderRadius:10, flexShrink:0, background:'linear-gradient(135deg,#5b21b6,#7c3aed)', boxShadow:'0 0 20px rgba(109,40,217,0.55),0 0 40px rgba(0,212,255,0.12)', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Syne,system-ui', fontWeight:800, fontSize:16, color:'#fff' }}>S</div>
          <div>
            <div style={{ fontFamily:'Syne,system-ui', fontWeight:700, fontSize:14, color:'#fff', letterSpacing:'-0.02em' }}>StaffTrack</div>
            <div style={{ fontFamily:'DM Mono,monospace', fontSize:9, color:'#00d4ff', letterSpacing:'0.15em', textTransform:'uppercase', marginTop:2 }}>Pro Edition</div>
          </div>
        </div>
      </div>

      {/* User chip */}
      <div style={{ margin:'12px 10px 4px', padding:'10px 12px', borderRadius:10, background:'linear-gradient(135deg,rgba(109,40,217,0.09),rgba(0,212,255,0.03))', border:'1px solid rgba(109,40,217,0.18)' }}>
        <div style={{ fontSize:11, fontWeight:700, color:'#fff', letterSpacing:'0.04em' }}>ADMIN</div>
        <div style={{ fontFamily:'DM Mono,monospace', fontSize:9, color:'rgba(255,255,255,0.28)', marginTop:3 }}>
          {new Date().toLocaleDateString('en-IN', { weekday:'short', day:'numeric', month:'short' })}
        </div>
        <div style={{ display:'inline-flex', marginTop:7, padding:'2px 9px', borderRadius:20, background:rb.bg, border:`1px solid ${rb.border}`, color:rb.color, fontFamily:'DM Mono,monospace', fontSize:9, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase' }}>
          {role.replace(/_/g,' ')}
        </div>
      </div>

      <div style={{ padding:'10px 20px 4px', fontFamily:'DM Mono,monospace', fontSize:8, letterSpacing:'0.2em', color:'rgba(255,255,255,0.14)', textTransform:'uppercase' }}>Navigation</div>

      <nav style={{ flex:1, padding:'4px 8px', overflowY:'auto' }}>
        {visibleItems.map(item => {
          const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
          return (
            <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)}
              style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 12px', borderRadius:10, marginBottom:2, fontSize:13, fontWeight:600, position:'relative', overflow:'hidden', textDecoration:'none', transition:'all 0.15s', ...(active ? { background:'linear-gradient(135deg,rgba(109,40,217,0.2),rgba(0,212,255,0.05))', border:'1px solid rgba(109,40,217,0.28)', color:'#fff' } : { background:'transparent', border:'1px solid transparent', color:'rgba(255,255,255,0.38)' }) }}
              onMouseEnter={e => { if (!active) { (e.currentTarget as HTMLElement).style.background='rgba(255,255,255,0.04)'; (e.currentTarget as HTMLElement).style.color='rgba(255,255,255,0.72)'; } }}
              onMouseLeave={e => { if (!active) { (e.currentTarget as HTMLElement).style.background='transparent'; (e.currentTarget as HTMLElement).style.color='rgba(255,255,255,0.38)'; } }}
            >
              {active && <div style={{ position:'absolute', left:0, top:'22%', bottom:'22%', width:3, background:'linear-gradient(to bottom,#7c3aed,#00d4ff)', borderRadius:'0 3px 3px 0' }} />}
              <span style={{ opacity:active?1:0.55, color:active?'#a78bfa':'currentColor' }}>{item.icon}</span>
              {item.label}
              {active && <div style={{ marginLeft:'auto', width:6, height:6, borderRadius:'50%', background:'#00d4ff', boxShadow:'0 0 8px #00d4ff', animation:'pulseSoft 2s infinite' }} />}
            </Link>
          )
        })}
      </nav>

      <div style={{ padding:'12px 16px', borderTop:'1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ fontFamily:'DM Mono,monospace', fontSize:9, color:'rgba(109,40,217,0.45)', letterSpacing:'0.15em', textTransform:'uppercase' }}>Shift · 07:00 IST</div>
        <div style={{ fontFamily:'DM Mono,monospace', fontSize:9, color:'rgba(255,255,255,0.12)', marginTop:3 }}>Role: {role.replace(/_/g,' ')}</div>
      </div>
    </div>
  )

  return (
    <>
      <aside style={{ display:'none', flexDirection:'column', width:240, flexShrink:0, background:'rgba(4,5,10,0.82)', borderRight:'1px solid rgba(109,40,217,0.12)', backdropFilter:'blur(24px)', minHeight:'100vh', position:'sticky', top:0, height:'100vh' }} className="lg:flex">
        <NavContent />
      </aside>
      <button className="lg:hidden fixed bottom-4 right-4 z-50 w-12 h-12 rounded-full flex items-center justify-center" style={{ background:'linear-gradient(135deg,#5b21b6,#7c3aed)', boxShadow:'0 4px 20px rgba(109,40,217,0.5)' }} onClick={() => setMobileOpen(!mobileOpen)}>
        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          {mobileOpen ? <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/> : <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16"/>}
        </svg>
      </button>
      {mobileOpen && (
        <>
          <div className="lg:hidden fixed inset-0 bg-black/70 z-40 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="lg:hidden fixed left-0 top-0 bottom-0 w-72 z-50 overflow-hidden flex flex-col" style={{ background:'rgba(4,5,10,0.96)', borderRight:'1px solid rgba(109,40,217,0.2)' }}>
            <NavContent />
          </aside>
        </>
      )}
    </>
  )
}
