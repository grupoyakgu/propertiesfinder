import { DashboardApp } from "@/components/dashboard/dashboard-app";
import { filtersFromSearchParams } from "@/lib/filter-types";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toClientMapPreset } from "@/lib/types";

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
  const initialShowAllOnMap = params.get("showAll") === "1";

  const bboxParam = params.get("bbox");
  const bboxParts = bboxParam?.split(",").map(Number);
  let initialMapBounds =
    bboxParts?.length === 4 && bboxParts.every(Number.isFinite)
      ? { south: bboxParts[0], west: bboxParts[1], north: bboxParts[2], east: bboxParts[3] }
      : null;

  const user = await getCurrentUser();
  // Presets are shared — every signed-in user sees everyone's saved viewports,
  // not just their own (see /api/map-presets).
  const [presets, favorites] = user
    ? await Promise.all([
        prisma.mapPreset.findMany({
          orderBy: { createdAt: "asc" },
          include: { user: { select: { name: true } } },
        }),
        prisma.favorite.findMany({
          where: { userId: user.id, source: "catastro" },
          select: { propertyId: true },
        }),
      ])
    : [[], []];
  const initialPresets = presets.map(toClientMapPreset);
  const initialLikedIds = favorites.map((f) => f.propertyId);

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
      initialMapBounds={initialMapBounds}
      initialPresets={initialPresets}
      initialLikedIds={initialLikedIds}
      currentUserId={user?.id ?? ""}
      isAdmin={user?.isAdmin ?? false}
      canUseAnalysisEngine={user?.permissions.includes("analysis_engine") ?? false}
      canExportPdf={user?.permissions.includes("export_pdf") ?? false}
    />
  );
}
