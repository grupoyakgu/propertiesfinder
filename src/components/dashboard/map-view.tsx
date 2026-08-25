"use client";

import { useEffect, useMemo, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  WMSTileLayer,
  Marker,
  Popup,
  Polygon,
  Polyline,
  CircleMarker,
  LayersControl,
  useMap,
  useMapEvents,
} from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import L from "leaflet";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { MapMarker } from "@/lib/map-marker";
import { cn, withBackHref } from "@/lib/utils";
import { LikeButton } from "@/components/dashboard/like-button";

// Real cadastral boundary/planning polygons have genuine, often many-vertex
// geometry. Mounting hundreds of them as individual SVG paths at once (e.g. right
// after enabling "show all on map" with a wide, unzoomed viewport) freezes the tab.
// Past this many markers, skip the polygon overlays entirely — they're visually
// meaningless at that scale anyway — and rely on clustered markers instead; they
// reappear automatically once the view narrows (zooming in or applying a preset).
const MAX_POLYGON_MARKERS = 150;

/** Plain (Leaflet-free) representation of a map viewport, so it can be persisted in the
 * URL and used to filter results even before/without the Leaflet map ever mounting. */
export interface BoundsBox {
  south: number;
  west: number;
  north: number;
  east: number;
}

function markerIcon(highlighted: boolean) {
  const color = highlighted ? "#b08d57" : "#0f3d3e";
  return L.divIcon({
    className: "",
    html: `<div style="width:${highlighted ? 18 : 14}px;height:${
      highlighted ? 18 : 14
    }px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.4);"></div>`,
    iconSize: [highlighted ? 18 : 14, highlighted ? 18 : 14],
    iconAnchor: [highlighted ? 9 : 7, highlighted ? 9 : 7],
  });
}

/** An imperative "move the map to this viewport now" instruction. `nonce` must change
 * (e.g. Date.now()) every time the command should be (re-)applied, since applying the
 * same bounds twice in a row (e.g. re-selecting the same preset) needs to still fire.
 * `center`/`zoom` — when both are present — restore the exact prior view via
 * `map.setView()` instead of `map.fitBounds(bounds)`. `fitBounds` only guarantees the
 * bounds are visible, not that it reproduces any particular center/zoom that produced
 * them (it picks whatever integer zoom best fits the box), so a "back to search" round
 * trip using bounds alone can land the user at a visibly different zoom than they left.
 * Presets/drawn areas/etc. only ever have a bounding box (there's no single "the" center
 * and zoom that produced them), so they omit center/zoom and keep using fitBounds. */
export interface ViewCommand {
  bounds: BoundsBox;
  center?: [number, number];
  zoom?: number;
  nonce: number;
}

