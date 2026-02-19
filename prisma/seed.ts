/**
 * prisma/seed.ts
 * Run with: npm run db:seed
 * Creates the 2026 pool (with lock time + payment config) and tiers 1–6.
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

// Lock at 8:00 AM CT on Thursday April 9 2026 (first tee time).
// Stored as UTC: CT is UTC-5 in April (CDT), so 8 AM CDT = 13:00 UTC.
const LOCK_AT_CT = new Date("2026-04-09T13:00:00.000Z");

async function main() {
  console.log("🌱 Seeding Masters Pool 2026…");

  const pool = await prisma.pool.upsert({
    where: { year: 2026 },
    update: {
      name: "Masters Pool 2026",
      status: PoolStatus.OPEN,
      lockAtCt: LOCK_AT_CT,
      venmoHandle: process.env.VENMO_HANDLE ?? "MastersPool2026",
      entryFeeUsd: Number(process.env.ENTRY_FEE_USD ?? 20),
    },
    create: {
      year: 2026,
      name: "Masters Pool 2026",
      status: PoolStatus.OPEN,
      lockAtCt: LOCK_AT_CT,
      venmoHandle: process.env.VENMO_HANDLE ?? "MastersPool2026",
      entryFeeUsd: Number(process.env.ENTRY_FEE_USD ?? 20),
    },
  });

  console.log(`  ✓ Pool: ${pool.name} (id: ${pool.id})`);
  console.log(`  ✓ Lock: ${LOCK_AT_CT.toLocaleString("en-US", { timeZone: "America/Chicago" })} CT`);
  console.log(`  ✓ Venmo: @${pool.venmoHandle}  Fee: $${pool.entryFeeUsd}`);

  for (const tierDef of TIERS) {
    const tier = await prisma.tier.upsert({
      where: { poolId_tierNumber: { poolId: pool.id, tierNumber: tierDef.tierNumber } },
      update: { name: tierDef.name },
      create: { poolId: pool.id, tierNumber: tierDef.tierNumber, name: tierDef.name },
    });
    console.log(`  ✓ Tier ${tier.tierNumber}: ${tier.name}`);
  }

  console.log("✅ Seed complete.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
