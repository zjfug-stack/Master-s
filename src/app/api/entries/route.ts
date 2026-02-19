/**
 * GET  /api/entries        — list all entries
 * POST /api/entries        — create a new entry with picks
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const entries = await prisma.entry.findMany({
      include: {
        user: { select: { name: true, email: true } },
        picks: {
          include: { golfer: { select: { name: true } } },
          orderBy: { slot: "asc" },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ entries });
  } catch (error) {
    console.error("Entries GET error:", error);
    return NextResponse.json({ error: "Failed to fetch entries" }, { status: 500 });
  }
}

interface CreateEntryBody {
  userName: string;
  userEmail: string;
  entryName: string;
  // Array of 5 golfer IDs (from /api/golfers)
  golferIds: string[];
  tiebreaker?: number;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as CreateEntryBody;
    const { userName, userEmail, entryName, golferIds, tiebreaker } = body;

    if (!userName || !userEmail || !entryName) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    if (!Array.isArray(golferIds) || golferIds.length !== 5) {
      return NextResponse.json({ error: "Exactly 5 golfer picks are required" }, { status: 400 });
    }
    if (new Set(golferIds).size !== 5) {
      return NextResponse.json({ error: "Duplicate golfer picks are not allowed" }, { status: 400 });
    }

    // Upsert user
    const user = await prisma.user.upsert({
      where: { email: userEmail },
      update: { name: userName },
      create: { name: userName, email: userEmail },
    });

    // Create entry with picks in a transaction
    const entry = await prisma.$transaction(async (tx) => {
      const newEntry = await tx.entry.create({
        data: {
          name: entryName,
          userId: user.id,
          tiebreaker: tiebreaker ?? null,
        },
      });

      const picks = golferIds.map((golferId, idx) => ({
        entryId: newEntry.id,
        golferId,
        slot: idx + 1,
      }));

      await tx.pick.createMany({ data: picks });

      return newEntry;
    });

    return NextResponse.json({ ok: true, entryId: entry.id }, { status: 201 });
  } catch (error) {
    console.error("Entry POST error:", error);
    return NextResponse.json({ error: "Failed to create entry" }, { status: 500 });
  }
}
