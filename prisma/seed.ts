// prisma/seed.ts
import { PrismaClient, Role, Team } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Helper
  const hash = (pw: string) => bcrypt.hashSync(pw, 12)

  // ---- ADMIN ----
  const admin = await prisma.user.upsert({
    where: { usernameLower: 'admin' },
    update: {},
    create: {
      username: 'ADMIN',
      usernameLower: 'admin',
      passwordHash: hash('Admin@12345'),
      role: Role.ADMIN,
    },
  })
  console.log('✅ Admin created')

  // ---- TEAM LEADS ----
  const tlDay = await prisma.user.upsert({
    where: { usernameLower: 'tl_day' },
    update: {},
    create: {
      username: 'TL_DAY',
      usernameLower: 'tl_day',
      passwordHash: hash('TLDay@123'),
      role: Role.TEAM_LEAD_DAY,
      profile: { create: { team: Team.DAY, monthlySalary: 15000 } },
    },
  })

  const tlNight = await prisma.user.upsert({
    where: { usernameLower: 'tl_night' },
    update: {},
    create: {
      username: 'TL_NIGHT',
      usernameLower: 'tl_night',
      passwordHash: hash('TLNight@123'),
      role: Role.TEAM_LEAD_NIGHT,
      profile: { create: { team: Team.NIGHT, monthlySalary: 15000 } },
    },
  })
  console.log('✅ Team Leads created')

  // ---- STAFF ----
  const staffData: { username: string; team: Team; salary: number }[] = [
    { username: 'RITESH',    team: Team.DAY,   salary: 12000 },
    { username: 'SHASHANK',  team: Team.DAY,   salary: 11000 },
    { username: 'CHEEKU',    team: Team.DAY,   salary: 10000 },
    { username: 'VANSH',     team: Team.DAY,   salary: 10000 },
    { username: 'LALU',      team: Team.DAY,   salary: 10000 },
    { username: 'DEEPAK',    team: Team.NIGHT, salary: 11000 },
    { username: 'ABHAY',     team: Team.NIGHT, salary: 10000 },
    { username: 'SHIVA',     team: Team.NIGHT, salary: 10000 },
    { username: 'PIYUSH',    team: Team.NIGHT, salary: 10000 },
    { username: 'KARTIK',    team: Team.DAY,   salary: 10000 },
    { username: 'Alok Paul', team: Team.DAY,   salary: 10000 },
    { username: 'ASHWANI',   team: Team.NIGHT, salary: 10000 },
    { username: 'ADARSH',    team: Team.NIGHT, salary: 10000 },
    { username: 'ADITYA',    team: Team.DAY,   salary: 10000 },
    { username: 'ABHILASH',  team: Team.NIGHT, salary: 10000 },
    { username: 'AYUSH',     team: Team.DAY,   salary: 10000 },
    { username: 'ANSHU',     team: Team.NIGHT, salary: 10000 },
    { username: 'Aman',      team: Team.DAY,   salary: 10000 },
    { username: 'Granth',    team: Team.NIGHT, salary: 10000 },
    { username: 'New1',      team: Team.DAY,   salary: 10000 },
  ]

  for (const s of staffData) {
    await prisma.user.upsert({
      where: { usernameLower: s.username.toLowerCase() },
      update: {},
      create: {
        username: s.username,
        usernameLower: s.username.toLowerCase(),
        passwordHash: hash('Staff@123'),
        role: Role.STAFF,
        profile: { create: { team: s.team, monthlySalary: s.salary } },
      },
    })
  }
  console.log('✅ Staff created (default password: Staff@123)')

  // ---- CAMPAIGNS ----
  const dayCampaigns = [
    'MyLendingWallet', 'Money Lender', 'UnitedEmergency', 'BestMoney Auto',
    'AX Auto', 'Solution Auto', 'Road Auto', 'RedArrow', 'GoAutoFree', 'HeartLoan',
  ]
  const nightCampaigns = [
    'LEND RACER', 'Cash Out Equity', 'MM Friend', 'Brighter Loans',
    'WiseDrive', 'Loan Direct', 'Heart Direct', 'Cash Auto', 'Free Quote', 'Night Deal',
  ]

  for (const name of dayCampaigns) {
    await prisma.campaign.upsert({
      where: { id: `day-${name.toLowerCase().replace(/\s/g,'-')}` },
      update: {},
      create: { id: `day-${name.toLowerCase().replace(/\s/g,'-')}`, name, team: Team.DAY },
    })
  }
  for (const name of nightCampaigns) {
    await prisma.campaign.upsert({
      where: { id: `night-${name.toLowerCase().replace(/\s/g,'-')}` },
      update: {},
      create: { id: `night-${name.toLowerCase().replace(/\s/g,'-')}`, name, team: Team.NIGHT },
    })
  }
  console.log('✅ Campaigns created')
  console.log('🎉 Seed complete!')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
