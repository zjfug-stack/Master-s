/**
 * GET  /api/entries        — list all entries for the 2026 pool
 * POST /api/entries        — create a new entry with tier picks
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

interface PickInput {
  tierId: string;
  golferId: string;
}

interface CreateEntryBody {
  entrantName: string;
  entrantEmail: string;
  tiebreaker?: number;
  // One pick per tier: [{tierId, golferId}, …] — must be exactly 6 (one per tier)
  picks: PickInput[];
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as CreateEntryBody;
    const { entrantName, entrantEmail, picks, tiebreaker } = body;

    if (!entrantName || !entrantEmail) {
      return NextResponse.json({ error: "entrantName and entrantEmail are required" }, { status: 400 });
    }
    if (!Array.isArray(picks) || picks.length !== 6) {
      return NextResponse.json({ error: "Exactly 6 picks are required (one per tier)" }, { status: 400 });
    }

    const tierIds = picks.map((p) => p.tierId);
    const golferIds = picks.map((p) => p.golferId);

    if (new Set(tierIds).size !== 6) {
      return NextResponse.json({ error: "Each pick must be in a different tier" }, { status: 400 });
    }
    if (new Set(golferIds).size !== 6) {
      return NextResponse.json({ error: "Duplicate golfer picks are not allowed" }, { status: 400 });
    }

    // Verify the pool exists
    const pool = await prisma.pool.findUnique({ where: { year: 2026 } });
    if (!pool) {
      return NextResponse.json({ error: "Pool not found — run the seed script first" }, { status: 404 });
    }

    const entry = await prisma.$transaction(async (tx) => {
      const newEntry = await tx.entry.create({
        data: {
          poolId: pool.id,
          entrantName,
          entrantEmail,
          tiebreaker: tiebreaker ?? null,
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
