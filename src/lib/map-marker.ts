import type { ClientCatastroParcel, ClientPlot } from "@/lib/types";
import { formatArea, formatCatastroParcelAddress, withBackHref } from "@/lib/utils";
import { cadastralClassLabels, planningStatusLabels } from "@/lib/labels";
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
  /** Plot-only: drives planning-status overlay color and popup price line. */
  planningStatus?: string;
  price?: number;
  pricePerSqm?: number;
  amenities?: string[];
}

export function plotToMarker(plot: ClientPlot, locale: Locale = "en", backHref?: string): MapMarker {
  return {
    id: plot.id,
    href: withBackHref(`/property/${plot.slug}`, backHref),
    lat: plot.latitude,
    lng: plot.longitude,
    boundary: plot.boundary,
    title: plot.title,
    subtitle: `${plot.municipality}, ${plot.province}`,
    badge: planningStatusLabels[locale][plot.planningStatus],
    areaLabel: formatArea(plot.plotSize),
    planningStatus: plot.planningStatus,
    price: plot.purchasePrice,
    pricePerSqm: plot.pricePerSqm,
    amenities: plot.nearbyAmenities,
  };
}

export function catastroParcelToMarker(
  parcel: ClientCatastroParcel,
  locale: Locale = "en",
  backHref?: string
): MapMarker {
  return {
    id: parcel.id,
    href: withBackHref(`/catastro/${parcel.referenciaCatastral}`, backHref),
    lat: parcel.latitude,
    lng: parcel.longitude,
    boundary: parcel.boundary,
    title: parcel.referenciaCatastral,
    subtitle: formatCatastroParcelAddress(parcel),
    badge: cadastralClassLabels[locale][parcel.cadastralUse],
    areaLabel: formatArea(parcel.plotSize),
  };
}
