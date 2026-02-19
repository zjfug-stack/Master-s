/**
 * Sportradar Golf API client — SERVER-SIDE ONLY.
 * Never import this file from client components.
 */

// Defensive guard: block client-side imports
if (typeof window !== "undefined") {
  throw new Error("sportradar.ts must only be used on the server.");
}

const BASE_URL = "https://api.sportradar.com/golf/trial/v3/en";

function getApiKey(): string {
  const key = process.env.SPORTRADAR_API_KEY;
  if (!key) throw new Error("SPORTRADAR_API_KEY is not set");
  return key;
}

export interface GolferScore {
  id: string;
  name: string;
  position: number | null;
  totalScore: number; // strokes relative to par (negative = under par)
  thru: number | null; // holes completed in current round
  status: "active" | "cut" | "wd" | "dq" | "complete";
}

export interface TournamentLeaderboard {
  tournamentId: string;
  tournamentName: string;
  round: number;
  status: string;
  golfers: GolferScore[];
  fetchedAt: string;
}

/**
 * Fetch the live leaderboard for the Masters tournament.
 * Called only from server-side API routes or Server Components.
 */
export async function getMastersLeaderboard(
  tournamentId: string
): Promise<TournamentLeaderboard> {
  const apiKey = getApiKey();
  const url = `${BASE_URL}/tournaments/${tournamentId}/leaderboard.json?api_key=${apiKey}`;

  const res = await fetch(url, {
    next: { revalidate: 60 }, // Cache for 60 seconds on server
  });

  if (!res.ok) {
    throw new Error(
      `Sportradar API error: ${res.status} ${res.statusText}`
    );
  }

  const data = await res.json();

  // Map Sportradar response to our internal shape
  const leaderboard = data.leaderboard ?? data.results ?? [];

  const golfers: GolferScore[] = leaderboard.map((entry: Record<string, unknown>) => ({
    id: String(entry.id ?? ""),
    name: `${entry.first_name ?? ""} ${entry.last_name ?? ""}`.trim(),
    position: entry.position ? Number(entry.position) : null,
    totalScore: Number(entry.score ?? entry.total ?? 0),
    thru: entry.thru != null ? Number(entry.thru) : null,
    status: mapStatus(String(entry.status ?? "active")),
  }));

  return {
    tournamentId,
    tournamentName: data.tournament?.name ?? "Masters Tournament 2026",
    round: Number(data.round?.number ?? data.current_round ?? 1),
    status: String(data.tournament?.status ?? data.status ?? "scheduled"),
    golfers,
    fetchedAt: new Date().toISOString(),
  };
}

function mapStatus(raw: string): GolferScore["status"] {
  const s = raw.toLowerCase();
  if (s.includes("cut")) return "cut";
  if (s.includes("wd") || s.includes("withdrew")) return "wd";
  if (s.includes("dq") || s.includes("disqualif")) return "dq";
  if (s.includes("complete") || s.includes("finish")) return "complete";
  return "active";
}
