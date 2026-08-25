import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildCatastroParcelWhere, parseCatastroSort } from "@/lib/catastro-parcel-query";
import { parsePolygon, parseBBox } from "@/lib/query-helpers";
import { isPointInPolygon } from "@/lib/geo";
import { pickEvenlySpread } from "@/lib/spatial-sample";
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

// Above the normal `take` cap — used both as the point-in-polygon candidate pool
// and as the lightweight id/lat/lng pool for pickEvenlySpread below, when a plain
// bbox search matches more than `take` rows. Bounded to the bbox area (the
// client always sends one for a map-scoped view — see dashboard-app.tsx), not
// the whole table. A search matching more than this many rows within its bbox
// samples from a partial candidate pool — the same truncation tradeoff plain
// bbox search already has, just applied one step earlier.
const CANDIDATE_CAP = 5000;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const where = buildCatastroParcelWhere(searchParams);
  const orderBy = parseCatastroSort(searchParams.get("sort"));
  const polygon = parsePolygon(searchParams);
  const bbox = parseBBox(searchParams) ?? null;

  // Each parcel renders as a Marker plus up to two Polygons (boundary + planning
  // overlay) on the map, with real official cadastral geometry and no clustering.
  // Since the full-city Catastro import (61k+ rows for Sevilla alone), a lightly
  // narrowing filter can still match thousands of rows — mounting that many complex
  // Leaflet layers at once hangs the tab. Capped well below that; the existing
  // "(showing first {n})" UI already communicates the truncation to the user.
  const take = Math.min(Number(searchParams.get("limit")) || 500, 1000);

  if (!polygon) {
    const total = await prisma.catastroParcel.count({ where });

    if (total <= take) {
      const parcels = await prisma.catastroParcel.findMany({ where, orderBy });
      return NextResponse.json({ parcels: await withHasComment(parcels), count: parcels.length, total });
    }

    // More matches than fit on one page. Sorting by e.g. import date and simply
    // truncating to `take` can return a geographically lopsided subset — an
    // entire dense area (a historic city center, say) can end up completely
    // unrepresented if it wasn't part of whichever batch sorts first, even
    // though thousands of matches exist right there (see pickEvenlySpread's
    // own comment). Sample evenly across the viewport instead, from a bounded
    // lightweight candidate pool.
    const candidates = await prisma.catastroParcel.findMany({
      where,
      select: { id: true, latitude: true, longitude: true },
      take: CANDIDATE_CAP,
    });
    const sampledIds = pickEvenlySpread(candidates, take, bbox);
    const parcels = await prisma.catastroParcel.findMany({ where: { id: { in: sampledIds } }, orderBy });
    return NextResponse.json({ parcels: await withHasComment(parcels), count: parcels.length, total });
  }

  // No PostGIS in this schema — exact polygon filtering happens here in app
  // code over the bbox-narrowed candidate set fetched above.
  const candidates = await prisma.catastroParcel.findMany({
    where,
    orderBy,
    take: CANDIDATE_CAP,
  });
  const matched = candidates.filter((p) => isPointInPolygon([p.longitude, p.latitude], polygon));

  let page: CatastroParcel[];
  if (matched.length <= take) {
    page = matched;
  } else {
    const sampledIds = pickEvenlySpread(matched, take, bbox);
    const byId = new Map(matched.map((p) => [p.id, p]));
    page = sampledIds.map((id) => byId.get(id)!);
  }

  return NextResponse.json({
    parcels: await withHasComment(page),
    count: page.length,
    total: matched.length,
  });
}
