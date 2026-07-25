import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

/** Lightweight companion to GET /api/favorites — just the liked ids, for seeding
 * "is this liked" checks across cards/tables/map markers without ever needing the
 * full CatastroParcel records those views already have. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const favorites = await prisma.favorite.findMany({
    where: { userId: user.id, source: "catastro" },
    select: { propertyId: true },
  });

  return NextResponse.json({ parcelIds: favorites.map((f) => f.propertyId) });
}
