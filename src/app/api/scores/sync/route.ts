/**
 * POST /api/scores/sync
 * Fetches live scores from Sportradar and caches them in the DB.
 * Must be called from a server-side cron or protected webhook — never client-side.
 *
 * Protect with a shared secret: Authorization: Bearer <CRON_SECRET>
 */
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getMastersLeaderboard } from "@/lib/sportradar";

export const dynamic = "force-dynamic";

const TOURNAMENT_ID = process.env.SPORTRADAR_TOURNAMENT_ID ?? "sr:tournament:masters2026";
const CACHE_TTL_SECONDS = 90; // cache for 90 seconds

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false; // require secret in prod
  const auth = req.headers.get("authorization") ?? "";
  return auth === `Bearer ${secret}`;
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const leaderboard = await getMastersLeaderboard(TOURNAMENT_ID);

    const expiresAt = new Date(Date.now() + CACHE_TTL_SECONDS * 1000);

    const jsonData = JSON.parse(JSON.stringify(leaderboard)) as Prisma.InputJsonValue;

    await prisma.tournamentCache.upsert({
      where: { key: "masters-2026-leaderboard" },
      update: {
        data: jsonData,
        fetchedAt: new Date(),
        expiresAt,
      },
      create: {
        key: "masters-2026-leaderboard",
        data: jsonData,
        expiresAt,
      },
    });

    // Also upsert golfers so our DB stays current with Sportradar IDs
    for (const g of leaderboard.golfers) {
      if (!g.id) continue;
      await prisma.golfer.upsert({
        where: { sportradarId: g.id },
        update: { name: g.name },
        create: { name: g.name, sportradarId: g.id },
      });
    }

    return NextResponse.json({
      ok: true,
      cachedGolfers: leaderboard.golfers.length,
      round: leaderboard.round,
      status: leaderboard.status,
    });
  } catch (error) {
    console.error("Score sync error:", error);
    return NextResponse.json(
      { error: "Score sync failed" },
      { status: 500 }
    );
  }
}
