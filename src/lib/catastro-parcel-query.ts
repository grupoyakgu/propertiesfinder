import type { Prisma } from "@/generated/prisma/client";
import type { CadastralClass, LandUse } from "@/generated/prisma/enums";
import { list, parseBBox, parseRange } from "@/lib/query-helpers";

export function buildCatastroParcelWhere(
  searchParams: URLSearchParams
): Prisma.CatastroParcelWhereInput {
  const AND: Prisma.CatastroParcelWhereInput[] = [];

  const q = searchParams.get("q")?.trim();
  if (q) {
    AND.push({
      OR: [
        { municipality: { contains: q, mode: "insensitive" } },
        { province: { contains: q, mode: "insensitive" } },
        { autonomousCommunity: { contains: q, mode: "insensitive" } },
        { referenciaCatastral: { contains: q, mode: "insensitive" } },
        { streetName: { contains: q, mode: "insensitive" } },
      ],
    });
  }

  const municipality = searchParams.get("municipality");
  if (municipality) AND.push({ municipality: { equals: municipality, mode: "insensitive" } });

  const province = searchParams.get("province");
  if (province) AND.push({ province: { equals: province, mode: "insensitive" } });

  const autonomousCommunity = searchParams.get("autonomousCommunity");
  if (autonomousCommunity) AND.push({ autonomousCommunity: { equals: autonomousCommunity } });

  const streetName = searchParams.get("streetName")?.trim();
  if (streetName) AND.push({ streetName: { contains: streetName, mode: "insensitive" } });

  const streetNumber = searchParams.get("streetNumber")?.trim();
  if (streetNumber) AND.push({ streetNumber: { equals: streetNumber } });

  const range = (field: keyof Prisma.CatastroParcelWhereInput, minKey: string, maxKey: string) => {
    const parsed = parseRange(searchParams, minKey, maxKey);
    if (parsed) AND.push({ [field]: parsed } as Prisma.CatastroParcelWhereInput);
  };

  range("plotSize", "plotSizeMin", "plotSizeMax");
  range("builtArea", "builtAreaMin", "builtAreaMax");
  range("constructionYear", "constructionYearMin", "constructionYearMax");
  range("numberOfFloors", "floorsMin", "floorsMax");

  const cadastralUse = list<CadastralClass>(searchParams.get("cadastralUse"));
  if (cadastralUse) AND.push({ cadastralUse: { in: cadastralUse } });

  const landUse = list<LandUse>(searchParams.get("landUse"));
  if (landUse) AND.push({ landUse: { in: landUse } });

  const bbox = parseBBox(searchParams);
  if (bbox) {
    AND.push({
      latitude: { gte: bbox.south, lte: bbox.north },
      longitude: { gte: bbox.west, lte: bbox.east },
    });
  }

  return AND.length ? { AND } : {};
}

export const CATASTRO_SORT_OPTIONS = {
  newest: { importedAt: "desc" },
  size_desc: { plotSize: "desc" },
  year_desc: { constructionYear: "desc" },
} satisfies Record<string, Prisma.CatastroParcelOrderByWithRelationInput>;

export type CatastroSortKey = keyof typeof CATASTRO_SORT_OPTIONS;

export function parseCatastroSort(
  value: string | null
): Prisma.CatastroParcelOrderByWithRelationInput {
  if (value && value in CATASTRO_SORT_OPTIONS) return CATASTRO_SORT_OPTIONS[value as CatastroSortKey];
  return CATASTRO_SORT_OPTIONS.newest;
}
