"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
import L from "leaflet";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { MapMarker } from "@/lib/map-marker";
import { formatCurrency, withBackHref } from "@/lib/utils";

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

function FitBounds({
  markers,
  visible,
  restoreBounds,
}: {
  markers: MapMarker[];
  visible: boolean;
  /** A previously-saved viewport (e.g. from the URL) to restore on first mount instead
   * of fitting to all markers — set once, consumed once, then ignored. */
  restoreBounds?: BoundsBox | null;
}) {
  const map = useMap();
  const key = markers.map((m) => m.id).join(",");
  // Leaflet can't compute a sane fit against a zero-size (hidden) container, and we
  // don't want every show/hide toggle to re-fit and discard the user's pan/zoom — so
  // fit at most once per distinct marker set, and only once the map is actually visible.
  const firedForKey = useRef<string | null>(null);
  const restoredOnce = useRef(false);
  // Locked in from the first render only: if a restore was requested at mount, the
  // fit-to-all-markers branch below must never run for this component's lifetime —
  // otherwise it fires again once markers finish loading (their id key changes from
  // "" to the real list) and clobbers the just-restored viewport.
  const [hasRestoreBounds] = useState(restoreBounds != null);

  useEffect(() => {
    if (!visible) return;

    if (hasRestoreBounds) {
      if (restoredOnce.current || !restoreBounds) return;
      restoredOnce.current = true;
      map.invalidateSize();
      map.fitBounds([
        [restoreBounds.south, restoreBounds.west],
        [restoreBounds.north, restoreBounds.east],
      ]);
      return;
    }

    if (markers.length === 0 || firedForKey.current === key) return;
    firedForKey.current = key;
    map.invalidateSize();
    const bounds = L.latLngBounds(markers.map((m) => [m.lat, m.lng]));
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
  }, [key, visible, map, markers, restoreBounds, hasRestoreBounds]);
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
  restoreBounds,
  backHref,
}: {
  markers: MapMarker[];
  hoveredId: string | null;
  onBoundsChange?: (bounds: BoundsBox) => void;
  visible?: boolean;
  /** A previously-saved viewport (e.g. from the URL) to restore on first mount. */
  restoreBounds?: BoundsBox | null;
  /** Applied to marker links at render/click time (not baked into `markers`) so
   * panning/zooming — which changes this as the URL's bbox updates — never forces
   * the marker/polygon list itself to be recomputed and re-rendered. */
  backHref?: string;
}) {
  const router = useRouter();
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
      markers
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
      markers
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
    <MapContainer center={center} zoom={6} scrollWheelZoom className="h-full w-full">
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

      <FitBounds markers={markers} visible={visible} restoreBounds={restoreBounds} />
      <InvalidateSizeOnShow visible={visible} />
      {onBoundsChange && <BoundsTracker onBoundsChange={onBoundsChange} />}

      {markers.map((marker) => (
        <Marker
          key={marker.id}
          position={[marker.lat, marker.lng]}
          icon={markerIcon(hoveredId === marker.id)}
          eventHandlers={{ click: () => router.prefetch(withBackHref(marker.href, backHref)) }}
        >
          <Popup>
            <div className="min-w-[200px] space-y-1">
              <p className="text-sm font-semibold">{marker.title}</p>
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
    </MapContainer>
  );
}
