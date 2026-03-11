/**
 * GET /api/golfers
 * Returns golfers grouped by tier for the 2026 pool.
 * Optional ?tierId=<id> to filter to a single tier.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tierId = searchParams.get("tierId");

    const pool = await prisma.pool.findUnique({
      where: { year: 2026 },
      include: {
        tiers: {
          where: tierId ? { id: tierId } : undefined,
          orderBy: { tierNumber: "asc" },
          include: {
            tierGolfers: {
              include: {
                golfer: { select: { id: true, name: true, worldRank: true } },
              },
              orderBy: { golfer: { worldRank: "asc" } },
            },
          },
        },
      },
    });

    if (!pool) {
      return NextResponse.json({ error: "Pool not found" }, { status: 404 });
    }

    const tiers = pool.tiers.map((t) => ({
      id: t.id,
      tierNumber: t.tierNumber,
      name: t.name,
      golfers: t.tierGolfers.map((tg) => tg.golfer),
    }));

    return NextResponse.json({ tiers });
  } catch (error) {
    console.error("Golfers GET error:", error);
    return NextResponse.json({ error: "Failed to fetch golfers" }, { status: 500 });
  }
}
