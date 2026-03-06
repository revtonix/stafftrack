// src/app/api/reports/productivity/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { ok, unauthorized, forbidden } from '@/lib/api'
import { prisma } from '@/lib/prisma'
import { getShiftDate } from '@/lib/shiftDay'

function getDateRange(preset: string | null, from: string | null, to: string | null) {
  const now = new Date()
  const shiftToday = getShiftDate(now)

  if (preset === 'today') {
    return { start: shiftToday, end: new Date(shiftToday.getTime() + 86400000 - 1) }
  }
  if (preset === '7days') {
    const s = new Date(shiftToday); s.setDate(s.getDate() - 6)
    return { start: s, end: new Date(shiftToday.getTime() + 86400000 - 1) }
  }
  if (preset === '30days') {
    const s = new Date(shiftToday); s.setDate(s.getDate() - 29)
    return { start: s, end: new Date(shiftToday.getTime() + 86400000 - 1) }
  }
  if (preset === 'thisMonth' || (!preset && !from && !to)) {
    const s = new Date(shiftToday.getFullYear(), shiftToday.getMonth(), 1)
    const e = new Date(shiftToday.getFullYear(), shiftToday.getMonth() + 1, 0, 23, 59, 59)
    return { start: s, end: e }
  }
  if (preset === '6months') {
    const s = new Date(shiftToday); s.setMonth(s.getMonth() - 6)
    return { start: s, end: new Date(shiftToday.getTime() + 86400000 - 1) }
  }
  const start = from ? new Date(from) : new Date(now.getFullYear(), now.getMonth(), 1)
  const end = to ? new Date(to + 'T23:59:59') : now
  return { start, end }
}

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return unauthorized()
  if (session.role !== 'ADMIN') return forbidden()

  const { searchParams } = new URL(req.url)
  const preset = searchParams.get('preset')
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const exportCsv = searchParams.get('export') === 'csv'

  const { start, end } = getDateRange(preset, from, to)

  const logs = await prisma.hourlyWorkLog.findMany({
    where: { date: { gte: start, lte: end } },
    include: {
      staff: { select: { username: true } },
      campaign: { select: { name: true, team: true } },
    },
    orderBy: [{ date: 'asc' }, { staff: { username: 'asc' } }],
  })

  if (exportCsv) {
    const header = 'Date,Staff,Campaign,Hour,Forms\n'
    const rows = logs.map(l =>
      `${l.date.toISOString().split('T')[0]},${l.staff.username},${l.campaign.name},${l.hourIndex},${l.formsCount}`
    ).join('\n')
    return new NextResponse(header + rows, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="productivity-${start.toISOString().split('T')[0]}.csv"`,
      },
    })
  }

  // Summarize: per staff per campaign
  const summary: Record<string, Record<string, number>> = {}
  for (const log of logs) {
    if (!summary[log.staff.username]) summary[log.staff.username] = {}
    const campName = log.campaign.name
    summary[log.staff.username][campName] = (summary[log.staff.username][campName] || 0) + log.formsCount
  }

  const staffTotals = Object.entries(summary).map(([name, campaigns]) => ({
    name,
    total: Object.values(campaigns).reduce((a, b) => a + b, 0),
    campaigns,
  })).sort((a, b) => b.total - a.total)

  const campTotals: Record<string, number> = {}
  for (const log of logs) {
    campTotals[log.campaign.name] = (campTotals[log.campaign.name] || 0) + log.formsCount
  }

  return ok({ staffTotals, campTotals, totalForms: logs.reduce((a, l) => a + l.formsCount, 0) })
}
