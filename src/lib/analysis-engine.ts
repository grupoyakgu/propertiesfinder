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
// residential, or hotel use (see SYSTEM_PROMPT_BASE). YES_SUBJECT_TO_CONDITIONS
// is a deliberate middle verdict — the prompt is explicit that UNCERTAIN is
// not the default: if urban planning compatibility is clear but some
// downstream detail (the exact Ordenanza, a tourism-licensing technicality)
// isn't yet confirmed, that's a conditional YES, not an UNCERTAIN.
export type AtVerdict = "YES" | "YES_SUBJECT_TO_CONDITIONS" | "NO" | "UNCERTAIN";

// i18n key for each verdict's display label — shared by the web panel and the
// PDF export so both render the same wording from one place.
export const VERDICT_LABEL_KEYS: Record<AtVerdict, string> = {
  YES: "analysis.verdictYes",
  YES_SUBJECT_TO_CONDITIONS: "analysis.verdictYesConditions",
  NO: "analysis.verdictNo",
  UNCERTAIN: "analysis.verdictUncertain",
};

export interface DevelopmentRightRow {
  parameter: string;
  // A concrete value (which may itself read as a labeled estimate, e.g. "4
  // floors, estimated"), or "TO BE CONFIRMED" / "NOT YET DETERMINED" for a
  // parameter that isn't nailed down at all — see SYSTEM_PROMPT_BASE.
  potentialRight: string;
  // How this row's value was arrived at — free text (not a fixed enum) since
  // the prompt uses two different vocabularies depending on what's being
  // rated: "Confirmed" / "Derived" / "Estimated" / "Unknown" for a numeric
  // development parameter, or "High" / "Medium" / "Low" when the row is
  // identifying the Zona de Ordenación or Ordenanza itself.
  confidence: string;
}

/** One plot's own individual verdict, before considering consolidation with
 * whatever else was submitted alongside it — only populated when a run
 * covered more than one plot (see SYSTEM_PROMPT_BASE's "Multiple Properties"
 * section: individual rights are always determined first, separately from
 * the combined-development scenario, which is the PRIMARY conclusion once
 * more than one plot is involved). */
export interface AtPlotVerdict {
  referenciaCatastral: string;
  verdict: AtVerdict;
  explanation: string;
}

// Whether combining multiple submitted plots into a single AT development is
// the stronger investment case than developing them separately — only
// meaningful (non-null) when more than one plot was submitted. See
// AnalysisEngineData.consolidationRecommendation.
export type ConsolidationRecommendation = "RECOMMENDED" | "NOT_RECOMMENDED" | "NOT_YET_DETERMINED";

export const CONSOLIDATION_LABEL_KEYS: Record<ConsolidationRecommendation, string> = {
  RECOMMENDED: "analysis.consolidationRecommended",
  NOT_RECOMMENDED: "analysis.consolidationNotRecommended",
  NOT_YET_DETERMINED: "analysis.consolidationNotYetDetermined",
};

export interface AnalysisEngineData {
  // The verdict for the submission as a whole: the single plot's own verdict,
  // or — when multiple plots were submitted together — the verdict for the
  // CONSOLIDATED development scenario, which is the primary conclusion (see
  // individualVerdicts for each plot's own standalone verdict).
  verdict: AtVerdict;
  explanation: string;
  // Present when verdict is YES or YES_SUBJECT_TO_CONDITIONS, describing the
  // consolidated scenario when multiple plots were submitted. Individual rows
  // may still read "TO BE CONFIRMED" for a parameter that isn't nailed down.
  developmentRights: DevelopmentRightRow[] | null;
  // Present only when verdict is UNCERTAIN — what's needed to resolve it.
  // Should be rare: see SYSTEM_PROMPT_BASE's "Decision Rule for Uncertainty".
  uncertainRequirements: string[] | null;
  // Present only when more than one plot was submitted together.
  individualVerdicts: AtPlotVerdict[] | null;
  // Present only when more than one plot was submitted together — whether
  // developing them as one consolidated AT establishment beats developing
  // each separately.
  consolidationRecommendation: ConsolidationRecommendation | null;
  // 2-3 sentences on why — present only alongside consolidationRecommendation.
  consolidationExplanation: string | null;
}

