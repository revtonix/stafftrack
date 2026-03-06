'use client'
import { useSalaryPrivacy } from '@/components/ui/SalaryPrivacyProvider'

interface ProtectedSalaryProps {
  /** The actual salary value — never rendered in DOM until revealed */
  value: number | string | null | undefined
  /** CSS classes applied to the outer wrapper */
  className?: string
  /** Optional: size variant for the masked placeholder */
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

const SIZE_CLASSES = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-xl',
  xl: 'text-2xl',
}

const MASK_SIZE_CLASSES = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-lg',
  xl: 'text-xl',
}

/**
 * Displays a salary value masked by default.
 * Must be wrapped in <SalaryPrivacyProvider>.
 *
 * When hidden:   ₹ *****  (value is NOT in the DOM)
 * When revealed: ₹12,345  (rendered for 30s after password verification)
 */
export function ProtectedSalary({
  value,
  className = '',
  size = 'md',
}: ProtectedSalaryProps) {
  const { revealed } = useSalaryPrivacy()

  if (!revealed) {
    return (
      <span
        className={`inline-flex items-center gap-1 font-mono tracking-widest select-none ${MASK_SIZE_CLASSES[size]} ${className}`}
        style={{ color: 'rgba(255,255,255,0.2)' }}
      >
        ₹ *****
      </span>
    )
  }

  // Format value for display
  const display = typeof value === 'string'
    ? value
    : value != null
      ? `₹${value.toLocaleString('en-IN')}`
      : '₹—'

  return (
    <span className={`tabular-nums ${SIZE_CLASSES[size]} ${className}`}>
      {display}
    </span>
  )
}

/**
 * A floating bar shown when salary values are revealed,
 * displaying the countdown timer and a hide button.
 * Place once per page (inside SalaryPrivacyProvider).
 */
export function SalaryRevealBar() {
  const { revealed, secondsLeft, hide } = useSalaryPrivacy()

  if (!revealed) return null

  return (
    <div
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[150] flex items-center gap-3 px-5 py-2.5 rounded-xl animate-slide-up"
      style={{
        background: 'rgba(15,22,35,0.92)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(99,102,241,0.25)',
        boxShadow: '0 12px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(99,102,241,0.08)',
      }}
    >
      <div
        className="w-2 h-2 rounded-full animate-pulse"
        style={{ background: '#6366f1', boxShadow: '0 0 8px rgba(99,102,241,0.6)' }}
      />
      <span className="text-xs text-white/50">
        Salary visible
      </span>
      <span
        className="text-xs font-mono font-bold tabular-nums px-2 py-0.5 rounded-md"
        style={{
          background: 'rgba(99,102,241,0.12)',
          color: '#a5b4fc',
          border: '1px solid rgba(99,102,241,0.2)',
        }}
      >
        {secondsLeft}s
      </span>
      <button
        onClick={hide}
        className="text-xs font-semibold text-white/30 hover:text-white/60 transition-colors flex items-center gap-1"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7
               a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243
               M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29
               m7.532 7.532l3.29 3.29M3 3l3.59 3.59
               m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7
               a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
        </svg>
        Hide
      </button>
    </div>
  )
}

/**
 * An "Unlock salary" button that triggers the re-auth modal.
 * Shows only when salary is hidden.
 */
export function SalaryUnlockButton({ className = '' }: { className?: string }) {
  const { revealed, requestReveal } = useSalaryPrivacy()

  if (revealed) return null

  return (
    <button
      onClick={requestReveal}
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-200 ${className}`}
      style={{
        background: 'rgba(99,102,241,0.08)',
        border: '1px solid rgba(99,102,241,0.2)',
        color: '#a5b4fc',
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLElement
        el.style.background = 'rgba(99,102,241,0.14)'
        el.style.borderColor = 'rgba(99,102,241,0.35)'
        el.style.boxShadow = '0 4px 16px rgba(99,102,241,0.15)'
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLElement
        el.style.background = 'rgba(99,102,241,0.08)'
        el.style.borderColor = 'rgba(99,102,241,0.2)'
        el.style.boxShadow = 'none'
      }}
    >
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7
             -1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
      </svg>
      Unhide salary
    </button>
  )
}
