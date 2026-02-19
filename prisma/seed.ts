/**
 * prisma/seed.ts
 * Run with: npx prisma db seed
 * Creates the 2026 pool and tiers 1–6.
 */
import { PrismaClient, PoolStatus } from "@prisma/client";

const prisma = new PrismaClient();

const TIERS: Array<{ tierNumber: number; name: string }> = [
  { tierNumber: 1, name: "Tier 1 — Elite" },
  { tierNumber: 2, name: "Tier 2 — Contenders" },
  { tierNumber: 3, name: "Tier 3 — Solid Picks" },
  { tierNumber: 4, name: "Tier 4 — Dark Horses" },
  { tierNumber: 5, name: "Tier 5 — Value Plays" },
  { tierNumber: 6, name: "Tier 6 — Long Shots" },
];

async function main() {
  console.log("🌱 Seeding Masters Pool 2026…");

  // Upsert the pool so the seed is idempotent
  const pool = await prisma.pool.upsert({
    where: { year: 2026 },
    update: {
      name: "Masters Pool 2026",
      status: PoolStatus.OPEN,
    },
    create: {
      year: 2026,
      name: "Masters Pool 2026",
      status: PoolStatus.OPEN,
    },
  });

  console.log(`  ✓ Pool: ${pool.name} (id: ${pool.id})`);

  // Upsert all 6 tiers
  for (const tierDef of TIERS) {
    const tier = await prisma.tier.upsert({
      where: {
        poolId_tierNumber: {
          poolId: pool.id,
          tierNumber: tierDef.tierNumber,
        },
      },
      update: { name: tierDef.name },
      create: {
        poolId: pool.id,
        tierNumber: tierDef.tierNumber,
        name: tierDef.name,
      },
    });
    console.log(`  ✓ Tier ${tier.tierNumber}: ${tier.name}`);
  }

  console.log("✅ Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
