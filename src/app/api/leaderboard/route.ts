/**
 * GET /api/leaderboard
 * Returns cached pool standings with live tournament scores.
 * All Sportradar calls happen here — server-side only.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const entries = await prisma.entry.findMany({
      include: {
        user: { select: { name: true, email: true } },
        picks: {
          include: { golfer: { select: { id: true, name: true, sportradarId: true } } },
          orderBy: { slot: "asc" },
        },
      },
    });

    // Attempt to load cached scores from DB
    const cached = await prisma.tournamentCache.findFirst({
      where: {
        key: "masters-2026-leaderboard",
        expiresAt: { gt: new Date() },
      },
      orderBy: { fetchedAt: "desc" },
    });

    // Build a map of sportradarId -> totalScore from the cache
    const scoreMap: Record<string, number> = {};
    if (cached) {
      const data = cached.data as { golfers?: Array<{ id: string; totalScore: number }> };
      for (const g of data.golfers ?? []) {
        scoreMap[g.id] = g.totalScore;
      }
    }

    const result = entries.map((entry) => {
      const pickScores = entry.picks
        .map((p) => {
          const sid = p.golfer.sportradarId ?? "";
          return { name: p.golfer.name, score: scoreMap[sid] ?? null };
        });

      // Best 4 of 5 picks count
      const validScores = pickScores
        .map((p) => p.score)
        .filter((s): s is number => s !== null)
        .sort((a, b) => a - b)
        .slice(0, 4);

      const totalScore = validScores.length > 0
        ? validScores.reduce((sum, s) => sum + s, 0)
        : null;

      return {
        id: entry.id,
        entryName: entry.name,
        ownerName: entry.user.name,
        ownerEmail: entry.user.email,
        picks: pickScores,
        totalScore,
        tiebreaker: entry.tiebreaker,
      };
    });

    // Sort: entries with scores first (ascending), then entries without
    result.sort((a, b) => {
      if (a.totalScore === null && b.totalScore === null) return 0;
      if (a.totalScore === null) return 1;
      if (b.totalScore === null) return -1;
      return a.totalScore - b.totalScore;
    });

    return NextResponse.json({ entries: result, scoresCached: !!cached });
  } catch (error) {
    console.error("Leaderboard API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch leaderboard" },
      { status: 500 }
    );
  }
}
