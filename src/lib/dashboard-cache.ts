import type { ClientCatastroParcel } from "@/lib/types";

/**
 * Same-tab, in-memory cache of dashboard search results, keyed by query.
 * Survives client-side navigation away (e.g. to a detail page) and back — a plain
 * module-level Map keeps its values as long as the JS runtime isn't torn down by a
 * full page reload — so returning to an already-seen view can render instantly
 * instead of blanking out to a loading state while re-fetching from scratch.
 * A background refetch still runs to keep it current (stale-while-revalidate).
 */
interface DashboardCacheEntry {
  parcels: ClientCatastroParcel[];
  total: number;
}

const MAX_ENTRIES = 20;
const cache = new Map<string, DashboardCacheEntry>();

export function getCachedDashboardResults(key: string): DashboardCacheEntry | undefined {
  return cache.get(key);
}

export function setCachedDashboardResults(key: string, entry: DashboardCacheEntry): void {
  cache.delete(key);
  cache.set(key, entry);
  if (cache.size > MAX_ENTRIES) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey !== undefined) cache.delete(oldestKey);
  }
}
