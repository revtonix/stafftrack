// src/lib/api.ts
import { NextResponse } from 'next/server'
import { z } from 'zod'

export function ok<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status })
}

export function err(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status })
}

export function unauthorized() {
  return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
}

export function forbidden() {
  return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
}

// ---- ZOD SCHEMAS ----

export const LoginSchema = z.object({
  username: z.string().min(1).max(50),
  password: z.string().min(1),
})

export const CreateStaffSchema = z.object({
  username: z.string().min(2).max(50),
  password: z.string().min(6),
  role: z.enum(['STAFF', 'TEAM_LEAD_DAY', 'TEAM_LEAD_NIGHT']),
  team: z.enum(['DAY', 'NIGHT']),
  monthlySalary: z.number().min(0),
})

export const UpdateStaffSchema = z.object({
  monthlySalary: z.number().min(0).optional(),
  team: z.enum(['DAY', 'NIGHT']).optional(),
  isActive: z.boolean().optional(),
  password: z.string().min(6).optional(),
})

export const WorkLogSchema = z.object({
  campaignId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  hourIndex: z.number().int().min(1).max(12),
  formsCount: z.number().int().min(0),
  note: z.string().max(200).optional(),
})

export const LeaveSchema = z.object({
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  type: z.enum(['PAID', 'UNPAID']),
  reason: z.string().min(5).max(500),
})

export const UpdateLeaveSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
})

export const CampaignSchema = z.object({
  name: z.string().min(1).max(100),
  team: z.enum(['DAY', 'NIGHT']),
})

export const UpdateCampaignSchema = z.object({
  name: z.string().min(1).max(100),
})

export const DateRangeSchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{4}-\d{2}$/).optional(),
  preset: z.enum(['today', '7days', '30days', 'thisMonth', '6months']).optional(),
})
