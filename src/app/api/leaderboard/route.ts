/**
 * GET /api/leaderboard
 * Returns the pool leaderboard. Serves from LeaderboardCache when fresh;
 * falls back to a live DB aggregation when stale.
 * All Sportradar data is pre-synced via POST /api/scores/sync — never fetched here.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

interface LeaderboardEntry {
  rank: number;
  entryId: string;
  entrantName: string;
  entrantEmail: string;
  picks: Array<{ tierNumber: number; golferName: string; score: number | null; status: string }>;
  totalScore: number | null;
  tiebreaker: number | null;
}

async function buildLeaderboard(poolId: string): Promise<LeaderboardEntry[]> {
  const entries = await prisma.entry.findMany({
    where: { poolId },
    include: {
      picks: {
        include: {
          golfer: { select: { id: true, name: true } },
          tier: { select: { tierNumber: true } },
        },
        orderBy: { tier: { tierNumber: "asc" } },
      },
    },
  });

  const liveScores = await prisma.liveScore.findMany({
    where: { poolId },
    select: { golferId: true, totalScore: true, status: true },
  });

  const scoreMap = new Map(liveScores.map((s) => [s.golferId, s]));

  const rows = entries.map((entry) => {
    const picks = entry.picks.map((p) => {
      const ls = scoreMap.get(p.golferId);
      return {
        tierNumber: p.tier.tierNumber,
        golferName: p.golfer.name,
        score: ls?.totalScore ?? null,
        status: ls?.status ?? "ACTIVE",
      };
    });

    const validScores = picks
      .map((p) => p.score)
      .filter((s): s is number => s !== null);

    const totalScore = validScores.length > 0
      ? validScores.reduce((sum, s) => sum + s, 0)
      : null;

    return {
      rank: 0,
      entryId: entry.id,
      entrantName: entry.entrantName,
      entrantEmail: entry.entrantEmail,
      picks,
      totalScore,
      tiebreaker: entry.tiebreaker,
    };
  });

  rows.sort((a, b) => {
    if (a.totalScore === null && b.totalScore === null) return 0;
    if (a.totalScore === null) return 1;
    if (b.totalScore === null) return -1;
    return a.totalScore - b.totalScore;
  });

  rows.forEach((r, i) => { r.rank = i + 1; });
  return rows;
}

export async function GET() {
  try {
    const pool = await prisma.pool.findUnique({ where: { year: 2026 } });
    if (!pool) {
      return NextResponse.json({ error: "Pool not found" }, { status: 404 });
    }

    // Serve from fresh cache if available
    const cache = await prisma.leaderboardCache.findUnique({
      where: { poolId: pool.id },
    });

    if (cache && cache.expiresAt > new Date()) {
      return NextResponse.json({
        entries: cache.data,
        fromCache: true,
        cachedAt: cache.fetchedAt,
      });
    }

    // Build and persist a fresh leaderboard (60-second TTL)
    const entries = await buildLeaderboard(pool.id);
    const expiresAt = new Date(Date.now() + 60_000);
    const jsonData = JSON.parse(JSON.stringify(entries)) as Prisma.InputJsonValue;

    await prisma.leaderboardCache.upsert({
      where: { poolId: pool.id },
      update: { data: jsonData, fetchedAt: new Date(), expiresAt },
      create: { poolId: pool.id, data: jsonData, expiresAt },
    });

    return NextResponse.json({ entries, fromCache: false });
  } catch (error) {
    console.error("Leaderboard API error:", error);
    return NextResponse.json({ error: "Failed to fetch leaderboard" }, { status: 500 });
  }
}
