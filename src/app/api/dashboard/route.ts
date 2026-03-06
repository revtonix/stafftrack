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

  // --- Enhanced Analytics for Admin Dashboard ---

  // Hourly forms breakdown (for live performance graph)
  const hourlyFormsByTeam: { hour: number; dayForms: number; nightForms: number }[] = []
  for (let h = 1; h <= 12; h++) {
    const dayForms = todayLogs.filter(l => l.hourIndex === h && l.staff.profile?.team === 'DAY').reduce((a, l) => a + l.formsCount, 0)
    const nightForms = todayLogs.filter(l => l.hourIndex === h && l.staff.profile?.team === 'NIGHT').reduce((a, l) => a + l.formsCount, 0)
    hourlyFormsByTeam.push({ hour: h, dayForms, nightForms })
  }

  // Idle staff detection: active staff with no recent worklog activity
  const idleStaff: { name: string; team: string; idleMinutes: number }[] = []
  for (const a of activeNow) {
    const staffLogs = todayLogs.filter(l => l.staffId === a.staffId)
    let lastActivityTime = a.checkIn ? new Date(a.checkIn).getTime() : 0
    // Find the latest worklog update time (approximate by updatedAt or use checkIn + hourIndex)
    for (const log of staffLogs) {
      // Approximate: each hourIndex represents an hour after check-in
      if (a.checkIn) {
        const logTime = new Date(a.checkIn).getTime() + log.hourIndex * 3600000
        if (logTime > lastActivityTime) lastActivityTime = logTime
      }
    }
    const idleMs = Date.now() - lastActivityTime
    const idleMinutes = Math.floor(idleMs / 60000)
    if (idleMinutes >= 10) {
      idleStaff.push({
        name: a.staff.username,
        team: a.staff.profile?.team || 'DAY',
        idleMinutes,
      })
    }
  }

  // AI Productivity Score per staff
  const productivityScores: { name: string; team: string; score: number; formsPerHour: number; activeHours: number; totalForms: number }[] = []
  for (const a of todayAttendance) {
    if (!a.checkIn) continue
    const hoursWorked = a.checkOut
      ? (new Date(a.checkOut).getTime() - new Date(a.checkIn).getTime()) / 3600000
      : (Date.now() - new Date(a.checkIn).getTime()) / 3600000
    const clampedHours = Math.min(Math.max(hoursWorked, 0.1), 12)
    const staffTotal = formsByStaff[a.staffId]?.total || 0
    const formsPerHour = staffTotal / clampedHours
    // Score: weighted combo of forms/hr (max ~10/hr = 100%), active time ratio (out of 12h shift), idle penalty
    const fphScore = Math.min(formsPerHour / 8, 1) * 60 // up to 60 points for forms/hr
    const activeScore = Math.min(clampedHours / 10, 1) * 25 // up to 25 points for active time
    const idleEntry = idleStaff.find(i => i.name === a.staff.username)
    const idlePenalty = idleEntry ? Math.min(idleEntry.idleMinutes / 60, 1) * 15 : 0
    const baseScore = Math.min(staffTotal > 0 ? 15 : 5, 15) // 15 points for having any forms
    const score = Math.round(Math.min(Math.max(fphScore + activeScore + baseScore - idlePenalty, 0), 100))
    productivityScores.push({
      name: a.staff.username,
      team: a.staff.profile?.team || 'DAY',
      score,
      formsPerHour: Math.round(formsPerHour * 10) / 10,
      activeHours: Math.round(clampedHours * 10) / 10,
      totalForms: staffTotal,
    })
  }
  productivityScores.sort((a, b) => b.score - a.score)

  // Smart Alerts
  const alerts: { type: 'warning' | 'danger' | 'info'; message: string }[] = []
  // Late logins (checked in after 7:30 AM for day, after 7:30 PM for night)
  const lateStaff = todayAttendance.filter(a => {
    if (!a.checkIn) return false
    const checkInDate = new Date(a.checkIn)
    const parts = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(checkInDate)
    const hr = parseInt(parts.find(p => p.type === 'hour')!.value)
    const mn = parseInt(parts.find(p => p.type === 'minute')!.value)
    const totalMin = hr * 60 + mn
    const team = a.staff.profile?.team
    if (team === 'DAY') return totalMin > 7 * 60 + 30 // after 7:30 AM
    if (team === 'NIGHT') return totalMin > 19 * 60 + 30 // after 7:30 PM
    return false
  })
  if (lateStaff.length > 0) alerts.push({ type: 'warning', message: `${lateStaff.length} staff logged in late today` })
  // Idle staff alerts
  if (idleStaff.length > 0) alerts.push({ type: 'warning', message: `${idleStaff.length} staff idle for 10+ minutes` })
  // Low active staff per team
  if (dayActive.length <= 1 && allStaff.filter(s => s.profile?.team === 'DAY').length > 1) {
    alerts.push({ type: 'danger', message: `Only ${dayActive.length} staff active in Day Team` })
  }
  if (nightActive.length <= 1 && allStaff.filter(s => s.profile?.team === 'NIGHT').length > 1) {
    alerts.push({ type: 'danger', message: `Only ${nightActive.length} staff active in Night Team` })
  }
  // Campaigns with no forms today
  const activeCampaigns = await prisma.campaign.findMany({ where: { isActive: true } })
  const campaignsWithForms = new Set(todayLogs.map(l => l.campaignId))
  const inactiveCamps = activeCampaigns.filter(c => !campaignsWithForms.has(c.id))
  if (inactiveCamps.length > 0) {
    alerts.push({ type: 'warning', message: `${inactiveCamps.length} campaign${inactiveCamps.length > 1 ? 's' : ''} inactive today` })
  }

  // Forms per hour per campaign (for enhanced campaign table)
  const campFormsPerHour: Record<string, number> = {}
  for (const [cId, perf] of Object.entries(campPerformance)) {
    // Calculate hours since shift start
    const shiftStart = new Date(shiftDateStr + 'T07:00:00+05:30')
    const hoursElapsed = Math.max((Date.now() - shiftStart.getTime()) / 3600000, 0.1)
    campFormsPerHour[cId] = Math.round((perf.totalForms / Math.min(hoursElapsed, 12)) * 10) / 10
  }

  // Build activity timeline from attendance & worklogs
  const activityTimeline: { id: string; time: string; staffName: string; team: string; event: string; detail?: string }[] = []
  for (const a of todayAttendance) {
    if (a.checkIn) {
      const t = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(a.checkIn))
      activityTimeline.push({ id: `ci-${a.staffId}`, time: t, staffName: a.staff.username, team: a.staff.profile?.team || 'DAY', event: 'checked in' })
    }
    if (a.checkOut) {
      const t = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(a.checkOut))
      activityTimeline.push({ id: `co-${a.staffId}`, time: t, staffName: a.staff.username, team: a.staff.profile?.team || 'DAY', event: 'checked out' })
    }
  }
  // Group worklogs by staff to show form submissions
  const staffLogSummary: Record<string, { name: string; team: string; forms: number; campaigns: string[] }> = {}
  for (const log of todayLogs) {
    const key = log.staffId
    if (!staffLogSummary[key]) {
      staffLogSummary[key] = { name: log.staff.username, team: log.staff.profile?.team || 'DAY', forms: 0, campaigns: [] }
    }
    staffLogSummary[key].forms += log.formsCount
    if (!staffLogSummary[key].campaigns.includes(log.campaign.name)) {
      staffLogSummary[key].campaigns.push(log.campaign.name)
    }
  }
  for (const [sid, s] of Object.entries(staffLogSummary)) {
    if (s.forms > 0) {
      activityTimeline.push({
        id: `wl-${sid}`,
        time: new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date()),
        staffName: s.name,
        team: s.team,
        event: `submitted ${s.forms} forms`,
        detail: s.campaigns.join(', '),
      })
    }
  }
  activityTimeline.sort((a, b) => b.time.localeCompare(a.time))

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
    campaignPerformance: (teamFilter
      ? Object.values(campPerformance).filter(c => c.team === teamFilter)
      : Object.values(campPerformance)
    ).map(c => {
      const cId = Object.keys(campPerformance).find(k => campPerformance[k].name === c.name) || ''
      return { ...c, formsPerHour: campFormsPerHour[cId] || 0 }
    }),

    // Enhanced analytics (admin)
    hourlyFormsByTeam,
    idleStaff,
    productivityScores,
    alerts,
    activityTimeline,

    // Staff-specific
    myYesterday,
    myHistory,
  })
}
