// src/app/api/reports/payroll/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { canViewSalary } from '@/lib/salaryGuard'

function getDateRange(preset: string | null, from: string | null, to: string | null) {
  const now = new Date()
  if (preset === 'today') {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    return { start: d, end: new Date(d.getTime() + 86400000 - 1) }
  }
  if (preset === '7days') {
    const s = new Date(now); s.setDate(s.getDate() - 6); s.setHours(0, 0, 0, 0)
    return { start: s, end: now }
  }
  if (preset === '30days') {
    const s = new Date(now); s.setDate(s.getDate() - 29); s.setHours(0, 0, 0, 0)
    return { start: s, end: now }
  }
  if (preset === '6months') {
    const s = new Date(now); s.setMonth(s.getMonth() - 6); s.setHours(0, 0, 0, 0)
    return { start: s, end: now }
  }
  if (preset === 'thisMonth' || (!preset && !from && !to)) {
    const s = new Date(now.getFullYear(), now.getMonth(), 1)
    const e = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
    return { start: s, end: e }
  }
  const start = from ? new Date(from) : new Date(now.getFullYear(), now.getMonth(), 1)
  const end = to ? new Date(to) : now
  return { start, end }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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

    const results = []
    for (const staff of staffList) {
      if (!staff.profile) continue

      const monthlySalary = staff.profile.monthlySalary
      const dailyRate = Math.round(monthlySalary / 26)
      const hourlyRate = Math.round(dailyRate / 8)

      // Count approved attendance days
      const attendanceRows = await prisma.attendance.findMany({
        where: {
          staffId: staff.id,
          date: { gte: start, lte: end },
          checkIn: { not: null },
          approvalStatus: { in: ['APPROVED', 'PENDING_APPROVAL'] },
        },
        select: { checkIn: true, checkOut: true, approvedHours: true },
      })

      const presentDays = attendanceRows.length
      const extraDays = Math.max(0, presentDays - 26)
      const base = Math.min(presentDays, 26) * dailyRate
      const extraPay = extraDays * dailyRate

      // Partial hours from today's partial shift
      let partialHours = 0
      if (preset === 'today' || from) {
        const todayRow = attendanceRows.find(r => r.checkIn && !r.checkOut)
        if (todayRow?.checkIn) {
          const hrs = (Date.now() - new Date(todayRow.checkIn).getTime()) / 3600000
          partialHours = Math.round(hrs * 10) / 10
        }
      }
      const partialPay = Math.round(partialHours * hourlyRate)
      const total = base + extraPay + partialPay

      const allowed = canViewSalary({
        viewerRole: session.role as any,
        viewerId: session.userId,
        targetUserId: staff.id,
      })

      results.push({
        id: staff.id,
        name: staff.username,
        team: staff.profile.team,
        presentDays,
        extraDays,
        partialHours,
        partialPay: allowed ? partialPay : null,
        base: allowed ? base : null,
        extraPay: allowed ? extraPay : null,
        total: allowed ? total : null,
        hourlyRate: allowed ? hourlyRate : null,
        salaryHidden: !allowed,
      })
    }

    if (exportCsv) {
      const header = 'Staff,Team,Present Days,Extra Days,Partial Hours,Partial Pay,Base,Extra Pay,Total\n'
      const rows = results.map(r =>
        `${r.name},${r.team},${r.presentDays},${r.extraDays},${r.partialHours},${r.partialPay ?? ''},${r.base ?? ''},${r.extraPay ?? ''},${r.total ?? ''}`
      ).join('\n')
      return new NextResponse(header + rows, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="payroll-${start.toISOString().split('T')[0]}.csv"`,
        },
      })
    }

    return NextResponse.json({ success: true, data: results })
  } catch (error) {
    console.error('[payroll] GET error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
