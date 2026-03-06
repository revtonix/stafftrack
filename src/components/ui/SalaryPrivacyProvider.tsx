'use client'
import {
  createContext, useContext, useState, useEffect, useRef, useCallback,
  type ReactNode,
} from 'react'

// ─── Context ─────────────────────────────────────────────────────────────────
interface SalaryPrivacyCtx {
  revealed: boolean
  secondsLeft: number
  requestReveal: () => void
  hide: () => void
}

const Ctx = createContext<SalaryPrivacyCtx>({
  revealed: false,
  secondsLeft: 0,
  requestReveal: () => {},
  hide: () => {},
})

export function useSalaryPrivacy() {
  return useContext(Ctx)
}

// ─── Icons ───────────────────────────────────────────────────────────────────
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

// ─── Re-Auth Modal ───────────────────────────────────────────────────────────
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
      const res = await fetch('/api/auth/re-auth', {
        method:      'POST',
        headers:     { 'Content-Type': 'application/json' },
        credentials: 'include',
        body:        JSON.stringify({ password }),
      })
      const data = await res.json()
      if (data.ok) {
        setPassword('')
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
      style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(8px)' }}
      onClick={e => { if (e.target === e.currentTarget) onCancel() }}
    >
      <div
        className="w-full max-w-sm rounded-2xl overflow-hidden animate-fade-in"
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
            <p className="text-[11px] text-white/30 mt-0.5">
              Enter your password to view salary details
            </p>
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
              autoComplete="current-password"
              className="w-full text-sm text-white placeholder-white/15 focus:outline-none rounded-xl px-4 py-2.5 transition-all"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: error
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
            {loading ? 'Verifying...' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Provider ────────────────────────────────────────────────────────────────
const REVEAL_MS = 30_000

export function SalaryPrivacyProvider({
  children,
  bypass = false,
}: {
  children: ReactNode
  /** When true (e.g. for ADMIN), salary values are always visible without auth */
  bypass?: boolean
}) {
  const [showModal,   setShowModal]   = useState(false)
  const [revealed,    setRevealed]    = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(0)

  const hideTimer   = useRef<ReturnType<typeof setTimeout>  | null>(null)
  const countdownId = useRef<ReturnType<typeof setInterval> | null>(null)

  const hide = useCallback(() => {
    setRevealed(false)
    setSecondsLeft(0)
    if (hideTimer.current)   clearTimeout(hideTimer.current)
    if (countdownId.current) clearInterval(countdownId.current)
  }, [])

  const startReveal = useCallback(() => {
    setShowModal(false)
    setRevealed(true)
    setSecondsLeft(Math.ceil(REVEAL_MS / 1000))

    hideTimer.current = setTimeout(hide, REVEAL_MS)
    countdownId.current = setInterval(() => {
      setSecondsLeft(s => {
        if (s <= 1) {
          clearInterval(countdownId.current!)
          return 0
        }
        return s - 1
      })
    }, 1000)
  }, [hide])

  // Cleanup on unmount
  useEffect(() => () => {
    if (hideTimer.current)   clearTimeout(hideTimer.current)
    if (countdownId.current) clearInterval(countdownId.current)
  }, [])

  // Auto-hide on tab blur
  useEffect(() => {
    if (!revealed) return
    const handler = () => { if (document.hidden) hide() }
    document.addEventListener('visibilitychange', handler)
    return () => document.removeEventListener('visibilitychange', handler)
  }, [revealed, hide])

  const requestReveal = useCallback(() => {
    if (!revealed) setShowModal(true)
  }, [revealed])

  // Bypass mode: admin always sees salary, no modal needed
  if (bypass) {
    return (
      <Ctx.Provider value={{ revealed: true, secondsLeft: 0, requestReveal: () => {}, hide: () => {} }}>
        {children}
      </Ctx.Provider>
    )
  }

  return (
    <Ctx.Provider value={{ revealed, secondsLeft, requestReveal, hide }}>
      {showModal && (
        <ReAuthModal
          onSuccess={startReveal}
          onCancel={() => setShowModal(false)}
        />
      )}
      {children}
    </Ctx.Provider>
  )
}
