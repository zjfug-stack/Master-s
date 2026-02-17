import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { env } from '@/lib/env';
import { fetchTournamentLeaderboard, fetchTournamentSummary, resolveMastersTournamentId } from '@/lib/sportradar';
import { recomputeLeaderboard } from '@/lib/recomputeLeaderboard';

export async function GET(request: Request) {
  const secret = request.headers.get('x-cron-secret');
  if (secret !== env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const pool = await prisma.pool.findUnique({ where: { year: 2026 } });
  if (!pool) return NextResponse.json({ error: 'Pool missing' }, { status: 404 });

  const tournamentId = pool.mastersTournamentId ?? (await resolveMastersTournamentId(2026));
  if (!tournamentId) {
    return NextResponse.json({ error: 'Masters tournament id not found' }, { status: 404 });
  }

  const [summary, leaderboard] = await Promise.all([
    fetchTournamentSummary(tournamentId, pool.year),
    fetchTournamentLeaderboard(tournamentId, pool.year)
  ]);

  await prisma.$transaction(async (tx) => {
    if (typeof summary?.winner_final_score_to_par === 'number') {
      await tx.pool.update({ where: { id: pool.id }, data: { winnerFinalScoreToPar: summary.winner_final_score_to_par } });
    }

    for (const player of leaderboard) {
      const golfer = await tx.golfer.upsert({
        where: { apiPlayerId: player.api_player_id },
        update: {
          firstName: player.first_name,
          lastName: player.last_name,
          displayName: player.display_name
        },
        create: {
          apiPlayerId: player.api_player_id,
          firstName: player.first_name,
          lastName: player.last_name,
          displayName: player.display_name
        }
      });

      await tx.liveScore.upsert({
        where: { poolId_golferId: { poolId: pool.id, golferId: golfer.id } },
        update: {
          status: player.status,
          toPar: player.to_par,
          roundToPar1: player.round_to_par[0] ?? null,
          roundToPar2: player.round_to_par[1] ?? null,
          roundToPar3: player.round_to_par[2] ?? null,
          roundToPar4: player.round_to_par[3] ?? null,
          thru: player.thru
        },
        create: {
          poolId: pool.id,
          golferId: golfer.id,
          status: player.status,
          toPar: player.to_par,
          roundToPar1: player.round_to_par[0] ?? null,
          roundToPar2: player.round_to_par[1] ?? null,
          roundToPar3: player.round_to_par[2] ?? null,
          roundToPar4: player.round_to_par[3] ?? null,
          thru: player.thru
        }
      });
    }
  });

  await recomputeLeaderboard(pool.id);

  return NextResponse.json({ ok: true, players: leaderboard.length });
}
