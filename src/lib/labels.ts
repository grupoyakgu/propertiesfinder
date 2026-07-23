import type {
  BuildingType,
  CadastralClass,
  DevelopmentPotential,
  LandUse,
  PlanningStatus,
  PlotShape,
  Topography,
} from "@/generated/prisma/enums";
import type { Locale } from "@/lib/i18n/translations";

export const developmentPotentialLabels: Record<Locale, Record<DevelopmentPotential, string>> = {
  en: {
    RESIDENTIAL: "Residential",
    HOTEL: "Hotel",
    APARTHOTEL: "Aparthotel",
    COMMERCIAL: "Commercial",
    MIXED_USE: "Mixed Use",
    OFFICE: "Office",
    STUDENT_HOUSING: "Student Housing",
    SENIOR_LIVING: "Senior Living",
    LOGISTICS: "Logistics",
  },
  es: {
    RESIDENTIAL: "Residencial",
    HOTEL: "Hotel",
    APARTHOTEL: "Aparthotel",
    COMMERCIAL: "Comercial",
    MIXED_USE: "Uso Mixto",
    OFFICE: "Oficina",
    STUDENT_HOUSING: "Residencia de Estudiantes",
    SENIOR_LIVING: "Residencia de Mayores",
    LOGISTICS: "Logística",
  },
};

export const planningStatusLabels: Record<Locale, Record<PlanningStatus, string>> = {
  en: {
    URBAN: "Urban",
    DEVELOPABLE: "Developable",
    RURAL: "Rural",
    PROTECTED: "Protected",
    HISTORIC: "Historic",
  },
  es: {
    URBAN: "Urbano",
    DEVELOPABLE: "Urbanizable",
    RURAL: "Rústico",
    PROTECTED: "Protegido",
    HISTORIC: "Histórico",
  },
};

export const landUseLabels: Record<Locale, Record<LandUse, string>> = {
  en: {
    RESIDENTIAL: "Residential",
    COMMERCIAL: "Commercial",
    INDUSTRIAL: "Industrial",
    AGRICULTURAL: "Agricultural",
    TOURISM: "Tourism",
    MIXED: "Mixed",
    OTHER: "Other",
  },
  es: {
    RESIDENTIAL: "Residencial",
    COMMERCIAL: "Comercial",
    INDUSTRIAL: "Industrial",
    AGRICULTURAL: "Agrícola",
    TOURISM: "Turístico",
    MIXED: "Mixto",
    OTHER: "Otro",
  },
};

export const cadastralClassLabels: Record<Locale, Record<CadastralClass, string>> = {
  en: {
    URBANO: "Urbano",
    RUSTICO: "Rústico",
  },
  es: {
    URBANO: "Urbano",
    RUSTICO: "Rústico",
  },
};

export const buildingTypeLabels: Record<Locale, Record<BuildingType, string>> = {
  en: {
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
  },
  es: {
    DETACHED_HOUSE: "Vivienda Unifamiliar",
    TERRACED_HOUSE: "Vivienda Adosada",
    APARTMENT_BLOCK: "Bloque de Apartamentos",
    VILLA: "Villa",
    WAREHOUSE: "Nave Industrial",
    OFFICE_BUILDING: "Edificio de Oficinas",
    HOTEL_BUILDING: "Edificio Hotelero",
    COMMERCIAL_BUILDING: "Edificio Comercial",
    VACANT_PLOT: "Solar Vacío",
    OTHER: "Otro",
  },
};

export const plotShapeLabels: Record<Locale, Record<PlotShape, string>> = {
  en: {
    REGULAR: "Regular",
    IRREGULAR: "Irregular",
    RECTANGULAR: "Rectangular",
    TRIANGULAR: "Triangular",
    L_SHAPED: "L-Shaped",
    CORNER: "Corner",
  },
  es: {
    REGULAR: "Regular",
    IRREGULAR: "Irregular",
    RECTANGULAR: "Rectangular",
    TRIANGULAR: "Triangular",
    L_SHAPED: "En L",
    CORNER: "Esquina",
  },
};

export const topographyLabels: Record<Locale, Record<Topography, string>> = {
  en: {
    FLAT: "Flat",
    SLOPED: "Sloped",
  },
  es: {
    FLAT: "Llano",
    SLOPED: "Inclinado",
  },
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
