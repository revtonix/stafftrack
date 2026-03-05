// src/app/api/reports/productivity/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { ok, unauthorized, forbidden } from '@/lib/api'
import { prisma } from '@/lib/prisma'

function getDateRange(preset: string | null, from: string | null, to: string | null) {
  const now = new Date()
  if (preset === 'today') {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    return { start: d, end: new Date(d.getTime() + 86400000 - 1) }
  }
  if (preset === '7days') {
    const s = new Date(now); s.setDate(s.getDate() - 6); s.setHours(0, 0, 0, 0)
    return { start: s, end: now }
  }
  if (preset === '30days') {
    const s = new Date(now); s.setDate(s.getDate() - 29); s.setHours(0, 0, 0, 0)
    return { start: s, end: now }
  }
  if (preset === 'thisMonth' || (!preset && !from && !to)) {
    const s = new Date(now.getFullYear(), now.getMonth(), 1)
    const e = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
    return { start: s, end: e }
  }
  if (preset === '6months') {
    const s = new Date(now); s.setMonth(s.getMonth() - 6); s.setHours(0, 0, 0, 0)
    return { start: s, end: now }
  }
  const start = from ? new Date(from) : new Date(now.getFullYear(), now.getMonth(), 1)
  const end = to ? new Date(to + 'T23:59:59') : now
  return { start, end }
}

export async function GET(req: NextRequest) {
  try {
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

    // Total per staff
    const staffTotals = Object.entries(summary).map(([name, campaigns]) => ({
      name,
      total: Object.values(campaigns).reduce((a, b) => a + b, 0),
      campaigns,
    })).sort((a, b) => b.total - a.total)

    // Total per campaign
    const campTotals: Record<string, number> = {}
    for (const log of logs) {
      campTotals[log.campaign.name] = (campTotals[log.campaign.name] || 0) + log.formsCount
    }

    return ok({ staffTotals, campTotals, totalForms: logs.reduce((a, l) => a + l.formsCount, 0) })
  } catch (error) {
    console.error('[productivity] GET error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
