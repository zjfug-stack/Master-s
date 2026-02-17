import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { formatLock } from '@/lib/time';
import { Nav } from '@/components/Nav';

export default async function HomePage() {
  const pool = await prisma.pool.findUnique({ where: { year: 2026 } });

  return (
    <div className="space-y-6">
      <Nav />
      <h1 className="text-4xl font-bold">Masters Pool 2026</h1>
      <p>Pick one golfer from each tier, lowest combined score wins.</p>
      <ul className="list-disc pl-6">
        <li>Entry fee: ${(pool?.entryFeeCents ?? 0) / 100}</li>
        <li>Lock time: {pool ? formatLock(pool.lockAtCt) : 'Not configured'}</li>
      </ul>
      <div className="flex gap-4">
        <Link href="/enter" className="rounded bg-emerald-700 px-4 py-2 text-white">Enter</Link>
        <Link href="/leaderboard" className="rounded border px-4 py-2">Leaderboard</Link>
      </div>
    </div>
  );
}
