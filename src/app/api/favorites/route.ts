import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { toClientPlot, toClientCatastroParcel } from "@/lib/types";

const toggleSchema = z.object({
  source: z.enum(["plots", "catastro"]),
  propertyId: z.string().min(1),
});

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const favorites = await prisma.favorite.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });
  const plotIds = favorites.filter((f) => f.source === "plots").map((f) => f.propertyId);
  const parcelIds = favorites.filter((f) => f.source === "catastro").map((f) => f.propertyId);

  const [plotRows, parcelRows] = await Promise.all([
    plotIds.length ? prisma.plot.findMany({ where: { id: { in: plotIds } } }) : Promise.resolve([]),
    parcelIds.length
      ? prisma.catastroParcel.findMany({ where: { id: { in: parcelIds } } })
      : Promise.resolve([]),
  ]);

  return NextResponse.json({
    plots: plotRows.map(toClientPlot),
    parcels: parcelRows.map(toClientCatastroParcel),
  });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = toggleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }
  const { source, propertyId } = parsed.data;

  const existing = await prisma.favorite.findUnique({
    where: { userId_source_propertyId: { userId: user.id, source, propertyId } },
  });

  if (existing) {
    await prisma.favorite.delete({ where: { id: existing.id } });
    return NextResponse.json({ liked: false });
  }

  await prisma.favorite.create({ data: { userId: user.id, source, propertyId } });
  return NextResponse.json({ liked: true });
}
