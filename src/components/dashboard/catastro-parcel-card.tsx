"use client";

import Link from "next/link";
import { Compass, Earth, MapPin, MapPinned, Ruler, Calendar, Layers } from "lucide-react";
import type { ClientCatastroParcel } from "@/lib/types";
import {
  formatArea,
  formatCatastroParcelAddress,
  cn,
  googleEarthUrl,
  googleEarthAddressUrl,
  withBackHref,
} from "@/lib/utils";
import { cadastralClassLabels, landUseLabels } from "@/lib/labels";
import { useLocale } from "@/lib/i18n/context";
import { LikeButton } from "@/components/dashboard/like-button";

export function CatastroParcelCard({
  parcel,
  active,
  onHover,
  backHref,
  selectable,
  selected,
  onToggleSelect,
  onShowOnMap,
  liked,
  onToggleLike,
}: {
  parcel: ClientCatastroParcel;
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
  liked?: boolean;
  onToggleLike?: (liked: boolean) => void;
}) {
  const { locale, t } = useLocale();
  return (
    <div
      onMouseEnter={() => onHover?.(parcel.id)}
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

      <Link href={withBackHref(`/catastro/${parcel.referenciaCatastral}`, backHref)} className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-semibold text-foreground">{parcel.referenciaCatastral}</h3>
          <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
            {cadastralClassLabels[locale][parcel.cadastralUse]}
          </span>
        </div>

        <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin className="h-3.5 w-3.5 shrink-0" />
          {formatCatastroParcelAddress(parcel)}
        </p>

        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <Ruler className="h-3.5 w-3.5" /> {formatArea(parcel.plotSize)}
          </span>
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" /> {parcel.constructionYear ?? "—"}
          </span>
        </div>

        <div className="mt-3 flex items-baseline justify-between border-t border-border pt-3">
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Layers className="h-3.5 w-3.5" />
            {parcel.numberOfFloors !== null ? `${parcel.numberOfFloors} ${t("card.floors")}` : "—"}
          </span>
          <span className="text-xs text-muted-foreground">
            {parcel.landUse ? landUseLabels[locale][parcel.landUse] : "—"}
          </span>
        </div>
      </Link>

      <div className="mt-1 flex shrink-0 flex-col items-center gap-1">
        <LikeButton propertyId={parcel.id} initialLiked={liked ?? false} onToggle={onToggleLike} />
        <a
          href={googleEarthUrl(parcel.latitude, parcel.longitude)}
          target="_blank"
          rel="noopener noreferrer"
          title={t("card.openInGoogleEarth")}
          className="shrink-0 rounded p-1 text-muted-foreground hover:text-primary"
        >
          <Earth className="h-4 w-4" />
        </a>
        <a
          href={googleEarthAddressUrl(formatCatastroParcelAddress(parcel))}
          target="_blank"
          rel="noopener noreferrer"
          title={t("card.openInGoogleEarthByAddress")}
          className="shrink-0 rounded p-1 text-muted-foreground hover:text-primary"
        >
          <Compass className="h-4 w-4" />
        </a>
        {selectable && (
          <button
            type="button"
            onClick={() => onShowOnMap?.()}
            title={t("dashboard.showOnMap")}
            className="shrink-0 rounded p-1 text-muted-foreground hover:text-primary"
          >
            <MapPinned className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
