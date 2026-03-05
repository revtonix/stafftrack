# StaffTrack Pro — Complete Final Package

## 🚀 Setup Instructions (Developer)

### Step 1 — Install dependencies
```bash
npm install
# or
bun install
```

### Step 2 — Create `.env` file
```env
DATABASE_URL="postgresql://neondb_owner:YOUR_PASSWORD@YOUR_NEON_HOST/neondb?sslmode=require"
JWT_SECRET="stafftrack-secret-healthnthrive-2024"
NEXT_PUBLIC_APP_URL="https://your-domain.vercel.app"
```

### Step 3 — Run database migrations
```bash
npx prisma migrate dev --name init
# or if already have DB:
npx prisma migrate deploy
```

### Step 4 — Seed database
```bash
npm run db:seed
# or
bun run db:seed
```

### Step 5 — Deploy
```bash
git add . && git commit -m "feat: complete stafftrack pro" && git push
```
Vercel auto-deploys on push.

---

## ✅ All Features Included

| Feature | Status |
|---|---|
| **WOW Premium Dark UI** | ✅ Space dark bg + violet/cyan glows + grid lines |
| **Premium Sidebar** | ✅ Glowing logo, gradient active, live cyan dot |
| **Live Clock TopBar** | ✅ HH:MM:SS real-time, neon role badges |
| **Shift-Day 7AM IST Logic** | ✅ All pages use 7AM IST as day cutoff |
| **Attendance Approval Workflow** | ✅ Admin/TL can Approve, Adjust, Reject |
| **Pending Approvals Dashboard** | ✅ Admin sees pending count + approval table with 30s polling |
| **Live Salary Monitoring** | ✅ Admin sees live salary per staff, 10s auto-refresh |
| **Salary Privacy + Re-Auth** | ✅ TL cannot see salaries, Admin must re-enter password |
| **Staff Name/Salary Edit** | ✅ Right-side drawer slide-in edit UX |
| **Multi-Campaign per Hour** | ✅ Admin/TL can add multiple campaigns in same hour |
| **Reports: Productivity Default** | ✅ Opens on Productivity tab, Today period |
| **Reports: Live Earnings** | ✅ Shows hourly earnings per staff, auto-refresh |
| **Attendance Page Filters** | ✅ Today/Yesterday/Week/Month/Last Month/Custom |
| **Role-Based Permissions** | ✅ Admin > TL (Day/Night) > Staff |

---

## 👥 Login Credentials (after seed)

| Role | Username | Password |
|---|---|---|
| Admin | `ADMIN` | `Admin@12345` |
| Team Lead Day | `TL_DAY` | `TLDay@123` |
| Team Lead Night | `TL_NIGHT` | `TLNight@123` |
| Staff | `staff01` | `Staff@123` |

---

## 📁 New Files Added (vs base project)

```
src/lib/shiftDay.ts              — 7AM IST shift-day helper
src/lib/salaryGuard.ts           — Salary privacy guard functions
src/lib/campaign-types.ts        — Campaign TypeScript types
src/types/campaign.ts            — Campaign types (alias)
src/components/dashboard/PendingApprovals.tsx
src/components/dashboard/SalaryCell.tsx
src/components/campaigns/HourGrid.tsx
src/components/campaigns/HourRow.tsx
src/components/campaigns/CampaignReportTable.tsx
src/app/api/attendance/[id]/approve/route.ts
src/app/api/attendance/[id]/reject/route.ts
src/app/api/auth/re-auth/route.ts
src/app/api/reports/campaigns/route.ts
```

## 📋 Modified Files (vs base project)

```
prisma/schema.prisma             — Added ApprovalStatus, HourEntry, CampaignWork
src/app/globals.css              — Full WOW dark design system
tailwind.config.js               — Syne + DM Mono fonts, violet brand
src/app/layout.tsx               — Google Fonts import
src/app/dashboard/layout.tsx     — Dark background
src/components/layout/Sidebar.tsx — Premium WOW sidebar
src/components/layout/TopBar.tsx  — Live clock + neon badges
src/components/dashboard/AdminDashboard.tsx — Live salary + approvals
src/app/dashboard/attendance/page.tsx — Full filters + approval
src/app/dashboard/reports/page.tsx    — Productivity default + live
src/app/dashboard/admin/page.tsx      — Drawer edit UX
src/app/api/attendance/route.ts       — Approval status support
src/app/api/campaigns/route.ts        — Campaign CRUD
src/app/api/reports/payroll/route.ts  — Partial hours salary
src/app/api/staff/route.ts            — Salary guard
```
