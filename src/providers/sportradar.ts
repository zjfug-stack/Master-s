import { prisma } from '@/lib/prisma';

type UrlInput = {
  type: 'schedule' | 'leaderboard' | 'summary';
  year: number;
  tournamentId?: string;
};

export type NormalizedPlayer = {
  api_player_id: string;
  first_name: string;
  last_name: string;
  display_name: string;
  status: 'active' | 'mc' | 'wd' | 'dq' | 'ns';
  to_par: number | null;
  round_to_par: [number | null, number | null, number | null, number | null];
  thru: number | null;
};

export type SummaryNormalized = {
  cut_round: number | null;
  status: string;
  winner_final_score_to_par: number | null;
};

function baseUrl(): string {
  const level = process.env.SPORTRADAR_ACCESS_LEVEL ?? 'trial';
  const tour = process.env.SPORTRADAR_GOLF_TOUR ?? 'pga';
  const lang = process.env.SPORTRADAR_LANG ?? 'en';
  return `https://api.sportradar.us/golf-${level}/${tour}/${lang}`;
}

export function buildUrl({ type, year, tournamentId }: UrlInput): string {
  const apiKey = process.env.SPORTRADAR_API_KEY ?? '';
  const root = baseUrl();

  if (type === 'schedule') {
    return `${root}/tournaments/${year}/schedule.json?api_key=${apiKey}`;
  }

  if (!tournamentId) {
    throw new Error('tournamentId is required for leaderboard/summary endpoints');
  }

  if (type === 'leaderboard') {
    return `${root}/tournaments/${year}/${tournamentId}/leaderboard.json?api_key=${apiKey}`;
  }

  return `${root}/tournaments/${year}/${tournamentId}/summary.json?api_key=${apiKey}`;
}

async function fetchJson(url: string): Promise<any> {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Sportradar request failed (${response.status})`);
  }
  return response.json();
}

function normalizeStatus(status: unknown): NormalizedPlayer['status'] {
  const s = String(status ?? 'active').toLowerCase();
  if (s === 'mc' || s === 'wd' || s === 'dq' || s === 'ns') return s;
  return 'active';
}

function parseToPar(value: unknown): number | null {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function normalizePlayer(player: any): NormalizedPlayer {
  const p = player.player ?? player;
  const firstName = p.first_name ?? player.first_name ?? '';
  const lastName = p.last_name ?? player.last_name ?? '';
  const displayName = p.name ?? player.display_name ?? `${firstName} ${lastName}`.trim();

  return {
    api_player_id: String(p.id ?? player.player_id ?? player.id ?? ''),
    first_name: firstName,
    last_name: lastName,
    display_name: displayName,
    status: normalizeStatus(player.status),
    to_par: parseToPar(player.to_par),
    round_to_par: [
      parseToPar(player.round_1 ?? player.round_to_par_1),
      parseToPar(player.round_2 ?? player.round_to_par_2),
      parseToPar(player.round_3 ?? player.round_to_par_3),
      parseToPar(player.round_4 ?? player.round_to_par_4)
    ],
    thru: typeof player.thru === 'number' ? player.thru : null
  };
}

export async function resolveMastersTournamentId(pool: {
  id: string;
  year: number;
  mastersTournamentId: string | null;
  mastersParentId: string | null;
}): Promise<string> {
  if (pool.mastersTournamentId) return pool.mastersTournamentId;

  const schedule = await fetchJson(buildUrl({ type: 'schedule', year: pool.year }));
  const tournaments = schedule.tournaments ?? [];
  const found = tournaments.find((event: any) => {
    if (pool.mastersParentId) {
      return String(event.parent_id ?? '') === pool.mastersParentId;
    }
    return String(event.name ?? '').toLowerCase().includes('masters');
  });

  if (!found?.id) {
    throw new Error('Unable to resolve masters tournament id');
  }

  await prisma.pool.update({
    where: { id: pool.id },
    data: { mastersTournamentId: String(found.id) }
  });

  return String(found.id);
}

export async function fetchLeaderboard(pool: {
  year: number;
  mastersTournamentId: string | null;
}): Promise<NormalizedPlayer[]> {
  if (!pool.mastersTournamentId) throw new Error('masters tournament id is required');

  const data = await fetchJson(
    buildUrl({
      type: 'leaderboard',
      year: pool.year,
      tournamentId: pool.mastersTournamentId
    })
  );

  const players = data.leaderboard ?? data.players ?? [];
  return players.map(normalizePlayer).filter((p: NormalizedPlayer) => p.api_player_id.length > 0);
}

export async function fetchSummary(pool: {
  year: number;
  mastersTournamentId: string | null;
}): Promise<SummaryNormalized> {
  if (!pool.mastersTournamentId) throw new Error('masters tournament id is required');

  const data = await fetchJson(
    buildUrl({
      type: 'summary',
      year: pool.year,
      tournamentId: pool.mastersTournamentId
    })
  );

  const winner = data.winner ?? data.leaderboard?.[0] ?? null;

  return {
    cut_round: typeof data.cut_round === 'number' ? data.cut_round : null,
    status: String(data.status ?? 'unknown'),
    winner_final_score_to_par: parseToPar(winner?.to_par)
  };
}
