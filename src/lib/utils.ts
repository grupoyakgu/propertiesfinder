import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatArea(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return `${new Intl.NumberFormat("es-ES").format(value)} m²`;
}

export function formatNumber(value: number | null | undefined, decimals = 0): string {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("es-ES", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return `${formatNumber(value, 1)}%`;
}

export function formatCatastroParcelAddress(parcel: {
  streetName: string | null;
  streetNumber: string | null;
  municipality: string;
  province: string;
}): string {
  const street = parcel.streetName
    ? `${parcel.streetName}${parcel.streetNumber ? ` ${parcel.streetNumber}` : ""}`
    : null;
  return [street, parcel.municipality, parcel.province].filter(Boolean).join(", ");
}

/** Appends the dashboard view (tab, map visibility, filters) a link was opened from, so
 * the detail page's "Back to search" link can restore that exact view instead of resetting. */
export function withBackHref(href: string, backHref?: string): string {
  return backHref ? `${href}?from=${encodeURIComponent(backHref)}` : href;
}

/** Resolves a detail page's "Back to search" target from a `?from=` param, restricted to
 * internal /dashboard paths only (defends against it being used as an open-redirect vector). */
export function resolveBackHref(from: string | undefined): string {
  return from && from.startsWith("/dashboard") ? from : "/dashboard";
}

/** A Google Earth Web deep link that frames the camera on a coordinate: eye altitude
 * 0 (ground-level target), 1000m distance, a slight tilt so terrain/buildings read
 * as 3D rather than a flat top-down view. Note: raw lat/lng through the /search/
 * path does NOT reliably drop Earth's red placemark pin — Earth's geocoder wants a
 * real address, not decimal coordinates as free text. Use googleEarthAddressUrl for
 * that; this one is kept for a coordinate-only fallback when no address is known. */
export function googleEarthUrl(latitude: number, longitude: number): string {
  return `https://earth.google.com/web/search/${latitude},${longitude}/@${latitude},${longitude},0a,1000d,35y,0h,0t,0r`;
}

/** A Google Earth Web deep link built from a human address (street, municipality,
 * province) instead of coordinates — the same /web/search/ path Earth's own search
 * box uses, but fed a geocodable string so its search actually resolves to a place
 * and drops the traditional red placemark pin there. */
export function googleEarthAddressUrl(address: string): string {
  return `https://earth.google.com/web/search/${encodeURIComponent(address)}`;
}
