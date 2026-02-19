/**
 * GET  /api/entries   — list all entries for the 2026 pool
 * POST /api/entries   — create a new entry (enforces lock)
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const entries = await prisma.entry.findMany({
      where: { pool: { year: 2026 } },
      include: {
        picks: {
          include: {
            golfer: { select: { name: true } },
            tier: { select: { tierNumber: true, name: true } },
          },
          orderBy: { tier: { tierNumber: "asc" } },
        },
      },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json({ entries });
  } catch (error) {
    console.error("Entries GET error:", error);
    return NextResponse.json({ error: "Failed to fetch entries" }, { status: 500 });
  }
}

interface PickInput { tierId: string; golferId: string; }

interface CreateEntryBody {
  purchaserName: string;
  email: string;
  teamName: string;
  tiebreakerScore?: number;
  picks: PickInput[]; // exactly 6, one per tier
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as CreateEntryBody;
    const { purchaserName, email, teamName, tiebreakerScore, picks } = body;

    if (!purchaserName?.trim() || !email?.trim() || !teamName?.trim()) {
      return NextResponse.json(
        { error: "purchaserName, email, and teamName are required" },
        { status: 400 }
      );
    }
    if (!Array.isArray(picks) || picks.length !== 6) {
      return NextResponse.json(
        { error: "Exactly 6 picks are required (one per tier)" },
        { status: 400 }
      );
    }
    if (new Set(picks.map((p) => p.tierId)).size !== 6) {
      return NextResponse.json({ error: "Each pick must be in a different tier" }, { status: 400 });
    }
    if (new Set(picks.map((p) => p.golferId)).size !== 6) {
      return NextResponse.json({ error: "Duplicate golfer picks are not allowed" }, { status: 400 });
    }

    const pool = await prisma.pool.findUnique({ where: { year: 2026 } });
    if (!pool) {
      return NextResponse.json({ error: "Pool not found — run the seed script first" }, { status: 404 });
    }

    // Enforce lock
    if (pool.lockAtCt && new Date() > pool.lockAtCt) {
      return NextResponse.json({ error: "Submissions are closed — the pool is locked." }, { status: 403 });
    }

    const entry = await prisma.$transaction(async (tx) => {
      const newEntry = await tx.entry.create({
        data: {
          poolId: pool.id,
          purchaserName: purchaserName.trim(),
          email: email.trim().toLowerCase(),
          teamName: teamName.trim(),
          tiebreakerScore: tiebreakerScore ?? null,
          paidStatus: "PENDING",
        },
      });
      await tx.pick.createMany({
        data: picks.map((p) => ({
          entryId: newEntry.id,
          tierId: p.tierId,
          golferId: p.golferId,
        })),
      });
      return newEntry;
    });

    return NextResponse.json({ ok: true, entryId: entry.id }, { status: 201 });
  } catch (error) {
    console.error("Entry POST error:", error);
    return NextResponse.json({ error: "Failed to create entry" }, { status: 500 });
  }
}
