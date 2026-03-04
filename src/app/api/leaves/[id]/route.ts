// src/app/api/leaves/[id]/route.ts
import { NextRequest } from 'next/server'
import { getSession } from '@/lib/auth'
import { ok, err, unauthorized, forbidden, UpdateLeaveSchema } from '@/lib/api'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session) return unauthorized()
  if (session.role !== 'ADMIN') return forbidden()

  const body = await req.json()
  const parsed = UpdateLeaveSchema.safeParse(body)
  if (!parsed.success) return err('Invalid input')

  const leave = await prisma.leaveRequest.update({
    where: { id: params.id },
    data: {
      status: parsed.data.status,
      decidedById: session.userId,
      decidedAt: new Date(),
    },
  })

  return ok(leave)
}
