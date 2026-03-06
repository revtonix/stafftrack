// src/app/api/reports/salary/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { ok, unauthorized, forbidden } from '@/lib/api'
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
  const exportType = searchParams.get('export') // csv, excel
  const exportScope = searchParams.get('exportScope') // salary, hours, payroll

  const { start, end } = getDateRange(preset, from, to, month)

  const isAdmin = session.role === 'ADMIN'
  const isTL = session.role === 'TEAM_LEAD_DAY' || session.role === 'TEAM_LEAD_NIGHT'
  const isStaff = session.role === 'STAFF'

  // Determine target staff
  let targetIds: string[] = []

  if (isStaff) {
    targetIds = [session.userId]
  } else if (isTL) {
    const teamFilter = session.role === 'TEAM_LEAD_DAY' ? 'DAY' : 'NIGHT'
    if (staffId) {
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

  // Fetch attendance records
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

  // Fetch worklogs for forms/hour calculation
  const workLogs = await prisma.hourlyWorkLog.findMany({
    where: {
      staffId: { in: targetIds },
      date: { gte: start, lte: end },
    },
    select: { staffId: true, formsCount: true },
  })

  // Calculate total forms per staff
  const formsPerStaff: Record<string, number> = {}
  for (const wl of workLogs) {
    formsPerStaff[wl.staffId] = (formsPerStaff[wl.staffId] || 0) + wl.formsCount
  }

  // Calculate working days in month for attendance indicator
  const monthStart = new Date(start.getFullYear(), start.getMonth(), 1)
  const monthEnd = new Date(start.getFullYear(), start.getMonth() + 1, 0)
  let totalWorkingDays = 0
  const today = getShiftDate()
  const rangeEnd = monthEnd < today ? monthEnd : today
  for (let d = new Date(monthStart); d <= rangeEnd; d.setDate(d.getDate() + 1)) {
    totalWorkingDays++
  }
  if (totalWorkingDays === 0) totalWorkingDays = 1

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
      ...(isTL ? {} : { dailyEarning }),
    }
  })

  // Build per-staff summaries with enhanced fields
  const staffMap: Record<string, {
    name: string; team: string; monthlySalary: number
    presentDays: number; totalHours: number
  }> = {}
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

  // Days remaining in month for AI forecast
  const daysInMonth = monthEnd.getDate()
  const daysPassed = Math.min(today.getDate(), daysInMonth)
  const daysRemaining = Math.max(daysInMonth - daysPassed, 0)

  const staffSummaries = Object.entries(staffMap).map(([id, s]) => {
    const salary = calculateSalary(s.monthlySalary, s.presentDays)
    const totalForms = formsPerStaff[id] || 0
    const formsPerHour = s.totalHours > 0 ? Math.round((totalForms / s.totalHours) * 10) / 10 : 0

    // Salary till date (daily rate * present days)
    const salaryTillDate = Math.round((s.monthlySalary / 30) * s.presentDays)

    // AI estimated month salary: project current rate to full month
    const avgDailyAttendance = daysPassed > 0 ? s.presentDays / daysPassed : 0
    const projectedDays = s.presentDays + Math.round(avgDailyAttendance * daysRemaining)
    const estimatedSalary = calculateSalary(s.monthlySalary, projectedDays)

    // Attendance status
    const attendanceRatio = s.presentDays / totalWorkingDays
    const attendanceStatus: 'green' | 'yellow' | 'red' =
      attendanceRatio >= 0.9 ? 'green' : attendanceRatio >= 0.7 ? 'yellow' : 'red'

    return {
      staffId: id,
      name: s.name,
      team: s.team,
      presentDays: s.presentDays,
      totalHours: Math.round(s.totalHours * 100) / 100,
      totalForms,
      formsPerHour,
      attendanceStatus,
      totalWorkingDays,
      ...(isTL ? {} : {
        monthlySalary: s.monthlySalary,
        salaryTillDate,
        estimatedMonthSalary: estimatedSalary.totalSalary,
        ...salary,
      }),
    }
  })

  // Sort by total salary (or hours for TL)
  staffSummaries.sort((a, b) => {
    if (isTL) return b.totalHours - a.totalHours
    return (b.totalSalary || 0) - (a.totalSalary || 0)
  })

  // Top earners and hours rankings
  const topEarners = isTL ? [] : [...staffSummaries]
    .filter(s => (s.totalSalary || 0) > 0)
    .sort((a, b) => (b.totalSalary || 0) - (a.totalSalary || 0))
    .slice(0, 5)
    .map(s => ({ name: s.name, amount: s.totalSalary || 0 }))

  const topHours = [...staffSummaries]
    .filter(s => s.totalHours > 0)
    .sort((a, b) => b.totalHours - a.totalHours)
    .slice(0, 5)
    .map(s => ({ name: s.name, hours: s.totalHours }))

  // For single staff (self), also get leaves
  let leaves: any[] = []
  if (isStaff || (staffId && targetIds.length === 1)) {
    leaves = await prisma.leaveRequest.findMany({
      where: { staffId: targetIds[0], status: 'APPROVED', dateFrom: { gte: start, lte: end } },
    })
  }

  // Handle CSV export
  if (exportType === 'csv') {
    const scope = exportScope || 'salary'
    let csvContent = ''

    if (scope === 'hours') {
      csvContent = 'Staff,Team,Present Days,Total Hours,Forms/Hour\n'
      csvContent += staffSummaries.map(s =>
        `${s.name},${s.team},${s.presentDays},${s.totalHours},${s.formsPerHour}`
      ).join('\n')
    } else if (scope === 'payroll') {
      csvContent = 'Staff,Team,Present Days,Total Hours,Base Salary,Extra Days,Extra Pay,Total Salary,Salary Till Date,Estimated Month\n'
      csvContent += staffSummaries.map(s =>
        `${s.name},${s.team},${s.presentDays},${s.totalHours},${s.baseSalary || 0},${s.extraDays || 0},${s.extraPay || 0},${s.totalSalary || 0},${s.salaryTillDate || 0},${s.estimatedMonthSalary || 0}`
      ).join('\n')
    } else {
      csvContent = 'Date,Staff,Team,Check-In,Check-Out,Hours Worked,Daily Earning\n'
      csvContent += records.map(r =>
        `${new Date(r.date).toISOString().split('T')[0]},${r.staffName},${r.team},${r.checkIn || ''},${r.checkOut || ''},${r.hoursWorked},${r.dailyEarning || ''}`
      ).join('\n')
    }

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${scope}-report-${start.toISOString().split('T')[0]}.csv"`,
      },
    })
  }

  return ok({
    records,
    staffSummaries,
    leaves,
    role: session.role,
    dateRange: { start, end },
    topEarners,
    topHours,
    totalWorkingDays,
  })
}
