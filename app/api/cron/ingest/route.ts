import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { recomputeLeaderboard } from '@/lib/recomputeLeaderboard';
import { fetchLeaderboard, fetchSummary, resolveMastersTournamentId } from '@/src/providers/sportradar';

export async function GET(request: Request) {
  const secret = request.headers.get('x-cron-secret');
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const pool =
    (await prisma.pool.findUnique({ where: { year: 2026 } })) ??
    (await prisma.pool.findFirst({ orderBy: { year: 'desc' } }));

  if (!pool) {
    return NextResponse.json({ error: 'Pool missing' }, { status: 404 });
  }

  try {
    const tournamentId = await resolveMastersTournamentId(pool);
    const poolWithTournament = { ...pool, mastersTournamentId: tournamentId };

    const [summary, leaderboard] = await Promise.all([
      fetchSummary(poolWithTournament),
      fetchLeaderboard(poolWithTournament)
    ]);

    await prisma.$transaction(async (tx) => {
      if (typeof summary.winner_final_score_to_par === 'number') {
        await tx.pool.update({
          where: { id: pool.id },
          data: { winnerFinalScoreToPar: summary.winner_final_score_to_par }
        });
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
            roundToPar1: player.round_to_par[0],
            roundToPar2: player.round_to_par[1],
            roundToPar3: player.round_to_par[2],
            roundToPar4: player.round_to_par[3],
            thru: player.thru,
            updatedAt: new Date()
          },
          create: {
            poolId: pool.id,
            golferId: golfer.id,
            status: player.status,
            toPar: player.to_par,
            roundToPar1: player.round_to_par[0],
            roundToPar2: player.round_to_par[1],
            roundToPar3: player.round_to_par[2],
            roundToPar4: player.round_to_par[3],
            thru: player.thru,
            updatedAt: new Date()
          }
        });
      }
    });

    await recomputeLeaderboard(pool.id);

    return NextResponse.json({ ok: true, players: leaderboard.length, summary_status: summary.status });
  } catch {
    return NextResponse.json({ ok: true, message: 'provider_failed' });
  }
}
