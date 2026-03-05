// src/app/api/staff/route.ts
import { NextResponse }  from 'next/server'
import { prisma }        from '@/lib/prisma'
import { getSession }    from '@/lib/auth'
import { canViewSalary } from '@/lib/salaryGuard'

export async function GET() {
  const auth = await getSession()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const staffList = await prisma.staffProfile.findMany({
    include: { user: { select: { id: true, username: true, role: true } } },
    orderBy: { user: { username: 'asc' } },
  })

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
      monthlySalary: allowed ? s.monthlySalary : null,
      salaryHidden:  !allowed,
    }
  })

  return NextResponse.json({ success: true, data: safeList })
}
