// src/app/api/auth/login/route.ts
import { NextRequest } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { signToken, setAuthCookie } from '@/lib/auth'
import { ok, err, LoginSchema } from '@/lib/api'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = LoginSchema.safeParse(body)
    if (!parsed.success) return err('Invalid input', 400)

    const { username, password } = parsed.data

    const user = await prisma.user.findUnique({
      where: { usernameLower: username.toLowerCase() },
      include: { profile: true },
    })

    if (!user) return err('Invalid username or password', 401)
    if (user.profile && !user.profile.isActive) return err('Account is deactivated', 403)

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) return err('Invalid username or password', 401)

    const token = await signToken({
      userId: user.id,
      username: user.username,
      role: user.role,
      team: user.profile?.team,
    })

    setAuthCookie(token)

    return ok({
      userId: user.id,
      username: user.username,
      role: user.role,
      team: user.profile?.team,
    })
  } catch (e) {
    console.error(e)
    return err('Server error', 500)
  }
}
