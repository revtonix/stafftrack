// src/lib/salaryGuard.ts
export type ViewerRole = 'ADMIN' | 'TEAM_LEAD' | 'TEAM_LEAD_DAY' | 'TEAM_LEAD_NIGHT' | 'STAFF'

export interface CanViewSalaryArgs {
  viewerRole:   ViewerRole | string
  viewerId:     string
  targetUserId: string
}

export function canViewSalary({ viewerRole, viewerId, targetUserId }: CanViewSalaryArgs): boolean {
  if (viewerRole === 'ADMIN') return true
  if (viewerRole === 'STAFF') return viewerId === targetUserId
  // TEAM_LEAD_DAY and TEAM_LEAD_NIGHT cannot see salary
  return false
}

export function stripSalary<
  T extends {
    id?:            string
    userId?:        string
    monthlySalary?: number | null
    hourlyRate?:    number | null
    dailyRate?:     number | null
    base?:          number | null
    total?:         number | null
    partialPay?:    number | null
    extraPay?:      number | null
  }
>(record: T, viewerRole: string, viewerId: string): T {
  const targetId = record.userId ?? record.id ?? ''
  if (canViewSalary({ viewerRole, viewerId, targetUserId: targetId })) return record
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
