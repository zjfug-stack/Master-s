/**
 * POST /api/cron/ingest
 * Protected by x-cron-secret header.
 *
 * 1. Fetches summary + leaderboard from Sportradar.
 * 2. Upserts golfers + live_scores.
 * 3. Recomputes leaderboard_cache transactionally.
 *
 * If the provider call fails, returns 200 { message: "provider_failed" }
 * and does NOT overwrite the existing leaderboard_cache.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import type { PlayerResult } from "@/providers/sportradar";

export const dynamic = "force-dynamic";

// ─── Auth ─────────────────────────────────────────────────────────────────────

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return req.headers.get("x-cron-secret") === secret;
}

// ─── Scoring helpers ──────────────────────────────────────────────────────────

/**
 * Returns the adjusted score (to-par integer) for a golfer given their result
 * and the pool's cut round.
 *
 * - CUT: frozen at their score through the cut round
 * - WD/DQ: to_par + 10 × missed rounds
 * - ACTIVE/COMPLETE: raw to_par
 */
function adjustedScore(player: PlayerResult, cutRound: number): number {
  if (player.status === "CUT") {
    const freeze = cutRound;
    const hasData = player.roundToPar.slice(0, freeze).some((r) => r !== null);
    if (hasData) {
      let s = 0;
      for (let i = 0; i < freeze; i++) s += player.roundToPar[i] ?? 0;
      return s;
    }
    return player.toPar; // fall back to cumulative if no per-round data
  }
  if (player.status === "WD" || player.status === "DQ") {
    const roundsPlayed = player.roundToPar.filter((r) => r !== null).length;
    const missedRounds = Math.max(0, 4 - roundsPlayed);
    return player.toPar + missedRounds * 10;
  }
  return player.toPar;
}

// ─── Leaderboard builder ──────────────────────────────────────────────────────

interface PickRow {
  tierNumber: number;
  golferName: string;
  score: number | null;
  roundScores: (number | null)[];
  status: string;
  thru: number | null;
}

interface LeaderboardRow {
  rank: number;
  entryId: string;
  teamName: string;
  purchaserName: string;
  totalScore: number | null;
  tiebreakerScore: number | null;
  paidStatus: string;
  isDead: boolean;
  createdAt: string;
  picks: PickRow[];
}

