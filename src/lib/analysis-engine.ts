import Anthropic from "@anthropic-ai/sdk";
import type { ClientCatastroParcel } from "@/lib/types";

// Constructed lazily (not at module load) since `new Anthropic()` throws
// immediately if ANTHROPIC_API_KEY isn't set, and this module is imported by
// API routes that shouldn't fail to even load without that key configured.
let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!client) client = new Anthropic();
  return client;
}

export type AnalysisMode = "knowledge" | "web";

export interface ResidualLandValue {
  commercial_use_allowed: string;
  tourist_use_allowed: string;
  gross_buildable_area: string;
  saleable_area: string;
  estimated_residential_units: string;
  estimated_hotel_rooms: string;
  estimated_tourist_apartments: string;
  estimated_studio_apartments: string;
  commercial_area: string;
  parking_spaces: string;
  construction_cost_assumption_eur_m2: string;
  total_construction_cost: string;
  gross_development_value: string;
  developer_margin: string;
  residual_land_value: string;
  highest_and_best_use: string;
}

export interface AnalysisEngineData {
  parcel_area: string;
  existing_build_area: string;
  existing_floors: string;
  planning_zone: string;
  urban_classification: string;
  ordinance: string;
  special_plan: string;
  protection_level: string;
  allowed_uses: string[];
  max_build_area: string;
  remaining_buildability: string;
  max_footprint: string;
  max_height: string;
  max_floors: string;
  parking_required: string;
  heritage_constraints: string[];
  planning_constraints: string[];
  development_options: string[];
  planning_risk: string;
  overall_score: string;
  residual_land_value?: ResidualLandValue;
}

export interface AnalysisEngineResult {
  mode: AnalysisMode;
  report: string;
  data: AnalysisEngineData | null;
  error?: string;
}

