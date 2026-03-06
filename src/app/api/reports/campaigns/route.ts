import { NextResponse }   from 'next/server'
import { prisma }         from '@/lib/prisma'
import { getSession }     from '@/lib/auth'
import type {
  StaffCampaignReport,
  CampaignBreakdown,
} from '@/types/campaign'

// GET /api/reports/campaigns?from=ISO&to=ISO
export async function GET(req: Request) {
  const auth = await getSession()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Only Admin and Team Lead can see full reports
  if (auth.role === 'STAFF') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const from = searchParams.get('from')
  const to   = searchParams.get('to')

  const hourEntries = await prisma.hourEntry.findMany({
    where: {
      hourStart: {
        gte: from ? new Date(from) : undefined,
        lte: to   ? new Date(to)   : undefined,
      },
    },
    include: {
      campaigns: true,
      staff: {
        select: {
          id:       true,
          username: true,
          profile: {
            select: { team: true },
          },
        },
      },
    },
    orderBy: { hourStart: 'asc' },
  })

  // Group entries by staffId
  const byStaff = new Map<string, typeof hourEntries>()
  for (const e of hourEntries) {
    if (!byStaff.has(e.staffId)) byStaff.set(e.staffId, [])
    byStaff.get(e.staffId)!.push(e)
  }

  const report: StaffCampaignReport[] = []

  for (const [staffId, entries] of Array.from(byStaff)) {
    const allCampaigns   = entries.flatMap((e: any) => e.campaigns)
    const totalCampaigns = allCampaigns.reduce((s: number, c: any) => s + c.count, 0)

    // Build campaign-level breakdown (aggregate counts by name)
    const nameMap = new Map<string, number>()
    for (const c of allCampaigns) {
      nameMap.set(c.name, (nameMap.get(c.name) ?? 0) + c.count)
    }
    const campaignBreakdown: CampaignBreakdown[] = Array.from(nameMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)

    const staffInfo = entries[0].staff

    report.push({
      staffId,
      staffName:        staffInfo.username,
      team:             (staffInfo.profile?.team ?? 'DAY') as 'DAY' | 'NIGHT',
      totalCampaigns,
      campaignBreakdown,
      hourEntries: entries.map(e => ({
        id:        e.id,
        staffId:   e.staffId,
        shiftKey:  e.shiftKey,
        hourStart: e.hourStart.toISOString(),
        hourEnd:   e.hourEnd.toISOString(),
        staffName: staffInfo.username,
        team:      (staffInfo.profile?.team ?? 'DAY') as 'DAY' | 'NIGHT',
        totalCount: e.campaigns.reduce((s, c) => s + c.count, 0),
        campaigns:  e.campaigns.map(c => ({
          id:            c.id,
          hourEntryId:   c.hourEntryId,
          name:          c.name,
          count:         c.count,
          createdByRole: c.createdByRole as any,
          updatedAt:     c.updatedAt.toISOString(),
        })),
      })),
    })
  }

  // Sort by highest total campaigns first
  report.sort((a, b) => b.totalCampaigns - a.totalCampaigns)

  const grandTotal = report.reduce((s, r) => s + r.totalCampaigns, 0)

  return NextResponse.json({ report, grandTotal })
}