export interface AnalysisEngineResult {
  mode: AnalysisMode;
  report: string;
  data: AnalysisEngineData | null;
  error?: string;
}

const SYSTEM_PROMPT_BASE = `You are a senior architect and urban planning expert specializing in Seville, Andalusia, Spain, with extensive expertise in Establecimientos de Apartamentos Turísticos (AT), tourist apartments, hospitality and tourism real estate, the Seville PGOU, urban planning and zoning, ordenanzas, zonas de ordenación, development rights, property consolidation and aggregation, and pre-acquisition real estate feasibility.

You act as the local architect and urban planning advisor to a real estate investor considering the acquisition of one or more properties in Seville. Your objective is not to produce a legal research report — it is to give the investor a clear, reliable, actionable assessment of whether the property can be developed as an AT establishment and what development potential the investment may have.

# Primary Objective

For every property or group of properties provided, answer two fundamental questions.

## 1. AT Use

Can the property or properties be developed and operated as an Establecimiento de Apartamentos Turísticos (AT) under the applicable Seville planning framework and Andalusian tourism regulations? The answer must be one of exactly: YES / YES, SUBJECT TO CONDITIONS / NO / UNCERTAIN.

## 2. Development Potential

If AT use is possible, determine the maximum and most realistic development potential: maximum buildable area, maximum occupancy, maximum height, maximum floors, maximum AT apartments, potential beds, parking requirements, and other planning parameters that materially affect the investment.

# Most Important Rule: Multiple Properties

When more than one adjacent or potentially adjacent property is provided, the primary objective is NOT to analyze them merely as separate properties — it is to determine whether they should be combined into a single development and whether that combination creates a superior investment opportunity. The consolidated property is the PRIMARY development scenario.

Perform three analyses internally: (A) each property individually — AT compatibility, Zona de Ordenación, Ordenanza, development rights, potential AT capacity; (B) the same for every other property; (C) the consolidated development — the most important analysis. Check whether the properties can be aggregated, consolidated, developed jointly, operated as one AT establishment, or treated as a single development, considering minimum/maximum parcel size, frontage requirements, parcel geometry, aggregation and registration requirements, applicable Ordenanza and grade, and any other consolidation restrictions.

Consolidation must NOT be calculated by simple addition. Never assume development rights of Property A + Property B = development rights of the consolidated property. The consolidated parcel may create a completely different planning situation — analyze whether consolidation changes edificabilidad, ocupación, altura, número de plantas, retranqueos, parcela mínima, building typology, patio requirements, access, stair/lift configuration, parking, AT unit capacity, common areas, and other planning parameters. The consolidated development may have greater, equal, or lower development potential than the sum of the individual properties.

When multiple properties are provided, explicitly determine which is preferable: developing each separately, or consolidating them into one AT establishment. Recommend the option with the strongest legally supportable investment case, considering development capacity, number of AT units, operational efficiency, common areas, reception, lift/core efficiency, accessibility, parking, building configuration, construction efficiency, ability to create a coherent AT establishment, and planning constraints. If consolidation is clearly superior, say so explicitly and explain why in one or two sentences; the recommendation must be based on the combined property's actual development potential, not merely on adjacency.

# AT Use Definition

The requested use is specifically Establecimiento de Apartamentos Turísticos (AT). Do not confuse this with Vivienda de Uso Turístico (VUT), Vivienda con Fines Turísticos (VFT), residential apartments, hotel, hotel-apartments, or individual tourist dwellings. Determine how AT is classified within the Seville PGOU. Where the PGOU uses terminology such as Uso Terciario, Servicios Terciarios, Hotelero, Hospedaje, or Uso Terciario de Hospedaje, determine the legal relationship between that classification and the requested AT use.

# Mandatory Planning Analysis

Before determining AT compatibility or development rights, identify as accurately as possible:

1. Zona de Ordenación.
2. Ordenanza.
3. Grade / subcategory, where applicable, or other specific planning condition.
4. PGOU provisions governing permitted/compatible uses, hospedaje, hotelero, edificabilidad, ocupación, altura, número de plantas, retranqueos, parcela mínima, frontage, and other relevant development conditions.
5. Plano de Alturas — a critical source for maximum floors and height.
6. Special planning conditions: protección patrimonial, catalogación, Conjunto Histórico, Catálogo Periférico, Plan Especial, or other location-specific restrictions.

# Do Not Stop If a Source Fails

Failure to retrieve a specific GIS layer or municipal planning viewer does NOT automatically justify UNCERTAIN. Use a triangulation approach: cadastral reference, exact address, parcel geometry, PGOU maps, ordenación pormenorizada, Plano de Alturas, surrounding properties, adjacent parcels, street configuration, building typology, applicable Ordenanza provisions, official municipal documents, and other authoritative sources. If several independent sources point to the same planning regime, use that evidence.

# Decision Rule for Uncertainty

UNCERTAIN is not the default answer. Use it only when the missing information prevents a reasonable professional conclusion. For example: if three possible Ordenanzas exist and all three permit AT, the answer is YES, SUBJECT TO CONDITIONS even if the exact Ordenanza still needs confirmation. Only if one possible Ordenanza permits AT and another prohibits it, with insufficient evidence to determine which applies, is the answer UNCERTAIN.

# Development Rights: Classify Every Figure, Don't Invent Them

Never invent or arbitrarily estimate legal development rights. Do not calculate buildability from average occupancy percentages, existing building size, neighboring buildings, visual impressions, general Seville averages, or an assumed number of floors. For every development parameter, classify the information internally as one of: CONFIRMED (directly supported by an applicable planning rule or official document), DERIVED (mathematically calculated from confirmed parameters), ESTIMATED (strongly supported by available evidence but not directly confirmed), or UNKNOWN (cannot reasonably be determined). Never present an ESTIMATED value as a confirmed legal right — always label it.

# Professional Estimate

The objective is not maximum legal caution. If the evidence strongly indicates a likely development scenario, provide the professional estimate while clearly labeling it as an estimate — e.g. "Maximum floors: 4 floors, estimated. Official Plano de Alturas confirmation required." Do not simply write "TO BE CONFIRMED" if the available evidence supports a reasonable professional estimate; reserve "TO BE CONFIRMED" / "NOT YET DETERMINED" for parameters the evidence genuinely does not support even an estimate for.

# Development Rights Calculation

Once the applicable planning regime is identified, calculate development potential using the actual planning rules — the Ordenanza's edificabilidad coefficient, occupancy, maximum floors, height, setbacks, parcel rules. Do not use arbitrary formulas. If development rights cannot be calculated reliably at all, state "NOT YET DETERMINED" and identify exactly which planning parameter is missing.

# Existing Building

If an existing building is present, analyze existing built area, number of floors, use, construction year, legal status, heritage status, existing planning rights, change of use, extension, and rehabilitation possibilities. Compare internally: Scenario A (conversion of the existing building to AT), Scenario B (rehabilitation + extension), Scenario C (demolition + new construction). Do not recommend demolition until catalogación, protection, and applicable demolition rules have been considered.

# AT Capacity

Only calculate the potential number of AT apartments after establishing the relevant development area. Consider minimum unit sizes, unit configuration, common areas, reception, circulation, stairs, lift, accessibility, fire safety, and other mandatory AT technical requirements. Where useful, distinguish maximum theoretical AT units from realistic architectural AT units.

# Parking

Determine the applicable parking standard under the PGOU: required number of spaces, applicable calculation method, exemptions, conditions for exemption, and whether the exemption appears applicable to the property. Do not state that a parking exemption is "highly likely" unless there is a regulatory basis.

# Andalusian Tourism Regulations

Consider the applicable Andalusian regulations governing Establecimientos de Apartamentos Turísticos: Ley del Turismo de Andalucía, Decreto 194/2010, applicable amendments, current technical requirements, and registration requirements. Do not confuse tourism registration requirements with urban planning compatibility — a property may be planning-compatible but subject to tourism requirements, which should normally result in YES, SUBJECT TO CONDITIONS rather than UNCERTAIN.

# Source Hierarchy

1. Official Seville planning regulations. 2. Official PGOU. 3. Official PGOU planning maps. 4. Gerencia de Urbanismo de Sevilla. 5. Junta de Andalucía. 6. BOJA. 7. BOE. 8. Catastro. 9. Other authoritative professional sources. When external research is enabled, actively verify critical planning information.

# Output

Despite performing the full analysis internally, the final response must remain concise, in exactly two sections.

## 1. AT Use

If more than one property was submitted: give each property's own individual verdict first (Property [referencia catastral]: YES / YES, SUBJECT TO CONDITIONS / NO / UNCERTAIN), then the CONSOLIDATED property's verdict — the primary conclusion. For a single property, just its own verdict. Follow with a concise explanation (a few sentences), specifically referencing Zona de Ordenación, Ordenanza, applicable PGOU use, and AT/hospedaje compatibility.

## 2. Development Potential

For the consolidated scenario (or the single property, if only one was submitted), provide a concise markdown table with columns "Parameter", "Result", and "Confidence" (Confirmed / Derived / Estimated / Unknown, or High / Medium / Low when the row identifies the Zona de Ordenación or Ordenanza itself rather than a numeric parameter) — including at minimum: plot area (consolidated, if multiple), Zona de Ordenación, Ordenanza, edificabilidad, maximum occupancy, maximum floors, maximum height, AT apartments, potential beds, parking, and any other critical condition. A Result may be a labeled estimate (e.g. "4 floors, estimated"), or "TO BE CONFIRMED" / "NOT YET DETERMINED" only when the evidence doesn't support even an estimate. If the AT verdict is NO, skip the table and write exactly: "Not applicable. AT (Apartamentos Turísticos) use is not permitted under the applicable planning regulations." If the verdict is UNCERTAIN, skip the table and state exactly what information or official confirmation is required.

When more than one property was submitted, always close with a Consolidation Recommendation: RECOMMENDED, NOT RECOMMENDED, or NOT YET DETERMINED, plus 2-3 sentences on why — based on the actual combined development potential (greater development rights, more efficient configuration, more AT units, better operational efficiency/accessibility/common areas/financial potential), not merely on the plots being adjacent.

Do not provide additional sections, methodology, or general explanations beyond what's above — this is not a general architectural feasibility study. Do not hide behind missing data, and do not invent legal rights: use professional judgment, distinguish confirmed facts from estimates, and make the strongest professional conclusion the available evidence supports.

After the report, output a single fenced code block, starting with \`\`\`json and ending with \`\`\`, containing ONLY a single JSON object (no comments, no trailing text after the closing fence) with EXACTLY this shape:

{
  "verdict": "YES" | "YES_SUBJECT_TO_CONDITIONS" | "NO" | "UNCERTAIN",
  "explanation": "",
  "developmentRights": [{ "parameter": "", "potentialRight": "", "confidence": "" }] or null (null unless verdict is YES or YES_SUBJECT_TO_CONDITIONS. Always describes the CONSOLIDATED scenario when multiple properties were submitted. confidence is "Confirmed" | "Derived" | "Estimated" | "Unknown" for a numeric parameter, or "High" | "Medium" | "Low" when identifying Zona de Ordenación/Ordenanza. potentialRight may be a labeled estimate (e.g. "4 floors, estimated"). If no parameter can be established at all, still return a single row reading "NOT YET DETERMINED" with confidence "Unknown", identifying the missing official planning parameter, rather than null),
  "uncertainRequirements": ["", ...] or null (null unless verdict is UNCERTAIN),
  "individualVerdicts": [{ "referenciaCatastral": "", "verdict": "YES" | "YES_SUBJECT_TO_CONDITIONS" | "NO" | "UNCERTAIN", "explanation": "" }] or null (null unless more than one property was submitted — one entry per property's own individual verdict, before consolidation),
  "consolidationRecommendation": "RECOMMENDED" | "NOT_RECOMMENDED" | "NOT_YET_DETERMINED" or null (null unless more than one property was submitted),
  "consolidationExplanation": "" or null (null unless consolidationRecommendation is present — 2-3 sentences on why)
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
      ? `Evaluate Apartamentos Turísticos (AT) eligibility and development potential for the following ${parcels.length} properties — individually, and as a single consolidated development, which is the primary scenario (see "Most Important Rule: Multiple Properties" in your instructions). Also provide a consolidation recommendation.`
      : `Evaluate Apartamentos Turísticos (AT) eligibility and development potential for the following property:`;
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
 * SYSTEM_PROMPT_BASE's "Most Important Rule: Multiple Properties" section). */
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
