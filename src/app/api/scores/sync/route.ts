/**
 * POST /api/scores/sync
 * Fetches live scores from Sportradar and persists them into live_scores.
 * Must be called from a server-side cron or protected webhook — never client-side.
 *
 * Protect with a shared secret: Authorization: Bearer <CRON_SECRET>
 */
import { NextRequest, NextResponse } from "next/server";
import { GolferStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getMastersLeaderboard } from "@/lib/sportradar";
import type { GolferScore } from "@/lib/sportradar";

export const dynamic = "force-dynamic";

const TOURNAMENT_ID = process.env.SPORTRADAR_TOURNAMENT_ID ?? "sr:tournament:masters2026";

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

function toGolferStatus(raw: GolferScore["status"]): GolferStatus {
  switch (raw) {
    case "cut":      return GolferStatus.CUT;
    case "wd":       return GolferStatus.WD;
    case "dq":       return GolferStatus.DQ;
    case "complete": return GolferStatus.COMPLETE;
    default:         return GolferStatus.ACTIVE;
  }
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const pool = await prisma.pool.findUnique({ where: { year: 2026 } });
    if (!pool) {
      return NextResponse.json({ error: "Pool not found" }, { status: 404 });
    }

    const leaderboard = await getMastersLeaderboard(TOURNAMENT_ID);
    let upserted = 0;

    for (const g of leaderboard.golfers) {
      if (!g.id) continue;

      // Ensure golfer row exists
      const golfer = await prisma.golfer.upsert({
        where: { sportradarId: g.id },
        update: { name: g.name },
        create: { name: g.name, sportradarId: g.id },
      });

      // Persist live score
      await prisma.liveScore.upsert({
        where: { golferId_poolId: { golferId: golfer.id, poolId: pool.id } },
        update: {
          round: leaderboard.round,
          totalScore: g.totalScore,
          thru: g.thru,
          status: toGolferStatus(g.status),
        },
        create: {
          golferId: golfer.id,
          poolId: pool.id,
          round: leaderboard.round,
          totalScore: g.totalScore,
          thru: g.thru,
          status: toGolferStatus(g.status),
        },
      });

      upserted++;
    }

    // Bust the leaderboard cache so the next GET recomputes
    await prisma.leaderboardCache.deleteMany({ where: { poolId: pool.id } });

    return NextResponse.json({
      ok: true,
      upserted,
      round: leaderboard.round,
      tournamentStatus: leaderboard.status,
    });
  } catch (error) {
    console.error("Score sync error:", error);
    return NextResponse.json({ error: "Score sync failed" }, { status: 500 });
  }
}
