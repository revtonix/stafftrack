'use client'
// src/components/SalaryCell.tsx
//
// Usage in staff table:
//   <SalaryCell
//     salary={row.monthlySalary}
//     salaryHidden={row.salaryHidden}
//     targetUserId={row.id}
//     viewerRole="STAFF"
//     viewerId={session.user.id}
//   />
//
// Usage in payroll report row:
//   <SalaryCell salary={row.total} salaryHidden={row.salaryHidden} ... />

import {
  useState, useEffect, useRef, useCallback,
} from 'react'
import { useRouter } from 'next/navigation'

export type ViewerRole = 'ADMIN' | 'TEAM_LEAD' | 'STAFF'

interface SalaryCellProps {
  salary:        number | null | undefined
  salaryHidden?: boolean           // flag from API — backend already masked
  targetUserId:  string
  viewerRole:    ViewerRole
  viewerId:      string
  revealMs?:     number            // reveal window in ms, default 30 000
  className?:    string
}

// ─── Icons ────────────────────────────────────────────────────────────────────
function IconEye() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7
           -1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  )
}

function IconEyeOff() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7
           a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243
           M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29
           m7.532 7.532l3.29 3.29M3 3l3.59 3.59
           m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7
           a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
    </svg>
  )
}

function IconLock() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6
           a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
  )
}

function IconSpinner() {
  return (
    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10"
        stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
    </svg>
  )
}

function IconAlert() {
  return (
    <svg className="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd"
        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0
           1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
        clipRule="evenodd" />
    </svg>
  )
}

