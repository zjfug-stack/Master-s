import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

interface EntryScore {
  id: string;
  name: string;
  userName: string;
  totalScore: number;
  picks: string[];
}

async function getPoolLeaderboard(): Promise<EntryScore[]> {
  const entries = await prisma.entry.findMany({
    include: {
      user: true,
      picks: {
        include: { golfer: true },
        orderBy: { slot: "asc" },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return entries.map((entry) => ({
    id: entry.id,
    name: entry.name,
    userName: entry.user.name,
    // Scoring will be filled in once the tournament starts and scores are cached
    totalScore: 0,
    picks: entry.picks.map((p) => p.golfer.name),
  }));
}

export default async function HomePage() {
  const entries = await getPoolLeaderboard();

  return (
    <div className="space-y-8">
      {/* Hero banner */}
      <section className="rounded-2xl bg-[#006747] text-white p-8 text-center shadow-lg">
        <h1 className="text-4xl font-bold mb-2">2026 Masters Tournament</h1>
        <p className="text-[#FFCD00] text-lg font-medium">Fantasy Pool Leaderboard</p>
        <p className="mt-3 text-green-100 text-sm">
          Augusta National Golf Club &bull; April 9–12, 2026
        </p>
      </section>

      {/* Pool leaderboard */}
      <section>
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Pool Standings</h2>

        {entries.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-500">
            <p className="text-lg font-medium">No entries yet.</p>
            <p className="text-sm mt-1">Picks open closer to the tournament. Check back soon!</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-[#006747] text-white">
                <tr>
                  <th className="px-4 py-3 text-left w-12">Pos</th>
                  <th className="px-4 py-3 text-left">Entry</th>
                  <th className="px-4 py-3 text-left">Owner</th>
                  <th className="px-4 py-3 text-left">Picks</th>
                  <th className="px-4 py-3 text-right">Score</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry, idx) => (
                  <tr
                    key={entry.id}
                    className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}
                  >
                    <td className="px-4 py-3 font-semibold text-gray-600">{idx + 1}</td>
                    <td className="px-4 py-3 font-medium">{entry.name}</td>
                    <td className="px-4 py-3 text-gray-600">{entry.userName}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {entry.picks.length > 0
                        ? entry.picks.join(", ")
                        : <span className="italic">No picks yet</span>}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-semibold">
                      {entry.totalScore === 0 ? "E" : entry.totalScore > 0 ? `+${entry.totalScore}` : entry.totalScore}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* How it works */}
      <section className="grid md:grid-cols-3 gap-6">
        {[
          {
            title: "Make Your Picks",
            desc: "Select 5 golfers from the Masters field. Your score is the sum of your best 4 scores.",
          },
          {
            title: "Live Scoring",
            desc: "Scores update throughout the tournament via Sportradar's official golf API.",
          },
          {
            title: "Win the Pool",
            desc: "Lowest combined score wins. Tiebreaker goes to the closest predicted winning score.",
          },
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
