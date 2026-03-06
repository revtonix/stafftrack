'use client'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success'
type Size = 'sm' | 'md' | 'lg'

const VARIANT_STYLES: Record<Variant, { base: React.CSSProperties; hover: React.CSSProperties }> = {
  primary: {
    base: {
      background: 'linear-gradient(135deg, #5b21b6 0%, #7c3aed 50%, #6d28d9 100%)',
      border: '1px solid rgba(124, 58, 237, 0.5)',
      boxShadow: '0 4px 20px rgba(109, 40, 217, 0.35), inset 0 1px 0 rgba(255,255,255,0.1)',
      color: '#fff',
    },
    hover: {
      background: 'linear-gradient(135deg, #6d28d9 0%, #8b5cf6 50%, #7c3aed 100%)',
      boxShadow: '0 6px 30px rgba(109, 40, 217, 0.5), inset 0 1px 0 rgba(255,255,255,0.15)',
      transform: 'translateY(-1px)',
    },
  },
  secondary: {
    base: {
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.08)',
      color: 'rgba(255,255,255,0.6)',
      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
    },
    hover: {
      background: 'rgba(255,255,255,0.07)',
      borderColor: 'rgba(109, 40, 217, 0.35)',
      color: 'rgba(255,255,255,0.9)',
      boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
    },
  },
  ghost: {
    base: {
      background: 'transparent',
      border: '1px solid transparent',
      color: 'rgba(255,255,255,0.4)',
    },
    hover: {
      background: 'rgba(255,255,255,0.04)',
      color: 'rgba(255,255,255,0.8)',
    },
  },
  danger: {
    base: {
      background: 'rgba(239,68,68,0.08)',
      border: '1px solid rgba(239,68,68,0.2)',
      color: '#f87171',
    },
    hover: {
      background: 'rgba(239,68,68,0.15)',
      borderColor: 'rgba(239,68,68,0.35)',
      boxShadow: '0 4px 16px rgba(239,68,68,0.15)',
    },
  },
  success: {
    base: {
      background: 'rgba(0,255,148,0.06)',
      border: '1px solid rgba(0,255,148,0.18)',
      color: '#00ff94',
    },
    hover: {
      background: 'rgba(0,255,148,0.12)',
      borderColor: 'rgba(0,255,148,0.3)',
      boxShadow: '0 4px 16px rgba(0,255,148,0.12)',
    },
  },
}

const SIZE_CLASSES: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-xs gap-1.5',
  md: 'px-4 py-2.5 text-sm gap-2',
  lg: 'px-6 py-3 text-sm gap-2.5',
}

interface DashboardButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  icon?: React.ReactNode
}

export function DashboardButton({
  variant = 'primary',
  size = 'md',
  icon,
  children,
  className = '',
  disabled,
  ...props
}: DashboardButtonProps) {
  const styles = VARIANT_STYLES[variant]

  return (
    <button
      className={`
        inline-flex items-center justify-center rounded-xl font-semibold
        transition-all duration-200 select-none
        disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none
        ${SIZE_CLASSES[size]}
        ${className}
      `}
      style={styles.base}
      disabled={disabled}
      onMouseEnter={e => {
        if (disabled) return
        Object.assign((e.currentTarget as HTMLElement).style, styles.hover)
      }}
      onMouseLeave={e => {
        if (disabled) return
        Object.assign((e.currentTarget as HTMLElement).style, styles.base)
      }}
      {...props}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      {children}
    </button>
  )
}
