import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function GolfersPage() {
  const pool = await prisma.pool.findUnique({
    where: { year: 2026 },
    include: {
      tiers: {
        orderBy: { tierNumber: "asc" },
        include: {
          tierGolfers: {
            include: {
              golfer: { select: { id: true, name: true, worldRank: true } },
            },
            orderBy: { golfer: { worldRank: "asc" } },
          },
        },
      },
    },
  });

  const tiers = pool?.tiers ?? [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-800">Masters Field 2026</h1>
        <p className="text-gray-500 mt-1 text-sm">
          Golfers grouped by tier. Pick one from each tier when submitting your entry.
        </p>
      </div>

      {tiers.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
          <p className="text-lg font-medium">Field not yet announced.</p>
          <p className="text-sm mt-1">Check back as the tournament approaches.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {tiers.map((tier) => (
            <div
              key={tier.id}
              className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
            >
              <div className="bg-[#006747] text-white px-4 py-3">
                <h2 className="font-bold">{tier.name}</h2>
              </div>

              {tier.tierGolfers.length === 0 ? (
                <p className="px-4 py-6 text-sm text-gray-400 italic">No golfers assigned yet.</p>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {tier.tierGolfers.map(({ golfer }) => (
                    <li key={golfer.id} className="px-4 py-2 flex justify-between text-sm">
                      <span className="font-medium">{golfer.name}</span>
                      <span className="text-gray-400">
                        {golfer.worldRank != null ? `#${golfer.worldRank}` : "—"}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
