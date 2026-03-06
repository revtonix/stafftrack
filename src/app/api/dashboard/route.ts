// src/app/api/dashboard/route.ts
// Unified dashboard stats API - returns role-appropriate data
import { NextRequest } from 'next/server'
import { getSession } from '@/lib/auth'
import { ok, unauthorized } from '@/lib/api'
import { prisma } from '@/lib/prisma'
import { getShiftDate, getShiftDateStr } from '@/lib/shiftDay'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return unauthorized()

  const shiftDate = getShiftDate()
  const shiftDateStr = getShiftDateStr()
  const todayStart = new Date(shiftDateStr)
  const todayEnd = new Date(new Date(shiftDateStr).getTime() + 86400000 - 1)

  // Get today's attendance for all staff (with profile and worklogs)
  const todayAttendance = await prisma.attendance.findMany({
    where: { date: { gte: todayStart, lte: todayEnd } },
    include: {
      staff: {
        select: {
          id: true,
          username: true,
          profile: { select: { team: true, monthlySalary: true, isActive: true } },
        },
      },
    },
    orderBy: { checkIn: 'desc' },
  })

  // Get today's worklogs
  const todayLogs = await prisma.hourlyWorkLog.findMany({
    where: { date: { gte: todayStart, lte: todayEnd } },
    include: {
      staff: { select: { id: true, username: true, profile: { select: { team: true } } } },
      campaign: { select: { id: true, name: true, team: true } },
    },
  })

  // Get all active staff
  const allStaff = await prisma.user.findMany({
    where: { profile: { isActive: true }, role: 'STAFF' },
    select: {
      id: true,
      username: true,
      profile: { select: { team: true, monthlySalary: true } },
    },
  })

  // Active now = checked in but not checked out
  const activeNow = todayAttendance.filter(a => a.checkIn && !a.checkOut)
  const dayActive = activeNow.filter(a => a.staff.profile?.team === 'DAY')
  const nightActive = activeNow.filter(a => a.staff.profile?.team === 'NIGHT')

  // Today's forms by staff
  const formsByStaff: Record<string, { name: string; team: string; total: number; campaigns: Record<string, number> }> = {}
  for (const log of todayLogs) {
    const key = log.staff.id
    if (!formsByStaff[key]) {
      formsByStaff[key] = {
        name: log.staff.username,
        team: log.staff.profile?.team || 'DAY',
        total: 0,
        campaigns: {},
      }
    }
    formsByStaff[key].total += log.formsCount
    const cName = log.campaign.name
    formsByStaff[key].campaigns[cName] = (formsByStaff[key].campaigns[cName] || 0) + log.formsCount
  }

  // Build attendance details with hours
  const attendanceDetails = todayAttendance.map(a => {
    const hoursWorked = a.checkIn && a.checkOut
      ? Math.round(((new Date(a.checkOut).getTime() - new Date(a.checkIn).getTime()) / 3600000) * 100) / 100
      : a.checkIn
        ? Math.round(((Date.now() - new Date(a.checkIn).getTime()) / 3600000) * 100) / 100
        : 0

    const staffForms = formsByStaff[a.staffId]
    return {
      staffId: a.staffId,
      name: a.staff.username,
      team: a.staff.profile?.team || 'DAY',
      checkIn: a.checkIn,
      checkOut: a.checkOut,
      hoursWorked: Math.min(hoursWorked, 24),
      formsToday: staffForms?.total || 0,
      campaigns: staffForms?.campaigns || {},
    }
  })

  // Campaign performance today
  const campPerformance: Record<string, { name: string; team: string; totalForms: number; staffCount: number }> = {}
  for (const log of todayLogs) {
    const key = log.campaignId
    if (!campPerformance[key]) {
      campPerformance[key] = { name: log.campaign.name, team: log.campaign.team, totalForms: 0, staffCount: 0 }
    }
    campPerformance[key].totalForms += log.formsCount
  }
  // Count unique staff per campaign
  const staffPerCamp: Record<string, Set<string>> = {}
  for (const log of todayLogs) {
    if (!staffPerCamp[log.campaignId]) staffPerCamp[log.campaignId] = new Set()
    staffPerCamp[log.campaignId].add(log.staffId)
  }
  for (const [cId, staffSet] of Object.entries(staffPerCamp)) {
    if (campPerformance[cId]) campPerformance[cId].staffCount = staffSet.size
  }

  // Yesterday's attendance (for staff dashboard)
  const yesterday = new Date(shiftDate)
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`

  let myYesterday = null
  let myHistory: any[] = []

  if (session.role === 'STAFF') {
    // Get yesterday's attendance for this staff
    const yAtt = await prisma.attendance.findFirst({
      where: { staffId: session.userId, date: new Date(yesterdayStr) },
    })
    if (yAtt) {
      const yLogs = await prisma.hourlyWorkLog.findMany({
        where: { staffId: session.userId, date: new Date(yesterdayStr) },
      })
      const yHours = yAtt.checkIn && yAtt.checkOut
        ? Math.round(((new Date(yAtt.checkOut).getTime() - new Date(yAtt.checkIn).getTime()) / 3600000) * 100) / 100
        : 0
      myYesterday = {
        checkIn: yAtt.checkIn,
        checkOut: yAtt.checkOut,
        hoursWorked: yHours,
        formsCount: yLogs.reduce((a, l) => a + l.formsCount, 0),
      }
    }

    // Last 7 days attendance history
    const weekAgo = new Date(shiftDate)
    weekAgo.setDate(weekAgo.getDate() - 7)
    const histAtt = await prisma.attendance.findMany({
      where: { staffId: session.userId, date: { gte: weekAgo, lte: todayEnd } },
      orderBy: { date: 'desc' },
      take: 7,
    })
    const histLogs = await prisma.hourlyWorkLog.findMany({
      where: { staffId: session.userId, date: { gte: weekAgo, lte: todayEnd } },
    })
    const logsByDate: Record<string, number> = {}
    for (const l of histLogs) {
      const d = l.date.toISOString().split('T')[0]
      logsByDate[d] = (logsByDate[d] || 0) + l.formsCount
    }
    myHistory = histAtt.map(a => ({
      date: a.date,
      checkIn: a.checkIn,
      checkOut: a.checkOut,
      hoursWorked: a.checkIn && a.checkOut
        ? Math.round(((new Date(a.checkOut).getTime() - new Date(a.checkIn).getTime()) / 3600000) * 100) / 100
        : 0,
      formsCount: logsByDate[a.date.toISOString().split('T')[0]] || 0,
    }))
  }

  // Filter by team for TLs
  const teamFilter = session.role === 'TEAM_LEAD_DAY' ? 'DAY' : session.role === 'TEAM_LEAD_NIGHT' ? 'NIGHT' : null

  const totalFormsToday = todayLogs.reduce((a, l) => a + l.formsCount, 0)

  return ok({
    // Counts
    totalStaff: allStaff.length,
    totalPresent: todayAttendance.filter(a => a.checkIn).length,
    activeNow: activeNow.length,
    dayShiftActive: dayActive.length,
    nightShiftActive: nightActive.length,
    dayStaffTotal: allStaff.filter(s => s.profile?.team === 'DAY').length,
    nightStaffTotal: allStaff.filter(s => s.profile?.team === 'NIGHT').length,
    totalFormsToday,
    dayFormsToday: todayLogs.filter(l => l.staff.profile?.team === 'DAY').reduce((a, l) => a + l.formsCount, 0),
    nightFormsToday: todayLogs.filter(l => l.staff.profile?.team === 'NIGHT').reduce((a, l) => a + l.formsCount, 0),

    // Detailed lists
    attendance: teamFilter
      ? attendanceDetails.filter(a => a.team === teamFilter)
      : attendanceDetails,
    staffForms: teamFilter
      ? Object.values(formsByStaff).filter(s => s.team === teamFilter).sort((a, b) => b.total - a.total)
      : Object.values(formsByStaff).sort((a, b) => b.total - a.total),
    campaignPerformance: teamFilter
      ? Object.values(campPerformance).filter(c => c.team === teamFilter)
      : Object.values(campPerformance),

    // Staff-specific
    myYesterday,
    myHistory,
  })
}
