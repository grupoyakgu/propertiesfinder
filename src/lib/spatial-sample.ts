export interface LatLngId {
  id: string;
  latitude: number;
  longitude: number;
}

export interface BBox {
  south: number;
  west: number;
  north: number;
  east: number;
}

/** Picks up to `take` ids out of `candidates`, spread evenly across a grid over
 * `bounds` (or the candidates' own extent if no bounds given) — instead of an
 * arbitrary prefix. Sorting by e.g. import date and truncating to `take` can
 * leave an entire dense area (a historic city center, say) completely
 * unrepresented even though thousands of matches exist there, if that area
 * simply wasn't part of whichever batch happens to sort first. Round-robins
 * across grid cells so sparse cells get picked from before dense ones exhaust
 * the cap, giving the sample even coverage across the viewport instead of
 * whatever the sort happens to favor. */
export function pickEvenlySpread(candidates: LatLngId[], take: number, bounds: BBox | null): string[] {
  if (candidates.length <= take) return candidates.map((c) => c.id);

  let south: number, west: number, north: number, east: number;
  if (bounds) {
    ({ south, west, north, east } = bounds);
  } else {
    const lats = candidates.map((c) => c.latitude);
    const lngs = candidates.map((c) => c.longitude);
    south = Math.min(...lats);
    north = Math.max(...lats);
    west = Math.min(...lngs);
    east = Math.max(...lngs);
  }
  const latSpan = north - south || 1;
  const lngSpan = east - west || 1;
  const gridDim = Math.max(1, Math.round(Math.sqrt(take)));

  const cells = new Map<string, string[]>();
  for (const c of candidates) {
    const gx = Math.min(gridDim - 1, Math.max(0, Math.floor(((c.longitude - west) / lngSpan) * gridDim)));
    const gy = Math.min(gridDim - 1, Math.max(0, Math.floor(((c.latitude - south) / latSpan) * gridDim)));
    const key = `${gx},${gy}`;
    const bucket = cells.get(key);
    if (bucket) bucket.push(c.id);
    else cells.set(key, [c.id]);
  }

  const bucketArrays = [...cells.values()];
  const picked: string[] = [];
  let round = 0;
  while (picked.length < take) {
    let addedThisRound = false;
    for (const bucket of bucketArrays) {
      if (round < bucket.length) {
        picked.push(bucket[round]);
        addedThisRound = true;
        if (picked.length >= take) break;
      }
    }
    if (!addedThisRound) break;
    round++;
  }
  return picked;
}
