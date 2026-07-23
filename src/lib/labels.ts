import type {
  BuildingType,
  CadastralClass,
  DevelopmentPotential,
  LandUse,
  PlanningStatus,
  PlotShape,
  Topography,
} from "@/generated/prisma/enums";

export const developmentPotentialLabels: Record<DevelopmentPotential, string> = {
  RESIDENTIAL: "Residential",
  HOTEL: "Hotel",
  APARTHOTEL: "Aparthotel",
  COMMERCIAL: "Commercial",
  MIXED_USE: "Mixed Use",
  OFFICE: "Office",
  STUDENT_HOUSING: "Student Housing",
  SENIOR_LIVING: "Senior Living",
  LOGISTICS: "Logistics",
};

export const planningStatusLabels: Record<PlanningStatus, string> = {
  URBAN: "Urban",
  DEVELOPABLE: "Developable",
  RURAL: "Rural",
  PROTECTED: "Protected",
  HISTORIC: "Historic",
};

export const landUseLabels: Record<LandUse, string> = {
  RESIDENTIAL: "Residential",
  COMMERCIAL: "Commercial",
  INDUSTRIAL: "Industrial",
  AGRICULTURAL: "Agricultural",
  TOURISM: "Tourism",
  MIXED: "Mixed",
  OTHER: "Other",
};

export const cadastralClassLabels: Record<CadastralClass, string> = {
  URBANO: "Urbano",
  RUSTICO: "Rústico",
};

export const buildingTypeLabels: Record<BuildingType, string> = {
  DETACHED_HOUSE: "Detached House",
  TERRACED_HOUSE: "Terraced House",
  APARTMENT_BLOCK: "Apartment Block",
  VILLA: "Villa",
  WAREHOUSE: "Warehouse",
  OFFICE_BUILDING: "Office Building",
  HOTEL_BUILDING: "Hotel Building",
  COMMERCIAL_BUILDING: "Commercial Building",
  VACANT_PLOT: "Vacant Plot",
  OTHER: "Other",
};

export const plotShapeLabels: Record<PlotShape, string> = {
  REGULAR: "Regular",
  IRREGULAR: "Irregular",
  RECTANGULAR: "Rectangular",
  TRIANGULAR: "Triangular",
  L_SHAPED: "L-Shaped",
  CORNER: "Corner",
};

export const topographyLabels: Record<Topography, string> = {
  FLAT: "Flat",
  SLOPED: "Sloped",
};

export const spanishAutonomousCommunities = [
  "Andalucía",
  "Aragón",
  "Principado de Asturias",
  "Islas Baleares",
  "Canarias",
  "Cantabria",
  "Castilla-La Mancha",
  "Castilla y León",
  "Cataluña",
  "Comunidad Valenciana",
  "Extremadura",
  "Galicia",
  "Comunidad de Madrid",
  "Región de Murcia",
  "Comunidad Foral de Navarra",
  "País Vasco",
  "La Rioja",
];
