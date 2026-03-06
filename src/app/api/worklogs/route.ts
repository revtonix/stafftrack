// src/app/api/worklogs/route.ts
import { NextRequest } from 'next/server'
import { getSession } from '@/lib/auth'
import { ok, err, unauthorized, WorkLogSchema } from '@/lib/api'
import { prisma } from '@/lib/prisma'

// GET: fetch worklogs
export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return unauthorized()

  const { searchParams } = new URL(req.url)
  const date = searchParams.get('date')
  const staffId = searchParams.get('staffId')
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const all = searchParams.get('all') // Admin/TL: fetch all staff worklogs

  const where: Record<string, unknown> = {}

  // Admin/TL can fetch all staff worklogs
  if (all === 'true' && session.role !== 'STAFF') {
    // No staffId filter - get all
  } else {
    where.staffId = (session.role === 'ADMIN' && staffId) ? staffId : session.userId
  }

  if (date) {
    where.date = new Date(date)
  } else if (from || to) {
    where.date = {}
    if (from) (where.date as Record<string, unknown>).gte = new Date(from)
    if (to) (where.date as Record<string, unknown>).lte = new Date(to)
  }

  const logs = await prisma.hourlyWorkLog.findMany({
    where,
    include: {
      campaign: { select: { id: true, name: true, team: true } },
      staff: { select: { username: true } },
    },
    orderBy: [{ date: 'desc' }, { hourIndex: 'asc' }],
  })

  return ok(logs)
}

// POST: upsert a work log entry (supports multiple campaigns per hour)
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return unauthorized()

  try {
    const body = await req.json()
    const parsed = WorkLogSchema.safeParse(body)
    if (!parsed.success) return err(parsed.error.errors[0]?.message || 'Invalid input')

    const { campaignId, date, hourIndex, formsCount, note } = parsed.data

    // Verify campaign exists
    const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } })
    if (!campaign) return err('Campaign not found')
    if (!campaign.isActive) return err('Campaign is inactive')

    const dateObj = new Date(date)

    const log = await prisma.hourlyWorkLog.upsert({
      where: {
        staffId_date_hourIndex_campaignId: {
          staffId: session.userId,
          date: dateObj,
          hourIndex,
          campaignId,
        },
      },
      update: { formsCount, note: note || null },
      create: { staffId: session.userId, campaignId, date: dateObj, hourIndex, formsCount, note: note || null },
      include: { campaign: { select: { id: true, name: true } } },
    })

    return ok(log)
  } catch {
    return err('Failed to process work log', 500)
  }
}
