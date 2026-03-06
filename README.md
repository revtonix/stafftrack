# StaffTrack Pro

Production-ready Staff Attendance + Campaign Productivity + Payroll Management System

## Tech Stack

- **Frontend**: Next.js 14 App Router + TypeScript + Tailwind CSS
- **Backend**: Next.js API Route Handlers
- **Database**: PostgreSQL + Prisma ORM
- **Auth**: JWT (httpOnly cookies) + bcrypt
- **Validation**: Zod

---

## Quick Start

### 1. Prerequisites

- Node.js 18+
- PostgreSQL database running locally or remote

### 2. Setup

```bash
# Clone / extract the project
cd stafftrack-pro

# Install dependencies
npm install

# Copy env file
cp .env.example .env
```

### 3. Configure .env

```env
DATABASE_URL="postgresql://YOUR_USER:YOUR_PASSWORD@localhost:5432/stafftrack"
JWT_SECRET="your-super-secret-jwt-key-min-32-characters-here"
```

### 4. Database Setup

```bash
# Run migrations
npx prisma migrate dev --name init

# Seed default data (staff accounts, campaigns)
npm run db:seed
```

### 5. Run

```bash
npm run dev
# Open http://localhost:3000
```

---

## Default Login Credentials

| Role | Username | Password |
|------|----------|----------|
| Admin | ADMIN | Admin@12345 |
| Team Lead Day | TL_DAY | TLDay@123 |
| Team Lead Night | TL_NIGHT | TLNight@123 |
| All Staff | (any username) | Staff@123 |

### Staff Usernames
RITESH, SHASHANK, CHEEKU, VANSH, LALU, DEEPAK, ABHAY, SHIVA, PIYUSH, KARTIK, Alok Paul, ASHWANI, ADARSH, ADITYA, ABHILASH, AYUSH, ANSHU, Aman, Granth, New1

---

## Features

### Staff
- ✅ Check In / Check Out with live clock
- ✅ 12-hour productivity grid (campaign + forms per hour)
- ✅ Monthly salary summary with breakdown
- ✅ Attendance history
- ✅ Apply leaves (Paid / Unpaid)

### Team Leads
- ✅ Rename campaigns for their team
- ✅ View team productivity summary

### Admin
- ✅ Full staff management (create, edit, salary, team, reset password)
- ✅ Payroll reports with CSV export
- ✅ Productivity reports with CSV export
- ✅ Report filters: Today, 7 days, 30 days, This Month, 6 Months, Custom Range
- ✅ Leave approval / rejection
- ✅ Campaign management

---

## Role Access Control

| Feature | Staff | Team Lead | Admin |
|---------|-------|-----------|-------|
| Check In/Out | ✅ | ✅ | ✅ |
| Update Productivity | ✅ | — | — |
| View Own Salary | ✅ | — | — |
| Apply Leave | ✅ | — | — |
| Rename Campaigns | — | ✅ (own team) | ✅ |
| View Payroll Reports | — | — | ✅ |
| Export CSV | — | — | ✅ |
| Create Staff | — | — | ✅ |
| Approve Leaves | — | — | ✅ |

---

## Salary Calculation

- Monthly salary for **26 working days**
- Extra days pay: `(monthlySalary / 30) × extraDays`
- Example: ₹10,000/month × 28 days = ₹10,000 + ₹666 = ₹10,666

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/login | Login |
| POST | /api/auth/logout | Logout |
| GET | /api/auth/me | Current user |
| GET/POST/PATCH | /api/attendance | Check in/out |
| GET/POST | /api/worklogs | Hourly productivity |
| GET/POST | /api/campaigns | Campaigns list |
| PATCH/DELETE | /api/campaigns/[id] | Update campaign |
| GET/POST | /api/leaves | Leave requests |
| PATCH | /api/leaves/[id] | Approve/reject leave |
| GET/POST | /api/staff | Staff list/create |
| GET/PATCH | /api/staff/[id] | Staff detail/update |
| GET | /api/reports/payroll | Payroll report + CSV |
| GET | /api/reports/productivity | Productivity report + CSV |
| GET | /api/reports/salary | Individual salary summary |
