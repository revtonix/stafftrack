// src/app/dashboard/page.tsx
import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Role } from '@prisma/client'
import AdminDashboard from '@/components/dashboard/AdminDashboard'
import StaffDashboard from '@/components/dashboard/StaffDashboard'

export default async function DashboardPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  if (session.role === Role.ADMIN) return <AdminDashboard session={session} />
  return <StaffDashboard session={session} />
}
