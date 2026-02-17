import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { entrySchema } from '@/lib/validation';
import { isLocked } from '@/lib/time';
import { Nav } from '@/components/Nav';

async function submitEntry(formData: FormData) {
  'use server';

  const pool = await prisma.pool.findUnique({ where: { year: 2026 }, include: { tiers: { include: { tierGolfers: { include: { golfer: true } } } } } });
  if (!pool) throw new Error('Pool not configured');
  if (isLocked(pool.lockAtCt)) throw new Error('Entry locked');

  const picks = Array.from({ length: 6 }, (_, i) => ({
    tierNum: i + 1,
    golferId: String(formData.get(`tier_${i + 1}`) ?? '')
  }));

  const parsed = entrySchema.parse({
    purchaserName: formData.get('purchaserName'),
    email: formData.get('email'),
    teamName: formData.get('teamName'),
    tiebreakWinnerScore: formData.get('tiebreakWinnerScore'),
    picks
  });

  const entry = await prisma.entry.create({
    data: {
      poolId: pool.id,
      purchaserName: parsed.purchaserName,
      email: parsed.email,
      teamName: parsed.teamName,
      tiebreakWinnerScore: parsed.tiebreakWinnerScore,
      picks: { createMany: { data: parsed.picks } }
    }
  });

  redirect(`/pay?entryId=${entry.id}`);
}

export default async function EnterPage() {
  const pool = await prisma.pool.findUnique({
    where: { year: 2026 },
    include: { tiers: { include: { tierGolfers: { include: { golfer: true } } }, orderBy: { tierNum: 'asc' } } }
  });

  return (
    <div className="space-y-4">
      <Nav />
      <h1 className="text-3xl font-bold">Enter Pool</h1>
      <form action={submitEntry} className="space-y-4 rounded border border-neutral-800 p-4">
        <input name="purchaserName" placeholder="Your Name" className="w-full rounded bg-neutral-900 p-2" required />
        <input name="email" type="email" placeholder="Email" className="w-full rounded bg-neutral-900 p-2" required />
        <input name="teamName" placeholder="Team Name" className="w-full rounded bg-neutral-900 p-2" required />
        <input name="tiebreakWinnerScore" type="number" placeholder="Winner final score to par" className="w-full rounded bg-neutral-900 p-2" required />
        {pool?.tiers.map((tier) => (
          <label key={tier.id} className="block">
            Tier {tier.tierNum}
            <select name={`tier_${tier.tierNum}`} className="mt-1 w-full rounded bg-neutral-900 p-2" required>
              <option value="">Select golfer</option>
              {tier.tierGolfers.map((tg) => (
                <option key={tg.golferId} value={tg.golferId}>{tg.golfer.displayName}</option>
              ))}
            </select>
          </label>
        ))}
        <button className="rounded bg-emerald-700 px-4 py-2">Submit Entry</button>
      </form>
    </div>
  );
}
