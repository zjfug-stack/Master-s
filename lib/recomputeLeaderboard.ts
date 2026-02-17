import { LiveStatus, Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

type EntryForScore = Prisma.EntryGetPayload<{
  include: { picks: true };
}>;

function scoreForStatus(status: LiveStatus, toPar: number | null, r1: number | null, r2: number | null): { value: number; dead: boolean; reason?: string } {
  if (status === 'wd' || status === 'dq') {
    return { value: 999, dead: true, reason: `Golfer ${status.toUpperCase()} after starting` };
  }
  if (status === 'mc') {
    if (typeof toPar === 'number') return { value: toPar, dead: false };
    return { value: (r1 ?? 0) + (r2 ?? 0), dead: false };
  }
  if (typeof toPar !== 'number') return { value: 999, dead: false };
  return { value: toPar, dead: false };
}

export async function recomputeLeaderboard(poolId: string): Promise<void> {
  const [pool, entries, scores] = await Promise.all([
    prisma.pool.findUnique({ where: { id: poolId } }),
    prisma.entry.findMany({ where: { poolId }, include: { picks: true }, orderBy: { createdAt: 'asc' } }),
    prisma.liveScore.findMany({ where: { poolId } })
  ]);

  if (!pool) return;

  const scoreMap = new Map(scores.map((s) => [s.golferId, s]));

  const computed = entries.map((entry: EntryForScore) => {
    let total = 0;
    let dead = false;
    let deadReason: string | null = null;
    let tier6 = 999;
    let tier3 = 999;
    let tier4 = 999;

    for (const pick of entry.picks) {
      const live = scoreMap.get(pick.golferId);
      const score = scoreForStatus(live?.status ?? 'ns', live?.toPar ?? null, live?.roundToPar1 ?? null, live?.roundToPar2 ?? null);
      total += score.value;
      if (pick.tierNum === 6) tier6 = score.value;
      if (pick.tierNum === 3) tier3 = score.value;
      if (pick.tierNum === 4) tier4 = score.value;
      if (score.dead) {
        dead = true;
        deadReason = score.reason ?? 'Entry marked dead by WD/DQ rule';
      }
    }

    return { entry, total, dead, deadReason, tier6, tier3, tier4 };
  });

  const nonDead = computed
    .filter((row) => !row.dead)
    .sort((a, b) => {
      if (a.total !== b.total) return a.total - b.total;
      if (typeof pool.winnerFinalScoreToPar === 'number') {
        const d = Math.abs(a.entry.tiebreakWinnerScore - pool.winnerFinalScoreToPar) - Math.abs(b.entry.tiebreakWinnerScore - pool.winnerFinalScoreToPar);
        if (d !== 0) return d;
        if (a.tier6 !== b.tier6) return a.tier6 - b.tier6;
        if (a.tier3 !== b.tier3) return a.tier3 - b.tier3;
        if (a.tier4 !== b.tier4) return a.tier4 - b.tier4;
      }
      return a.entry.createdAt.getTime() - b.entry.createdAt.getTime();
    });

  const dead = computed.filter((row) => row.dead).sort((a, b) => a.entry.createdAt.getTime() - b.entry.createdAt.getTime());

  await prisma.$transaction(async (tx) => {
    for (const [index, row] of nonDead.entries()) {
      await tx.entry.update({ where: { id: row.entry.id }, data: { isDead: false, deadReason: null } });
      await tx.leaderboardCache.upsert({
        where: { poolId_entryId: { poolId, entryId: row.entry.id } },
        update: {
          totalToPar: row.total,
          tier6ToPar: row.tier6,
          tier3ToPar: row.tier3,
          tier4ToPar: row.tier4,
          rank: index + 1
        },
        create: {
          poolId,
          entryId: row.entry.id,
          totalToPar: row.total,
          tier6ToPar: row.tier6,
          tier3ToPar: row.tier3,
          tier4ToPar: row.tier4,
          rank: index + 1
        }
      });
    }

    for (const row of dead) {
      await tx.entry.update({ where: { id: row.entry.id }, data: { isDead: true, deadReason: row.deadReason } });
      await tx.leaderboardCache.upsert({
        where: { poolId_entryId: { poolId, entryId: row.entry.id } },
        update: {
          totalToPar: row.total,
          tier6ToPar: row.tier6,
          tier3ToPar: row.tier3,
          tier4ToPar: row.tier4,
          rank: null
        },
        create: {
          poolId,
          entryId: row.entry.id,
          totalToPar: row.total,
          tier6ToPar: row.tier6,
          tier3ToPar: row.tier3,
          tier4ToPar: row.tier4,
          rank: null
        }
      });
    }
  });
}
