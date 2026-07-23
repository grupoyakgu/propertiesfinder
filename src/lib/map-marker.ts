import type { ClientCatastroParcel, ClientPlot } from "@/lib/types";
import { formatArea, formatCatastroParcelAddress } from "@/lib/utils";
import { cadastralClassLabels, planningStatusLabels } from "@/lib/labels";

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

export function plotToMarker(plot: ClientPlot): MapMarker {
  return {
    id: plot.id,
    href: `/property/${plot.slug}`,
    lat: plot.latitude,
    lng: plot.longitude,
    boundary: plot.boundary,
    title: plot.title,
    subtitle: `${plot.municipality}, ${plot.province}`,
    badge: planningStatusLabels[plot.planningStatus],
    areaLabel: formatArea(plot.plotSize),
    planningStatus: plot.planningStatus,
    price: plot.purchasePrice,
    pricePerSqm: plot.pricePerSqm,
    amenities: plot.nearbyAmenities,
  };
}

export function catastroParcelToMarker(parcel: ClientCatastroParcel): MapMarker {
  return {
    id: parcel.id,
    href: `/catastro/${parcel.referenciaCatastral}`,
    lat: parcel.latitude,
    lng: parcel.longitude,
    boundary: parcel.boundary,
    title: parcel.referenciaCatastral,
    subtitle: formatCatastroParcelAddress(parcel),
    badge: cadastralClassLabels[parcel.cadastralUse],
    areaLabel: formatArea(parcel.plotSize),
  };
}
