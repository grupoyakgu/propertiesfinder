import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

/** Lightweight companion to GET /api/favorites — just the shared opportunity ids
 * (not scoped to the current user, since opportunities are shared), for seeding
 * "is this an opportunity" checks across cards/tables/map markers without ever
 * needing the full CatastroParcel records those views already have. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const favorites = await prisma.favorite.findMany({
    where: { source: "catastro" },
    select: { propertyId: true },
  });

  return NextResponse.json({ parcelIds: favorites.map((f) => f.propertyId) });
}
