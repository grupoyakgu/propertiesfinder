"use client";

import { useEffect, useState } from "react";
import { CatastroParcelCard } from "@/components/dashboard/catastro-parcel-card";
import type { ClientCatastroParcel } from "@/lib/types";
import { useLocale } from "@/lib/i18n/context";

/** Fetches its own data on mount (rather than sharing dashboard-app.tsx's parcels
 * state) so it always reflects the current like set. */
export function FavoritesPanel() {
  const { t } = useLocale();
  const [loading, setLoading] = useState(true);
  const [parcels, setParcels] = useState<ClientCatastroParcel[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/favorites")
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        setParcels(data.parcels ?? []);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const removeParcel = (id: string) => setParcels((prev) => prev.filter((p) => p.id !== id));
  const isEmpty = !loading && parcels.length === 0;

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
        )}
      </div>
    </div>
  );
}
