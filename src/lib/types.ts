import type {
  BuildingType,
  CadastralClass,
  DevelopmentPotential,
  LandUse,
  PlanningStatus,
  PlotShape,
  Topography,
} from "@/generated/prisma/enums";
import type { CatastroParcel, Plot } from "@/generated/prisma/client";

export interface ClientPlot {
  id: string;
  title: string;
  slug: string;
  address: string;
  municipality: string;
  province: string;
  autonomousCommunity: string;
  postalCode: string | null;
  latitude: number;
  longitude: number;
  referenciaCatastral: string;
  imageUrl: string | null;
  description: string | null;

  plotSize: number;
  builtArea: number;
  superficieGrafica: number | null;
  constructionYear: number | null;
  landUse: LandUse;
  cadastralUse: CadastralClass;
  buildingType: BuildingType;
  numberOfFloors: number;
  maxBuildableArea: number;
  buildabilityRatio: number;
  occupancyRatio: number;
  plotShape: PlotShape;
  cornerPlot: boolean;
  frontageWidth: number;
  depth: number;

  valorCatastral: number;

  planningStatus: PlanningStatus;
  developmentPotential: DevelopmentPotential[];
  allowedUses: string[];
  maxHeight: number | null;
  restrictions: string[];
  zoning: string | null;

  purchasePrice: number;
  pricePerSqm: number;
  estimatedConstructionCost: number | null;
  expectedROI: number | null;
  expectedYield: number | null;
  developmentMargin: number | null;

  topography: Topography;
  doubleFrontage: boolean;
  existingBuilding: boolean;
  demolitionRequired: boolean;
  vacantLand: boolean;

  boundary: { type: string; coordinates: number[][][] } | null;
  nearbyAmenities: string[];

  aiScore: number | null;
  aiSummary: string | null;
  aiAnalyzedAt: string | null;
}

export function toClientPlot(plot: Plot): ClientPlot {
  return {
    ...plot,
    boundary: plot.boundary as ClientPlot["boundary"],
    aiAnalyzedAt: plot.aiAnalyzedAt ? plot.aiAnalyzedAt.toISOString() : null,
  };
}

export interface ClientCatastroParcel {
  id: string;
  referenciaCatastral: string;
  municipality: string;
  province: string;
  autonomousCommunity: string;
  latitude: number;
  longitude: number;
  boundary: { type: string; coordinates: number[][][] } | null;
  streetName: string | null;
  streetNumber: string | null;

  plotSize: number;
  builtArea: number | null;
  constructionYear: number | null;
  numberOfFloors: number | null;
  cadastralUse: CadastralClass;
  landUse: LandUse | null;

  sourceDataset: string;
  importedAt: string;
}

export function toClientCatastroParcel(parcel: CatastroParcel): ClientCatastroParcel {
  return {
    ...parcel,
    boundary: parcel.boundary as ClientCatastroParcel["boundary"],
    importedAt: parcel.importedAt.toISOString(),
  };
}
