import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildCatastroParcelWhere, parseCatastroSort } from "@/lib/catastro-parcel-query";
import { parsePolygon } from "@/lib/query-helpers";
import { isPointInPolygon } from "@/lib/geo";
import type { CatastroParcel } from "@/generated/prisma/client";
import { toClientCatastroParcel, type ClientCatastroParcel } from "@/lib/types";

// Comment doesn't hold a direct Prisma relation to CatastroParcel (it references
// propertyId as a loose string, like Favorite does — see schema.prisma), so
// "does this parcel have any comments" has to be a separate batched lookup
// rather than a `_count` include. Batched once per page of results rather than
// per-row to avoid an N+1 query.
async function withHasComment(parcels: CatastroParcel[]): Promise<ClientCatastroParcel[]> {
  if (parcels.length === 0) return [];
  const commented = await prisma.comment.findMany({
    where: { source: "catastro", propertyId: { in: parcels.map((p) => p.id) } },
    select: { propertyId: true },
    distinct: ["propertyId"],
  });
  const commentedIds = new Set(commented.map((c) => c.propertyId));
  return parcels.map((p) => ({ ...toClientCatastroParcel(p), hasComment: commentedIds.has(p.id) }));
}

// Above the normal `take` cap — only used as the candidate pool for the exact
// point-in-polygon filter below, never returned as-is. The `where` clause's
// bbox already narrows to the polygon's own bounding box (the client always
// sends both — see dashboard-app.tsx), so this is bounded to that area, not
// the whole table. A polygon whose bbox alone matches more rows than this
// shows a partial total, the same truncation tradeoff plain bbox search
// already has.
const POLYGON_CANDIDATE_CAP = 5000;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const where = buildCatastroParcelWhere(searchParams);
  const orderBy = parseCatastroSort(searchParams.get("sort"));
  const polygon = parsePolygon(searchParams);

  // Each parcel renders as a Marker plus up to two Polygons (boundary + planning
  // overlay) on the map, with real official cadastral geometry and no clustering.
  // Since the full-city Catastro import (61k+ rows for Sevilla alone), a lightly
  // narrowing filter can still match thousands of rows — mounting that many complex
  // Leaflet layers at once hangs the tab. Capped well below that; the existing
  // "(showing first {n})" UI already communicates the truncation to the user.
  const take = Math.min(Number(searchParams.get("limit")) || 500, 1000);

  if (!polygon) {
    const [parcels, total] = await Promise.all([
      prisma.catastroParcel.findMany({ where, orderBy, take }),
      prisma.catastroParcel.count({ where }),
    ]);
    return NextResponse.json({ parcels: await withHasComment(parcels), count: parcels.length, total });
  }

  // No PostGIS in this schema — exact polygon filtering happens here in app
  // code over the bbox-narrowed candidate set fetched above.
  const candidates = await prisma.catastroParcel.findMany({
    where,
    orderBy,
    take: POLYGON_CANDIDATE_CAP,
  });
  const matched = candidates.filter((p) => isPointInPolygon([p.longitude, p.latitude], polygon));
  const page = matched.slice(0, take);

  return NextResponse.json({
    parcels: await withHasComment(page),
    count: Math.min(matched.length, take),
    total: matched.length,
  });
}
