import { list, parseBBox, parseRange } from "@/lib/query-helpers";

export interface CatastroParcelFilters {
  q?: string;
  municipality?: string;
  province?: string;
  autonomousCommunity?: string;
  [key: string]: any;
}

export function buildCatastroParcelWhere(
  searchParams: URLSearchParams
): CatastroParcelFilters {
  const filters: CatastroParcelFilters = {};

  const q = searchParams.get("q")?.trim();
  if (q) filters.q = q;

  const municipality = searchParams.get("municipality");
  if (municipality) filters.municipality = municipality;

  const province = searchParams.get("province");
  if (province) filters.province = province;

  const autonomousCommunity = searchParams.get("autonomousCommunity");
  if (autonomousCommunity) filters.autonomousCommunity = autonomousCommunity;

  return filters;
}
