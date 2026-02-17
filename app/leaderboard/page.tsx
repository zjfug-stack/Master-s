import { LeaderboardTable } from '@/components/LeaderboardTable';
import { Nav } from '@/components/Nav';

async function getRows() {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  const response = await fetch(`${base}/api/leaderboard?year=2026`, { cache: 'no-store' });
  if (!response.ok) return [];
  const data = await response.json();
  return data.rows ?? [];
}

export default async function LeaderboardPage() {
  const rows = await getRows();
  return (
    <div className="space-y-4">
      <Nav />
      <h1 className="text-3xl font-bold">Live Leaderboard</h1>
      <LeaderboardTable initialRows={rows} />
    </div>
  );
}
