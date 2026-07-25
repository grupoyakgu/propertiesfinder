"use client";

import { useEffect, useMemo, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  WMSTileLayer,
  Marker,
  Popup,
  Polygon,
  LayersControl,
  useMap,
  useMapEvents,
} from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import L from "leaflet";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { MapMarker } from "@/lib/map-marker";
import { formatCurrency, withBackHref } from "@/lib/utils";
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

const planningColors: Record<string, string> = {
  URBAN: "#0f3d3e",
  DEVELOPABLE: "#2f6f63",
  RURAL: "#8a8f5c",
  PROTECTED: "#b3402f",
  HISTORIC: "#b08d57",
};
const defaultPlanningColor = "#0f3d3e";

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
 * same bounds twice in a row (e.g. re-selecting the same preset) needs to still fire. */
export interface ViewCommand {
  bounds: BoundsBox;
  nonce: number;
}

function FitBounds({
  markers,
  visible,
  viewCommand,
}: {
  markers: MapMarker[];
  visible: boolean;
  /** An on-demand "pan/zoom to this viewport" command (e.g. restoring "back to search"
   * state, or applying a saved preset) — consumed once per distinct nonce. Takes
   * precedence over the fit-to-all-markers fallback whenever it's present. */
  viewCommand?: ViewCommand | null;
}) {
  const map = useMap();
  const key = markers.map((m) => m.id).join(",");
  // Leaflet can't compute a sane fit against a zero-size (hidden) container, and we
  // don't want every show/hide toggle to re-fit and discard the user's pan/zoom — so
  // fit at most once per distinct marker set, and only once the map is actually visible.
  const firedForKey = useRef<string | null>(null);
  const lastAppliedNonce = useRef<number | null>(null);

  useEffect(() => {
    if (!visible) return;

    if (viewCommand) {
      if (viewCommand.nonce === lastAppliedNonce.current) return;
      lastAppliedNonce.current = viewCommand.nonce;
      map.invalidateSize();
      map.fitBounds([
        [viewCommand.bounds.south, viewCommand.bounds.west],
        [viewCommand.bounds.north, viewCommand.bounds.east],
      ]);
      return;
    }

    if (markers.length === 0 || firedForKey.current === key) return;
    firedForKey.current = key;
    map.invalidateSize();
    const bounds = L.latLngBounds(markers.map((m) => [m.lat, m.lng]));
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
  }, [key, visible, map, markers, viewCommand]);
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

function BoundsTracker({ onBoundsChange }: { onBoundsChange: (bounds: BoundsBox) => void }) {
  const map = useMapEvents({
    moveend: () => onBoundsChange(toBoundsBox(map.getBounds())),
    zoomend: () => onBoundsChange(toBoundsBox(map.getBounds())),
  });
  return null;
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
}: {
  markers: MapMarker[];
  hoveredId: string | null;
  onBoundsChange?: (bounds: BoundsBox) => void;
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
  onToggleLike?: (id: string, source: "plots" | "catastro", liked: boolean) => void;
}) {
  const router = useRouter();
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
  const planningPolygons = useMemo(
    () =>
      markers.length > MAX_POLYGON_MARKERS
        ? []
        : markers
            .filter((m) => m.boundary)
            .map((m) => {
              const color = m.planningStatus
                ? planningColors[m.planningStatus] ?? defaultPlanningColor
                : defaultPlanningColor;
              return (
                <Polygon
                  key={`planning-${m.id}`}
                  positions={m.boundary!.coordinates[0].map(([lng, lat]) => [lat, lng])}
                  pathOptions={{ color, weight: 1, fillOpacity: 0.35, fillColor: color }}
                />
              );
            }),
    [markers]
  );

  return (
    <MapContainer center={center} zoom={6} scrollWheelZoom preferCanvas className="h-full w-full">
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

        <LayersControl.Overlay checked name="Plot boundaries">
          <>{boundaryPolygons}</>
        </LayersControl.Overlay>

        <LayersControl.Overlay name="Planning overlay">
          <>{planningPolygons}</>
        </LayersControl.Overlay>
      </LayersControl>

      <FitBounds markers={markers} visible={visible} viewCommand={viewCommand} />
      <InvalidateSizeOnShow visible={visible} />
      {onBoundsChange && <BoundsTracker onBoundsChange={onBoundsChange} />}

      {/* Clustering keeps large marker counts (e.g. a wide, unzoomed "show all on
          map" view) from mounting hundreds of individual pins at once — nearby
          markers group into a single bubble until the user zooms in. chunkedLoading
          spreads that initial mount across animation frames instead of doing it all
          synchronously, which is what actually caused the tab to hang. */}
      <MarkerClusterGroup chunkedLoading maxClusterRadius={60}>
        {markers.map((marker) => (
          <Marker
            key={marker.id}
            position={[marker.lat, marker.lng]}
            icon={markerIcon(hoveredId === marker.id)}
            eventHandlers={{ click: () => router.prefetch(withBackHref(marker.href, backHref)) }}
          >
            <Popup>
              <div className="min-w-[200px] space-y-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold">{marker.title}</p>
                  <LikeButton
                    source={marker.source}
                    propertyId={marker.id}
                    initialLiked={likedIds?.has(marker.id) ?? false}
                    onToggle={(liked) => onToggleLike?.(marker.id, marker.source, liked)}
                  />
                </div>
                <p className="text-xs text-gray-500">{marker.subtitle}</p>
                <p className="text-xs">
                  {marker.areaLabel} &middot; {marker.badge}
                </p>
                {marker.price !== undefined && (
                  <p className="text-sm font-medium">{formatCurrency(marker.price)}</p>
                )}
                {marker.amenities && marker.amenities.length > 0 && (
                  <p className="text-xs text-gray-500">{marker.amenities.slice(0, 2).join(" · ")}</p>
                )}
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
