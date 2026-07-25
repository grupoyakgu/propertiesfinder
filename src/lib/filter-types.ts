export interface DashboardFilters {
  q: string;
  municipality: string;
  province: string;
  autonomousCommunity: string;
  streetName: string;
  streetNumber: string;

  plotSizeMin: string;
  plotSizeMax: string;
  builtAreaMin: string;
  builtAreaMax: string;
  constructionYearMin: string;
  constructionYearMax: string;
  landUse: string[];
  cadastralUse: string[];
  floorsMin: string;
  floorsMax: string;

  sort: string;
}

export const emptyFilters: DashboardFilters = {
  q: "",
  municipality: "",
  province: "",
  autonomousCommunity: "",
  streetName: "",
  streetNumber: "",
  plotSizeMin: "",
  plotSizeMax: "",
  builtAreaMin: "",
  builtAreaMax: "",
  constructionYearMin: "",
  constructionYearMax: "",
  landUse: [],
  cadastralUse: [],
  floorsMin: "",
  floorsMax: "",
  sort: "newest",
};

const arrayKeys = ["landUse", "cadastralUse"] as const;

export function filtersFromSearchParams(params: URLSearchParams): DashboardFilters {
  const filters = { ...emptyFilters };
  for (const key of Object.keys(emptyFilters) as (keyof DashboardFilters)[]) {
    if ((arrayKeys as readonly string[]).includes(key)) {
      const v = params.get(key);
      (filters[key] as string[]) = v ? v.split(",") : [];
    } else {
      const v = params.get(key);
      if (v !== null) (filters[key] as string) = v;
    }
  }
  const q = params.get("q");
  if (q !== null) filters.q = q;
  return filters;
}

export function filtersToSearchParams(filters: DashboardFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.municipality) params.set("municipality", filters.municipality);
  if (filters.province) params.set("province", filters.province);
  if (filters.autonomousCommunity) params.set("autonomousCommunity", filters.autonomousCommunity);
  if (filters.streetName) params.set("streetName", filters.streetName);
  if (filters.streetNumber) params.set("streetNumber", filters.streetNumber);

  const range = (min: string, max: string, minKey: string, maxKey: string) => {
    if (min) params.set(minKey, min);
    if (max) params.set(maxKey, max);
  };
  range(filters.plotSizeMin, filters.plotSizeMax, "plotSizeMin", "plotSizeMax");
  range(filters.builtAreaMin, filters.builtAreaMax, "builtAreaMin", "builtAreaMax");
  range(filters.constructionYearMin, filters.constructionYearMax, "constructionYearMin", "constructionYearMax");
  range(filters.floorsMin, filters.floorsMax, "floorsMin", "floorsMax");

  if (filters.landUse.length) params.set("landUse", filters.landUse.join(","));
  if (filters.cadastralUse.length) params.set("cadastralUse", filters.cadastralUse.join(","));

  if (filters.sort && filters.sort !== "newest") params.set("sort", filters.sort);

  return params;
}

export function countActiveFilters(filters: DashboardFilters): number {
  let count = 0;
  for (const key of arrayKeys) count += filters[key].length > 0 ? 1 : 0;
  const ranges: [string, string][] = [
    [filters.plotSizeMin, filters.plotSizeMax],
    [filters.builtAreaMin, filters.builtAreaMax],
    [filters.constructionYearMin, filters.constructionYearMax],
    [filters.floorsMin, filters.floorsMax],
  ];
  for (const [min, max] of ranges) count += min || max ? 1 : 0;
  count += filters.municipality ? 1 : 0;
  count += filters.province ? 1 : 0;
  count += filters.autonomousCommunity ? 1 : 0;
  count += filters.streetName ? 1 : 0;
  count += filters.streetNumber ? 1 : 0;
  return count;
}
