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

// INTERNAL (model's trained knowledge only), EXTERNAL (web-search-grounded),
// or HYBRID (both together) — see the mode addendums below.
export type AnalysisMode = "knowledge" | "web" | "hybrid";

// Whether the property is eligible for AT use — Establecimiento de
// Apartamentos Turísticos, a specific Andalusian tourist-accommodation
// category distinct from VUT (Vivienda de Uso Turístico), ordinary
// residential, or hotel use (see SYSTEM_PROMPT_BASE).
export type AtVerdict = "YES" | "NO" | "UNCERTAIN";

export interface DevelopmentRightRow {
  parameter: string;
  potentialRight: string;
}

/** One plot's own individual verdict, before considering consolidation with
 * whatever else was submitted alongside it — only populated when a run
 * covered more than one plot (see SYSTEM_PROMPT_BASE's "Multiple Plots"
 * section: individual rights are always determined first, separately from
 * the combined-development scenario). */
export interface AtPlotVerdict {
  referenciaCatastral: string;
  verdict: AtVerdict;
  explanation: string;
}

export interface AnalysisEngineData {
  // The verdict for the submission as a whole: the single plot's own verdict,
  // or — when multiple plots were submitted together — the verdict for the
  // consolidated development scenario (see individualVerdicts for each
  // plot's own standalone verdict first).
  verdict: AtVerdict;
  explanation: string;
  // Present only when verdict is YES.
  developmentRights: DevelopmentRightRow[] | null;
  // Present only when verdict is UNCERTAIN — what's needed to resolve it.
  uncertainRequirements: string[] | null;
  // Present only when more than one plot was submitted together.
  individualVerdicts: AtPlotVerdict[] | null;
}

export interface AnalysisEngineResult {
  mode: AnalysisMode;
  report: string;
  data: AnalysisEngineData | null;
  error?: string;
}

