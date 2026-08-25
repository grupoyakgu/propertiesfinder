import { DashboardApp } from "@/components/dashboard/dashboard-app";
import { filtersFromSearchParams } from "@/lib/filter-types";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toClientMapPreset } from "@/lib/types";
import { getAppSettings } from "@/lib/app-settings";
import type { MapViewport } from "@/components/dashboard/map-view";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolved = await searchParams;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(resolved)) {
    if (typeof value === "string") params.set(key, value);
    else if (Array.isArray(value) && value[0]) params.set(key, value[0]);
  }

  const initialFilters = filtersFromSearchParams(params);
  const initialMapVisible = params.get("map") === "1";

  const bboxParam = params.get("bbox");
  const bboxParts = bboxParam?.split(",").map(Number);
  let initialMapBounds =
    bboxParts?.length === 4 && bboxParts.every(Number.isFinite)
      ? { south: bboxParts[0], west: bboxParts[1], north: bboxParts[2], east: bboxParts[3] }
      : null;

  // Carried on a genuine "back to search" round trip so the map restores the
  // exact prior view via setView() rather than an approximate fitBounds(bbox)
  // — see MapViewport's own comment. Deliberately NOT gated on bbox being
  // present too: while Map Lock is on, bbox never gets captured (panning
  // doesn't re-scope the results table, by design) but the viewport still
  // does, so this needs to stand on its own rather than requiring both.
  // Number(null) is 0 (not NaN), so parsing an absent param straight through
  // Number() would silently produce a bogus {lat:0,lng:0,zoom:0} viewport
  // (Null Island at the minimum zoom) — hence the explicit has() checks.
  const latParam = params.get("lat");
  const lngParam = params.get("lng");
  const zoomParam = params.get("zoom");
  const lat = latParam !== null ? Number(latParam) : NaN;
  const lng = lngParam !== null ? Number(lngParam) : NaN;
  const zoom = zoomParam !== null ? Number(zoomParam) : NaN;
  const initialMapViewport: MapViewport | null =
    Number.isFinite(lat) && Number.isFinite(lng) && Number.isFinite(zoom) ? { lat, lng, zoom } : null;

  const user = await getCurrentUser();
  // A "Back to search" round-trip carries these in the URL and always wins
  // (it's restoring an exact prior view within this session); otherwise fall
  // back to the user's saved preference from a previous session.
  const initialShowAllOnMap = params.has("showAll") ? params.get("showAll") === "1" : (user?.showAllOnMap ?? false);
  const initialMapLocked = params.has("mapLocked") ? params.get("mapLocked") === "1" : (user?.mapLocked ?? false);
  // Presets and Opportunities are both shared — every signed-in user sees
  // everyone's, not just their own (see /api/map-presets and /api/favorites).
  const [presets, favorites, appSettings] = user
    ? await Promise.all([
        prisma.mapPreset.findMany({
          orderBy: { createdAt: "asc" },
          include: { user: { select: { name: true } } },
        }),
        prisma.favorite.findMany({
          where: { source: "catastro" },
          select: { propertyId: true },
        }),
        getAppSettings(),
      ])
    : [[], [], null];
  const initialPresets = presets.map(toClientMapPreset);
  const initialLikedIds = favorites.map((f) => f.propertyId);
  const initialMaxAnalysisPlots = appSettings?.maxAnalysisPlots ?? 2;

  // A "Back to search" bbox always wins; only fall back to the default preset when
  // no explicit viewport was requested (e.g. a fresh visit to a bare /dashboard URL).
  // Only ever the current user's own default — another user's default preset
  // shouldn't hijack everyone else's landing view now that the list is shared.
  if (!initialMapBounds) {
    const defaultPreset = initialPresets.find((p) => p.isDefault && p.ownerId === user?.id);
    if (defaultPreset) {
      initialMapBounds = {
        south: defaultPreset.south,
        west: defaultPreset.west,
        north: defaultPreset.north,
        east: defaultPreset.east,
      };
    }
  }

  return (
    <DashboardApp
      initialFilters={initialFilters}
      initialMapVisible={initialMapVisible}
      initialShowAllOnMap={initialShowAllOnMap}
      initialMapLocked={initialMapLocked}
      initialMapBounds={initialMapBounds}
      initialMapViewport={initialMapViewport}
      initialPresets={initialPresets}
      initialLikedIds={initialLikedIds}
      initialMaxAnalysisPlots={initialMaxAnalysisPlots}
      currentUserId={user?.id ?? ""}
      isAdmin={user?.isAdmin ?? false}
      canUseAnalysisEngine={user?.permissions.includes("analysis_engine") ?? false}
      canExportPdf={user?.permissions.includes("export_pdf") ?? false}
      canExportXls={user?.permissions.includes("export_xls") ?? false}
    />
  );
}
