import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const year = Number(searchParams.get('year') ?? 2026);

  const pool = await prisma.pool.findUnique({ where: { year } });
  if (!pool) {
    return NextResponse.json({ rows: [], last_updated: null });
  }

  const cacheRows = await prisma.leaderboardCache.findMany({
    where: { poolId: pool.id },
    include: {
      entry: {
        select: {
          teamName: true,
          purchaserName: true,
          paidStatus: true,
          isDead: true,
          tiebreakWinnerScore: true,
          picks: {
            include: {
              golfer: {
                select: { displayName: true }
              }
            }
          }
        }
      }
    },
    orderBy: [{ rank: 'asc' }, { entry: { createdAt: 'asc' } }]
  });

  const golferIds = [
    ...new Set(
      cacheRows.flatMap((row) => row.entry.picks.map((pick) => pick.golferId))
    )
  ];

  const liveScores = await prisma.liveScore.findMany({
    where: { poolId: pool.id, golferId: { in: golferIds } },
    select: { golferId: true, toPar: true, status: true }
  });

  const scoreMap = new Map(liveScores.map((score) => [score.golferId, score]));
  const lastUpdated = cacheRows.reduce<Date | null>((latest, row) => {
    if (!latest || row.updatedAt > latest) return row.updatedAt;
    return latest;
  }, null);

  return NextResponse.json({
    last_updated: lastUpdated,
    rows: cacheRows.map((row) => ({
      rank: row.rank,
      team_name: row.entry.teamName,
      purchaser_name: row.entry.purchaserName,
      paid_status: row.entry.paidStatus,
      is_dead: row.entry.isDead,
      total_to_par: row.totalToPar,
      tier_picks: row.entry.picks
        .sort((a, b) => a.tierNum - b.tierNum)
        .map((pick) => ({
          tier_num: pick.tierNum,
          golfer_name: pick.golfer.displayName,
          to_par: scoreMap.get(pick.golferId)?.toPar ?? null,
          status: scoreMap.get(pick.golferId)?.status ?? 'ns'
        })),
      tiebreak_winner_score: row.entry.tiebreakWinnerScore
    }))
  });
}
