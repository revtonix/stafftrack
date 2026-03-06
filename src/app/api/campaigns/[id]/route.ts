import { NextResponse } from 'next/server'
import { prisma }       from '@/lib/prisma'
import { verifyAuth }   from '@/lib/auth'

// PATCH /api/campaigns/[id]
// Body: { name?, count? }
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const auth = await verifyAuth(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body: { name?: string; count?: number } = await req.json()

  // ROLE GUARD: only Admin or Team Lead can rename
  if (body.name !== undefined && auth.role === 'STAFF') {
    return NextResponse.json(
      { error: 'Only Admin or Team Lead can rename campaigns' },
      { status: 403 }
    )
  }

  const updated = await prisma.campaignWork.update({
    where: { id: params.id },
    data: {
      ...(body.name  !== undefined ? { name:  body.name.trim() } : {}),
      ...(body.count !== undefined ? { count: body.count }       : {}),
    },
  })

  return NextResponse.json({ campaign: updated })
}

// DELETE /api/campaigns/[id]  — Admin / Team Lead only
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const auth = await verifyAuth(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (auth.role === 'STAFF') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await prisma.campaignWork.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
