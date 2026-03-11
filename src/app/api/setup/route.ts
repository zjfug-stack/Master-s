/**
 * POST /api/setup
 *
 * One-time endpoint to push the Prisma schema and seed Pool 2026 + Tiers.
 * Protected by CRON_SECRET so only you can call it.
 *
 * Usage (run once after first deploy):
 *   curl -X POST https://your-app.vercel.app/api/setup \
 *     -H "x-setup-secret: <your CRON_SECRET value>"
 */
import { NextRequest, NextResponse } from "next/server";
import { PrismaClient, PoolStatus } from "@prisma/client";
import { execSync } from "child_process";

const LOCK_AT_CT = new Date("2026-04-09T13:00:00.000Z");

const TIERS: Array<{ tierNumber: number; name: string }> = [
  { tierNumber: 1, name: "Tier 1 — Elite" },
  { tierNumber: 2, name: "Tier 2 — Contenders" },
  { tierNumber: 3, name: "Tier 3 — Solid Picks" },
  { tierNumber: 4, name: "Tier 4 — Dark Horses" },
  { tierNumber: 5, name: "Tier 5 — Value Plays" },
  { tierNumber: 6, name: "Tier 6 — Long Shots" },
];

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-setup-secret");
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const log: string[] = [];

  // Push schema
  try {
    execSync("npx prisma db push --accept-data-loss", { stdio: "pipe" });
    log.push("prisma db push: ok");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "db push failed", detail: msg }, { status: 500 });
  }

  // Seed pool + tiers
  const prisma = new PrismaClient();
  try {
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
    log.push(`pool upserted: ${pool.name} (id: ${pool.id})`);

    for (const t of TIERS) {
      await prisma.tier.upsert({
        where: { poolId_tierNumber: { poolId: pool.id, tierNumber: t.tierNumber } },
        update: { name: t.name },
        create: { poolId: pool.id, tierNumber: t.tierNumber, name: t.name },
      });
      log.push(`tier ${t.tierNumber} upserted`);
    }
  } finally {
    await prisma.$disconnect();
  }

  return NextResponse.json({ ok: true, log });
}
