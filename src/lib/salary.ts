// src/lib/salary.ts

export function calculateSalary(monthlySalary: number, presentDays: number) {
  const REQUIRED_DAYS = 26
  const BASE_DAYS = 30

  if (presentDays <= REQUIRED_DAYS) {
    return {
      baseSalary: monthlySalary,
      extraDays: 0,
      extraPay: 0,
      totalSalary: monthlySalary,
      presentDays,
    }
  }

  const extraDays = presentDays - REQUIRED_DAYS
  const dailyRate = monthlySalary / BASE_DAYS
  const extraPay = extraDays * dailyRate

  return {
    baseSalary: monthlySalary,
    extraDays,
    extraPay: Math.round(extraPay),
    totalSalary: Math.round(monthlySalary + extraPay),
    presentDays,
  }
}

export function getMonthRange(year: number, month: number) {
  const start = new Date(year, month - 1, 1)
  const end = new Date(year, month, 0, 23, 59, 59)
  return { start, end }
}

export function getTodayDate(): Date {
  // Use shift-day logic: before 7 AM IST = previous day
  const { getShiftDate } = require('@/lib/shiftDay')
  return getShiftDate()
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function formatTime(date: Date | string | null): string {
  if (!date) return '—'
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' })
}

export function getAttendanceHours(checkIn: Date | null, checkOut: Date | null): number {
  if (!checkIn || !checkOut) return 0
  return Math.round(((checkOut.getTime() - checkIn.getTime()) / 3600000) * 100) / 100
}
