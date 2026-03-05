// FILE 1: src/lib/shiftDay.ts
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Paste this file at:  src/lib/shiftDay.ts
// Import everywhere:   import { getShiftDayRange, toIST, shiftParams } from '@/lib/shiftDay'

const TZ = 'Asia/Kolkata'

export interface ShiftDayRange {
  startISO:  string   // ISO — 07:00 IST on shift date
  endISO:    string   // ISO — 06:59:59 IST next calendar day
  labelDate: string   // "04 Mar 2026"
  shiftKey:  string   // "2026-03-04"
}

/** Extract IST date/time parts without manual +5:30 arithmetic */
function istParts(date: Date) {
  const p = new Intl.DateTimeFormat('en-IN', {
    timeZone: TZ,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(date)
  const g = (t: string) => parseInt(p.find(x => x.type === t)!.value)
  return { y: g('year'), mo: g('month'), d: g('day'), h: g('hour') }
}

/**
 * Returns the current shift-day window.
 * Shift runs: 07:00 IST (day D)  →  06:59:59 IST (day D+1)
 * If it is 04:00 IST on 5 Mar, the shift date is still 4 Mar.
 */
export function getShiftDayRange(
  now        : Date   = new Date(),
  cutoffHour : number = 7,
  tz         : string = TZ,
): ShiftDayRange {
  const { y, mo, d, h } = istParts(now)
  const pad = (n: number, l = 2) => String(n).padStart(l, '0')

  // Before cutoff → belongs to previous calendar day's shift
  const shiftMs = Date.UTC(y, mo - 1, h < cutoffHour ? d - 1 : d)
  const sd = new Date(shiftMs)
  const sy = sd.getUTCFullYear(), sm = sd.getUTCMonth() + 1, sdd = sd.getUTCDate()

  const startISO = new Date(
    `${sy}-${pad(sm)}-${pad(sdd)}T${pad(cutoffHour)}:00:00+05:30`
  ).toISOString()

  const endISO = new Date(
    new Date(startISO).getTime() + (23 * 3600 + 59 * 60 + 59) * 1000
  ).toISOString()

  const labelDate = new Intl.DateTimeFormat('en-IN', {
    timeZone: tz, day: '2-digit', month: 'short', year: 'numeric',
  }).format(new Date(startISO))

  const shiftKey = `${sy}-${pad(sm)}-${pad(sdd)}`

  return { startISO, endISO, labelDate, shiftKey }
}

/** Format any date/ISO string as "09:15 AM" in IST */
export function toIST(d: Date | string, opts?: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: TZ,
    hour: '2-digit', minute: '2-digit', hour12: true,
    ...opts,
  }).format(new Date(d))
}

/** Ready-to-use URLSearchParams for API calls */
export function shiftParams(now?: Date): URLSearchParams {
  const r = getShiftDayRange(now)
  return new URLSearchParams({
    from:     r.startISO,
    to:       r.endISO,
    shiftKey: r.shiftKey,
    period:   'today',
  })
}


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// FILE 2: src/app/dashboard/page.tsx
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
'use client'
