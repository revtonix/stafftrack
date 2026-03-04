// src/app/api/staff/[id]/route.ts
import { NextRequest } from 'next/server'
import bcrypt from 'bcryptjs'
import { getSession } from '@/lib/auth'
import { ok, err, unauthorized, forbidden, UpdateStaffSchema } from '@/lib/api'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session) return unauthorized()
  if (session.role !== 'ADMIN') return forbidden()

  const user = await prisma.user.findUnique({
    where: { id: params.id },
    include: { profile: true },
  })
  if (!user) return err('Not found', 404)

  return ok({
    id: user.id,
    username: user.username,
    role: user.role,
    team: user.profile?.team,
    monthlySalary: user.profile?.monthlySalary,
    isActive: user.profile?.isActive,
    photoUrl: user.profile?.photoUrl,
  })
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session) return unauthorized()
  if (session.role !== 'ADMIN') return forbidden()

  const body = await req.json()
  const parsed = UpdateStaffSchema.safeParse(body)
  if (!parsed.success) return err(parsed.error.errors[0]?.message || 'Invalid input')

  const before = await prisma.user.findUnique({
    where: { id: params.id }, include: { profile: true },
  })

  const profileUpdates: Record<string, unknown> = {}
  if (parsed.data.monthlySalary !== undefined) profileUpdates.monthlySalary = parsed.data.monthlySalary
  if (parsed.data.team !== undefined) profileUpdates.team = parsed.data.team
  if (parsed.data.isActive !== undefined) profileUpdates.isActive = parsed.data.isActive

  const userUpdates: Record<string, unknown> = {}
  if (parsed.data.password) {
    userUpdates.passwordHash = await bcrypt.hash(parsed.data.password, 12)
  }

  await prisma.user.update({
    where: { id: params.id },
    data: {
      ...userUpdates,
      profile: Object.keys(profileUpdates).length ? { update: profileUpdates } : undefined,
    },
  })

  await prisma.auditLog.create({
    data: {
      actorId: session.userId,
      action: 'UPDATE_STAFF',
      entityType: 'User',
      entityId: params.id,
      beforeJson: { monthlySalary: before?.profile?.monthlySalary, team: before?.profile?.team },
      afterJson: profileUpdates,
    },
  })

  return ok({ message: 'Updated' })
}
