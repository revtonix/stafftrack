// src/app/dashboard/layout.tsx
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import Sidebar from '@/components/layout/Sidebar'
import TopBar from '@/components/layout/TopBar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session) redirect('/login')

  return (
    <div className="flex h-screen bg-slate-950 overflow-hidden glow-bg">
      {/* Extra center glow orb */}
      <div className="fixed top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full pointer-events-none z-0" style={{ background: 'radial-gradient(circle, rgba(99, 102, 241, 0.08), transparent 70%)', filter: 'blur(60px)' }} />
      <Sidebar role={session.role} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative z-10">
        <TopBar username={session.username} role={session.role} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 grid-pattern">
          <div className="max-w-7xl mx-auto animate-fade-in">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
