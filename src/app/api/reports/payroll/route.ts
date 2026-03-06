// src/app/api/reports/payroll/route.ts
// Replace only the return/mapping section in your existing GET handler.
// Everything above (date range calculation, DB query) stays unchanged.

import { NextResponse }          from 'next/server'
import { prisma }                from '@/lib/prisma'
import { verifyAuth }            from '@/lib/auth'
import { canViewSalary }         from '@/lib/salaryGuard'

export async function GET(request: Request) {
  const auth = await verifyAuth(request)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const period = searchParams.get('period') ?? 'today'
  const from   = searchParams.get('from')
  const to     = searchParams.get('to')

  // ... your existing date range + DB query here (unchanged) ...
  // const staffList = await prisma.staffProfile.findMany({ ... })

  // ── PRIVACY GUARD — replace your existing .map() with this ───────────────
  const report = ([] as any[]).map(s => {   // ← swap [] for your staffList
    const userId        = s.userId ?? s.id
    const monthlySalary = s.monthlySalary ?? 0
    const dailyRate     = Math.round(monthlySalary / 26)
    const hourlyRate    = Math.round(dailyRate / 8)

    // ... your existing calculations (presentDays, partialHours, etc.) ...
    const presentDays  = 0   // ← replace with real computed value
    const extraDays    = 0
    const partialHours = 0
    const partialPay   = 0
    const extraPay     = 0
    const base         = monthlySalary
    const total        = base + extraPay + partialPay

    const allowed = canViewSalary({
      viewerRole:   auth.role as any,
      viewerId:     auth.userId,
      targetUserId: userId,
    })

    return {
      id:           userId,
      name:         s.user?.username ?? s.name ?? '—',
      team:         s.team,
      presentDays,
      extraDays,
      partialHours: Math.round(partialHours * 10) / 10,

      // ── Salary fields: null when not allowed ──────────────────────────
      partialPay:   allowed ? Math.round(partialPay) : null,
      base:         allowed ? base                   : null,
      extraPay:     allowed ? Math.round(extraPay)   : null,
      total:        allowed ? Math.round(total)       : null,
      hourlyRate:   allowed ? hourlyRate              : null,
      salaryHidden: !allowed,  // frontend uses this flag to show ₹•••••
    }
  })

  return NextResponse.json({ report })
}
