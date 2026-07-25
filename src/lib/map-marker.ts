import type { ClientCatastroParcel } from "@/lib/types";
import { formatArea, formatCatastroParcelAddress } from "@/lib/utils";
import { cadastralClassLabels } from "@/lib/labels";
import type { Locale } from "@/lib/i18n/translations";

export interface MapMarker {
  id: string;
  href: string;
  lat: number;
  lng: number;
  boundary: { type: string; coordinates: number[][][] } | null;
  title: string;
  subtitle: string;
  badge: string;
  areaLabel: string;
}

export function catastroParcelToMarker(parcel: ClientCatastroParcel, locale: Locale = "en"): MapMarker {
  return {
    id: parcel.id,
    href: `/catastro/${parcel.referenciaCatastral}`,
    lat: parcel.latitude,
    lng: parcel.longitude,
    boundary: parcel.boundary,
    title: parcel.referenciaCatastral,
    subtitle: formatCatastroParcelAddress(parcel),
    badge: cadastralClassLabels[locale][parcel.cadastralUse],
    areaLabel: formatArea(parcel.plotSize),
  };
}
