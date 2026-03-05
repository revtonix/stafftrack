// src/app/api/worklogs/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { ok, err, unauthorized, WorkLogSchema } from '@/lib/api'
import { prisma } from '@/lib/prisma'

// GET: fetch worklogs
export async function GET(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return unauthorized()

    const { searchParams } = new URL(req.url)
    const date = searchParams.get('date')
    const staffId = searchParams.get('staffId')
    const from = searchParams.get('from')
    const to = searchParams.get('to')

    const targetId = (session.role === 'ADMIN' && staffId) ? staffId : session.userId
    const where: Record<string, unknown> = { staffId: targetId }

    if (date) {
      where.date = new Date(date)
    } else if (from || to) {
      where.date = {}
      if (from) (where.date as Record<string, unknown>).gte = new Date(from)
      if (to) (where.date as Record<string, unknown>).lte = new Date(to)
    }

    const logs = await prisma.hourlyWorkLog.findMany({
      where,
      include: { campaign: { select: { id: true, name: true, team: true } } },
      orderBy: [{ date: 'desc' }, { hourIndex: 'asc' }],
    })
    return ok(logs)
  } catch (error) {
    console.error('[worklogs] GET error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

// POST: upsert a work log entry
export async function POST(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return unauthorized()

    const body = await req.json()
    const parsed = WorkLogSchema.safeParse(body)
    if (!parsed.success) return err(parsed.error.errors[0]?.message || 'Invalid input')

    const { campaignId, date, hourIndex, formsCount, note } = parsed.data
    const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } })
    if (!campaign) return err('Campaign not found')
    if (!campaign.isActive) return err('Campaign is inactive')

    const dateObj = new Date(date)
    const log = await prisma.hourlyWorkLog.upsert({
      where: { staffId_date_hourIndex: { staffId: session.userId, date: dateObj, hourIndex } },
      update: { campaignId, formsCount, note: note || null },
      create: { staffId: session.userId, campaignId, date: dateObj, hourIndex, formsCount, note: note || null },
      include: { campaign: { select: { id: true, name: true } } },
    })
    return ok(log)
  } catch (error) {
    console.error('[worklogs] POST error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