function FitBounds({
  markers,
  visible,
  viewCommand,
  suppressBoundsChangeRef,
}: {
  markers: MapMarker[];
  visible: boolean;
  /** An on-demand "pan/zoom to this viewport" command (e.g. restoring "back to search"
   * state, or applying a saved preset) — consumed once per distinct nonce. Takes
   * precedence over the fit-to-all-markers fallback whenever it's present. */
  viewCommand?: ViewCommand | null;
  /** Set right before any programmatic map.fitBounds() call, so BoundsTracker can
   * tell "the map just moved because we told it to" apart from a genuine user
   * drag/scroll — both fire the same moveend/zoomend events otherwise. */
  suppressBoundsChangeRef: { current: boolean };
}) {
  const map = useMap();
  // Leaflet can't compute a sane fit against a zero-size (hidden) container, and we
  // don't want every show/hide toggle — or every ordinary pan/zoom-triggered refetch,
  // which almost never returns the exact same set of marker ids twice — to re-fit and
  // fight the user's own navigation. So this fallback only ever fires once per mount
  // (giving a sensible starting viewport the first time results appear), and only
  // once the map is actually visible; every deliberate viewport change afterwards
  // (a preset, "back to search", finishing a draw) goes through viewCommand instead.
  const hasAutoFitted = useRef(false);
  const lastAppliedNonce = useRef<number | null>(null);

  // fitBounds's own moveend/zoomend should never look like the user panned away
  // (e.g. clearing a just-applied polygon filter — see dashboard-app.tsx's
  // handleBoundsChange) — held long enough to cover fitBounds's pan/zoom
  // animation, then released so a genuine subsequent drag reports normally.
  const suppressFor = () => {
    suppressBoundsChangeRef.current = true;
    setTimeout(() => {
      suppressBoundsChangeRef.current = false;
    }, 400);
  };

  useEffect(() => {
    if (!visible) return;

    if (viewCommand) {
      if (viewCommand.nonce === lastAppliedNonce.current) return;
      lastAppliedNonce.current = viewCommand.nonce;
      suppressFor();
      map.invalidateSize();
      if (viewCommand.center && viewCommand.zoom != null) {
        map.setView(viewCommand.center, viewCommand.zoom);
      } else {
        map.fitBounds([
          [viewCommand.bounds.south, viewCommand.bounds.west],
          [viewCommand.bounds.north, viewCommand.bounds.east],
        ]);
      }
      return;
    }

    if (hasAutoFitted.current || markers.length === 0) return;
    hasAutoFitted.current = true;
    suppressFor();
    map.invalidateSize();
    const bounds = L.latLngBounds(markers.map((m) => [m.lat, m.lng]));
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, map, markers, viewCommand]);
  return null;
}

function InvalidateSizeOnShow({ visible }: { visible: boolean }) {
  const map = useMap();
  useEffect(() => {
    if (!visible) return;
    const id = requestAnimationFrame(() => map.invalidateSize());
    return () => cancelAnimationFrame(id);
  }, [visible, map]);
  return null;
}

function toBoundsBox(bounds: L.LatLngBounds): BoundsBox {
  return {
    south: bounds.getSouth(),
    west: bounds.getWest(),
    north: bounds.getNorth(),
    east: bounds.getEast(),
  };
}

/** Leaflet's own native view state — as opposed to `BoundsBox`, which only
 * describes a rectangle results are filtered/queried against. Reported
 * alongside the bounds on every genuine pan/zoom so a "back to search" round
 * trip can restore the exact prior view via `map.setView()` (see
 * ViewCommand's own comment) rather than an approximate `fitBounds(bounds)`. */
export interface MapViewport {
  lat: number;
  lng: number;
  zoom: number;
}

function BoundsTracker({
  onBoundsChange,
  suppressBoundsChangeRef,
}: {
  onBoundsChange: (bounds: BoundsBox, viewport: MapViewport) => void;
  /** Set by FitBounds while a programmatic fitBounds() is in flight — skip
   * reporting those moves as if the user had genuinely panned/zoomed. */
  suppressBoundsChangeRef: { current: boolean };
}) {
  const map = useMapEvents({
    moveend: () => report(),
    zoomend: () => report(),
  });
  const report = () => {
    if (suppressBoundsChangeRef.current) return;
    const center = map.getCenter();
    onBoundsChange(toBoundsBox(map.getBounds()), { lat: center.lat, lng: center.lng, zoom: map.getZoom() });
  };
  return null;
}

/** Renders the in-progress hand-drawn polygon (dashed outline + a dot per vertex)
 * and adds a vertex on every map click while `active` — fully controlled from the
 * parent (dashboard-app.tsx owns `points`), matching how the rest of this map's
 * state already works, so "Finish"/"Cancel" controls can live in the app's own
 * header/toolbar instead of fighting Leaflet's control positioning. */