const SYSTEM_PROMPT_BASE = `You are an expert Spanish Urban Planning Consultant, Architect, and Real Estate Development Analyst specializing in the City of Sevilla, Andalucia.

Your objective is to determine the maximum legal development potential of a property based on Catastro data, the PGOU of Sevilla, urban planning ordinances, special plans, heritage regulations, and current planning legislation.

You must reason exactly as an experienced Spanish architect would perform an initial feasibility study. You never rely only on Catastro. Catastro only describes the existing property; the planning documents determine what may legally be built.

The input you receive already provides: cadastral reference, address, coordinates, parcel area, existing built area, existing floors, existing uses, construction year, building geometry, and parcel geometry.

Work through these steps, in order, in your written report:

Step 1 - Identify Applicable Planning: determine the planning zone (ordenanza), urban classification, planning category, planning sector, development area, planning unit, special planning area, historic district, and protection zone. Primary sources: the official Sevilla PGOU, municipal planning maps, GeoPortal, zoning ordinances, and approved planning documents.

Step 2 - Search Applicable Regulations: locate every regulation affecting the parcel — PGOU, Special Plans, PERI, PE, PEP, Estudios de Detalle, Catalogues, approved modifications, urban ordinances, planning modifications, planning consultations. Do not stop after finding the zoning; search all applicable planning documents.

Step 3 - Determine Legal Constraints: maximum height, maximum floors, maximum occupancy, maximum buildability, setbacks, facade alignment, rear/side setback, minimum patio dimensions, minimum open space, roof/attic/basement regulations, parking requirements, accessibility requirements, hotel/residential/commercial requirements, mixed-use permissions, volume restrictions, plot division/aggregation rules.

Step 4 - Heritage Analysis: determine whether the parcel is protected, partially protected, inside the historic centre, inside a protection buffer, BIC, a catalogued building, facade-protected, environmentally protected, archaeologically protected, tree-protected, or landscape-protected. Explain every restriction.

Step 5 - Allowed Uses: return every permitted use (residential, tourist apartments, hotel, hostel, office, retail, restaurant, medical, education, mixed use, storage, industrial, parking, etc.). If conditional uses exist, explain the required approvals.

Step 6 - Buildability Calculation: maximum gross floor area, maximum net floor area (estimate), maximum footprint, maximum floors, maximum height, maximum basement area, maximum penthouse area, maximum terrace area, remaining build rights, expansion potential, demolition-and-rebuild potential, estimated development envelope. If buildability is not explicitly defined by an FAR, derive it from the applicable rules governing height, alignments, occupancy, patios, and setbacks, and clearly explain the assumptions used.

Step 7 - Development Scenarios: generate feasibility scenarios (e.g. maintain building with maximum extension, partial demolition, complete redevelopment, hotel conversion, tourist apartments, residential apartments), each with estimated new area, estimated cost, advantages, and disadvantages. Estimate number of apartments, hotel rooms, tourist apartments, commercial area, and parking spaces per relevant scenario.

Step 8 - Risk Analysis: classify planning risk, legal risk, heritage risk, technical risk, permit complexity, and planning certainty, each scored Low / Medium / High / Very High, with an explanation for each.

Step 9 - Opportunity Score: calculate a development score (0-100) based on remaining buildability, planning flexibility, location, allowed uses, height, parcel geometry, protection level, ease of permitting, hotel potential, residential potential, and commercial potential.

Step 10 - Residual Land Value Engine: using the buildability and scenario figures above, state plainly whether commercial use is legally allowed on this parcel and whether tourist use (tourist apartments/hotel) is legally allowed, then estimate the maximum Gross Buildable Area (GBA), Saleable/Net Sellable Area (NSA), estimated number of residential units, estimated number of hotel rooms, estimated number of tourist apartments, an estimated studio apartment range, commercial area, parking spaces, a construction cost assumption in EUR/m2 (state the assumption and how it was chosen — a reasonable current Sevilla market range unless the user has specified otherwise), total construction cost, Gross Development Value (GDV), a reasonable developer margin, the resulting Residual Land Value, and the Highest and Best Use (HBU) among the scenarios in Step 7.

For the estimated studio apartment range specifically: this is how many studio ("estudio") units the estimated NSA could be subdivided into if operated as a classified apartamento turístico establishment under Andalucía's tourist-apartment regulation (Decreto regulating Apartamentos Turísticos de la Comunidad Autónoma de Andalucía and its later modifications). That regulation sets a minimum useful floor area (superficie útil) per unit that varies by the establishment's "llave" (key) classification tier (e.g. 1-key through 4-key/Superior) — the higher the classification, the larger the required minimum unit size. State the minimum floor-area figures per tier that you are relying on, cite the decree/article, and derive a low-to-high unit-count range (NSA divided by the largest relevant minimum for the low end, by the smallest for the high end), noting which tier corresponds to each end of the range. If you are not certain of the exact current minimum floor-area figures per tier, say so explicitly and flag the range as a Professional Assumption to be verified against the current Junta de Andalucía regulation rather than inventing precise figures.

Agent rules:
- Never estimate planning parameters without identifying the governing regulation.
- Always cite the exact planning document, article, section, or ordinance that supports each conclusion, to the extent you are able to.
- If multiple planning documents apply, identify all of them and explain which takes precedence.
- Clearly distinguish Existing Conditions (Catastro), Planning Rights (PGOU and planning documents), Calculated Potential, and Professional Assumptions.
- If the planning documents are ambiguous or conflicting, explain the ambiguity instead of guessing.
- If the parcel is located within a Special Plan or protected area, analyze those regulations before relying on the base PGOU.
- Every conclusion must be traceable to an official planning source to the extent possible.
- This is a preliminary AI-generated feasibility screening, not a substitute for a licensed architect's or urban planner's report. State this limitation explicitly near the top of your report, and note that every figure must be verified against the official PGOU de Sevilla, GeoPortal municipal, and applicable planning instruments before being relied on for an investment decision.

Write your report as clear prose and markdown headings following Steps 1-10 above.

After the full written report, output a single fenced code block, starting with \`\`\`json and ending with \`\`\`, containing ONLY a single JSON object (no comments, no trailing text after the closing fence) with EXACTLY this shape (all values as strings unless noted, arrays of strings where indicated, use "Unknown" or "Not applicable" rather than omitting a key):

{
  "parcel_area": "",
  "existing_build_area": "",
  "existing_floors": "",
  "planning_zone": "",
  "urban_classification": "",
  "ordinance": "",
  "special_plan": "",
  "protection_level": "",
  "allowed_uses": [],
  "max_build_area": "",
  "remaining_buildability": "",
  "max_footprint": "",
  "max_height": "",
  "max_floors": "",
  "parking_required": "",
  "heritage_constraints": [],
  "planning_constraints": [],
  "development_options": [],
  "planning_risk": "",
  "overall_score": "",
  "residual_land_value": {
    "commercial_use_allowed": "",
    "tourist_use_allowed": "",
    "gross_buildable_area": "",
    "saleable_area": "",
    "estimated_residential_units": "",
    "estimated_hotel_rooms": "",
    "estimated_tourist_apartments": "",
    "estimated_studio_apartments": "",
    "commercial_area": "",
    "parking_spaces": "",
    "construction_cost_assumption_eur_m2": "",
    "total_construction_cost": "",
    "gross_development_value": "",
    "developer_margin": "",
    "residual_land_value": "",
    "highest_and_best_use": ""
  }
}`;

