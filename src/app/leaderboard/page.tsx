"use client";

import { useState, useEffect, useCallback, useRef, Fragment } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PickRow {
  tierNumber: number;
  golferName: string;
  score: number | null;
  roundScores: (number | null)[];
  status: string;
  thru: number | null;
}

interface EntryRow {
  rank: number;
  entryId: string;
  teamName: string;
  purchaserName: string;
  totalScore: number | null;
  tiebreakerScore: number | null;
  paidStatus: string;
  isDead: boolean;
  picks: PickRow[];
}

interface LeaderboardData {
  server_time_iso: string;
  last_updated_iso: string | null;
  entries: EntryRow[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const REFRESH_INTERVALS = [15, 30, 60] as const;
type RefreshInterval = (typeof REFRESH_INTERVALS)[number];

const LIVE_THRESHOLD_SECS = 180;
const VERY_STALE_SECS = 600;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatScore(score: number | null): string {
  if (score === null) return "—";
  if (score === 0) return "E";
  return score > 0 ? `+${score}` : String(score);
}

function scoreColor(score: number | null): string {
  if (score === null) return "text-gray-400";
  if (score < 0) return "text-[#006747]";
  if (score > 0) return "text-red-600";
  return "text-gray-700";
}

function staleSecs(data: LeaderboardData): number | null {
  if (!data.last_updated_iso) return null;
  const diff =
    new Date(data.server_time_iso).getTime() -
    new Date(data.last_updated_iso).getTime();
  return Math.max(0, Math.round(diff / 1000));
}

function GolferStatusBadge({ status }: { status: string }) {
  if (status === "ACTIVE" || status === "COMPLETE") return null;
  const cls: Record<string, string> = {
    CUT: "bg-gray-100 text-gray-500",
    WD: "bg-red-100 text-red-700",
    DQ: "bg-red-100 text-red-700",
  };
  return (
    <span
      className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${cls[status] ?? "bg-gray-100 text-gray-500"}`}
    >
      {status}
    </span>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LeaderboardPage() {
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Filter / search state
  const [search, setSearch] = useState("");
  const [filterPaid, setFilterPaid] = useState<"all" | "paid" | "unpaid">("all");
  const [hideDead, setHideDead] = useState(false);

  // Auto-refresh state
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshSecs, setRefreshSecs] = useState<RefreshInterval>(30);

  // Expanded pick rows
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchLeaderboard = useCallback(async () => {
    try {
      const res = await fetch("/api/leaderboard?year=2026", { cache: "no-store" });
      if (!res.ok) throw new Error(`Server error (${res.status})`);
      const json: LeaderboardData = await res.json();
      setData(json);
      setFetchError(null);
    } catch (e) {
      setFetchError((e as Error).message ?? "Failed to load leaderboard");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (!autoRefresh) return;
    timerRef.current = setInterval(fetchLeaderboard, refreshSecs * 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [autoRefresh, refreshSecs, fetchLeaderboard]);

  // ── Derived ────────────────────────────────────────────────────────────────

  const secs = data ? staleSecs(data) : null;
  const isLive = secs !== null && secs <= LIVE_THRESHOLD_SECS;
  const isVeryStale = secs !== null && secs > VERY_STALE_SECS;

  const filteredEntries = (data?.entries ?? []).filter((e) => {
    if (search) {
      const q = search.toLowerCase();
      if (
        !e.teamName.toLowerCase().includes(q) &&
        !e.purchaserName.toLowerCase().includes(q)
      )
        return false;
    }
    if (filterPaid === "paid" && e.paidStatus !== "PAID") return false;
    if (filterPaid === "unpaid" && e.paidStatus !== "PENDING") return false;
    if (hideDead && e.isDead) return false;
    return true;
  });

  function toggleRow(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* ── Sticky control bar ── */}
      <div className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-gray-200 -mx-4 px-4 py-3 space-y-2">
        {/* Row 1: search + filters + refresh controls */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Search */}
          <input
            type="search"
            placeholder="Search team or name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#006747] w-52"
          />

          {/* Paid filter */}
          <select
            value={filterPaid}
            onChange={(e) =>
              setFilterPaid(e.target.value as typeof filterPaid)
            }
            className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#006747]"
          >
            <option value="all">All entries</option>
            <option value="paid">Paid only</option>
            <option value="unpaid">Unpaid only</option>
          </select>

          {/* Hide dead */}
          <label className="flex items-center gap-1.5 text-sm text-gray-600 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={hideDead}
              onChange={(e) => setHideDead(e.target.checked)}
              className="accent-[#006747]"
            />
            Hide dead
          </label>

          <div className="ml-auto flex items-center gap-3 flex-wrap">
            {/* Live / Stale indicator */}
            {data?.last_updated_iso != null ? (
              <span
                className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${
                  isLive
                    ? "bg-green-50 text-green-700 border-green-300"
                    : "bg-gray-100 text-gray-500 border-gray-300"
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isLive ? "bg-green-500 animate-pulse" : "bg-gray-400"
                  }`}
                />
                {isLive ? "Live" : "Stale"}
              </span>
            ) : (
              <span className="text-xs text-gray-400 italic">No score data yet</span>
            )}

