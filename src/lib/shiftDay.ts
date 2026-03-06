// src/lib/shiftDay.ts
// Shift-day logic: working day runs 7:00 AM IST → 7:00 AM IST (next day)
// Morning Shift: 7 AM – 7 PM | Night Shift: 7 PM – 7 AM

const TZ = 'Asia/Kolkata'
const CUTOFF_HOUR = 7 // 7:00 AM IST

/** Get IST date parts from a JS Date */
function istParts(date: Date = new Date()) {
  const p = new Intl.DateTimeFormat('en-IN', {
    timeZone: TZ,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }).formatToParts(date)
  const g = (t: string) => parseInt(p.find(x => x.type === t)!.value)
  return { y: g('year'), mo: g('month'), d: g('day'), h: g('hour'), m: g('minute'), s: g('second') }
}

/** Get current IST hour (0-23) */
export function getISTHour(date: Date = new Date()): number {
  return istParts(date).h
}

/**
 * Get the "shift date" for a given timestamp.
 * If IST hour is between 0:00–6:59, the shift date is PREVIOUS calendar day.
 * If IST hour is 7:00–23:59, the shift date is the SAME calendar day.
 *
 * Examples:
 *   June 4 at 8:00 AM IST → shift date = June 4
 *   June 5 at 2:00 AM IST → shift date = June 4
 *   June 5 at 6:30 AM IST → shift date = June 4
 *   June 5 at 7:00 AM IST → shift date = June 5
 */
export function getShiftDate(date: Date = new Date()): Date {
  const { y, mo, d, h } = istParts(date)
  if (h < CUTOFF_HOUR) {
    // Before 7 AM → belongs to previous day's shift
    const prev = new Date(Date.UTC(y, mo - 1, d - 1))
    return new Date(prev.getUTCFullYear(), prev.getUTCMonth(), prev.getUTCDate())
  }
  return new Date(y, mo - 1, d)
}

/** Get shift date as YYYY-MM-DD string */
export function getShiftDateStr(date: Date = new Date()): string {
  const sd = getShiftDate(date)
  const y = sd.getFullYear()
  const m = String(sd.getMonth() + 1).padStart(2, '0')
  const d = String(sd.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Get the shift-day window (start and end as ISO strings) for a given shift date */
export function getShiftDayRange(shiftDate?: Date): { start: Date; end: Date } {
  const sd = shiftDate || getShiftDate()
  const y = sd.getFullYear()
  const m = sd.getMonth()
  const d = sd.getDate()
  // Shift starts at 7:00 AM IST on the shift date
  const start = new Date(`${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}T07:00:00+05:30`)
  // Shift ends at 6:59:59 AM IST next day
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1000) // +23:59:59
  return { start, end }
}

/**
 * Get current shift type based on IST hour.
 * Morning Shift: 7 AM – 7 PM (hours 7-18)
 * Night Shift: 7 PM – 7 AM (hours 19-6)
 */
export function getCurrentShift(date: Date = new Date()): 'MORNING' | 'NIGHT' {
  const h = getISTHour(date)
  return (h >= 7 && h < 19) ? 'MORNING' : 'NIGHT'
}

/** Get shift label for display */
export function getShiftLabel(date: Date = new Date()): string {
  const shift = getCurrentShift(date)
  return shift === 'MORNING' ? 'Morning Shift (7AM – 7PM)' : 'Night Shift (7PM – 7AM)'
}

/** Format time in IST */
export function formatIST(date: Date | string, opts?: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: TZ,
    hour: '2-digit', minute: '2-digit', hour12: true,
    ...opts,
  }).format(new Date(date))
}

/** Get IST time string (HH:MM:SS) */
export function getISTTimeString(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: TZ,
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }).format(date)
}

/** Get IST date string (e.g., "Fri, 6 Mar") */
export function getISTDateLabel(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: TZ,
    weekday: 'short', day: 'numeric', month: 'short',
  }).format(date)
}

/** Get IST full date string (e.g., "Friday, 6 March 2026") */
export function getISTFullDate(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: TZ,
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  }).format(date)
}
