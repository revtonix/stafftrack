// src/app/api/attendance/route.ts
// ─────────────────────────────────────────────────────────────────────────────
// GET  — fetch attendance (with approval fields)
// POST — check in
// PATCH — check out
// All existing logic preserved, approval fields added to GET response.

import { NextRequest, NextResponse } from 'next/server'
import { getSession }                from '@/lib/auth'
import { ok, err, unauthorized }     from '@/lib/api'
import { prisma }                    from '@/lib/prisma'
import { getTodayDate }              from '@/lib/salary'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return unauthorized()

  const { searchParams } = new URL(req.url)
  const staffId   = searchParams.get('staffId')
  const from      = searchParams.get('from')
  const to        = searchParams.get('to')
  const onlyPending = searchParams.get('pending') === '1'  // NEW: ?pending=1

  const isAdmin = session.role === 'ADMIN'
  const isTL    = session.role === 'TEAM_LEAD_DAY' || session.role === 'TEAM_LEAD_NIGHT'

  const dateFilter: Record<string, unknown> = {}
  if (from) dateFilter.gte = new Date(from)
  if (to)   dateFilter.lte = new Date(to)
  const hasDate = Object.keys(dateFilter).length > 0

  // ── ADMIN / TL: all staff (TL = own team only) ────────────────────────────
  if ((isAdmin || isTL) && !staffId) {
    const tlTeam = isTL ? (session.role === 'TEAM_LEAD_DAY' ? 'DAY' : 'NIGHT') : undefined

    const records = await prisma.attendance.findMany({
      where: {
        ...(hasDate ? { date: dateFilter } : {}),
        ...(onlyPending ? { approvalStatus: 'PENDING_APPROVAL' } : {}),
        staff: tlTeam ? { profile: { team: tlTeam } } : undefined,
      },
      include: {
        staff: {
          select: {
            id:       true,
            username: true,
            profile:  {
              select: {
                team:          true,
                monthlySalary: true,
              },
            },
          },
        },
        approvedBy: { select: { username: true } },
      },
      orderBy: [{ date: 'desc' }, { staff: { username: 'asc' } }],
      take: 500,
    })

    const data = records.map(r => {
      const computed = r.checkIn && r.checkOut
        ? (r.checkOut.getTime() - r.checkIn.getTime()) / 3600000
        : 0
      const hours    = r.approvedHours ?? computed
      const monthly  = r.staff.profile?.monthlySalary ?? 0
      const hourlyRate = monthly / 26 / 8

      return {
        id:             r.id,
        staffId:        r.staffId,
        staffName:      r.staff.username,
        team:           r.staff.profile?.team ?? 'DAY',
        // Salary only for ADMIN
        monthlySalary:  isAdmin ? monthly : undefined,
        date:           r.date,
        checkIn:        r.checkIn,
        checkOut:       r.checkOut,
        hours:          Math.round(computed * 100) / 100,
        // Approval fields
        approvalStatus: r.approvalStatus,
        approvedById:   r.approvedById,
        approvedByName: r.approvedBy?.username ?? null,
        approvedAt:     r.approvedAt,
        approvedHours:  r.approvedHours,
        approvalNote:   r.approvalNote,
        // Salary after approval (admin only)
        earnedToday: isAdmin && r.approvalStatus === 'APPROVED'
          ? Math.round((r.approvedHours ?? computed) * hourlyRate)
          : undefined,
      }
    })

    return ok(data)
  }

  // ── STAFF / specific staffId ──────────────────────────────────────────────
  const targetId = (isAdmin && staffId) ? staffId : session.userId

  const records = await prisma.attendance.findMany({
    where: {
      staffId: targetId,
      ...(hasDate ? { date: dateFilter } : {}),
    },
    include: {
      approvedBy: { select: { username: true } },
    },
    orderBy: { date: 'desc' },
    take: 120,
  })

  const data = records.map(r => {
    const computed = r.checkIn && r.checkOut
      ? (r.checkOut.getTime() - r.checkIn.getTime()) / 3600000
      : 0
    return {
      ...r,
      hours:          Math.round(computed * 100) / 100,
      approvedByName: r.approvedBy?.username ?? null,
    }
  })

  return ok(data)
}

// POST: check in (unchanged)
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return unauthorized()

  const today = getTodayDate()

  const existing = await prisma.attendance.findUnique({
    where: { staffId_date: { staffId: session.userId, date: today } },
  })

  if (existing?.checkIn) return err('Already checked in today')

  const record = await prisma.attendance.upsert({
    where:  { staffId_date: { staffId: session.userId, date: today } },
    update: { checkIn: new Date() },
    create: {
      staffId:        session.userId,
      date:           today,
      checkIn:        new Date(),
      approvalStatus: 'PENDING_APPROVAL',
    },
  })

  return ok(record)
}

// PATCH: check out (unchanged)
export async function PATCH(req: NextRequest) {
  const session = await getSession()
  if (!session) return unauthorized()

  const today = getTodayDate()

  const existing = await prisma.attendance.findUnique({
    where: { staffId_date: { staffId: session.userId, date: today } },
  })

  if (!existing?.checkIn)  return err('You have not checked in today')
  if (existing.checkOut)   return err('Already checked out today')

  const record = await prisma.attendance.update({
    where: { staffId_date: { staffId: session.userId, date: today } },
    data:  {
      checkOut:       new Date(),
      approvalStatus: 'PENDING_APPROVAL',   // reset to pending after checkout
    },
  })

  return ok(record)
}
