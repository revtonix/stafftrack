import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Helper: date-only (midnight UTC) for the attendance date field
function dateOnly(y: number, m: number, d: number): Date {
  return new Date(Date.UTC(y, m - 1, d));
}

// Helper: specific UTC datetime
function utc(y: number, m: number, d: number, h: number, min: number): Date {
  return new Date(Date.UTC(y, m - 1, d, h, min));
}

type Record = { date: Date; checkIn: Date; checkOut: Date };

// All attendance data keyed by lowercase username
const data: { [username: string]: Record[] } = {
  piyush: [
    { date: dateOnly(2026,3,1), checkIn: utc(2026,3,1,13,30), checkOut: utc(2026,3,1,23,30) },
    { date: dateOnly(2026,3,2), checkIn: utc(2026,3,2,13,30), checkOut: utc(2026,3,3,0,30) },
    { date: dateOnly(2026,3,3), checkIn: utc(2026,3,3,13,30), checkOut: utc(2026,3,4,0,30) },
    { date: dateOnly(2026,3,4), checkIn: utc(2026,3,4,13,30), checkOut: utc(2026,3,5,0,30) },
    { date: dateOnly(2026,3,5), checkIn: utc(2026,3,5,13,30), checkOut: utc(2026,3,6,1,30) },
  ],
  kartik: [
    // Mar 1 skipped (absent)
    { date: dateOnly(2026,3,2), checkIn: utc(2026,3,2,13,30), checkOut: utc(2026,3,3,0,30) },
    { date: dateOnly(2026,3,3), checkIn: utc(2026,3,3,13,30), checkOut: utc(2026,3,3,23,30) },
    { date: dateOnly(2026,3,4), checkIn: utc(2026,3,4,13,30), checkOut: utc(2026,3,5,0,30) },
    { date: dateOnly(2026,3,5), checkIn: utc(2026,3,5,13,30), checkOut: utc(2026,3,6,1,30) },
  ],
  shashank: [
    { date: dateOnly(2026,3,1), checkIn: utc(2026,3,1,13,30), checkOut: utc(2026,3,1,23,30) },
    { date: dateOnly(2026,3,2), checkIn: utc(2026,3,2,13,30), checkOut: utc(2026,3,3,0,30) },
    { date: dateOnly(2026,3,3), checkIn: utc(2026,3,3,13,30), checkOut: utc(2026,3,4,0,30) },
    { date: dateOnly(2026,3,4), checkIn: utc(2026,3,4,13,30), checkOut: utc(2026,3,5,1,30) },
    { date: dateOnly(2026,3,5), checkIn: utc(2026,3,5,13,30), checkOut: utc(2026,3,6,1,30) },
  ],
  ritesh: [
    { date: dateOnly(2026,3,1), checkIn: utc(2026,3,1,13,30), checkOut: utc(2026,3,2,1,30) },
    { date: dateOnly(2026,3,2), checkIn: utc(2026,3,2,13,30), checkOut: utc(2026,3,3,0,30) },
    { date: dateOnly(2026,3,3), checkIn: utc(2026,3,3,13,30), checkOut: utc(2026,3,3,22,30) },
    { date: dateOnly(2026,3,4), checkIn: utc(2026,3,4,13,30), checkOut: utc(2026,3,5,0,30) },
    { date: dateOnly(2026,3,5), checkIn: utc(2026,3,5,13,30), checkOut: utc(2026,3,6,0,30) },
  ],
  lalu: [
    { date: dateOnly(2026,3,1), checkIn: utc(2026,3,1,13,30), checkOut: utc(2026,3,1,23,30) },
    { date: dateOnly(2026,3,2), checkIn: utc(2026,3,2,13,30), checkOut: utc(2026,3,3,0,30) },
    { date: dateOnly(2026,3,3), checkIn: utc(2026,3,3,13,30), checkOut: utc(2026,3,3,23,30) },
    { date: dateOnly(2026,3,4), checkIn: utc(2026,3,4,13,30), checkOut: utc(2026,3,4,23,30) },
    { date: dateOnly(2026,3,5), checkIn: utc(2026,3,5,13,30), checkOut: utc(2026,3,6,0,30) },
  ],
  deepak: [
    { date: dateOnly(2026,3,1), checkIn: utc(2026,3,1,13,30), checkOut: utc(2026,3,1,23,30) },
    { date: dateOnly(2026,3,2), checkIn: utc(2026,3,2,13,30), checkOut: utc(2026,3,3,0,30) },
    { date: dateOnly(2026,3,3), checkIn: utc(2026,3,3,13,30), checkOut: utc(2026,3,4,0,30) },
    { date: dateOnly(2026,3,4), checkIn: utc(2026,3,4,13,30), checkOut: utc(2026,3,5,1,30) },
    { date: dateOnly(2026,3,5), checkIn: utc(2026,3,5,13,30), checkOut: utc(2026,3,6,1,30) },
  ],
  abhay: [
    { date: dateOnly(2026,3,1), checkIn: utc(2026,3,1,13,30), checkOut: utc(2026,3,2,0,30) },
    { date: dateOnly(2026,3,2), checkIn: utc(2026,3,2,13,30), checkOut: utc(2026,3,3,1,30) },
    { date: dateOnly(2026,3,3), checkIn: utc(2026,3,3,13,30), checkOut: utc(2026,3,4,0,30) },
    { date: dateOnly(2026,3,4), checkIn: utc(2026,3,4,13,30), checkOut: utc(2026,3,4,23,30) },
    { date: dateOnly(2026,3,5), checkIn: utc(2026,3,5,13,30), checkOut: utc(2026,3,6,1,30) },
  ],
};

async function main() {
  const usernames = Object.keys(data);

  // 1. Look up users by case-insensitive username
  const users = await prisma.user.findMany({
    where: { usernameLower: { in: usernames } },
    select: { id: true, username: true, usernameLower: true },
  });

  console.log(`Found ${users.length} / ${usernames.length} users:`);
  users.forEach(u => console.log(`  ${u.username} (${u.id})`));

  const missing = usernames.filter(n => !users.find(u => u.usernameLower === n));
  if (missing.length) {
    console.error(`\nMISSING users: ${missing.join(', ')} — aborting.`);
    process.exit(1);
  }

  // 2. Upsert attendance records
  const counts: { [name: string]: number } = {};

  for (const user of users) {
    const records = data[user.usernameLower];
    counts[user.username] = 0;

    for (const rec of records) {
      await prisma.attendance.upsert({
        where: {
          staffId_date: { staffId: user.id, date: rec.date },
        },
        update: {
          checkIn: rec.checkIn,
          checkOut: rec.checkOut,
        },
        create: {
          staffId: user.id,
          date: rec.date,
          checkIn: rec.checkIn,
          checkOut: rec.checkOut,
        },
      });
      counts[user.username]++;
    }
  }

  // 3. Summary
  console.log('\n=== Upserted attendance records ===');
  let total = 0;
  for (const [name, count] of Object.entries(counts)) {
    console.log(`  ${name}: ${count} records`);
    total += count;
  }
  console.log(`  TOTAL: ${total} records`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
