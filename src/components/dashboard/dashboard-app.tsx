"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Map as MapIcon, MapPinned, Search, SlidersHorizontal, Table2, X } from "lucide-react";
import type { ClientCatastroParcel, ClientMapPreset } from "@/lib/types";
import type { DashboardFilters } from "@/lib/filter-types";
import { filtersToSearchParams } from "@/lib/filter-types";
import { catastroParcelToMarker } from "@/lib/map-marker";
import { FiltersSidebar } from "@/components/dashboard/filters-sidebar";
import { CatastroParcelCard } from "@/components/dashboard/catastro-parcel-card";
import { CatastroResultsTable } from "@/components/dashboard/results-table";
import { PresetQuickSwitch } from "@/components/dashboard/preset-quick-switch";
import { PresetSaveControl } from "@/components/dashboard/preset-save-control";
import { PresetSettingsPanel } from "@/components/dashboard/preset-settings-panel";
import { MapDisplaySettings } from "@/components/dashboard/map-display-settings";
import { FavoritesPanel } from "@/components/dashboard/favorites-panel";
import { AnalysisEnginePanel } from "@/components/dashboard/analysis-engine-panel";
import { AdminPanel } from "@/components/dashboard/admin-panel";
import { cn } from "@/lib/utils";
import { LogoutButton } from "@/components/auth/logout-button";
import { LanguageToggle } from "@/components/ui/language-toggle";
import { useLocale } from "@/lib/i18n/context";
import type { BoundsBox, ViewCommand } from "@/components/dashboard/map-view";
import { getCachedDashboardResults, setCachedDashboardResults } from "@/lib/dashboard-cache";

// Shared by the fetch effect and applyPreset so both build the exact same query
// string from the same inputs — the API scopes results to `bounds` server-side
// (large real Catastro datasets can't rely on client-side "in view" filtering over
// whatever page happened to get fetched).
function buildFetchQueryString(filters: DashboardFilters, bounds: BoundsBox | null): string {
  const params = filtersToSearchParams(filters);
  if (bounds) {
    params.set("bbox", [bounds.south, bounds.west, bounds.north, bounds.east].join(","));
  }
  return params.toString();
}

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

/** Shown above the list (card or table) whenever "show all on map" is off, so the
 * user can bulk-manage which properties end up rendered on the map. */
function SelectionToolbar({
  count,
  onSelectAll,
  onClear,
}: {
  count: number;
  onSelectAll: () => void;
  onClear: () => void;
}) {
  const { t } = useLocale();
  return (
    <div className="flex items-center gap-3 border-b border-border bg-surface-muted px-4 py-2 text-xs">
      <span className="font-medium text-foreground">{t("dashboard.selectedCount", { n: count })}</span>
      <button type="button" onClick={onSelectAll} className="font-medium text-primary hover:underline">
        {t("dashboard.selectAll")}
      </button>
      <button type="button" onClick={onClear} className="font-medium text-muted-foreground hover:underline">
        {t("dashboard.clearSelection")}
      </button>
    </div>
  );
}

