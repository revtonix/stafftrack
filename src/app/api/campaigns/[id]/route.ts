// src/app/api/campaigns/[id]/route.ts
import { NextRequest } from 'next/server'
import { getSession } from '@/lib/auth'
import { ok, err, unauthorized, forbidden, UpdateCampaignSchema } from '@/lib/api'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session) return unauthorized()

  // Only admin or team leads can rename
  if (session.role === 'STAFF') return forbidden()

  const campaign = await prisma.campaign.findUnique({ where: { id: params.id } })
  if (!campaign) return err('Campaign not found', 404)

  // Team lead can only rename their team's campaigns
  if (session.role === 'TEAM_LEAD_DAY' && campaign.team !== 'DAY') return forbidden()
  if (session.role === 'TEAM_LEAD_NIGHT' && campaign.team !== 'NIGHT') return forbidden()

  const body = await req.json()
  const parsed = UpdateCampaignSchema.safeParse(body)
  if (!parsed.success) return err('Invalid input')

  const updated = await prisma.campaign.update({
    where: { id: params.id },
    data: { name: parsed.data.name },
  })

  return ok(updated)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session) return unauthorized()
  if (session.role !== 'ADMIN') return forbidden()

  await prisma.campaign.update({
    where: { id: params.id },
    data: { isActive: false },
  })

  return ok({ message: 'Campaign deactivated' })
}
