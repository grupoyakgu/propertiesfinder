import type { DashboardFilters } from "@/lib/filter-types";

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

  /** Whether anyone has left a comment on this property — only populated by the
   * Official Catastro Records list route (see /api/catastro-parcels), which
   * batches the lookup for the whole page of results; undefined elsewhere
   * (e.g. the detail page, which doesn't need it since it shows the full
   * comment thread directly). */
  hasComment?: boolean;
}

export function toClientCatastroParcel(parcel: any): ClientCatastroParcel {
  return {
    id: parcel.id,
    referenciaCatastral: parcel.referencia_catastral || parcel.referenciaCatastral,
    municipality: parcel.municipality,
    province: parcel.province,
    autonomousCommunity: parcel.autonomous_community || parcel.autonomousCommunity,
    latitude: parcel.latitude,
    longitude: parcel.longitude,
    boundary: (typeof parcel.boundary === 'string' ? JSON.parse(parcel.boundary) : parcel.boundary) as ClientCatastroParcel["boundary"],
    streetName: parcel.street_name || parcel.streetName,
    streetNumber: parcel.street_number || parcel.streetNumber,
    plotSize: parcel.plot_size || parcel.plotSize,
    builtArea: parcel.built_area || parcel.builtArea,
    constructionYear: parcel.construction_year || parcel.constructionYear,
    numberOfFloors: parcel.number_of_floors || parcel.numberOfFloors,
    cadastralUse: parcel.cadastral_use || parcel.cadastralUse,
    landUse: parcel.land_use || parcel.landUse,
    sourceDataset: parcel.source_dataset || parcel.sourceDataset,
    importedAt: (typeof parcel.imported_at === 'string' ? parcel.imported_at : parcel.importedAt?.toISOString?.() || new Date().toISOString()),
    hasComment: parcel.hasComment,
  };
}

export interface ClientMapPreset {
  id: string;
  name: string;
  south: number;
  west: number;
  north: number;
  east: number;
  isDefault: boolean;
  /** The full search filter state (location, land characteristics, etc.) captured
   * when the preset was saved — null for presets saved before this field existed. */
  filters: DashboardFilters | null;
  /** A hand-drawn area (GeoJSON [lng, lat] ring) — when present, applying this
   * preset restricts results to parcels whose point falls inside it, not just
   * within south/west/north/east (which is still the polygon's own bounding
   * box, kept so the map still knows where to fit). Null for plain bbox presets. */
  polygon: number[][] | null;
  ownerId: string;
  /** The creator's display name — presets are shared (every signed-in user sees
   * everyone's), so the UI needs this to label presets that aren't the current
   * viewer's own and to know whose "default" a given preset actually is. */
  ownerName: string;
}

export function toClientMapPreset(preset: any): ClientMapPreset {
  const { id, name, south, west, north, east, is_default, filters, polygon, user_id, users, user } = preset;
  return {
    id,
    name,
    south,
    west,
    north,
    east,
    isDefault: is_default || preset.isDefault,
    filters: (typeof filters === 'string' ? JSON.parse(filters) : filters) as DashboardFilters | null,
    polygon: (typeof polygon === 'string' ? JSON.parse(polygon) : polygon) as number[][] | null,
    ownerId: user_id || preset.userId,
    ownerName: users?.name || user?.name || "Unknown",
  };
}

export type OpportunityStatus = "IN_REVIEW" | "NOT_RELEVANT" | "VALIDATED";
export type LandUse = "RESIDENTIAL" | "COMMERCIAL" | "INDUSTRIAL" | "AGRICULTURAL" | "TOURISM" | "MIXED" | "OTHER";
export type CadastralClass = "URBANO" | "RUSTICO";

// A shared "Opportunity" — see the Favorite model's comment in schema.prisma.
export interface ClientOpportunity {
  id: string;
  parcel: ClientCatastroParcel;
  status: OpportunityStatus;
  assignedUserId: string;
  assignedUserName: string;
  createdAt: string;
}

export function toClientOpportunity(
  favorite: any,
  parcel: ClientCatastroParcel
): ClientOpportunity {
  const assignedUserId = favorite.assigned_user_id || favorite.assignedUserId;
  const assignedUser = favorite.users || favorite.assignedUser;
  const createdAt = favorite.created_at || favorite.createdAt;
  return {
    id: favorite.id,
    parcel,
    status: favorite.status,
    assignedUserId,
    assignedUserName: assignedUser?.name || "Unknown",
    createdAt: typeof createdAt === 'string' ? createdAt : createdAt?.toISOString?.() || new Date().toISOString(),
  };
}

export interface ClientComment {
  id: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  authorId: string;
  authorName: string;
}

export function toClientComment(comment: any): ClientComment {
  const user = comment.users || comment.user;
  return {
    id: comment.id,
    body: comment.body,
    createdAt: (typeof comment.created_at === 'string' ? comment.created_at : comment.createdAt?.toISOString?.()) || new Date().toISOString(),
    updatedAt: (typeof comment.updated_at === 'string' ? comment.updated_at : comment.updatedAt?.toISOString?.()) || new Date().toISOString(),
    authorId: user?.id || comment.user_id,
    authorName: user?.name || "Unknown",
  };
}
