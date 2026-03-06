// src/app/api/attendance/route.ts
import { NextRequest } from 'next/server'
import { getSession } from '@/lib/auth'
import { ok, err, unauthorized } from '@/lib/api'
import { prisma } from '@/lib/prisma'
import { getTodayDate } from '@/lib/salary'

// GET: fetch attendance for current user (or staffId if admin)
export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return unauthorized()

  const { searchParams } = new URL(req.url)
  const staffId = searchParams.get('staffId')
  const from = searchParams.get('from')
  const to = searchParams.get('to')

  // Non-admin can only see their own
  const targetId = (session.role === 'ADMIN' && staffId) ? staffId : session.userId

  const where: Record<string, unknown> = { staffId: targetId }
  if (from || to) {
    where.date = {}
    if (from) (where.date as Record<string, unknown>).gte = new Date(from)
    if (to) (where.date as Record<string, unknown>).lte = new Date(to)
  }

  const records = await prisma.attendance.findMany({
    where,
    orderBy: { date: 'desc' },
    take: 60,
  })

  return ok(records)
}

// POST: check in
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return unauthorized()

  const today = getTodayDate()

  const existing = await prisma.attendance.findUnique({
    where: { staffId_date: { staffId: session.userId, date: today } },
  })

  if (existing?.checkIn) return err('Already checked in today')

  const record = await prisma.attendance.upsert({
    where: { staffId_date: { staffId: session.userId, date: today } },
    update: { checkIn: new Date() },
    create: { staffId: session.userId, date: today, checkIn: new Date() },
  })

  return ok(record)
}

// PATCH: check out
export async function PATCH(req: NextRequest) {
  const session = await getSession()
  if (!session) return unauthorized()

  const today = getTodayDate()

  const existing = await prisma.attendance.findUnique({
    where: { staffId_date: { staffId: session.userId, date: today } },
  })

  if (!existing?.checkIn) return err('You have not checked in today')
  if (existing.checkOut) return err('Already checked out today')

  const record = await prisma.attendance.update({
    where: { staffId_date: { staffId: session.userId, date: today } },
    data: { checkOut: new Date() },
  })

  return ok(record)
}
