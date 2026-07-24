"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Map as MapIcon, MapPinned, Search, SlidersHorizontal, Table2, X } from "lucide-react";
import type { ClientCatastroParcel, ClientMapPreset, ClientPlot } from "@/lib/types";
import type { DashboardFilters } from "@/lib/filter-types";
import { filtersToSearchParams } from "@/lib/filter-types";
import { plotToMarker, catastroParcelToMarker } from "@/lib/map-marker";
import { FiltersSidebar } from "@/components/dashboard/filters-sidebar";
import { PlotCard } from "@/components/dashboard/plot-card";
import { CatastroParcelCard } from "@/components/dashboard/catastro-parcel-card";
import { CatastroResultsTable, PlotResultsTable } from "@/components/dashboard/results-table";
import { PresetsMenu } from "@/components/dashboard/presets-menu";
import { Select } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { LogoutButton } from "@/components/auth/logout-button";
import { LanguageToggle } from "@/components/ui/language-toggle";
import { useLocale } from "@/lib/i18n/context";
import type { BoundsBox, ViewCommand } from "@/components/dashboard/map-view";
import { getCachedDashboardResults, setCachedDashboardResults } from "@/lib/dashboard-cache";

const MapView = dynamic(() => import("@/components/dashboard/map-view").then((m) => m.MapView), {
  ssr: false,
  loading: () => <MapLoadingFallback />,
});

function MapLoadingFallback() {
  const { t } = useLocale();
  return (
    <div className="flex h-full w-full items-center justify-center bg-surface-muted text-sm text-muted-foreground">
      {t("dashboard.loadingMap")}
    </div>
  );
}

type Source = "plots" | "catastro";