async function buildLeaderboard(
  poolId: string,
  cutRound: number,
  winnerFinalScoreToPar: number | null,
  scoreMap: Map<string, { player: PlayerResult; adjustedToPar: number }>
): Promise<LeaderboardRow[]> {
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
    orderBy: { createdAt: "asc" },
  });

  const rows: LeaderboardRow[] = entries.map((entry) => {
    let total = 0;
    let hasAnyScore = false;
    let isDead = false;
    const picks: PickRow[] = entry.picks.map((p) => {
      const sr = scoreMap.get(p.golfer.id);
      let score: number | null = null;
      let roundScores: (number | null)[] = [null, null, null, null];
      let status = "ACTIVE";
      let thru: number | null = null;

      if (sr) {
        score = sr.adjustedToPar;
        roundScores = [...sr.player.roundToPar];
        status = sr.player.status;
        thru = sr.player.thru;
        hasAnyScore = true;
        total += score;
        if (status === "WD" || status === "DQ") isDead = true;
      }

      return {
        tierNumber: p.tier.tierNumber,
        golferName: p.golfer.name,
        score,
        roundScores,
        status,
        thru,
      };
    });

    return {
      rank: 0,
      entryId: entry.id,
      teamName: entry.teamName,
      purchaserName: entry.purchaserName,
      totalScore: hasAnyScore ? total : null,
      tiebreakerScore: entry.tiebreakerScore,
      paidStatus: entry.paidStatus,
      isDead,
      createdAt: entry.createdAt.toISOString(),
      picks,
    };
  });

  // ── Sort ──────────────────────────────────────────────────────────────────
  rows.sort((a, b) => {
    // Dead entries to the bottom
    if (a.isDead !== b.isDead) return a.isDead ? 1 : -1;

    // Null scores (pre-tournament) to the bottom
    if (a.totalScore === null && b.totalScore === null) {
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    }
    if (a.totalScore === null) return 1;
    if (b.totalScore === null) return -1;

    // Primary: lower total score wins
    if (a.totalScore !== b.totalScore) return a.totalScore - b.totalScore;

    // Tiebreaker (only when winner score is known)
    if (winnerFinalScoreToPar !== null) {
      const aTb =
        a.tiebreakerScore !== null
          ? Math.abs(a.tiebreakerScore - winnerFinalScoreToPar)
          : Infinity;
      const bTb =
        b.tiebreakerScore !== null
          ? Math.abs(b.tiebreakerScore - winnerFinalScoreToPar)
          : Infinity;
      if (aTb !== bTb) return aTb - bTb;

      // Tier 6, then tier 3, then tier 4 pick scores
      for (const tier of [6, 3, 4] as const) {
        const aScore = a.picks.find((p) => p.tierNumber === tier)?.score ?? 0;
        const bScore = b.picks.find((p) => p.tierNumber === tier)?.score ?? 0;
        if (aScore !== bScore) return aScore - bScore;
      }
    }

    // Stable fallback: entry creation order
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });

  rows.forEach((r, i) => {
    r.rank = i + 1;
  });

  return rows;
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 1. Load pool
  const pool = await prisma.pool.findUnique({ where: { year: 2026 } });
  if (!pool) {
    return NextResponse.json({ error: "Pool not found" }, { status: 404 });
  }

  // 2. Resolve tournament ID if needed
  let tournamentId = pool.mastersTournamentId;
  if (!tournamentId) {
    try {
      const { resolveMastersTournamentId } = await import(
        "@/providers/sportradar"
      );
      tournamentId = await resolveMastersTournamentId(pool.year);
    } catch (err) {
      console.error("Failed to resolve tournament ID:", err);
      return NextResponse.json(
        { message: "provider_failed", detail: "could not resolve tournament id" },
        { status: 200 }
      );
    }
  }

  // 3. Fetch from Sportradar — bail safely on failure
  let players: PlayerResult[];
  let cutRound: number;
  let winnerFinalScoreToPar: number | null;

  try {
    const { fetchSummary, fetchLeaderboard } = await import(
      "@/providers/sportradar"
    );
    const [summary, lb] = await Promise.all([
      fetchSummary(pool.year, tournamentId),
      fetchLeaderboard(pool.year, tournamentId),
    ]);
    cutRound = summary.cutRound ?? 2;
    winnerFinalScoreToPar = summary.winnerFinalScoreToPar;
    players = lb;
  } catch (err) {
    console.error("Sportradar provider failed:", err);
    return NextResponse.json({ message: "provider_failed" }, { status: 200 });
  }

  // 4. Upsert Pool metadata from summary
  await prisma.pool.update({
    where: { id: pool.id },
    data: {
      cutRound,
      ...(winnerFinalScoreToPar !== null ? { winnerFinalScoreToPar } : {}),
    },
  });

  // 5. Upsert Golfer records + build apiPlayerId → golferId map
  const golferIdByApiId = new Map<string, string>();
  for (const p of players) {
    if (!p.apiPlayerId) continue;
    const golfer = await prisma.golfer.upsert({
      where: { sportradarId: p.apiPlayerId },
      update: { name: p.name },
      create: { name: p.name, sportradarId: p.apiPlayerId },
    });
    golferIdByApiId.set(p.apiPlayerId, golfer.id);
  }

  // 6. Upsert LiveScore records + build golferId → { player, adjustedToPar }
  const scoreMap = new Map<string, { player: PlayerResult; adjustedToPar: number }>();
  for (const p of players) {
    const golferId = golferIdByApiId.get(p.apiPlayerId);
    if (!golferId) continue;

    const adj = adjustedScore(p, cutRound);
    const currentRound = p.roundToPar.reduce<number>((max, s, i) => (s !== null ? i + 1 : max), 1);

    const statusMap: Record<PlayerResult["status"], "ACTIVE" | "CUT" | "WD" | "DQ" | "COMPLETE"> = {
      ACTIVE: "ACTIVE",
      CUT: "CUT",
      WD: "WD",
      DQ: "DQ",
      COMPLETE: "COMPLETE",
    };

    await prisma.liveScore.upsert({
      where: { golferId_poolId: { golferId, poolId: pool.id } },
      update: {
        round: currentRound,
        totalScore: adj,
        thru: p.thru,
        status: statusMap[p.status],
        roundScores: p.roundToPar as unknown as Prisma.InputJsonValue,
      },
      create: {
        golferId,
        poolId: pool.id,
        round: currentRound,
        totalScore: adj,
        thru: p.thru,
        status: statusMap[p.status],
        roundScores: p.roundToPar as unknown as Prisma.InputJsonValue,
      },
    });

    scoreMap.set(golferId, { player: p, adjustedToPar: adj });
  }

  // 7. Compute leaderboard rows
  const rows = await buildLeaderboard(pool.id, cutRound, winnerFinalScoreToPar, scoreMap);

  // 8. Update entry.isDead flags
  await Promise.all(
    rows.map((r) =>
      prisma.entry.update({
        where: { id: r.entryId },
        data: { isDead: r.isDead },
      })
    )
  );

  // 9. Write cache transactionally
  const cacheData = JSON.parse(JSON.stringify(rows)) as Prisma.InputJsonValue;
  await prisma.leaderboardCache.upsert({
    where: { poolId: pool.id },
    update: { data: cacheData },
    create: { poolId: pool.id, data: cacheData },
  });

  return NextResponse.json({
    message: "ok",
    golfers: players.length,
    entries: rows.length,
    cutRound,
    winnerFinalScoreToPar,
  });
}
