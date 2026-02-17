import { prisma } from '@/lib/prisma';
import { csvTierImportSchema } from '@/lib/validation';
import { Nav } from '@/components/Nav';

async function importCsv(formData: FormData) {
  'use server';
  const parsed = csvTierImportSchema.parse({ csv: formData.get('csv') });
  const pool = await prisma.pool.findUnique({ where: { year: 2026 }, include: { tiers: true } });
  if (!pool) return;

  const lines = parsed.csv.split('\n').map((line) => line.trim()).filter(Boolean);
  for (const line of lines) {
    const [tierNumRaw, apiPlayerIdRaw, firstNameRaw, lastNameRaw] = line.split(',').map((part) => part?.trim() ?? '');
    const tierNum = Number(tierNumRaw);
    const tier = pool.tiers.find((t) => t.tierNum === tierNum);
    if (!tier) continue;

    let golferId = '';
    if (apiPlayerIdRaw && firstNameRaw && lastNameRaw) {
      const golfer = await prisma.golfer.upsert({
        where: { apiPlayerId: apiPlayerIdRaw },
        update: {
          firstName: firstNameRaw,
          lastName: lastNameRaw,
          displayName: `${firstNameRaw} ${lastNameRaw}`
        },
        create: {
          apiPlayerId: apiPlayerIdRaw,
          firstName: firstNameRaw,
          lastName: lastNameRaw,
          displayName: `${firstNameRaw} ${lastNameRaw}`
        }
      });
      golferId = golfer.id;
    } else {
      const displayName = apiPlayerIdRaw;
      const golfer = await prisma.golfer.create({
        data: {
          apiPlayerId: `placeholder-${Date.now()}-${Math.random()}`,
          firstName: displayName.split(' ')[0] ?? displayName,
          lastName: displayName.split(' ').slice(1).join(' ') || '.',
          displayName
        }
      });
      golferId = golfer.id;
    }

    await prisma.tierGolfer.upsert({
      where: { tierId_golferId: { tierId: tier.id, golferId } },
      update: {},
      create: { tierId: tier.id, golferId }
    });
  }
}

export default async function TiersPage() {
  const tiers = await prisma.tier.findMany({ where: { pool: { year: 2026 } }, include: { tierGolfers: { include: { golfer: true } } }, orderBy: { tierNum: 'asc' } });

  return (
    <div className="space-y-4">
      <Nav />
      <h1 className="text-2xl font-bold">Tiers</h1>
      <form action={importCsv} className="space-y-2">
        <textarea name="csv" rows={6} className="w-full rounded bg-neutral-900 p-2" placeholder="tier_num, api_player_id, first_name, last_name OR tier_num, display_name" />
        <button className="rounded bg-emerald-700 px-4 py-2">Import CSV</button>
      </form>
      {tiers.map((tier) => (
        <div key={tier.id}>
          <h2 className="font-semibold">Tier {tier.tierNum}</h2>
          <ul className="list-disc pl-6">
            {tier.tierGolfers.map((tg) => <li key={tg.id}>{tg.golfer.displayName}</li>)}
          </ul>
        </div>
      ))}
    </div>
  );
}
