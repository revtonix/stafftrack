// src/app/api/auth/re-auth/route.ts
import { NextResponse, NextRequest } from 'next/server'
import { cookies }                   from 'next/headers'
import { prisma }                    from '@/lib/prisma'
import { getSession }                from '@/lib/auth'
import bcrypt                        from 'bcryptjs'

export async function POST(req: NextRequest) {
  const auth = await getSession()
  if (!auth) {
    return NextResponse.json({ ok: false, error: 'Not authenticated' }, { status: 401 })
  }

  const body = await req.json() as { password?: string }
  if (!body.password) {
    return NextResponse.json({ ok: false, error: 'Password required' }, { status: 400 })
  }

  const user = await prisma.user.findUnique({
    where:  { id: auth.userId },
    select: { id: true, passwordHash: true },
  })
  if (!user) {
    return NextResponse.json({ ok: false, error: 'User not found' }, { status: 404 })
  }

  const valid = await bcrypt.compare(body.password, user.passwordHash)
  if (!valid) {
    return NextResponse.json({ ok: false, error: 'Incorrect password' }, { status: 401 })
  }

  const cookieStore = cookies()
  cookieStore.set('salary_reauth', auth.userId, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge:   300,
    path:     '/',
  })

  return NextResponse.json({ ok: true })
}
