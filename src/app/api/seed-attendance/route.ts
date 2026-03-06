import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

function dateOnly(y: number, m: number, d: number) {
  return new Date(Date.UTC(y, m - 1, d))
}
function utc(y: number, m: number, d: number, h: number, min: number) {
  return new Date(Date.UTC(y, m - 1, d, h, min))
}

type Rec = { date: Date; checkIn: Date; checkOut: Date }

const data: Record<string, Rec[]> = {
  piyush: [
    { date: dateOnly(2026,3,1), checkIn: utc(2026,3,1,13,30), checkOut: utc(2026,3,1,23,30) },
    { date: dateOnly(2026,3,2), checkIn: utc(2026,3,2,13,30), checkOut: utc(2026,3,3,0,30) },
    { date: dateOnly(2026,3,3), checkIn: utc(2026,3,3,13,30), checkOut: utc(2026,3,4,0,30) },
    { date: dateOnly(2026,3,4), checkIn: utc(2026,3,4,13,30), checkOut: utc(2026,3,5,0,30) },
    { date: dateOnly(2026,3,5), checkIn: utc(2026,3,5,13,30), checkOut: utc(2026,3,6,1,30) },
  ],
  kartik: [
    { date: dateOnly(2026,3,2), checkIn: utc(2026,3,2,13,30), checkOut: utc(2026,3,3,0,30) },
    { date: dateOnly(2026,3,3), checkIn: utc(2026,3,3,13,30), checkOut: utc(2026,3,3,23,30) },
    { date: dateOnly(2026,3,4), checkIn: utc(2026,3,4,13,30), checkOut: utc(2026,3,5,0,30) },
    { date: dateOnly(2026,3,5), checkIn: utc(2026,3,5,13,30), checkOut: utc(2026,3,6,1,30) },
  ],
  shashank: [
    { date: dateOnly(2026,3,1), checkIn: utc(2026,3,1,13,30), checkOut: utc(2026,3,1,23,30) },
    { date: dateOnly(2026,3,2), checkIn: utc(2026,3,2,13,30), checkOut: utc(2026,3,3,0,30) },
    { date: dateOnly(2026,3,3), checkIn: utc(2026,3,3,13,30), checkOut: utc(2026,3,4,0,30) },
    { date: dateOnly(2026,3,4), checkIn: utc(2026,3,4,13,30), checkOut: utc(2026,3,5,1,30) },
    { date: dateOnly(2026,3,5), checkIn: utc(2026,3,5,13,30), checkOut: utc(2026,3,6,1,30) },
  ],
  ritesh: [
    { date: dateOnly(2026,3,1), checkIn: utc(2026,3,1,13,30), checkOut: utc(2026,3,2,1,30) },
    { date: dateOnly(2026,3,2), checkIn: utc(2026,3,2,13,30), checkOut: utc(2026,3,3,0,30) },
    { date: dateOnly(2026,3,3), checkIn: utc(2026,3,3,13,30), checkOut: utc(2026,3,3,22,30) },
    { date: dateOnly(2026,3,4), checkIn: utc(2026,3,4,13,30), checkOut: utc(2026,3,5,0,30) },
    { date: dateOnly(2026,3,5), checkIn: utc(2026,3,5,13,30), checkOut: utc(2026,3,6,0,30) },
  ],
  lalu: [
    { date: dateOnly(2026,3,1), checkIn: utc(2026,3,1,13,30), checkOut: utc(2026,3,1,23,30) },
    { date: dateOnly(2026,3,2), checkIn: utc(2026,3,2,13,30), checkOut: utc(2026,3,3,0,30) },
    { date: dateOnly(2026,3,3), checkIn: utc(2026,3,3,13,30), checkOut: utc(2026,3,3,23,30) },
    { date: dateOnly(2026,3,4), checkIn: utc(2026,3,4,13,30), checkOut: utc(2026,3,4,23,30) },
    { date: dateOnly(2026,3,5), checkIn: utc(2026,3,5,13,30), checkOut: utc(2026,3,6,0,30) },
  ],
  deepak: [
    { date: dateOnly(2026,3,1), checkIn: utc(2026,3,1,13,30), checkOut: utc(2026,3,1,23,30) },
    { date: dateOnly(2026,3,2), checkIn: utc(2026,3,2,13,30), checkOut: utc(2026,3,3,0,30) },
    { date: dateOnly(2026,3,3), checkIn: utc(2026,3,3,13,30), checkOut: utc(2026,3,4,0,30) },
    { date: dateOnly(2026,3,4), checkIn: utc(2026,3,4,13,30), checkOut: utc(2026,3,5,1,30) },
    { date: dateOnly(2026,3,5), checkIn: utc(2026,3,5,13,30), checkOut: utc(2026,3,6,1,30) },
  ],
  abhay: [
    { date: dateOnly(2026,3,1), checkIn: utc(2026,3,1,13,30), checkOut: utc(2026,3,2,0,30) },
    { date: dateOnly(2026,3,2), checkIn: utc(2026,3,2,13,30), checkOut: utc(2026,3,3,1,30) },
    { date: dateOnly(2026,3,3), checkIn: utc(2026,3,3,13,30), checkOut: utc(2026,3,4,0,30) },
    { date: dateOnly(2026,3,4), checkIn: utc(2026,3,4,13,30), checkOut: utc(2026,3,4,23,30) },
    { date: dateOnly(2026,3,5), checkIn: utc(2026,3,5,13,30), checkOut: utc(2026,3,6,1,30) },
  ],
}

export async function GET() {
  try {
    const usernames = Object.keys(data)
    const users = await prisma.user.findMany({
      where: { usernameLower: { in: usernames } },
      select: { id: true, username: true, usernameLower: true },
    })

    const missing = usernames.filter(n => !users.find(u => u.usernameLower === n))
    if (missing.length) {
      return NextResponse.json({ error: `Missing users: ${missing.join(', ')}` }, { status: 404 })
    }

    const counts: Record<string, number> = {}

    for (const user of users) {
      const records = data[user.usernameLower]
      counts[user.username] = 0
      for (const rec of records) {
        await prisma.attendance.upsert({
          where: { staffId_date: { staffId: user.id, date: rec.date } },
          update: { checkIn: rec.checkIn, checkOut: rec.checkOut },
          create: { staffId: user.id, date: rec.date, checkIn: rec.checkIn, checkOut: rec.checkOut },
        })
        counts[user.username]++
      }
    }

    const total = Object.values(counts).reduce((a, b) => a + b, 0)
    return NextResponse.json({ success: true, counts, total })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
