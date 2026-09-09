import type { Locale } from "@/lib/i18n/translations";
import type { LandUse, CadastralClass } from "@/lib/types";

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
