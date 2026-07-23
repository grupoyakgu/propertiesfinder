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
  buildingType: string[];
  floorsMin: string;
  floorsMax: string;
  buildableAreaMin: string;
  buildableAreaMax: string;
  occupancyMin: string;
  occupancyMax: string;
  plotShape: string[];
  cornerPlot: boolean;
  frontageMin: string;
  frontageMax: string;
  depthMin: string;
  depthMax: string;

  potential: string[];
  planningStatus: string[];

  priceMax: string;
  pricePerSqmMax: string;
  constructionCostMax: string;
  roiMin: string;
  yieldMin: string;
  marginMin: string;

  topography: string[];
  doubleFrontage: boolean;
  existingBuilding: boolean;
  demolitionRequired: boolean;
  vacantLand: boolean;

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
  buildingType: [],
  floorsMin: "",
  floorsMax: "",
  buildableAreaMin: "",
  buildableAreaMax: "",
  occupancyMin: "",
  occupancyMax: "",
  plotShape: [],
  cornerPlot: false,
  frontageMin: "",
  frontageMax: "",
  depthMin: "",
  depthMax: "",
  potential: [],
  planningStatus: [],
  priceMax: "",
  pricePerSqmMax: "",
  constructionCostMax: "",
  roiMin: "",
  yieldMin: "",
  marginMin: "",
  topography: [],
  doubleFrontage: false,
  existingBuilding: false,
  demolitionRequired: false,
  vacantLand: false,
  sort: "newest",
};

const arrayKeys = ["landUse", "cadastralUse", "buildingType", "plotShape", "potential", "planningStatus", "topography"] as const;
const boolKeys = ["cornerPlot", "doubleFrontage", "existingBuilding", "demolitionRequired", "vacantLand"] as const;

export function filtersFromSearchParams(params: URLSearchParams): DashboardFilters {
  const filters = { ...emptyFilters };
  for (const key of Object.keys(emptyFilters) as (keyof DashboardFilters)[]) {
    if ((arrayKeys as readonly string[]).includes(key)) {
      const v = params.get(key === "potential" ? "potential" : key);
      (filters[key] as string[]) = v ? v.split(",") : [];
    } else if ((boolKeys as readonly string[]).includes(key)) {
      (filters[key] as boolean) = params.get(key) === "true";
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
  range(filters.buildableAreaMin, filters.buildableAreaMax, "buildableAreaMin", "buildableAreaMax");
  range(filters.occupancyMin, filters.occupancyMax, "occupancyMin", "occupancyMax");
  range(filters.frontageMin, filters.frontageMax, "frontageMin", "frontageMax");
  range(filters.depthMin, filters.depthMax, "depthMin", "depthMax");

  if (filters.landUse.length) params.set("landUse", filters.landUse.join(","));
  if (filters.cadastralUse.length) params.set("cadastralUse", filters.cadastralUse.join(","));
  if (filters.buildingType.length) params.set("buildingType", filters.buildingType.join(","));
  if (filters.plotShape.length) params.set("plotShape", filters.plotShape.join(","));
  if (filters.potential.length) params.set("potential", filters.potential.join(","));
  if (filters.planningStatus.length) params.set("planningStatus", filters.planningStatus.join(","));
  if (filters.topography.length) params.set("topography", filters.topography.join(","));

  if (filters.priceMax) params.set("priceMax", filters.priceMax);
  if (filters.pricePerSqmMax) params.set("pricePerSqmMax", filters.pricePerSqmMax);
  if (filters.constructionCostMax) params.set("constructionCostMax", filters.constructionCostMax);
  if (filters.roiMin) params.set("roiMin", filters.roiMin);
  if (filters.yieldMin) params.set("yieldMin", filters.yieldMin);
  if (filters.marginMin) params.set("marginMin", filters.marginMin);

  if (filters.cornerPlot) params.set("cornerPlot", "true");
  if (filters.doubleFrontage) params.set("doubleFrontage", "true");
  if (filters.existingBuilding) params.set("existingBuilding", "true");
  if (filters.demolitionRequired) params.set("demolitionRequired", "true");
  if (filters.vacantLand) params.set("vacantLand", "true");

  if (filters.sort && filters.sort !== "newest") params.set("sort", filters.sort);

  return params;
}

export function countActiveFilters(filters: DashboardFilters): number {
  let count = 0;
  for (const key of arrayKeys) count += filters[key].length > 0 ? 1 : 0;
  for (const key of boolKeys) count += filters[key] ? 1 : 0;
  const ranges: [string, string][] = [
    [filters.plotSizeMin, filters.plotSizeMax],
    [filters.builtAreaMin, filters.builtAreaMax],
    [filters.constructionYearMin, filters.constructionYearMax],
    [filters.floorsMin, filters.floorsMax],
    [filters.buildableAreaMin, filters.buildableAreaMax],
    [filters.occupancyMin, filters.occupancyMax],
    [filters.frontageMin, filters.frontageMax],
    [filters.depthMin, filters.depthMax],
  ];
  for (const [min, max] of ranges) count += min || max ? 1 : 0;
  count += filters.priceMax ? 1 : 0;
  count += filters.pricePerSqmMax ? 1 : 0;
  count += filters.constructionCostMax ? 1 : 0;
  count += filters.roiMin ? 1 : 0;
  count += filters.yieldMin ? 1 : 0;
  count += filters.marginMin ? 1 : 0;
  count += filters.municipality ? 1 : 0;
  count += filters.province ? 1 : 0;
  count += filters.autonomousCommunity ? 1 : 0;
  count += filters.streetName ? 1 : 0;
  count += filters.streetNumber ? 1 : 0;
  return count;
}
