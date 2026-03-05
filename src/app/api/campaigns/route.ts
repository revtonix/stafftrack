import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { ok, err, unauthorized } from '@/lib/api'

// POST /api/campaigns
// Body: { staffId, shiftKey, hourStart, hourEnd, campaignName, count }
export async function POST(req: Request) {
  try {
    const auth = await getSession()
    if (!auth) return unauthorized()

    const { staffId, shiftKey, hourStart, hourEnd, campaignName, count = 0 } = await req.json()

    if (!staffId || !shiftKey || !hourStart || !campaignName) {
      return err('Missing required fields')
    }

    // Get or create HourEntry for this staff + hour block
    let hourEntry = await prisma.hourEntry.findFirst({
      where: { staffId, shiftKey, hourStart: new Date(hourStart) },
    })

    if (!hourEntry) {
      hourEntry = await prisma.hourEntry.create({
        data: {
          staffId,
          shiftKey,
          hourStart: new Date(hourStart),
          hourEnd: new Date(hourEnd),
        },
      })
    }

    const campaign = await prisma.campaignWork.create({
      data: {
        hourEntryId: hourEntry.id,
        name: campaignName.trim(),
        count,
        createdByRole: auth.role,
      },
    })

    return ok({ campaign, hourEntryId: hourEntry.id })
  } catch (error) {
    console.error('[campaigns] POST error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

// GET /api/campaigns — returns active campaigns for the staff's team
export async function GET(req: Request) {
  try {
    const auth = await getSession()
    if (!auth) return unauthorized()

    const { searchParams } = new URL(req.url)
    const staffId = searchParams.get('staffId')
    const shiftKey = searchParams.get('shiftKey')

    // If staffId/shiftKey are provided, return hour entries (for reports)
    if (staffId || shiftKey) {
      const entries = await prisma.hourEntry.findMany({
        where: {
          staffId: staffId ?? auth.userId,
          shiftKey: shiftKey ?? undefined,
        },
        include: { campaigns: { orderBy: { updatedAt: 'asc' } } },
        orderBy: { hourStart: 'asc' },
      })
      return ok(entries)
    }

    // Default: return active Campaign records for the staff to pick from
    const campaigns = await prisma.campaign.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    })
    return ok(campaigns)
  } catch (error) {
    console.error('[campaigns] GET error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
