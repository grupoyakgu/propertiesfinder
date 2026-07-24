/**
 * Bulk-imports official Catastro cadastral parcels (+ joined building data)
 * from the free, public INSPIRE download services published by Sede
 * Electronica del Catastro:
 *   - Cadastral Parcels (CP) theme
 *   - Buildings (BU) theme
 *
 * This is NOT scraping a marketplace — it's the same "official government
 * open data" category as the single-reference lookup in src/lib/catastro.ts,
 * just at bulk scale (per-municipality GML downloads instead of one lookup
 * at a time).
 *
 * Usage:
 *   npx tsx scripts/import-catastro-parcels.ts --province "Sevilla" --municipality "Sevilla" [--limit 25]
 *
 * Filter to specific streets (uses the Addresses/AD theme to resolve which
 * parcels sit on the named streets, then imports only those):
 *   npx tsx scripts/import-catastro-parcels.ts --province "Sevilla" --municipality "Sevilla" \
 *     --streets "Peral,Beatriz de Suabia" [--limit 25]
 *
 * Debugging (no DB writes, just prints parsed structure of a local file):
 *   npx tsx scripts/import-catastro-parcels.ts --inspect path/to/downloaded.zip
 *
 * IMPORTANT — read before running for the first time:
 * This script was written without live access to the Catastro INSPIRE
 * services (the environment it was authored in has no route to
 * catastro.hacienda.gob.es). The ATOM-feed traversal (findFeedEntryHref /
 * findZipUrl) follows the feed's own links rather than hardcoded URLs, so it
 * should be resilient to path details. The GML field mapping
 * (parseCadastralParcelsGml / parseBuildingsGml / mapLandUse) is written
 * against the documented INSPIRE Cadastral Parcels / Buildings Extended 2D
 * schemas, with namespace prefixes stripped (removeNSPrefix) so exact prefix
 * strings don't matter — but exact element names should be verified against
 * a real downloaded file using --inspect before trusting a full-city import.
 * Always run with --limit 25 first (see plan verification steps).
 */
import "dotenv/config";
import { randomUUID } from "node:crypto";
import AdmZip from "adm-zip";
import { XMLParser } from "fast-xml-parser";
import proj4 from "proj4";
import { prisma } from "../src/lib/prisma";
import { Prisma } from "../src/generated/prisma/client";
import type { CadastralClass, LandUse } from "../src/generated/prisma/enums";

const CP_ATOM_INDEX_URL =
  process.env.CATASTRO_CP_ATOM_URL ??
  "https://www.catastro.hacienda.gob.es/INSPIRE/CadastralParcels/ES.SDGC.CP.atom.xml";
const BU_ATOM_INDEX_URL =
  process.env.CATASTRO_BU_ATOM_URL ??
  "https://www.catastro.hacienda.gob.es/INSPIRE/buildings/ES.SDGC.BU.atom.xml";
const AD_ATOM_INDEX_URL =
  process.env.CATASTRO_AD_ATOM_URL ??
  "https://www.catastro.hacienda.gob.es/INSPIRE/Addresses/ES.SDGC.AD.atom.xml";

const PROVINCE_TO_COMMUNITY: Record<string, string> = {
  sevilla: "Andalucía",
  cadiz: "Andalucía",
  cordoba: "Andalucía",
  granada: "Andalucía",
  huelva: "Andalucía",
  jaen: "Andalucía",
  malaga: "Andalucía",
  almeria: "Andalucía",
  madrid: "Comunidad de Madrid",
  barcelona: "Cataluña",
};

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------

interface Args {
  province: string;
  municipality: string;
  autonomousCommunity: string;
  cadastralUse: CadastralClass;
  limit?: number;
  inspect?: string;
  streets?: string[];
  countOnly: boolean;
}

