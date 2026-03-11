/**
 * GET /api/entries/[id] — fetch a single entry with picks and payment status
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const entry = await prisma.entry.findUnique({
      where: { id: params.id },
      include: {
        pool: { select: { name: true, venmoHandle: true, entryFeeUsd: true } },
        picks: {
          include: {
            golfer: { select: { name: true } },
            tier: { select: { tierNumber: true, name: true } },
          },
          orderBy: { tier: { tierNumber: "asc" } },
        },
      },
    });

    if (!entry) {
      return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    }

    return NextResponse.json({ entry });
  } catch (error) {
    console.error("Entry GET error:", error);
    return NextResponse.json({ error: "Failed to fetch entry" }, { status: 500 });
  }
}
