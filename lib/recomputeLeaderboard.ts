import { prisma } from '@/lib/prisma';
import { computeLeaderboardRows } from '@/lib/leaderboardEngine';

export async function recomputeLeaderboard(poolId: string): Promise<void> {
  const pool = await prisma.pool.findUnique({ where: { id: poolId } });
  if (!pool) return;

  const picks = await prisma.pick.findMany({
    where: { entry: { poolId } },
    include: {
      entry: {
        select: {
          id: true,
          createdAt: true,
          tiebreakWinnerScore: true
        }
      }
    }
  });

  const entriesById = new Map<
    string,
    {
      id: string;
      createdAt: Date;
      tiebreakWinnerScore: number;
      picks: Array<{ tierNum: number; golferId: string }>;
    }
  >();

  for (const pick of picks) {
    const existing = entriesById.get(pick.entry.id);
    if (existing) {
      existing.picks.push({ tierNum: pick.tierNum, golferId: pick.golferId });
    } else {
      entriesById.set(pick.entry.id, {
        id: pick.entry.id,
        createdAt: pick.entry.createdAt,
        tiebreakWinnerScore: pick.entry.tiebreakWinnerScore,
        picks: [{ tierNum: pick.tierNum, golferId: pick.golferId }]
      });
    }
  }

  const golferIds = [...new Set(picks.map((pick) => pick.golferId))];
  const scores = await prisma.liveScore.findMany({
    where: {
      poolId,
      golferId: { in: golferIds }
    },
    select: {
      golferId: true,
      status: true,
      toPar: true,
      roundToPar1: true,
      roundToPar2: true
    }
  });

  const computed = computeLeaderboardRows({
    entries: [...entriesById.values()],
    scores,
    winnerFinalScoreToPar: pool.winnerFinalScoreToPar
  });

  await prisma.$transaction(async (tx) => {
    for (const row of computed) {
      await tx.entry.update({
        where: { id: row.entryId },
        data: {
          isDead: row.isDead,
          deadReason: row.deadReason
        }
      });

      await tx.leaderboardCache.upsert({
        where: { poolId_entryId: { poolId, entryId: row.entryId } },
        update: {
          totalToPar: row.totalToPar,
          tier6ToPar: row.tier6ToPar,
          tier3ToPar: row.tier3ToPar,
          tier4ToPar: row.tier4ToPar,
          rank: row.rank,
          updatedAt: new Date()
        },
        create: {
          poolId,
          entryId: row.entryId,
          totalToPar: row.totalToPar,
          tier6ToPar: row.tier6ToPar,
          tier3ToPar: row.tier3ToPar,
          tier4ToPar: row.tier4ToPar,
          rank: row.rank,
          updatedAt: new Date()
        }
      });
    }
  });
}