            {/* Auto-refresh toggle */}
            <label className="flex items-center gap-1.5 text-sm text-gray-600 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="accent-[#006747]"
              />
              Auto-refresh
            </label>

            {/* Interval select (only when auto-refresh on) */}
            {autoRefresh && (
              <select
                value={refreshSecs}
                onChange={(e) =>
                  setRefreshSecs(Number(e.target.value) as RefreshInterval)
                }
                className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#006747]"
              >
                {REFRESH_INTERVALS.map((s) => (
                  <option key={s} value={s}>
                    Every {s}s
                  </option>
                ))}
              </select>
            )}

            <button
              onClick={fetchLeaderboard}
              className="text-sm text-[#006747] font-medium hover:underline"
            >
              Refresh now
            </button>
          </div>
        </div>

        {/* Very stale warning */}
        {isVeryStale && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            Scores have not updated in over 10 minutes — data may be significantly
            delayed.
          </p>
        )}
      </div>

      {/* ── Loading / error ── */}
      {loading && (
        <div className="text-center py-20 text-gray-400 text-sm">
          Loading leaderboard…
        </div>
      )}
      {fetchError && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
          {fetchError}
        </div>
      )}

      {/* ── Leaderboard table ── */}
      {!loading && !fetchError && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {filteredEntries.length === 0 ? (
            <p className="text-center text-gray-400 py-14 text-sm">
              {search || filterPaid !== "all" || hideDead
                ? "No entries match your filters."
                : "No entries yet — be the first to enter!"}
            </p>
          ) : (
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-[#006747] text-white text-xs uppercase tracking-wide">
                  <th className="px-3 py-3 text-center w-10">#</th>
                  <th className="px-4 py-3 text-left">Team</th>
                  <th className="px-4 py-3 text-right w-20">Total</th>
                  <th className="px-3 py-3 text-center w-20 hidden sm:table-cell">
                    Paid
                  </th>
                  <th className="px-3 py-3 text-center w-10"></th>
                </tr>
              </thead>
              <tbody>
                {filteredEntries.map((entry) => {
                  const isOpen = expanded.has(entry.entryId);
                  return (
                    <Fragment key={entry.entryId}>
                      <tr
                        className={`border-t border-gray-100 cursor-pointer transition-colors ${
                          entry.isDead
                            ? "bg-red-50/60 hover:bg-red-50"
                            : "hover:bg-gray-50"
                        }`}
                        onClick={() => toggleRow(entry.entryId)}
                      >
                        {/* Rank */}
                        <td className="px-3 py-3 text-center font-bold text-gray-500">
                          {entry.isDead ? (
                            <span title="WD/DQ pick">💀</span>
                          ) : (
                            entry.rank
                          )}
                        </td>

                        {/* Team */}
                        <td className="px-4 py-3">
                          <div className="font-semibold text-gray-800 flex items-center gap-2">
                            {entry.teamName}
                            {entry.isDead && (
                              <span className="text-[10px] font-bold bg-red-100 text-red-700 border border-red-200 px-1.5 py-0.5 rounded">
                                DEAD
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-400">
                            {entry.purchaserName}
                          </div>
                        </td>

                        {/* Total */}
                        <td
                          className={`px-4 py-3 text-right font-mono font-bold text-base ${scoreColor(entry.totalScore)}`}
                        >
                          {formatScore(entry.totalScore)}
                        </td>

                        {/* Paid (hidden on mobile) */}
                        <td className="px-3 py-3 text-center hidden sm:table-cell">
                          {entry.paidStatus === "PAID" ? (
                            <span className="text-[10px] font-bold text-green-700 bg-green-100 border border-green-300 rounded-full px-2 py-0.5">
                              PAID
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-yellow-700 bg-yellow-100 border border-yellow-300 rounded-full px-2 py-0.5">
                              PENDING
                            </span>
                          )}
                        </td>

                        {/* Expand toggle */}
                        <td className="px-3 py-3 text-center text-gray-400 text-xs">
                          {isOpen ? "▲" : "▼"}
                        </td>
                      </tr>

                      {/* Expanded picks */}
                      {isOpen && (
                        <tr className="bg-gray-50 border-t border-gray-100">
                          <td />
                          <td colSpan={4} className="px-4 py-3">
                            <div className="grid sm:grid-cols-2 gap-1.5">
                              {entry.picks.map((pick) => (
                                <div
                                  key={pick.tierNumber}
                                  className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-3 py-2 gap-2"
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span className="text-xs text-gray-400 shrink-0 w-6">
                                      T{pick.tierNumber}
                                    </span>
                                    <span className="text-sm font-medium text-gray-800 truncate">
                                      {pick.golferName}
                                    </span>
                                    <GolferStatusBadge status={pick.status} />
                                  </div>
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    {pick.thru !== null && (
                                      <span className="text-[10px] text-gray-400">
                                        thru {pick.thru}
                                      </span>
                                    )}
                                    <span
                                      className={`text-sm font-mono font-semibold ${scoreColor(pick.score)}`}
                                    >
                                      {formatScore(pick.score)}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── Last updated footer ── */}
      {data?.last_updated_iso && (
        <p className="text-xs text-gray-400 text-center">
          Last updated:{" "}
          {new Date(data.last_updated_iso).toLocaleString("en-US", {
            timeZone: "America/Chicago",
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
            timeZoneName: "short",
          })}
          {secs !== null && secs > LIVE_THRESHOLD_SECS && secs <= VERY_STALE_SECS
            ? " · Scores may be slightly delayed"
            : ""}
        </p>
      )}
    </div>
  );
}
