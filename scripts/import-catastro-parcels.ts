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
import AdmZip from "adm-zip";
import { XMLParser } from "fast-xml-parser";
import proj4 from "proj4";
import { prisma } from "../src/lib/prisma";
import type { CadastralClass, LandUse } from "../src/generated/prisma/enums";

const CP_ATOM_INDEX_URL =
  process.env.CATASTRO_CP_ATOM_URL ??
  "http://www.catastro.minhap.es/INSPIRE/CadastralParcels/ES.SDGC.CP.atom.xml";
const BU_ATOM_INDEX_URL =
  process.env.CATASTRO_BU_ATOM_URL ??
  "http://www.catastro.minhap.es/INSPIRE/buildings/ES.SDGC.BU.atom.xml";

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

  return { province, municipality, autonomousCommunity, cadastralUse, limit, inspect };
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

/** Finds a feed entry whose title contains `matchName` and returns its link href. */
async function findFeedEntryHref(indexUrl: string, matchName: string): Promise<string> {
  const doc = await fetchXml(indexUrl);
  const entries = asArray(doc?.feed?.entry);
  const needle = matchName.toLowerCase();
  const match = entries.find((e) => entryTitle(e).toLowerCase().includes(needle));
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
  const needle = matchName.toLowerCase();
  const match = entries.find((e) => entryTitle(e).toLowerCase().includes(needle));
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

async function downloadGmlFiles(zipUrl: string): Promise<{ name: string; text: string }[]> {
  const res = await fetch(zipUrl);
  if (!res.ok) throw new Error(`HTTP ${res.status} downloading ${zipUrl}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  const zip = new AdmZip(buffer);
  return zip
    .getEntries()
    .filter((e) => e.entryName.toLowerCase().endsWith(".gml"))
    .map((e) => ({ name: e.entryName, text: e.getData().toString("utf-8") }));
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

function parseCadastralParcelsGml(gmlText: string): RawParcel[] {
  const doc = xmlParser.parse(gmlText);
  const root = doc.FeatureCollection ?? doc;
  const members = asArray(root.featureMember ?? root.member);
  const parcels: RawParcel[] = [];

  for (const member of members) {
    const cp = member.CadastralParcel;
    if (!cp) continue;

    const refCat = textOf(cp.nationalCadastralReference) ?? textOf(cp.localId) ?? textOf(cp.label);
    if (!refCat) continue;

    const geometry = cp.geometry;
    const surface = geometry?.MultiSurface ?? geometry?.Surface ?? geometry;
    const surfaceMember = asArray(surface?.surfaceMember)[0];
    const polygon = surfaceMember?.Polygon ?? surface?.Polygon;
    const posListRaw = polygon?.exterior?.LinearRing?.posList;
    const posList = textOf(posListRaw);
    const srsName =
      surface?.["@_srsName"] ?? polygon?.["@_srsName"] ?? geometry?.["@_srsName"] ?? null;

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

function parseBuildingsGml(gmlText: string): RawBuilding[] {
  const doc = xmlParser.parse(gmlText);
  const root = doc.FeatureCollection ?? doc;
  const members = asArray(root.featureMember ?? root.member);
  const buildings: RawBuilding[] = [];

  for (const member of members) {
    const bu = member.Building;
    if (!bu) continue;

    const refCat = textOf(bu.reference) ?? textOf(bu.localId) ?? textOf(bu.nationalCadastralReference);
    if (!refCat) continue;

    const floorsRaw = textOf(bu.numberOfFloorsAboveGround);
    const floors = floorsRaw !== null ? Number(floorsRaw) : null;

    const beginning = textOf(bu.beginning) ?? textOf(bu.beginning?.Building_value?.beginning);
    const yearMatch = beginning?.match(/\d{4}/) ?? null;

    const areaRaw = textOf(bu.value) ?? textOf(bu.officialAreaReference);
    const builtArea = areaRaw !== null ? Number(areaRaw) : null;

    buildings.push({
      referenciaCatastral: refCat.trim(),
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
  plotSize: number;
  builtArea: number | null;
  constructionYear: number | null;
  numberOfFloors: number | null;
  cadastralUse: CadastralClass;
  landUse: LandUse | null;
  sourceDataset: string;
}

async function upsertBatch(records: ParcelRecord[]) {
  const CHUNK = 500;
  for (let i = 0; i < records.length; i += CHUNK) {
    const chunk = records.slice(i, i + CHUNK);
    await prisma.$transaction(
      chunk.map((r) =>
        prisma.catastroParcel.upsert({
          where: { referenciaCatastral: r.referenciaCatastral },
          create: r,
          update: r,
        })
      )
    );
    console.log(`Upserted ${Math.min(i + CHUNK, records.length)}/${records.length}`);
  }
}

// ---------------------------------------------------------------------------
// Debug mode
// ---------------------------------------------------------------------------

async function runInspect(pathArg: string) {
  const fs = await import("node:fs");
  const isZip = pathArg.toLowerCase().endsWith(".zip");
  const gmlFiles = isZip
    ? new AdmZip(pathArg)
        .getEntries()
        .filter((e) => e.entryName.toLowerCase().endsWith(".gml"))
        .map((e) => ({ name: e.entryName, text: e.getData().toString("utf-8") }))
    : [{ name: pathArg, text: fs.readFileSync(pathArg, "utf-8") }];

  for (const file of gmlFiles) {
    console.log(`--- ${file.name} ---`);
    const parcels = parseCadastralParcelsGml(file.text);
    const buildings = parseBuildingsGml(file.text);
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
  const parcels = cpGmlFiles.flatMap((f) => parseCadastralParcelsGml(f.text));
  console.log(`Parsed ${parcels.length} parcels`);

  console.log("Downloading + parsing buildings...");
  const buGmlFiles = await downloadGmlFiles(buZipUrl);
  const buildings = buGmlFiles.flatMap((f) => parseBuildingsGml(f.text));
  console.log(`Parsed ${buildings.length} buildings`);

  const buildingsByParcel = new Map<string, RawBuilding[]>();
  for (const b of buildings) {
    const key = b.referenciaCatastral.slice(0, 14);
    const list = buildingsByParcel.get(key) ?? [];
    list.push(b);
    buildingsByParcel.set(key, list);
  }

  const limited = args.limit ? parcels.slice(0, args.limit) : parcels;
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

    records.push({
      referenciaCatastral: parcel.referenciaCatastral,
      municipality: args.municipality,
      province: args.province,
      autonomousCommunity: args.autonomousCommunity,
      latitude,
      longitude,
      boundary: { type: "Polygon", coordinates: [ring.map(([lng, lat]) => [lng, lat])] },
      plotSize: parcel.areaValue ?? 0,
      builtArea,
      constructionYear,
      numberOfFloors,
      cadastralUse: args.cadastralUse,
      landUse: mapLandUse(relatedBuildings[0]?.currentUse ?? null),
      sourceDataset: "INSPIRE-CP-BU",
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
