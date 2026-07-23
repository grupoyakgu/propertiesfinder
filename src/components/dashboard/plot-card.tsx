"use client";

import Link from "next/link";
import { MapPin, Ruler, TrendingUp, Building2 } from "lucide-react";
import type { ClientPlot } from "@/lib/types";
import { formatArea, formatCurrency, formatPercent, cn } from "@/lib/utils";
import { developmentPotentialLabels, planningStatusLabels } from "@/lib/labels";

export function PlotCard({
  plot,
  active,
  onHover,
}: {
  plot: ClientPlot;
  active?: boolean;
  onHover?: (id: string | null) => void;
}) {
  return (
    <Link
      href={`/property/${plot.slug}`}
      onMouseEnter={() => onHover?.(plot.id)}
      onMouseLeave={() => onHover?.(null)}
      className={cn(
        "block rounded-xl border border-border bg-surface p-4 transition-shadow hover:shadow-md",
        active && "ring-2 ring-primary/50"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold text-foreground">{plot.title}</h3>
        <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
          {planningStatusLabels[plot.planningStatus]}
        </span>
      </div>

      <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
        <MapPin className="h-3.5 w-3.5 shrink-0" />
        {plot.municipality}, {plot.province}
      </p>

      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <Ruler className="h-3.5 w-3.5" /> {formatArea(plot.plotSize)}
        </span>
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <TrendingUp className="h-3.5 w-3.5" /> ROI {formatPercent(plot.expectedROI)}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {plot.developmentPotential.slice(0, 3).map((p) => (
          <span
            key={p}
            className="flex items-center gap-1 rounded-full bg-surface-muted px-2 py-0.5 text-[11px] text-muted-foreground"
          >
            <Building2 className="h-3 w-3" />
            {developmentPotentialLabels[p]}
          </span>
        ))}
      </div>

      <div className="mt-3 flex items-baseline justify-between border-t border-border pt-3">
        <span className="text-base font-semibold text-foreground">
          {formatCurrency(plot.purchasePrice)}
        </span>
        <span className="text-xs text-muted-foreground">
          {formatCurrency(plot.pricePerSqm)}/m²
        </span>
      </div>
    </Link>
  );
}
