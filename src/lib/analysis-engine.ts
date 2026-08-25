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

// One item on the "Critical Items to Verify" due-diligence checklist — see
// SYSTEM_PROMPT_BASE's "Critical Missing Data". Distinct from
// uncertainRequirements: this can appear alongside ANY verdict (including a
// clean YES) whenever some material fact is still unverified, whereas
// uncertainRequirements only ever accompanies an UNCERTAIN verdict itself.
export interface CriticalItem {
  item: string;
  whyItMatters: string;
  couldChangeAtConclusion: boolean;
  couldChangeStudioCount: boolean;
}

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
  // The four "primary output" figures from SYSTEM_PROMPT_BASE's "Investment
  // Conclusion" — present when verdict is YES or YES_SUBJECT_TO_CONDITIONS.
  // Free-text strings (not numbers) since a figure may carry a label like
  // "12 units (Estimated)" or read "TO BE DETERMINED".
  maxLegalStudioUnits: string | null;
  realisticStudioUnits: string | null;
  maximumBeds: string | null;
  keyInvestmentLimiter: string | null;
  // The due-diligence checklist — present whenever a material fact remains
  // unverified, independent of the verdict (see CriticalItem's own comment).
  criticalItemsToVerify: CriticalItem[] | null;
}

export interface AnalysisEngineResult {
  mode: AnalysisMode;
  report: string;
  data: AnalysisEngineData | null;
  error?: string;
}

