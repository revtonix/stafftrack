import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAuth } from '@/lib/auth'

export async function GET(request: Request) {
  const auth = await verifyAuth(request)
  if (!auth || auth.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const period = searchParams.get('period') || 'today'

  const now = new Date()
  let startDate: Date, endDate: Date

  if (period === 'today') {
    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    endDate = new Date(startDate.getTime() + 24 * 60 * 60 * 1000)
  } else if (period === 'week') {
    const day = now.getDay()
    startDate = new Date(now)
    startDate.setDate(now.getDate() - day)
    startDate.setHours(0,0,0,0)
    endDate = new Date(now)
    endDate.setHours(23,59,59,999)
  } else {
    startDate = new Date(now.getFullYear(), now.getMonth(), 1)
    endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
  }

  const staff = await prisma.staffProfile.findMany({
    include: {
      user: true,
      attendance: {
        where: { date: { gte: startDate, lte: endDate } }
      },
      workLogs: {
        where: { startTime: { gte: startDate, lte: endDate } }
      }
    }
  })

  const report = staff.map((s) => {
    const monthlySalary = s.monthlySalary
    const dailyRate = monthlySalary / 26
    const hourlyRate = dailyRate / 8
    const presentDays = s.attendance.filter(a => a.status === 'PRESENT').length
    const extraDays = Math.max(0, presentDays - 26)
    const extraPay = extraDays * dailyRate
    const presentDates = new Set(
      s.attendance.filter(a => a.status === 'PRESENT').map(a => new Date(a.date).toDateString())
    )
    let partialHours = 0
    s.workLogs.forEach(log => {
      const logDate = new Date(log.startTime).toDateString()
      if (!presentDates.has(logDate) && log.endTime) {
        const hours = (new Date(log.endTime).getTime() - new Date(log.startTime).getTime()) / (1000 * 60 * 60)
        partialHours += hours
      }
    })
    const partialPay = partialHours * hourlyRate
    const totalSalary = monthlySalary + extraPay + partialPay
    return {
      name: s.user.username,
      team: s.team,
      presentDays,
      extraDays,
      partialHours: Math.round(partialHours * 10) / 10,
      partialPay: Math.round(partialPay),
      base: monthlySalary,
      extraPay: Math.round(extraPay),
      total: Math.round(totalSalary),
      hourlyRate: Math.round(hourlyRate)
    }
  })

  return NextResponse.json({ report })
}
