"use client";

import Link from "next/link";
import { MapPin, MapPinned, Ruler, TrendingUp, Building2 } from "lucide-react";
import type { ClientPlot } from "@/lib/types";
import { formatArea, formatCurrency, formatPercent, cn, withBackHref } from "@/lib/utils";
import { developmentPotentialLabels, planningStatusLabels } from "@/lib/labels";
import { useLocale } from "@/lib/i18n/context";

export function PlotCard({
  plot,
  active,
  onHover,
  backHref,
  selectable,
  selected,
  onToggleSelect,
  onShowOnMap,
}: {
  plot: ClientPlot;
  active?: boolean;
  onHover?: (id: string | null) => void;
  backHref?: string;
  /** When true (the "show all on map" setting is off), renders a checkbox and a
   * "show on map" action alongside the card so the user can manually curate what
   * appears on the map instead of relying on the automatic full result set. */
  selectable?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
  onShowOnMap?: () => void;
}) {
  const { locale, t } = useLocale();
  return (
    <div
      onMouseEnter={() => onHover?.(plot.id)}
      onMouseLeave={() => onHover?.(null)}
      className={cn(
        "flex items-start gap-2 rounded-xl border border-border bg-surface p-4 transition-shadow hover:shadow-md",
        active && "ring-2 ring-primary/50"
      )}
    >
      {selectable && (
        <input
          type="checkbox"
          checked={selected ?? false}
          onChange={() => onToggleSelect?.()}
          className="mt-1 h-4 w-4 shrink-0 rounded border-border accent-[var(--primary)]"
        />
      )}

      <Link href={withBackHref(`/property/${plot.slug}`, backHref)} className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-semibold text-foreground">{plot.title}</h3>
          <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
            {planningStatusLabels[locale][plot.planningStatus]}
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
            <TrendingUp className="h-3.5 w-3.5" /> {t("table.roi")} {formatPercent(plot.expectedROI)}
          </span>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {plot.developmentPotential.slice(0, 3).map((p) => (
            <span
              key={p}
              className="flex items-center gap-1 rounded-full bg-surface-muted px-2 py-0.5 text-[11px] text-muted-foreground"
            >
              <Building2 className="h-3 w-3" />
              {developmentPotentialLabels[locale][p]}
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

      {selectable && (
        <button
          type="button"
          onClick={() => onShowOnMap?.()}
          title={t("dashboard.showOnMap")}
          className="mt-1 shrink-0 rounded p-1 text-muted-foreground hover:text-primary"
        >
          <MapPinned className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
