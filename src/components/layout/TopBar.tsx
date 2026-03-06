'use client'
// src/components/layout/TopBar.tsx
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { Role } from '@prisma/client'
import { getISTTimeString, getISTDateLabel, getCurrentShift } from '@/lib/shiftDay'

const ROLE_LABELS: Record<Role, string> = {
  ADMIN: 'Administrator',
  TEAM_LEAD_DAY: 'Day Team Lead',
  TEAM_LEAD_NIGHT: 'Night Team Lead',
  STAFF: 'Staff',
}

const ROLE_COLORS: Record<Role, string> = {
  ADMIN: 'badge-red',
  TEAM_LEAD_DAY: 'badge-yellow',
  TEAM_LEAD_NIGHT: 'badge-purple',
  STAFF: 'badge-blue',
}

export default function TopBar({ username, role }: { username: string; role: Role }) {
  const router = useRouter()
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="h-14 bg-slate-900/60 backdrop-blur-md border-b border-slate-800/60 px-4 md:px-6 flex items-center justify-between gap-4 flex-shrink-0">
      <div className="flex items-center gap-3">
        <div>
          <p className="text-sm font-semibold text-white leading-none">{username}</p>
          <p className="text-xs text-slate-500 mt-0.5">{getISTDateLabel(now)}</p>
        </div>
        <span className={ROLE_COLORS[role] + ' hidden sm:inline-flex'}>{ROLE_LABELS[role]}</span>
      </div>
      <div className="flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400 bg-slate-800/50 px-3 py-1.5 rounded-lg border border-slate-700/50">
          <span className={`w-1.5 h-1.5 rounded-full ${getCurrentShift(now) === 'MORNING' ? 'bg-yellow-400' : 'bg-purple-400'}`} />
          <span className="font-mono tabular-nums text-white">{getISTTimeString(now)}</span>
          <span className="text-slate-600">IST</span>
        </div>
        <button
          onClick={logout}
          className="btn-secondary btn-sm"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Logout
        </button>
      </div>
    </header>
  )
}
