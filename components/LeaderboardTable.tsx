'use client';

import { useEffect, useMemo, useState } from 'react';

type Row = {
  id: string;
  rank: number | null;
  teamName: string;
  totalToPar: number;
  paidStatus: string;
  isDead: boolean;
  tiebreakWinnerScore: number;
  updatedAt: string;
  picks: Array<{ tierNum: number; golferName: string; toPar: number | null }>;
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
    () => rows.filter((row) => row.teamName.toLowerCase().includes(query.toLowerCase())),
    [rows, query]
  );

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <input
          className="rounded bg-neutral-900 px-3 py-2"
          placeholder="Search team"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={refresh} onChange={(e) => setRefresh(e.target.checked)} /> Auto refresh
        </label>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left">
              <th>Rank</th><th>Team</th><th>Total</th><th>Picks</th><th>Badges</th><th>Tiebreak</th><th>Updated</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => (
              <tr key={row.id} className="border-t border-neutral-800 align-top">
                <td>{row.isDead ? 'DEAD' : row.rank}</td>
                <td>{row.teamName}</td>
                <td>{row.totalToPar > 0 ? `+${row.totalToPar}` : row.totalToPar}</td>
                <td>{row.picks.map((p) => <div key={p.tierNum}>Tier {p.tierNum}: {p.golferName} ({p.toPar ?? '—'})</div>)}</td>
                <td className="space-x-2">
                  {row.paidStatus === 'paid' && <span className="rounded bg-emerald-700 px-2 py-1">Paid</span>}
                  {row.isDead && <span className="rounded bg-red-700 px-2 py-1">Dead</span>}
                </td>
                <td>{row.tiebreakWinnerScore}</td>
                <td>{new Date(row.updatedAt).toLocaleTimeString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
