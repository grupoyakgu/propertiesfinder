"use client";

import { useEffect, useState } from "react";
import { PlotCard } from "@/components/dashboard/plot-card";
import { CatastroParcelCard } from "@/components/dashboard/catastro-parcel-card";
import type { ClientCatastroParcel, ClientPlot } from "@/lib/types";
import { useLocale } from "@/lib/i18n/context";

/** Fetches its own data on mount (rather than sharing dashboard-app.tsx's plots/
 * parcels state) so it always reflects the current like set — favorites can mix
 * both property types, which the main list/table views never do at once. */
export function FavoritesPanel() {
  const { t } = useLocale();
  const [loading, setLoading] = useState(true);
  const [plots, setPlots] = useState<ClientPlot[]>([]);
  const [parcels, setParcels] = useState<ClientCatastroParcel[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/favorites")
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        setPlots(data.plots ?? []);
        setParcels(data.parcels ?? []);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const removePlot = (id: string) => setPlots((prev) => prev.filter((p) => p.id !== id));
  const removeParcel = (id: string) => setParcels((prev) => prev.filter((p) => p.id !== id));
  const isEmpty = !loading && plots.length === 0 && parcels.length === 0;

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="mx-auto max-w-3xl space-y-8">
        <div>
          <h2 className="text-sm font-semibold text-foreground">{t("dashboard.tabFavorites")}</h2>
          <p className="mt-1 text-xs text-muted-foreground">{t("dashboard.favoritesDescription")}</p>
        </div>

        {loading && <p className="text-sm text-muted-foreground">{t("dashboard.searching")}</p>}
        {isEmpty && <p className="text-sm text-muted-foreground">{t("dashboard.noFavorites")}</p>}

        {parcels.length > 0 && (
          <div>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t("dashboard.tabCatastro")}
            </h3>
            <div className="space-y-3">
              {parcels.map((parcel) => (
                <CatastroParcelCard
                  key={parcel.id}
                  parcel={parcel}
                  liked
                  onToggleLike={(liked) => {
                    if (!liked) removeParcel(parcel.id);
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {plots.length > 0 && (
          <div>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t("dashboard.tabPlots")}
            </h3>
            <div className="space-y-3">
              {plots.map((plot) => (
                <PlotCard
                  key={plot.id}
                  plot={plot}
                  liked
                  onToggleLike={(liked) => {
                    if (!liked) removePlot(plot.id);
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
