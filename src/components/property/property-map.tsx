"use client";

import { MapContainer, TileLayer, Marker, Polygon, LayersControl } from "react-leaflet";
import L from "leaflet";

const icon = L.divIcon({
  className: "",
  html: `<div style="width:16px;height:16px;border-radius:50%;background:#0f3d3e;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.4);"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

export interface PropertyMapLocation {
  latitude: number;
  longitude: number;
  boundary: { type: string; coordinates: number[][][] } | null;
}

export function PropertyMap({ latitude, longitude, boundary }: PropertyMapLocation) {
  return (
    <MapContainer center={[latitude, longitude]} zoom={15} scrollWheelZoom={false} className="h-full w-full">
      <LayersControl position="topright">
        <LayersControl.BaseLayer checked name="Satellite">
          <TileLayer
            attribution="Tiles &copy; Esri"
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          />
        </LayersControl.BaseLayer>
        <LayersControl.BaseLayer name="Street">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
        </LayersControl.BaseLayer>
      </LayersControl>

      {boundary && (
        <Polygon
          positions={boundary.coordinates[0].map(([lng, lat]) => [lat, lng])}
          pathOptions={{ color: "#b08d57", weight: 2, fillOpacity: 0.15 }}
        />
      )}
      <Marker position={[latitude, longitude]} icon={icon} />
    </MapContainer>
  );
}
