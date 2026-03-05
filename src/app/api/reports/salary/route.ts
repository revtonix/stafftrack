// src/app/api/reports/salary/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { ok, unauthorized } from '@/lib/api'
import { prisma } from '@/lib/prisma'
import { calculateSalary } from '@/lib/salary'

export async function GET(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return unauthorized()

    const { searchParams } = new URL(req.url)
    const month = searchParams.get('month')
    const now = new Date()
    const [year, mon] = month
      ? month.split('-').map(Number)
      : [now.getFullYear(), now.getMonth() + 1]

    const start = new Date(year, mon - 1, 1)
    const end = new Date(year, mon, 0, 23, 59, 59)

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      include: { profile: true },
    })

    const presentDays = await prisma.attendance.count({
      where: { staffId: session.userId, date: { gte: start, lte: end }, checkIn: { not: null } },
    })

    const leaves = await prisma.leaveRequest.findMany({
      where: { staffId: session.userId, status: 'APPROVED', dateFrom: { gte: start, lte: end } },
    })

    const salary = calculateSalary(user?.profile?.monthlySalary || 10000, presentDays)
    return ok({ ...salary, leaves, month: `${year}-${String(mon).padStart(2, '0')}` })
  } catch (error) {
    console.error('[salary] GET error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
