import type { CadastralClass, LandUse } from "@/generated/prisma/enums";
import type { CatastroParcel, Comment, MapPreset } from "@/generated/prisma/client";
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
}

export function toClientCatastroParcel(parcel: CatastroParcel): ClientCatastroParcel {
  return {
    ...parcel,
    boundary: parcel.boundary as ClientCatastroParcel["boundary"],
    importedAt: parcel.importedAt.toISOString(),
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
  ownerId: string;
  /** The creator's display name — presets are shared (every signed-in user sees
   * everyone's), so the UI needs this to label presets that aren't the current
   * viewer's own and to know whose "default" a given preset actually is. */
  ownerName: string;
}

export function toClientMapPreset(preset: MapPreset & { user: { name: string } }): ClientMapPreset {
  const { id, name, south, west, north, east, isDefault, filters, userId, user } = preset;
  return {
    id,
    name,
    south,
    west,
    north,
    east,
    isDefault,
    filters: filters as DashboardFilters | null,
    ownerId: userId,
    ownerName: user.name,
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

export function toClientComment(comment: Comment & { user: { id: string; name: string } }): ClientComment {
  return {
    id: comment.id,
    body: comment.body,
    createdAt: comment.createdAt.toISOString(),
    updatedAt: comment.updatedAt.toISOString(),
    authorId: comment.user.id,
    authorName: comment.user.name,
  };
}
