// src/app/api/productivity/state/route.ts
// Dynamic hourly productivity state — shift-aware, role-based
import { NextRequest } from 'next/server'
import { getSession } from '@/lib/auth'
import { ok, unauthorized } from '@/lib/api'
import { prisma } from '@/lib/prisma'
import { getShiftDate, getShiftDateStr, getISTHour } from '@/lib/shiftDay'

const DAY_HOUR_LABELS: Record<number, string> = {
  1: '7AM–8AM', 2: '8AM–9AM', 3: '9AM–10AM', 4: '10AM–11AM',
  5: '11AM–12PM', 6: '12PM–1PM', 7: '1PM–2PM', 8: '2PM–3PM',
  9: '3PM–4PM', 10: '4PM–5PM', 11: '5PM–6PM', 12: '6PM–7PM',
}
const NIGHT_HOUR_LABELS: Record<number, string> = {
  1: '7PM–8PM', 2: '8PM–9PM', 3: '9PM–10PM', 4: '10PM–11PM',
  5: '11PM–12AM', 6: '12AM–1AM', 7: '1AM–2AM', 8: '2AM–3AM',
  9: '3AM–4AM', 10: '4AM–5AM', 11: '5AM–6AM', 12: '6AM–7AM',
}

function getISTMinute(date: Date = new Date()): number {
  const p = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata', minute: '2-digit', hour12: false,
  }).formatToParts(date)
  return parseInt(p.find(x => x.type === 'minute')!.value)
}

function getCurrentHourInfo(shiftType: 'DAY' | 'NIGHT', istHour: number, istMinute: number) {
  if (shiftType === 'DAY') {
    if (istHour < 7 || istHour >= 19) return { currentHour: 0, progress: 0, unlockedHours: [] as number[] }
    const currentHour = istHour - 6
    const progress = Math.round((istMinute / 60) * 100)
    const unlockedHours = Array.from({ length: currentHour }, (_, i) => i + 1)
    return { currentHour, progress, unlockedHours }
  } else {
    let shiftHourOffset: number
    if (istHour >= 19) {
      shiftHourOffset = istHour - 19
    } else if (istHour < 7) {
      shiftHourOffset = istHour + 5
    } else {
      return { currentHour: 0, progress: 0, unlockedHours: [] as number[] }
    }
    const currentHour = shiftHourOffset + 1
    const progress = Math.round((istMinute / 60) * 100)
    const unlockedHours = Array.from({ length: currentHour }, (_, i) => i + 1)
    return { currentHour, progress, unlockedHours }
  }
}