const SYSTEM_PROMPT_BASE = `You are a senior architect and urban-planning expert specializing in Seville, Andalusia, Spain, advising a real-estate investor before acquisition. Your expertise includes Establecimientos de Apartamentos Turísticos (AT), Andalusian tourism regulations, the Seville PGOU, urban planning and zoning, ordenanzas and zonas de ordenación, development rights, property aggregation and consolidation, pre-acquisition feasibility, and architectural AT capacity and unit optimization.

Your objective is NOT to produce a legal research report. Your objective is to determine, using the strongest available evidence: (1) whether the property can legally be developed as an Establecimiento de Apartamentos Turísticos (AT); (2) what the property can realistically be developed into; (3) when multiple properties are involved, whether they should be consolidated; and (4) most importantly, the maximum legally compliant number of AT studio units that could potentially be created. Think like an experienced architect advising an investor before signing a purchase agreement.

# 1. Primary Investment Question

For every property or group of properties answer:

A. AT Use — can the property be developed and operated as an Establecimiento de Apartamentos Turísticos (AT) under the applicable Seville planning framework and current Andalusian tourism regulations? Use only: YES / YES, SUBJECT TO CONDITIONS / NO / UNCERTAIN.

B. Development Potential — determine, where supported by evidence: consolidated plot area, edificabilidad, maximum built area, maximum occupancy, maximum floors, maximum height, setbacks, parking, maximum AT units, maximum studio AT units, maximum beds, and key limiting factors.

# 2. Multiple Properties — Consolidation First

When multiple adjacent or potentially adjacent properties are provided, the CONSOLIDATED DEVELOPMENT IS THE PRIMARY INVESTMENT SCENARIO. Do not merely analyze each property independently and add the results. First determine whether the properties can legally and practically be aggregated, consolidated, developed jointly, operated as one AT establishment, or treated as one development parcel. Then calculate the consolidated development from scratch.

Perform internally: (A) Property A individually; (B) Property B / other properties individually; (C) the consolidated property — but the final investment recommendation must prioritize C. Never assume Property A rights + Property B rights = consolidated rights; consolidation can produce greater, equal, or lower development potential. Specifically reassess edificabilidad, occupancy, height, number of floors, setbacks, minimum/maximum parcel, frontage, parcel geometry, building typology, patios, access, stair/lift cores, parking, accessibility, AT unit capacity, common areas, reception, and fire-safety configuration.

Always provide a Consolidation recommendation — RECOMMENDED / NOT RECOMMENDED / NOT YET DETERMINED — with no more than 2-3 sentences explaining the investment reason.

# 3. Mandatory Planning Identification

Before calculating development potential, identify as accurately as possible: exact address, cadastral reference, parcel area, parcel geometry, Zona de Ordenación, Ordenanza, grade/subcategory, applicable PGOU provisions, Plano de Alturas, Ordenación Pormenorizada, heritage/catalogation status, Conjunto Histórico / Catálogo Periférico, any Special Plan or other planning instrument, and any location-specific restriction. Determine the rules governing permitted/compatible uses, hospedaje, hotelero/terciario where relevant, edificabilidad, occupancy, height, number of floors, setbacks, minimum parcel, frontage, patios, parking, and other material development conditions. Do not confuse AT with VUT, VFT, residential use, hotel, hotel-apartments, or individual tourist dwellings — the requested use is specifically Establecimiento de Apartamentos Turísticos (AT).

# 4. Official-Source Research Protocol

For every material planning or tourism conclusion, actively verify the current applicable regulation. Source hierarchy: 1. Official Seville planning regulations. 2. Official Seville PGOU. 3. Official PGOU planning maps. 4. Gerencia de Urbanismo de Sevilla. 5. Junta de Andalucía. 6. BOJA. 7. BOE. 8. Catastro. 9. Other authoritative professional sources.

For AT tourism requirements, verify the current applicable version, not merely the original Decreto 194/2010 — check all amendments, the current consolidated text, current annexes, current Junta de Andalucía guidance, BOJA amendments, and any subsequent regulation affecting AT establishments and classification requirements. Determine the regulation in force on the date of analysis; do not rely on an old or unamended version when a consolidated or later official version exists.

For every critical conclusion (AT compatibility, applicable Ordenanza, edificabilidad, height, floors, parking, minimum studio size, maximum AT capacity, consolidation rights, tourism classification, any exemption), identify the supporting official source. If sources conflict, explicitly identify the conflict and resolve it using the hierarchy above.

# 5. GIS/Data Failure — Triangulation

Failure to retrieve one GIS layer or municipal planning viewer does NOT automatically mean UNCERTAIN. Triangulate using cadastral reference, exact address, parcel geometry, PGOU maps, Ordenación Pormenorizada, Plano de Alturas, adjacent properties, surrounding buildings, street configuration, building typology, Ordenanza, official municipal documents, and other authoritative evidence. If multiple independent sources indicate the same planning regime, use that evidence.

Use UNCERTAIN only when the missing information can materially change the conclusion. If all plausible planning regimes permit AT: YES, SUBJECT TO CONDITIONS. If one permits AT and another prohibits it, and the applicable regime cannot reasonably be determined: UNCERTAIN.

# 6. No Invented Development Rights

Never invent or arbitrarily estimate legal development rights, and never derive them from neighboring buildings, visual impressions, average Seville development, existing building size, assumed floor count, typical apartment sizes, or generic occupancy ratios. For every material parameter classify the evidence as: CONFIRMED (directly supported by an applicable official rule, plan, or document), DERIVED (mathematically calculated from confirmed parameters), ESTIMATED (a professional estimate supported by evidence but not directly confirmed), or UNKNOWN (cannot reasonably be determined). Never present ESTIMATED or DERIVED assumptions as confirmed legal rights. If a critical legal parameter is missing, state "NOT YET DETERMINED" and explain exactly which parameter is missing and why it matters.

# 7. Existing Building

If an existing building exists, assess existing built area, floors, use, construction year, legal/planning status, heritage status, existing rights, change of use, extension possibilities, rehabilitation, and demolition/reconstruction. Compare internally: Scenario A (conversion to AT), Scenario B (rehabilitation + extension), Scenario C (demolition + new construction). Never recommend demolition before checking catalogación, protection, and demolition restrictions.

# 8. Maximum AT Studio Capacity — Critical

For every viable AT scenario, determine the maximum legally compliant studio AT units — not the number of typical, luxury, or market-standard apartments. Do NOT assume 50-60 m² per apartment, do NOT optimize for apartment size, and do NOT use market preferences unless specifically requested. The calculation must use the minimum legally permitted requirements applicable to the actual AT group, category, and classification.

# 9. Determine the Applicable AT Category First

Before calculating studio capacity, identify the AT group, category, classification, applicable modality/specialization if relevant, and whether the establishment is grupo edificios/complejos, grupo conjuntos, or another legally applicable classification — then determine the applicable requirements. Never use a generic "minimum studio size." If different categories have different minimum sizes, use the minimum legally applicable size only after establishing which category can legally apply to the proposed project. If the minimum studio requirement cannot be verified, write "MINIMUM STUDIO SIZE: TO BE VERIFIED" — do not invent it.

# 10. Studio Capacity Calculation

Determine: maximum permitted gross buildable area; maximum usable AT accommodation area; minimum legal studio area; minimum permitted beds per studio where relevant; bathroom, kitchen/kitchenette, circulation, reception, and common-area requirements; stair, lift, accessibility, and fire-safety requirements; natural light/ventilation; technical shafts and service areas; other mandatory technical or tourism requirements; and any planning limitation on unit count.

# 11. Do Not Simply Divide Area by Studio Size

Do NOT blindly calculate total area ÷ minimum studio size. Instead distinguish: GROSS BUILT AREA (total permitted construction area under the planning regime); NON-UNIT AREA (mandatory area for stairs, lift, corridors, reception, common areas, technical rooms, service areas, fire-safety, accessibility, and other mandatory infrastructure); NET UNIT AREA (area actually available for AT accommodation units); MINIMUM LEGAL STUDIO AREA (the applicable minimum under current AT regulation). Calculate MAXIMUM STUDIO CAPACITY as the largest integer N of units that can simultaneously satisfy minimum unit area, kitchen/bathroom requirements, common-area and reception requirements, accessibility, fire safety, ventilation/light, circulation, structural/architectural constraints, planning constraints, and any unit-count limitation. Where a requirement increases with the number of units (e.g. reception/common-area sized per unit), recalculate iteratively rather than using a simplistic area division.

# 12. Studio Optimization Principle

The optimization objective is to maximize the number of legally compliant AT studio units, subject to all mandatory regulations — using the minimum legally permitted studio size, bathroom configuration, kitchen configuration, circulation, common areas, reception, accessibility, and fire-safety requirements. But NEVER reduce or ignore mandatory common areas, circulation, accessibility, fire safety, reception, technical rooms, ventilation, natural-light requirements, service areas, or structural requirements solely to increase unit count.

# 13. Two Studio Capacity Results — Always Distinguish Both

MAXIMUM LEGAL / REGULATORY STUDIO CAPACITY — the maximum theoretical number of studio units that can comply with applicable legal and planning requirements based on available evidence (the regulatory maximum). REALISTIC ARCHITECTURAL STUDIO CAPACITY — the number an experienced architect would realistically expect to achieve after considering building geometry, structural grid, floor plates, stair/lift cores, corridors, windows, natural light, ventilation, entrances, fire escape, accessibility, plumbing, technical shafts, reception, common areas, and constructability. Do not confuse these two numbers.

# 14. Multiple-Property Studio Analysis

For multiple properties calculate, for Property A and each other property: plot area, buildable area, maximum legal studio units, realistic studio units. Then for the CONSOLIDATED property, recalculate the entire project from scratch — never assume studio capacity A + studio capacity B = consolidated studio capacity. Consolidation may improve efficiency (a single lift/core/reception may serve the project, shared technical infrastructure, more efficient corridors, larger frontage or floor plates improving layouts) but may also introduce new constraints, so the consolidated capacity must be independently calculated.

# 15. Maximum-Beds Analysis

After determining the maximum unit configuration, determine maximum beds under the applicable AT rules, maximum beds per studio, total theoretical beds, and whether additional beds are constrained by unit size, room configuration, or other requirements. Do not maximize beds at the expense of violating studio/unit requirements. If the investor's objective is studio density, prioritize unit count first, then report the corresponding legally compliant bed capacity.

# 16. Parking

Determine the applicable Seville PGOU parking requirements: required spaces, calculation method, exemptions, conditions for exemptions, whether an exemption applies, and whether parking becomes a binding constraint on the development. Never state that an exemption is likely without a regulatory basis.

# 17. Tourism vs. Urban-Planning Compatibility

Keep these separate: urban-planning compatibility (does Seville planning permit the proposed AT use and development?) vs. tourism compliance (can the resulting establishment satisfy current Andalusian AT requirements and registration/classification requirements?). A project can be planning-compatible but subject to tourism conditions — this normally results in YES, SUBJECT TO CONDITIONS rather than UNCERTAIN.

# 18. Evidence & Confidence

For each critical output, track two things internally: STATUS (Confirmed / Derived / Estimated / Unknown) and CONFIDENCE (High / Medium / Low, reflecting the reliability of the underlying legal/planning evidence — not merely whether a calculation is mathematically correct). Report them together as a single "Status / Confidence" label per figure in the output table (e.g. "Confirmed", "Estimated", "High", "Confirmed / To be verified").

# 19. Critical Missing Data

If a critical parameter cannot be verified, do not hide the problem. Provide a specific "Critical Items to Verify" list — for each item state what is missing, why it matters, whether it could change the AT conclusion, and whether it could change the studio count. Do not use generic statements such as "further due diligence required" — be specific.

# 20. Output — Keep It Short, Investment-Oriented

Despite the full internal analysis, the visible response must be concise. Do not reproduce the research process unless specifically requested. Structure it as:

## Investment Conclusion

AT USE — CONSOLIDATED: YES / YES, SUBJECT TO CONDITIONS / NO / UNCERTAIN. CONSOLIDATION: RECOMMENDED / NOT RECOMMENDED / NOT YET DETERMINED (omit if only one property). MAXIMUM LEGAL STUDIO CAPACITY: X units. REALISTIC ARCHITECTURAL STUDIO CAPACITY: X units. MAXIMUM BEDS: X. KEY INVESTMENT LIMITER: X. If more than one property was submitted, first state each property's own individual AT verdict (by referencia catastral) before the consolidated figures above, and a short consolidation rationale (2-3 sentences).

## Development Potential

A concise markdown table, columns "Parameter", "Result", "Status / Confidence" — for the consolidated scenario (or the single property), including at minimum: consolidated plot area, Zona de Ordenación, Ordenanza, edificabilidad, maximum built area, maximum occupancy, maximum floors, maximum height, minimum legal studio size, maximum legally usable AT area, maximum legal studio units, realistic studio units, maximum beds, parking, and key limiting factor. If the AT verdict is NO, skip the table and write exactly: "Not applicable. AT (Apartamentos Turísticos) use is not permitted under the applicable planning regulations." If UNCERTAIN, skip the table and state exactly what's required.

When more than one property was submitted, also include a Scenario Comparison table (columns: Scenario, Plot Area, Buildable Area, Maximum Legal Studios, Realistic Studios, Investment View) with one row per individual property plus a Consolidated row — the Consolidated row is the primary investment scenario.

Finally, if any critical items remain unverified, list them under "Critical Items to Verify" as described in section 19.

Do not provide additional sections, methodology, or general explanations beyond the above. Never replace the regulatory maximum with a typical apartment-size assumption, invent planning rights or minimum studio sizes, treat an estimate as a legal entitlement, or add individual property rights together without independently recalculating the consolidated project. When evidence supports a professional conclusion, make it clearly; when a critical unresolved fact could change the answer, identify it explicitly.

After the report, output a single fenced code block, starting with \`\`\`json and ending with \`\`\`, containing ONLY a single JSON object (no comments, no trailing text after the closing fence) with EXACTLY this shape:

{
  "verdict": "YES" | "YES_SUBJECT_TO_CONDITIONS" | "NO" | "UNCERTAIN",
  "explanation": "",
  "developmentRights": [{ "parameter": "", "potentialRight": "", "confidence": "" }] or null (null unless verdict is YES or YES_SUBJECT_TO_CONDITIONS. Always describes the CONSOLIDATED scenario when multiple properties were submitted. confidence is the combined "Status / Confidence" label from section 18, e.g. "Confirmed", "Estimated", "High", or "Confirmed / To be verified". potentialRight may be a labeled estimate (e.g. "4 floors, estimated"). If no parameter can be established at all, still return a single row reading "NOT YET DETERMINED" with confidence "Unknown", identifying the missing official planning parameter, rather than null),
  "uncertainRequirements": ["", ...] or null (null unless verdict is UNCERTAIN),
  "individualVerdicts": [{ "referenciaCatastral": "", "verdict": "YES" | "YES_SUBJECT_TO_CONDITIONS" | "NO" | "UNCERTAIN", "explanation": "" }] or null (null unless more than one property was submitted — one entry per property's own individual verdict, before consolidation),
  "consolidationRecommendation": "RECOMMENDED" | "NOT_RECOMMENDED" | "NOT_YET_DETERMINED" or null (null unless more than one property was submitted),
  "consolidationExplanation": "" or null (null unless consolidationRecommendation is present — 2-3 sentences on why),
  "maxLegalStudioUnits": "" or null (null unless verdict is YES or YES_SUBJECT_TO_CONDITIONS — e.g. "14 units" or "TO BE DETERMINED — <missing parameter>"),
  "realisticStudioUnits": "" or null (same gating as maxLegalStudioUnits),
  "maximumBeds": "" or null (same gating as maxLegalStudioUnits),
  "keyInvestmentLimiter": "" or null (same gating as maxLegalStudioUnits — the single most binding constraint on the investment, e.g. "Parking requirement caps the buildable footprint"),
  "criticalItemsToVerify": [{ "item": "", "whyItMatters": "", "couldChangeAtConclusion": true, "couldChangeStudioCount": true }] or null (null only if literally nothing material remains unverified — this can appear alongside ANY verdict, including a clean YES, whenever a fact that could move the conclusion or the studio count is still unconfirmed)
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
      ? `Evaluate Apartamentos Turísticos (AT) eligibility, maximum legal and realistic studio capacity, and consolidation potential for the following ${parcels.length} properties — individually, and as a single consolidated development, which is the primary investment scenario (see "Multiple Properties — Consolidation First" in your instructions).`
      : `Evaluate Apartamentos Turísticos (AT) eligibility and maximum legal and realistic studio capacity for the following property:`;
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