function DrawPolygonOverlay({
  active,
  points,
  onAddPoint,
}: {
  active: boolean;
  /** [lat, lng] pairs, Leaflet order — converted to GeoJSON [lng, lat] only once
   * the polygon is finished (see dashboard-app.tsx's finishDrawing). */
  points: [number, number][];
  onAddPoint: (latlng: [number, number]) => void;
}) {
  useMapEvents({
    click: (e) => {
      if (active) onAddPoint([e.latlng.lat, e.latlng.lng]);
    },
  });

  if (points.length === 0) return null;

  return (
    <>
      <Polyline
        positions={points.length > 2 ? [...points, points[0]] : points}
        pathOptions={{ color: "#b08d57", weight: 2, dashArray: "6 5" }}
      />
      {points.map((p, i) => (
        <CircleMarker
          key={i}
          center={p}
          radius={4}
          pathOptions={{ color: "#b08d57", fillColor: "#b08d57", fillOpacity: 1 }}
        />
      ))}
    </>
  );
}

export function MapView({
  markers,
  hoveredId,
  onBoundsChange,
  visible = true,
  viewCommand,
  backHref,
  likedIds,
  onToggleLike,
  drawMode = false,
  drawnPoints = [],
  onAddDrawPoint,
}: {
  markers: MapMarker[];
  hoveredId: string | null;
  onBoundsChange?: (bounds: BoundsBox, viewport: MapViewport) => void;
  visible?: boolean;
  /** An on-demand "pan/zoom to this viewport" command — used both to restore a
   * previously-saved viewport (e.g. from the URL on mount) and to apply a saved preset
   * at any later time. */
  viewCommand?: ViewCommand | null;
  /** Applied to marker links at render/click time (not baked into `markers`) so
   * panning/zooming — which changes this as the URL's bbox updates — never forces
   * the marker/polygon list itself to be recomputed and re-rendered. */
  backHref?: string;
  likedIds?: Set<string>;
  onToggleLike?: (id: string, liked: boolean) => void;
  /** While true, clicking the map adds a vertex (via onAddDrawPoint) instead of
   * its normal behavior — see dashboard-app.tsx's drawMode/drawnPoints state. */
  drawMode?: boolean;
  drawnPoints?: [number, number][];
  onAddDrawPoint?: (latlng: [number, number]) => void;
}) {
  const router = useRouter();
  const suppressBoundsChangeRef = useRef(false);
  // Lets the hover-highlight effect below find a given marker's actual Leaflet
  // layer (to ask the cluster group what currently contains it) and the cluster
  // group instance itself, without triggering any re-render on hover — both are
  // populated via ref callbacks on the Markers/MarkerClusterGroup further down.
  const clusterGroupRef = useRef<L.MarkerClusterGroup | null>(null);
  const markerLayersById = useRef<Map<string, L.Marker>>(new Map());

  // When the hovered property is currently folded into an unspiderfied cluster
  // bubble (rather than rendered as its own pin), highlighting the individual
  // marker (see markerIcon above) does nothing visible — the cluster icon is
  // all that's on screen. Ask leaflet.markercluster which visible layer
  // currently represents the hovered marker and, if that's a cluster rather
  // than the marker itself, add a CSS class to its DOM element for the
  // duration of the hover so the user can still see where it is.
  useEffect(() => {
    const clusterGroup = clusterGroupRef.current;
    if (!clusterGroup || !hoveredId) return;
    const markerLayer = markerLayersById.current.get(hoveredId);
    if (!markerLayer) return;
    const visibleParent = clusterGroup.getVisibleParent(markerLayer);
    if (!visibleParent || visibleParent === markerLayer) return;
    const el = visibleParent.getElement();
    el?.classList.add("marker-cluster-highlighted");
    return () => {
      el?.classList.remove("marker-cluster-highlighted");
    };
  }, [hoveredId]);

  const restoreBounds = viewCommand?.bounds;
  const center: [number, number] = restoreBounds
    ? [(restoreBounds.south + restoreBounds.north) / 2, (restoreBounds.west + restoreBounds.east) / 2]
    : markers.length > 0
      ? [markers[0].lat, markers[0].lng]
      : [40.4168, -3.7038];

  // Precomputed once per `markers` change (not on every render — MapView re-renders on
  // every pan/zoom because of `backHref`/hoveredId) so panning a map with hundreds of
  // parcel boundaries doesn't re-derive and redraw every polygon on every tick.
  const boundaryPolygons = useMemo(
    () =>
      markers.length > MAX_POLYGON_MARKERS
        ? []
        : markers
            .filter((m) => m.boundary)
            .map((m) => (
              <Polygon
                key={`boundary-${m.id}`}
                positions={m.boundary!.coordinates[0].map(([lng, lat]) => [lat, lng])}
                pathOptions={{ color: "#0f3d3e", weight: 1.5, fillOpacity: 0.05 }}
              />
            )),
    [markers]
  );
  return (
    <MapContainer
      center={center}
      zoom={6}
      scrollWheelZoom
      preferCanvas
      className={cn("h-full w-full", drawMode && "cursor-crosshair")}
    >
      <LayersControl position="topright">
        <LayersControl.BaseLayer checked name="Street">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
        </LayersControl.BaseLayer>
        <LayersControl.BaseLayer name="Satellite">
          <TileLayer
            attribution="Tiles &copy; Esri"
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          />
        </LayersControl.BaseLayer>

        <LayersControl.Overlay name="Cadastre overlay">
          <WMSTileLayer
            url="https://ovc.catastro.meh.es/Cartografia/WMS/ServidorWMS.aspx"
            layers="Catastro"
            format="image/png"
            transparent
            version="1.1.1"
            attribution="Cadastre: Sede Electrónica del Catastro"
            opacity={0.6}
          />
        </LayersControl.Overlay>

        <LayersControl.Overlay checked name="Parcel boundaries">
          <>{boundaryPolygons}</>
        </LayersControl.Overlay>
      </LayersControl>

      <FitBounds
        markers={markers}
        visible={visible}
        viewCommand={viewCommand}
        suppressBoundsChangeRef={suppressBoundsChangeRef}
      />
      <InvalidateSizeOnShow visible={visible} />
      {onBoundsChange && (
        <BoundsTracker onBoundsChange={onBoundsChange} suppressBoundsChangeRef={suppressBoundsChangeRef} />
      )}
      {onAddDrawPoint && (
        <DrawPolygonOverlay active={drawMode} points={drawnPoints} onAddPoint={onAddDrawPoint} />
      )}

      {/* Clustering keeps large marker counts (e.g. a wide, unzoomed "show all on
          map" view) from mounting hundreds of individual pins at once — nearby
          markers group into a single bubble until the user zooms in. chunkedLoading
          spreads that initial mount across animation frames instead of doing it all
          synchronously, which is what actually caused the tab to hang. */}
      <MarkerClusterGroup ref={clusterGroupRef} chunkedLoading maxClusterRadius={60}>
        {markers.map((marker) => (
          <Marker
            key={marker.id}
            ref={(instance) => {
              if (instance) markerLayersById.current.set(marker.id, instance);
              else markerLayersById.current.delete(marker.id);
            }}
            position={[marker.lat, marker.lng]}
            icon={markerIcon(hoveredId === marker.id)}
            eventHandlers={{ click: () => router.prefetch(withBackHref(marker.href, backHref)) }}
          >
            <Popup>
              <div className="min-w-[200px] space-y-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold">{marker.title}</p>
                  <LikeButton
                    propertyId={marker.id}
                    initialLiked={likedIds?.has(marker.id) ?? false}
                    onToggle={(liked) => onToggleLike?.(marker.id, liked)}
                  />
                </div>
                <p className="text-xs text-gray-500">{marker.subtitle}</p>
                <p className="text-xs">
                  {marker.areaLabel} &middot; {marker.badge}
                </p>
                <Link href={withBackHref(marker.href, backHref)} className="text-xs font-medium text-emerald-800 underline">
                  View details →
                </Link>
              </div>
            </Popup>
          </Marker>
        ))}
      </MarkerClusterGroup>
    </MapContainer>
  );
}
