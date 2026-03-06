// src/app/api/leaves/route.ts
import { NextRequest } from 'next/server'
import { getSession } from '@/lib/auth'
import { ok, err, unauthorized, forbidden, LeaveSchema } from '@/lib/api'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return unauthorized()

  const { searchParams } = new URL(req.url)
  const staffId = searchParams.get('staffId')

  if (session.role === 'STAFF') {
    const leaves = await prisma.leaveRequest.findMany({
      where: { staffId: session.userId },
      orderBy: { createdAt: 'desc' },
    })
    return ok(leaves)
  }

  if (session.role === 'ADMIN') {
    const where = staffId ? { staffId } : {}
    const leaves = await prisma.leaveRequest.findMany({
      where,
      include: { staff: { select: { username: true } } },
      orderBy: { createdAt: 'desc' },
    })
    return ok(leaves)
  }

  return forbidden()
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return unauthorized()
  if (session.role !== 'STAFF') return forbidden()

  try {
    const body = await req.json()
    const parsed = LeaveSchema.safeParse(body)
    if (!parsed.success) return err(parsed.error.errors[0]?.message || 'Invalid input')

    const leave = await prisma.leaveRequest.create({
      data: {
        staffId: session.userId,
        dateFrom: new Date(parsed.data.dateFrom),
        dateTo: new Date(parsed.data.dateTo),
        type: parsed.data.type,
        reason: parsed.data.reason,
      },
    })

    return ok(leave, 201)
  } catch {
    return err('Failed to process leave request', 500)
  }
}
