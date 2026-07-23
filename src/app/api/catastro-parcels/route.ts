import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildCatastroParcelWhere, parseCatastroSort } from "@/lib/catastro-parcel-query";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const where = buildCatastroParcelWhere(searchParams);
  const orderBy = parseCatastroSort(searchParams.get("sort"));

  const take = Math.min(Number(searchParams.get("limit")) || 100, 200);

  const parcels = await prisma.catastroParcel.findMany({
    where,
    orderBy,
    take,
  });

  return NextResponse.json({ parcels, count: parcels.length });
}
