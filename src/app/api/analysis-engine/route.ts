import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { toClientCatastroParcel } from "@/lib/types";
import { runFullAnalysis } from "@/lib/analysis-engine";

// Raise the allowed function duration on platforms that respect it (e.g. Vercel) —
// running two Claude Opus 5 analyses (one of them tool-using) can take a few minutes.
export const maxDuration = 300;

const requestSchema = z.object({
  parcelId: z.string().min(1),
});

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const parcel = await prisma.catastroParcel.findUnique({ where: { id: parsed.data.parcelId } });
  if (!parcel) {
    return NextResponse.json({ error: "Parcel not found" }, { status: 404 });
  }

  const { knowledge, web } = await runFullAnalysis(toClientCatastroParcel(parcel));
  return NextResponse.json({ knowledge, web });
}
