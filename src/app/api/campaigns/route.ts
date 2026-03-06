// src/app/api/campaigns/route.ts
import { NextRequest } from 'next/server'
import { getSession } from '@/lib/auth'
import { ok, err, unauthorized, forbidden, CampaignSchema } from '@/lib/api'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return unauthorized()

  const { searchParams } = new URL(req.url)
  const team = searchParams.get('team')

  const where: Record<string, unknown> = { isActive: true }
  if (team) where.team = team

  // Staff only see their team's campaigns
  if (session.role === 'STAFF' && session.team) {
    where.team = session.team
  }

  const campaigns = await prisma.campaign.findMany({ where, orderBy: { name: 'asc' } })
  return ok(campaigns)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return unauthorized()
  if (session.role !== 'ADMIN') return forbidden()

  const body = await req.json()
  const parsed = CampaignSchema.safeParse(body)
  if (!parsed.success) return err('Invalid input')

  const campaign = await prisma.campaign.create({ data: parsed.data })
  return ok(campaign, 201)
}
