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
} from "react-leaflet";
import L from "leaflet";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ClientPlot } from "@/lib/types";
import { formatArea, formatCurrency } from "@/lib/utils";
import { planningStatusLabels } from "@/lib/labels";

const planningColors: Record<string, string> = {
  URBAN: "#0f3d3e",
  DEVELOPABLE: "#2f6f63",
  RURAL: "#8a8f5c",
  PROTECTED: "#b3402f",
  HISTORIC: "#b08d57",
};

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

function FitBounds({ plots }: { plots: ClientPlot[] }) {
  const map = useMap();
  const key = plots.map((p) => p.id).join(",");
  useEffect(() => {
    if (plots.length === 0) return;
    const bounds = L.latLngBounds(plots.map((p) => [p.latitude, p.longitude]));
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return null;
}

export function MapView({
  plots,
  hoveredId,
}: {
  plots: ClientPlot[];
  hoveredId: string | null;
}) {
  const router = useRouter();
  const center: [number, number] =
    plots.length > 0 ? [plots[0].latitude, plots[0].longitude] : [40.4168, -3.7038];

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
            {plots
              .filter((p) => p.boundary)
              .map((p) => (
                <Polygon
                  key={`boundary-${p.id}`}
                  positions={p.boundary!.coordinates[0].map(([lng, lat]) => [lat, lng])}
                  pathOptions={{ color: "#0f3d3e", weight: 1.5, fillOpacity: 0.05 }}
                />
              ))}
          </>
        </LayersControl.Overlay>

        <LayersControl.Overlay name="Planning overlay">
          <>
            {plots
              .filter((p) => p.boundary)
              .map((p) => (
                <Polygon
                  key={`planning-${p.id}`}
                  positions={p.boundary!.coordinates[0].map(([lng, lat]) => [lat, lng])}
                  pathOptions={{
                    color: planningColors[p.planningStatus],
                    weight: 1,
                    fillOpacity: 0.35,
                    fillColor: planningColors[p.planningStatus],
                  }}
                />
              ))}
          </>
        </LayersControl.Overlay>
      </LayersControl>

      <FitBounds plots={plots} />

      {plots.map((plot) => (
        <Marker
          key={plot.id}
          position={[plot.latitude, plot.longitude]}
          icon={markerIcon(hoveredId === plot.id)}
          eventHandlers={{ click: () => router.prefetch(`/property/${plot.slug}`) }}
        >
          <Popup>
            <div className="min-w-[200px] space-y-1">
              <p className="text-sm font-semibold">{plot.title}</p>
              <p className="text-xs text-gray-500">
                {plot.municipality}, {plot.province}
              </p>
              <p className="text-xs">
                {formatArea(plot.plotSize)} &middot; {planningStatusLabels[plot.planningStatus]}
              </p>
              <p className="text-sm font-medium">{formatCurrency(plot.purchasePrice)}</p>
              {plot.nearbyAmenities.length > 0 && (
                <p className="text-xs text-gray-500">{plot.nearbyAmenities.slice(0, 2).join(" · ")}</p>
              )}
              <Link href={`/property/${plot.slug}`} className="text-xs font-medium text-emerald-800 underline">
                View details →
              </Link>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
