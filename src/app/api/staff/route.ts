// src/app/api/staff/route.ts
import { NextRequest } from 'next/server'
import bcrypt from 'bcryptjs'
import { getSession } from '@/lib/auth'
import { ok, err, unauthorized, forbidden, CreateStaffSchema } from '@/lib/api'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return unauthorized()
  if (session.role !== 'ADMIN' && !session.role.startsWith('TEAM_LEAD')) return forbidden()

  const staff = await prisma.user.findMany({
    where: { role: 'STAFF' },
    include: { profile: true },
    orderBy: { username: 'asc' },
  })

  return ok(staff.map(s => ({
    id: s.id,
    username: s.username,
    role: s.role,
    team: s.profile?.team,
    monthlySalary: s.profile?.monthlySalary,
    isActive: s.profile?.isActive,
    photoUrl: s.profile?.photoUrl,
  })))
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return unauthorized()
  if (session.role !== 'ADMIN') return forbidden()

  const body = await req.json()
  const parsed = CreateStaffSchema.safeParse(body)
  if (!parsed.success) return err(parsed.error.errors[0]?.message || 'Invalid input')

  const existing = await prisma.user.findUnique({
    where: { usernameLower: parsed.data.username.toLowerCase() },
  })
  if (existing) return err('Username already exists')

  const passwordHash = await bcrypt.hash(parsed.data.password, 12)

  const user = await prisma.user.create({
    data: {
      username: parsed.data.username,
      usernameLower: parsed.data.username.toLowerCase(),
      passwordHash,
      role: parsed.data.role as any,
      profile: {
        create: {
          team: parsed.data.team as any,
          monthlySalary: parsed.data.monthlySalary,
        },
      },
    },
    include: { profile: true },
  })

  await prisma.auditLog.create({
    data: {
      actorId: session.userId,
      action: 'CREATE_STAFF',
      entityType: 'User',
      entityId: user.id,
      afterJson: { username: user.username, role: user.role },
    },
  })

  return ok({ id: user.id, username: user.username, role: user.role }, 201)
}
