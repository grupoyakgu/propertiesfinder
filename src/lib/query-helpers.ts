export function num(value: string | null): number | undefined {
  if (value === null || value === "") return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

export function bool(value: string | null): boolean | undefined {
  if (value === "true") return true;
  if (value === "false") return false;
  return undefined;
}

export function list<T extends string>(value: string | null): T[] | undefined {
  if (!value) return undefined;
  const items = value.split(",").filter(Boolean) as T[];
  return items.length ? items : undefined;
}

export interface ParsedRange {
  gte?: number;
  lte?: number;
}

export function parseRange(
  searchParams: URLSearchParams,
  minKey: string,
  maxKey: string
): ParsedRange | undefined {
  const min = num(searchParams.get(minKey));
  const max = num(searchParams.get(maxKey));
  if (min === undefined && max === undefined) return undefined;
  return { gte: min, lte: max };
}

export interface ParsedBBox {
  south: number;
  west: number;
  north: number;
  east: number;
}

/** Parses a "south,west,north,east" bbox param, matching the format the dashboard
 * already writes into the URL's `bbox` query param and MapPreset's bounds columns. */
export function parseBBox(searchParams: URLSearchParams): ParsedBBox | undefined {
  const raw = searchParams.get("bbox");
  if (!raw) return undefined;
  const parts = raw.split(",").map(Number);
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) return undefined;
  const [south, west, north, east] = parts;
  return { south, west, north, east };
}

/** Parses a `polygon` query param — a JSON-encoded array of [lng, lat] pairs
 * (GeoJSON order, same shape as CatastroParcel.boundary's ring and
 * MapPreset.polygon) — used for the exact point-in-polygon filter applied on
 * top of the bbox narrowing (see /api/catastro-parcels and src/lib/geo.ts). */
export function parsePolygon(searchParams: URLSearchParams): [number, number][] | undefined {
  const raw = searchParams.get("polygon");
  if (!raw) return undefined;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length < 3) return undefined;
    const valid = parsed.every(
      (p): p is [number, number] =>
        Array.isArray(p) && p.length === 2 && p.every((n) => typeof n === "number" && Number.isFinite(n))
    );
    return valid ? (parsed as [number, number][]) : undefined;
  } catch {
    return undefined;
  }
}
