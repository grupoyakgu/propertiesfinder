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
  const initialSource = params.get("tab") === "plots" ? "plots" : "catastro";
  const initialMapVisible = params.get("map") === "1";

  const bboxParam = params.get("bbox");
  const bboxParts = bboxParam?.split(",").map(Number);
  let initialMapBounds =
    bboxParts?.length === 4 && bboxParts.every(Number.isFinite)
      ? { south: bboxParts[0], west: bboxParts[1], north: bboxParts[2], east: bboxParts[3] }
      : null;

  const user = await getCurrentUser();
  const presets = user
    ? await prisma.mapPreset.findMany({ where: { userId: user.id }, orderBy: { createdAt: "asc" } })
    : [];
  const initialPresets = presets.map(toClientMapPreset);

  // A "Back to search" bbox always wins; only fall back to the default preset when
  // no explicit viewport was requested (e.g. a fresh visit to a bare /dashboard URL).
  if (!initialMapBounds) {
    const defaultPreset = initialPresets.find((p) => p.isDefault);
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
      initialSource={initialSource}
      initialMapVisible={initialMapVisible}
      initialMapBounds={initialMapBounds}
      initialPresets={initialPresets}
    />
  );
}
