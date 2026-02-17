import { PrismaClient } from '@prisma/client';
import { zonedTimeToUtc } from 'date-fns-tz';

const prisma = new PrismaClient();

async function main() {
  const lockAtCt = zonedTimeToUtc('2026-04-08T19:00:00', 'America/Chicago');

  const pool = await prisma.pool.upsert({
    where: { year: 2026 },
    update: {},
    create: {
      year: 2026,
      name: 'Masters Pool 2026',
      lockAtCt,
      entryFeeCents: 5000,
      venmoHandle: '@masters-pool'
    }
  });

  for (let tierNum = 1; tierNum <= 6; tierNum += 1) {
    await prisma.tier.upsert({
      where: { poolId_tierNum: { poolId: pool.id, tierNum } },
      update: {},
      create: { poolId: pool.id, tierNum, label: `Tier ${tierNum}` }
    });
  }
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
