import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildCatastroParcelWhere, parseCatastroSort } from "@/lib/catastro-parcel-query";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const where = buildCatastroParcelWhere(searchParams);
  const orderBy = parseCatastroSort(searchParams.get("sort"));

  // Each parcel renders as a Marker plus up to two Polygons (boundary + planning
  // overlay) on the map, with real official cadastral geometry and no clustering.
  // Since the full-city Catastro import (61k+ rows for Sevilla alone), a lightly
  // narrowing filter can still match thousands of rows — mounting that many complex
  // Leaflet layers at once hangs the tab. Capped well below that; the existing
  // "(showing first {n})" UI already communicates the truncation to the user.
  const take = Math.min(Number(searchParams.get("limit")) || 500, 1000);

  const [parcels, total] = await Promise.all([
    prisma.catastroParcel.findMany({ where, orderBy, take }),
    prisma.catastroParcel.count({ where }),
  ]);

  return NextResponse.json({ parcels, count: parcels.length, total });
}
