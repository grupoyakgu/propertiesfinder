"use client";

import Link from "next/link";
import { MapPin, Ruler, Calendar, Layers } from "lucide-react";
import type { ClientCatastroParcel } from "@/lib/types";
import { formatArea, formatCatastroParcelAddress, cn, withBackHref } from "@/lib/utils";
import { cadastralClassLabels, landUseLabels } from "@/lib/labels";
import { useLocale } from "@/lib/i18n/context";

export function CatastroParcelCard({
  parcel,
  active,
  onHover,
  backHref,
}: {
  parcel: ClientCatastroParcel;
  active?: boolean;
  onHover?: (id: string | null) => void;
  backHref?: string;
}) {
  const { locale, t } = useLocale();
  return (
    <Link
      href={withBackHref(`/catastro/${parcel.referenciaCatastral}`, backHref)}
      onMouseEnter={() => onHover?.(parcel.id)}
      onMouseLeave={() => onHover?.(null)}
      className={cn(
        "block rounded-xl border border-border bg-surface p-4 transition-shadow hover:shadow-md",
        active && "ring-2 ring-primary/50"
      )}
    >
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
  );
}
