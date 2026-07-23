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
