'use client'
// src/components/layout/TopBar.tsx
import { useRouter } from 'next/navigation'
import { Role } from '@prisma/client'

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

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="h-14 bg-slate-900/80 backdrop-blur border-b border-slate-800 px-4 md:px-6 flex items-center justify-between gap-4 flex-shrink-0">
      <div className="flex items-center gap-3">
        <div>
          <p className="text-sm font-semibold text-white leading-none">{username}</p>
          <p className="text-xs text-slate-500 mt-0.5">{new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}</p>
        </div>
        <span className={ROLE_COLORS[role] + ' hidden sm:inline-flex'}>{ROLE_LABELS[role]}</span>
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
    </header>
  )
}
