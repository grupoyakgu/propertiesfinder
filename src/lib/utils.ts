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

// Full address including municipality/province — kept for building geocodable
// links (Google Earth, Idealista) even though that pair is currently hidden
// from on-screen display (see formatCatastroParcelDisplayAddress below); a
// bare street name alone geocodes far less reliably than street+city.
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

// Street-only address for on-screen display (cards, tables, detail page) —
// municipality/province are temporarily hidden from the UI, so this omits
// them rather than falling back to them the way formatCatastroParcelAddress
// does.
export function formatCatastroParcelDisplayAddress(parcel: {
  streetName: string | null;
  streetNumber: string | null;
}): string {
  return parcel.streetName
    ? `${parcel.streetName}${parcel.streetNumber ? ` ${parcel.streetNumber}` : ""}`
    : "—";
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

/** A Google Earth Web deep link built from a human address (street, municipality,
 * province) — the same /web/search/ path Earth's own search box uses, fed a
 * geocodable string so its search actually resolves to a place and drops the
 * traditional red placemark pin there. (Raw lat/lng through this same path does
 * not reliably drop a pin — Earth's geocoder wants a real address, not decimal
 * coordinates as free text.) */
export function googleEarthUrl(address: string): string {
  return `https://earth.google.com/web/search/${encodeURIComponent(address)}`;
}

function hyphenSlug(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip accents
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Catastro's INSPIRE address data stores thoroughfare names with the street
// type abbreviated ("CL BEATRIZ DE SUABIA", not "Calle Beatriz de Suabia"),
// but Idealista's /maps/ URLs spell it out in full — so the raw abbreviation
// has to be expanded before slugifying, or the URL 404s. Covers the common
// INE/Catastro thoroughfare-type codes; an unrecognized one is left as-is.
const STREET_TYPE_EXPANSIONS: Record<string, string> = {
  cl: "calle",
  "c/": "calle",
  av: "avenida",
  avda: "avenida",
  cj: "callejon",
  cjon: "callejon",
  cm: "camino",
  cno: "camino",
  cr: "carretera",
  ctra: "carretera",
  gv: "gran via",
  pj: "pasaje",
  psj: "pasaje",
  pz: "plaza",
  plz: "plaza",
  ps: "paseo",
  pso: "paseo",
  rd: "ronda",
  tr: "travesia",
  trva: "travesia",
  ur: "urbanizacion",
  urb: "urbanizacion",
  bo: "barrio",
  pg: "poligono",
  pol: "poligono",
  lg: "lugar",
};

function expandStreetType(streetName: string): string {
  const [first, ...rest] = streetName.trim().split(/\s+/);
  const expansion = STREET_TYPE_EXPANSIONS[first.toLowerCase().replace(/\.$/, "")];
  return expansion ? [expansion, ...rest].join(" ") : streetName;
}

/** Idealista's /maps street-level page — confirmed from a real example URL
 * (idealista.com/maps/sevilla-sevilla/calle-beatriz-de-suabia/32/ for "Calle
 * Beatriz de Suabia 32" in Sevilla): /maps/{municipality}-{province}/{street
 * name, hyphenated}/{street number}/. Falls back to just the municipality
 * segment when there's no street name/number to build the rest from. */
export function idealistaUrl(parcel: {
  streetName: string | null;
  streetNumber: string | null;
  municipality: string;
  province: string;
}): string {
  const segments = [`${hyphenSlug(parcel.municipality)}-${hyphenSlug(parcel.province)}`];
  if (parcel.streetName) {
    segments.push(hyphenSlug(expandStreetType(parcel.streetName)));
    if (parcel.streetNumber) segments.push(hyphenSlug(parcel.streetNumber));
  }
  return `https://www.idealista.com/maps/${segments.join("/")}/`;
}
