// src/lib/auth.ts
import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { NextRequest } from 'next/server'
import { Role } from '@prisma/client'

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'fallback-secret-change-in-production-32+'
)
const COOKIE_NAME = 'stafftrack_token'

export interface JWTPayload {
  userId: string
  username: string
  role: Role
  team?: string
}

export async function signToken(payload: JWTPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('8h')
    .sign(SECRET)
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET)
    return payload as unknown as JWTPayload
  } catch {
    return null
  }
}

export async function getSession(): Promise<JWTPayload | null> {
  const cookieStore = cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value
  if (!token) return null
  return verifyToken(token)
}

export async function getSessionFromRequest(req: NextRequest): Promise<JWTPayload | null> {
  const token = req.cookies.get(COOKIE_NAME)?.value
  if (!token) return null
  return verifyToken(token)
}

export function setAuthCookie(token: string) {
  const cookieStore = cookies()
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 8, // 8 hours
    path: '/',
  })
}

export function clearAuthCookie() {
  const cookieStore = cookies()
  cookieStore.delete(COOKIE_NAME)
}

export function isAdmin(role: Role) { return role === Role.ADMIN }
export function isTeamLead(role: Role) { return role === Role.TEAM_LEAD_DAY || role === Role.TEAM_LEAD_NIGHT }
export function isStaff(role: Role) { return role === Role.STAFF }
export function canManageStaff(role: Role) { return role === Role.ADMIN }
export function canExportReports(role: Role) { return role === Role.ADMIN }
