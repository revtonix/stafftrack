// src/app/api/attendance/[id]/reject/route.ts
// PATCH /api/attendance/:id/reject
// Body: { approvalNote?: string }

import { NextRequest, NextResponse } from 'next/server'
import { getSession }                from '@/lib/auth'
import { prisma }                    from '@/lib/prisma'
import { ok, unauthorized }          from '@/lib/api'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getSession()
  if (!session) return unauthorized()

  const isAdmin = session.role === 'ADMIN'
  const isTL    = session.role === 'TEAM_LEAD_DAY' || session.role === 'TEAM_LEAD_NIGHT'

  if (!isAdmin && !isTL) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
  }

  const record = await prisma.attendance.findUnique({
    where:   { id: params.id },
    include: { staff: { include: { profile: true } } },
  })

  if (!record) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })

  // TL team guard
  if (isTL) {
    const staffTeam = record.staff.profile?.team
    const tlTeam    = session.role === 'TEAM_LEAD_DAY' ? 'DAY' : 'NIGHT'
    if (staffTeam !== tlTeam) {
      return NextResponse.json({ success: false, error: 'You can only reject your own team' }, { status: 403 })
    }
  }

  const body: { approvalNote?: string } = await req.json().catch(() => ({}))

  const updated = await prisma.attendance.update({
    where: { id: params.id },
    data:  {
      approvalStatus: 'REJECTED',
      approvedById:   session.userId,
      approvedAt:     new Date(),
      approvedHours:  null,
      approvalNote:   body.approvalNote ?? null,
    },
  })

  await prisma.auditLog.create({
    data: {
      actorId:    session.userId,
      action:     'ATTENDANCE_REJECTED',
      entityType: 'Attendance',
      entityId:   params.id,
      afterJson:  { note: body.approvalNote },
    },
  }).catch(() => {})

  return ok(updated)
}
