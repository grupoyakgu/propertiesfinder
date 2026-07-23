"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MapPinned, Search, SlidersHorizontal, X } from "lucide-react";
import type { ClientPlot } from "@/lib/types";
import type { DashboardFilters } from "@/lib/filter-types";
import { filtersToSearchParams } from "@/lib/filter-types";
import { FiltersSidebar } from "@/components/dashboard/filters-sidebar";
import { PlotCard } from "@/components/dashboard/plot-card";
import { Select } from "@/components/ui/input";
import { LogoutButton } from "@/components/auth/logout-button";

const MapView = dynamic(() => import("@/components/dashboard/map-view").then((m) => m.MapView), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-surface-muted text-sm text-muted-foreground">
      Loading map…
    </div>
  ),
});

export function DashboardApp({ initialFilters }: { initialFilters: DashboardFilters }) {
  const router = useRouter();
  const [filters, setFilters] = useState(initialFilters);
  const [plots, setPlots] = useState<ClientPlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const queryString = useMemo(() => filtersToSearchParams(filters).toString(), [filters]);

  useEffect(() => {
    const handle = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/plots?${queryString}`);
        const data = await res.json();
        setPlots(data.plots ?? []);
      } finally {
        setLoading(false);
      }
      router.replace(`/dashboard${queryString ? `?${queryString}` : ""}`, { scroll: false });
    }, 300);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryString]);

  return (
    <div className="flex h-screen flex-col">
      <header className="flex items-center gap-4 border-b border-border bg-surface px-4 py-3">
        <Link href="/" className="flex shrink-0 items-center gap-2 text-primary">
          <MapPinned className="h-5 w-5" strokeWidth={1.75} />
          <span className="hidden text-sm font-semibold text-foreground sm:inline">
            PropertiesFinder
          </span>
        </Link>

        <div className="flex flex-1 items-center gap-2 rounded-full border border-border bg-background px-3">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            value={filters.q}
            onChange={(e) => setFilters({ ...filters, q: e.target.value })}
            placeholder="Search by city, province, or referencia catastral..."
            className="h-10 w-full bg-transparent text-sm focus:outline-none"
          />
          {filters.q && (
            <button type="button" onClick={() => setFilters({ ...filters, q: "" })}>
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => setFiltersOpen((o) => !o)}
          className="flex items-center gap-1.5 rounded-full border border-border px-3 py-2 text-xs font-medium text-foreground lg:hidden"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" /> Filters
        </button>

        <Select
          value={filters.sort}
          onChange={(e) => setFilters({ ...filters, sort: e.target.value })}
          className="hidden w-44 shrink-0 sm:block"
        >
          <option value="newest">Newest</option>
          <option value="price_asc">Price: Low to High</option>
          <option value="price_desc">Price: High to Low</option>
          <option value="roi_desc">Highest ROI</option>
          <option value="size_desc">Largest Plot</option>
        </Select>

        <LogoutButton />
      </header>

      <div className="flex flex-1 overflow-hidden">
        <div className={`${filtersOpen ? "block" : "hidden"} lg:block`}>
          <FiltersSidebar filters={filters} onChange={setFilters} />
        </div>

        <div className="flex w-full max-w-md shrink-0 flex-col border-r border-border lg:w-96">
          <div className="border-b border-border px-4 py-3 text-xs text-muted-foreground">
            {loading ? "Searching…" : `${plots.length} result${plots.length === 1 ? "" : "s"}`}
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {plots.map((plot) => (
              <PlotCard key={plot.id} plot={plot} active={hoveredId === plot.id} onHover={setHoveredId} />
            ))}
            {!loading && plots.length === 0 && (
              <p className="pt-10 text-center text-sm text-muted-foreground">
                No plots match these filters. Try widening your search.
              </p>
            )}
          </div>
        </div>

        <div className="relative flex-1">
          <MapView plots={plots} hoveredId={hoveredId} />
        </div>
      </div>
    </div>
  );
}