export function DashboardApp({
  initialFilters,
  initialSource = "catastro",
  initialMapVisible = false,
  initialMapBounds = null,
  initialPresets = [],
}: {
  initialFilters: DashboardFilters;
  initialSource?: Source;
  initialMapVisible?: boolean;
  initialMapBounds?: BoundsBox | null;
  initialPresets?: ClientMapPreset[];
}) {
  const router = useRouter();
  const { locale, t } = useLocale();
  const [source, setSource] = useState<Source>(initialSource);
  const [filters, setFilters] = useState(initialFilters);

  // If this exact view (tab + filters) was already fetched earlier in this tab —
  // e.g. the user is landing here via "Back to search" — hydrate synchronously from
  // that cache instead of starting from an empty/loading state. This is what avoids
  // the map/list going blank and showing "Searching…" for a beat on every return.
  const [initialCacheKey] = useState(
    () => `${initialSource}:${filtersToSearchParams(initialFilters).toString()}`
  );
  const [initialCached] = useState(() => getCachedDashboardResults(initialCacheKey));

  const [plots, setPlots] = useState<ClientPlot[]>(initialCached?.plots ?? []);
  const [parcels, setParcels] = useState<ClientCatastroParcel[]>(initialCached?.parcels ?? []);
  const [totalCount, setTotalCount] = useState(initialCached?.total ?? 0);
  const [loading, setLoading] = useState(!initialCached);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [mapVisible, setMapVisible] = useState(initialMapVisible);
  const [mapBounds, setMapBounds] = useState<BoundsBox | null>(initialMapBounds);
  // An on-demand "pan/zoom the map to this viewport now" instruction, handed to
  // MapView so it can fit to exactly that instead of (or before) fitting to all
  // markers. Used both to restore a viewport captured on mount (e.g. via "Back to
  // search") and, later, to apply a saved preset at any time. Only valid for the tab
  // it was set for — switching tabs resets it below.
  const [viewCommand, setViewCommand] = useState<ViewCommand | null>(
    source === initialSource && initialMapBounds ? { bounds: initialMapBounds, nonce: 0 } : null
  );
  const [presets, setPresets] = useState<ClientMapPreset[]>(initialPresets);

  const applyPreset = (preset: ClientMapPreset) => {
    const bounds: BoundsBox = { south: preset.south, west: preset.west, north: preset.north, east: preset.east };
    // Presets are meant to behave exactly like a manual pan/zoom: update the bounds
    // filter immediately, and move the map to match — but never force map view open
    // if the user is currently on the table (per the answered design question).
    setMapBounds(bounds);
    setViewCommand({ bounds, nonce: Date.now() });
  };

  const savePreset = async (name: string) => {
    if (!mapBounds) return;
    const res = await fetch("/api/map-presets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, ...mapBounds }),
    });
    if (!res.ok) return;
    const { preset } = await res.json();
    setPresets((prev) => {
      const next = prev.filter((p) => p.id !== preset.id);
      next.push(preset);
      return next;
    });
  };

  const deletePreset = async (id: string) => {
    const res = await fetch(`/api/map-presets/${id}`, { method: "DELETE" });
    if (!res.ok) return;
    setPresets((prev) => prev.filter((p) => p.id !== id));
  };

  const setDefaultPreset = async (id: string) => {
    const res = await fetch(`/api/map-presets/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isDefault: true }),
    });
    if (!res.ok) return;
    setPresets((prev) => prev.map((p) => ({ ...p, isDefault: p.id === id })));
  };

  // Mount the map the first time it's shown, and never unmount it again afterwards
  // (visibility toggles purely via CSS below) so Leaflet keeps its pan/zoom state.
  // This also means the map (and its ~hundreds of markers/polygons) never has to
  // initialize at all for a session that never opens it.
  const [mapMounted, setMapMounted] = useState(false);
  if (mapVisible && !mapMounted) {
    setMapMounted(true);
  }

  const apiQueryString = useMemo(() => filtersToSearchParams(filters).toString(), [filters]);

  // The dashboard's own URL (tab + map visibility + filters), kept in sync below so
  // "Back to search" from a detail page can restore this exact view instead of resetting
  // to the default tab/table. Table vs. map+cards, and which tab, both round-trip through it.
  const viewQueryString = useMemo(() => {
    const params = filtersToSearchParams(filters);
    if (source !== "catastro") params.set("tab", source);
    if (mapVisible) params.set("map", "1");
    if (mapBounds) {
      const { south, west, north, east } = mapBounds;
      params.set("bbox", [south, west, north, east].map((v) => v.toFixed(6)).join(","));
    }
    return params.toString();
  }, [filters, source, mapVisible, mapBounds]);
  const dashboardUrl = `/dashboard${viewQueryString ? `?${viewQueryString}` : ""}`;

  useEffect(() => {
    const cacheKey = `${source}:${apiQueryString}`;
    const handle = setTimeout(async () => {
      // Only show the loading state when we have nothing to show yet. When a cache
      // entry already exists (e.g. this is a "Back to search" landing), keep
      // showing it and silently revalidate in the background instead of flashing
      // to blank. Kept inside the debounce (not before it) so typing a search query
      // still gets the original "no flicker while typing fast" behavior.
      if (!getCachedDashboardResults(cacheKey)) setLoading(true);
      try {
        const endpoint = source === "plots" ? "/api/plots" : "/api/catastro-parcels";
        const res = await fetch(`${endpoint}?${apiQueryString}`);
        const data = await res.json();
        const fetchedPlots: ClientPlot[] = source === "plots" ? (data.plots ?? []) : [];
        const fetchedParcels: ClientCatastroParcel[] = source === "catastro" ? (data.parcels ?? []) : [];
        const total = data.total ?? (source === "plots" ? data.plots?.length : data.parcels?.length) ?? 0;
        if (source === "plots") setPlots(fetchedPlots);
        else setParcels(fetchedParcels);
        setTotalCount(total);
        setCachedDashboardResults(cacheKey, { plots: fetchedPlots, parcels: fetchedParcels, total });
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(handle);
  }, [apiQueryString, source]);

  useEffect(() => {
    const handle = setTimeout(() => {
      // Skip the replace entirely when the URL is already exactly right — e.g. right
      // after landing here via a "Back to search" link, which already encodes this
      // same view. Otherwise every navigation here pays for a second, redundant
      // server round-trip for a no-op URL update (the same page, same query).
      const current = `${window.location.pathname}${window.location.search}`;
      if (current === dashboardUrl) return;
      router.replace(dashboardUrl, { scroll: false });
    }, 300);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dashboardUrl]);

  const fetchedCount = source === "plots" ? plots.length : parcels.length;
  const resultCount = totalCount;
  const truncated = fetchedCount < totalCount;
  const resultLabel =
    t("dashboard.resultsCount", { n: resultCount, plural: resultCount === 1 ? "" : "s" }) +
    (truncated ? t("dashboard.showingFirstN", { n: fetchedCount }) : "");
  // Deliberately NOT dependent on dashboardUrl: that changes on every pan/zoom (it
  // carries the map's bbox), and recomputing this would force every Marker and every
  // boundary/planning Polygon to re-render on every single pan/zoom tick. The "back to
  // search" link is applied separately, at render time, via MapView's `backHref` prop.
  const markers = useMemo(
    () =>
      source === "plots"
        ? plots.map((p) => plotToMarker(p, locale))
        : parcels.map((p) => catastroParcelToMarker(p, locale)),
    [source, plots, parcels, locale]
  );

  // Reset the viewport filter when the data source changes (plots vs. parcels are
  // different datasets). Toggling the map on/off intentionally does NOT reset this,
  // so the map keeps its position and the table keeps reflecting the last pan/zoom.
  const [boundsResetKey, setBoundsResetKey] = useState(source);
  if (boundsResetKey !== source) {
    setBoundsResetKey(source);
    setMapBounds(null);
    setViewCommand(null);
  }

  const visibleIds = useMemo(() => {
    if (!mapBounds) return null;
    const { south, west, north, east } = mapBounds;
    const ids = new Set<string>();
    for (const m of markers) {
      if (m.lat >= south && m.lat <= north && m.lng >= west && m.lng <= east) ids.add(m.id);
    }
    return ids;
  }, [mapBounds, markers]);

  const visiblePlots = useMemo(
    () => (visibleIds ? plots.filter((p) => visibleIds.has(p.id)) : plots),
    [plots, visibleIds]
  );
  const visibleParcels = useMemo(
    () => (visibleIds ? parcels.filter((p) => visibleIds.has(p.id)) : parcels),
    [parcels, visibleIds]
  );
  const inViewCount = source === "plots" ? visiblePlots.length : visibleParcels.length;
  const mapPaneLabel = mapBounds
    ? t("dashboard.inView", { n: inViewCount, total: resultCount })
    : resultLabel;

  return (
    <div className="flex h-screen flex-col">
      <header className="flex items-center gap-4 border-b border-border bg-surface px-4 py-3">
        <Link href="/" className="flex shrink-0 items-center gap-2 text-primary">
          <MapPinned className="h-5 w-5" strokeWidth={1.75} />
          <span className="hidden text-sm font-semibold text-foreground sm:inline">
            {t("brand")}
          </span>
        </Link>

        <div className="flex flex-1 items-center gap-2 rounded-full border border-border bg-background px-3">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            value={filters.q}
            onChange={(e) => setFilters({ ...filters, q: e.target.value })}
            placeholder={t("dashboard.searchPlaceholder")}
            className="h-10 w-full bg-transparent text-sm focus:outline-none"
          />
          {filters.q && (
            <button type="button" onClick={() => setFilters({ ...filters, q: "" })}>
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => setFiltersOpen((o) => !o)}
          className="flex items-center gap-1.5 rounded-full border border-border px-3 py-2 text-xs font-medium text-foreground lg:hidden"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" /> {t("dashboard.filters")}
        </button>

        {source === "plots" && (
          <Select
            value={filters.sort}
            onChange={(e) => setFilters({ ...filters, sort: e.target.value })}
            className="hidden w-44 shrink-0 sm:block"
          >
            <option value="newest">{t("dashboard.sortNewest")}</option>
            <option value="price_asc">{t("dashboard.sortPriceAsc")}</option>
            <option value="price_desc">{t("dashboard.sortPriceDesc")}</option>
            <option value="roi_desc">{t("dashboard.sortRoiDesc")}</option>
            <option value="size_desc">{t("dashboard.sortSizeDesc")}</option>
          </Select>
        )}

        <button
          type="button"
          onClick={() => setMapVisible((v) => !v)}
          className="hidden shrink-0 items-center gap-1.5 rounded-full border border-border px-3 py-2 text-xs font-medium text-foreground sm:flex"
        >
          {mapVisible ? <Table2 className="h-3.5 w-3.5" /> : <MapIcon className="h-3.5 w-3.5" />}
          {mapVisible ? t("dashboard.hideMap") : t("dashboard.showMap")}
        </button>

        <PresetsMenu
          presets={presets}
          canSave={mapBounds != null}
          onApply={applyPreset}
          onSave={savePreset}
          onDelete={deletePreset}
          onSetDefault={setDefaultPreset}
        />

        <LanguageToggle responsive />

        <LogoutButton />
      </header>

      <div className="flex items-center gap-1 border-b border-border bg-surface px-4 py-2">
        {(
          [
            { key: "catastro", label: t("dashboard.tabCatastro") },
            { key: "plots", label: t("dashboard.tabPlots") },
          ] as const
        ).map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setSource(tab.key)}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
              source === tab.key
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-surface-muted"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className={`${filtersOpen ? "block" : "hidden"} lg:block`}>
          <FiltersSidebar filters={filters} onChange={setFilters} mode={source} />
        </div>

        {mapVisible && (
          <div className="flex w-full max-w-md shrink-0 flex-col border-r border-border lg:w-96">
            <div className="border-b border-border px-4 py-3 text-xs text-muted-foreground">
              {loading ? t("dashboard.searching") : mapPaneLabel}
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {source === "plots"
                ? visiblePlots.map((plot) => (
                    <PlotCard
                      key={plot.id}
                      plot={plot}
                      active={hoveredId === plot.id}
                      onHover={setHoveredId}
                      backHref={dashboardUrl}
                    />
                  ))
                : visibleParcels.map((parcel) => (
                    <CatastroParcelCard
                      key={parcel.id}
                      parcel={parcel}
                      active={hoveredId === parcel.id}
                      onHover={setHoveredId}
                      backHref={dashboardUrl}
                    />
                  ))}
              {!loading && resultCount === 0 && (
                <p className="pt-10 text-center text-sm text-muted-foreground">
                  {source === "plots" ? t("dashboard.noPlots") : t("dashboard.noCatastro")}
                </p>
              )}
              {!loading && resultCount > 0 && inViewCount === 0 && mapBounds && (
                <p className="pt-10 text-center text-sm text-muted-foreground">
                  {t("dashboard.noResultsInView")}
                </p>
              )}
            </div>
          </div>
        )}

        {!mapVisible && (
          <div className="flex flex-1 flex-col overflow-hidden">
            <div className="border-b border-border px-4 py-3 text-xs text-muted-foreground">
              {loading ? t("dashboard.searching") : mapPaneLabel}
            </div>
            <div className="flex-1 overflow-auto p-4">
              {loading ? (
                <p className="pt-10 text-center text-sm text-muted-foreground">{t("dashboard.searching")}</p>
              ) : resultCount > 0 && inViewCount === 0 && mapBounds ? (
                <p className="pt-10 text-center text-sm text-muted-foreground">
                  {t("dashboard.noResultsInView")}
                </p>
              ) : source === "plots" ? (
                <PlotResultsTable plots={visiblePlots} backHref={dashboardUrl} />
              ) : (
                <CatastroResultsTable parcels={visibleParcels} backHref={dashboardUrl} />
              )}
            </div>
          </div>
        )}

        {/* Mounted once on first show, then kept mounted (never unmounted again) so
            Leaflet keeps its center/zoom/pan state when toggled off and back on. */}
        {mapMounted && (
          <div className={cn("relative", mapVisible ? "flex-1" : "hidden")}>
            <MapView
              markers={markers}
              hoveredId={hoveredId}
              onBoundsChange={setMapBounds}
              visible={mapVisible}
              viewCommand={viewCommand}
              backHref={dashboardUrl}
            />
          </div>
        )}
      </div>
    </div>
  );
}