const KNOWLEDGE_MODE_ADDENDUM = `
You do NOT have web access in this mode. Reason entirely from your trained knowledge of Sevilla's PGOU, its ordinances, and general Spanish urban planning law. Where you are not certain of an exact article number or figure, say so explicitly rather than inventing one, and flag it as a "Professional Assumption" to be verified rather than a cited fact.`;

const WEB_MODE_ADDENDUM = `
You HAVE web_search and web_fetch tools in this mode. Use them to look up the parcel's location on the official Sevilla GeoPortal / información urbanística portal (sevilla.org, urbanismo.sevilla.org), and to find and read the actual PGOU de Sevilla text, ordinances, and any special plans that apply. Prefer official sevilla.org / Junta de Andalucia / Sede Electronica del Catastro sources. Cite the URLs you actually consulted. If a lookup fails or returns nothing conclusive, say so plainly rather than falling back silently to unstated prior knowledge.`;

function buildSystemPrompt(mode: AnalysisMode): string {
  return SYSTEM_PROMPT_BASE + (mode === "web" ? WEB_MODE_ADDENDUM : KNOWLEDGE_MODE_ADDENDUM);
}

function buildUserPrompt(parcel: ClientCatastroParcel): string {
  const lines = [
    `Perform a full feasibility study on the following parcel:`,
    ``,
    `Referencia Catastral: ${parcel.referenciaCatastral}`,
    `Address: ${[parcel.streetName, parcel.streetNumber].filter(Boolean).join(" ") || "Unknown"}`,
    `Municipality: ${parcel.municipality}`,
    `Province: ${parcel.province}`,
    `Autonomous Community: ${parcel.autonomousCommunity}`,
    `Coordinates: ${parcel.latitude}, ${parcel.longitude}`,
    `Parcel Area: ${parcel.plotSize} m2`,
    `Existing Built Area: ${parcel.builtArea != null ? `${parcel.builtArea} m2` : "Unknown"}`,
    `Existing Floors: ${parcel.numberOfFloors ?? "Unknown"}`,
    `Construction Year: ${parcel.constructionYear ?? "Unknown"}`,
    `Cadastral Use Class: ${parcel.cadastralUse}`,
    `Land Use: ${parcel.landUse ?? "Unknown"}`,
    `Parcel Boundary (GeoJSON): ${parcel.boundary ? JSON.stringify(parcel.boundary) : "Unknown"}`,
  ];
  return lines.join("\n");
}

function extractJsonBlock(text: string): AnalysisEngineData | null {
  const matches = [...text.matchAll(/```json\s*([\s\S]*?)```/gi)];
  const last = matches[matches.length - 1];
  if (!last) return null;
  try {
    return JSON.parse(last[1].trim()) as AnalysisEngineData;
  } catch {
    return null;
  }
}

function extractReport(text: string): string {
  return text.replace(/```json\s*[\s\S]*?```/gi, "").trim();
}

export type AnalysisProgressEvent =
  | { type: "status"; status: string }
  | { type: "stats"; elapsedMs: number; outputChars: number; toolCalls: number }
  | { type: "result"; result: AnalysisEngineResult };

// Leaves headroom under the API route's maxDuration (see src/app/api/analysis-engine/route.ts)
// for the response to actually be returned rather than getting cut off mid-flight.
// Modes run concurrently (see route.ts's Promise.allSettled), so this is the actual
// per-request ceiling, not something that stacks across modes.
//
// NOTE: the SDK's own `timeout` request option does NOT bound this for a streaming
// request — `fetch()` resolves as soon as response headers arrive (i.e. once the
// stream opens), so the SDK's per-fetch timer is cleared right away and never
// covers the time spent reading the streamed body afterward. A slow-but-steadily-
// streaming response (thinking/tool-use deltas trickling in for minutes) can run
// well past this "timeout" with no error — which is exactly what let a request
// through to Vercel's own hard 300s function-duration kill in production. We
// enforce it ourselves below via `stream.abort()` on a plain wall-clock setTimeout.
//
// Was 200s, then 270s — both turned out too conservative in practice. 200s was
// cutting off web-grounded runs whose tool loop (up to 4 web_search + 4 web_fetch
// calls, each its own model turn) legitimately needs longer. 270s was cutting off
// *knowledge-based* runs too, once max_tokens was raised from 8000 to 64000 to
// stop reports truncating mid-sentence (see the max_tokens comment below): freed
// from that artificially low ceiling, a genuinely thorough, heavily-cited 10-step
// report can take several minutes to finish streaming, and this watchdog was
// aborting in-progress runs that would have completed fine given more room.
// Raised to 750s to match the route's maxDuration having gone to 800s — still a
// 50s margin for the stream to flush and the function to return cleanly before
// Vercel's own hard kill.
const PER_MODE_TIMEOUT_MS = 750 * 1000;

