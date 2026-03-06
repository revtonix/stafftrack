// src/app/api/auth/re-auth/route.ts
// POST /api/auth/re-auth
// Body: { password: string }
// Sets HttpOnly cookie `salary_reauth=<userId>` valid 5 minutes on success.

import { NextResponse } from 'next/server'
import { cookies }      from 'next/headers'
import { prisma }       from '@/lib/prisma'
import { getSession }   from '@/lib/auth'
import bcrypt           from 'bcryptjs'

export async function POST(req: Request) {
  // 1. Must be authenticated
  const auth = await getSession()
  if (!auth) {
    return NextResponse.json({ ok: false, error: 'Not authenticated' }, { status: 401 })
  }

  // 2. TEAM_LEAD blocked — they can never view salary
  if (auth.role === 'TEAM_LEAD_DAY' || auth.role === 'TEAM_LEAD_NIGHT') {
    return NextResponse.json({ ok: false, error: 'Access denied' }, { status: 403 })
  }

  // 3. Parse body
  const body = await req.json() as { password?: string }
  if (!body.password) {
    return NextResponse.json({ ok: false, error: 'Password required' }, { status: 400 })
  }

  // 4. Load user hash
  const user = await prisma.user.findUnique({
    where:  { id: auth.userId },
    select: { id: true, password: true },
  })
  if (!user) {
    return NextResponse.json({ ok: false, error: 'User not found' }, { status: 404 })
  }

  // 5. Verify password
  const valid = await bcrypt.compare(body.password, user.password)
  if (!valid) {
    return NextResponse.json({ ok: false, error: 'Incorrect password' }, { status: 401 })
  }

  // 6. Issue short-lived HttpOnly cookie (5 minutes)
  //    Value = userId so backend can confirm WHO re-authed
  const cookieStore = cookies()
  cookieStore.set('salary_reauth', auth.userId, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge:   300, // 5 minutes
    path:     '/',
  })

  return NextResponse.json({ ok: true })
}
