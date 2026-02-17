'use client';

import { useEffect, useMemo, useState } from 'react';

type Row = {
  rank: number | null;
  team_name: string;
  purchaser_name: string;
  paid_status: string;
  is_dead: boolean;
  total_to_par: number;
  tier_picks: Array<{ tier_num: number; golfer_name: string; to_par: number | null; status: string }>;
  tiebreak_winner_score: number;
};

export function LeaderboardTable({ initialRows }: { initialRows: Row[] }) {
  const [rows, setRows] = useState(initialRows);
  const [query, setQuery] = useState('');
  const [refresh, setRefresh] = useState(true);

  useEffect(() => {
    if (!refresh) return;
    const interval = setInterval(async () => {
      const response = await fetch('/api/leaderboard?year=2026', { cache: 'no-store' });
      if (response.ok) {
        const data = await response.json();
        setRows(data.rows ?? []);
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [refresh]);

  const filtered = useMemo(
    () => rows.filter((row) => row.team_name.toLowerCase().includes(query.toLowerCase())),
    [rows, query]
  );

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <input className="rounded bg-neutral-900 px-3 py-2" placeholder="Search team" value={query} onChange={(e) => setQuery(e.target.value)} />
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={refresh} onChange={(e) => setRefresh(e.target.checked)} /> Auto refresh
        </label>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left">
              <th>Rank</th><th>Team</th><th>Total</th><th>Picks</th><th>Badges</th><th>Tiebreak</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row, idx) => (
              <tr key={`${row.team_name}-${idx}`} className="border-t border-neutral-800 align-top">
                <td>{row.is_dead ? 'DEAD' : row.rank}</td>
                <td>{row.team_name}</td>
                <td>{row.total_to_par > 0 ? `+${row.total_to_par}` : row.total_to_par}</td>
                <td>{row.tier_picks.map((pick) => <div key={pick.tier_num}>Tier {pick.tier_num}: {pick.golfer_name} ({pick.to_par ?? '—'}, {pick.status})</div>)}</td>
                <td className="space-x-2">
                  {row.paid_status === 'paid' && <span className="rounded bg-emerald-700 px-2 py-1">Paid</span>}
                  {row.is_dead && <span className="rounded bg-red-700 px-2 py-1">Dead</span>}
                </td>
                <td>{row.tiebreak_winner_score}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
