import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const year = Number(searchParams.get('year') ?? 2026);

  const pool = await prisma.pool.findUnique({ where: { year } });
  if (!pool) return NextResponse.json({ rows: [] });

  const rows = await prisma.leaderboardCache.findMany({
    where: { poolId: pool.id },
    include: {
      entry: {
        include: {
          picks: { include: { golfer: true } }
        }
      }
    },
    orderBy: [{ rank: 'asc' }, { entry: { createdAt: 'asc' } }]
  });

  const golferScores = await prisma.liveScore.findMany({ where: { poolId: pool.id } });
  const scoreMap = new Map(golferScores.map((s) => [s.golferId, s.toPar]));

  return NextResponse.json({
    rows: rows.map((row) => ({
      id: row.entry.id,
      rank: row.rank,
      teamName: row.entry.teamName,
      totalToPar: row.totalToPar,
      paidStatus: row.entry.paidStatus,
      isDead: row.entry.isDead,
      tiebreakWinnerScore: row.entry.tiebreakWinnerScore,
      updatedAt: row.updatedAt,
      picks: row.entry.picks
        .sort((a, b) => a.tierNum - b.tierNum)
        .map((pick) => ({ tierNum: pick.tierNum, golferName: pick.golfer.displayName, toPar: scoreMap.get(pick.golferId) ?? null }))
    }))
  });
}
