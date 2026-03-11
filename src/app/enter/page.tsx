/**
 * /enter — server component
 * Loads pool config + tiers, enforces lock, renders EnterForm.
 */
import { prisma } from "@/lib/prisma";
import EnterForm from "./EnterForm";

export const dynamic = "force-dynamic";

function formatCT(date: Date): string {
  return date.toLocaleString("en-US", {
    timeZone: "America/Chicago",
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

export default async function EnterPage() {
  const pool = await prisma.pool.findUnique({
    where: { year: 2026 },
    include: {
      tiers: {
        orderBy: { tierNumber: "asc" },
        include: {
          tierGolfers: {
            include: { golfer: { select: { id: true, name: true, worldRank: true } } },
            orderBy: { golfer: { worldRank: "asc" } },
          },
        },
      },
    },
  });

  if (!pool) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center text-gray-500">
        <p className="text-lg font-medium">Pool not set up yet.</p>
        <p className="text-sm mt-1">Check back soon.</p>
      </div>
    );
  }

  const isLocked = pool.lockAtCt ? new Date() > pool.lockAtCt : false;

  if (isLocked) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center space-y-4">
        <div className="text-5xl">🔒</div>
        <h1 className="text-3xl font-bold text-gray-800">Picks Are Locked</h1>
        <p className="text-gray-500">
          Submissions closed{" "}
          {pool.lockAtCt ? (
            <span className="font-medium text-gray-700">{formatCT(pool.lockAtCt)}</span>
          ) : (
            "before the tournament started"
          )}
          .
        </p>
        <p className="text-gray-400 text-sm">
          Check the <a href="/" className="text-[#006747] underline font-medium">leaderboard</a> to follow the action.
        </p>
      </div>
    );
  }

  const tiers = pool.tiers.map((t) => ({
    id: t.id,
    tierNumber: t.tierNumber,
    name: t.name,
    golfers: t.tierGolfers.map((tg) => tg.golfer),
  }));

  return (
    <EnterForm
      tiers={tiers}
      lockAtLabel={pool.lockAtCt ? formatCT(pool.lockAtCt) : null}
      entryFeeUsd={pool.entryFeeUsd}
    />
  );
}
