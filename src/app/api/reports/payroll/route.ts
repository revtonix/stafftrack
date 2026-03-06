// src/app/api/reports/payroll/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { ok, unauthorized, forbidden } from '@/lib/api'
import { prisma } from '@/lib/prisma'
import { calculateSalary } from '@/lib/salary'
import { getShiftDate } from '@/lib/shiftDay'

function getDateRange(preset: string | null, from: string | null, to: string | null) {
  const now = new Date()
  const shiftToday = getShiftDate(now)

  if (preset === 'today') {
    // Today = current shift day (7AM-7AM window)
    return { start: shiftToday, end: new Date(shiftToday.getTime() + 86400000 - 1) }
  }
  if (preset === '7days') {
    const s = new Date(shiftToday); s.setDate(s.getDate() - 6)
    return { start: s, end: new Date(shiftToday.getTime() + 86400000 - 1) }
  }
  if (preset === '30days') {
    const s = new Date(shiftToday); s.setDate(s.getDate() - 29)
    return { start: s, end: new Date(shiftToday.getTime() + 86400000 - 1) }
  }
  if (preset === '6months') {
    const s = new Date(shiftToday); s.setMonth(s.getMonth() - 6)
    return { start: s, end: new Date(shiftToday.getTime() + 86400000 - 1) }
  }
  if (preset === 'thisMonth' || (!preset && !from && !to)) {
    const s = new Date(shiftToday.getFullYear(), shiftToday.getMonth(), 1)
    const e = new Date(shiftToday.getFullYear(), shiftToday.getMonth() + 1, 0, 23, 59, 59)
    return { start: s, end: e }
  }
  const start = from ? new Date(from) : new Date(now.getFullYear(), now.getMonth(), 1)
  const end = to ? new Date(to + 'T23:59:59') : now
  return { start, end }
}

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return unauthorized()
  if (session.role !== 'ADMIN') return forbidden()

  const { searchParams } = new URL(req.url)
  const preset = searchParams.get('preset')
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const exportCsv = searchParams.get('export') === 'csv'

  const { start, end } = getDateRange(preset, from, to)

  const staffList = await prisma.user.findMany({
    where: { role: 'STAFF' },
    include: { profile: true },
    orderBy: { username: 'asc' },
  })

  const staffIds = staffList.filter(s => s.profile).map(s => s.id)

  // Batch query: count attendance days for all staff in date range
  const attendanceCounts = await prisma.attendance.groupBy({
    by: ['staffId'],
    where: { staffId: { in: staffIds }, date: { gte: start, lte: end }, checkIn: { not: null } },
    _count: { staffId: true },
  })

  const attendanceMap = new Map(attendanceCounts.map(a => [a.staffId, a._count.staffId]))

  const results = staffList
    .filter(staff => staff.profile)
    .map(staff => {
      const attendanceDays = attendanceMap.get(staff.id) || 0
      const salary = calculateSalary(staff.profile!.monthlySalary, attendanceDays)
      return {
        id: staff.id,
        name: staff.username,
        team: staff.profile!.team,
        monthlySalary: staff.profile!.monthlySalary,
        ...salary,
      }
    })

  if (exportCsv) {
    const header = 'Staff,Team,Present Days,Extra Days,Base Salary,Extra Pay,Total Salary\n'
    const rows = results.map(r =>
      `${r.name},${r.team},${r.presentDays},${r.extraDays},${r.baseSalary},${r.extraPay},${r.totalSalary}`
    ).join('\n')
    return new NextResponse(header + rows, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="payroll-${start.toISOString().split('T')[0]}.csv"`,
      },
    })
  }

  return ok(results)
}
