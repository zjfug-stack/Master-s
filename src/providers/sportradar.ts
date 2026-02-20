/**
 * Sportradar Golf API provider — SERVER-SIDE ONLY.
 * Never import this file from client components.
 */

// Defensive guard: block client-side imports
if (typeof window !== "undefined") {
  throw new Error("sportradar provider must only be used on the server.");
}

const BASE = "https://api.sportradar.com/golf/trial/v3/en";

function apiKey(): string {
  const k = process.env.SPORTRADAR_API_KEY;
  if (!k) throw new Error("SPORTRADAR_API_KEY is not set");
  return k;
}

async function srFetch(path: string): Promise<unknown> {
  const sep = path.includes("?") ? "&" : "?";
  const url = `${BASE}${path}${sep}api_key=${apiKey()}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Sportradar ${path}: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

// ─── resolveMastersTournamentId ───────────────────────────────────────────────

/**
 * Find the Masters tournament ID for the given year from Sportradar's schedule
 * endpoint, persist it to the Pool row, and return it.
 *
 * Prefers `parent_id` over the event's own `id` when present (Sportradar sometimes
 * models the main event as the parent of its sub-events).
 */
export async function resolveMastersTournamentId(poolYear: number): Promise<string> {
  type ScheduleEntry = { id: string; name: string; parent_id?: string };
  const data = (await srFetch(`/schedule/${poolYear}/schedule.json`)) as {
    tournaments?: ScheduleEntry[];
    schedule?: { tournament?: ScheduleEntry }[];
  };

  const list: ScheduleEntry[] =
    data.tournaments ??
    (data.schedule ?? []).map((s) => s.tournament).filter(Boolean) as ScheduleEntry[];

  const masters = list.find(
    (t) => /masters/i.test(t.name) || /augusta/i.test(t.name)
  );

  if (!masters) {
    throw new Error(`Masters tournament not found in ${poolYear} Sportradar schedule`);
  }

  const tournamentId = masters.parent_id ?? masters.id;

  // Persist to DB so ingest route doesn't need to resolve again
  const { prisma } = await import("@/lib/prisma");
  await prisma.pool.update({
    where: { year: poolYear },
    data: { mastersTournamentId: tournamentId },
  });

  return tournamentId;
}

// ─── fetchSummary ─────────────────────────────────────────────────────────────

export interface SummaryResult {
  cutRound: number | null;
  winnerFinalScoreToPar: number | null;
}

/**
 * Fetch the tournament summary.
 * Returns the cut round (typically 2) and the winner's final score when the
 * tournament is complete.
 */
export async function fetchSummary(
  _year: number,
  tournamentId: string
): Promise<SummaryResult> {
  const raw = (await srFetch(
    `/tournaments/${tournamentId}/summary.json`
  )) as Record<string, unknown>;

  // The summary root may be a `tournament` wrapper or the object itself
  const t = (raw.tournament ?? raw) as Record<string, unknown>;

  // ── Cut round ──
  let cutRound: number | null = null;
  const rounds = ((t.rounds ?? []) as Array<Record<string, unknown>>);
  for (const r of rounds) {
    const typeStr = String(r.type ?? r.status ?? "").toLowerCase();
    if (typeStr.includes("cut") || r.cut_round === true) {
      cutRound = Number(r.number ?? r.sequence) || null;
      break;
    }
  }
  // Default to round 2 when rounds are present but no explicit cut marker
  if (cutRound === null && rounds.length > 0) cutRound = 2;

  // ── Winner score ──
  let winnerFinalScoreToPar: number | null = null;
  const statusStr = String(t.status ?? "").toLowerCase();
  if (statusStr.includes("complet") || statusStr.includes("official")) {
    const lb = (t.leaderboard ?? []) as Array<Record<string, unknown>>;
    if (lb.length > 0) {
      const leader = lb[0];
      const raw = leader.score ?? leader.total ?? leader.to_par ?? leader.strokes_to_par;
      if (raw != null) winnerFinalScoreToPar = Number(raw);
    }
  }

  return { cutRound, winnerFinalScoreToPar };
}

// ─── fetchLeaderboard ─────────────────────────────────────────────────────────

export interface PlayerResult {
  apiPlayerId: string;
  name: string;
  status: "ACTIVE" | "CUT" | "WD" | "DQ" | "COMPLETE";
  toPar: number;
  /** Scores relative to par per round; null = round not yet played / not available */
  roundToPar: [number | null, number | null, number | null, number | null];
  thru: number | null;
}

/**
 * Fetch and normalize the live tournament leaderboard.
 */
export async function fetchLeaderboard(
  _year: number,
  tournamentId: string
): Promise<PlayerResult[]> {
  const raw = (await srFetch(
    `/tournaments/${tournamentId}/leaderboard.json`
  )) as Record<string, unknown>;

  const list = (raw.leaderboard ?? raw.results ?? []) as Array<Record<string, unknown>>;

  return list.map((p): PlayerResult => {
    // Per-round scores
    const rounds = (p.rounds ?? []) as Array<Record<string, unknown>>;
    const roundToPar: [number | null, number | null, number | null, number | null] = [
      null,
      null,
      null,
      null,
    ];
    for (const r of rounds) {
      const idx = Number(r.number ?? r.sequence) - 1;
      if (idx >= 0 && idx < 4) {
        const s = r.score ?? r.strokes_to_par ?? r.to_par;
        roundToPar[idx] = s != null ? Number(s) : null;
      }
    }

    // Status
    const rawStatus = String(
      p.status ?? p.player_status ?? p.entry_status ?? "active"
    ).toLowerCase();
    let status: PlayerResult["status"] = "ACTIVE";
    if (rawStatus.includes("cut")) status = "CUT";
    else if (
      rawStatus.includes("wd") ||
      rawStatus.includes("withdrew") ||
      rawStatus.includes("withdraw")
    )
      status = "WD";
    else if (rawStatus.includes("dq") || rawStatus.includes("disqualif")) status = "DQ";
    else if (rawStatus.includes("complet") || rawStatus.includes("finish"))
      status = "COMPLETE";

    const toPar = Number(p.score ?? p.total ?? p.to_par ?? p.strokes_to_par ?? 0);
    const thru = p.thru != null ? Number(p.thru) : null;

    const firstName = String(p.first_name ?? "");
    const lastName = String(p.last_name ?? "");
    const name = p.name ? String(p.name) : `${firstName} ${lastName}`.trim();

    return {
      apiPlayerId: String(p.id ?? p.player_id ?? ""),
      name,
      status,
      toPar,
      roundToPar,
      thru,
    };
  });
}
