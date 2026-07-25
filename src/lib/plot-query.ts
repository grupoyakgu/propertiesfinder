import type { Prisma } from "@/generated/prisma/client";
import type {
  BuildingType,
  CadastralClass,
  DevelopmentPotential,
  LandUse,
  PlanningStatus,
  PlotShape,
  Topography,
} from "@/generated/prisma/enums";
import { bool, list, parseBBox, parseRange } from "@/lib/query-helpers";

export function buildPlotWhere(searchParams: URLSearchParams): Prisma.PlotWhereInput {
  const AND: Prisma.PlotWhereInput[] = [];

  const q = searchParams.get("q")?.trim();
  if (q) {
    AND.push({
      OR: [
        { title: { contains: q, mode: "insensitive" } },
        { municipality: { contains: q, mode: "insensitive" } },
        { province: { contains: q, mode: "insensitive" } },
        { autonomousCommunity: { contains: q, mode: "insensitive" } },
        { address: { contains: q, mode: "insensitive" } },
        { referenciaCatastral: { contains: q, mode: "insensitive" } },
      ],
    });
  }

  const municipality = searchParams.get("municipality");
  if (municipality) AND.push({ municipality: { equals: municipality, mode: "insensitive" } });

  const province = searchParams.get("province");
  if (province) AND.push({ province: { equals: province, mode: "insensitive" } });

  const autonomousCommunity = searchParams.get("autonomousCommunity");
  if (autonomousCommunity) AND.push({ autonomousCommunity: { equals: autonomousCommunity } });

  const range = (field: keyof Prisma.PlotWhereInput, minKey: string, maxKey: string) => {
    const parsed = parseRange(searchParams, minKey, maxKey);
    if (parsed) AND.push({ [field]: parsed } as Prisma.PlotWhereInput);
  };

  range("plotSize", "plotSizeMin", "plotSizeMax");
  range("builtArea", "builtAreaMin", "builtAreaMax");
  range("constructionYear", "constructionYearMin", "constructionYearMax");
  range("numberOfFloors", "floorsMin", "floorsMax");
  range("maxBuildableArea", "buildableAreaMin", "buildableAreaMax");
  range("occupancyRatio", "occupancyMin", "occupancyMax");
  range("frontageWidth", "frontageMin", "frontageMax");
  range("depth", "depthMin", "depthMax");
  range("valorCatastral", "valorCatastralMin", "valorCatastralMax");
  range("purchasePrice", "priceMin", "priceMax");
  range("pricePerSqm", "pricePerSqmMin", "pricePerSqmMax");
  range("estimatedConstructionCost", "constructionCostMin", "constructionCostMax");
  range("expectedROI", "roiMin", "roiMax");
  range("expectedYield", "yieldMin", "yieldMax");
  range("developmentMargin", "marginMin", "marginMax");

  const landUse = list<LandUse>(searchParams.get("landUse"));
  if (landUse) AND.push({ landUse: { in: landUse } });

  const cadastralUse = list<CadastralClass>(searchParams.get("cadastralUse"));
  if (cadastralUse) AND.push({ cadastralUse: { in: cadastralUse } });

  const buildingType = list<BuildingType>(searchParams.get("buildingType"));
  if (buildingType) AND.push({ buildingType: { in: buildingType } });

  const plotShape = list<PlotShape>(searchParams.get("plotShape"));
  if (plotShape) AND.push({ plotShape: { in: plotShape } });

  const developmentPotential = list<DevelopmentPotential>(searchParams.get("potential"));
  if (developmentPotential) {
    AND.push({ developmentPotential: { hasSome: developmentPotential } });
  }

  const planningStatus = list<PlanningStatus>(searchParams.get("planningStatus"));
  if (planningStatus) AND.push({ planningStatus: { in: planningStatus } });

  const topography = list<Topography>(searchParams.get("topography"));
  if (topography) AND.push({ topography: { in: topography } });

  const cornerPlot = bool(searchParams.get("cornerPlot"));
  if (cornerPlot !== undefined) AND.push({ cornerPlot });

  const doubleFrontage = bool(searchParams.get("doubleFrontage"));
  if (doubleFrontage !== undefined) AND.push({ doubleFrontage });

  const existingBuilding = bool(searchParams.get("existingBuilding"));
  if (existingBuilding !== undefined) AND.push({ existingBuilding });

  const demolitionRequired = bool(searchParams.get("demolitionRequired"));
  if (demolitionRequired !== undefined) AND.push({ demolitionRequired });

  const vacantLand = bool(searchParams.get("vacantLand"));
  if (vacantLand !== undefined) AND.push({ vacantLand });

  const bbox = parseBBox(searchParams);
  if (bbox) {
    AND.push({
      latitude: { gte: bbox.south, lte: bbox.north },
      longitude: { gte: bbox.west, lte: bbox.east },
    });
  }

  return AND.length ? { AND } : {};
}

export const SORT_OPTIONS = {
  newest: { createdAt: "desc" },
  price_asc: { purchasePrice: "asc" },
  price_desc: { purchasePrice: "desc" },
  roi_desc: { expectedROI: "desc" },
  size_desc: { plotSize: "desc" },
} satisfies Record<string, Prisma.PlotOrderByWithRelationInput>;

export type SortKey = keyof typeof SORT_OPTIONS;

export function parseSort(value: string | null): Prisma.PlotOrderByWithRelationInput {
  if (value && value in SORT_OPTIONS) return SORT_OPTIONS[value as SortKey];
  return SORT_OPTIONS.newest;
}