function parseArgs(): Args {
  const argv = process.argv.slice(2);
  const get = (flag: string): string | undefined => {
    const idx = argv.indexOf(flag);
    return idx >= 0 ? argv[idx + 1] : undefined;
  };

  const inspect = get("--inspect");
  const province = get("--province") ?? "Sevilla";
  const municipality = get("--municipality") ?? "Sevilla";
  const limitRaw = get("--limit");
  const limit = limitRaw ? Number(limitRaw) : undefined;
  const autonomousCommunity =
    get("--autonomous-community") ?? PROVINCE_TO_COMMUNITY[province.toLowerCase()] ?? province;
  const cadastralUse = (get("--cadastral-use")?.toUpperCase() as CadastralClass) ?? "URBANO";
  const streetsRaw = get("--streets");
  const streets = streetsRaw
    ? streetsRaw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : undefined;
  const countOnly = argv.includes("--count");

  return { province, municipality, autonomousCommunity, cadastralUse, limit, inspect, streets, countOnly };
}

/** Just queries and prints how many rows are actually in the DB for this
 * municipality/province — no download/parse/upsert. Used to verify a prior
 * import actually landed, independent of that run's own "Upserted N/M" log. */
async function runCount(args: Args) {
  const total = await prisma.catastroParcel.count({
    where: { municipality: args.municipality, province: args.province },
  });
  const withStreet = await prisma.catastroParcel.count({
    where: { municipality: args.municipality, province: args.province, streetName: { not: null } },
  });
  console.log(
    `DB row count for ${args.municipality}, ${args.province}: ${total} total (${withStreet} with a street name)`
  );
}

/** Strips accents/diacritics and uppercases, for tolerant street-name matching. */
function normalizeStreetText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .trim();
}

// ---------------------------------------------------------------------------
// XML / ATOM helpers
// ---------------------------------------------------------------------------

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  removeNSPrefix: true,
  trimValues: true,
});

