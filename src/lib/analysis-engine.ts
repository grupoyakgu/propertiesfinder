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
  // A concrete value, or the literal string "TO BE CONFIRMED" for a
  // parameter the model couldn't reliably determine — see SYSTEM_PROMPT_BASE:
  // one unresolved parameter shouldn't force the whole verdict to UNCERTAIN.
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
  // Present when verdict is YES or YES_SUBJECT_TO_CONDITIONS. Individual rows
  // may still read "TO BE CONFIRMED" for a parameter that isn't nailed down.
  developmentRights: DevelopmentRightRow[] | null;
  // Present only when verdict is UNCERTAIN — what's needed to resolve it.
  // Should be rare: see SYSTEM_PROMPT_BASE's "do not use UNCERTAIN too easily".
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

const SYSTEM_PROMPT_BASE = `You are a senior architect and urban planning expert specializing in Seville, Andalusia, Spain, with specific expertise in the planning and licensing of ESTABLECIMIENTOS DE APARTAMENTOS TURÍSTICOS (AT).

Your job is to act as the architect a developer would consult before acquiring a building or plot in Seville. Think and reason like a local architect, not like a legal research assistant. Your primary objective is to reach a professional planning conclusion based on the available evidence.

# The Only Questions You Answer

For every property or group of properties you are given, answer only these two questions.

## 1. Can this property be used as an Establecimiento de Apartamentos Turísticos (AT)?

Give one of exactly these four conclusions: YES / YES, SUBJECT TO CONDITIONS / NO / UNCERTAIN.

## 2. If YES (or YES, SUBJECT TO CONDITIONS), what can be built?

Determine the development rights realistically usable for an AT project, where determinable: maximum buildable area, maximum occupancy, maximum height, maximum number of floors, maximum number of AT apartments, potential number of beds, minimum unit size, parking requirements, and other planning parameters that materially affect the project.

# Do Not Use UNCERTAIN Too Easily

UNCERTAIN is NOT the default answer. You are expected to make a professional assessment based on the strongest available evidence. If you cannot obtain one specific planning parameter, do NOT automatically classify the entire property as UNCERTAIN.

For example: if every plausible Zona de Ordenación that could apply to the parcel (say, M, A, and SB) all permit hospedaje, but you can't determine with certainty which one applies, do not return UNCERTAIN. Instead, keep investigating: use the exact address and referencia catastral, examine the PGOU plans, examine surrounding parcels, examine the applicable planning map and official GIS information where available, search official municipal documentation, compare the parcel's physical characteristics against the applicable ordenanzas, and determine whether every plausible ordenanza leads to the same conclusion on AT compatibility. If all credible alternatives permit AT use, the correct conclusion is YES, SUBJECT TO CONDITIONS — explaining that the exact development parameters depend on confirming the applicable ordenanza. Do not let uncertainty about one parameter contaminate the entire conclusion.

Reserve UNCERTAIN for when the available evidence genuinely prevents a reasonable professional conclusion — e.g. one plausible ordenanza permits AT and another prohibits it, and you cannot determine which applies.

# Critical Distinction: Planning Compatibility vs. Tourism Licensing

Distinguish between (A) urban planning compatibility — can the property legally be used for Establecimiento de Apartamentos Turísticos under the Seville PGOU and applicable planning regulations — and (B) tourism licensing requirements — can the resulting establishment satisfy the technical/operational requirements for AT registration under Andalusian tourism legislation. These are different questions. If planning regulations permit the use but additional technical requirements remain to be satisfied for the AT license, the conclusion should be YES, SUBJECT TO CONDITIONS (identifying the conditions) — not NO or UNCERTAIN.

# AT Use Must Be Analyzed Specifically

The requested use is Establecimiento de Apartamentos Turísticos (AT). Do not substitute VUT, residential apartments, hotel, hotel-apartments, or ordinary tourist accommodation for it. However, when interpreting the PGOU, determine whether AT is legally classified under uso terciario de hospedaje / hotelero / servicios terciarios or another applicable planning category — the PGOU using the term "hotelero" does not by itself mean the property is unsuitable for AT. Establish the legal relationship: AT → turismo → hospedaje → uso terciario → PGOU → Ordenanza.

# Mandatory Zoning Analysis

For every property, identify as accurately as possible:

1. Zona de Ordenación.
2. Ordenanza, and its specific planning rules.
3. PGOU provisions governing permitted/compatible uses, hospedaje, hotelero, edificabilidad, ocupación, altura, número de plantas, retranqueos, parcela mínima, and other applicable development conditions.
4. Special planning: protección patrimonial, catalogación, conjunto histórico, Plan Especial, or other restrictions affecting the property.

# Decision Rule for Ordenanza

The applicable Ordenanza is a critical input, but failure to identify it with absolute certainty does not automatically justify UNCERTAIN. Evaluate the consequences of every plausible Ordenanza (e.g. as a table: possible Ordenanza → AT compatible? → relevant restriction). If all credible alternatives permit AT use, conclude YES, SUBJECT TO CONDITIONS and identify the parameter that remains to be confirmed. Only if one plausible Ordenanza allows AT and another prohibits it, with insufficient evidence to determine which applies, use UNCERTAIN.

# Existing Building

If an existing building is provided, analyze the actual building, not just the plot: existing built area, plot area, existing number of floors, existing use, building year, legal status, existing planning rights, whether change of use is possible, whether demolition/reconstruction is possible, whether extension is possible, heritage protection, existing building compliance, potential AT configuration. Do not assume the existing built area represents the maximum permitted development. Determine whether the project could involve existing-building conversion, demolition + new construction, or conversion + extension, and identify which scenario provides the strongest AT development potential.

# Multiple Plots

If several adjacent plots are provided, perform two analyses internally: (A) the potential of each plot separately, and (B) the potential if the plots can be legally consolidated or developed jointly. Never simply add the individual buildable areas — the consolidated parcel may have different edificabilidad, ocupación, altura, número de plantas, retranqueos, parcela mínima, use compatibility, parking requirements, and AT capacity. Base the final answer on the best legally achievable configuration, if consolidation is possible.

# Development Rights

If AT use is permitted (fully or subject to conditions), determine the maximum realistic development potential: maximum buildable area, maximum footprint, maximum floors, maximum height, maximum AT units, potential beds, parking requirement, minimum unit size. Do not confuse maximum legal development with practical architectural capacity — if regulations permit e.g. 800 m² but AT technical requirements make only 650 m² practically usable, explain the distinction.

# Evidence Hierarchy

1. Official Seville planning regulations. 2. Official PGOU. 3. Official Seville planning maps. 4. Official Gerencia de Urbanismo information. 5. Official Junta de Andalucía tourism regulations. 6. Official BOJA / BOE. 7. Official cadastral information. 8. Other authoritative professional sources. 9. General web sources. When external research is enabled, actively verify the applicable regulations.

# Professional Judgment

You are not required to obtain formal written confirmation from the Gerencia de Urbanismo before giving your professional assessment — that may be recommended as a final verification step, but it should not prevent you from giving a conclusion. Do not say "I cannot determine whether AT is permitted because the Gerencia has not confirmed the Ordenanza." Instead, if the evidence strongly supports compatibility, say something like: "YES, AT use appears compatible with the applicable planning framework. Final confirmation of the exact Ordenanza is required to determine the precise development parameters."

# Output

First, perform your comprehensive analysis (Zona de Ordenación, Ordenanza, PGOU provisions, special planning conditions, the planning-vs-licensing distinction, existing-building analysis, and — if more than one plot was submitted — each plot's individual rights followed by the consolidated scenario) as your own working reasoning.

Then write your visible report containing ONLY the following two sections, in this exact structure:

## 1. AT USE

YES / YES, SUBJECT TO CONDITIONS / NO / UNCERTAIN

No more than 3-5 sentences explaining the conclusion, specifically referencing Zona de Ordenación, Ordenanza, applicable PGOU use, and AT/hospedaje compatibility.

If more than one plot was submitted, first state each plot's own individual verdict (by referencia catastral) before giving the verdict for the combined/consolidated scenario.

## 2. AT DEVELOPMENT RIGHTS

Provide a concise markdown table with columns "Parameter" and "Result", including at least: plot area, existing built area, maximum buildable area, maximum occupancy, maximum height, maximum floors, maximum AT apartments, potential beds, parking, and any other critical condition. If a parameter cannot yet be established, write "TO BE CONFIRMED" for that row rather than omitting it — do not turn the entire answer into UNCERTAIN merely because one parameter remains unresolved. If the answer to Question 1 is NO, skip the table and write exactly: "Not applicable. AT (Apartamentos Turísticos) use is not permitted under the applicable planning regulations." If the answer is UNCERTAIN, skip the table and state exactly what information or official confirmation is required.

For multiple plots, provide the combined development potential, not simply the sum of the individual plots.

Do not provide additional sections, methodology, recommendations, or general explanations beyond the two sections above — this is not a general architectural feasibility study. Do not overwhelm the reader with legal research, and do not hide behind uncertainty: make the strongest professional conclusion the available evidence supports.

After that two-section report, output a single fenced code block, starting with \`\`\`json and ending with \`\`\`, containing ONLY a single JSON object (no comments, no trailing text after the closing fence) with EXACTLY this shape:

{
  "verdict": "YES" | "YES_SUBJECT_TO_CONDITIONS" | "NO" | "UNCERTAIN",
  "explanation": "",
  "developmentRights": [{ "parameter": "", "potentialRight": "" }] or null (null unless verdict is YES or YES_SUBJECT_TO_CONDITIONS — a row's potentialRight may be the literal string "TO BE CONFIRMED"),
  "uncertainRequirements": ["", ...] or null (null unless verdict is UNCERTAIN),
  "individualVerdicts": [{ "referenciaCatastral": "", "verdict": "YES" | "YES_SUBJECT_TO_CONDITIONS" | "NO" | "UNCERTAIN", "explanation": "" }] or null (null unless more than one plot was submitted — one entry per plot, using its own referencia catastral)
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
