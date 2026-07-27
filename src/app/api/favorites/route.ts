import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { toClientCatastroParcel, toClientOpportunity, type ClientOpportunity } from "@/lib/types";

const toggleSchema = z.object({
  propertyId: z.string().min(1),
});

// Opportunities are shared: every signed-in user sees the same list (not just
// their own), enriched with each one's status and current assignee — see the
// Favorite model's comment in schema.prisma.
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const favorites = await prisma.favorite.findMany({
    where: { source: "catastro" },
    orderBy: { createdAt: "desc" },
    include: { assignedUser: { select: { name: true } } },
  });
  const parcelIds = favorites.map((f) => f.propertyId);

  const parcels = parcelIds.length
    ? await prisma.catastroParcel.findMany({ where: { id: { in: parcelIds } } })
    : [];
  const parcelById = new Map(parcels.map((p) => [p.id, toClientCatastroParcel(p)]));

  const opportunities = favorites
    .map((favorite) => {
      const parcel = parcelById.get(favorite.propertyId);
      return parcel ? toClientOpportunity(favorite, parcel) : null;
    })
    .filter((o): o is ClientOpportunity => o !== null);

  return NextResponse.json({ opportunities });
}

// Full toggle: liking a property not yet on the shared list adds it (the
// liker becomes its owner); liking one already on the list removes it
// outright — anyone can remove any opportunity this way, regardless of who
// it's currently assigned to.
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
    where: { source_propertyId: { source: "catastro", propertyId } },
  });

  if (existing) {
    await prisma.favorite.delete({ where: { id: existing.id } });
    return NextResponse.json({ liked: false });
  }

  await prisma.favorite.create({ data: { assignedUserId: user.id, source: "catastro", propertyId } });
  return NextResponse.json({ liked: true });
}