// ─── Re-auth Modal ────────────────────────────────────────────────────────────
function ReAuthModal({
  onSuccess,
  onCancel,
}: {
  onSuccess: () => void
  onCancel:  () => void
}) {
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onCancel])

  const submit = async () => {
    if (!password) { setError('Password is required'); return }
    setLoading(true)
    setError('')
    try {
      const res  = await fetch('/api/auth/re-auth', {
        method:      'POST',
        headers:     { 'Content-Type': 'application/json' },
        credentials: 'include',
        body:        JSON.stringify({ password }),
      })
      const data = await res.json()
      if (data.ok) {
        onSuccess()
      } else {
        setError(data.error ?? 'Incorrect password')
        setPassword('')
        inputRef.current?.focus()
      }
    } catch {
      setError('Network error — please try again')
    }
    setLoading(false)
  }

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(6px)' }}
      onClick={e => { if (e.target === e.currentTarget) onCancel() }}
    >
      <div
        className="w-full max-w-sm rounded-2xl overflow-hidden"
        style={{
          background: '#0f1623',
          border:     '1px solid rgba(255,255,255,0.08)',
          boxShadow:  '0 32px 80px rgba(0,0,0,0.6)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center gap-3 px-6 py-5"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center text-indigo-400 shrink-0"
            style={{
              background: 'rgba(99,102,241,0.12)',
              border:     '1px solid rgba(99,102,241,0.2)',
            }}
          >
            <IconLock />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white">Confirm Identity</p>
            <p className="text-[11px] text-white/30 mt-0.5">Enter your password to reveal salary</p>
          </div>
          <button
            onClick={onCancel}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-white/20 hover:text-white/50 transition-colors shrink-0"
            style={{ background: 'rgba(255,255,255,0.04)' }}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {/* Privacy notice */}
          <div
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-[11px] text-indigo-300/70 leading-relaxed"
            style={{
              background: 'rgba(99,102,241,0.07)',
              border:     '1px solid rgba(99,102,241,0.12)',
            }}
          >
            <svg className="w-3 h-3 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd"
                d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5
                   a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                clipRule="evenodd" />
            </svg>
            Privacy mode — salary visible for 30 seconds only
          </div>

          {/* Password field */}
          <div>
            <label className="block text-[10px] font-semibold text-white/25 uppercase tracking-widest mb-1.5">
              Password
            </label>
            <input
              ref={inputRef}
              type="password"
              value={password}
              onChange={e => { setPassword(e.target.value); setError('') }}
              onKeyDown={e => { if (e.key === 'Enter') submit() }}
              placeholder="Enter your password"
              disabled={loading}
              className="w-full text-sm text-white placeholder-white/15 focus:outline-none rounded-xl px-4 py-2.5 transition-all"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border:     error
                  ? '1px solid rgba(248,113,113,0.5)'
                  : '1px solid rgba(255,255,255,0.08)',
              }}
            />
            {error && (
              <p className="flex items-center gap-1.5 mt-1.5 text-xs text-rose-400/80">
                <IconAlert />
                {error}
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white/40
                       hover:text-white/60 transition-colors"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border:     '1px solid rgba(255,255,255,0.07)',
            }}
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={loading || !password}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white
                       flex items-center justify-center gap-2 transition-all
                       disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: 'linear-gradient(135deg,#4f46e5,#6366f1)',
              boxShadow:  loading || !password ? 'none' : '0 4px 16px rgba(79,70,229,0.4)',
            }}
          >
            {loading && <IconSpinner />}
            {loading ? 'Verifying…' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── SalaryCell ───────────────────────────────────────────────────────────────
export function SalaryCell({
  salary,
  salaryHidden,
  targetUserId,
  viewerRole,
  viewerId,
  revealMs  = 30_000,
  className = '',
}: SalaryCellProps) {
  const router = useRouter()

  const [showModal,   setShowModal]   = useState(false)
  const [revealed,    setRevealed]    = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(0)

  const hideTimer   = useRef<ReturnType<typeof setTimeout>  | null>(null)
  const countdownId = useRef<ReturnType<typeof setInterval> | null>(null)

  // ── Permission logic ──────────────────────────────────────────────────────
  const isAdmin      = viewerRole === 'ADMIN'
  const canSelfReveal = viewerRole === 'STAFF' && viewerId === targetUserId
  // TL: never shows eye icon, never can reveal

  // ── Cleanup on unmount ────────────────────────────────────────────────────
  useEffect(() => () => {
    if (hideTimer.current)   clearTimeout(hideTimer.current)
    if (countdownId.current) clearInterval(countdownId.current)
  }, [])

  // ── Auto-hide on route change ─────────────────────────────────────────────
  useEffect(() => {
    if (!revealed) return
    return () => hide()   // called when component unmounts (route change)
  }, [revealed])           // eslint-disable-line

  // ── Auto-hide on tab blur ─────────────────────────────────────────────────
  useEffect(() => {
    if (!revealed) return
    const handler = () => { if (document.hidden) hide() }
    document.addEventListener('visibilitychange', handler)
    return () => document.removeEventListener('visibilitychange', handler)
  }, [revealed])           // eslint-disable-line

  const hide = useCallback(() => {
    setRevealed(false)
    setSecondsLeft(0)
    if (hideTimer.current)   clearTimeout(hideTimer.current)
    if (countdownId.current) clearInterval(countdownId.current)
  }, [])

  const startReveal = useCallback(() => {
    setShowModal(false)
    setRevealed(true)
    setSecondsLeft(Math.ceil(revealMs / 1000))

    hideTimer.current = setTimeout(hide, revealMs)

    countdownId.current = setInterval(() => {
      setSecondsLeft(s => {
        if (s <= 1) {
          clearInterval(countdownId.current!)
          return 0
        }
        return s - 1
      })
    }, 1000)
  }, [revealMs, hide])

  const formatted = salary != null
    ? `₹${salary.toLocaleString('en-IN')}`
    : '₹—'

  // ── ADMIN: always visible, no interaction ─────────────────────────────────
  if (isAdmin) {
    return (
      <span className={`font-semibold text-white/70 tabular-nums ${className}`}>
        {formatted}
      </span>
    )
  }

  // ── TL or other non-privileged role: static mask only ────────────────────
  if (!canSelfReveal) {
    return (
      <span className="font-mono text-white/20 tracking-widest text-xs select-none">
        ₹•••••
      </span>
    )
  }

  // ── STAFF on own row: masked + eye icon + modal ───────────────────────────
  return (
    <>
      {showModal && (
        <ReAuthModal
          onSuccess={startReveal}
          onCancel={() => setShowModal(false)}
        />
      )}

      <div className={`flex items-center gap-2 ${className}`}>
        {revealed ? (
          <>
            <span className="font-semibold text-white/70 tabular-nums">{formatted}</span>

            {/* Countdown badge + hide */}
            <span
              className="text-[10px] font-mono tabular-nums px-1.5 py-0.5 rounded"
              style={{ background: 'rgba(99,102,241,0.12)', color: '#a5b4fc' }}
            >
              {secondsLeft}s
            </span>
            <button
              onClick={hide}
              title="Hide salary"
              className="text-white/20 hover:text-white/50 transition-colors"
            >
              <IconEyeOff />
            </button>
          </>
        ) : (
          <>
            <span className="font-mono text-white/25 tracking-widest text-xs select-none">
              ₹•••••
            </span>
            <button
              onClick={() => setShowModal(true)}
              title="View your salary"
              className="text-white/20 hover:text-indigo-400 transition-colors"
            >
              <IconEye />
            </button>
          </>
        )}
      </div>
    </>
  )
}
