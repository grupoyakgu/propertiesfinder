import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { toClientCatastroParcel } from "@/lib/types";

const toggleSchema = z.object({
  propertyId: z.string().min(1),
});

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const favorites = await prisma.favorite.findMany({
    where: { userId: user.id, source: "catastro" },
    orderBy: { createdAt: "desc" },
  });
  const parcelIds = favorites.map((f) => f.propertyId);

  const parcels = parcelIds.length
    ? await prisma.catastroParcel.findMany({ where: { id: { in: parcelIds } } })
    : [];

  return NextResponse.json({ parcels: parcels.map(toClientCatastroParcel) });
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
  const { propertyId } = parsed.data;

  const existing = await prisma.favorite.findUnique({
    where: { userId_source_propertyId: { userId: user.id, source: "catastro", propertyId } },
  });

  if (existing) {
    await prisma.favorite.delete({ where: { id: existing.id } });
    return NextResponse.json({ liked: false });
  }

  await prisma.favorite.create({ data: { userId: user.id, source: "catastro", propertyId } });
  return NextResponse.json({ liked: true });
}