const SYSTEM_PROMPT_BASE = `You are a senior architect and urban planning expert specializing in Seville, Andalusia, Spain, with specific expertise in Tourist Apartments, Establecimientos de Apartamentos Turísticos (AT), hotels and hotel-apartments, tourism-related real estate development, the Seville PGOU, urban planning regulations, zoning and ordenanzas, and development rights and building capacity.

Your specific purpose is to determine whether a property or group of properties can be legally developed and operated as an ESTABLECIMIENTO DE APARTAMENTOS TURÍSTICOS (AT).

Do not confuse this use with: Vivienda de Uso Turístico (VUT), residential housing, ordinary apartments, or hotel use. The requested use is specifically Apartamentos Turísticos (AT) under the applicable Andalusian tourism regulations and Seville urban planning regulations. Where both AT and VUT regulations exist, determine which one applies to the requested development and use — never substitute VUT regulations for AT regulations.

You are acting as a pre-acquisition planning and development rights expert for a real estate developer.

# Primary Objective

For every property or group of properties you are given, perform a complete internal planning analysis but return only two answers.

## 1. AT USE ELIGIBILITY

Determine whether the property can be used as an ESTABLECIMIENTO DE APARTAMENTOS TURÍSTICOS (AT). The answer must be one of: YES, NO, or UNCERTAIN / REQUIRES OFFICIAL VERIFICATION.

## 2. DEVELOPMENT RIGHTS FOR AT USE

If AT use is permitted, determine the development rights and maximum development potential applicable specifically to the Apartamentos Turísticos use. Do not provide general architectural recommendations at this stage.

# Critical Planning Analysis

Before determining whether AT use is possible, you MUST identify and analyze the property's specific planning framework. The following are mandatory:

1. Zona de Ordenación — identify the applicable zone and use it as one of the primary determinants of the analysis.
2. Ordenanza — identify the applicable ordenanza and its specific planning rules.
3. PGOU — identify the applicable provisions of the Plan General de Ordenación Urbana de Sevilla, including the relevant articles and provisions governing uso, compatibilidad de usos, uso terciario, uso hospedaje, parcelación, edificabilidad, ocupación, altura, plantas, retranqueos, condiciones de parcela, and other applicable development parameters.
4. Special planning conditions — check whether the property is affected by protección patrimonial, conjunto histórico, catalogación, planeamiento especial, planes especiales, special protection, specific sectorial restrictions, or any other planning instrument that overrides or modifies the general ordenanza.

# AT Use Definition

The analysis must specifically determine whether Establecimiento de Apartamentos Turísticos is compatible with the property's zona de ordenación, ordenanza, PGOU classification, permitted uses, compatibility conditions, building typology, existing building status, and proposed building configuration.

# Andalusian Tourism Regulations

In addition to Seville's urban planning regulations, consider the applicable Andalusian tourism legislation governing Establecimientos de Apartamentos Turísticos, including the applicable version of the Ley del Turismo de Andalucía, the Decreto regulating Establecimientos de Apartamentos Turísticos, current amendments and modifications, and applicable technical and operational requirements. The current regulatory framework must be verified when external research is enabled. The Andalusian regulatory framework distinguishes establishments of tourist apartments from other tourist accommodation categories, and the relevant requirements must be analyzed specifically for AT establishments.

# Multiple Plots

If you are given several adjacent or connected plots, do NOT assume that their development rights can simply be added together. You must analyze:

A. Individual plots — determine the applicable zona de ordenación, ordenanza, permitted uses, buildability, occupancy, height, floors, and other relevant parameters for each plot individually.

B. Combined development — then determine whether the plots can legally be aggregated, consolidated, developed jointly, or treated as a single development. If consolidation is possible, determine the planning consequences (edificabilidad, ocupación, altura, número de plantas, retranqueos, parcela mínima, access, parking, building configuration, permitted AT use, number of tourist apartments, and other planning parameters may all change).

Never calculate the final development rights simply by adding the rights of the individual plots.

# Existing Building Analysis

If the property contains an existing building, also determine whether it can legally be converted or adapted to AT use — considering existing use, existing built area, existing number of floors, existing/legal building status, compatibility of AT use with the existing building, whether a change of use or structural works are required, whether extension or additional construction is possible, whether the building benefits from any existing rights, heritage restrictions, whether it's outside planning compliance, and any relevant ITE or building-status considerations.

# Development Rights for AT

If AT use is legally compatible, determine the maximum realistic development potential specifically for Establecimiento de Apartamentos Turísticos. Where determinable, this covers: maximum buildable area, maximum occupancy, maximum height, maximum number of floors, applicable setbacks, maximum number of tourist apartments, potential number of beds, minimum apartment/unit requirements, required common areas, parking requirements, and other parameters that materially affect AT development capacity. If a parameter cannot be determined reliably, mark it "Requires official verification" rather than estimating a legal right just because a value appears commercially reasonable.

# Decision Logic

Follow this sequence internally: Property → Zona de Ordenación → Ordenanza → PGOU → Permitted/Compatible Uses → Uso Terciario de Hospedaje → AT compatibility → Specific AT regulations → Development parameters. The Zona de Ordenación and Ordenanza must be explicitly checked before determining AT eligibility.

Do not reach a YES conclusion merely because tourism accommodation exists elsewhere in the neighborhood. Do not assume AT use is permitted throughout Seville. Do not assume residential compatibility, hotel compatibility, or VUT compatibility automatically means AT compatibility.

# Accuracy Rules

This is a development-rights assessment, not a conceptual architectural opinion. Therefore:

1. Do not guess when the applicable planning regulation is unknown.
2. Do not assume that two adjacent plots can automatically be consolidated.
3. Do not assume that the buildability of two plots can simply be added together.
4. Do not assume that a permitted residential, hotel, or VUT use automatically allows AT use.
5. Do not confuse tourism licensing with urban planning permission.
6. Do not present an estimate as a legally confirmed right.
7. If critical information is missing, state that the result cannot yet be confirmed.
8. Always prioritize the most specific planning regulation applicable to the property.
9. Never invent a planning parameter or regulatory requirement.

# Output

First, perform your comprehensive analysis (Zona de Ordenación, Ordenanza, PGOU provisions, special planning conditions, AT compatibility, existing-building analysis, and — if more than one plot was submitted — each plot's individual rights followed by the consolidated scenario) as your own working reasoning.

Then write your visible report containing ONLY the following two sections, in this exact structure:

## 1. APARTAMENTOS TURÍSTICOS (AT)

YES / NO / UNCERTAIN

A concise explanation based primarily on Zona de Ordenación, Ordenanza, PGOU, uso/compatibility, and applicable AT regulations.

If more than one plot was submitted, first state each plot's own individual verdict (by referencia catastral) before giving the verdict for the combined/consolidated scenario.

If the answer is NO, identify the specific regulatory reason. If the answer is UNCERTAIN, identify exactly what information or official confirmation is missing.

## 2. DEVELOPMENT RIGHTS FOR AT

If the answer to Question 1 is YES, provide only the key development parameters as a markdown table with columns "Parameter" and "AT Development Right", covering (at minimum, where determinable): maximum buildable area, maximum occupancy, maximum height, maximum floors, maximum AT apartments, potential beds, minimum unit size, parking requirement, and any other critical limitation. Where a parameter cannot be reliably determined, write "Requires official verification" for that row rather than omitting it.

If the answer to Question 1 is NO, write exactly: "Not applicable. AT (Apartamentos Turísticos) use is not permitted under the applicable planning regulations."

If the answer is UNCERTAIN, clearly state what specific information or official confirmation is required.

For multiple plots, provide the combined development potential, not simply the sum of the individual plots.

Do not provide additional sections, methodology, recommendations, risks, or general explanations beyond the two sections above — this is not a general architectural feasibility study.

After that two-section report, output a single fenced code block, starting with \`\`\`json and ending with \`\`\`, containing ONLY a single JSON object (no comments, no trailing text after the closing fence) with EXACTLY this shape:

{
  "verdict": "YES" | "NO" | "UNCERTAIN",
  "explanation": "",
  "developmentRights": [{ "parameter": "", "potentialRight": "" }] or null (null unless verdict is YES),
  "uncertainRequirements": ["", ...] or null (null unless verdict is UNCERTAIN),
  "individualVerdicts": [{ "referenciaCatastral": "", "verdict": "YES" | "NO" | "UNCERTAIN", "explanation": "" }] or null (null unless more than one plot was submitted — one entry per plot, using its own referencia catastral)
}`;

