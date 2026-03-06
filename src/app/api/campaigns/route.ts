import { NextResponse } from 'next/server'
import { prisma }       from '@/lib/prisma'
import { getSession }   from '@/lib/auth'

// POST /api/campaigns
// Body: { staffId, shiftKey, hourStart, hourEnd, campaignName, count }
export async function POST(req: Request) {
  const auth = await getSession(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { staffId, shiftKey, hourStart, hourEnd, campaignName, count = 0 } = await req.json()

  if (!staffId || !shiftKey || !hourStart || !campaignName) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Get or create HourEntry for this staff + hour block
  let hourEntry = await prisma.hourEntry.findFirst({
    where: {
      staffId,
      shiftKey,
      hourStart: new Date(hourStart),
    },
  })

  if (!hourEntry) {
    hourEntry = await prisma.hourEntry.create({
      data: {
        staffId,
        shiftKey,
        hourStart: new Date(hourStart),
        hourEnd:   new Date(hourEnd),
      },
    })
  }

  // Add new campaign to this hour entry
  const campaign = await prisma.campaignWork.create({
    data: {
      hourEntryId:   hourEntry.id,
      name:          campaignName.trim(),
      count,
      createdByRole: auth.role,
    },
  })

  return NextResponse.json({ campaign, hourEntryId: hourEntry.id })
}

// GET /api/campaigns?staffId=X&shiftKey=2026-03-04
export async function GET(req: Request) {
  const auth = await getSession(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const staffId  = searchParams.get('staffId')
  const shiftKey = searchParams.get('shiftKey')

  const entries = await prisma.hourEntry.findMany({
    where: {
      staffId:  staffId  ?? auth.userId,
      shiftKey: shiftKey ?? undefined,
    },
    include: {
      campaigns: { orderBy: { updatedAt: 'asc' } },
    },
    orderBy: { hourStart: 'asc' },
  })

  return NextResponse.json({ entries })
}
