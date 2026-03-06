// src/app/api/reports/salary/route.ts
import { NextRequest } from 'next/server'
import { getSession } from '@/lib/auth'
import { ok, err, unauthorized, forbidden } from '@/lib/api'
import { prisma } from '@/lib/prisma'
import { calculateSalary } from '@/lib/salary'
import { getShiftDate } from '@/lib/shiftDay'

function getDateRange(preset: string | null, from: string | null, to: string | null, month: string | null) {
  const shiftToday = getShiftDate()

  if (preset === 'today') {
    return { start: shiftToday, end: new Date(shiftToday.getTime() + 86400000 - 1) }
  }
  if (preset === 'yesterday') {
    const y = new Date(shiftToday)
    y.setDate(y.getDate() - 1)
    return { start: y, end: new Date(y.getTime() + 86400000 - 1) }
  }
  if (preset === 'thisWeek') {
    const s = new Date(shiftToday)
    s.setDate(s.getDate() - s.getDay()) // Sunday start
    return { start: s, end: new Date(shiftToday.getTime() + 86400000 - 1) }
  }
  if (preset === 'lastMonth') {
    const s = new Date(shiftToday.getFullYear(), shiftToday.getMonth() - 1, 1)
    const e = new Date(shiftToday.getFullYear(), shiftToday.getMonth(), 0, 23, 59, 59)
    return { start: s, end: e }
  }
  if (from && to) {
    return { start: new Date(from), end: new Date(to + 'T23:59:59') }
  }

  // Default: thisMonth or month param
  const [year, mon] = month
    ? month.split('-').map(Number)
    : [shiftToday.getFullYear(), shiftToday.getMonth() + 1]
  const s = new Date(year, mon - 1, 1)
  const e = new Date(year, mon, 0, 23, 59, 59)
  return { start: s, end: e }
}

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return unauthorized()

  const { searchParams } = new URL(req.url)
  const preset = searchParams.get('preset')
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const month = searchParams.get('month')
  const staffId = searchParams.get('staffId')

  const { start, end } = getDateRange(preset, from, to, month)

  const isAdmin = session.role === 'ADMIN'
  const isTL = session.role === 'TEAM_LEAD_DAY' || session.role === 'TEAM_LEAD_NIGHT'
  const isStaff = session.role === 'STAFF'

  // Determine target staff
  let targetIds: string[] = []

  if (isStaff) {
    targetIds = [session.userId]
  } else if (isTL) {
    // TL can only see their team
    const teamFilter = session.role === 'TEAM_LEAD_DAY' ? 'DAY' : 'NIGHT'
    if (staffId) {
      // Verify staff belongs to their team
      const staff = await prisma.user.findUnique({
        where: { id: staffId },
        include: { profile: true },
      })
      if (!staff || staff.profile?.team !== teamFilter) return forbidden()
      targetIds = [staffId]
    } else {
      const teamStaff = await prisma.user.findMany({
        where: { profile: { team: teamFilter, isActive: true }, role: 'STAFF' },
        select: { id: true },
      })
      targetIds = teamStaff.map(s => s.id)
    }
  } else if (isAdmin) {
    if (staffId) {
      targetIds = [staffId]
    } else {
      const allStaff = await prisma.user.findMany({
        where: { profile: { isActive: true }, role: 'STAFF' },
        select: { id: true },
      })
      targetIds = allStaff.map(s => s.id)
    }
  }

  // Fetch attendance records with date-wise breakdown
  const attendance = await prisma.attendance.findMany({
    where: {
      staffId: { in: targetIds },
      date: { gte: start, lte: end },
    },
    include: {
      staff: {
        select: {
          id: true,
          username: true,
          profile: { select: { team: true, monthlySalary: true } },
        },
      },
    },
    orderBy: [{ staffId: 'asc' }, { date: 'desc' }],
  })

  // Build date-wise records
  const records = attendance.map(a => {
    const checkIn = a.checkIn ? new Date(a.checkIn) : null
    const checkOut = a.checkOut ? new Date(a.checkOut) : null
    const hoursWorked = checkIn && checkOut
      ? Math.round(((checkOut.getTime() - checkIn.getTime()) / 3600000) * 100) / 100
      : checkIn
        ? Math.round(((Date.now() - checkIn.getTime()) / 3600000) * 100) / 100
        : 0

    const monthlySalary = a.staff.profile?.monthlySalary || 10000
    const dailyRate = monthlySalary / 30
    const dailyEarning = a.checkIn ? Math.round(dailyRate) : 0

    return {
      date: a.date,
      staffId: a.staffId,
      staffName: a.staff.username,
      team: a.staff.profile?.team || 'DAY',
      checkIn: a.checkIn,
      checkOut: a.checkOut,
      hoursWorked: Math.min(hoursWorked, 24),
      // Only include salary data for STAFF (own) and ADMIN
      ...(isTL ? {} : { dailyEarning }),
    }
  })

  // Build per-staff summaries
  const staffMap: Record<string, { name: string; team: string; monthlySalary: number; presentDays: number; totalHours: number }> = {}
  for (const a of attendance) {
    if (!staffMap[a.staffId]) {
      staffMap[a.staffId] = {
        name: a.staff.username,
        team: a.staff.profile?.team || 'DAY',
        monthlySalary: a.staff.profile?.monthlySalary || 10000,
        presentDays: 0,
        totalHours: 0,
      }
    }
    if (a.checkIn) staffMap[a.staffId].presentDays++
    const ci = a.checkIn ? new Date(a.checkIn) : null
    const co = a.checkOut ? new Date(a.checkOut) : null
    if (ci && co) {
      staffMap[a.staffId].totalHours += Math.round(((co.getTime() - ci.getTime()) / 3600000) * 100) / 100
    }
  }

  const staffSummaries = Object.entries(staffMap).map(([id, s]) => {
    const salary = calculateSalary(s.monthlySalary, s.presentDays)
    return {
      staffId: id,
      name: s.name,
      team: s.team,
      presentDays: s.presentDays,
      totalHours: Math.round(s.totalHours * 100) / 100,
      // Only include salary for STAFF and ADMIN
      ...(isTL ? {} : {
        monthlySalary: s.monthlySalary,
        ...salary,
      }),
    }
  })

  // For single staff (self), also get leaves
  let leaves: any[] = []
  if (isStaff || (staffId && targetIds.length === 1)) {
    leaves = await prisma.leaveRequest.findMany({
      where: { staffId: targetIds[0], status: 'APPROVED', dateFrom: { gte: start, lte: end } },
    })
  }

  return ok({
    records,
    staffSummaries,
    leaves,
    role: session.role,
    dateRange: { start, end },
  })
}
