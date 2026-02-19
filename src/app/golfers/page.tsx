import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function GolfersPage() {
  const golfers = await prisma.golfer.findMany({
    orderBy: [{ worldRank: "asc" }, { name: "asc" }],
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-800">Masters Field 2026</h1>
        <p className="text-gray-500 mt-1 text-sm">
          All golfers eligible for selection. World rankings shown where available.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {golfers.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <p className="text-lg font-medium">Field not yet announced.</p>
            <p className="text-sm mt-1">Check back as the tournament approaches.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-[#006747] text-white">
              <tr>
                <th className="px-4 py-3 text-left w-16">Rank</th>
                <th className="px-4 py-3 text-left">Golfer</th>
              </tr>
            </thead>
            <tbody>
              {golfers.map((golfer, idx) => (
                <tr
                  key={golfer.id}
                  className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}
                >
                  <td className="px-4 py-3 text-gray-500">
                    {golfer.worldRank ?? "—"}
                  </td>
                  <td className="px-4 py-3 font-medium">{golfer.name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
