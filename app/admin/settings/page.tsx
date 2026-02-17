import { prisma } from '@/lib/prisma';
import { Nav } from '@/components/Nav';

async function save(formData: FormData) {
  'use server';
  const pool = await prisma.pool.findUnique({ where: { year: 2026 } });
  if (!pool) return;
  await prisma.pool.update({
    where: { id: pool.id },
    data: {
      name: String(formData.get('name') ?? pool.name),
      venmoHandle: String(formData.get('venmoHandle') ?? pool.venmoHandle),
      entryFeeCents: Math.round(Number(formData.get('entryFee') ?? pool.entryFeeCents / 100) * 100),
      mastersParentId: String(formData.get('mastersParentId') ?? '') || null
    }
  });
}

export default async function SettingsPage() {
  const pool = await prisma.pool.findUnique({ where: { year: 2026 } });
  if (!pool) return null;

  return (
    <div className="space-y-4">
      <Nav />
      <h1 className="text-2xl font-bold">Pool Settings</h1>
      <form action={save} className="space-y-3 max-w-lg">
        <input name="name" defaultValue={pool.name} className="w-full rounded bg-neutral-900 p-2" />
        <input name="entryFee" type="number" step="0.01" defaultValue={pool.entryFeeCents / 100} className="w-full rounded bg-neutral-900 p-2" />
        <input name="venmoHandle" defaultValue={pool.venmoHandle} className="w-full rounded bg-neutral-900 p-2" />
        <input name="mastersParentId" defaultValue={pool.mastersParentId ?? ''} className="w-full rounded bg-neutral-900 p-2" placeholder="Masters Parent ID optional" />
        <p className="text-sm text-neutral-300">Ingestion frequency note: configure Vercel Cron every 60-120 seconds during tournament hours.</p>
        <button className="rounded bg-emerald-700 px-4 py-2">Save</button>
      </form>
    </div>
  );
}
