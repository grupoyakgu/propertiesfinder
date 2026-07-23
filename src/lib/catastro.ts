import { XMLParser } from "fast-xml-parser";

const CALLEJERO_URL =
  process.env.CATASTRO_CALLEJERO_URL ??
  "https://ovc.catastro.meh.es/ovcservweb/OVCSWLocalizacionRC/OVCCallejero.asmx";
const COORDENADAS_URL =
  process.env.CATASTRO_COORDENADAS_URL ??
  "https://ovc.catastro.meh.es/ovcservweb/OVCSWLocalizacionRC/OVCCoordenadas.asmx";

const xmlParser = new XMLParser({ ignoreAttributes: false, trimValues: true });

export interface CatastroParcel {
  referenciaCatastral: string;
  province: string | null;
  municipality: string | null;
  address: string | null;
  use: string | null;
  surfaceM2: number | null;
  constructionYear: number | null;
}

export interface CatastroResult {
  ok: boolean;
  parcel: CatastroParcel | null;
  error: string | null;
}

function unreachable(error: unknown): CatastroResult {
  return {
    ok: false,
    parcel: null,
    error:
      error instanceof Error
        ? `Catastro service unreachable: ${error.message}`
        : "Catastro service unreachable",
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchXml(url: string, timeoutMs = 8000): Promise<any> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "text/xml, application/xml" },
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const text = await res.text();
    return xmlParser.parse(text);
  } finally {
    clearTimeout(timeout);
  }
}

function firstDefined<T>(...values: (T | undefined | null)[]): T | null {
  for (const v of values) {
    if (v !== undefined && v !== null && v !== "") return v;
  }
  return null;
}

function toNumber(value: unknown): number | null {
  if (value === undefined || value === null || value === "") return null;
  const n = Number(String(value).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseDnpResponse(refCat: string, doc: any): CatastroResult {
  const root = doc?.consulta_dnp ?? doc?.Consulta_dnpRCResult ?? doc;
  const errorCode = firstDefined<string>(
    root?.control?.cuerr,
    root?.lerr?.err?.cod
  );
  if (errorCode && errorCode !== "0") {
    const errorMsg = firstDefined<string>(root?.lerr?.err?.des) ?? `Error ${errorCode}`;
    return { ok: false, parcel: null, error: errorMsg };
  }

  const bi = root?.bico?.bi;
  if (!bi) {
    return { ok: false, parcel: null, error: "No cadastral data found for that reference" };
  }

  const rc = bi?.idbi?.rc;
  const composedRc = rc
    ? [rc.pc1, rc.pc2, rc.car, rc.cc1, rc.cc2].filter(Boolean).join("")
    : refCat;

  return {
    ok: true,
    error: null,
    parcel: {
      referenciaCatastral: composedRc || refCat,
      province: firstDefined<string>(bi?.dt?.np),
      municipality: firstDefined<string>(bi?.dt?.nm),
      address: firstDefined<string>(bi?.ldt),
      use: firstDefined<string>(bi?.debi?.luso, bi?.debi?.cpt),
      surfaceM2: toNumber(firstDefined<string>(bi?.debi?.sfc)),
      constructionYear: (() => {
        const y = toNumber(firstDefined<string>(bi?.debi?.ant));
        return y ? Math.round(y) : null;
      })(),
    },
  };
}

/**
 * Look up official cadastral parcel data by "Referencia Catastral" using the
 * public Sede Electronica del Catastro OVC web service (Consulta_DNPRC).
 * No API key required — this is a free public government service.
 */
export async function lookupByReferenciaCatastral(
  referenciaCatastral: string
): Promise<CatastroResult> {
  const refCat = referenciaCatastral.trim().toUpperCase();
  if (!/^[0-9A-Z]{14,20}$/.test(refCat)) {
    return { ok: false, parcel: null, error: "Invalid referencia catastral format" };
  }

  const url = `${CALLEJERO_URL}/Consulta_DNPRC?Provincia=&Municipio=&RC=${encodeURIComponent(refCat)}`;

  try {
    const doc = await fetchXml(url);
    return parseDnpResponse(refCat, doc);
  } catch (error) {
    return unreachable(error);
  }
}

/**
 * Resolve the "Referencia Catastral" at a given WGS84 coordinate using the
 * Consulta_RCCOOR service, then fetch full parcel data for it.
 */
export async function lookupByCoordinates(
  latitude: number,
  longitude: number
): Promise<CatastroResult> {
  const url =
    `${COORDENADAS_URL}/Consulta_RCCOOR?SRS=EPSG:4326` +
    `&Coordenada_X=${encodeURIComponent(longitude)}&Coordenada_Y=${encodeURIComponent(latitude)}`;

  try {
    const doc = await fetchXml(url);
    const root = doc?.consulta_coor ?? doc;
    const errorCode = firstDefined<string>(root?.control?.cuerr, root?.lerr?.err?.cod);
    if (errorCode && errorCode !== "0") {
      const errorMsg = firstDefined<string>(root?.lerr?.err?.des) ?? `Error ${errorCode}`;
      return { ok: false, parcel: null, error: errorMsg };
    }

    const coordenadas = root?.coordenadas?.coord;
    const first = Array.isArray(coordenadas) ? coordenadas[0] : coordenadas;
    const rc = first?.pc;
    const composedRc = rc ? [rc.pc1, rc.pc2].filter(Boolean).join("") : null;

    if (!composedRc) {
      return { ok: false, parcel: null, error: "No parcel found at those coordinates" };
    }

    return lookupByReferenciaCatastral(composedRc);
  } catch (error) {
    return unreachable(error);
  }
}