/** Runs one mode's analysis, calling `onEvent` with live progress (status text,
 * elapsed/tool-call stats) as the model streams, and a final "result" event when
 * done (success or failure — never throws). */
export async function runAnalysisStreaming(
  parcel: ClientCatastroParcel,
  mode: AnalysisMode,
  onEvent: (event: AnalysisProgressEvent) => void
): Promise<void> {
  // web mode's server-side tool loop (each search/fetch is its own model turn) is
  // the slow path — keep it bounded so a single mode can't eat the whole request's
  // time budget.
  const tools =
    mode === "web"
      ? [
          { type: "web_search_20260209" as const, name: "web_search" as const, max_uses: 4 },
          { type: "web_fetch_20260209" as const, name: "web_fetch" as const, max_uses: 4 },
        ]
      : undefined;

  const startedAt = Date.now();
  let toolCalls = 0;
  let outputChars = 0;
  const emitStats = () =>
    onEvent({ type: "stats", elapsedMs: Date.now() - startedAt, outputChars, toolCalls });
  const statsInterval = setInterval(emitStats, 2000);
  let watchdog: ReturnType<typeof setTimeout> | undefined;

  try {
    const stream = getClient().messages.stream(
      {
        model: "claude-opus-5",
        // On Claude Opus 5, thinking is on by default (adaptive) and its output
        // counts against this same budget, not a separate one — 8000 was letting
        // the model's own reasoning consume the entire budget before it finished
        // writing the report, let alone reached the trailing JSON block, so
        // responses were truncating mid-sentence partway through the prose.
        // Raised well clear of that: comfortably below Opus 5's 128K output cap,
        // enough headroom for the full 10-step report plus the JSON summary.
        max_tokens: 64000,
        system: buildSystemPrompt(mode),
        thinking: { type: "adaptive" },
        // "medium" balances thoroughness against wall-clock time — this route runs
        // inside a hard serverless duration cap.
        output_config: { effort: "medium" },
        ...(tools ? { tools } : {}),
        messages: [{ role: "user", content: buildUserPrompt(parcel) }],
      },
      // No retries: a timed-out request should fail fast (and let the client see
      // that failure) rather than silently retrying (default maxRetries=2) and
      // blowing well past the route's own duration cap in the process.
      { maxRetries: 0 }
    );

    // The actual wall-clock enforcement (see the note on PER_MODE_TIMEOUT_MS
    // above) — the SDK's own `timeout` option doesn't cover a streaming response's
    // full body-read duration, so we abort it ourselves after the deadline.
    watchdog = setTimeout(() => stream.abort(), PER_MODE_TIMEOUT_MS);

    onEvent({ type: "status", status: "Starting…" });

    stream.on("text", (_delta, snapshot) => {
      outputChars = snapshot.length;
    });

    stream.on("contentBlock", (block) => {
      if (block.type === "thinking") {
        onEvent({ type: "status", status: "Reasoning about zoning and constraints…" });
      } else if (block.type === "server_tool_use") {
        toolCalls += 1;
        onEvent({
          type: "status",
          status: block.name === "web_search" ? "Searching the web…" : "Reading a source…",
        });
      } else if (block.type === "text") {
        onEvent({ type: "status", status: "Writing the report…" });
      }
      emitStats();
    });

    const finalMessage = await stream.finalMessage();

    if (finalMessage.stop_reason === "refusal") {
      onEvent({
        type: "result",
        result: { mode, report: "", data: null, error: "The model declined to analyze this request." },
      });
      return;
    }

    const text = finalMessage.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("\n");

    onEvent({ type: "result", result: { mode, report: extractReport(text), data: extractJsonBlock(text) } });
  } catch (err) {
    onEvent({
      type: "result",
      result: { mode, report: "", data: null, error: err instanceof Error ? err.message : "Analysis failed" },
    });
  } finally {
    clearInterval(statsInterval);
    clearTimeout(watchdog);
  }
}
