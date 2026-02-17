import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { Nav } from '@/components/Nav';

export default async function PayPage({ searchParams }: { searchParams: { entryId?: string } }) {
  const entryId = searchParams.entryId;
  const entry = entryId
    ? await prisma.entry.findUnique({ where: { id: entryId }, include: { pool: true } })
    : null;

  if (!entry) {
    return (
      <div>
        <Nav />
        <p>Provide entryId query parameter.</p>
      </div>
    );
  }

  const amount = (entry.pool.entryFeeCents / 100).toFixed(2);
  const memo = `Masters2026 ${entry.teamName}`;
  const venmoLink = `https://venmo.com/${entry.pool.venmoHandle.replace('@', '')}?txn=pay&amount=${amount}&note=${encodeURIComponent(memo)}`;

  return (
    <div className="space-y-4">
      <Nav />
      <h1 className="text-3xl font-bold">Payment</h1>
      <p>Venmo: {entry.pool.venmoHandle}</p>
      <p>Amount: ${amount}</p>
      <p>Memo: {memo}</p>
      <p>Status: <strong>{entry.paidStatus.toUpperCase()}</strong></p>
      <Link href={venmoLink} className="inline-block rounded bg-emerald-700 px-4 py-2 text-white">Pay with Venmo</Link>
    </div>
  );
}
