import { prisma } from '@/lib/prisma';
import { Nav } from '@/components/Nav';

async function markPaid(formData: FormData) {
  'use server';
  const entryId = String(formData.get('entryId') ?? '');
  await prisma.entry.update({ where: { id: entryId }, data: { paidStatus: 'paid', paidAt: new Date() } });
}

async function substitute(formData: FormData) {
  'use server';
  const entryId = String(formData.get('entryId') ?? '');
  const tierNum = Number(formData.get('tierNum') ?? 0);
  const toGolferId = String(formData.get('toGolferId') ?? '');
  const reason = String(formData.get('reason') ?? 'Admin substitution');

  const pick = await prisma.pick.findUnique({ where: { entryId_tierNum: { entryId, tierNum } } });
  if (!pick) return;

  await prisma.$transaction([
    prisma.substitution.create({
      data: { entryId, tierNum, fromGolferId: pick.golferId, toGolferId, reason }
    }),
    prisma.pick.update({ where: { id: pick.id }, data: { golferId: toGolferId } })
  ]);
}

export default async function EntriesPage() {
  const entries = await prisma.entry.findMany({
    where: { pool: { year: 2026 } },
    include: { picks: { include: { golfer: true }, orderBy: { tierNum: 'asc' } }, pool: true },
    orderBy: { createdAt: 'desc' }
  });
  const allGolfers = await prisma.golfer.findMany({ orderBy: { displayName: 'asc' } });

  return (
    <div className="space-y-4">
      <Nav />
      <h1 className="text-2xl font-bold">Entries</h1>
      {entries.map((entry) => (
        <div key={entry.id} className="rounded border border-neutral-800 p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold">{entry.teamName}</p>
              <p className="text-sm text-neutral-400">{entry.purchaserName} · {entry.email}</p>
            </div>
            <form action={markPaid}>
              <input type="hidden" name="entryId" value={entry.id} />
              <button className="rounded bg-emerald-700 px-3 py-1">Mark Paid</button>
            </form>
          </div>
          <ul className="mt-2 list-disc pl-5 text-sm">
            {entry.picks.map((pick) => <li key={pick.id}>Tier {pick.tierNum}: {pick.golfer.displayName}</li>)}
          </ul>
          <form action={substitute} className="mt-3 flex flex-wrap gap-2 text-sm">
            <input type="hidden" name="entryId" value={entry.id} />
            <select name="tierNum" className="rounded bg-neutral-900 p-2">{[1,2,3,4,5,6].map((n)=><option key={n} value={n}>{n}</option>)}</select>
            <select name="toGolferId" className="rounded bg-neutral-900 p-2">
              {allGolfers.map((golfer) => <option key={golfer.id} value={golfer.id}>{golfer.displayName}</option>)}
            </select>
            <input name="reason" className="rounded bg-neutral-900 p-2" placeholder="Reason" />
            <button className="rounded border px-3">Substitute</button>
          </form>
        </div>
      ))}
    </div>
  );
}
