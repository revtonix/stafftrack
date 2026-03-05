// src/app/api/staff/route.ts
// Replace your existing GET handler with this.
// Only the salary masking block is new — all other logic unchanged.

import { NextResponse }          from 'next/server'
import { prisma }                from '@/lib/prisma'
import { getSessionFromRequest }            from '@/lib/auth'
import { canViewSalary }         from '@/lib/salaryGuard'

export async function GET(req: Request) {
  const auth = await getSessionFromRequest(req as any)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const staffList = await prisma.staffProfile.findMany({
    include: { user: { select: { id: true, username: true, role: true } } },
    orderBy: { user: { username: 'asc' } },
  })

  // ── PRIVACY GUARD ─────────────────────────────────────────────────────────
  const safeList = staffList.map(s => {
    const allowed = canViewSalary({
      viewerRole:   auth.role as any,
      viewerId:     auth.userId,
      targetUserId: s.userId,
    })
    return {
      id:            s.userId,
      username:      s.user.username,
      team:          s.team,
      role:          s.user.role,
      // Salary only included if allowed — else field is absent entirely
      ...(allowed ? { monthlySalary: s.monthlySalary } : {}),
      salaryHidden: !allowed,
    }
  })

  return NextResponse.json({ staff: safeList })
}

// PATCH  /api/staff/:id  — keep your existing handler, just add guard on read
// No changes needed to PATCH since it doesn't return salary in response.
