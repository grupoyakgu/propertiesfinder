"use client";

import { useEffect } from "react";
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
import { formatCurrency } from "@/lib/utils";

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

function FitBounds({ markers }: { markers: MapMarker[] }) {
  const map = useMap();
  const key = markers.map((m) => m.id).join(",");
  useEffect(() => {
    if (markers.length === 0) return;
    const bounds = L.latLngBounds(markers.map((m) => [m.lat, m.lng]));
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return null;
}

function BoundsTracker({ onBoundsChange }: { onBoundsChange: (bounds: L.LatLngBounds) => void }) {
  const map = useMapEvents({
    moveend: () => onBoundsChange(map.getBounds()),
    zoomend: () => onBoundsChange(map.getBounds()),
  });
  return null;
}

export function MapView({
  markers,
  hoveredId,
  onBoundsChange,
}: {
  markers: MapMarker[];
  hoveredId: string | null;
  onBoundsChange?: (bounds: L.LatLngBounds) => void;
}) {
  const router = useRouter();
  const center: [number, number] =
    markers.length > 0 ? [markers[0].lat, markers[0].lng] : [40.4168, -3.7038];

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
          <>
            {markers
              .filter((m) => m.boundary)
              .map((m) => (
                <Polygon
                  key={`boundary-${m.id}`}
                  positions={m.boundary!.coordinates[0].map(([lng, lat]) => [lat, lng])}
                  pathOptions={{ color: "#0f3d3e", weight: 1.5, fillOpacity: 0.05 }}
                />
              ))}
          </>
        </LayersControl.Overlay>

        <LayersControl.Overlay name="Planning overlay">
          <>
            {markers
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
              })}
          </>
        </LayersControl.Overlay>
      </LayersControl>

      <FitBounds markers={markers} />
      {onBoundsChange && <BoundsTracker onBoundsChange={onBoundsChange} />}

      {markers.map((marker) => (
        <Marker
          key={marker.id}
          position={[marker.lat, marker.lng]}
          icon={markerIcon(hoveredId === marker.id)}
          eventHandlers={{ click: () => router.prefetch(marker.href) }}
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
              <Link href={marker.href} className="text-xs font-medium text-emerald-800 underline">
                View details →
              </Link>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
