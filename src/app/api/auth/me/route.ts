// src/app/api/auth/me/route.ts
import { getSession } from '@/lib/auth'
import { ok, unauthorized } from '@/lib/api'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getSession()
  if (!session) return unauthorized()

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: { profile: true },
  })
  if (!user) return unauthorized()

  return ok({
    userId: user.id,
    username: user.username,
    role: user.role,
    team: user.profile?.team,
    monthlySalary: user.profile?.monthlySalary,
    photoUrl: user.profile?.photoUrl,
    isActive: user.profile?.isActive,
  })
}