// XP level thresholds
function calculateLevel(totalXP: number): { level: number; title: string; xp: number; xpForNext: number } {
  const levels = [
    { xp: 0, title: 'Trainee' },
    { xp: 100, title: 'Junior Agent' },
    { xp: 300, title: 'Agent' },
    { xp: 600, title: 'Senior Agent' },
    { xp: 1000, title: 'Expert Agent' },
    { xp: 1500, title: 'Master Agent' },
    { xp: 2500, title: 'Elite Agent' },
    { xp: 4000, title: 'Legend' },
  ]
  let level = 1
  let title = levels[0].title
  let xpForNext = levels[1]?.xp || 100
  for (let i = levels.length - 1; i >= 0; i--) {
    if (totalXP >= levels[i].xp) {
      level = i + 1
      title = levels[i].title
      xpForNext = levels[i + 1]?.xp || levels[i].xp + 1000
      break
    }
  }
  return { level, title, xp: totalXP, xpForNext }
}

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return unauthorized()

  const now = new Date()
  const istHour = getISTHour(now)
  const istMinute = getISTMinute(now)
  const shiftDate = getShiftDate(now)
  const shiftDateStr = getShiftDateStr(now)
  const shiftDateObj = new Date(shiftDateStr)

  const isAdmin = session.role === 'ADMIN'
  const isTL = session.role === 'TEAM_LEAD_DAY' || session.role === 'TEAM_LEAD_NIGHT'
  const isStaff = session.role === 'STAFF'

  // Get user profile for team info
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: { profile: { select: { team: true, monthlySalary: true } } },
  })
  const userTeam = user?.profile?.team || 'DAY'
  const shiftType: 'DAY' | 'NIGHT' = userTeam === 'DAY' ? 'DAY' : 'NIGHT'

  // Dynamic hour info
  const hourInfo = getCurrentHourInfo(shiftType, istHour, istMinute)
  const hourLabels = shiftType === 'DAY' ? DAY_HOUR_LABELS : NIGHT_HOUR_LABELS

  // Determine target staff IDs based on role
  let targetIds: string[] = []
  if (isStaff) {
    targetIds = [session.userId]
  } else if (isTL) {
    const teamFilter = session.role === 'TEAM_LEAD_DAY' ? 'DAY' : 'NIGHT'
    const teamStaff = await prisma.user.findMany({
      where: { profile: { team: teamFilter, isActive: true }, role: 'STAFF' },
      select: { id: true },
    })
    targetIds = teamStaff.map(s => s.id)
  } else if (isAdmin) {
    const allStaff = await prisma.user.findMany({
      where: { profile: { isActive: true }, role: 'STAFF' },
      select: { id: true },
    })
    targetIds = allStaff.map(s => s.id)
  }

  // Fetch saved worklogs for shift date
  const savedLogs = await prisma.hourlyWorkLog.findMany({
    where: {
      staffId: { in: targetIds },
      date: shiftDateObj,
    },
    include: {
      campaign: { select: { id: true, name: true, team: true } },
      staff: { select: { id: true, username: true, profile: { select: { team: true } } } },
    },
    orderBy: [{ staffId: 'asc' }, { hourIndex: 'asc' }],
  })

  // Available campaigns for user's team (or all for admin)
  const campaigns = await prisma.campaign.findMany({
    where: {
      isActive: true,
      ...(isAdmin ? {} : { team: userTeam }),
    },
    select: { id: true, name: true, team: true },
  })

  // Build own logs (for STAFF or all for admin/TL)
  const ownLogs = isStaff
    ? savedLogs.filter(l => l.staffId === session.userId)
    : savedLogs

  // Build per-hour saved data for own user
  const myHourData: Record<number, { campaignId: string; campaignName: string; formsCount: number; note: string; updatedAt: Date }[]> = {}
  for (const log of savedLogs.filter(l => l.staffId === session.userId)) {
    if (!myHourData[log.hourIndex]) myHourData[log.hourIndex] = []
    myHourData[log.hourIndex].push({
      campaignId: log.campaignId,
      campaignName: log.campaign.name,
      formsCount: log.formsCount,
      note: log.note || '',
      updatedAt: log.updatedAt,
    })
  }

  // Hourly leader: top performer in current active hour
  let hourlyLeader: { name: string; forms: number; hour: number } | null = null
  if (hourInfo.currentHour > 0) {
    const currentHourLogs = savedLogs.filter(l => l.hourIndex === hourInfo.currentHour)
    const byStaff: Record<string, { name: string; forms: number }> = {}
    for (const l of currentHourLogs) {
      const key = l.staffId
      if (!byStaff[key]) byStaff[key] = { name: l.staff.username, forms: 0 }
      byStaff[key].forms += l.formsCount
    }
    const sorted = Object.values(byStaff).sort((a, b) => b.forms - a.forms)
    if (sorted.length > 0 && sorted[0].forms > 0) {
      hourlyLeader = { name: sorted[0].name, forms: sorted[0].forms, hour: hourInfo.currentHour }
    }
  }

  // Idle detection
  const idleThresholdMs = 10 * 60 * 1000 // 10 minutes
  let myIdleStatus = { isIdle: false, idleMinutes: 0 }

  // Find last activity for current user
  const myLogs = savedLogs.filter(l => l.staffId === session.userId)
  let lastActiveAt = 0
  for (const l of myLogs) {
    const t = new Date(l.updatedAt).getTime()
    if (t > lastActiveAt) lastActiveAt = t
  }
  // Also check attendance check-in
  const todayAttendance = await prisma.attendance.findFirst({
    where: { staffId: session.userId, date: shiftDateObj },
  })
  if (todayAttendance?.checkIn) {
    const checkInTime = new Date(todayAttendance.checkIn).getTime()
    if (checkInTime > lastActiveAt) lastActiveAt = checkInTime
  }
  if (lastActiveAt > 0) {
    const idleMs = now.getTime() - lastActiveAt
    if (idleMs >= idleThresholdMs) {
      myIdleStatus = { isIdle: true, idleMinutes: Math.floor(idleMs / 60000) }
    }
  }

  // Team idle alerts (for TL/Admin)
  let teamIdleAlerts: { staffId: string; name: string; team: string; idleMinutes: number }[] = []
  if (isTL || isAdmin) {
    const teamAttendance = await prisma.attendance.findMany({
      where: {
        staffId: { in: targetIds },
        date: shiftDateObj,
        checkIn: { not: null },
        checkOut: null, // only currently active staff
      },
      include: { staff: { select: { id: true, username: true, profile: { select: { team: true } } } } },
    })

    for (const att of teamAttendance) {
      const staffLogs = savedLogs.filter(l => l.staffId === att.staffId)
      let staffLastActive = att.checkIn ? new Date(att.checkIn).getTime() : 0
      for (const l of staffLogs) {
        const t = new Date(l.updatedAt).getTime()
        if (t > staffLastActive) staffLastActive = t
      }
      const idleMs = now.getTime() - staffLastActive
      if (idleMs >= idleThresholdMs) {
        teamIdleAlerts.push({
          staffId: att.staffId,
          name: att.staff.username,
          team: att.staff.profile?.team || 'DAY',
          idleMinutes: Math.floor(idleMs / 60000),
        })
      }
    }
    teamIdleAlerts.sort((a, b) => b.idleMinutes - a.idleMinutes)
  }

  // XP / Gamification — calculate from this month's data
  const monthStart = new Date(shiftDate.getFullYear(), shiftDate.getMonth(), 1)
  const monthLogs = await prisma.hourlyWorkLog.findMany({
    where: {
      staffId: session.userId,
      date: { gte: monthStart, lte: shiftDateObj },
    },
  })
  const monthAttendance = await prisma.attendance.findMany({
    where: {
      staffId: session.userId,
      date: { gte: monthStart, lte: shiftDateObj },
      checkIn: { not: null },
    },
  })

  // XP: 1 per form + 5 per active hour + 20 per day with 8+ hours + 50 per perfect attendance day
  let totalXP = 0
  const totalMonthForms = monthLogs.reduce((a, l) => a + l.formsCount, 0)
  totalXP += totalMonthForms // 1 XP per form

  // Active hours: unique (date, hourIndex) pairs
  const activeHourSet = new Set(monthLogs.map(l => `${l.date.toISOString().split('T')[0]}-${l.hourIndex}`))
  totalXP += activeHourSet.size * 5 // 5 XP per active hour

  // Full work days (8+ hours attendance)
  for (const att of monthAttendance) {
    if (att.checkIn && att.checkOut) {
      const hours = (new Date(att.checkOut).getTime() - new Date(att.checkIn).getTime()) / 3600000
      if (hours >= 8) totalXP += 20
    }
  }

  // Attendance days bonus
  totalXP += monthAttendance.length * 10

  const levelInfo = calculateLevel(totalXP)

  // Badges
  const badges: { id: string; label: string; icon: string }[] = []
  const todayForms = myLogs.reduce((a, l) => a + l.formsCount, 0)
  if (hourlyLeader && hourlyLeader.name === user?.username) {
    badges.push({ id: 'top_performer', label: 'Top Performer', icon: '🏆' })
  }
  if (todayForms >= 50) {
    badges.push({ id: 'fast_entry', label: 'Fast Entry', icon: '⚡' })
  }
  // Check streak (consecutive attendance days)
  const last5Days: Date[] = []
  for (let i = 0; i < 5; i++) {
    const d = new Date(shiftDate)
    d.setDate(d.getDate() - i)
    last5Days.push(d)
  }
  const streakDates = monthAttendance.map(a => a.date.toISOString().split('T')[0])
  const has5DayStreak = last5Days.every(d => {
    const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    return streakDates.includes(ds)
  })
  if (has5DayStreak) {
    badges.push({ id: '5day_streak', label: '5 Day Streak', icon: '🔥' })
  }
  if (!myIdleStatus.isIdle && todayForms > 0) {
    badges.push({ id: 'no_idle', label: 'No Idle', icon: '💪' })
  }

  // Staff hour states for TL/Admin view
  let teamHourStates: {
    staffId: string; name: string; team: string
    hours: { hourIndex: number; formsCount: number; campaignName: string }[]
    totalForms: number
  }[] = []

  if (isTL || isAdmin) {
    const staffMap: Record<string, {
      name: string; team: string
      hours: { hourIndex: number; formsCount: number; campaignName: string }[]
      totalForms: number
    }> = {}
    for (const l of savedLogs) {
      if (!staffMap[l.staffId]) {
        staffMap[l.staffId] = {
          name: l.staff.username,
          team: l.staff.profile?.team || 'DAY',
          hours: [],
          totalForms: 0,
        }
      }
      staffMap[l.staffId].hours.push({
        hourIndex: l.hourIndex,
        formsCount: l.formsCount,
        campaignName: l.campaign.name,
      })
      staffMap[l.staffId].totalForms += l.formsCount
    }
    teamHourStates = Object.entries(staffMap).map(([id, s]) => ({
      staffId: id, ...s,
    })).sort((a, b) => b.totalForms - a.totalForms)
  }

  return ok({
    shiftDate: shiftDateStr,
    shiftType,
    userTeam,
    role: session.role,
    currentHour: hourInfo.currentHour,
    hourProgress: hourInfo.progress,
    unlockedHours: hourInfo.unlockedHours,
    hourLabels,
    myHourData,
    campaigns,
    hourlyLeader,
    myIdleStatus,
    teamIdleAlerts,
    gamification: {
      ...levelInfo,
      totalMonthForms,
      attendanceDays: monthAttendance.length,
      activeHours: activeHourSet.size,
      badges,
    },
    teamHourStates,
  })
}
