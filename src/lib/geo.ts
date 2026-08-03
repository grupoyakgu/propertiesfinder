/** A single [longitude, latitude] pair — GeoJSON coordinate order, matching
 * CatastroParcel.boundary and MapPreset.polygon. */
export type LngLat = [number, number];

/** Standard ray-casting point-in-polygon test. `polygon` is one linear ring;
 * works whether or not the first point repeats as the last. No dependency on
 * PostGIS — this app's Postgres has no geometry column type, so exact polygon
 * filtering happens in application code over an already bbox-narrowed
 * candidate set (see /api/catastro-parcels). */
export function isPointInPolygon(point: LngLat, polygon: LngLat[]): boolean {
  const [x, y] = point;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    const intersects = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

export interface BoundingBox {
  south: number;
  west: number;
  north: number;
  east: number;
}

export function polygonBoundingBox(polygon: LngLat[]): BoundingBox {
  let south = Infinity;
  let west = Infinity;
  let north = -Infinity;
  let east = -Infinity;
  for (const [lng, lat] of polygon) {
    if (lat < south) south = lat;
    if (lat > north) north = lat;
    if (lng < west) west = lng;
    if (lng > east) east = lng;
  }
  return { south, west, north, east };
}