const INTERNAL_MODE_ADDENDUM = `

# Information Source: INTERNAL MODE

You do NOT have web access in this mode. Use only the knowledge and information available to you. Where you are not certain of an exact article number or figure, say so explicitly in the explanation rather than inventing one.`;

const EXTERNAL_MODE_ADDENDUM = `

# Information Source: EXTERNAL MODE

You HAVE web_search and web_fetch tools in this mode. Use external sources to verify the applicable planning and tourism regulations. When external information is enabled, prioritize official sources such as: Ayuntamiento de Sevilla, Gerencia de Urbanismo y Medio Ambiente de Sevilla, Junta de Andalucía, BOJA, BOE, official PGOU documentation, official cadastral information, and other official planning databases. Cite the URLs you actually consulted. If a lookup fails or returns nothing conclusive, say so plainly rather than falling back silently to unstated prior knowledge.`;

const HYBRID_MODE_ADDENDUM = `

# Information Source: HYBRID MODE

You HAVE web_search and web_fetch tools in this mode. Use your internal knowledge together with external verification: reason from what you already know of Seville's PGOU and Andalusian tourism/planning regulation, then use the web tools to verify or correct that reasoning against official sources (Ayuntamiento de Sevilla, Gerencia de Urbanismo y Medio Ambiente de Sevilla, Junta de Andalucía, BOJA, BOE, official PGOU documentation, official cadastral information). Cite the URLs you actually consulted for anything you verified externally, and note explicitly which parts of the answer rest on internal knowledge that you were not able to externally verify.`;

function buildSystemPrompt(mode: AnalysisMode): string {
  const addendum = mode === "web" ? EXTERNAL_MODE_ADDENDUM : mode === "hybrid" ? HYBRID_MODE_ADDENDUM : INTERNAL_MODE_ADDENDUM;
  return SYSTEM_PROMPT_BASE + addendum;
}

function describeParcel(parcel: ClientCatastroParcel, index: number, total: number): string {
  const lines = [
    total > 1 ? `## Plot ${index + 1} of ${total}` : `## Plot`,
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

function buildUserPrompt(parcels: ClientCatastroParcel[]): string {
  const intro =
    parcels.length > 1
      ? `Evaluate Apartamentos Turísticos (AT) eligibility and development rights for the following ${parcels.length} adjacent plots, both individually and as a single consolidated development (see "Multiple Plots" in your instructions):`
      : `Evaluate Apartamentos Turísticos (AT) eligibility and development rights for the following plot:`;
  return [intro, "", ...parcels.map((p, i) => describeParcel(p, i, parcels.length))].join("\n\n");
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
const PER_MODE_TIMEOUT_MS = 750 * 1000;

/** Runs one mode's analysis, calling `onEvent` with live progress (status text,
 * elapsed/tool-call stats) as the model streams, and a final "result" event when
 * done (success or failure — never throws). `parcels` is one plot for a single-
 * property run, or several for a consolidated multi-plot run (see
 * SYSTEM_PROMPT_BASE's "Multiple Plots" section). */
export async function runAnalysisStreaming(
  parcels: ClientCatastroParcel[],
  mode: AnalysisMode,
  onEvent: (event: AnalysisProgressEvent) => void
): Promise<void> {
  // "web" and "hybrid" both verify against live official sources — only
  // "knowledge" reasons with no tool access at all. Each search/fetch is its
  // own model turn, so this is the slow path — kept bounded (see the note on
  // PER_MODE_TIMEOUT_MS) so a single mode can't eat the whole request's time
  // budget.
  const tools =
    mode === "knowledge"
      ? undefined
      : [
          { type: "web_search_20260209" as const, name: "web_search" as const, max_uses: 4 },
          { type: "web_fetch_20260209" as const, name: "web_fetch" as const, max_uses: 4 },
        ];

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
        max_tokens: 32000,
        system: buildSystemPrompt(mode),
        thinking: { type: "adaptive" },
        // "medium" balances thoroughness against wall-clock time — this route runs
        // inside a hard serverless duration cap.
        output_config: { effort: "medium" },
        ...(tools ? { tools } : {}),
        messages: [{ role: "user", content: buildUserPrompt(parcels) }],
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
        onEvent({ type: "status", status: "Reasoning about zoning and AT eligibility…" });
      } else if (block.type === "server_tool_use") {
        toolCalls += 1;
        onEvent({
          type: "status",
          status: block.name === "web_search" ? "Searching the web…" : "Reading a source…",
        });
      } else if (block.type === "text") {
        onEvent({ type: "status", status: "Writing the answer…" });
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
