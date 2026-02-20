/**
 * GET /api/leaderboard?year=2026
 *
 * Returns:
 *   {
 *     server_time_iso: string,
 *     last_updated_iso: string | null,
 *     entries: LeaderboardRow[]
 *   }
 *
 * Serves the pre-computed leaderboard_cache. When no cache exists (pre-tournament),
 * falls back to building a list from DB entries with null scores.
 * last_updated_iso is null in the fallback case.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const yearParam = req.nextUrl.searchParams.get("year");
  const year = yearParam ? parseInt(yearParam, 10) : 2026;

  try {
    const pool = await prisma.pool.findUnique({ where: { year } });
    if (!pool) {
      return NextResponse.json({ error: "Pool not found" }, { status: 404 });
    }

    const serverTimeIso = new Date().toISOString();

    // Try to serve from cache
    const cache = await prisma.leaderboardCache.findUnique({
      where: { poolId: pool.id },
    });

    if (cache) {
      return NextResponse.json({
        server_time_iso: serverTimeIso,
        last_updated_iso: cache.updatedAt.toISOString(),
        entries: cache.data,
      });
    }

    // No cache yet — build a pre-tournament list (null scores) from DB
    const entries = await prisma.entry.findMany({
      where: { poolId: pool.id },
      include: {
        picks: {
          include: {
            golfer: { select: { name: true } },
            tier: { select: { tierNumber: true } },
          },
          orderBy: { tier: { tierNumber: "asc" } },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    const rows = entries.map((entry, i) => ({
      rank: i + 1,
      entryId: entry.id,
      teamName: entry.teamName,
      purchaserName: entry.purchaserName,
      totalScore: null,
      tiebreakerScore: entry.tiebreakerScore,
      paidStatus: entry.paidStatus,
      isDead: entry.isDead,
      createdAt: entry.createdAt.toISOString(),
      picks: entry.picks.map((p) => ({
        tierNumber: p.tier.tierNumber,
        golferName: p.golfer.name,
        score: null,
        roundScores: [null, null, null, null],
        status: "ACTIVE",
        thru: null,
      })),
    }));

    return NextResponse.json({
      server_time_iso: serverTimeIso,
      last_updated_iso: null,
      entries: rows,
    });
  } catch (error) {
    console.error("Leaderboard GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch leaderboard" },
      { status: 500 }
    );
  }
}
