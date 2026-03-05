// src/app/api/attendance/[id]/approve/route.ts
// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/attendance/:id/approve
// PATCH /api/attendance/:id/reject
// Body for approve: { approvedHours?: number; approvalNote?: string }
// Body for reject:  { approvalNote?: string }
//
// Security:
//   ADMIN       → can approve/reject anyone
//   TEAM_LEAD_* → can approve/reject only staff on their team
//   STAFF       → 403 always

import { NextRequest, NextResponse } from 'next/server'
import { getSession }                from '@/lib/auth'
import { prisma }                    from '@/lib/prisma'
import { ok, err, unauthorized }     from '@/lib/api'

// ── Helper: calc worked hours ────────────────────────────────────────────────
function workedHours(checkIn: Date | null, checkOut: Date | null): number {
  if (!checkIn || !checkOut) return 0
  return (checkOut.getTime() - checkIn.getTime()) / 3600000
}

// ── PATCH /api/attendance/[id]/approve ───────────────────────────────────────
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
    include: {
      staff: {
        include: { profile: true },
      },
    },
  })

  if (!record) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })

  // TL can only approve their own team
  if (isTL) {
    const staffTeam = record.staff.profile?.team
    const tlTeam    = session.role === 'TEAM_LEAD_DAY' ? 'DAY' : 'NIGHT'
    if (staffTeam !== tlTeam) {
      return NextResponse.json({ success: false, error: 'You can only approve your own team' }, { status: 403 })
    }
  }

  const body: { approvedHours?: number; approvalNote?: string } = await req.json().catch(() => ({}))

  // If TL/Admin provided custom hours use that, else use computed hours
  const computed = workedHours(record.checkIn, record.checkOut)
  const hours    = typeof body.approvedHours === 'number' ? body.approvedHours : computed

  const updated = await prisma.attendance.update({
    where: { id: params.id },
    data:  {
      approvalStatus: 'APPROVED',
      approvedById:   session.userId,
      approvedAt:     new Date(),
      approvedHours:  hours,
      approvalNote:   body.approvalNote ?? null,
    },
    include: {
      staff:      { select: { username: true } },
      approvedBy: { select: { username: true } },
    },
  })

  // Audit log
  await prisma.auditLog.create({
    data: {
      actorId:    session.userId,
      action:     'ATTENDANCE_APPROVED',
      entityType: 'Attendance',
      entityId:   params.id,
      afterJson:  { approvedHours: hours, note: body.approvalNote },
    },
  }).catch(() => {}) // non-blocking

  return ok(updated)
}