function asArray<T>(value: T | T[] | undefined | null): T[] {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

function textOf(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (typeof value === "object" && "#text" in (value as Record<string, unknown>)) {
    return String((value as Record<string, unknown>)["#text"]);
  }
  return null;
}

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, { headers: { Accept: "*/*" } });
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
  return res.text();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchXml(url: string): Promise<any> {
  return xmlParser.parse(await fetchText(url));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function entryLinks(entry: any): { rel?: string; href?: string; type?: string }[] {
  return asArray(entry.link).map((l) => ({
    rel: l?.["@_rel"],
    href: l?.["@_href"],
    type: l?.["@_type"],
  }));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function entryTitle(entry: any): string {
  return textOf(entry?.title) ?? "";
}

/** Strips a leading "<code>-" prefix, e.g. "41091-SEVILLA" -> "SEVILLA". */
function stripCodePrefix(title: string): string {
  return title.replace(/^\s*\d+\s*-\s*/, "").trim();
}

/**
 * Finds the feed entry that best matches `matchName`. Prefers an exact match
 * (ignoring a leading "<code>-" prefix and case) over a substring match, so
 * "Sevilla" matches "41091-SEVILLA" rather than "41105-EL CUERVO DE SEVILLA".
 * Falls back to substring match (shortest title wins as a tiebreak) only if
 * no exact match exists.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function findBestEntryMatch(entries: any[], matchName: string): any {
  const needle = matchName.trim().toLowerCase();

  const exact = entries.find((e) => stripCodePrefix(entryTitle(e)).toLowerCase() === needle);
  if (exact) return exact;

  const substringMatches = entries.filter((e) => entryTitle(e).toLowerCase().includes(needle));
  if (substringMatches.length === 0) return undefined;

  return substringMatches.reduce((shortest, e) =>
    entryTitle(e).length < entryTitle(shortest).length ? e : shortest
  );
}

/** Finds a feed entry matching `matchName` and returns its link href. */
async function findFeedEntryHref(indexUrl: string, matchName: string): Promise<string> {
  const doc = await fetchXml(indexUrl);
  const entries = asArray(doc?.feed?.entry);
  const match = findBestEntryMatch(entries, matchName);
  if (!match) {
    throw new Error(
      `No entry matching "${matchName}" found in feed ${indexUrl}. ` +
        `Available titles: ${entries.map(entryTitle).join(", ") || "(none parsed)"}`
    );
  }
  const links = entryLinks(match);
  const href = links.find((l) => l.href)?.href;
  if (!href) throw new Error(`Entry "${matchName}" in ${indexUrl} has no <link href>`);
  return href;
}

/** Finds a .zip download link inside a province/municipality-level feed. */
async function findZipUrl(feedUrl: string, matchName: string): Promise<string> {
  const doc = await fetchXml(feedUrl);
  const entries = asArray(doc?.feed?.entry);
  const match = findBestEntryMatch(entries, matchName);
  if (!match) {
    throw new Error(
      `No entry matching "${matchName}" found in feed ${feedUrl}. ` +
        `Available titles: ${entries.map(entryTitle).join(", ") || "(none parsed)"}`
    );
  }
  const links = entryLinks(match);
  const zipHref = links.find((l) => l.href?.toLowerCase().endsWith(".zip"))?.href ?? links[0]?.href;
  if (!zipHref) throw new Error(`No download link found for entry "${matchName}" in ${feedUrl}`);
  return zipHref;
}

async function downloadGmlFiles(zipUrl: string): Promise<{ name: string; buffer: Buffer }[]> {
  const res = await fetch(zipUrl);
  if (!res.ok) throw new Error(`HTTP ${res.status} downloading ${zipUrl}`);
  const zipBuffer = Buffer.from(await res.arrayBuffer());
  const zip = new AdmZip(zipBuffer);
  return zip
    .getEntries()
    .filter((e) => e.entryName.toLowerCase().endsWith(".gml"))
    .map((e) => ({ name: e.entryName, buffer: e.getData() }));
}

/**
 * A big municipality's Buildings GML can easily exceed Node's ~536MB max
 * string length (ERR_STRING_TOO_LONG) if decoded in one shot. Instead, find
 * each individual <prefix:featureMember>...</prefix:featureMember> (or
 * ...member...) span directly in the raw bytes and decode only that small
 * span to a string — the whole file is never materialized as one string.
 */
function detectWrapperTag(buffer: Buffer, localName: string): string | null {
  const sample = buffer.subarray(0, Math.min(buffer.length, 8192)).toString("utf-8");
  const match = sample.match(new RegExp(`<([\\w.-]+:)?${localName}(?=[\\s>/])`));
  if (!match) return null;
  return `${match[1] ?? ""}${localName}`;
}

function* iterateMemberFragments(buffer: Buffer): Generator<string> {
  for (const localName of ["featureMember", "member"]) {
    const tag = detectWrapperTag(buffer, localName);
    if (!tag) continue;

    const openBytes = Buffer.from(`<${tag}>`, "utf-8");
    const closeBytes = Buffer.from(`</${tag}>`, "utf-8");
    let pos = 0;
    while (true) {
      const start = buffer.indexOf(openBytes, pos);
      if (start === -1) break;
      const end = buffer.indexOf(closeBytes, start);
      if (end === -1) break;
      const endWithTag = end + closeBytes.length;
      yield buffer.subarray(start, endWithTag).toString("utf-8");
      pos = endWithTag;
    }
    return;
  }
}

/** Parses a single <featureMember>/<member> fragment and returns its feature object. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseMemberFragment(fragment: string): any {
  const doc = xmlParser.parse(fragment);
  return doc.featureMember ?? doc.member ?? {};
}

// ---------------------------------------------------------------------------
// GML parsing — Cadastral Parcels (CP)
// ---------------------------------------------------------------------------

interface RawParcel {
  referenciaCatastral: string;
  areaValue: number | null;
  srsName: string | null;
  posList: string | null;
}

function parseCadastralParcelsGml(buffer: Buffer): RawParcel[] {
  const parcels: RawParcel[] = [];

  for (const fragment of iterateMemberFragments(buffer)) {
    const feature = parseMemberFragment(fragment);
    const cp = feature.CadastralParcel;
    if (!cp) continue;

    const refCat = textOf(cp.nationalCadastralReference) ?? textOf(cp.localId) ?? textOf(cp.label);
    if (!refCat) continue;

    const geometry = cp.geometry;
    const multiSurface = geometry?.MultiSurface;
    const surfaceContainer = multiSurface ?? geometry?.Surface ?? geometry;
    const surfaceMember = asArray(surfaceContainer?.surfaceMember)[0];
    // Real INSPIRE CP data wraps the ring in Surface > patches > PolygonPatch
    // (GML 3.2 style); some feeds may use a direct Polygon element instead.
    const innerSurface = surfaceMember?.Surface ?? surfaceMember;
    const polygonPatch = innerSurface?.patches?.PolygonPatch;
    const legacyPolygon = innerSurface?.Polygon;
    const ring = polygonPatch?.exterior?.LinearRing ?? legacyPolygon?.exterior?.LinearRing;
    const posListRaw = ring?.posList;
    const posList = textOf(posListRaw);
    const srsName =
      innerSurface?.["@_srsName"] ??
      surfaceContainer?.["@_srsName"] ??
      multiSurface?.["@_srsName"] ??
      geometry?.["@_srsName"] ??
      null;

    const areaRaw = textOf(cp.areaValue);
    const areaValue = areaRaw !== null ? Number(areaRaw) : null;

    parcels.push({
      referenciaCatastral: refCat.trim(),
      areaValue: areaValue !== null && Number.isFinite(areaValue) ? areaValue : null,
      srsName,
      posList,
    });
  }

  return parcels;
}

// ---------------------------------------------------------------------------
// GML parsing — Buildings (BU)
// ---------------------------------------------------------------------------

interface RawBuilding {
  referenciaCatastral: string;
  numberOfFloors: number | null;
  constructionYear: number | null;
  currentUse: string | null;
  builtArea: number | null;
}

/**
 * Buildings and BuildingParts share a base reference, e.g. "3327501QA6832G"
 * for the Building and "3327501QA6832G_part1" for one of its BuildingParts
 * (or "..._PI.1" for a pool/other-construction part) — strip the suffix so
 * both roll up to the same parcel-matching key.
 */
function stripPartSuffix(id: string): string {
  return id.replace(/_part\d+$/i, "").replace(/_PI\.\d+$/i, "");
}

function parseBuildingsGml(buffer: Buffer): RawBuilding[] {
  const buildings: RawBuilding[] = [];

  for (const fragment of iterateMemberFragments(buffer)) {
    const feature = parseMemberFragment(fragment);
    // "Building" carries currentUse/dateOfConstruction/officialArea;
    // "BuildingPart" (a distinct volume within a building) often carries
    // numberOfFloorsAboveGround when the Building's own value is nil.
    const bu = feature.Building ?? feature.BuildingPart;
    if (!bu) continue;

    const refCatRaw =
      textOf(bu.externalReference?.ExternalReference?.reference) ??
      textOf(bu.inspireId?.Identifier?.localId);
    if (!refCatRaw) continue;
    const refCat = stripPartSuffix(refCatRaw.trim());

    const floorsRaw = textOf(bu.numberOfFloorsAboveGround);
    const floors = floorsRaw !== null ? Number(floorsRaw) : null;

    const constructionDate =
      textOf(bu.dateOfConstruction?.DateOfEvent?.beginning) ??
      textOf(bu.dateOfConstruction?.DateOfEvent?.end);
    const yearMatch = constructionDate?.match(/\d{4}/) ?? null;

    const areaRaw = textOf(bu.officialArea?.OfficialArea?.value);
    const builtArea = areaRaw !== null ? Number(areaRaw) : null;

    buildings.push({
      referenciaCatastral: refCat,
      numberOfFloors: floors !== null && Number.isFinite(floors) ? floors : null,
      constructionYear: yearMatch ? Number(yearMatch[0]) : null,
      currentUse: textOf(bu.currentUse),
      builtArea: builtArea !== null && Number.isFinite(builtArea) ? builtArea : null,
    });
  }

  return buildings;
}

/**
 * Best-effort mapping from INSPIRE Building "currentUse" codes to our
 * LandUse enum. Spain's Catastro extended schema uses codes like
 * "1_residential", "2_agriculture", "3_industrial", "4_1_office",
 * "4_2_retail" — verify against real data with --inspect; unmapped codes
 * fall back to null rather than guessing wrong.
 */
function mapLandUse(currentUse: string | null): LandUse | null {
  if (!currentUse) return null;
  const code = currentUse.toLowerCase();
  if (code.includes("residential")) return "RESIDENTIAL";
  if (code.includes("agri")) return "AGRICULTURAL";
  if (code.includes("industrial")) return "INDUSTRIAL";
  if (code.includes("retail") || code.includes("commerce") || code.includes("office")) return "COMMERCIAL";
  if (code.includes("hotel") || code.includes("tourism")) return "TOURISM";
  return "OTHER";
}

// ---------------------------------------------------------------------------
// GML parsing — Addresses (AD)
// Always downloaded, to populate streetName/streetNumber on every parcel;
// also used to resolve which parcels match --streets when that's given.
// ---------------------------------------------------------------------------

interface RawAddress {
  referenciaCatastral: string;
  streetName: string;
  streetNumber: string | null;
}

/**
 * Addresses (AD) mixes four feature types in one fragment stream: Address,
 * ThoroughfareName, PostalDescriptor, AdminUnitName. An Address doesn't
 * embed its street name — it links to a same-document ThoroughfareName via
 * component[].@_href="#ES.SDGC.TN...", so this requires two passes: first
 * collect every ThoroughfareName's text keyed by its @_id, then resolve each
 * Address's TN link against that map. The base referencia catastral is
 * embedded as the last dot-separated segment of inspireId.Identifier.localId
 * (e.g. "41.900.1.1.4529709TG3442H" -> "4529709TG3442H").
 */
function parseAddressesGml(buffer: Buffer): RawAddress[] {
  const streetNameById = new Map<string, string>();

  for (const fragment of iterateMemberFragments(buffer)) {
    const feature = parseMemberFragment(fragment);
    const tn = feature.ThoroughfareName;
    if (!tn) continue;
    const id = textOf(tn["@_id"]);
    const text = textOf(
      tn.name?.ThoroughfareNameValue?.name?.GeographicalName?.spelling?.SpellingOfName?.text
    );
    if (id && text) streetNameById.set(id, text);
  }

  const addresses: RawAddress[] = [];
  for (const fragment of iterateMemberFragments(buffer)) {
    const feature = parseMemberFragment(fragment);
    const ad = feature.Address;
    if (!ad) continue;

    const localId = textOf(ad.inspireId?.Identifier?.localId);
    if (!localId) continue;
    const refCat = localId.split(".").pop()?.trim();
    if (!refCat) continue;

    const components = asArray(ad.component);
    const tnHref = components
      .map((c) => textOf(c?.["@_href"]))
      .find((href) => href?.includes(".TN."));
    const tnId = tnHref?.replace(/^#/, "");
    const streetName = tnId ? streetNameById.get(tnId) : undefined;
    if (!streetName) continue;

    const streetNumber = textOf(ad.locator?.AddressLocator?.designator?.LocatorDesignator?.designator);

    addresses.push({ referenciaCatastral: refCat, streetName, streetNumber });
  }

  return addresses;
}

// ---------------------------------------------------------------------------
// Reprojection (source CRS -> WGS84)
// ---------------------------------------------------------------------------

const ETRS89_UTM_DEFS: Record<string, string> = {
  "25828": "+proj=utm +zone=28 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs",
  "25829": "+proj=utm +zone=29 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs",
  "25830": "+proj=utm +zone=30 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs",
  "25831": "+proj=utm +zone=31 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs",
};

function registerCrs(srsName: string): string {
  const match = srsName.match(/(\d{4,5})\s*$/);
  const epsgCode = match ? match[1] : "25830";
  const key = `EPSG:${epsgCode}`;
  if (!proj4.defs(key) && ETRS89_UTM_DEFS[epsgCode]) {
    proj4.defs(key, ETRS89_UTM_DEFS[epsgCode]);
  }
  return key;
}

function reprojectRing(posList: string, srsName: string): [number, number][] {
  const crs = registerCrs(srsName);
  const nums = posList
    .trim()
    .split(/\s+/)
    .map(Number)
    .filter((n) => Number.isFinite(n));
  const ring: [number, number][] = [];
  for (let i = 0; i + 1 < nums.length; i += 2) {
    const [lng, lat] = proj4(crs, "EPSG:4326", [nums[i], nums[i + 1]]);
    ring.push([lng, lat]);
  }
  return ring;
}

function centroidOf(ring: [number, number][]): [number, number] {
  const sum = ring.reduce(([sLng, sLat], [lng, lat]) => [sLng + lng, sLat + lat], [0, 0]);
  return [sum[0] / ring.length, sum[1] / ring.length];
}

// ---------------------------------------------------------------------------
// Upsert
// ---------------------------------------------------------------------------

interface ParcelRecord {
  referenciaCatastral: string;
  municipality: string;
  province: string;
  autonomousCommunity: string;
  latitude: number;
  longitude: number;
  boundary: { type: string; coordinates: number[][][] };
  streetName: string | null;
  streetNumber: string | null;
  plotSize: number;
  builtArea: number | null;
  constructionYear: number | null;
  numberOfFloors: number | null;
  cadastralUse: CadastralClass;
  landUse: LandUse | null;
  sourceDataset: string;
}

// A single multi-row `INSERT ... ON CONFLICT DO UPDATE` per chunk — one round-trip
// to the DB instead of one per row. The previous version ran 200 individual
// prisma.catastroParcel.upsert() calls per chunk (each its own round-trip, just
// wrapped in one transaction), which measured at ~24s for a 168-row chunk against
// the Supabase pooler from GitHub Actions — a full ~61k-row city import at that
// rate would take on the order of two hours. This does the same upsert semantics
// (create on new referenciaCatastral, update the same fields on conflict) in a
// fraction of the time.
async function upsertBatch(allRecords: ParcelRecord[]) {
  // The parsed record set can contain more than one entry for the same
  // referenciaCatastral (seen on the real Sevilla data — 61,612 parcels was not
  // 61,612 distinct references). Postgres's ON CONFLICT DO UPDATE errors
  // ("cannot affect row a second time") if a single INSERT tries to touch the
  // same conflict target twice, unlike the old one-row-at-a-time upserts, which
  // tolerated duplicates by just overwriting sequentially. Dedupe up front,
  // keeping the last occurrence, to match that same "last one wins" behavior.
  const byRef = new Map<string, ParcelRecord>();
  for (const r of allRecords) byRef.set(r.referenciaCatastral, r);
  const records = [...byRef.values()];
  if (records.length !== allRecords.length) {
    console.log(
      `Deduplicated ${allRecords.length} records down to ${records.length} distinct referencia catastral`
    );
  }

  const CHUNK = 500;
  for (let i = 0; i < records.length; i += CHUNK) {
    const chunk = records.slice(i, i + CHUNK);
    const rows = chunk.map(
      (r) => Prisma.sql`(
        ${randomUUID()}, ${r.referenciaCatastral}, ${r.municipality}, ${r.province}, ${r.autonomousCommunity},
        ${r.latitude}, ${r.longitude}, ${JSON.stringify(r.boundary)}::jsonb,
        ${r.streetName}, ${r.streetNumber},
        ${r.plotSize}, ${r.builtArea}, ${r.constructionYear}, ${r.numberOfFloors},
        ${r.cadastralUse}::"CadastralClass", ${r.landUse}::"LandUse",
        ${r.sourceDataset}, now()
      )`
    );

    await prisma.$executeRaw`
      INSERT INTO "catastro_parcels" (
        "id", "referenciaCatastral", "municipality", "province", "autonomousCommunity",
        "latitude", "longitude", "boundary",
        "streetName", "streetNumber",
        "plotSize", "builtArea", "constructionYear", "numberOfFloors",
        "cadastralUse", "landUse",
        "sourceDataset", "importedAt"
      )
      VALUES ${Prisma.join(rows)}
      ON CONFLICT ("referenciaCatastral") DO UPDATE SET
        "municipality" = EXCLUDED."municipality",
        "province" = EXCLUDED."province",
        "autonomousCommunity" = EXCLUDED."autonomousCommunity",
        "latitude" = EXCLUDED."latitude",
        "longitude" = EXCLUDED."longitude",
        "boundary" = EXCLUDED."boundary",
        "streetName" = EXCLUDED."streetName",
        "streetNumber" = EXCLUDED."streetNumber",
        "plotSize" = EXCLUDED."plotSize",
        "builtArea" = EXCLUDED."builtArea",
        "constructionYear" = EXCLUDED."constructionYear",
        "numberOfFloors" = EXCLUDED."numberOfFloors",
        "cadastralUse" = EXCLUDED."cadastralUse",
        "landUse" = EXCLUDED."landUse",
        "sourceDataset" = EXCLUDED."sourceDataset"
    `;
    console.log(`Upserted ${Math.min(i + CHUNK, records.length)}/${records.length}`);
  }
}

// ---------------------------------------------------------------------------
// Debug mode
// ---------------------------------------------------------------------------

async function runInspect(pathArg: string) {
  const isUrl = /^https?:\/\//i.test(pathArg);
  const isZip = pathArg.toLowerCase().endsWith(".zip");

  let gmlFiles: { name: string; buffer: Buffer }[];
  if (isUrl) {
    const res = await fetch(pathArg);
    if (!res.ok) throw new Error(`HTTP ${res.status} downloading ${pathArg}`);
    const buffer = Buffer.from(await res.arrayBuffer());
    gmlFiles = isZip
      ? new AdmZip(buffer)
          .getEntries()
          .filter((e) => e.entryName.toLowerCase().endsWith(".gml"))
          .map((e) => ({ name: e.entryName, buffer: e.getData() }))
      : [{ name: pathArg, buffer }];
  } else {
    const fs = await import("node:fs");
    gmlFiles = isZip
      ? new AdmZip(pathArg)
          .getEntries()
          .filter((e) => e.entryName.toLowerCase().endsWith(".gml"))
          .map((e) => ({ name: e.entryName, buffer: e.getData() }))
      : [{ name: pathArg, buffer: fs.readFileSync(pathArg) }];
  }

  for (const file of gmlFiles) {
    console.log(`--- ${file.name} ---`);

    const byType = new Map<string, unknown>();
    let count = 0;
    for (const fragment of iterateMemberFragments(file.buffer)) {
      count++;
      const feature = parseMemberFragment(fragment);
      const type = Object.keys(feature)[0];
      if (type && !byType.has(type)) byType.set(type, feature);
    }
    console.log(`Feature member count: ${count}`);
    console.log(`Distinct feature types: ${[...byType.keys()].join(", ")}`);
    for (const [type, example] of byType) {
      console.log(`--- First "${type}" example (truncated to 3000 chars) ---`);
      console.log(JSON.stringify(example, null, 2).slice(0, 3000));
    }

    const parcels = parseCadastralParcelsGml(file.buffer);
    const buildings = parseBuildingsGml(file.buffer);
    console.log(`Parsed as CadastralParcels: ${parcels.length} entries`);
    if (parcels[0]) console.log(JSON.stringify(parcels[0], null, 2));
    console.log(`Parsed as Buildings: ${buildings.length} entries`);
    if (buildings[0]) console.log(JSON.stringify(buildings[0], null, 2));
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const args = parseArgs();

  if (args.inspect) {
    await runInspect(args.inspect);
    return;
  }

  if (args.countOnly) {
    await runCount(args);
    return;
  }

  console.log(`Importing Catastro parcels for ${args.municipality}, ${args.province}...`);

  console.log("Locating Cadastral Parcels (CP) feed...");
  const cpProvinceFeedUrl = await findFeedEntryHref(CP_ATOM_INDEX_URL, args.province);
  const cpZipUrl = await findZipUrl(cpProvinceFeedUrl, args.municipality);
  console.log(`CP zip: ${cpZipUrl}`);

  console.log("Locating Buildings (BU) feed...");
  const buProvinceFeedUrl = await findFeedEntryHref(BU_ATOM_INDEX_URL, args.province);
  const buZipUrl = await findZipUrl(buProvinceFeedUrl, args.municipality);
  console.log(`BU zip: ${buZipUrl}`);

  console.log("Downloading + parsing parcels...");
  const cpGmlFiles = await downloadGmlFiles(cpZipUrl);
  const parcels = cpGmlFiles.flatMap((f) => parseCadastralParcelsGml(f.buffer));
  console.log(`Parsed ${parcels.length} parcels`);

  console.log("Downloading + parsing buildings...");
  const buGmlFiles = await downloadGmlFiles(buZipUrl);
  const buildings = buGmlFiles.flatMap((f) => parseBuildingsGml(f.buffer));
  console.log(`Parsed ${buildings.length} buildings`);

  const buildingsByParcel = new Map<string, RawBuilding[]>();
  for (const b of buildings) {
    const key = b.referenciaCatastral.slice(0, 14);
    const list = buildingsByParcel.get(key) ?? [];
    list.push(b);
    buildingsByParcel.set(key, list);
  }

  console.log("Locating Addresses (AD) feed...");
  const adProvinceFeedUrl = await findFeedEntryHref(AD_ATOM_INDEX_URL, args.province);
  const adZipUrl = await findZipUrl(adProvinceFeedUrl, args.municipality);
  console.log(`AD zip: ${adZipUrl}`);

  console.log("Downloading + parsing addresses...");
  const adGmlFiles = await downloadGmlFiles(adZipUrl);
  const addresses = adGmlFiles.flatMap((f) => parseAddressesGml(f.buffer));
  console.log(`Parsed ${addresses.length} addresses`);

  // First address wins per parcel — a parcel can have multiple portals/
  // frontages, and we only store one representative street name + number.
  const addressByParcel = new Map<string, RawAddress>();
  for (const addr of addresses) {
    const key = addr.referenciaCatastral.slice(0, 14);
    if (!addressByParcel.has(key)) addressByParcel.set(key, addr);
  }

  let streetFilteredParcels = parcels;
  if (args.streets && args.streets.length > 0) {
    const targetStreets = args.streets.map(normalizeStreetText);
    const matchedRefs = new Set<string>();
    for (const addr of addresses) {
      const normalized = normalizeStreetText(addr.streetName);
      if (targetStreets.some((target) => normalized.includes(target))) {
        matchedRefs.add(addr.referenciaCatastral);
      }
    }
    console.log(
      `${matchedRefs.size} distinct parcel references matched streets: ${args.streets.join(", ")}`
    );

    streetFilteredParcels = parcels.filter((p) => matchedRefs.has(p.referenciaCatastral.slice(0, 14)));
    console.log(`${streetFilteredParcels.length} parcels remain after street filtering`);
  }

  const limited = args.limit ? streetFilteredParcels.slice(0, args.limit) : streetFilteredParcels;
  const records: ParcelRecord[] = [];

  for (const parcel of limited) {
    if (!parcel.posList || !parcel.srsName) {
      console.warn(`Skipping ${parcel.referenciaCatastral}: missing geometry`);
      continue;
    }
    const ring = reprojectRing(parcel.posList, parcel.srsName);
    if (ring.length < 3) {
      console.warn(`Skipping ${parcel.referenciaCatastral}: could not reproject geometry`);
      continue;
    }
    const [longitude, latitude] = centroidOf(ring);

    const relatedBuildings = buildingsByParcel.get(parcel.referenciaCatastral.slice(0, 14)) ?? [];
    const constructionYear =
      relatedBuildings
        .map((b) => b.constructionYear)
        .filter((y): y is number => y !== null)
        .sort((a, b) => a - b)[0] ?? null;
    const numberOfFloors =
      relatedBuildings.reduce((max, b) => Math.max(max, b.numberOfFloors ?? 0), 0) || null;
    const builtArea =
      relatedBuildings.reduce((sum, b) => sum + (b.builtArea ?? 0), 0) || null;
    const address = addressByParcel.get(parcel.referenciaCatastral.slice(0, 14));

    records.push({
      referenciaCatastral: parcel.referenciaCatastral,
      municipality: args.municipality,
      province: args.province,
      autonomousCommunity: args.autonomousCommunity,
      latitude,
      longitude,
      boundary: { type: "Polygon", coordinates: [ring.map(([lng, lat]) => [lng, lat])] },
      streetName: address?.streetName ?? null,
      streetNumber: address?.streetNumber ?? null,
      plotSize: parcel.areaValue ?? 0,
      builtArea,
      constructionYear,
      numberOfFloors,
      cadastralUse: args.cadastralUse,
      landUse: mapLandUse(relatedBuildings[0]?.currentUse ?? null),
      sourceDataset: "INSPIRE-CP-BU-AD",
    });
  }

  console.log(`Prepared ${records.length} records for upsert`);
  await upsertBatch(records);
  console.log("Done.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
