import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

interface PickRow { tierNumber: number; golferName: string; score: number | null; }
interface EntryRow { id: string; teamName: string; purchaserName: string; picks: PickRow[]; totalScore: number | null; }

async function getPoolLeaderboard(): Promise<EntryRow[]> {
  const pool = await prisma.pool.findUnique({
    where: { year: 2026 },
    include: {
      entries: {
        include: {
          picks: {
            include: {
              golfer: { select: { id: true, name: true } },
              tier: { select: { tierNumber: true } },
            },
            orderBy: { tier: { tierNumber: "asc" } },
          },
        },
        orderBy: { createdAt: "asc" },
      },
      liveScores: { select: { golferId: true, totalScore: true } },
    },
  });

  if (!pool) return [];

  const scoreMap = new Map(pool.liveScores.map((s) => [s.golferId, s.totalScore]));

  return pool.entries.map((entry) => {
    const picks: PickRow[] = entry.picks.map((p) => ({
      tierNumber: p.tier.tierNumber,
      golferName: p.golfer.name,
      score: scoreMap.get(p.golferId) ?? null,
    }));
    const scores = picks.map((p) => p.score).filter((s): s is number => s !== null);
    return {
      id: entry.id,
      teamName: entry.teamName,
      purchaserName: entry.purchaserName,
      picks,
      totalScore: scores.length > 0 ? scores.reduce((a, b) => a + b, 0) : null,
    };
  }).sort((a, b) => {
    if (a.totalScore === null && b.totalScore === null) return 0;
    if (a.totalScore === null) return 1;
    if (b.totalScore === null) return -1;
    return a.totalScore - b.totalScore;
  });
}

function fmtScore(s: number | null) {
  if (s === null) return "—";
  if (s === 0) return "E";
  return s > 0 ? `+${s}` : String(s);
}

export default async function HomePage() {
  const entries = await getPoolLeaderboard();

  return (
    <div className="space-y-8">
      <section className="rounded-2xl bg-[#006747] text-white p-8 text-center shadow-lg">
        <h1 className="text-4xl font-bold mb-2">Masters Pool 2026</h1>
        <p className="text-[#FFCD00] text-lg font-medium">Masters Tournament Fantasy Pool Leaderboard</p>
        <p className="mt-3 text-green-100 text-sm">Augusta National Golf Club &bull; April 9–12, 2026</p>
      </section>

      <section>
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Pool Standings</h2>
        {entries.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-500">
            <p className="text-lg font-medium">No entries yet.</p>
            <p className="text-sm mt-1">
              <a href="/enter" className="text-[#006747] font-semibold underline">Enter the pool</a> before picks lock.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-[#006747] text-white">
                <tr>
                  <th className="px-4 py-3 text-left w-10">Pos</th>
                  <th className="px-4 py-3 text-left">Team</th>
                  <th className="px-4 py-3 text-left hidden sm:table-cell">Entrant</th>
                  <th className="px-4 py-3 text-left hidden md:table-cell">Picks (T1–T6)</th>
                  <th className="px-4 py-3 text-right">Score</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry, idx) => (
                  <tr key={entry.id} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                    <td className="px-4 py-3 font-semibold text-gray-500">{idx + 1}</td>
                    <td className="px-4 py-3 font-medium">{entry.teamName}</td>
                    <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">{entry.purchaserName}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs hidden md:table-cell">
                      {entry.picks.map((p) => `${p.golferName} (${fmtScore(p.score)})`).join(", ")}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold">{fmtScore(entry.totalScore)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="grid md:grid-cols-3 gap-6">
        {[
          { title: "Pick One Per Tier", desc: "Choose one golfer from each of the 6 tiers. All 6 picks count toward your total." },
          { title: "Live Scoring", desc: "Scores update throughout the tournament via Sportradar's official golf API." },
          { title: "Win the Pool", desc: "Lowest combined score wins. Tiebreaker: closest predicted winning score." },
        ].map((item) => (
          <div key={item.title} className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h3 className="font-bold text-[#006747] mb-2">{item.title}</h3>
            <p className="text-gray-600 text-sm leading-relaxed">{item.desc}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
