import { prisma } from '@/lib/prisma';
import { env } from '@/lib/env';

export type NormalizedPlayerScore = {
  api_player_id: string;
  first_name: string;
  last_name: string;
  display_name: string;
  status: 'active' | 'mc' | 'wd' | 'dq' | 'ns';
  to_par: number | null;
  round_to_par: Array<number | null>;
  thru: number | null;
};

const baseUrl = `https://api.sportradar.us/golf-${env.SPORTRADAR_ACCESS_LEVEL}/${env.SPORTRADAR_GOLF_TOUR}/${env.SPORTRADAR_LANG}`;

async function apiFetch(path: string) {
  const url = `${baseUrl}${path}${path.includes('?') ? '&' : '?'}api_key=${env.SPORTRADAR_API_KEY}`;
  const response = await fetch(url, { next: { revalidate: 0 } });
  if (!response.ok) {
    throw new Error(`Sportradar error ${response.status}`);
  }
  return response.json();
}

export async function resolveMastersTournamentId(poolYear: number): Promise<string | null> {
  const pool = await prisma.pool.findUnique({ where: { year: poolYear } });
  if (!pool) return null;
  if (pool.mastersTournamentId) return pool.mastersTournamentId;

  // TODO: validate schedule endpoint path against Sportradar golf API docs.
  const data = await apiFetch(`/tournaments/${poolYear}/schedule.json`);
  const tournaments = data.tournaments ?? [];
  const found = tournaments.find((t: any) => {
    if (pool.mastersParentId) return t.parent_id === pool.mastersParentId;
    return String(t.name ?? '').toLowerCase().includes('masters');
  });

  if (!found?.id) return null;

  await prisma.pool.update({
    where: { id: pool.id },
    data: { mastersTournamentId: found.id }
  });

  return found.id;
}

export async function fetchTournamentLeaderboard(tournamentId: string, year: number): Promise<NormalizedPlayerScore[]> {
  // TODO: verify exact endpoint and response shape for production Sportradar contract.
  const data = await apiFetch(`/tournaments/${year}/${tournamentId}/leaderboard.json`);
  const players = data.leaderboard ?? data.players ?? [];

  return players.map((p: any): NormalizedPlayerScore => ({
    api_player_id: String(p.player?.id ?? p.player_id ?? p.id),
    first_name: p.player?.first_name ?? p.first_name ?? '',
    last_name: p.player?.last_name ?? p.last_name ?? '',
    display_name: p.player?.name ?? p.display_name ?? `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim(),
    status: (p.status ?? 'active').toLowerCase(),
    to_par: p.to_par ?? null,
    round_to_par: [p.round_1 ?? null, p.round_2 ?? null, p.round_3 ?? null, p.round_4 ?? null],
    thru: p.thru ?? null
  }));
}

export async function fetchTournamentSummary(tournamentId: string, year: number) {
  // TODO: verify exact endpoint and response shape for production Sportradar contract.
  return apiFetch(`/tournaments/${year}/${tournamentId}/summary.json`);
}
