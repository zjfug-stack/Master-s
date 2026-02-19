/**
 * GET /api/golfers
 * Returns the list of golfers available to pick from.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const golfers = await prisma.golfer.findMany({
      orderBy: [{ worldRank: "asc" }, { name: "asc" }],
      select: { id: true, name: true, worldRank: true },
    });

    return NextResponse.json({ golfers });
  } catch (error) {
    console.error("Golfers GET error:", error);
    return NextResponse.json({ error: "Failed to fetch golfers" }, { status: 500 });
  }
}