export function DashboardApp({
  initialFilters,
  initialMapVisible = false,
  initialShowAllOnMap = false,
  initialMapBounds = null,
  initialPresets = [],
  initialLikedIds = [],
  currentUserId = "",
  isAdmin = false,
  canUseAnalysisEngine = false,
  canExportPdf = false,
}: {
  initialFilters: DashboardFilters;
  initialMapVisible?: boolean;
  initialShowAllOnMap?: boolean;
  initialMapBounds?: BoundsBox | null;
  initialPresets?: ClientMapPreset[];
  initialLikedIds?: string[];
  currentUserId?: string;
  isAdmin?: boolean;
  canUseAnalysisEngine?: boolean;
  canExportPdf?: boolean;
}) {
  const router = useRouter();
  const { locale, t } = useLocale();
  const [filters, setFilters] = useState(initialFilters);

  // If this exact view (filters) was already fetched earlier in this tab — e.g. the
  // user is landing here via "Back to search" — hydrate synchronously from that
  // cache instead of starting from an empty/loading state. This is what avoids the
  // map/list going blank and showing "Searching…" for a beat on every return.
  const [initialCacheKey] = useState(() => filtersToSearchParams(initialFilters).toString());
  const [initialCached] = useState(() => getCachedDashboardResults(initialCacheKey));

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
  // search") and, later, to apply a saved preset at any time.
  const [viewCommand, setViewCommand] = useState<ViewCommand | null>(
    initialMapBounds ? { bounds: initialMapBounds, nonce: 0 } : null
  );
  const [presets, setPresets] = useState<ClientMapPreset[]>(initialPresets);
  const [activePresetId, setActivePresetId] = useState<string | null>(null);
  // Preset maintenance (save/star-default/delete) lives in a dedicated Settings tab
  // rather than a popover — a floating dropdown here would sit below Leaflet's own
  // panes/controls in the stacking order and get visually covered by the map.
  const [settingsOpen, setSettingsOpen] = useState(false);
  // Off by default: the map shows only manually-picked properties instead of the
  // full (potentially large) matching set — avoids ever rendering more markers/
  // boundary polygons than the user actually wants to see, and lets them curate the
  // map from the list via checkboxes or a per-row "show on map" jump-to action.
  // Carried in the URL (see viewQueryString below) like mapVisible/mapBounds so it
  // survives a round trip through a property detail page's "Back to search" link —
  // otherwise this setting would silently reset to off every time.
  const [showAllOnMap, setShowAllOnMap] = useState(initialShowAllOnMap);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  // A separate tab (before Settings) that shows every liked property at once —
  // mutually exclusive with normal browsing and Settings.
  const [favoritesOpen, setFavoritesOpen] = useState(false);
  // Another separate tab: the AI-powered urban-planning feasibility engine, run
  // against one of the user's liked properties — mutually exclusive with the rest.
  const [analysisOpen, setAnalysisOpen] = useState(false);
  // Admin-only tab (button isn't even rendered for a non-admin, so this can
  // only become true for one) for managing all users — mutually exclusive with
  // the rest.
  const [adminOpen, setAdminOpen] = useState(false);

  // Switches which of the mutually-exclusive tabs above is open; null means
  // the default Catastro results view.
  const openTab = (tab: "favorites" | "analysis" | "settings" | "admin" | null) => {
    setFavoritesOpen(tab === "favorites");
    setAnalysisOpen(tab === "analysis");
    setSettingsOpen(tab === "settings");
    setAdminOpen(tab === "admin");
  };
  // Seeds every card/table row/map popup's "is this liked" state. Kept centrally so
  // switching between card list, table, and map views (which remount their rows)
  // always renders the current like state instead of resetting to "not liked."
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set(initialLikedIds));

  const toggleLike = (id: string, liked: boolean) => {
    setLikedIds((prev) => {
      const next = new Set(prev);
      if (liked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  // A plain incrementing counter (not Date.now()) so viewCommand's nonce stays a pure
  // value to compute — every "move the map now" action just needs a value guaranteed
  // to differ from the last one applied.
  const nonceRef = useRef(0);
  const nextNonce = () => {
    nonceRef.current += 1;
    return nonceRef.current;
  };

  const applyPreset = (preset: ClientMapPreset) => {
    const bounds: BoundsBox = { south: preset.south, west: preset.west, north: preset.north, east: preset.east };
    // Presets are meant to behave exactly like a manual pan/zoom: update the bounds
    // filter immediately, and move the map to match — but never force map view open
    // if the user is currently on the table (per the answered design question).
    setMapBounds(bounds);
    setViewCommand({ bounds, nonce: nextNonce() });
    setActivePresetId(preset.id);
    // Presets are saved searches, not just saved viewports — restore the location
    // and land-characteristic filters that were active when it was saved too.
    // Older presets saved before this existed have no filters; leave the current
    // search alone in that case.
    if (preset.filters) setFilters(preset.filters);

    // Switching presets moves to a different area entirely, so any manually curated
    // selection (only meaningful when "show all on map" is off) no longer corresponds
    // to anything relevant there — clear it rather than guessing a new one on the
    // user's behalf.
    setSelectedIds(new Set());
  };

  // Jump back to a preset's viewport after the user has panned away from it —
  // deliberately leaves filters untouched (unlike applyPreset), since this is just
  // "take me back to where this preset was pointing," not "re-run this search."
  const refocusPreset = (preset: ClientMapPreset) => {
    const bounds: BoundsBox = { south: preset.south, west: preset.west, north: preset.north, east: preset.east };
    setMapBounds(bounds);
    setViewCommand({ bounds, nonce: nextNonce() });
  };

  // The API returns the raw Prisma row (userId + the joined user.name) rather
  // than the client-facing shape — remap it the same way toClientMapPreset
  // does server-side, so a freshly saved/renamed preset immediately shows up
  // as "own" (rename/delete/star visible) instead of looking unowned until
  // the next full page load.
  const toClientPreset = (raw: {
    id: string;
    name: string;
    south: number;
    west: number;
    north: number;
    east: number;
    isDefault: boolean;
    filters: unknown;
    userId: string;
    user: { name: string };
  }): ClientMapPreset => ({
    id: raw.id,
    name: raw.name,
    south: raw.south,
    west: raw.west,
    north: raw.north,
    east: raw.east,
    isDefault: raw.isDefault,
    filters: raw.filters as ClientMapPreset["filters"],
    ownerId: raw.userId,
    ownerName: raw.user.name,
  });

  const savePreset = async (name: string) => {
    if (!mapBounds) return;
    const res = await fetch("/api/map-presets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, ...mapBounds, filters }),
    });
    if (!res.ok) return;
    const { preset } = await res.json();
    const clientPreset = toClientPreset(preset);
    setPresets((prev) => {
      const next = prev.filter((p) => p.id !== clientPreset.id);
      next.push(clientPreset);
      return next;
    });
    setActivePresetId(clientPreset.id);
  };

  const deletePreset = async (id: string) => {
    const res = await fetch(`/api/map-presets/${id}`, { method: "DELETE" });
    if (!res.ok) return;
    setPresets((prev) => prev.filter((p) => p.id !== id));
    setActivePresetId((current) => (current === id ? null : current));
  };

  const setDefaultPreset = async (id: string, isDefault: boolean) => {
    const res = await fetch(`/api/map-presets/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isDefault }),
    });
    if (!res.ok) return;
    setPresets((prev) =>
      prev.map((p) => (isDefault ? { ...p, isDefault: p.id === id } : p.id === id ? { ...p, isDefault: false } : p))
    );
  };

  const renamePreset = async (id: string, name: string): Promise<{ ok: boolean; error?: string }> => {
    const res = await fetch(`/api/map-presets/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: data.error ?? "Failed to rename preset" };
    const clientPreset = toClientPreset(data.preset);
    setPresets((prev) => prev.map((p) => (p.id === id ? clientPreset : p)));
    return { ok: true };
  };

  // None of these touch viewCommand: a preset (or "Back to search" restore, or
  // "Refocus") establishes a deliberate viewport, and curating the selection within
  // it shouldn't perturb that — the map should keep showing that same area with
  // whichever of its properties are currently checked, not re-fit to a tight box
  // around just the selection. When no viewCommand is active (viewCommand stays null
  // until one of those is used), FitBounds's own fallback already re-fits to
  // whatever's selected on every change, so nothing further is needed here for that
  // case either.
  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  // Mount the map the first time it's shown, and never unmount it again afterwards
  // (visibility toggles purely via CSS below) so Leaflet keeps its pan/zoom state.
  // This also means the map (and its ~hundreds of markers/polygons) never has to
  // initialize at all for a session that never opens it.
  const [mapMounted, setMapMounted] = useState(false);
  if (mapVisible && !mapMounted) {
    setMapMounted(true);
  }

  // Scopes the actual data fetch to the current map viewport (once the user has
  // interacted with the map) in addition to the search filters — see
  // buildFetchQueryString for why this has to happen server-side rather than by
  // filtering whatever page of results happened to get fetched.
  const fetchQueryString = useMemo(() => buildFetchQueryString(filters, mapBounds), [filters, mapBounds]);

  // The dashboard's own URL (map visibility + filters), kept in sync below so
  // "Back to search" from a detail page can restore this exact view instead of resetting
  // to the default table view. Table vs. map+cards round-trips through it.
  const viewQueryString = useMemo(() => {
    const params = filtersToSearchParams(filters);
    if (mapVisible) params.set("map", "1");
    if (showAllOnMap) params.set("showAll", "1");
    if (mapBounds) {
      const { south, west, north, east } = mapBounds;
      params.set("bbox", [south, west, north, east].map((v) => v.toFixed(6)).join(","));
    }
    return params.toString();
  }, [filters, mapVisible, showAllOnMap, mapBounds]);
  const dashboardUrl = `/dashboard${viewQueryString ? `?${viewQueryString}` : ""}`;

  useEffect(() => {
    const cacheKey = fetchQueryString;
    const handle = setTimeout(async () => {
      // Only show the loading state when we have nothing to show yet. When a cache
      // entry already exists (e.g. this is a "Back to search" landing), keep
      // showing it and silently revalidate in the background instead of flashing
      // to blank. Kept inside the debounce (not before it) so typing a search query
      // still gets the original "no flicker while typing fast" behavior.
      if (!getCachedDashboardResults(cacheKey)) setLoading(true);
      try {
        const res = await fetch(`/api/catastro-parcels?${fetchQueryString}`);
        const data = await res.json();
        const fetchedParcels: ClientCatastroParcel[] = data.parcels ?? [];
        const total = data.total ?? fetchedParcels.length ?? 0;
        setParcels(fetchedParcels);
        setTotalCount(total);
        setCachedDashboardResults(cacheKey, { parcels: fetchedParcels, total });
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(handle);
  }, [fetchQueryString]);

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

  const fetchedCount = parcels.length;
  const resultCount = totalCount;
  const truncated = fetchedCount < totalCount;
  const resultLabel =
    t("dashboard.resultsCount", { n: resultCount, plural: resultCount === 1 ? "" : "s" }) +
    (truncated ? t("dashboard.showingFirstN", { n: fetchedCount }) : "");
  // Deliberately NOT dependent on dashboardUrl: that changes on every pan/zoom (it
  // carries the map's bbox), and recomputing this would force every Marker and every
  // boundary Polygon to re-render on every single pan/zoom tick. The "back to
  // search" link is applied separately, at render time, via MapView's `backHref` prop.
  const markers = useMemo(() => parcels.map((p) => catastroParcelToMarker(p, locale)), [parcels, locale]);

  const visibleIds = useMemo(() => {
    if (!mapBounds) return null;
    const { south, west, north, east } = mapBounds;
    const ids = new Set<string>();
    for (const m of markers) {
      if (m.lat >= south && m.lat <= north && m.lng >= west && m.lng <= east) ids.add(m.id);
    }
    return ids;
  }, [mapBounds, markers]);

  const visibleParcels = useMemo(
    () => (visibleIds ? parcels.filter((p) => visibleIds.has(p.id)) : parcels),
    [parcels, visibleIds]
  );
  const inViewCount = visibleParcels.length;
  const mapPaneLabel = mapBounds
    ? t("dashboard.inView", { n: inViewCount, total: resultCount })
    : resultLabel;

  // What actually gets mounted on the Leaflet map: everything currently listed, or —
  // when "show all on map" is off — only the properties the user picked, plus whichever
  // card is currently hovered (so hovering an unselected card previews it on the map for
  // the duration of the hover, then it disappears again on mouse-leave).
  const mapMarkers = useMemo(
    () =>
      showAllOnMap
        ? markers
        : markers.filter((m) => selectedIds.has(m.id) || m.id === hoveredId),
    [markers, showAllOnMap, selectedIds, hoveredId]
  );

  const selectAllVisible = () => {
    setSelectedIds(new Set(visibleParcels.map((p) => p.id)));
  };

  // Reveal a single property on the map: add it to the selection (so it actually
  // renders when "show all on map" is off) and switch to map view if the user is
  // currently on the table. A card can only be clicked from the list that's already
  // scoped to the current map view (or, before any pan/preset, the unscoped full
  // list) — so re-centering/zooming on it here would either do nothing useful or,
  // worse, collapse the viewport (and therefore the table/card scope, and every
  // other selection) down to a tiny box around just this one property. Only pan/zoom
  // when there's no established view yet, or the marker genuinely falls outside it.
  const showPropertyOnMap = (id: string) => {
    const marker = markers.find((m) => m.id === id);
    if (!marker) return;
    setSelectedIds((prev) => new Set(prev).add(id));
    setMapVisible(true);

    const alreadyInView =
      mapBounds != null &&
      marker.lat >= mapBounds.south &&
      marker.lat <= mapBounds.north &&
      marker.lng >= mapBounds.west &&
      marker.lng <= mapBounds.east;
    if (alreadyInView) return;

    const buffer = 0.01;
    setViewCommand({
      bounds: {
        south: marker.lat - buffer,
        north: marker.lat + buffer,
        west: marker.lng - buffer,
        east: marker.lng + buffer,
      },
      nonce: nextNonce(),
    });
  };

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

        <button
          type="button"
          onClick={() => setMapVisible((v) => !v)}
          className="hidden shrink-0 items-center gap-1.5 rounded-full border border-border px-3 py-2 text-xs font-medium text-foreground sm:flex"
        >
          {mapVisible ? <Table2 className="h-3.5 w-3.5" /> : <MapIcon className="h-3.5 w-3.5" />}
          {mapVisible ? t("dashboard.hideMap") : t("dashboard.showMap")}
        </button>

        <PresetQuickSwitch
          presets={presets}
          activePresetId={activePresetId}
          onApply={applyPreset}
          onRefocus={refocusPreset}
        />
        <PresetSaveControl canSave={mapBounds != null} onSave={savePreset} />

        <LanguageToggle responsive />

        <LogoutButton />
      </header>

      <div className="flex items-center gap-1 border-b border-border bg-surface px-4 py-2">
        <button
          type="button"
          onClick={() => openTab(null)}
          className={cn(
            "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
            !settingsOpen && !favoritesOpen && !analysisOpen && !adminOpen
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-surface-muted"
          )}
        >
          {t("dashboard.tabCatastro")}
        </button>
        <button
          type="button"
          onClick={() => openTab("favorites")}
          className={cn(
            "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
            favoritesOpen
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-surface-muted"
          )}
        >
          {t("dashboard.tabFavorites")}
        </button>
        {canUseAnalysisEngine && (
          <button
            type="button"
            onClick={() => openTab("analysis")}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
              analysisOpen
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-surface-muted"
            )}
          >
            {t("dashboard.tabAnalysis")}
          </button>
        )}
        <button
          type="button"
          onClick={() => openTab("settings")}
          className={cn(
            "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
            settingsOpen
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-surface-muted"
          )}
        >
          {t("dashboard.tabSettings")}
        </button>
        {isAdmin && (
          <button
            type="button"
            onClick={() => openTab("admin")}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
              adminOpen
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-surface-muted"
            )}
          >
            {t("dashboard.tabAdmin")}
          </button>
        )}
      </div>

      <div className="flex flex-1 overflow-hidden">
        {settingsOpen ? (
          <div className="flex-1 overflow-y-auto">
            <MapDisplaySettings showAllOnMap={showAllOnMap} onChange={setShowAllOnMap} />
            <PresetSettingsPanel
              presets={presets}
              currentUserId={currentUserId}
              canSave={mapBounds != null}
              onSave={savePreset}
              onDelete={deletePreset}
              onSetDefault={setDefaultPreset}
              onRename={renamePreset}
            />
          </div>
        ) : favoritesOpen ? (
          <FavoritesPanel />
        ) : analysisOpen ? (
          <AnalysisEnginePanel canExportPdf={canExportPdf} />
        ) : adminOpen ? (
          <AdminPanel currentUserId={currentUserId} />
        ) : (
          <div className={`${filtersOpen ? "block" : "hidden"} lg:block`}>
            <FiltersSidebar filters={filters} onChange={setFilters} />
          </div>
        )}

        {!settingsOpen && !favoritesOpen && !analysisOpen && !adminOpen && mapVisible && (
          <div className="flex w-full max-w-md shrink-0 flex-col border-r border-border lg:w-96">
            <div className="border-b border-border px-4 py-3 text-xs text-muted-foreground">
              {loading ? t("dashboard.searching") : mapPaneLabel}
            </div>
            {!showAllOnMap && (
              <SelectionToolbar count={selectedIds.size} onSelectAll={selectAllVisible} onClear={clearSelection} />
            )}
            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {visibleParcels.map((parcel) => (
                <CatastroParcelCard
                  key={parcel.id}
                  parcel={parcel}
                  active={hoveredId === parcel.id}
                  onHover={setHoveredId}
                  backHref={dashboardUrl}
                  selectable={!showAllOnMap}
                  selected={selectedIds.has(parcel.id)}
                  onToggleSelect={() => toggleSelected(parcel.id)}
                  onShowOnMap={() => showPropertyOnMap(parcel.id)}
                  liked={likedIds.has(parcel.id)}
                  onToggleLike={(liked) => toggleLike(parcel.id, liked)}
                />
              ))}
              {!loading && resultCount === 0 && (
                <p className="pt-10 text-center text-sm text-muted-foreground">{t("dashboard.noCatastro")}</p>
              )}
              {!loading && resultCount > 0 && inViewCount === 0 && mapBounds && (
                <p className="pt-10 text-center text-sm text-muted-foreground">
                  {t("dashboard.noResultsInView")}
                </p>
              )}
            </div>
          </div>
        )}

        {!settingsOpen && !favoritesOpen && !analysisOpen && !adminOpen && !mapVisible && (
          <div className="flex flex-1 flex-col overflow-hidden">
            <div className="border-b border-border px-4 py-3 text-xs text-muted-foreground">
              {loading ? t("dashboard.searching") : mapPaneLabel}
            </div>
            {!showAllOnMap && (
              <SelectionToolbar count={selectedIds.size} onSelectAll={selectAllVisible} onClear={clearSelection} />
            )}
            <div className="flex-1 overflow-auto p-4">
              {loading ? (
                <p className="pt-10 text-center text-sm text-muted-foreground">{t("dashboard.searching")}</p>
              ) : resultCount > 0 && inViewCount === 0 && mapBounds ? (
                <p className="pt-10 text-center text-sm text-muted-foreground">
                  {t("dashboard.noResultsInView")}
                </p>
              ) : (
                <CatastroResultsTable
                  parcels={visibleParcels}
                  backHref={dashboardUrl}
                  selectable={!showAllOnMap}
                  selectedIds={selectedIds}
                  onToggleSelect={toggleSelected}
                  onShowOnMap={showPropertyOnMap}
                  likedIds={likedIds}
                  onToggleLike={toggleLike}
                />
              )}
            </div>
          </div>
        )}

        {/* Mounted once on first show, then kept mounted (never unmounted again) so
            Leaflet keeps its center/zoom/pan state when toggled off and back on —
            including while the Settings tab is open, which just hides it via CSS. */}
        {mapMounted && (
          <div
            className={cn(
              "relative",
              !settingsOpen && !favoritesOpen && !analysisOpen && !adminOpen && mapVisible ? "flex-1" : "hidden"
            )}
          >
            <MapView
              markers={mapMarkers}
              hoveredId={hoveredId}
              onBoundsChange={setMapBounds}
              visible={!settingsOpen && !favoritesOpen && !analysisOpen && !adminOpen && mapVisible}
              viewCommand={viewCommand}
              backHref={dashboardUrl}
              likedIds={likedIds}
              onToggleLike={(id, liked) => toggleLike(id, liked)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
