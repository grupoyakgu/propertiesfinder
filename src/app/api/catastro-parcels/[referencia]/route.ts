import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/catastro-parcels/[referencia]">
) {
  const { referencia } = await ctx.params;
  const parcel = await prisma.catastroParcel.findUnique({
    where: { referenciaCatastral: referencia },
  });

  if (!parcel) {
    return NextResponse.json({ error: "Catastro parcel not found" }, { status: 404 });
  }

  return NextResponse.json({ parcel });
}
