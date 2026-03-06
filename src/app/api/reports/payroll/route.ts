// src/app/api/reports/payroll/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { ok, unauthorized, forbidden } from '@/lib/api'
import { prisma } from '@/lib/prisma'
import { calculateSalary } from '@/lib/salary'

function getDateRange(preset: string | null, from: string | null, to: string | null) {
  const now = new Date()
  if (preset === 'today') {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    return { start: d, end: new Date(d.getTime() + 86400000 - 1) }
  }
  if (preset === '7days') {
    const s = new Date(now); s.setDate(s.getDate() - 6); s.setHours(0,0,0,0)
    return { start: s, end: now }
  }
  if (preset === '30days') {
    const s = new Date(now); s.setDate(s.getDate() - 29); s.setHours(0,0,0,0)
    return { start: s, end: now }
  }
  if (preset === '6months') {
    const s = new Date(now); s.setMonth(s.getMonth() - 6); s.setHours(0,0,0,0)
    return { start: s, end: now }
  }
  if (preset === 'thisMonth' || (!preset && !from && !to)) {
    const s = new Date(now.getFullYear(), now.getMonth(), 1)
    const e = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
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

  // Batch query: count attendance days for all staff in one query
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
