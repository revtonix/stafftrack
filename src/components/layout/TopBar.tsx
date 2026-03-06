'use client'
import { useRouter } from 'next/navigation'
import { Role } from '@prisma/client'
import { useEffect, useState } from 'react'

const ROLE_LABELS: Record<Role, string> = { ADMIN:'Administrator', TEAM_LEAD_DAY:'Day Team Lead', TEAM_LEAD_NIGHT:'Night Team Lead', STAFF:'Staff' }
const ROLE_STYLE: Record<Role, { bg:string; color:string; border:string }> = {
  ADMIN:           { bg:'rgba(255,77,109,0.1)',   color:'#ff4d6d', border:'rgba(255,77,109,0.25)'   },
  TEAM_LEAD_DAY:   { bg:'rgba(255,184,0,0.1)',    color:'#ffb800', border:'rgba(255,184,0,0.25)'    },
  TEAM_LEAD_NIGHT: { bg:'rgba(109,40,217,0.14)',  color:'#a78bfa', border:'rgba(109,40,217,0.3)'   },
  STAFF:           { bg:'rgba(0,212,255,0.08)',   color:'#00d4ff', border:'rgba(0,212,255,0.22)'   },
}

export default function TopBar({ username, role }: { username: string; role: Role }) {
  const router = useRouter()
  const [time, setTime] = useState('')
  const rs = ROLE_STYLE[role]

  useEffect(() => {
    const tick = () => { const n = new Date(); const p = (x:number) => String(x).padStart(2,'0'); setTime(`${p(n.getHours())}:${p(n.getMinutes())}:${p(n.getSeconds())}`) }
    tick(); const id = setInterval(tick, 1000); return () => clearInterval(id)
  }, [])

  async function logout() { await fetch('/api/auth/logout', { method:'POST' }); router.push('/login'); router.refresh() }

  return (
    <header style={{ height:56, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 24px', gap:16, background:'rgba(4,5,10,0.8)', backdropFilter:'blur(24px)', borderBottom:'1px solid rgba(109,40,217,0.1)', position:'sticky', top:0, zIndex:40 }}>
      <div style={{ display:'flex', alignItems:'center', gap:12 }}>
        <div>
          <p style={{ fontSize:13, fontWeight:700, color:'#fff', lineHeight:1 }}>{username}</p>
          <p style={{ fontFamily:'DM Mono,monospace', fontSize:9, color:'rgba(255,255,255,0.28)', marginTop:3 }}>
            {new Date().toLocaleDateString('en-IN', { weekday:'short', day:'numeric', month:'short' })}
          </p>
        </div>
        <span style={{ display:'inline-flex', padding:'2px 10px', borderRadius:20, background:rs.bg, border:`1px solid ${rs.border}`, color:rs.color, fontFamily:'DM Mono,monospace', fontSize:9, fontWeight:700, letterSpacing:'0.07em', textTransform:'uppercase' }}>
          {ROLE_LABELS[role]}
        </span>
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
        <div style={{ display:'flex', alignItems:'center', gap:7, padding:'5px 12px', borderRadius:20, background:'rgba(0,255,148,0.04)', border:'1px solid rgba(0,255,148,0.14)' }}>
          <div style={{ width:7, height:7, borderRadius:'50%', background:'#00ff94', boxShadow:'0 0 6px #00ff94', animation:'pulseSoft 2s infinite' }} />
          <span style={{ fontFamily:'DM Mono,monospace', fontSize:12, color:'#00ff94' }}>{time}</span>
        </div>
        <button onClick={logout} className="btn-secondary btn-sm" style={{ fontSize:12 }}>
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
          Logout
        </button>
      </div>
    </header>
  )
}
