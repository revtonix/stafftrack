// src/lib/salaryGuard.ts

export type ViewerRole = 'ADMIN' | 'TEAM_LEAD' | 'STAFF'

export interface CanViewSalaryArgs {
  viewerRole:   ViewerRole
  viewerId:     string
  targetUserId: string
}

/**
 * ADMIN      → always true
 * STAFF      → true only if viewing own record
 * TEAM_LEAD  → never (not even own)
 */
export function canViewSalary({
  viewerRole,
  viewerId,
  targetUserId,
}: CanViewSalaryArgs): boolean {
  if (viewerRole === 'ADMIN') return true
  if (viewerRole === 'STAFF') return viewerId === targetUserId
  return false
}

/**
 * Strip salary fields from a record unless viewer is allowed.
 * Call on every record before returning from any API route.
 */
export function stripSalary<
  T extends {
    id?:           string
    userId?:       string
    monthlySalary?: number | null
    hourlyRate?:    number | null
    dailyRate?:     number | null
    base?:          number | null
    total?:         number | null
    partialPay?:    number | null
    extraPay?:      number | null
  }
>(record: T, viewerRole: ViewerRole, viewerId: string): T {
  const targetId = record.userId ?? record.id ?? ''
  if (canViewSalary({ viewerRole, viewerId, targetUserId: targetId })) {
    return record
  }
  return {
    ...record,
    monthlySalary: undefined,
    hourlyRate:    undefined,
    dailyRate:     undefined,
    base:          undefined,
    total:         undefined,
    partialPay:    undefined,
    extraPay:      undefined,
  }
}
