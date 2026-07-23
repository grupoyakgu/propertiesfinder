import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildCatastroParcelWhere, parseCatastroSort } from "@/lib/catastro-parcel-query";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const where = buildCatastroParcelWhere(searchParams);
  const orderBy = parseCatastroSort(searchParams.get("sort"));

  const take = Math.min(Number(searchParams.get("limit")) || 2000, 5000);

  const [parcels, total] = await Promise.all([
    prisma.catastroParcel.findMany({ where, orderBy, take }),
    prisma.catastroParcel.count({ where }),
  ]);

  return NextResponse.json({ parcels, count: parcels.length, total });
}
